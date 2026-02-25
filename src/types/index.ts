export type UserRole = "admin" | "manager" | "staff";

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt: string;
  updatedAt: string;
}

export interface FuelType {
  id: string;
  name: string;
  unit: string;
  createdAt: string;
}

export interface Tank {
  id: string;
  name: string;
  fuelTypeId: string;
  capacityLiters: number;
  currentStockLiters: number;
  createdAt: string;
  updatedAt: string;
}

export interface DipEntry {
  id: string;
  tankId: string;
  date: string;
  dipReading: number;
  actualQuantity: number;
  expectedQuantity: number;
  lossOrGain: number; // positive = gain, negative = loss
  enteredBy: string;
  createdAt: string;
}

export interface Nozzle {
  id: string;
  machineNumber: string;
  fuelTypeId: string;
  tankId: string;
  createdAt: string;
  updatedAt: string;
}

export interface MeterReading {
  id: string;
  nozzleId: string;
  date: string;
  openingMeter: number;
  closingMeter: number;
  fuelSold: number; // closing - opening
  enteredBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface TankerDelivery {
  id: string;
  date: string;
  tankerCompany: string;
  invoiceNumber: string;
  fuelTypeId: string;
  tankId: string;
  quantityLiters: number;
  enteredBy: string;
  createdAt: string;
}

export type PaymentType = "cash" | "upi" | "credit_card" | "fleet_card" | "credit_customer";

export interface PaymentEntry {
  id: string;
  date: string;
  paymentType: PaymentType;
  amount: number;
  notes?: string;
  enteredBy: string;
  createdAt: string;
}

export interface DailySaleCorrection {
  id: string;
  date: string;
  fuelTypeId: string;
  correctionLiters: number;
  reason: string;
  enteredBy: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  date: string;
  category: string; // generator_diesel | maintenance | cleaning | salary_advance | other
  amount: number;
  description: string;
  enteredBy: string;
  createdAt: string;
}

export interface StaffShift {
  id: string;
  staffName: string;
  date: string;
  shiftStart: string;
  shiftEnd: string;
  assignedNozzleIds: string[];
  cashCollected: number;
  enteredBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  type: "low_stock" | "meter_not_entered" | "payment_mismatch" | "info";
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  userId?: string; // if user-specific
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  details?: string;
  createdAt: string;
}
