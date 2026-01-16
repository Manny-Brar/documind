import * as React from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { signOut } from "../../lib/auth-client";

// Organization context for child components
export interface OrgContextValue {
  id: string;
  name: string;
  slug: string;
  planId: string;
}

export const OrgContext = React.createContext<OrgContextValue | null>(null);

export function useOrg() {
  const context = React.useContext(OrgContext);
  if (!context) {
    throw new Error("useOrg must be used within a DashboardLayout");
  }
  return context;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  user?: {
    name: string;
    email: string;
    image?: string | null;
  };
  org?: {
    id: string;
    name: string;
    slug: string;
    planId: string;
  };
}

export function DashboardLayout({ children, user, org }: DashboardLayoutProps) {
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);

  const getPlanName = (planId?: string) => {
    switch (planId) {
      case "pro":
        return "Pro Plan";
      case "business":
        return "Business Plan";
      case "enterprise":
        return "Enterprise";
      default:
        return "Free Plan";
    }
  };

  const handleSignOut = async () => {
    await signOut();
    window.location.href = "/login";
  };

  const content = (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar
        orgName={org?.name || "My Workspace"}
        planName={getPlanName(org?.planId)}
      />

      {/* Main Content Area */}
      <div className="pl-sidebar">
        {/* Header */}
        <Header
          user={user}
          onUserMenuClick={() => setUserMenuOpen(!userMenuOpen)}
        />

        {/* Page Content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* User Menu Dropdown - Simple overlay for now */}
      {userMenuOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setUserMenuOpen(false)}
          />
          <div className="fixed top-16 right-6 z-50 w-64 border-2 border-black bg-white shadow-neo animate-slide-in-right">
            <div className="p-4 border-b-2 border-black">
              <p className="font-bold">{user?.name || "User"}</p>
              <p className="text-sm text-muted-foreground">{user?.email || "user@example.com"}</p>
            </div>
            <div className="p-2">
              <a
                href="/settings"
                className="flex items-center gap-2 px-3 py-2 rounded-sm text-sm hover:bg-surface-yellow"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Settings
              </a>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-sm text-sm text-destructive hover:bg-red-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign out
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );

  // Wrap with OrgContext if org is available
  if (org) {
    return (
      <OrgContext.Provider value={org}>
        {content}
      </OrgContext.Provider>
    );
  }

  return content;
}
