/**
 * Ledger Service — higher-level financial operations that auto-create
 * balanced double-entry journal entries using the system accounts.
 *
 * All financial flows MUST go through this service.
 * Journal entries are immutable — use reverseJournalEntry to undo.
 */

import { createClient } from "@/lib/supabase/server";
import type { Account, JournalLine } from "@/types/database";
import { createJournalEntry } from "@/services/account";
import type { ServiceResult, JournalEntryWithLines } from "@/services/account";
import type { ReferenceType } from "@/types/database";

// System account codes (seeded in migration)
const SYSTEM_CODES = {
  FEE_INCOME: "INC-001",
  OTHER_INCOME: "INC-002",
  SALARY_EXPENSE: "EXP-001",
  GENERAL_EXPENSE: "EXP-002",
  INVENTORY_EXPENSE: "EXP-003",
  CASH: "AST-001",
  BANK: "AST-002",
  ACCOUNTS_RECEIVABLE: "AST-003",
  ACCOUNTS_PAYABLE: "LIA-001",
} as const;

async function getAccountByCode(code: string): Promise<Account | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("accounts")
    .select("*")
    .eq("code", code)
    .single();

  if (error || !data) return null;
  return data as Account;
}

export interface FeePaymentEntryInput {
  /** UUID of the fee_transaction record */
  feeTransactionId: string;
  /** Amount paid */
  amount: number;
  /** 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' */
  paymentMode: "CASH" | "UPI" | "BANK_TRANSFER" | "CHEQUE";
  /** ISO date string YYYY-MM-DD */
  date: string;
  description: string;
}

/**
 * Fee payment: debit Cash/Bank, credit Fee Income
 */
export async function createFeePaymentEntry(
  input: FeePaymentEntryInput
): Promise<ServiceResult<JournalEntryWithLines>> {
  const assetCode =
    input.paymentMode === "BANK_TRANSFER" || input.paymentMode === "CHEQUE"
      ? SYSTEM_CODES.BANK
      : SYSTEM_CODES.CASH;

  const [assetAccount, incomeAccount] = await Promise.all([
    getAccountByCode(assetCode),
    getAccountByCode(SYSTEM_CODES.FEE_INCOME),
  ]);

  if (!assetAccount) {
    return { data: null, error: `System account "${assetCode}" not found` };
  }
  if (!incomeAccount) {
    return {
      data: null,
      error: `System account "${SYSTEM_CODES.FEE_INCOME}" not found`,
    };
  }

  return createJournalEntry({
    date: input.date,
    reference_type: "FEE",
    reference_id: input.feeTransactionId,
    description: input.description,
    lines: [
      { account_id: assetAccount.id, debit: input.amount, credit: 0 },
      { account_id: incomeAccount.id, debit: 0, credit: input.amount },
    ],
  });
}

export interface SalaryEntryInput {
  /** UUID of the staff record being paid */
  staffId: string;
  amount: number;
  /** ISO date string YYYY-MM-DD */
  date: string;
  description: string;
}

/**
 * Salary payment: debit Salary Expense, credit Bank
 */
export async function createSalaryEntry(
  input: SalaryEntryInput
): Promise<ServiceResult<JournalEntryWithLines>> {
  const [expenseAccount, bankAccount] = await Promise.all([
    getAccountByCode(SYSTEM_CODES.SALARY_EXPENSE),
    getAccountByCode(SYSTEM_CODES.BANK),
  ]);

  if (!expenseAccount) {
    return {
      data: null,
      error: `System account "${SYSTEM_CODES.SALARY_EXPENSE}" not found`,
    };
  }
  if (!bankAccount) {
    return {
      data: null,
      error: `System account "${SYSTEM_CODES.BANK}" not found`,
    };
  }

  return createJournalEntry({
    date: input.date,
    reference_type: "SALARY",
    reference_id: input.staffId,
    description: input.description,
    lines: [
      { account_id: expenseAccount.id, debit: input.amount, credit: 0 },
      { account_id: bankAccount.id, debit: 0, credit: input.amount },
    ],
  });
}

export interface ExpenseEntryInput {
  /** UUID of the expense record */
  expenseId: string;
  amount: number;
  /** Whether this is an inventory purchase (uses Inventory Expense) or general */
  isInventory?: boolean;
  /** ISO date string YYYY-MM-DD */
  date: string;
  description: string;
}

/**
 * Expense: debit General Expense (or Inventory Expense), credit Cash
 */
export async function createExpenseEntry(
  input: ExpenseEntryInput
): Promise<ServiceResult<JournalEntryWithLines>> {
  const expenseCode = input.isInventory
    ? SYSTEM_CODES.INVENTORY_EXPENSE
    : SYSTEM_CODES.GENERAL_EXPENSE;

  const [expenseAccount, cashAccount] = await Promise.all([
    getAccountByCode(expenseCode),
    getAccountByCode(SYSTEM_CODES.CASH),
  ]);

  if (!expenseAccount) {
    return { data: null, error: `System account "${expenseCode}" not found` };
  }
  if (!cashAccount) {
    return {
      data: null,
      error: `System account "${SYSTEM_CODES.CASH}" not found`,
    };
  }

  return createJournalEntry({
    date: input.date,
    reference_type: "EXPENSE",
    reference_id: input.expenseId,
    description: input.description,
    lines: [
      { account_id: expenseAccount.id, debit: input.amount, credit: 0 },
      { account_id: cashAccount.id, debit: 0, credit: input.amount },
    ],
  });
}

/**
 * Reverse a journal entry by creating a new entry with all debits/credits swapped.
 * This is the ONLY way to undo a journal entry — entries themselves are never deleted.
 */
export async function reverseJournalEntry(
  originalEntryId: string,
  reversalDescription: string,
  date: string
): Promise<ServiceResult<JournalEntryWithLines>> {
  const supabase = await createClient();

  // Fetch the original entry
  const { data: original, error: entryError } = await supabase
    .from("journal_entries")
    .select("*")
    .eq("id", originalEntryId)
    .single();

  if (entryError || !original) {
    return {
      data: null,
      error: entryError?.message ?? "Original journal entry not found",
    };
  }

  // Fetch its lines
  const { data: lines, error: linesError } = await supabase
    .from("journal_lines")
    .select("*")
    .eq("journal_id", originalEntryId);

  if (linesError) {
    return { data: null, error: linesError.message };
  }

  if (!lines || lines.length === 0) {
    return {
      data: null,
      error: "Original journal entry has no lines — cannot reverse",
    };
  }

  // Swap debits and credits
  const reversedLines = (lines as JournalLine[]).map((line) => ({
    account_id: line.account_id,
    debit: line.credit,
    credit: line.debit,
  }));

  return createJournalEntry({
    date,
    reference_type: original.reference_type as ReferenceType,
    reference_id: original.reference_id as string,
    description: reversalDescription,
    lines: reversedLines,
  });
}
