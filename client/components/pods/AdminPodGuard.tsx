"use client";

import { useAuthContext } from "@/contexts/AuthContext";
import { notFound } from "next/navigation";
import AdminPodClient, { type Pod } from "@/components/pods/AdminPodClient";

/**
 * Client-side guard for the manage page. Waits for AuthContext to initialize,
 * then checks if the current user is the pod creator. Shows 404 if not.
 *
 * In cross-origin deployments getServerUser() returns null, so the guard
 * must run client-side where the in-memory token identifies the user.
 */
function AdminPodGuard({ pod }: Readonly<{ pod: Pod }>) {
  const { user, isInitialized } = useAuthContext();

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-brand-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user || user.id !== pod.createdBy) {
    notFound();
  }

  return <AdminPodClient pod={pod} />;
}

export default AdminPodGuard;
