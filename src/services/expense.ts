import { createClient } from "@/lib/supabase/server";
import { logAudit } from "@/lib/audit";
import {
  createExpenseEntry,
  reverseJournalEntry,
} from "@/services/ledger";
import type { Expense } from "@/types/database";
import type { CreateExpenseInput, ExpenseListQuery } from "@/lib/schemas/expense";
import type { ServiceResult } from "@/services/student";

export interface ExpenseListResult {
  expenses: Expense[];
  total: number;
  page: number;
  per_page: number;
  total_pages: number;
}

/**
 * Resolves the staff ID for `paid_by`.
 * Looks up the staff record linked to this auth user.
 * Returns null if no active staff record exists.
 */
async function resolvePaidBy(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff")
    .select("id")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  return data?.id ?? null;
}

export async function listExpenses(
  query: ExpenseListQuery
): Promise<ServiceResult<ExpenseListResult>> {
  try {
    const supabase = await createClient();
    const { date_from, date_to, category, page, per_page } = query;
    const from = (page - 1) * per_page;
    const to = from + per_page - 1;

    let builder = supabase
      .from("expenses")
      .select("*", { count: "exact" })
      .order("date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (date_from) {
      builder = builder.gte("date", date_from);
    }
    if (date_to) {
      builder = builder.lte("date", date_to);
    }
    if (category) {
      builder = builder.eq("category", category);
    }

    const { data, error, count } = await builder;

    if (error) {
      return { data: null, error: error.message };
    }

    const total = count ?? 0;
    return {
      data: {
        expenses: (data ?? []) as Expense[],
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

export async function getExpense(
  id: string
): Promise<ServiceResult<Expense>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as Expense, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function createExpense(
  userId: string,
  input: CreateExpenseInput
): Promise<ServiceResult<Expense>> {
  try {
    const supabase = await createClient();

    const paidBy = await resolvePaidBy(userId);
    if (!paidBy) {
      return {
        data: null,
        error: "No active staff record found for the current user. Please create a staff profile first.",
      };
    }

    const { data, error } = await supabase
      .from("expenses")
      .insert({
        amount: input.amount,
        category: input.category,
        description: input.description,
        paid_by: paidBy,
        date: input.date,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    const expense = data as Expense;

    // Create double-entry journal entry (debit Expense, credit Cash)
    const ledgerResult = await createExpenseEntry({
      expenseId: expense.id,
      amount: expense.amount,
      isInventory: input.isInventory,
      date: expense.date,
      description: expense.description,
    });

    if (ledgerResult.error) {
      // Roll back the expense record if the ledger fails
      await supabase.from("expenses").delete().eq("id", expense.id);
      return {
        data: null,
        error: `Ledger entry failed: ${ledgerResult.error}`,
      };
    }

    await logAudit(userId, "CREATE", "expense", expense.id, {
      amount: expense.amount,
      category: expense.category,
      description: expense.description,
      date: expense.date,
      paid_by: paidBy,
      journal_entry_id: ledgerResult.data?.id,
    });

    return { data: expense, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function deleteExpense(
  userId: string,
  id: string
): Promise<ServiceResult<boolean>> {
  try {
    const supabase = await createClient();

    // Fetch the expense for audit details
    const existing = await getExpense(id);
    if (!existing.data) {
      return { data: null, error: "Expense not found" };
    }

    // Find the journal entry for this expense so we can reverse it
    const { data: journalEntry, error: jeError } = await supabase
      .from("journal_entries")
      .select("id")
      .eq("reference_type", "EXPENSE")
      .eq("reference_id", id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (jeError) {
      return { data: null, error: jeError.message };
    }

    // Reverse the journal entry if it exists
    if (journalEntry) {
      const today = new Date().toISOString().slice(0, 10);
      const reversalResult = await reverseJournalEntry(
        journalEntry.id,
        `Reversal: ${existing.data.description}`,
        today
      );
      if (reversalResult.error) {
        return {
          data: null,
          error: `Journal reversal failed: ${reversalResult.error}`,
        };
      }
    }

    // Delete the expense record
    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", id);

    if (error) {
      return { data: null, error: error.message };
    }

    await logAudit(userId, "DELETE", "expense", id, {
      amount: existing.data.amount,
      category: existing.data.category,
      description: existing.data.description,
      date: existing.data.date,
    });

    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}
