import { createClient } from "@/lib/supabase/server";
import type { FeeConfig, FeeHead, Grade } from "@/types/database";
import type {
  CreateFeeConfigInput,
  UpdateFeeConfigInput,
  FeeConfigListQuery,
} from "@/lib/schemas/fee-config";
import type { ServiceResult } from "@/services/student";

export interface FeeConfigWithHeads extends FeeConfig {
  fee_heads: FeeHead[];
}

export async function listFeeConfigs(
  query: FeeConfigListQuery
): Promise<ServiceResult<FeeConfigWithHeads[]>> {
  try {
    const supabase = await createClient();

    let builder = supabase
      .from("fee_configs")
      .select("*, fee_heads(*)")
      .order("grade", { ascending: true });

    if (query.academic_year) {
      builder = builder.eq("academic_year", query.academic_year);
    }

    const { data, error } = await builder;

    if (error) {
      return { data: null, error: error.message };
    }

    return { data: (data ?? []) as FeeConfigWithHeads[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function getFeeConfigById(
  id: string
): Promise<ServiceResult<FeeConfigWithHeads>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("fee_configs")
      .select("*, fee_heads(*)")
      .eq("id", id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as FeeConfigWithHeads, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function getFeeConfigByGradeAndYear(
  grade: Grade,
  academic_year: string
): Promise<ServiceResult<FeeConfigWithHeads | null>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("fee_configs")
      .select("*, fee_heads(*)")
      .eq("grade", grade)
      .eq("academic_year", academic_year)
      .maybeSingle();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as FeeConfigWithHeads | null, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function createFeeConfig(
  input: CreateFeeConfigInput
): Promise<ServiceResult<FeeConfigWithHeads>> {
  try {
    const supabase = await createClient();

    // Check uniqueness: one config per grade per academic year
    const { data: existing } = await supabase
      .from("fee_configs")
      .select("id")
      .eq("grade", input.grade)
      .eq("academic_year", input.academic_year)
      .maybeSingle();

    if (existing) {
      return {
        data: null,
        error: `A fee config for Grade ${input.grade} in ${input.academic_year} already exists`,
      };
    }

    // Insert fee_config
    const { data: configData, error: configError } = await supabase
      .from("fee_configs")
      .insert({
        grade: input.grade,
        academic_year: input.academic_year,
        total_fee: input.total_fee,
      })
      .select()
      .single();

    if (configError) {
      return { data: null, error: configError.message };
    }

    const config = configData as FeeConfig;

    // Insert fee_heads
    const headsToInsert = input.fee_heads.map((h) => ({
      fee_config_id: config.id,
      name: h.name,
      amount: h.amount,
    }));

    const { data: headsData, error: headsError } = await supabase
      .from("fee_heads")
      .insert(headsToInsert)
      .select();

    if (headsError) {
      // Attempt rollback by deleting the orphaned config
      await supabase.from("fee_configs").delete().eq("id", config.id);
      return { data: null, error: headsError.message };
    }

    return {
      data: { ...config, fee_heads: (headsData ?? []) as FeeHead[] },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function updateFeeConfig(
  id: string,
  input: UpdateFeeConfigInput
): Promise<ServiceResult<FeeConfigWithHeads>> {
  try {
    const supabase = await createClient();

    // Check uniqueness: ensure no other config has same grade+year
    const { data: conflict } = await supabase
      .from("fee_configs")
      .select("id")
      .eq("grade", input.grade)
      .eq("academic_year", input.academic_year)
      .neq("id", id)
      .maybeSingle();

    if (conflict) {
      return {
        data: null,
        error: `A fee config for Grade ${input.grade} in ${input.academic_year} already exists`,
      };
    }

    // Update fee_config row
    const { data: configData, error: configError } = await supabase
      .from("fee_configs")
      .update({
        grade: input.grade,
        academic_year: input.academic_year,
        total_fee: input.total_fee,
      })
      .eq("id", id)
      .select()
      .single();

    if (configError) {
      return { data: null, error: configError.message };
    }

    const config = configData as FeeConfig;

    // Replace fee_heads: delete existing, insert new
    const { error: deleteError } = await supabase
      .from("fee_heads")
      .delete()
      .eq("fee_config_id", id);

    if (deleteError) {
      return { data: null, error: deleteError.message };
    }

    const headsToInsert = input.fee_heads.map((h) => ({
      fee_config_id: id,
      name: h.name,
      amount: h.amount,
    }));

    const { data: headsData, error: headsError } = await supabase
      .from("fee_heads")
      .insert(headsToInsert)
      .select();

    if (headsError) {
      return { data: null, error: headsError.message };
    }

    return {
      data: { ...config, fee_heads: (headsData ?? []) as FeeHead[] },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function deleteFeeConfig(
  id: string
): Promise<ServiceResult<boolean>> {
  try {
    const supabase = await createClient();
    // fee_heads cascade-delete via FK ON DELETE CASCADE
    const { error } = await supabase.from("fee_configs").delete().eq("id", id);

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}
