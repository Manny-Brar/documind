import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Button, Card, CardHeader, CardTitle, CardContent, Input, Label, Badge } from "@documind/ui";
import { trpc } from "../../lib/trpc";
import { useOrg } from "../../components/layout/dashboard-layout";
import { useSession } from "../../lib/auth-client";

export const Route = createFileRoute("/_authenticated/settings")({
  component: SettingsPage,
});

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function SettingsPage() {
  const org = useOrg();
  const { data: session } = useSession();
  const utils = trpc.useUtils();

  const [orgName, setOrgName] = useState(org.name);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member" | "viewer">("member");
  const [showInviteForm, setShowInviteForm] = useState(false);

  // Fetch organization details
  const { data: orgDetails } = trpc.settings.getOrganization.useQuery({
    orgId: org.id,
  });

  // Fetch billing info
  const { data: billing } = trpc.settings.getBilling.useQuery({
    orgId: org.id,
  });

  // Fetch team members
  const { data: members } = trpc.settings.getMembers.useQuery({
    orgId: org.id,
  });

  // Fetch document stats
  const { data: docStats } = trpc.documents.getStats.useQuery({
    orgId: org.id,
  });

  // Update organization mutation
  const updateOrg = trpc.settings.updateOrganization.useMutation({
    onSuccess: () => {
      utils.settings.getOrganization.invalidate();
      utils.organizations.list.invalidate();
    },
  });

  // Invite member mutation
  const inviteMember = trpc.settings.inviteMember.useMutation({
    onSuccess: () => {
      utils.settings.getMembers.invalidate();
      setInviteEmail("");
      setShowInviteForm(false);
    },
  });

  // Remove member mutation
  const removeMember = trpc.settings.removeMember.useMutation({
    onSuccess: () => {
      utils.settings.getMembers.invalidate();
    },
  });

  // Update role mutation
  const updateRole = trpc.settings.updateMemberRole.useMutation({
    onSuccess: () => {
      utils.settings.getMembers.invalidate();
    },
  });

  const isAdmin = orgDetails?.role === "admin";
  const currentPlan = billing?.plan;

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl uppercase tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your organization settings</p>
        </div>
        <Link to="/settings/api-keys">
          <Button variant="secondary">
            <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
            </svg>
            API Keys
          </Button>
        </Link>
      </div>

      {/* Organization Settings */}
      <Card variant="yellow">
        <CardHeader>
          <CardTitle>Organization</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                disabled={!isAdmin}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="org-slug">URL Slug</Label>
              <Input id="org-slug" value={org.slug} disabled />
            </div>
          </div>
          {isAdmin && (
            <Button
              onClick={() => updateOrg.mutate({ orgId: org.id, name: orgName })}
              disabled={updateOrg.isPending || orgName === org.name}
            >
              {updateOrg.isPending ? "Saving..." : "Update Organization"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Team Members */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Team Members</CardTitle>
          {isAdmin && (
            <Button size="sm" onClick={() => setShowInviteForm(!showInviteForm)}>
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Invite
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Invite Form */}
          {showInviteForm && isAdmin && (
            <div className="p-4 border-2 border-black bg-surface-yellow space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="invite-email">Email Address</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="colleague@company.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="invite-role">Role</Label>
                  <select
                    id="invite-role"
                    className="w-full h-12 px-4 border-2 border-black bg-white"
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value as "admin" | "member" | "viewer")}
                  >
                    <option value="viewer">Viewer - Can view documents</option>
                    <option value="member">Member - Can upload & search</option>
                    <option value="admin">Admin - Full access</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => inviteMember.mutate({ orgId: org.id, email: inviteEmail, role: inviteRole })}
                  disabled={inviteMember.isPending || !inviteEmail}
                >
                  {inviteMember.isPending ? "Sending..." : "Send Invitation"}
                </Button>
                <Button variant="secondary" onClick={() => setShowInviteForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="divide-y-2 divide-black border-2 border-black">
            {members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 bg-white"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center border-2 border-black bg-surface-blue text-sm font-bold">
                    {member.user.name?.charAt(0).toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-bold">{member.user.name}</p>
                    <p className="text-sm text-muted-foreground">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge
                    variant={
                      member.status === "pending"
                        ? "yellow"
                        : member.role === "admin"
                        ? "blue"
                        : "outline"
                    }
                  >
                    {member.status === "pending" ? "Pending" : member.role}
                  </Badge>
                  {isAdmin && member.user.id !== session?.user.id && (
                    <div className="flex gap-2">
                      <select
                        className="h-8 px-2 text-sm border-2 border-black bg-white"
                        value={member.role}
                        onChange={(e) =>
                          updateRole.mutate({
                            membershipId: member.id,
                            role: e.target.value as "admin" | "member" | "viewer",
                          })
                        }
                      >
                        <option value="viewer">Viewer</option>
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        onClick={() => {
                          if (confirm("Remove this member from the organization?")) {
                            removeMember.mutate({ membershipId: member.id });
                          }
                        }}
                      >
                        <svg className="w-4 h-4 text-destructive" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Plan & Billing */}
      <Card variant="blue">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Plan & Billing</CardTitle>
          <Badge variant={currentPlan?.id === "starter" ? "yellow" : "blue"}>
            {currentPlan?.name || "Free"} Plan
          </Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="p-4 border-2 border-black bg-white shadow-neo-sm">
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Storage</p>
              <p className="font-mono text-2xl font-bold">
                {formatFileSize(billing?.usage.storageUsedBytes ?? 0)}
              </p>
              <p className="text-sm text-muted-foreground">
                of {formatFileSize(billing?.usage.storageQuotaBytes ?? 0)}
              </p>
              <div className="mt-2 h-2 border border-black bg-gray-100">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${billing?.usage.storagePercentage ?? 0}%` }}
                />
              </div>
            </div>
            <div className="p-4 border-2 border-black bg-white shadow-neo-sm">
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Documents</p>
              <p className="font-mono text-2xl font-bold">{docStats?.total ?? 0}</p>
              <p className="text-sm text-muted-foreground">
                {docStats?.indexed ?? 0} indexed
              </p>
            </div>
            <div className="p-4 border-2 border-black bg-white shadow-neo-sm">
              <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Team Members</p>
              <p className="font-mono text-2xl font-bold">{members?.length ?? 0}</p>
              <p className="text-sm text-muted-foreground">
                {members?.filter((m) => m.status === "active").length ?? 0} active
              </p>
            </div>
          </div>

          {/* Pricing Plans */}
          {billing?.availablePlans && (
            <div className="grid gap-4 sm:grid-cols-3">
              {billing.availablePlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`p-4 border-2 border-black ${
                    plan.isCurrent ? "bg-surface-mint" : "bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold">{plan.name}</h3>
                    {plan.isCurrent && <Badge variant="blue">Current</Badge>}
                  </div>
                  <p className="font-mono text-2xl font-bold">
                    ${plan.price}<span className="text-sm font-normal">/mo</span>
                  </p>
                  <ul className="mt-3 space-y-1 text-sm">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {!plan.isCurrent && isAdmin && (
                    <Button className="mt-4 w-full" variant={plan.price > 0 ? "default" : "secondary"}>
                      {plan.price > (currentPlan?.price ?? 0) ? "Upgrade" : "Downgrade"}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      {isAdmin && (
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 border-2 border-black bg-red-50">
              <div>
                <p className="font-bold">Delete Organization</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete this organization and all its data
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => alert("This action is not yet implemented")}
              >
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
