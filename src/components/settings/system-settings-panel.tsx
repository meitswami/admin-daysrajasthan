"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label, Select } from "@/components/ui/input";
import { useSystem } from "@/components/providers/system-provider";
import { useSiteSettings } from "@/components/providers/site-settings-provider";
import { useToast } from "@/components/ui/toast";
import { GlobalPricingAuditPanel } from "@/components/itinerary-builder/pricing-audit-panel";
import {
  fetchActivityLogsMerged,
  listActivityLogs,
} from "@/lib/system/activity-log";
import { updateTeamMemberMfa } from "@/lib/rbac/current-user";
import { ROLE_LABELS } from "@/types/rbac";
import type { ActivityAction } from "@/types/system";
import { formatDateTime } from "@/lib/utils";
import { downloadCsv } from "@/lib/utils/csv";
import { Database, Shield, History, IndianRupee, Smartphone, Download, Percent } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ActivityLogEntry } from "@/types/system";
import { RbacPermissionMatrix } from "@/components/settings/rbac-permission-matrix";

const MODULE_OPTIONS = ["", "auth", "system", "itinerary_builder", "email", "crm", "master_data"];
const ACTION_OPTIONS: ActivityAction[] = [
  "login",
  "quote_create",
  "quote_update",
  "quote_delete",
  "payment_update",
  "workflow_change",
  "email_send",
  "data_mode_change",
  "mfa_enable",
  "mfa_disable",
  "lead_convert",
  "pricing_change",
  "master_data_create",
  "master_data_update",
  "master_data_delete",
];

export function SystemSettingsPanel() {
  const { dataMode, setDataModeAndPersist, supabaseConfigured, currentMember, teamMembers, switchMember, can } =
    useSystem();
  const { settings, updateAdminGeneral } = useSiteSettings();
  const { show } = useToast();
  const [confirmReal, setConfirmReal] = useState(false);
  const [activity, setActivity] = useState<ActivityLogEntry[]>(listActivityLogs({ limit: 30 }));
  const [moduleFilter, setModuleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState<ActivityAction | "">("");
  const [loadingLogs, setLoadingLogs] = useState(false);

  async function refreshActivity() {
    setLoadingLogs(true);
    const logs = await fetchActivityLogsMerged({
      limit: 100,
      module: moduleFilter || undefined,
      action: actionFilter || undefined,
    });
    setActivity(logs);
    setLoadingLogs(false);
  }

  function exportActivityCsv() {
    downloadCsv(
      "activity-log.csv",
      ["Time", "Action", "Module", "Summary", "Actor", "Role", "Entity"],
      activity.map((log) => [
        log.created_at,
        log.action,
        log.module,
        log.summary,
        log.actor_name,
        log.actor_role,
        log.entity_id ?? "",
      ])
    );
  }

  async function handleDataModeChange(mode: "dummy" | "real") {
    if (mode === "real" && !confirmReal) {
      setConfirmReal(true);
      show("Click Real again to confirm — mock seed data will be hidden");
      return;
    }
    if (!supabaseConfigured && mode === "real") {
      show("Supabase env is not configured — cannot use Real mode");
      return;
    }
    await setDataModeAndPersist(mode);
    setConfirmReal(false);
    show(`Data mode: ${mode.toUpperCase()}`);
  }

  if (!can("settings.system") && !can("activity_logs.view")) {
    const superAdmins = teamMembers.filter((m) => m.role === "superadmin" && m.is_active);
    return (
      <Card>
        <CardContent className="space-y-4 p-6 text-sm text-stone-600">
          <p>
            You do not have permission to view system settings.
            <span className="mt-1 block text-xs text-stone-500">
              Current role: {ROLE_LABELS[currentMember.role]} ({currentMember.name}). Sales and
              other non-admin roles cannot open System &amp; RBAC — switch back to a Super Admin.
            </span>
          </p>
          <div>
            <Label>Switch acting user</Label>
            <Select
              className="mt-1.5 max-w-md"
              value={currentMember.id}
              onChange={(e) => {
                switchMember(e.target.value);
                show(`Switched to ${teamMembers.find((m) => m.id === e.target.value)?.name}`);
              }}
            >
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({ROLE_LABELS[m.role]})
                </option>
              ))}
            </Select>
          </div>
          {superAdmins[0] && (
            <Button
              type="button"
              onClick={() => {
                switchMember(superAdmins[0].id);
                show(`Restored ${superAdmins[0].name} (Super Admin)`);
              }}
            >
              Continue as Super Admin
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {can("data_mode.toggle") && (
        <Card className={cn(dataMode === "real" ? "border-emerald-300 bg-emerald-50/30" : "border-amber-200/60 bg-amber-50/40")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Database className="h-5 w-5" />
              Data Mode
            </CardTitle>
            <CardDescription>
              Dummy shows mock/local data site-wide. Real uses Supabase only (no seed QRT rows).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant={dataMode === "real" ? "success" : "warning"}>
                {dataMode === "real" ? "REAL" : "DUMMY"}
              </Badge>
              {!supabaseConfigured && (
                <span className="text-xs text-red-600">Supabase env not configured — Real mode limited</span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={dataMode === "dummy" ? "default" : "outline"}
                onClick={() => handleDataModeChange("dummy")}
              >
                Dummy (testing)
              </Button>
              <Button
                type="button"
                variant={dataMode === "real" ? "default" : "outline"}
                onClick={() => handleDataModeChange("real")}
              >
                Real (production)
              </Button>
            </div>
            {confirmReal && (
              <p className="text-xs text-amber-800">Confirm: click Real again to switch to Supabase data.</p>
            )}
          </CardContent>
        </Card>
      )}

      {can("settings.system") && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Percent className="h-5 w-5" />
              Booking Advance Default
            </CardTitle>
            <CardDescription>
              Default advance % applied to new itineraries. Agents can still choose 20% or 30% per
              booking on the Payment page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-w-xs">
              <Label>Default advance percent</Label>
              <Select
                className="mt-1.5"
                value={String(settings.adminGeneral.default_advance_percent ?? 20)}
                onChange={(e) => {
                  const pct = e.target.value === "30" ? 30 : 20;
                  updateAdminGeneral({ default_advance_percent: pct });
                  show(`Default advance set to ${pct}%`);
                }}
              >
                <option value="20">20% of package total</option>
                <option value="30">30% of package total</option>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5" />
            RBAC — Team & Permissions
          </CardTitle>
          <CardDescription>
            Real DB team members load from Supabase. Use Acting as to preview another role (Sales
            cannot open this tab — switch back to Super Admin).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Acting as</Label>
            <Select
              className="mt-1.5 max-w-md"
              value={currentMember.id}
              onChange={(e) => {
                switchMember(e.target.value);
                show(`Switched to ${teamMembers.find((m) => m.id === e.target.value)?.name}`);
              }}
            >
              {teamMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({ROLE_LABELS[m.role]})
                </option>
              ))}
            </Select>
          </div>
          <div className="overflow-x-auto rounded-xl border border-stone-100">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="bg-stone-50 text-left text-xs uppercase text-stone-500">
                <tr>
                  <th className="px-3 py-2">Member</th>
                  <th className="px-3 py-2">Role</th>
                  <th className="px-3 py-2">MFA</th>
                  {can("team.manage") && <th className="px-3 py-2">Admin</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {teamMembers.map((m) => (
                  <tr key={m.id}>
                    <td className="px-3 py-2">
                      <p className="font-medium">{m.name}</p>
                      <p className="text-xs text-stone-500">{m.email}</p>
                    </td>
                    <td className="px-3 py-2">{ROLE_LABELS[m.role]}</td>
                    <td className="px-3 py-2">
                      {m.mfa_enabled ? (
                        <Badge variant="success">Enabled</Badge>
                      ) : (
                        <Badge variant="default">Off</Badge>
                      )}
                    </td>
                    {can("team.manage") && (
                      <td className="px-3 py-2">
                        {m.mfa_enabled && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              updateTeamMemberMfa(m.id, { mfa_enabled: false, mfa_locked: false });
                              show(`MFA disabled for ${m.name} (admin override)`);
                            }}
                          >
                            Disable MFA
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <details className="text-sm text-stone-600" open>
            <summary className="cursor-pointer font-medium">
              Permission matrix — toggle by role
            </summary>
            <div className="mt-3">
              <RbacPermissionMatrix canEdit={can("settings.system") && currentMember.role === "superadmin"} />
            </div>
          </details>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Smartphone className="h-5 w-5" />
            Microsoft Authenticator (MFA)
          </CardTitle>
          <CardDescription>Enable from profile; Admin can disable if member is locked out</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              updateTeamMemberMfa(currentMember.id, { mfa_enabled: !currentMember.mfa_enabled });
              switchMember(currentMember.id);
              show(
                currentMember.mfa_enabled
                  ? "MFA disabled on your profile"
                  : "MFA enabled — you will be prompted on next login"
              );
            }}
          >
            {currentMember.mfa_enabled ? "Disable MFA on my account" : "Enable MFA on my account"}
          </Button>
        </CardContent>
      </Card>

      {can("activity_logs.view") && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-5 w-5" />
                Activity Logs
              </CardTitle>
              <CardDescription>Superadmin/Admin audit trail</CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void refreshActivity()} disabled={loadingLogs}>
                {loadingLogs ? "Loading…" : "Refresh"}
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={exportActivityCsv}>
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 overflow-x-auto">
            <div className="flex flex-wrap gap-3">
              <div>
                <Label className="text-xs">Module</Label>
                <Select
                  className="mt-1 h-9 w-40 text-xs"
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                >
                  {MODULE_OPTIONS.map((m) => (
                    <option key={m || "all"} value={m}>
                      {m || "All modules"}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label className="text-xs">Action</Label>
                <Select
                  className="mt-1 h-9 w-44 text-xs"
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value as ActivityAction | "")}
                >
                  <option value="">All actions</option>
                  {ACTION_OPTIONS.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <table className="w-full min-w-[640px] text-sm">
              <thead className="text-left text-xs uppercase text-stone-500">
                <tr>
                  <th className="pb-2 pr-3">Time</th>
                  <th className="pb-2 pr-3">Action</th>
                  <th className="pb-2 pr-3">Module</th>
                  <th className="pb-2 pr-3">Summary</th>
                  <th className="pb-2">Actor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {activity.map((log) => (
                  <tr key={log.id}>
                    <td className="py-2 pr-3 text-xs text-stone-500 whitespace-nowrap">
                      {formatDateTime(log.created_at)}
                    </td>
                    <td className="py-2 pr-3 font-mono text-xs">{log.action}</td>
                    <td className="py-2 pr-3 text-xs">{log.module}</td>
                    <td className="py-2 pr-3 text-xs">{log.summary}</td>
                    <td className="py-2 text-xs">
                      {log.actor_name}
                      <span className="text-stone-400"> · {log.actor_role}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <IndianRupee className="h-5 w-5" />
            Pricing Change Log
          </CardTitle>
          <CardDescription>Manual overrides per client quote (Phase C)</CardDescription>
        </CardHeader>
        <CardContent>
          <GlobalPricingAuditPanel />
        </CardContent>
      </Card>
    </div>
  );
}
