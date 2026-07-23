"use client";

import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/context/AuthContext";
import { establishServerSession } from "@/lib/sessionClient";
import { loadMyAccess, type MyAccess } from "@/server/orgs/access";
import {
  resolveCapabilities,
  type Capability,
} from "@/lib/capabilities";
import type { AccessIndexEntry } from "@/types";

const ORG_KEY = "pumpline.currentOrg";
const OUTLET_KEY = "pumpline.currentOutlet";

interface OrgContextType {
  loading: boolean;
  backendConfigured: boolean;
  organisations: AccessIndexEntry[];
  currentOrg: AccessIndexEntry | null;
  currentOutletId: string | null;
  isPlatformSuperAdmin: boolean;
  /** True when signed in but not a member of any organisation (needs onboarding). */
  needsOnboarding: boolean;
  setCurrentOrg: (organisationId: string) => void;
  setCurrentOutlet: (outletId: string) => void;
  hasCapability: (capability: Capability) => boolean;
  refresh: () => Promise<void>;
}

const OrgContext = createContext<OrgContextType | undefined>(undefined);

export function OrgProvider({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const [access, setAccess] = useState<MyAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [currentOutletId, setCurrentOutletId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const result = await loadMyAccess();
      setAccess(result);
    } catch {
      setAccess({ signedIn: false, backendConfigured: true, organisations: [] });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAccess(null);
      setLoading(false);
      return;
    }
    // Ensure the server session cookie exists (covers persisted client sessions
    // that never hit the login form this visit) before loading access.
    (async () => {
      await establishServerSession();
      await refresh();
    })();
  }, [user, authLoading, refresh]);

  // Resolve the current org/outlet selection against actual memberships.
  const organisations = access?.organisations ?? [];
  const currentOrg = useMemo(() => {
    if (!organisations.length) return null;
    const stored =
      currentOrgId ??
      (typeof window !== "undefined" ? localStorage.getItem(ORG_KEY) : null);
    return (
      organisations.find((o) => o.organisationId === stored) ?? organisations[0]
    );
  }, [organisations, currentOrgId]);

  const resolvedOutletId = useMemo(() => {
    if (!currentOrg) return null;
    const outletIds = Object.keys(currentOrg.outletRoles ?? {});
    if (!outletIds.length) return null;
    const stored =
      currentOutletId ??
      (typeof window !== "undefined" ? localStorage.getItem(OUTLET_KEY) : null);
    return outletIds.includes(stored ?? "") ? stored! : outletIds[0];
  }, [currentOrg, currentOutletId]);

  const setCurrentOrg = useCallback((organisationId: string) => {
    setCurrentOrgId(organisationId);
    setCurrentOutletId(null);
    if (typeof window !== "undefined") {
      localStorage.setItem(ORG_KEY, organisationId);
      localStorage.removeItem(OUTLET_KEY);
    }
  }, []);

  const setCurrentOutlet = useCallback((outletId: string) => {
    setCurrentOutletId(outletId);
    if (typeof window !== "undefined") localStorage.setItem(OUTLET_KEY, outletId);
  }, []);

  const capabilities = useMemo(() => {
    if (!currentOrg) return new Set<Capability>();
    const outletRole = resolvedOutletId
      ? currentOrg.outletRoles[resolvedOutletId]
      : undefined;
    return resolveCapabilities({
      organisationRole: currentOrg.organisationRole,
      outletRole,
    });
  }, [currentOrg, resolvedOutletId]);

  const hasCapability = useCallback(
    (capability: Capability) => capabilities.has(capability),
    [capabilities],
  );

  const value: OrgContextType = {
    loading: loading || authLoading,
    backendConfigured: access?.backendConfigured ?? false,
    organisations,
    currentOrg,
    currentOutletId: resolvedOutletId,
    isPlatformSuperAdmin: access?.isPlatformSuperAdmin ?? false,
    needsOnboarding: Boolean(
      user && access?.backendConfigured && organisations.length === 0,
    ),
    setCurrentOrg,
    setCurrentOutlet,
    hasCapability,
    refresh,
  };

  return <OrgContext.Provider value={value}>{children}</OrgContext.Provider>;
}

export function useOrg() {
  const ctx = useContext(OrgContext);
  if (ctx === undefined) throw new Error("useOrg must be used within OrgProvider");
  return ctx;
}
