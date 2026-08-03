import { createClient } from "@/lib/supabase/server";
import type { Account, AccountAdjustment } from "@/types/database";
import type {
  CreateAccountInput,
  UpdateAccountInput,
  CreateAccountAdjustmentInput,
} from "@/lib/schemas/account";
import { logAudit } from "@/lib/audit";

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

const REFERENCING_TABLES = [
  "fee_transactions",
  "expenses",
  "inventory_transactions",
  "account_adjustments",
] as const;

export interface AccountWithBalance extends Account {
  balance: number;
}

export async function listAccounts(): Promise<
  ServiceResult<AccountWithBalance[]>
> {
  try {
    const supabase = await createClient();

    const [accountsRes, feesRes, expensesRes, adjustmentsRes] =
      await Promise.all([
        supabase.from("accounts").select("*").order("name", { ascending: true }),
        supabase.from("fee_transactions").select("account_id, paid_amount"),
        supabase.from("expenses").select("account_id, amount"),
        supabase.from("account_adjustments").select("account_id, amount"),
      ]);

    if (accountsRes.error) return { data: null, error: accountsRes.error.message };
    if (feesRes.error) return { data: null, error: feesRes.error.message };
    if (expensesRes.error) return { data: null, error: expensesRes.error.message };
    if (adjustmentsRes.error)
      return { data: null, error: adjustmentsRes.error.message };

    const balances = new Map<string, number>();
    for (const row of feesRes.data ?? []) {
      const id = row.account_id as string;
      balances.set(id, (balances.get(id) ?? 0) + Number(row.paid_amount));
    }
    for (const row of expensesRes.data ?? []) {
      const id = row.account_id as string;
      balances.set(id, (balances.get(id) ?? 0) - Number(row.amount));
    }
    for (const row of adjustmentsRes.data ?? []) {
      const id = row.account_id as string;
      balances.set(id, (balances.get(id) ?? 0) + Number(row.amount));
    }

    const enriched: AccountWithBalance[] = (accountsRes.data as Account[]).map(
      (a) => ({
        ...a,
        balance: Math.round((balances.get(a.id) ?? 0) * 100) / 100,
      }),
    );

    return { data: enriched, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function getAccount(id: string): Promise<ServiceResult<Account>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return { data: null, error: error.message };
    return { data: data as Account, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function createAccount(
  input: CreateAccountInput,
  userId: string
): Promise<ServiceResult<Account>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("accounts")
      .insert({ name: input.name, is_online: input.is_online })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    const account = data as Account;
    await logAudit(userId, "CREATE_ACCOUNT", "account", account.id, {
      name: account.name,
      is_online: account.is_online,
    });
    return { data: account, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function updateAccount(
  id: string,
  input: UpdateAccountInput,
  userId: string
): Promise<ServiceResult<Account>> {
  try {
    const supabase = await createClient();
    const patch: Record<string, unknown> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.is_online !== undefined) patch.is_online = input.is_online;

    if (Object.keys(patch).length === 0) {
      return { data: null, error: "No changes provided" };
    }

    const { data, error } = await supabase
      .from("accounts")
      .update(patch)
      .eq("id", id)
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    const account = data as Account;
    await logAudit(userId, "UPDATE_ACCOUNT", "account", account.id, patch);
    return { data: account, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function createAccountAdjustment(
  accountId: string,
  input: CreateAccountAdjustmentInput,
  userId: string,
): Promise<ServiceResult<AccountAdjustment>> {
  try {
    const supabase = await createClient();

    // Verify account exists
    const { data: account, error: acctErr } = await supabase
      .from("accounts")
      .select("id, name")
      .eq("id", accountId)
      .maybeSingle();
    if (acctErr) return { data: null, error: acctErr.message };
    if (!account) return { data: null, error: "Account not found" };

    // Resolve staff record for created_by
    const { data: staff } = await supabase
      .from("staff")
      .select("id")
      .eq("user_id", userId)
      .eq("is_active", true)
      .maybeSingle();
    if (!staff) {
      return {
        data: null,
        error:
          "No active staff record found for the current user. Please create a staff profile first.",
      };
    }

    const signedAmount =
      input.type === "increase" ? input.amount : -input.amount;

    const { data, error } = await supabase
      .from("account_adjustments")
      .insert({
        account_id: accountId,
        amount: signedAmount,
        reason: input.reason,
        created_by: (staff as { id: string }).id,
      })
      .select()
      .single();

    if (error) return { data: null, error: error.message };

    const adjustment = data as AccountAdjustment;
    await logAudit(
      userId,
      "ADJUST_ACCOUNT",
      "account",
      accountId,
      {
        adjustment_id: adjustment.id,
        account_name: (account as { name: string }).name,
        type: input.type,
        amount: input.amount,
        signed_amount: signedAmount,
        reason: input.reason,
      },
    );

    return { data: adjustment, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function listAccountAdjustments(
  accountId: string,
): Promise<ServiceResult<AccountAdjustment[]>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("account_adjustments")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false });
    if (error) return { data: null, error: error.message };
    return { data: (data ?? []) as AccountAdjustment[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function deleteAccount(
  id: string,
  userId: string
): Promise<ServiceResult<true>> {
  try {
    const supabase = await createClient();

    for (const table of REFERENCING_TABLES) {
      const { count, error: countError } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("account_id", id);

      if (countError) return { data: null, error: countError.message };
      if ((count ?? 0) > 0) {
        return {
          data: null,
          error: `Cannot delete: account is used by ${count} ${table.replace("_", " ")} record(s).`,
        };
      }
    }

    const { error } = await supabase.from("accounts").delete().eq("id", id);
    if (error) return { data: null, error: error.message };

    await logAudit(userId, "DELETE_ACCOUNT", "account", id, {});
    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}
