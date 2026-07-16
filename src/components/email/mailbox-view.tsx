"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  EMAIL_FOLDER_LABELS,
  EMAIL_FOLDER_ORDER,
  type EmailFolder,
  type TeamEmailMessage,
} from "@/types/team-email";
import {
  getEmailStats,
  listMessages,
  markMessageSeen,
  moveMessage,
  resendMessage,
} from "@/lib/email/storage";
import { RefreshCw, Mail, Trash2, ArrowLeft } from "lucide-react";
import { useToast } from "@/components/ui/toast";

export function MailboxView() {
  const { show } = useToast();
  const [folder, setFolder] = useState<EmailFolder>("inbox");
  const [messages, setMessages] = useState<TeamEmailMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  function refresh() {
    setMessages(listMessages(folder));
    setSelectedId(null);
  }

  useEffect(() => {
    refresh();
  }, [folder]);

  const stats = useMemo(() => getEmailStats(), [messages]);
  const selected = messages.find((m) => m.id === selectedId) ?? null;

  const folderCounts = useMemo(() => {
    const all = listMessages();
    return Object.fromEntries(
      EMAIL_FOLDER_ORDER.map((f) => [f, all.filter((m) => m.folder === f).length])
    ) as Record<EmailFolder, number>;
  }, [messages]);

  function openMessage(id: string) {
    setSelectedId(id);
    markMessageSeen(id);
    refresh();
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row">
      <aside className="w-full shrink-0 lg:w-52">
        <nav className="flex gap-1 overflow-x-auto rounded-2xl border border-stone-200 bg-white p-2 lg:block lg:space-y-1 lg:overflow-visible">
          {EMAIL_FOLDER_ORDER.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFolder(f)}
              className={cn(
                "flex shrink-0 items-center justify-between rounded-xl px-3 py-2 text-sm lg:w-full",
                folder === f ? "bg-blue-100 text-blue-900 font-medium" : "text-stone-600 hover:bg-stone-50"
              )}
            >
              <span>{EMAIL_FOLDER_LABELS[f]}</span>
              <span className="text-xs tabular-nums">{folderCounts[f]}</span>
            </button>
          ))}
        </nav>
        <p className="mt-3 px-1 text-xs text-stone-500">
          Team mailbox · {stats.inboxUnread} unread in inbox
        </p>
      </aside>

      <div className="min-w-0 flex-1 rounded-2xl border border-stone-200 bg-white">
        <div className="flex items-center justify-between border-b border-stone-100 px-4 py-3">
          <h3 className="font-semibold">{EMAIL_FOLDER_LABELS[folder]}</h3>
          <Button type="button" variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="grid lg:grid-cols-2">
          <ul
            className={cn(
              "max-h-[480px] divide-y divide-stone-100 overflow-y-auto border-b border-stone-100 lg:border-b-0 lg:border-r",
              selectedId && "hidden lg:block"
            )}
          >
            {messages.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => openMessage(m.id)}
                  className={cn(
                    "w-full px-4 py-3 text-left hover:bg-stone-50",
                    selectedId === m.id && "bg-amber-50/60",
                    !m.seen && m.folder === "inbox" && "font-semibold"
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm">
                      {folder === "inbox" ? m.from_name : m.to_name ?? m.to_email}
                    </span>
                    {m.quote_id && (
                      <span className="shrink-0 text-xs text-blue-600">#{m.quote_id}</span>
                    )}
                  </div>
                  <p className="truncate text-xs text-stone-600">{m.subject}</p>
                  <p className="text-[10px] text-stone-400">{formatDate(m.updated_at)}</p>
                </button>
              </li>
            ))}
            {messages.length === 0 && (
              <li className="p-8 text-center text-sm text-stone-500">No messages</li>
            )}
          </ul>

          <div className={cn("min-h-[240px] p-4", !selectedId && "hidden lg:block")}>
            {selected ? (
              <div className="space-y-3">
                <button
                  type="button"
                  className="inline-flex items-center gap-1 text-xs text-stone-500 lg:hidden"
                  onClick={() => setSelectedId(null)}
                >
                  <ArrowLeft className="h-3 w-3" /> Back
                </button>
                <div>
                  <p className="text-lg font-semibold">{selected.subject}</p>
                  <p className="text-xs text-stone-500">
                    {selected.from_name} → {selected.to_name ?? selected.to_email}
                  </p>
                  <p className="text-xs text-stone-400">{formatDateTime(selected.updated_at)}</p>
                </div>
                {selected.quote_id && (
                  <Link
                    href={`/itinerary-builder?search=${selected.quote_id}`}
                    className="text-sm text-blue-700 hover:underline"
                  >
                    Open booking #{selected.quote_id}
                  </Link>
                )}
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-xl bg-stone-50 p-3 text-xs text-stone-800">
                  {selected.body_text}
                </pre>
                <div className="flex flex-wrap gap-2">
                  {selected.folder === "sent" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        resendMessage(selected.id);
                        show("Resent");
                        refresh();
                      }}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Resend
                    </Button>
                  )}
                  {selected.folder !== "spam" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        moveMessage(selected.id, "spam");
                        show("Moved to spam");
                        refresh();
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Spam
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-stone-400">
                <Mail className="h-10 w-10 opacity-40" />
                <p className="mt-2 text-sm">Select a message</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
