import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";
import type { AuditLog } from "@/types";

export async function logAudit(
  userId: string,
  userEmail: string,
  action: string,
  resource: string,
  details?: string
) {
  const entry: Omit<AuditLog, "id"> = {
    userId,
    userEmail,
    action,
    resource,
    details,
    createdAt: new Date().toISOString(),
  };
  await addDoc(collection(db, "auditLogs"), entry);
}
