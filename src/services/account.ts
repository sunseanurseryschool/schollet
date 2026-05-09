import { createClient } from "@/lib/supabase/server";
import type { Account, JournalEntry, JournalLine } from "@/types/database";
import type { CreateJournalEntryInput, JournalListQuery } from "@/lib/schemas/journal";
import type { AccountListQuery, SetOpeningBalanceInput } from "@/lib/schemas/account";
import { logAudit } from "@/lib/audit";

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

export interface AccountWithBalance extends Account {
  balance: number;
}

export interface JournalEntryWithLines extends JournalEntry {
  lines: JournalLine[];
}

export interface JournalListResult {
  entries: JournalEntryWithLines[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/**
 * Returns the natural balance sign convention for an account type:
 * ASSET and EXPENSE accounts are debit-normal (balance = debits - credits)
 * INCOME and LIABILITY accounts are credit-normal (balance = credits - debits)
 */
function computeBalance(
  type: Account["type"],
  totalDebit: number,
  totalCredit: number
): number {
  if (type === "ASSET" || type === "EXPENSE") {
    return totalDebit - totalCredit;
  }
  return totalCredit - totalDebit;
}

export async function listAccounts(
  query: AccountListQuery
): Promise<ServiceResult<AccountWithBalance[]>> {
  try {
    const supabase = await createClient();

    let builder = supabase
      .from("accounts")
      .select("*")
      .order("code", { ascending: true });

    if (query.type) {
      builder = builder.eq("type", query.type);
    }

    const { data: accounts, error: accountsError } = await builder;

    if (accountsError) {
      return { data: null, error: accountsError.message };
    }

    if (!accounts || accounts.length === 0) {
      return { data: [], error: null };
    }

    const accountIds = accounts.map((a) => a.id as string);

    // Fetch all journal lines for these accounts in one query
    const { data: lines, error: linesError } = await supabase
      .from("journal_lines")
      .select("account_id, debit, credit")
      .in("account_id", accountIds);

    if (linesError) {
      return { data: null, error: linesError.message };
    }

    // Aggregate debits and credits per account
    const balanceMap = new Map<string, { debit: number; credit: number }>();
    for (const line of lines ?? []) {
      const id = line.account_id as string;
      const existing = balanceMap.get(id) ?? { debit: 0, credit: 0 };
      balanceMap.set(id, {
        debit: existing.debit + Number(line.debit),
        credit: existing.credit + Number(line.credit),
      });
    }

    const result: AccountWithBalance[] = (accounts as Account[]).map((acc) => {
      const { debit, credit } = balanceMap.get(acc.id) ?? { debit: 0, credit: 0 };
      return {
        ...acc,
        balance: computeBalance(acc.type, debit, credit),
      };
    });

    return { data: result, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function getAccount(
  id: string
): Promise<ServiceResult<AccountWithBalance>> {
  try {
    const supabase = await createClient();

    const { data: account, error: accountError } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", id)
      .single();

    if (accountError) {
      return { data: null, error: accountError.message };
    }

    const { data: lines, error: linesError } = await supabase
      .from("journal_lines")
      .select("debit, credit")
      .eq("account_id", id);

    if (linesError) {
      return { data: null, error: linesError.message };
    }

    const totalDebit = (lines ?? []).reduce((sum, l) => sum + Number(l.debit), 0);
    const totalCredit = (lines ?? []).reduce((sum, l) => sum + Number(l.credit), 0);

    const acc = account as Account;
    return {
      data: {
        ...acc,
        balance: computeBalance(acc.type, totalDebit, totalCredit),
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function createJournalEntry(
  input: CreateJournalEntryInput
): Promise<ServiceResult<JournalEntryWithLines>> {
  try {
    const supabase = await createClient();

    // Insert the journal entry header
    const { data: entry, error: entryError } = await supabase
      .from("journal_entries")
      .insert({
        date: input.date,
        reference_type: input.reference_type,
        reference_id: input.reference_id,
        description: input.description,
      })
      .select()
      .single();

    if (entryError) {
      return { data: null, error: entryError.message };
    }

    const journalEntry = entry as JournalEntry;

    // Insert all lines
    const lineRows = input.lines.map((line) => ({
      journal_id: journalEntry.id,
      account_id: line.account_id,
      debit: line.debit,
      credit: line.credit,
    }));

    const { data: insertedLines, error: linesError } = await supabase
      .from("journal_lines")
      .insert(lineRows)
      .select();

    if (linesError) {
      return { data: null, error: linesError.message };
    }

    return {
      data: {
        ...journalEntry,
        lines: (insertedLines ?? []) as JournalLine[],
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function listJournalEntries(
  query: JournalListQuery
): Promise<ServiceResult<JournalListResult>> {
  try {
    const supabase = await createClient();
    const { reference_type, date_from, date_to, page, per_page } = query;
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;

    let builder = supabase
      .from("journal_entries")
      .select("*", { count: "exact" })
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (reference_type) {
      builder = builder.eq("reference_type", reference_type);
    }
    if (date_from) {
      builder = builder.gte("date", date_from);
    }
    if (date_to) {
      builder = builder.lte("date", date_to);
    }

    const { data: entries, error: entriesError, count } = await builder;

    if (entriesError) {
      return { data: null, error: entriesError.message };
    }

    const journalEntries = (entries ?? []) as JournalEntry[];

    if (journalEntries.length === 0) {
      return {
        data: {
          entries: [],
          total: 0,
          page,
          per_page,
          total_pages: 0,
        },
        error: null,
      };
    }

    const entryIds = journalEntries.map((e) => e.id);

    const { data: allLines, error: linesError } = await supabase
      .from("journal_lines")
      .select("*")
      .in("journal_id", entryIds);

    if (linesError) {
      return { data: null, error: linesError.message };
    }

    const linesMap = new Map<string, JournalLine[]>();
    for (const line of (allLines ?? []) as JournalLine[]) {
      const existing = linesMap.get(line.journal_id) ?? [];
      existing.push(line);
      linesMap.set(line.journal_id, existing);
    }

    const enriched: JournalEntryWithLines[] = journalEntries.map((e) => ({
      ...e,
      lines: linesMap.get(e.id) ?? [],
    }));

    const total = count ?? 0;
    return {
      data: {
        entries: enriched,
        total,
        page,
        per_page,
        total_pages: Math.ceil(total / per_page),
      },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

// System account code for the Opening Balance Equity contra account
const OPENING_BALANCE_EQUITY_CODE = "LIA-002";

/**
 * Records an opening balance for a balance-sheet account as a journal entry.
 *
 * Convention:
 *  - ASSET accounts:     DR asset account / CR Opening Balance Equity
 *  - LIABILITY accounts: DR Opening Balance Equity / CR liability account
 *
 * Each call creates a new immutable journal entry — it does not modify prior entries.
 */
export async function setOpeningBalance(
  input: SetOpeningBalanceInput,
  userId: string
): Promise<ServiceResult<JournalEntryWithLines>> {
  try {
    const supabase = await createClient();

    // Fetch the target account
    const { data: targetData, error: targetError } = await supabase
      .from("accounts")
      .select("*")
      .eq("id", input.accountId)
      .single();

    if (targetError || !targetData) {
      return {
        data: null,
        error: targetError?.message ?? `Account "${input.accountId}" not found`,
      };
    }

    const targetAccount = targetData as Account;

    if (targetAccount.type !== "ASSET" && targetAccount.type !== "LIABILITY") {
      return {
        data: null,
        error: "Opening balances can only be set for ASSET or LIABILITY accounts",
      };
    }

    // Fetch the Opening Balance Equity account
    const { data: equityData, error: equityError } = await supabase
      .from("accounts")
      .select("*")
      .eq("code", OPENING_BALANCE_EQUITY_CODE)
      .single();

    if (equityError || !equityData) {
      return {
        data: null,
        error: `Opening Balance Equity account (${OPENING_BALANCE_EQUITY_CODE}) not found — run migration 00002`,
      };
    }

    const equityAccount = equityData as Account;

    // Build the balanced journal entry lines based on account type
    const lines =
      targetAccount.type === "ASSET"
        ? [
            { account_id: targetAccount.id, debit: input.amount, credit: 0 },
            { account_id: equityAccount.id, debit: 0, credit: input.amount },
          ]
        : [
            { account_id: equityAccount.id, debit: input.amount, credit: 0 },
            { account_id: targetAccount.id, debit: 0, credit: input.amount },
          ];

    const result = await createJournalEntry({
      date: input.date,
      reference_type: "OPENING_BALANCE",
      reference_id: input.accountId,
      description: `Opening balance for ${targetAccount.name}`,
      lines,
    });

    if (result.error || !result.data) {
      return result;
    }

    // Audit log the opening balance action
    await logAudit(userId, "SET_OPENING_BALANCE", "account", input.accountId, {
      account_name: targetAccount.name,
      account_code: targetAccount.code,
      account_type: targetAccount.type,
      amount: input.amount,
      date: input.date,
      journal_entry_id: result.data.id,
    });

    return result;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}
