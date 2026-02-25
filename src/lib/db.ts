import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import { db } from "./firebase";
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

// Fuel types
export async function getFuelTypes(): Promise<FuelType[]> {
  const snap = await getDocs(collection(db, "fuelTypes"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as FuelType));
}

export async function addFuelType(name: string, unit: string): Promise<string> {
  const ref = await addDoc(collection(db, "fuelTypes"), {
    name,
    unit: unit || "L",
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

// Tanks
export async function getTanks(): Promise<Tank[]> {
  const snap = await getDocs(collection(db, "tanks"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Tank));
}

export async function addTank(data: Omit<Tank, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, "tanks"), {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateTankStock(id: string, currentStockLiters: number): Promise<void> {
  await updateDoc(doc(db, "tanks", id), {
    currentStockLiters,
    updatedAt: new Date().toISOString(),
  });
}

// Nozzles
export async function getNozzles(): Promise<Nozzle[]> {
  const snap = await getDocs(collection(db, "nozzles"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Nozzle));
}

export async function addNozzle(data: Omit<Nozzle, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, "nozzles"), { ...data, createdAt: now, updatedAt: now });
  return ref.id;
}

// Meter readings
export async function getMeterReadingsByDate(date: string): Promise<MeterReading[]> {
  const q = query(
    collection(db, "meterReadings"),
    where("date", "==", date)
  );
  const snap = await getDocs(q);
  const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as MeterReading));
  list.sort((a, b) => a.nozzleId.localeCompare(b.nozzleId));
  return list;
}

export async function getMeterReadingsForNozzle(nozzleId: string, date: string) {
  const q = query(
    collection(db, "meterReadings"),
    where("nozzleId", "==", nozzleId),
    where("date", "==", date)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as MeterReading))[0] ?? null;
}

export async function saveMeterReading(data: Omit<MeterReading, "id" | "fuelSold" | "createdAt" | "updatedAt">): Promise<string> {
  const fuelSold = data.closingMeter - data.openingMeter;
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, "meterReadings"), {
    ...data,
    fuelSold,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function updateMeterReading(
  id: string,
  data: Partial<Pick<MeterReading, "openingMeter" | "closingMeter">>
): Promise<void> {
  const current = (await getDoc(doc(db, "meterReadings", id))).data() as MeterReading;
  const closing = data.closingMeter ?? current.closingMeter;
  const opening = data.openingMeter ?? current.openingMeter;
  await updateDoc(doc(db, "meterReadings", id), {
    ...data,
    fuelSold: closing - opening,
    updatedAt: new Date().toISOString(),
  });
}

// Tanker deliveries
export async function getTankerDeliveriesByDate(date: string): Promise<TankerDelivery[]> {
  const q = query(
    collection(db, "tankerDeliveries"),
    where("date", "==", date)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as TankerDelivery));
}

export async function addTankerDelivery(
  data: Omit<TankerDelivery, "id" | "createdAt" | "tankId">,
  tankId: string
): Promise<string> {
  const ref = await addDoc(collection(db, "tankerDeliveries"), {
    ...data,
    tankId,
    createdAt: new Date().toISOString(),
  });
  const tankSnap = await getDoc(doc(db, "tanks", tankId));
  if (tankSnap.exists()) {
    const tank = tankSnap.data() as Tank;
    await updateTankStock(tankId, tank.currentStockLiters + data.quantityLiters);
  }
  return ref.id;
}

// Payments
export async function getPaymentsByDate(date: string): Promise<PaymentEntry[]> {
  const q = query(
    collection(db, "payments"),
    where("date", "==", date)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentEntry));
}

export async function addPayment(data: Omit<PaymentEntry, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "payments"), {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

// Dip entries
export async function getDipEntriesByDate(date: string): Promise<DipEntry[]> {
  const q = query(
    collection(db, "dipEntries"),
    where("date", "==", date)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as DipEntry));
}

export async function addDipEntry(data: Omit<DipEntry, "id" | "createdAt">): Promise<string> {
  return (await addDoc(collection(db, "dipEntries"), {
    ...data,
    createdAt: new Date().toISOString(),
  })).id;
}

// Expenses
export async function getExpensesByDate(date: string): Promise<Expense[]> {
  const q = query(
    collection(db, "expenses"),
    where("date", "==", date)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
}

export async function addExpense(data: Omit<Expense, "id" | "createdAt">): Promise<string> {
  const ref = await addDoc(collection(db, "expenses"), {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

// Shifts
export async function getShiftsByDate(date: string): Promise<StaffShift[]> {
  const q = query(
    collection(db, "shifts"),
    where("date", "==", date)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as StaffShift));
}

export async function addShift(data: Omit<StaffShift, "id" | "createdAt" | "updatedAt">): Promise<string> {
  const now = new Date().toISOString();
  const ref = await addDoc(collection(db, "shifts"), { ...data, createdAt: now, updatedAt: now });
  return ref.id;
}

// Users (admin)
export async function getUsers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserProfile));
}

// Notifications
export async function getNotifications(userId?: string): Promise<Notification[]> {
  let q = query(
    collection(db, "notifications"),
    orderBy("createdAt", "desc"),
    limit(50)
  );
  if (userId) {
    q = query(
      collection(db, "notifications"),
      where("userId", "in", [userId, null]),
      orderBy("createdAt", "desc"),
      limit(50)
    );
  }
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Notification));
}

export async function addNotification(
  data: Omit<Notification, "id" | "read">
): Promise<string> {
  const ref = await addDoc(collection(db, "notifications"), {
    ...data,
    read: false,
    createdAt: new Date().toISOString(),
  });
  return ref.id;
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, "notifications", id), { read: true });
}

// Date range: iterate days to avoid composite index
export async function getMeterReadingsDateRange(start: string, end: string): Promise<MeterReading[]> {
  const out: MeterReading[] = [];
  const startD = new Date(start);
  const endD = new Date(end);
  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    const day = d.toISOString().split("T")[0];
    const q = query(
      collection(db, "meterReadings"),
      where("date", "==", day)
    );
    const snap = await getDocs(q);
    snap.docs.forEach((doc) => out.push({ id: doc.id, ...doc.data() } as MeterReading));
  }
  return out;
}

export async function getTankerDeliveriesDateRange(start: string, end: string): Promise<TankerDelivery[]> {
  const out: TankerDelivery[] = [];
  const startD = new Date(start);
  const endD = new Date(end);
  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    const day = d.toISOString().split("T")[0];
    const list = await getTankerDeliveriesByDate(day);
    out.push(...list);
  }
  return out;
}

export async function getPaymentsDateRange(start: string, end: string): Promise<PaymentEntry[]> {
  const ref = collection(db, "payments");
  const q = query(ref, where("date", ">=", start), where("date", "<=", end));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PaymentEntry));
}

export async function getExpensesDateRange(start: string, end: string): Promise<Expense[]> {
  const ref = collection(db, "expenses");
  const q = query(ref, where("date", ">=", start), where("date", "<=", end));
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense));
}

export async function getShiftsDateRange(start: string, end: string): Promise<StaffShift[]> {
  const out: StaffShift[] = [];
  const startD = new Date(start);
  const endD = new Date(end);
  for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
    const day = d.toISOString().split("T")[0];
    const list = await getShiftsByDate(day);
    out.push(...list);
  }
  return out;
}
