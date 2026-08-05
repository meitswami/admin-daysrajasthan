"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type MouseEvent } from "react";
import { X, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  homeNav,
  bookingNav,
  operationsNav,
  masterDataNav,
  reportsNav,
  websiteNav,
  aiChatNav,
  secondaryNav,
  type NavItem,
  type NavGroup,
} from "@/lib/constants/navigation";
import { useMobileNav } from "./mobile-nav-context";
import { Brand } from "./brand";
import { useSystem } from "@/components/providers/system-provider";
import { canAccessModule } from "@/lib/rbac/permissions";

function hrefPath(href: string): string {
  return href.split("?")[0];
}

/** Highlight rules: list root is exact-only so detail pages don't look like "Itinerary List". */
function isNavItemActive(pathname: string, href: string): boolean {
  const base = hrefPath(href);
  if (pathname === base) return true;
  if (base === "/itinerary-builder") return false;
  return pathname.startsWith(`${base}/`);
}

/**
 * Soft App Router transitions between itinerary-builder routes often no-op
 * (especially leaving `/[id]/…` segments). Hard-nav those hops.
 */
function shouldHardNavigate(pathname: string, href: string): boolean {
  const target = hrefPath(href);
  if (pathname === target) return false;
  const fromBuilder =
    pathname === "/itinerary-builder" || pathname.startsWith("/itinerary-builder/");
  const toBuilder =
    target === "/itinerary-builder" || target.startsWith("/itinerary-builder/");
  return fromBuilder && toBuilder;
}

function isGroupSectionActive(group: NavGroup, pathname: string): boolean {
  if (group.items.some((item) => isNavItemActive(pathname, item.href))) return true;
  if (group.label === "Booking" && pathname.startsWith("/itinerary-builder")) return true;
  if (group.label === "Operations" && pathname.startsWith("/operations")) return true;
  if (group.label === "Master Data" && pathname.startsWith("/master-data")) return true;
  return false;
}

function NavLink({
  item,
  active,
  pathname,
  onNavigate,
  indent,
}: {
  item: NavItem;
  active: boolean;
  pathname: string;
  onNavigate?: () => void;
  indent?: boolean;
}) {
  const Icon = item.icon;

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    onNavigate?.();
    if (!shouldHardNavigate(pathname, item.href)) return;
    e.preventDefault();
    window.location.assign(item.href);
  }

  return (
    <Link
      href={item.href}
      onClick={handleClick}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all",
        indent && "ml-2 py-2",
        active
          ? "bg-amber-500/20 text-amber-300 shadow-sm"
          : "text-stone-300 hover:bg-stone-800/80 hover:text-white"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

function CollapsibleGroup({
  group,
  pathname,
  onNavigate,
  defaultOpen,
  filterItem,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate?: () => void;
  defaultOpen?: boolean;
  filterItem: (item: NavItem) => boolean;
}) {
  const items = group.items.filter(filterItem);
  if (items.length === 0) return null;
  const childActive = isGroupSectionActive(group, pathname);
  const [open, setOpen] = useState(defaultOpen ?? childActive);

  return (
    <div className="space-y-0.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
          childActive ? "text-amber-200" : "text-stone-300 hover:bg-stone-800/80 hover:text-white"
        )}
      >
        <span>{group.label}</span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <div className="space-y-0.5 border-l border-stone-800 ml-3 pl-1">
          {items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isNavItemActive(pathname, item.href)}
              pathname={pathname}
              onNavigate={onNavigate}
              indent
            />
          ))}
        </div>
      )}
    </div>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const filterItem = (item: NavItem) => canAccessModule(item.href);
  const websiteItems = websiteNav.items.filter(filterItem);
  const systemItems = secondaryNav.filter(filterItem);

  return (
    <>
      <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
        Home
      </p>
      {homeNav.filter(filterItem).map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isNavItemActive(pathname, item.href)}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}

      <p className="mb-2 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
        Modules
      </p>
      <CollapsibleGroup group={bookingNav} pathname={pathname} onNavigate={onNavigate} defaultOpen filterItem={filterItem} />
      <CollapsibleGroup group={operationsNav} pathname={pathname} onNavigate={onNavigate} filterItem={filterItem} />
      <CollapsibleGroup group={masterDataNav} pathname={pathname} onNavigate={onNavigate} filterItem={filterItem} />
      {reportsNav.filter(filterItem).map((item) => (
        <NavLink
          key={item.href}
          item={item}
          active={isNavItemActive(pathname, item.href)}
          pathname={pathname}
          onNavigate={onNavigate}
        />
      ))}

      {websiteItems.length > 0 && (
        <>
          <p className="mb-2 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            Website
          </p>
          {websiteItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isNavItemActive(pathname, item.href)}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </>
      )}

      {aiChatNav.items.some(filterItem) && (
        <>
          <p className="mb-2 mt-4 px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            AI & Chat
          </p>
          {aiChatNav.items.filter(filterItem).map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isNavItemActive(pathname, item.href)}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </>
      )}

      {systemItems.length > 0 && (
        <>
          <p className="mb-2 mt-6 px-3 text-[11px] font-semibold uppercase tracking-wider text-stone-500">
            System
          </p>
          {systemItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isNavItemActive(pathname, item.href)}
              pathname={pathname}
              onNavigate={onNavigate}
            />
          ))}
        </>
      )}
    </>
  );
}

export function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden h-screen w-64 shrink-0 flex-col border-r border-stone-800/50 bg-stone-950 text-stone-100 lg:flex">
      <div className="shrink-0 border-b border-stone-800 px-5 py-5">
        <Brand />
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-3 py-4">
        <NavLinks />
      </nav>
      <SidebarFooter />
    </aside>
  );
}

function SidebarFooter() {
  const { currentMember } = useSystem();
  return (
    <div className="shrink-0 border-t border-stone-800 px-4 py-4">
      <p className="truncate text-xs text-stone-500">{currentMember.name}</p>
    </div>
  );
}

export function MobileDrawer() {
  const { open, setOpen } = useMobileNav();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-stone-950/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <aside className="absolute left-0 top-0 flex h-full w-[min(100%,280px)] flex-col bg-stone-950 text-stone-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-stone-800 px-4 py-4">
          <Brand />
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-2 text-stone-400 hover:bg-stone-800 hover:text-white"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <NavLinks onNavigate={() => setOpen(false)} />
        </nav>
      </aside>
    </div>
  );
}
