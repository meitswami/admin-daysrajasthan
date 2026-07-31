"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { DataMode } from "@/types/system";
import type { TeamMember } from "@/types/rbac";
import {
  fetchDataModeFromServer,
  getDataMode,
  isSupabaseConfigured,
  persistDataModeToServer,
  setDataMode,
} from "@/lib/system/data-mode";
import {
  DEMO_TEAM,
  fetchTeamMembers,
  getCurrentTeamMember,
  listTeamMembers,
  setCurrentTeamMemberId,
  setExternalTeamMember,
} from "@/lib/rbac/current-user";
import { hasPermission } from "@/lib/rbac/permissions";
import { memberHasPermission } from "@/lib/rbac/staff-store";
import { listPermissionGroups } from "@/lib/rbac/permission-groups-store";

type SystemContextValue = {
  dataMode: DataMode;
  setDataModeAndPersist: (mode: DataMode) => Promise<void>;
  supabaseConfigured: boolean;
  currentMember: TeamMember;
  switchMember: (id: string) => void;
  teamMembers: TeamMember[];
  can: (permission: Parameters<typeof hasPermission>[0]) => boolean;
};

const SystemContext = createContext<SystemContextValue | null>(null);

export function SystemProvider({ children }: { children: ReactNode }) {
  const [dataMode, setDataModeState] = useState<DataMode>(() => getDataMode());
  const [dataModeReady, setDataModeReady] = useState(false);
  const [currentMember, setCurrentMember] = useState<TeamMember>(getCurrentTeamMember);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => listTeamMembers());
  const [permTick, setPermTick] = useState(0);

  const refresh = useCallback(() => {
    setDataModeState(getDataMode());
    setCurrentMember(getCurrentTeamMember());
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      // Prefer server-wide mode so every device loads Real data, not browser-local Demo.
      const serverMode = await fetchDataModeFromServer();
      if (cancelled) return;
      if (serverMode) {
        setDataMode(serverMode);
        setDataModeState(serverMode);
      } else {
        setDataModeState(getDataMode());
      }
      setDataModeReady(true);
    })();

    void listPermissionGroups();
    void fetchTeamMembers().then((members) => {
      if (cancelled) return;
      setTeamMembers(members);
      // Refresh signed-in member from DB so permission_group_id / overrides apply
      const current = getCurrentTeamMember();
      const fresh = members.find(
        (m) => m.id === current.id || m.email.toLowerCase() === current.email.toLowerCase()
      );
      if (fresh) {
        setExternalTeamMember(fresh);
        setCurrentMember(fresh);
      }
    });

    const onMode = () => refresh();
    const onMember = () => {
      refresh();
      void fetchTeamMembers().then(setTeamMembers);
    };
    const onPerms = () => setPermTick((t) => t + 1);
    const onGroups = () => {
      void listPermissionGroups().then(() => setPermTick((t) => t + 1));
    };
    window.addEventListener("td-data-mode-change", onMode);
    window.addEventListener("td-team-member-change", onMember);
    window.addEventListener("td-rbac-overrides-change", onPerms);
    window.addEventListener("td-permission-groups-change", onGroups);
    return () => {
      cancelled = true;
      window.removeEventListener("td-data-mode-change", onMode);
      window.removeEventListener("td-team-member-change", onMember);
      window.removeEventListener("td-rbac-overrides-change", onPerms);
      window.removeEventListener("td-permission-groups-change", onGroups);
    };
  }, [refresh]);

  const setDataModeAndPersist = useCallback(async (mode: DataMode) => {
    setDataMode(mode);
    setDataModeState(mode);
    const ok = await persistDataModeToServer(mode);
    const { logActivity } = await import("@/lib/system/activity-log");
    logActivity({
      action: "data_mode_change",
      module: "system",
      summary: ok
        ? `Data mode switched to ${mode.toUpperCase()}`
        : `Data mode set to ${mode.toUpperCase()} (browser only — server save failed)`,
      metadata: { mode, persisted: ok },
    });
  }, []);

  const value = useMemo(
    () => ({
      dataMode,
      setDataModeAndPersist,
      supabaseConfigured: isSupabaseConfigured(),
      currentMember,
      switchMember: (id: string) => {
        const member = teamMembers.find((m) => m.id === id);
        if (member && !DEMO_TEAM.some((d) => d.id === member.id)) {
          setExternalTeamMember(member);
        } else {
          setCurrentTeamMemberId(id);
        }
        refresh();
      },
      teamMembers,
      can: (permission: Parameters<typeof hasPermission>[0]) =>
        memberHasPermission(currentMember, permission),
    }),
    [dataMode, setDataModeAndPersist, currentMember, teamMembers, refresh, permTick]
  );

  if (!dataModeReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-stone-500">
        Loading workspace…
      </div>
    );
  }

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
}

export function useSystem() {
  const ctx = useContext(SystemContext);
  if (!ctx) throw new Error("useSystem must be used within SystemProvider");
  return ctx;
}
