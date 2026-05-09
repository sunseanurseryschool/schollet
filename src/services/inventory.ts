import { createClient } from "@/lib/supabase/server";
import { createExpenseEntry } from "@/services/ledger";
import type { InventoryItem, InventoryTransaction } from "@/types/database";
import type {
  CreateInventoryItemInput,
  UpdateInventoryItemInput,
  CreateInventoryTransactionInput,
  InventoryListQuery,
} from "@/lib/schemas/inventory";

export interface ServiceResult<T> {
  data: T | null;
  error: string | null;
}

export async function listInventoryItems(
  query: InventoryListQuery
): Promise<ServiceResult<InventoryItem[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return { data: null, error: error.message };
    }

    const items = (data ?? []) as InventoryItem[];

    // low_stock filter applied client-side: quantity <= min_quantity
    // PostgREST does not support column-to-column comparison via the JS client,
    // so we fetch all rows and filter in JS.
    if (query.low_stock === true) {
      return {
        data: items.filter((item) => item.quantity <= item.min_quantity),
        error: null,
      };
    }

    return { data: items, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function getInventoryItemById(
  id: string
): Promise<ServiceResult<InventoryItem>> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as InventoryItem, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function createInventoryItem(
  input: CreateInventoryItemInput
): Promise<ServiceResult<InventoryItem>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("inventory_items")
      .insert({
        name: input.name,
        unit: input.unit,
        min_quantity: input.min_quantity,
        quantity: input.initial_quantity,
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as InventoryItem, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function updateInventoryItem(
  id: string,
  input: UpdateInventoryItemInput
): Promise<ServiceResult<InventoryItem>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("inventory_items")
      .update(input)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: data as InventoryItem, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function deleteInventoryItem(
  id: string
): Promise<ServiceResult<boolean>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("inventory_items")
      .delete()
      .eq("id", id);

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export async function listInventoryTransactions(
  itemId: string
): Promise<ServiceResult<InventoryTransaction[]>> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("inventory_transactions")
      .select("*")
      .eq("item_id", itemId)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }
    return { data: (data ?? []) as InventoryTransaction[], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}

export interface RecordTransactionResult {
  transaction: InventoryTransaction;
  updatedItem: InventoryItem;
}

export async function recordInventoryTransaction(
  itemId: string,
  input: CreateInventoryTransactionInput
): Promise<ServiceResult<RecordTransactionResult>> {
  try {
    const supabase = await createClient();

    // Fetch the current item to validate stock
    const { data: item, error: fetchError } = await supabase
      .from("inventory_items")
      .select("*")
      .eq("id", itemId)
      .single();

    if (fetchError || !item) {
      return {
        data: null,
        error: fetchError?.message ?? "Inventory item not found",
      };
    }

    const currentItem = item as InventoryItem;

    // Compute new quantity
    let newQuantity: number;
    if (input.type === "IN") {
      newQuantity = currentItem.quantity + input.quantity;
    } else {
      // OUT — validate sufficient stock
      if (input.quantity > currentItem.quantity) {
        return {
          data: null,
          error: `Insufficient stock. Available: ${currentItem.quantity} ${currentItem.unit}, Requested: ${input.quantity} ${currentItem.unit}`,
        };
      }
      newQuantity = currentItem.quantity - input.quantity;
    }

    // Insert the transaction record
    const { data: txnData, error: txnError } = await supabase
      .from("inventory_transactions")
      .insert({
        item_id: itemId,
        type: input.type,
        quantity: input.quantity,
        description: input.description,
        date: input.date,
      })
      .select()
      .single();

    if (txnError || !txnData) {
      return {
        data: null,
        error: txnError?.message ?? "Failed to record transaction",
      };
    }

    const transaction = txnData as InventoryTransaction;

    // Update the item quantity
    const { data: updatedData, error: updateError } = await supabase
      .from("inventory_items")
      .update({ quantity: newQuantity })
      .eq("id", itemId)
      .select()
      .single();

    if (updateError || !updatedData) {
      return {
        data: null,
        error: updateError?.message ?? "Failed to update item quantity",
      };
    }

    const updatedItem = updatedData as InventoryItem;

    // For IN transactions that are purchases: create ledger journal entry
    if (input.type === "IN" && input.is_purchase && input.amount != null && input.amount > 0) {
      const ledgerResult = await createExpenseEntry({
        expenseId: transaction.id,
        amount: input.amount,
        isInventory: true,
        date: input.date,
        description: input.description || `Inventory purchase: ${currentItem.name} x${input.quantity}`,
      });

      if (ledgerResult.error) {
        // Log the ledger failure but do not roll back the stock movement.
        // Financial reconciliation can be done manually; stock accuracy is the priority.
        console.error(
          `Ledger entry failed for inventory transaction ${transaction.id}: ${ledgerResult.error}`
        );
      }
    }

    return {
      data: { transaction, updatedItem },
      error: null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { data: null, error: message };
  }
}
