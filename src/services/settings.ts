import { createClient } from "@/lib/supabase/server";
import type { ServiceResult } from "@/services/student";
import {
  brandingSchema,
  DEFAULT_BRANDING,
  type Branding,
} from "@/lib/schemas/settings";

/**
 * Branding is read on every receipt render, so failures fall back to
 * defaults rather than erroring — a missing table/row (migration not yet
 * applied) must never break receipt printing.
 */
export async function getBranding(): Promise<Branding> {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "branding")
      .maybeSingle();

    if (!data?.value) return DEFAULT_BRANDING;
    const parsed = brandingSchema.safeParse(data.value);
    return parsed.success ? parsed.data : DEFAULT_BRANDING;
  } catch {
    return DEFAULT_BRANDING;
  }
}

export async function updateBranding(
  input: Branding
): Promise<ServiceResult<Branding>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase.from("app_settings").upsert({
      key: "branding",
      value: input,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: input, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}
