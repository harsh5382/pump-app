"use client";

import { useState } from "react";
import { useOrg } from "@/context/OrgContext";
import { createInvitation } from "@/server/orgs/invitations";
import { useToast } from "@/components/ui/Toast";
import type { OrganisationRole, OutletRole } from "@/types";

// Friendly role presets → (organisationRole, outletRole) the backend stores.
const ROLE_PRESETS: Record<
  string,
  { label: string; hint: string; orgRole: OrganisationRole; outletRole: OutletRole }
> = {
  manager: {
    label: "Manager",
    hint: "Runs daily operations, closes & approves shifts, sees reports.",
    orgRole: "member",
    outletRole: "manager",
  },
  operator: {
    label: "Operator",
    hint: "Enters shift readings, payments and dips. No finance or deletes.",
    orgRole: "member",
    outletRole: "operator",
  },
  outlet_admin: {
    label: "Outlet admin",
    hint: "Full configuration of this outlet and its team.",
    orgRole: "member",
    outletRole: "outlet_admin",
  },
  accountant: {
    label: "Accountant",
    hint: "Payments, expenses, credit and reports across the organisation.",
    orgRole: "accountant",
    outletRole: "accountant",
  },
  organisation_admin: {
    label: "Organisation admin",
    hint: "Manages settings, outlets and members (not billing/ownership).",
    orgRole: "organisation_admin",
    outletRole: "outlet_admin",
  },
};

export default function TeamPage() {
  const { currentOrg, currentOutletId, hasCapability, loading, backendConfigured } =
    useOrg();
  const [email, setEmail] = useState("");
  const [preset, setPreset] = useState("manager");
  const [inviteLink, setInviteLink] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const canManage = hasCapability("org.manage_members");

  if (loading) return null;

  if (!backendConfigured) {
    return (
      <div className="card p-6">
        <p className="card-title mb-1">Team</p>
        <p className="text-sm text-ink-500">
          The trusted backend isn&apos;t configured yet. Add the Firebase
          service account to enable invitations.
        </p>
      </div>
    );
  }

  if (!currentOrg || !canManage) {
    return (
      <div className="card p-6">
        <p className="card-title mb-1">Team</p>
        <p className="text-sm text-ink-500">
          You don&apos;t have permission to manage members in this organisation.
        </p>
      </div>
    );
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteLink("");
    setCopied(false);
    if (!currentOutletId) {
      toast.warning("Select an outlet first.");
      return;
    }
    setBusy(true);
    try {
      const p = ROLE_PRESETS[preset];
      const result = await createInvitation({
        organisationId: currentOrg!.organisationId,
        email,
        organisationRole: p.orgRole,
        outletRoles: { [currentOutletId]: p.outletRole },
      });
      if (!result.ok || !result.token) {
        toast.error(result.error ?? "Could not create the invitation.");
      } else {
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        setInviteLink(
          `${origin}/invite/accept?org=${currentOrg!.organisationId}&token=${result.token}`,
        );
        setEmail("");
        toast.success("Invite link created — share it with your teammate.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6 max-w-[680px]">
      <div>
        <h1 className="page-title">Team</h1>
        <p className="page-sub">
          Invite managers and staff to {currentOrg.organisationName}. They set
          their own password — you never handle their credentials.
        </p>
      </div>

      <form onSubmit={handleInvite} className="card p-6 space-y-5">
        <p className="card-title">Invite a teammate</p>
        <div className="field">
          <label htmlFor="invite-email" className="field-label">Email</label>
          <input id="invite-email" type="email" className="input" required
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="teammate@example.com" />
        </div>
        <div className="field">
          <label htmlFor="invite-role" className="field-label">Role</label>
          <select id="invite-role" className="input" value={preset}
            onChange={(e) => setPreset(e.target.value)}>
            {Object.entries(ROLE_PRESETS).map(([key, p]) => (
              <option key={key} value={key}>{p.label}</option>
            ))}
          </select>
          <p className="text-xs text-ink-400 mt-1.5">{ROLE_PRESETS[preset].hint}</p>
        </div>

        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? "Creating invite…" : "Create invite link"}
        </button>
      </form>

      {inviteLink && (
        <div className="card p-6 space-y-3">
          <p className="card-title">Invite link ready</p>
          <p className="text-sm text-ink-500">
            Share this single-use link with your teammate. It expires in 7 days.
            (Email delivery is added in a later phase.)
          </p>
          <div className="flex gap-2">
            <input readOnly className="input flex-1 text-[13px]" value={inviteLink}
              onFocus={(e) => e.target.select()} />
            <button type="button" className="btn btn-ghost"
              onClick={() => {
                navigator.clipboard?.writeText(inviteLink);
                setCopied(true);
                toast.success("Invite link copied to clipboard.");
              }}>
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
