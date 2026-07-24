import { supabase } from "./supabase/client";
import type {
  FuelType,
  Tank,
  Nozzle,
  MeterReading,
  TankerDelivery,
  PaymentEntry,
  DipEntry,
  Expense,
  StaffShift,
  UserProfile,
  Notification,
} from "@/types";

// ───────────────────────────────────────────────────────────────────────────
// Data access layer (Supabase / Postgres). Function signatures are unchanged
// from the previous Firestore implementation so callers (the dashboard pages)
// need no edits. Domain tables use camelCase columns, so rows map directly onto
// the domain types.
//
// PHASE 2: tenant-scope these queries by the current outlet ("outletId").
// ───────────────────────────────────────────────────────────────────────────

/** Throw on a Supabase error so existing try/catch → toast.error paths fire. */
function unwrap<T>(res: { data: T; error: { message: string } | null }): NonNullable<T> {
  if (res.error) throw new Error(res.error.message);
  return res.data as NonNullable<T>;
}

// Fuel types
export async function getFuelTypes(): Promise<FuelType[]> {
  return unwrap(await supabase.from("fuelTypes").select("*")) as FuelType[];
}

export async function addFuelType(name: string, unit: string): Promise<string> {
  const data = unwrap(
    await supabase
      .from("fuelTypes")
      .insert({ name, unit: unit || "L", createdAt: new Date().toISOString() })
      .select("id")
      .single(),
  );
  return data.id;
}

export async function updateFuelType(id: string, data: { name?: string; unit?: string }): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.unit !== undefined) payload.unit = data.unit;
  unwrap(await supabase.from("fuelTypes").update(payload).eq("id", id).select("id"));
}

export async function deleteFuelType(id: string): Promise<void> {
  unwrap(await supabase.from("fuelTypes").delete().eq("id", id).select("id"));
}

// Tanks
export async function getTanks(): Promise<Tank[]> {
  return unwrap(await supabase.from("tanks").select("*")) as Tank[];
}

export async function addTank(data: Omit<Tank, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const now = new Date().toISOString();
  const row = unwrap(
    await supabase
      .from("tanks")
      .insert({ ...data, createdAt: now, updatedAt: now })
      .select("id")
      .single(),
  );
  return row.id;
}

export async function updateTankStock(id: string, currentStockLiters: number): Promise<void> {
  unwrap(
    await supabase
      .from("tanks")
      .update({ currentStockLiters, updatedAt: new Date().toISOString() })
      .eq("id", id)
      .select("id"),
  );
}

export async function updateTank(
  id: string,
  data: Partial<Pick<Tank, "name" | "fuelTypeId" | "capacityLiters">>
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (data.name !== undefined) payload.name = data.name;
  if (data.fuelTypeId !== undefined) payload.fuelTypeId = data.fuelTypeId;
  if (data.capacityLiters !== undefined) payload.capacityLiters = data.capacityLiters;
  unwrap(await supabase.from("tanks").update(payload).eq("id", id).select("id"));
}

export async function deleteTank(id: string): Promise<void> {
  unwrap(await supabase.from("tanks").delete().eq("id", id).select("id"));
}

// Nozzles
export async function getNozzles(): Promise<Nozzle[]> {
  return unwrap(await supabase.from("nozzles").select("*")) as Nozzle[];
}

export async function addNozzle(data: Omit<Nozzle, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const now = new Date().toISOString();
  const row = unwrap(
    await supabase.from("nozzles").insert({ ...data, createdAt: now, updatedAt: now }).select("id").single(),
  );
  return row.id;
}

export async function updateNozzle(
  id: string,
  data: Partial<Pick<Nozzle, "machineNumber" | "fuelTypeId" | "tankId">>
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  if (data.machineNumber !== undefined) payload.machineNumber = data.machineNumber;
  if (data.fuelTypeId !== undefined) payload.fuelTypeId = data.fuelTypeId;
  if (data.tankId !== undefined) payload.tankId = data.tankId;
  unwrap(await supabase.from("nozzles").update(payload).eq("id", id).select("id"));
}

export async function deleteNozzle(id: string): Promise<void> {
  unwrap(await supabase.from("nozzles").delete().eq("id", id).select("id"));
}

// Meter readings
export async function getMeterReadingsByDate(date: string): Promise<MeterReading[]> {
  const list = unwrap(
    await supabase.from("meterReadings").select("*").eq("date", date),
  ) as MeterReading[];
  list.sort((a, b) => a.nozzleId.localeCompare(b.nozzleId));
  return list;
}

export async function getMeterReadingsForNozzle(nozzleId: string, date: string) {
  const list = unwrap(
    await supabase
      .from("meterReadings")
      .select("*")
      .eq("nozzleId", nozzleId)
      .eq("date", date),
  ) as MeterReading[];
  return list[0] ?? null;
}

export async function saveMeterReading(data: Omit<MeterReading, "id" | "fuelSold" | "createdAt" | "updatedAt">): Promise<string> {
  const fuelSold = data.closingMeter - data.openingMeter;
  const now = new Date().toISOString();
  const row = unwrap(
    await supabase
      .from("meterReadings")
      .insert({ ...data, fuelSold, createdAt: now, updatedAt: now })
      .select("id")
      .single(),
  );
  return row.id;
}

export async function updateMeterReading(
  id: string,
  data: Partial<Pick<MeterReading, "openingMeter" | "closingMeter">>
): Promise<void> {
  const current = unwrap(
    await supabase.from("meterReadings").select("*").eq("id", id).single(),
  ) as MeterReading;
  const closing = data.closingMeter ?? current.closingMeter;
  const opening = data.openingMeter ?? current.openingMeter;
  unwrap(
    await supabase
      .from("meterReadings")
      .update({ ...data, fuelSold: closing - opening, updatedAt: new Date().toISOString() })
      .eq("id", id)
      .select("id"),
  );
}

export async function deleteMeterReading(id: string): Promise<void> {
  unwrap(await supabase.from("meterReadings").delete().eq("id", id).select("id"));
}

// Tanker deliveries
export async function getTankerDeliveriesByDate(date: string): Promise<TankerDelivery[]> {
  return unwrap(
    await supabase.from("tankerDeliveries").select("*").eq("date", date),
  ) as TankerDelivery[];
}

export async function addTankerDelivery(
  data: Omit<TankerDelivery, "id" | "createdAt" | "tankId">,
  tankId: string
): Promise<string> {
  const row = unwrap(
    await supabase
      .from("tankerDeliveries")
      .insert({ ...data, tankId, createdAt: new Date().toISOString() })
      .select("id")
      .single(),
  );
  const tank = unwrap(
    await supabase.from("tanks").select("currentStockLiters").eq("id", tankId).maybeSingle(),
  ) as { currentStockLiters: number } | null;
  if (tank) {
    await updateTankStock(tankId, tank.currentStockLiters + data.quantityLiters);
  }
  return row.id;
}

export async function updateTankerDelivery(
  id: string,
  data: Partial<Pick<TankerDelivery, "tankerCompany" | "invoiceNumber" | "quantityLiters" | "tankId" | "fuelTypeId">>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  (["tankerCompany", "invoiceNumber", "quantityLiters", "tankId", "fuelTypeId"] as const).forEach((k) => {
    if (data[k] !== undefined) payload[k] = data[k];
  });
  unwrap(await supabase.from("tankerDeliveries").update(payload).eq("id", id).select("id"));
}

export async function deleteTankerDelivery(id: string): Promise<void> {
  const d = unwrap(
    await supabase.from("tankerDeliveries").select("*").eq("id", id).maybeSingle(),
  ) as TankerDelivery | null;
  if (d) {
    const tank = unwrap(
      await supabase.from("tanks").select("currentStockLiters").eq("id", d.tankId).maybeSingle(),
    ) as { currentStockLiters: number } | null;
    if (tank) {
      await updateTankStock(d.tankId, Math.max(0, tank.currentStockLiters - d.quantityLiters));
    }
  }
  unwrap(await supabase.from("tankerDeliveries").delete().eq("id", id).select("id"));
}

// Payments
export async function getPaymentsByDate(date: string): Promise<PaymentEntry[]> {
  return unwrap(
    await supabase.from("payments").select("*").eq("date", date),
  ) as PaymentEntry[];
}

export async function addPayment(data: Omit<PaymentEntry, "id" | "createdAt">): Promise<PaymentEntry> {
  const createdAt = new Date().toISOString();
  const row = unwrap(
    await supabase.from("payments").insert({ ...data, createdAt }).select("*").single(),
  ) as PaymentEntry;
  return row;
}

export async function updatePayment(
  id: string,
  data: Partial<Pick<PaymentEntry, "paymentType" | "amount" | "notes">>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.paymentType !== undefined) payload.paymentType = data.paymentType;
  if (data.amount !== undefined) payload.amount = data.amount;
  if (data.notes !== undefined) payload.notes = data.notes;
  unwrap(await supabase.from("payments").update(payload).eq("id", id).select("id"));
}

export async function deletePayment(id: string): Promise<void> {
  unwrap(await supabase.from("payments").delete().eq("id", id).select("id"));
}

// Dip entries
export async function getDipEntriesByDate(date: string): Promise<DipEntry[]> {
  return unwrap(
    await supabase.from("dipEntries").select("*").eq("date", date),
  ) as DipEntry[];
}

export async function addDipEntry(data: Omit<DipEntry, "id" | "createdAt">): Promise<string> {
  const row = unwrap(
    await supabase.from("dipEntries").insert({ ...data, createdAt: new Date().toISOString() }).select("id").single(),
  );
  return row.id;
}

export async function updateDipEntry(
  id: string,
  data: Partial<Pick<DipEntry, "dipReading" | "actualQuantity" | "expectedQuantity" | "lossOrGain">>
): Promise<void> {
  unwrap(await supabase.from("dipEntries").update(data).eq("id", id).select("id"));
}

export async function deleteDipEntry(id: string): Promise<void> {
  unwrap(await supabase.from("dipEntries").delete().eq("id", id).select("id"));
}

// Expenses
export async function getExpensesByDate(date: string): Promise<Expense[]> {
  return unwrap(
    await supabase.from("expenses").select("*").eq("date", date),
  ) as Expense[];
}

export async function addExpense(data: Omit<Expense, "id" | "createdAt">): Promise<string> {
  const row = unwrap(
    await supabase.from("expenses").insert({ ...data, createdAt: new Date().toISOString() }).select("id").single(),
  );
  return row.id;
}

export async function updateExpense(
  id: string,
  data: Partial<Pick<Expense, "date" | "category" | "amount" | "description">>
): Promise<void> {
  const payload: Record<string, unknown> = {};
  (["date", "category", "amount", "description"] as const).forEach((k) => {
    if (data[k] !== undefined) payload[k] = data[k];
  });
  unwrap(await supabase.from("expenses").update(payload).eq("id", id).select("id"));
}

export async function deleteExpense(id: string): Promise<void> {
  unwrap(await supabase.from("expenses").delete().eq("id", id).select("id"));
}

// Shifts
export async function getShiftsByDate(date: string): Promise<StaffShift[]> {
  return unwrap(
    await supabase.from("shifts").select("*").eq("date", date),
  ) as StaffShift[];
}

export async function addShift(data: Omit<StaffShift, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const now = new Date().toISOString();
  const row = unwrap(
    await supabase.from("shifts").insert({ ...data, createdAt: now, updatedAt: now }).select("id").single(),
  );
  return row.id;
}

export async function updateShift(
  id: string,
  data: Partial<Pick<StaffShift, "staffName" | "date" | "shiftStart" | "shiftEnd" | "assignedNozzleIds" | "cashCollected">>
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  (["staffName", "date", "shiftStart", "shiftEnd", "assignedNozzleIds", "cashCollected"] as const).forEach((k) => {
    if (data[k] !== undefined) payload[k] = data[k];
  });
  unwrap(await supabase.from("shifts").update(payload).eq("id", id).select("id"));
}

export async function deleteShift(id: string): Promise<void> {
  unwrap(await supabase.from("shifts").delete().eq("id", id).select("id"));
}

// Users (admin). Maps the profiles table → UserProfile. Note: RLS restricts the
// browser to the caller's own profile row; org-member management is server-side
// (see src/server/orgs). PHASE 2 replaces this page with org member management.
export async function getUsers(): Promise<UserProfile[]> {
  const rows = unwrap(await supabase.from("profiles").select("*")) as Array<{
    id: string;
    email: string;
    display_name: string;
    phone: string | null;
    accepted_terms_version: string | null;
    accepted_privacy_version: string | null;
    created_at: string;
    updated_at: string;
  }>;
  return rows.map((r) => ({
    uid: r.id,
    email: r.email,
    displayName: r.display_name,
    phone: r.phone ?? undefined,
    acceptedTermsVersion: r.accepted_terms_version ?? undefined,
    acceptedPrivacyVersion: r.accepted_privacy_version ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}

export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, "displayName" | "role">>
): Promise<void> {
  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (data.displayName !== undefined) payload.display_name = data.displayName;
  // Legacy global `role` is no longer stored — authority is per-org/outlet.
  unwrap(await supabase.from("profiles").update(payload).eq("id", uid).select("id"));
}

export async function deleteUserProfile(uid: string): Promise<void> {
  unwrap(await supabase.from("profiles").delete().eq("id", uid).select("id"));
}

// Notifications (fetch latest 50 ordered; filter by userId in memory to match
// the previous behavior).
export async function getNotifications(userId?: string): Promise<Notification[]> {
  let list = unwrap(
    await supabase.from("notifications").select("*").order("createdAt", { ascending: false }).limit(50),
  ) as Notification[];
  if (userId) {
    list = list.filter((n) => n.userId === userId || n.userId == null);
  }
  return list;
}

export async function addNotification(
  data: Omit<Notification, "id" | "read">
): Promise<string> {
  const row = unwrap(
    await supabase
      .from("notifications")
      .insert({ ...data, read: false, createdAt: new Date().toISOString() })
      .select("id")
      .single(),
  );
  return row.id;
}

export async function markNotificationRead(id: string): Promise<void> {
  unwrap(await supabase.from("notifications").update({ read: true }).eq("id", id).select("id"));
}

export async function deleteNotification(id: string): Promise<void> {
  unwrap(await supabase.from("notifications").delete().eq("id", id).select("id"));
}

// Date ranges. Payments/expenses use a server-side range filter; the others
// keep the day-by-day iteration to mirror the prior behavior.
export async function getMeterReadingsDateRange(start: string, end: string): Promise<MeterReading[]> {
  return unwrap(
    await supabase.from("meterReadings").select("*").gte("date", start).lte("date", end),
  ) as MeterReading[];
}

export async function getTankerDeliveriesDateRange(start: string, end: string): Promise<TankerDelivery[]> {
  return unwrap(
    await supabase.from("tankerDeliveries").select("*").gte("date", start).lte("date", end),
  ) as TankerDelivery[];
}

export async function getPaymentsDateRange(start: string, end: string): Promise<PaymentEntry[]> {
  return unwrap(
    await supabase.from("payments").select("*").gte("date", start).lte("date", end),
  ) as PaymentEntry[];
}

export async function getExpensesDateRange(start: string, end: string): Promise<Expense[]> {
  return unwrap(
    await supabase.from("expenses").select("*").gte("date", start).lte("date", end),
  ) as Expense[];
}

export async function getShiftsDateRange(start: string, end: string): Promise<StaffShift[]> {
  return unwrap(
    await supabase.from("shifts").select("*").gte("date", start).lte("date", end),
  ) as StaffShift[];
}
