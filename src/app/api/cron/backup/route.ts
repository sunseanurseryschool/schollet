import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { gzipSync } from "node:zlib";
import nodemailer from "nodemailer";
import { buildFullExport } from "@/lib/backup";

export const dynamic = "force-dynamic";
// Full export + SMTP can exceed the default serverless timeout
export const maxDuration = 60;

function istTimestamp(): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}_${get("hour")}${get("minute")}_IST`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Vercel Cron sends `Authorization: Bearer <CRON_SECRET>` automatically
    // when the CRON_SECRET env var is set on the project.
    const secret = process.env.CRON_SECRET;
    if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!gmailUser || !gmailPassword || !supabaseUrl || !serviceKey) {
      return NextResponse.json(
        {
          error:
            "Missing configuration: GMAIL_USER, GMAIL_APP_PASSWORD, NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required",
        },
        { status: 500 }
      );
    }

    // Service-role client: the cron has no user session, and reading every
    // table both backs up the data and keeps the Supabase project active.
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const payload = await buildFullExport(admin, "nightly-cron");
    const gzipped = gzipSync(Buffer.from(JSON.stringify(payload)));
    const filename = `schollet-backup-${istTimestamp()}.json.gz`;
    const sizeKb = (gzipped.length / 1024).toFixed(1);

    const istDate = new Date().toLocaleDateString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPassword },
    });

    await transporter.sendMail({
      from: `Schollet Backups <${gmailUser}>`,
      to: process.env.BACKUP_EMAIL_TO ?? gmailUser,
      subject: `Schollet DB Backup — ${istDate}`,
      text:
        `Daily backup of the Schollet database (all public tables as JSON).\n\n` +
        `File:   ${filename}\n` +
        `Size:   ${sizeKb} KB (gzipped)\n` +
        `Tables: ${payload.meta.table_count}\n` +
        `Rows:   ${payload.meta.total_rows}\n` +
        (payload.meta.errors
          ? `Skipped tables: ${Object.keys(payload.meta.errors).join(", ")}\n`
          : "") +
        `\nThe attachment is gzipped JSON — one key per table with all rows.\n`,
      attachments: [{ filename, content: gzipped }],
    });

    return NextResponse.json({
      ok: true,
      filename,
      size_kb: Number(sizeKb),
      table_count: payload.meta.table_count,
      total_rows: payload.meta.total_rows,
      table_source: payload.meta.table_source,
      failed_tables: Object.keys(payload.meta.errors ?? {}),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
