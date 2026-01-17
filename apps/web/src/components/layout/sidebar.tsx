import { Link, useLocation } from "@tanstack/react-router";
import { cn } from "@documind/ui";

// Icons as simple SVG components for neobrutalism aesthetic
const icons = {
  dashboard: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
    </svg>
  ),
  documents: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  search: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  team: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  settings: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  graph: (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <circle cx="6" cy="6" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="6" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="6" cy="18" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="18" cy="18" r="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.5 7.5l2 3M15.5 7.5l-2 3M8.5 16.5l2-3M15.5 16.5l-2-3" />
    </svg>
  ),
};

const navItems = [
  { href: "/dashboard", label: "Home", icon: icons.dashboard, description: "Overview and recent activity" },
  { href: "/documents", label: "My Files", icon: icons.documents, description: "Upload and manage documents" },
  { href: "/search", label: "Ask AI", icon: icons.search, description: "Search and ask questions" },
  { href: "/entities", label: "Knowledge Graph", icon: icons.graph, description: "Explore entities and relationships" },
  { href: "/team", label: "Team", icon: icons.team, description: "Manage team members" },
  { href: "/settings", label: "Settings", icon: icons.settings, description: "Account preferences" },
];

interface SidebarProps {
  orgName?: string;
  planName?: string;
}

export function Sidebar({ orgName = "My Workspace", planName = "Free Plan" }: SidebarProps) {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-sidebar border-r-[3px] border-border bg-sidebar text-foreground flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b-2 border-border">
        <div className="flex h-10 w-10 items-center justify-center border-2 border-border bg-primary shadow-neo-sm">
          <span className="font-heading text-lg font-bold text-white">D</span>
        </div>
        <span className="font-heading text-xl font-bold uppercase tracking-tight">
          DocuMind
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.href ||
            (item.href !== "/dashboard" && location.pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "group flex items-center gap-3 px-4 py-3 rounded-sm",
                "font-medium text-sm transition-all duration-100",
                "border-2 border-transparent",
                "relative",
                isActive
                  ? "bg-card border-border shadow-neo-sm translate-x-1"
                  : "hover:bg-sidebar-hover hover:translate-x-1"
              )}
              title={item.description}
            >
              <span className={cn(isActive && "text-primary")}>{item.icon}</span>
              <span>{item.label}</span>
              {isActive && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="mx-4 border-t-2 border-border" />

      {/* Organization Selector */}
      <div className="p-4">
        <button
          className={cn(
            "w-full flex items-center justify-between gap-2 px-4 py-3 rounded-sm",
            "bg-card border-2 border-border shadow-neo-sm",
            "font-medium text-sm text-left",
            "transition-all duration-100",
            "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo",
            "active:translate-x-px active:translate-y-px active:shadow-neo-pressed"
          )}
        >
          <div className="flex flex-col min-w-0">
            <span className="font-bold truncate">{orgName}</span>
            <span className="text-xs text-muted-foreground">{planName}</span>
          </div>
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
          </svg>
        </button>

        {/* Upgrade Button */}
        {planName === "Free Plan" && (
          <Link
            to="/settings"
            className={cn(
              "mt-3 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-sm",
              "bg-primary text-white border-2 border-border shadow-neo-sm",
              "font-heading text-xs font-bold uppercase tracking-wider",
              "transition-all duration-100",
              "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo",
              "active:translate-x-px active:translate-y-px active:shadow-neo-pressed",
              "animate-pulse"
            )}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Upgrade Plan
          </Link>
        )}
      </div>
    </aside>
  );
}
