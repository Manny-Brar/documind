import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { Card, Input } from "@documind/ui";

/**
 * Command item type
 */
interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: ReactNode;
  action: () => void;
  keywords?: string[];
  category: "navigation" | "action" | "document";
}

/**
 * Command palette context
 */
interface CommandPaletteContextValue {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

/**
 * Navigation icon component
 */
function NavIcon({ children }: { children: ReactNode }) {
  return (
    <div className="w-8 h-8 flex items-center justify-center border-2 border-black bg-surface-yellow shadow-neo-sm shrink-0">
      {children}
    </div>
  );
}

/**
 * Command palette provider
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const open = useCallback(() => {
    setIsOpen(true);
    setQuery("");
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQuery("");
  }, []);

  const toggle = useCallback(() => {
    setIsOpen((prev) => !prev);
    if (!isOpen) setQuery("");
  }, [isOpen]);

  // Navigation commands
  const commands: CommandItem[] = [
    {
      id: "nav-dashboard",
      title: "Go to Dashboard",
      subtitle: "View overview and stats",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      ),
      action: () => {
        navigate({ to: "/dashboard" });
        close();
      },
      keywords: ["home", "overview", "stats"],
      category: "navigation",
    },
    {
      id: "nav-documents",
      title: "Go to Documents",
      subtitle: "Manage your documents",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      ),
      action: () => {
        navigate({ to: "/documents" });
        close();
      },
      keywords: ["files", "upload", "library"],
      category: "navigation",
    },
    {
      id: "nav-search",
      title: "Go to Search",
      subtitle: "Search your documents",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      ),
      action: () => {
        navigate({ to: "/search" });
        close();
      },
      keywords: ["find", "query", "ask"],
      category: "navigation",
    },
    {
      id: "nav-settings",
      title: "Go to Settings",
      subtitle: "Manage organization settings",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      action: () => {
        navigate({ to: "/settings" });
        close();
      },
      keywords: ["preferences", "account", "team"],
      category: "navigation",
    },
    {
      id: "nav-api-keys",
      title: "Go to API Keys",
      subtitle: "Manage API access",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
        </svg>
      ),
      action: () => {
        navigate({ to: "/settings/api-keys" });
        close();
      },
      keywords: ["tokens", "authentication", "developer"],
      category: "navigation",
    },
    {
      id: "action-upload",
      title: "Upload Documents",
      subtitle: "Upload new files",
      icon: (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
      action: () => {
        navigate({ to: "/documents" });
        // TODO: Trigger upload modal after navigation
        close();
      },
      keywords: ["add", "import", "new"],
      category: "action",
    },
  ];

  // Filter commands based on query
  const filteredCommands = query.trim()
    ? commands.filter((cmd) => {
        const searchQuery = query.toLowerCase();
        return (
          cmd.title.toLowerCase().includes(searchQuery) ||
          cmd.subtitle?.toLowerCase().includes(searchQuery) ||
          cmd.keywords?.some((k) => k.includes(searchQuery))
        );
      })
    : commands;

  // Selected index for keyboard navigation
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Open palette with Cmd+K or Ctrl+K
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        toggle();
        return;
      }

      // Close with Escape
      if (e.key === "Escape" && isOpen) {
        e.preventDefault();
        close();
        return;
      }

      // Navigate with arrows when open
      if (isOpen) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setSelectedIndex((prev) =>
            prev < filteredCommands.length - 1 ? prev + 1 : prev
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === "Enter") {
          e.preventDefault();
          if (filteredCommands[selectedIndex]) {
            filteredCommands[selectedIndex].action();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, toggle, close, filteredCommands, selectedIndex]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on route change
  useEffect(() => {
    close();
  }, [location.pathname, close]);

  return (
    <CommandPaletteContext.Provider value={{ isOpen, open, close, toggle }}>
      {children}

      {/* Command Palette Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
            onClick={close}
          />

          {/* Palette */}
          <div className="fixed inset-x-4 top-1/4 max-w-xl mx-auto z-50">
            <Card className="overflow-hidden">
              {/* Search Input */}
              <div className="p-4 border-b-2 border-black bg-surface-yellow">
                <div className="flex items-center gap-3">
                  <svg
                    className="w-5 h-5 text-muted-foreground shrink-0"
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
                  <input
                    ref={inputRef}
                    type="text"
                    placeholder="Type a command or search..."
                    className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-white border border-gray-300 rounded">
                    esc
                  </kbd>
                </div>
              </div>

              {/* Commands List */}
              <div className="max-h-80 overflow-auto">
                {filteredCommands.length > 0 ? (
                  <div className="py-2">
                    {filteredCommands.map((cmd, index) => (
                      <button
                        key={cmd.id}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                          index === selectedIndex
                            ? "bg-surface-yellow"
                            : "hover:bg-gray-50"
                        }`}
                        onClick={cmd.action}
                        onMouseEnter={() => setSelectedIndex(index)}
                      >
                        <NavIcon>{cmd.icon}</NavIcon>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium">{cmd.title}</p>
                          {cmd.subtitle && (
                            <p className="text-sm text-muted-foreground truncate">
                              {cmd.subtitle}
                            </p>
                          )}
                        </div>
                        {index === selectedIndex && (
                          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-mono bg-white border border-gray-300 rounded">
                            enter
                          </kbd>
                        )}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground">
                    <p>No commands found for "{query}"</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t-2 border-black bg-gray-50 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 font-mono bg-white border border-gray-300 rounded">
                      ↑
                    </kbd>
                    <kbd className="px-1.5 py-0.5 font-mono bg-white border border-gray-300 rounded">
                      ↓
                    </kbd>
                    <span className="ml-1">to navigate</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <kbd className="px-1.5 py-0.5 font-mono bg-white border border-gray-300 rounded">
                      ↵
                    </kbd>
                    <span className="ml-1">to select</span>
                  </span>
                </div>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 font-mono bg-white border border-gray-300 rounded">
                    esc
                  </kbd>
                  <span className="ml-1">to close</span>
                </span>
              </div>
            </Card>
          </div>
        </>
      )}
    </CommandPaletteContext.Provider>
  );
}

/**
 * Hook to use command palette
 */
export function useCommandPalette() {
  const context = useContext(CommandPaletteContext);
  if (!context) {
    throw new Error("useCommandPalette must be used within a CommandPaletteProvider");
  }
  return context;
}
