"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { provisionOrganisation } from "@/server/orgs/provision";
import { useToast } from "@/components/ui/Toast";

const TERMS_VERSION = "2026-06-28";
const PRIVACY_VERSION = "2026-06-28";

const OMC_BRANDS = ["IOCL", "BPCL", "HPCL", "Reliance", "Nayara", "Shell", "Other"];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { organisations, loading: orgLoading, refresh } = useOrg();

  const [orgName, setOrgName] = useState("");
  const [outletName, setOutletName] = useState("");
  const [code, setCode] = useState("");
  const [omcBrand, setOmcBrand] = useState("IOCL");
  const [state, setState] = useState("");
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();

  // Not signed in → login. Already onboarded → dashboard.
  useEffect(() => {
    if (authLoading) return;
    if (!user) router.replace("/login");
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!orgLoading && organisations.length > 0) router.replace("/dashboard");
  }, [organisations, orgLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      toast.warning("Please accept the Terms and Privacy Notice to continue.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await provisionOrganisation({
        organisationName: orgName,
        outlet: { name: outletName, code, omcBrand, state },
        acceptedTermsVersion: TERMS_VERSION,
        acceptedPrivacyVersion: PRIVACY_VERSION,
      });
      if (!result.ok) {
        toast.error(result.error ?? "Could not create your organisation.");
        setSubmitting(false);
        return;
      }
      toast.success("Organisation created. Welcome to Pumpline!");
      await refresh();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-6 sm:p-10">
      <div className="w-full max-w-[520px] animate-slide-up">
        <Link href="/" className="inline-flex items-center gap-2.5 serif text-[22px] mb-8">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-[7px] bg-accent text-white text-[17px] serif">
            P
          </span>
          Pumpline
        </Link>

        <p className="text-xs tracking-[0.16em] uppercase text-ink-400 mb-3">
          Step 1 of 1 · Set up your business
        </p>
        <h1 className="serif text-[34px] leading-[1.1] mb-2">
          Create your organisation
        </h1>
        <p className="text-sm text-ink-500 mb-7 leading-relaxed">
          This is your private workspace. You become the owner — invite managers
          and staff once it&apos;s set up. You can add more outlets later.
        </p>

        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          <div className="field">
            <label htmlFor="org-name" className="field-label">Business / organisation name</label>
            <input id="org-name" className="input" value={orgName}
              onChange={(e) => setOrgName(e.target.value)} required
              placeholder="e.g. Sharma Fuels Pvt Ltd" />
          </div>

          <div className="h-px bg-line my-1" />
          <p className="text-[13px] font-medium text-ink-700">Your first outlet</p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="field">
              <label htmlFor="outlet-name" className="field-label">Outlet name</label>
              <input id="outlet-name" className="input" value={outletName}
                onChange={(e) => setOutletName(e.target.value)} required
                placeholder="e.g. NH-48 Highway Pump" />
            </div>
            <div className="field">
              <label htmlFor="outlet-code" className="field-label">Outlet code</label>
              <input id="outlet-code" className="input" value={code}
                onChange={(e) => setCode(e.target.value)} required
                placeholder="e.g. MUM-01" />
            </div>
            <div className="field">
              <label htmlFor="omc" className="field-label">OMC brand</label>
              <select id="omc" className="input" value={omcBrand}
                onChange={(e) => setOmcBrand(e.target.value)}>
                {OMC_BRANDS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="field">
              <label htmlFor="state" className="field-label">State</label>
              <input id="state" className="input" value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Maharashtra" />
            </div>
          </div>

          <label className="flex items-start gap-2.5 text-[13px] text-ink-600 cursor-pointer">
            <input type="checkbox" checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 accent-[var(--accent)]" />
            <span>
              I accept the <span className="text-ink-900 underline">Terms</span> and{" "}
              <span className="text-ink-900 underline">Privacy Notice</span>.
            </span>
          </label>

          <button type="submit" className="btn btn-primary btn-lg w-full" disabled={submitting}>
            {submitting ? "Creating your workspace…" : "Create organisation →"}
          </button>
          <p className="text-center text-xs text-ink-400">
            14-day trial · no card required
          </p>
        </form>
      </div>
    </main>
  );
}
