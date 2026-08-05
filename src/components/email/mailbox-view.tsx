"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  const [allMessages, setAllMessages] = useState<TeamEmailMessage[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stats, setStats] = useState({
    totalEmails: 0,
    totalSends: 0,
    pending: 0,
    seen: 0,
    unseen: 0,
    inboxUnread: 0,
  });

  const refresh = useCallback(async () => {
    try {
      const [folderRows, allRows, nextStats] = await Promise.all([
        listMessages(folder),
        listMessages(),
        getEmailStats(),
      ]);
      setMessages(folderRows);
      setAllMessages(allRows);
      setStats(nextStats);
      setSelectedId(null);
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to load mailbox");
    }
  }, [folder, show]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const selected = messages.find((m) => m.id === selectedId) ?? null;

  const folderCounts = useMemo(() => {
    return Object.fromEntries(
      EMAIL_FOLDER_ORDER.map((f) => [f, allMessages.filter((m) => m.folder === f).length])
    ) as Record<EmailFolder, number>;
  }, [allMessages]);

  async function openMessage(id: string) {
    setSelectedId(id);
    try {
      await markMessageSeen(id);
      await refresh();
      setSelectedId(id);
    } catch (err) {
      show(err instanceof Error ? err.message : "Failed to mark seen");
    }
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
          <h2 className="font-semibold text-stone-900">{EMAIL_FOLDER_LABELS[folder]}</h2>
          <Button type="button" variant="outline" size="sm" onClick={() => void refresh()}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        {!selected ? (
          <ul className="divide-y divide-stone-100">
            {messages.length === 0 && (
              <li className="px-4 py-10 text-center text-sm text-stone-500">
                No messages in this folder
              </li>
            )}
            {messages.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => void openMessage(m.id)}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-stone-50",
                    !m.seen && "bg-blue-50/40"
                  )}
                >
                  <Mail className="mt-0.5 h-4 w-4 shrink-0 text-stone-400" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className={cn("truncate text-sm", !m.seen && "font-semibold")}>
                        {m.from_name || m.from_email}
                      </p>
                      <span className="shrink-0 text-xs text-stone-400">
                        {formatDate(m.updated_at)}
                      </span>
                    </div>
                    <p className="truncate text-sm text-stone-800">{m.subject}</p>
                    <p className="truncate text-xs text-stone-500">{m.body_text}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="space-y-4 p-4">
            <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div>
              <h3 className="text-lg font-semibold text-stone-900">{selected.subject}</h3>
              <p className="mt-1 text-sm text-stone-500">
                From {selected.from_name} &lt;{selected.from_email}&gt; ·{" "}
                {formatDateTime(selected.updated_at)}
              </p>
              {selected.quote_id && (
                <p className="mt-1 text-xs text-stone-500">
                  Quote{" "}
                  <Link href="/itinerary-builder" className="text-amber-700 underline">
                    {selected.quote_id}
                  </Link>
                </p>
              )}
            </div>
            <div className="whitespace-pre-wrap rounded-xl bg-stone-50 p-4 text-sm text-stone-800">
              {selected.body_text}
            </div>
            <div className="flex flex-wrap gap-2">
              {selected.folder !== "spam" && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    void moveMessage(selected.id, "spam").then(() => {
                      show("Moved to spam");
                      void refresh();
                    })
                  }
                >
                  <Trash2 className="h-4 w-4" />
                  Spam
                </Button>
              )}
              {(selected.folder === "sent" || selected.folder === "outbox") && (
                <Button
                  type="button"
                  size="sm"
                  onClick={() =>
                    void resendMessage(selected.id).then(() => {
                      show("Resent");
                      void refresh();
                    })
                  }
                >
                  Resend
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
