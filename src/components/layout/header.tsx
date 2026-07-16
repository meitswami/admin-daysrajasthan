"use client";

import { useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, Bell, Search, LogOut, User, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useMobileNav } from "./mobile-nav-context";
import { getRecentActivity } from "@/lib/data";
import { activityToRoute } from "@/lib/data/search";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatDateTime } from "@/lib/utils";

export function Header({ title, description }: { title: string; description?: string }) {
  const { toggle } = useMobileNav();
  const router = useRouter();
  const [notifOpen, setNotifOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const activity = getRecentActivity().slice(0, 5);
  const [searchQuery, setSearchQuery] = useState("");

  const goSearch = useCallback(() => {
    const q = searchQuery.trim();
    if (q.length >= 2) router.push(`/search?q=${encodeURIComponent(q)}`);
  }, [searchQuery, router]);

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-white/95 backdrop-blur-md">
      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={toggle}
            className="mt-0.5 rounded-lg border border-stone-200 p-2 text-stone-600 hover:bg-stone-50 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-stone-900 sm:text-xl">{title}</h1>
            {description && (
              <p className="mt-0.5 line-clamp-2 text-sm text-stone-500">{description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="relative flex-1 sm:max-w-xs md:max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
            <Input
              placeholder="Search…"
              className="h-9 pl-9 text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && goSearch()}
            />
          </div>

          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => { setNotifOpen(!notifOpen); setUserOpen(false); }}
              className="relative rounded-lg border border-stone-200 p-2 text-stone-600 hover:bg-stone-50"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" />
            </button>
            {notifOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-[min(100vw-2rem,320px)] rounded-xl border border-stone-200 bg-white shadow-xl">
                  <div className="border-b border-stone-100 px-4 py-3">
                    <p className="font-semibold text-stone-900">Notifications</p>
                    <p className="text-xs text-stone-500">Recent website activity</p>
                  </div>
                  <div className="max-h-72 overflow-y-auto p-2">
                    {activity.map((item) => (
                      <Link
                        key={item.id}
                        href={activityToRoute(item)}
                        className="block rounded-lg px-3 py-2.5 hover:bg-stone-50"
                        onClick={() => setNotifOpen(false)}
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-amber-700">{item.type}</span>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="mt-1 line-clamp-2 text-sm text-stone-800">{item.title}</p>
                        <p className="text-xs text-stone-400">{formatDateTime(item.time)}</p>
                      </Link>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="relative" ref={userRef}>
            <button
              type="button"
              onClick={() => { setUserOpen(!userOpen); setNotifOpen(false); }}
              className="flex items-center gap-1.5 rounded-full border border-stone-200 py-1 pl-1 pr-2 hover:bg-stone-50"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-amber-100 to-orange-100 text-sm font-semibold text-amber-900">
                A
              </div>
              <ChevronDown className="hidden h-3.5 w-3.5 text-stone-500 sm:block" />
            </button>
            {userOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setUserOpen(false)} />
                <div className="absolute right-0 z-50 mt-2 w-48 rounded-xl border border-stone-200 bg-white py-1 shadow-xl">
                  <div className="border-b border-stone-100 px-4 py-2.5">
                    <p className="text-sm font-semibold">Admin</p>
                    <p className="text-xs text-stone-500">admin@traveldays.in</p>
                  </div>
                  <Link href="/settings" className="flex items-center gap-2 px-4 py-2.5 text-sm text-stone-700 hover:bg-stone-50" onClick={() => setUserOpen(false)}>
                    <User className="h-4 w-4" /> Settings
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                    onClick={async () => {
                      const { signOutAll } = await import("@/lib/auth/sign-in");
                      await signOutAll();
                      void import("@/lib/system/activity-log").then(({ logActivity }) =>
                        logActivity({
                          action: "logout",
                          module: "auth",
                          summary: "Signed out",
                        })
                      );
                      router.push("/login");
                    }}
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
