import nodemailer from "nodemailer";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const { GMAIL_USER, GMAIL_APP_PASSWORD, BACKUP_FILE } = process.env;

if (!GMAIL_USER || !GMAIL_APP_PASSWORD || !BACKUP_FILE) {
  console.error("Missing GMAIL_USER, GMAIL_APP_PASSWORD, or BACKUP_FILE");
  process.exit(1);
}

const buffer = await readFile(BACKUP_FILE);
const { size } = await stat(BACKUP_FILE);
const filename = path.basename(BACKUP_FILE);
const sizeKb = (size / 1024).toFixed(1);
const istDate = new Date().toLocaleDateString("en-IN", {
  timeZone: "Asia/Kolkata",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: GMAIL_USER, pass: GMAIL_APP_PASSWORD },
});

await transporter.sendMail({
  from: `Schollet Backups <${GMAIL_USER}>`,
  to: GMAIL_USER,
  subject: `Schollet DB Backup — ${istDate}`,
  text:
    `Daily backup of the Schollet database (public schema).\n\n` +
    `File:  ${filename}\n` +
    `Size:  ${sizeKb} KB (gzipped)\n\n` +
    `To restore into a fresh Supabase project:\n` +
    `  gunzip -c ${filename} | psql "<TARGET_DB_URL>"\n`,
  attachments: [{ filename, content: buffer }],
});

console.log(`Sent ${filename} (${sizeKb} KB) to ${GMAIL_USER}`);
