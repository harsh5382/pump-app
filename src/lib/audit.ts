import { supabase } from "./supabase/client";
import { requireOutletId } from "./outletContext";

export async function logAudit(
  userId: string,
  userEmail: string,
  action: string,
  resource: string,
  details?: string
) {
  const outletId = requireOutletId();
  await supabase.from("auditLogs").insert({
    userId,
    userEmail,
    action,
    resource,
    details: details ?? null,
    createdAt: new Date().toISOString(),
    outletId,
  });
}
