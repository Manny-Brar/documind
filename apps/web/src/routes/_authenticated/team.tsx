import { createFileRoute } from "@tanstack/react-router";
import { Button, Card, Badge, Avatar } from "@documind/ui";

export const Route = createFileRoute("/_authenticated/team")({
  component: TeamPage,
});

function TeamPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl uppercase tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-1">Invite colleagues to collaborate on your documents</p>
        </div>
        <Button>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Add Team Member
        </Button>
      </div>

      {/* Team Members */}
      <Card>
        <div className="divide-y-2 divide-black">
          {/* Current User */}
          <div className="flex items-center gap-4 p-4">
            <Avatar fallback="You" />
            <div className="flex-1 min-w-0">
              <p className="font-bold">You</p>
              <p className="text-sm text-muted-foreground">you@example.com</p>
            </div>
            <Badge variant="success">Owner</Badge>
          </div>

          {/* Empty state for other members */}
          <div className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center border-2 border-black bg-white shadow-neo">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h3 className="font-heading text-lg uppercase mb-2">Work Better Together</h3>
            <p className="text-muted-foreground mb-4">
              Invite team members to search and collaborate on your documents.
            </p>
            <Button variant="secondary" size="sm">
              <svg className="w-4 h-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Send an Invite
            </Button>
          </div>
        </div>
      </Card>

      {/* Role Explanations */}
      <div>
        <h2 className="font-heading text-sm uppercase tracking-wider text-muted-foreground mb-4">
          Team Roles
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="success" size="sm">Owner</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Full control over the workspace, billing, and team management.
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="blue" size="sm">Member</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Can upload documents, search, and ask questions.
            </p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" size="sm">Viewer</Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Can view and search documents, but cannot upload.
            </p>
          </Card>
        </div>
      </div>

      {/* Pending Invitations */}
      <div>
        <h2 className="font-heading text-sm uppercase tracking-wider text-muted-foreground mb-4">
          Pending Invitations
        </h2>
        <Card variant="lavender" className="p-6 text-center">
          <p className="text-muted-foreground">No pending invitations</p>
        </Card>
      </div>
    </div>
  );
}
