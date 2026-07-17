"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { BellRing, Clock3, Headphones, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCurrentTeamMember } from "@/lib/rbac/current-user";
import type { ChatConversationStub } from "@/modules/chat";
import { cn } from "@/lib/utils";

type PollData = {
  offered: ChatConversationStub[];
  floating: ChatConversationStub[];
  adminEscalations: ChatConversationStub[];
  online: Array<{ teamMemberId: string; name: string; role: string }>;
  now: string;
};

function playAlertSound(kind: "offer" | "admin") {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes = kind === "admin" ? [880, 660, 880] : [740, 980];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.22, now + i * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.18 + 0.16);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.18);
      osc.stop(now + i * 0.18 + 0.18);
    });
    void ctx.resume();
    setTimeout(() => void ctx.close(), 1200);
  } catch {
    /* autoplay / unsupported */
  }
}

function secondsLeft(expiresAt: string | null | undefined, nowMs: number): number {
  if (!expiresAt) return 0;
  return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - nowMs) / 1000));
}

/**
 * Global dashboard alerts for chat lead offers, rotation, floating claim, admin escalate.
 * SWAL-style modal + header bell events + alert sound.
 */
export function ChatLeadAlerts() {
  const [me, setMe] = useState(() => getCurrentTeamMember());
  const [poll, setPoll] = useState<PollData | null>(null);
  const [dismissedIds, setDismissedIds] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tick, setTick] = useState(Date.now());
  const soundedRef = useRef<Set<string>>(new Set());
  const isAdmin = me.role === "superadmin" || me.role === "admin";

  useEffect(() => {
    const onMember = () => setMe(getCurrentTeamMember());
    window.addEventListener("td-team-member-change", onMember);
    return () => window.removeEventListener("td-team-member-change", onMember);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const member = getCurrentTeamMember();
      setMe(member);
      const res = await fetch("/api/chat/platform/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "poll",
          teamMemberId: member.id,
          name: member.name,
          role: member.role,
        }),
      });
      const json = (await res.json()) as { success?: boolean; data?: PollData };
      if (json.success && json.data) {
        setPoll(json.data);
        window.dispatchEvent(
          new CustomEvent("td-chat-lead-alerts", {
            detail: json.data,
          })
        );
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void refresh();
    const pollId = window.setInterval(() => void refresh(), 3000);
    const tickId = window.setInterval(() => setTick(Date.now()), 1000);
    return () => {
      window.clearInterval(pollId);
      window.clearInterval(tickId);
    };
  }, [refresh]);

  const activeOffer = useMemo(() => {
    const offered = poll?.offered ?? [];
    return offered.find((c) => !dismissedIds.includes(`offer:${c.id}`)) ?? null;
  }, [poll, dismissedIds]);

  const adminAlert = useMemo(() => {
    if (!isAdmin) return null;
    const list = poll?.adminEscalations ?? [];
    return (
      list.find(
        (c) =>
          (c.handoffStatus === "escalated_admin" ||
            c.handoffStatus === "floating" ||
            c.handoffStatus === "queued_human") &&
          !dismissedIds.includes(`admin:${c.id}`)
      ) ?? null
    );
  }, [poll, isAdmin, dismissedIds]);

  const floatingClaim = useMemo(() => {
    if (activeOffer) return null;
    const list = poll?.floating ?? [];
    return list.find((c) => !dismissedIds.includes(`float:${c.id}`)) ?? null;
  }, [poll, activeOffer, dismissedIds]);

  useEffect(() => {
    if (activeOffer) {
      const key = `offer-sound:${activeOffer.id}:${activeOffer.offerExpiresAt}`;
      if (!soundedRef.current.has(key)) {
        soundedRef.current.add(key);
        playAlertSound("offer");
      }
    }
  }, [activeOffer]);

  useEffect(() => {
    if (adminAlert) {
      const key = `admin-sound:${adminAlert.id}:${adminAlert.escalatedToAdminAt ?? adminAlert.floatingAt}`;
      if (!soundedRef.current.has(key)) {
        soundedRef.current.add(key);
        playAlertSound("admin");
      }
    }
  }, [adminAlert]);

  async function accept(conversationId: string) {
    setBusyId(conversationId);
    try {
      const member = getCurrentTeamMember();
      const res = await fetch("/api/chat/platform/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          conversationId,
          teamMemberId: member.id,
        }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (!json.success) {
        window.alert(json.message ?? "Accept failed");
      }
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  async function claim(conversationId: string) {
    setBusyId(conversationId);
    try {
      const member = getCurrentTeamMember();
      const res = await fetch("/api/chat/platform/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "claim",
          conversationId,
          teamMemberId: member.id,
        }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string };
      if (!json.success) {
        window.alert(json.message ?? "Claim failed");
      }
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  const modalLead = activeOffer ?? (isAdmin ? adminAlert : null) ?? floatingClaim;
  const mode: "offer" | "admin" | "float" | null = activeOffer
    ? "offer"
    : isAdmin && adminAlert
      ? "admin"
      : floatingClaim
        ? "float"
        : null;

  const left = activeOffer ? secondsLeft(activeOffer.offerExpiresAt, tick) : 0;

  if (!modalLead || !mode) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/55 backdrop-blur-sm" />
      <div
        role="alertdialog"
        aria-modal="true"
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl"
      >
        <div
          className={cn(
            "flex items-center gap-3 px-5 py-4 text-white",
            mode === "admin" ? "bg-[#7A1F1F]" : mode === "offer" ? "bg-amber-600" : "bg-sky-700"
          )}
        >
          {mode === "admin" ? (
            <BellRing className="h-6 w-6 shrink-0" />
          ) : mode === "offer" ? (
            <Headphones className="h-6 w-6 shrink-0" />
          ) : (
            <Users className="h-6 w-6 shrink-0" />
          )}
          <div>
            <p className="text-sm font-semibold">
              {mode === "admin"
                ? "Admin alert — assign chat lead"
                : mode === "offer"
                  ? "New chat lead for you"
                  : "Floating chat lead — claim it"}
            </p>
            <p className="text-xs opacity-90">Travel Days · live handoff</p>
          </div>
        </div>

        <div className="space-y-3 px-5 py-4">
          <p className="text-sm text-stone-800">
            <span className="font-semibold">{modalLead.visitorLabel}</span>
            {modalLead.email ? ` · ${modalLead.email}` : ""}
          </p>
          <p className="rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-700">
            {modalLead.lastMessagePreview || "New website chat inquiry"}
          </p>

          {mode === "offer" && (
            <div className="flex items-center justify-between rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <span className="flex items-center gap-1.5 text-sm font-medium text-amber-900">
                <Clock3 className="h-4 w-4" />
                Accept within
              </span>
              <span
                className={cn(
                  "font-mono text-xl font-bold",
                  left <= 5 ? "text-red-600" : "text-amber-800"
                )}
              >
                {left}s
              </span>
            </div>
          )}

          {mode === "admin" && (
            <p className="text-xs text-stone-500">
              Auto-assign was not accepted on time, or no agent is online. Assign this lead from
              Conversations, or wait for an online agent to claim it.
            </p>
          )}

          {mode === "float" && (
            <p className="text-xs text-stone-500">
              No active agent accepted in time. Any Online/Active team member can claim this lead.
            </p>
          )}

          <div className="flex flex-wrap gap-2 pt-1">
            {mode === "offer" && (
              <Button
                type="button"
                disabled={busyId === modalLead.id || left <= 0}
                onClick={() => void accept(modalLead.id)}
              >
                {busyId === modalLead.id ? "Accepting…" : "Accept lead"}
              </Button>
            )}
            {mode === "float" && (
              <Button
                type="button"
                disabled={busyId === modalLead.id}
                onClick={() => void claim(modalLead.id)}
              >
                {busyId === modalLead.id ? "Claiming…" : "Claim lead"}
              </Button>
            )}
            {mode === "admin" && (
              <Link href="/ai-chat/conversations">
                <Button type="button">Open Conversations</Button>
              </Link>
            )}
            {mode === "admin" && floatingClaim && floatingClaim.id === modalLead.id && (
              <Button
                type="button"
                variant="outline"
                disabled={busyId === modalLead.id}
                onClick={() => void claim(modalLead.id)}
              >
                Claim myself
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setDismissedIds((prev) => [
                  ...prev,
                  mode === "offer"
                    ? `offer:${modalLead.id}`
                    : mode === "admin"
                      ? `admin:${modalLead.id}`
                      : `float:${modalLead.id}`,
                ])
              }
            >
              Dismiss
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
