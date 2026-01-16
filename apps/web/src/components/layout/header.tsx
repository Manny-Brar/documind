import { cn, Input, Button, Avatar } from "@documind/ui";

interface HeaderProps {
  user?: {
    name: string;
    email: string;
    image?: string | null;
  };
  onSearch?: (query: string) => void;
  onUserMenuClick?: () => void;
}

export function Header({ user, onSearch, onUserMenuClick }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b-[3px] border-black bg-white px-6">
      {/* Search Bar */}
      <div className="flex-1 max-w-2xl">
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <Input
            type="search"
            placeholder="Search documents... (Cmd+K)"
            className="pl-12 pr-4"
            onChange={(e) => onSearch?.(e.target.value)}
          />
          <kbd className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-6 items-center gap-1 border-2 border-black bg-surface-yellow px-2 font-mono text-xs shadow-neo-sm">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {/* Quick Upload */}
        <Button size="sm" className="hidden md:flex">
          <svg className="w-4 h-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Upload
        </Button>

        {/* User Menu */}
        <button
          onClick={onUserMenuClick}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-sm",
            "border-2 border-black bg-white shadow-neo-sm",
            "transition-all duration-100",
            "hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-neo",
            "active:translate-x-px active:translate-y-px active:shadow-neo-pressed"
          )}
        >
          <Avatar
            size="sm"
            src={user?.image}
            alt={user?.name}
            fallback={user?.name}
          />
          <div className="hidden sm:flex flex-col items-start min-w-0">
            <span className="text-sm font-bold truncate max-w-[120px]">
              {user?.name || "User"}
            </span>
          </div>
          <svg className="w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
    </header>
  );
}
