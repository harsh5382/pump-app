"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useOrg } from "@/context/OrgContext";
import FuelLoader from "@/components/FuelLoader";

// Ensures a signed-in user belongs to an organisation before entering the app.
// When the trusted backend is configured and the user has no organisation, they
// are routed to onboarding. If the backend isn't configured, this is a no-op so
// the legacy single-tenant flow keeps working.
export default function OnboardingGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, needsOnboarding, backendConfigured, currentOutletId } = useOrg();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (needsOnboarding) router.replace("/onboarding");
  }, [loading, needsOnboarding, router]);

  if (loading) return <FuelLoader fullScreen />;
  if (needsOnboarding) return null;
  // Data pages are scoped to the active outlet — hold until it has resolved so
  // no query fires without one. (Only relevant when the backend is configured.)
  if (backendConfigured && !currentOutletId) return <FuelLoader fullScreen />;

  return <>{children}</>;
}
