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
import { getCurrentTeamMember, setCurrentTeamMemberId, listTeamMembers } from "@/lib/rbac/current-user";
import { hasPermission } from "@/lib/rbac/permissions";

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
  const [dataMode, setDataModeState] = useState<DataMode>("dummy");
  const [currentMember, setCurrentMember] = useState<TeamMember>(getCurrentTeamMember());

  const refresh = useCallback(() => {
    setDataModeState(getDataMode());
    setCurrentMember(getCurrentTeamMember());
  }, []);

  useEffect(() => {
    refresh();
    fetchDataModeFromServer().then((serverMode) => {
      if (serverMode && serverMode !== getDataMode()) {
        setDataMode(serverMode);
        refresh();
      }
    });

    const onMode = () => refresh();
    const onMember = () => refresh();
    window.addEventListener("td-data-mode-change", onMode);
    window.addEventListener("td-team-member-change", onMember);
    return () => {
      window.removeEventListener("td-data-mode-change", onMode);
      window.removeEventListener("td-team-member-change", onMember);
    };
  }, [refresh]);

  const setDataModeAndPersist = useCallback(async (mode: DataMode) => {
    setDataMode(mode);
    setDataModeState(mode);
    await persistDataModeToServer(mode);
    const { logActivity } = await import("@/lib/system/activity-log");
    logActivity({
      action: "data_mode_change",
      module: "system",
      summary: `Data mode switched to ${mode.toUpperCase()}`,
      metadata: { mode },
    });
  }, []);

  const value = useMemo(
    () => ({
      dataMode,
      setDataModeAndPersist,
      supabaseConfigured: isSupabaseConfigured(),
      currentMember,
      switchMember: (id: string) => {
        setCurrentTeamMemberId(id);
        refresh();
      },
      teamMembers: listTeamMembers(),
      can: (permission: Parameters<typeof hasPermission>[0]) =>
        hasPermission(permission, currentMember.role),
    }),
    [dataMode, setDataModeAndPersist, currentMember]
  );

  return <SystemContext.Provider value={value}>{children}</SystemContext.Provider>;
}

export function useSystem() {
  const ctx = useContext(SystemContext);
  if (!ctx) throw new Error("useSystem must be used within SystemProvider");
  return ctx;
}
