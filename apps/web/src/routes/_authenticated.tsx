import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect } from "react";
import { DashboardLayout } from "../components/layout/dashboard-layout";
import { useSession } from "../lib/auth-client";
import { trpc } from "../lib/trpc";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { data: session, isPending: sessionPending } = useSession();
  const utils = trpc.useUtils();

  // Get user's organizations
  const { data: orgs, isPending: orgPending } = trpc.organizations.list.useQuery(undefined, {
    enabled: !!session,
  });

  // Auto-create organization for new users
  const createOrgMutation = trpc.organizations.getOrCreatePersonal.useMutation({
    onSuccess: () => {
      // Refresh the org list after creating
      utils.organizations.list.invalidate();
    },
  });

  // Effect to create org if user has none
  useEffect(() => {
    if (session && orgs && orgs.length === 0 && !createOrgMutation.isPending) {
      createOrgMutation.mutate();
    }
  }, [session, orgs, createOrgMutation]);

  // Loading state
  if (sessionPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin border-4 border-border border-t-transparent mb-4" />
          <p className="font-heading text-lg uppercase tracking-wider text-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!session) {
    window.location.href = "/login";
    return null;
  }

  // Show loading while fetching org or creating one
  if (orgPending || createOrgMutation.isPending || (orgs && orgs.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-12 w-12 animate-spin border-4 border-border border-t-transparent mb-4" />
          <p className="font-heading text-lg uppercase tracking-wider text-foreground">
            {createOrgMutation.isPending ? "Creating workspace..." : "Loading workspace..."}
          </p>
        </div>
      </div>
    );
  }

  const currentOrg = orgs?.[0];

  return (
    <DashboardLayout
      user={{
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
      }}
      org={currentOrg ? {
        id: currentOrg.id,
        name: currentOrg.name,
        slug: currentOrg.slug,
        planId: currentOrg.planId,
      } : undefined}
    >
      <Outlet />
    </DashboardLayout>
  );
}
