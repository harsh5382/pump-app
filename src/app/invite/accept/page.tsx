"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useOrg } from "@/context/OrgContext";
import { acceptInvitation } from "@/server/orgs/invitations";
import { useToast } from "@/components/ui/Toast";
import FuelLoader from "@/components/FuelLoader";

function AcceptInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { refresh } = useOrg();
  const toast = useToast();

  const orgId = params.get("org") ?? "";
  const token = params.get("token") ?? "";
  const selfUrl = `/invite/accept?org=${orgId}&token=${token}`;

  const [busy, setBusy] = useState(false);

  if (authLoading) return <FuelLoader fullScreen />;

  const invalid = !orgId || !token;

  async function handleAccept() {
    setBusy(true);
    try {
      const result = await acceptInvitation({ organisationId: orgId, token });
      if (!result.ok) {
        toast.error(result.error ?? "Could not accept this invitation.");
        setBusy(false);
        return;
      }
      toast.success("Invitation accepted — welcome to the team!");
      await refresh();
      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="w-full max-w-[420px] animate-slide-up">
        <Link href="/" className="inline-flex items-center gap-2.5 serif text-[22px] mb-8">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-[7px] bg-accent text-white text-[17px] serif">
            P
          </span>
          Pumpline
        </Link>

        <div className="card p-6">
          <h1 className="serif text-[26px] leading-tight mb-2">
            You&apos;ve been invited
          </h1>

          {invalid ? (
            <p className="text-sm text-ink-500">
              This invitation link is incomplete or invalid. Ask your admin to
              resend it.
            </p>
          ) : !user ? (
            <>
              <p className="text-sm text-ink-500 mb-5">
                Sign in or create your account to join this organisation. You set
                your own password.
              </p>
              <div className="flex flex-col gap-2.5">
                <Link
                  href={`/signup?next=${encodeURIComponent(selfUrl)}`}
                  className="btn btn-primary btn-lg w-full"
                >
                  Create account
                </Link>
                <Link
                  href={`/login?next=${encodeURIComponent(selfUrl)}`}
                  className="btn btn-ghost w-full"
                >
                  I already have an account
                </Link>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-ink-500 mb-5">
                Signed in as <span className="text-ink-900">{user.email}</span>.
                Accept to join the organisation.
              </p>
              <button
                onClick={handleAccept}
                className="btn btn-primary btn-lg w-full"
                disabled={busy}
              >
                {busy ? "Joining…" : "Accept invitation"}
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<FuelLoader fullScreen />}>
      <AcceptInner />
    </Suspense>
  );
}
