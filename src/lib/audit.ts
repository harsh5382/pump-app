import { supabase } from "./supabase/client";

export async function logAudit(
  userId: string,
  userEmail: string,
  action: string,
  resource: string,
  details?: string
) {
  await supabase.from("auditLogs").insert({
    userId,
    userEmail,
    action,
    resource,
    details: details ?? null,
    createdAt: new Date().toISOString(),
  });
}
