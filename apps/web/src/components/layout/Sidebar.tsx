"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@repo/ui";

const navItems = [
  { label: "Projects", href: "/projects" },
  { label: "Assistant", href: "/assistant" },
];

export function Sidebar() {
  const pathname = usePathname();
  const projectMatch = pathname.match(/\/projects\/([^/]+)/);
  const activeProjectId = projectMatch?.[1];

  return (
    <aside className="w-56 min-h-screen border-r border-zinc-200 bg-white flex flex-col">
      {/* Logo */}
      <div className="h-14 border-b border-zinc-200 flex items-center px-5">
        <span className="font-semibold text-zinc-950 text-sm">Product AI</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-0.5">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center px-3 py-2 rounded-md text-sm transition-colors",
              pathname === item.href || pathname.startsWith(item.href + "/")
                ? "bg-zinc-950 text-white"
                : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
            )}
          >
            {item.label}
          </Link>
        ))}

        {activeProjectId && (
          <>
            <div className="pt-3 pb-1 px-3">
              <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Project
              </span>
            </div>
            <Link
              href={`/projects/${activeProjectId}/settings`}
              className={cn(
                "flex items-center px-3 py-2 rounded-md text-sm transition-colors",
                pathname === `/projects/${activeProjectId}/settings`
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
              )}
            >
              Settings
            </Link>
          </>
        )}
      </nav>

      {/* User */}
      <div className="border-t border-zinc-200 p-4 flex items-center gap-3">
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-7 h-7",
              userButtonPopoverCard: "shadow-sm border border-zinc-200",
            },
          }}
        />
        <span className="text-xs text-zinc-500">Account</span>
      </div>
    </aside>
  );
}
