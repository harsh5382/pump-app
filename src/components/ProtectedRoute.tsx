"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function ProtectedRoute({
  children,
  roles,
}: {
  children: React.ReactNode;
  roles?: ("admin" | "manager" | "staff")[];
}) {
  const { user, profile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user || !profile) {
      router.push("/login");
      return;
    }
    if (roles && roles.length && !roles.includes(profile.role)) {
      router.push("/dashboard");
    }
  }, [user, profile, loading, roles, router]);

  if (loading || !user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-600" />
      </div>
    );
  }

  if (roles && roles.length && !roles.includes(profile.role)) {
    return null;
  }

  return <>{children}</>;
}
