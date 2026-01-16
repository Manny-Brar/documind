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
          <p className="text-muted-foreground mt-1">Manage team members and permissions</p>
        </div>
        <Button>
          <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Invite Member
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
            <Badge variant="yellow">Admin</Badge>
          </div>

          {/* Empty state for other members */}
          <div className="p-8 text-center">
            <p className="text-muted-foreground">
              No other team members yet. Invite someone to collaborate!
            </p>
          </div>
        </div>
      </Card>

      {/* Pending Invitations */}
      <div>
        <h2 className="font-heading text-sm uppercase tracking-wider text-muted-foreground mb-4">
          Pending Invitations
        </h2>
        <Card variant="pink" className="p-8 text-center">
          <p className="text-muted-foreground">No pending invitations</p>
        </Card>
      </div>
    </div>
  );
}
