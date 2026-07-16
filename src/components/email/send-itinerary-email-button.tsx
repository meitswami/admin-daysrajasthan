"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import type { ClientItineraryRecord } from "@/types/itinerary-builder";
import type { EmailTemplateId } from "@/types/team-email";
import { EMAIL_TEMPLATES } from "@/lib/email/templates";
import { buildTemplateContext, sendItineraryEmail } from "@/lib/email/send-itinerary";
import { useToast } from "@/components/ui/toast";
import { Mail, Send } from "lucide-react";

export function SendItineraryEmailButton({
  record,
  onSent,
  variant = "icon",
}: {
  record: ClientItineraryRecord;
  onSent?: () => void;
  variant?: "icon" | "button";
}) {
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState<EmailTemplateId>("itinerary_suggestion");
  const [toEmail, setToEmail] = useState(record.client_email ?? "");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const { show } = useToast();

  useEffect(() => {
    if (!open) return;
    const ctx = buildTemplateContext(record);
    const rendered = EMAIL_TEMPLATES[templateId];
    setSubject(rendered.subject(ctx));
    setBody(rendered.body(ctx));
    setToEmail(record.client_email ?? "");
  }, [open, templateId, record]);

  async function handleSend() {
    if (!toEmail.trim()) {
      show("Enter recipient email");
      return;
    }
    setSending(true);
    const result = await sendItineraryEmail(record, {
      templateId,
      toEmail: toEmail.trim(),
    });
    setSending(false);
    if (!result.ok) {
      show(result.error ?? "Failed to send");
      return;
    }
    show(`Email sent for ${record.quote_id}`);
    setOpen(false);
    onSent?.();
  }

  return (
    <>
      {variant === "icon" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white hover:bg-blue-700"
          title="Send itinerary email"
        >
          <Mail className="h-4 w-4" />
        </button>
      ) : (
        <Button type="button" size="sm" onClick={() => setOpen(true)}>
          <Mail className="h-4 w-4" />
          Send email
        </Button>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Send email — ${record.quote_id}`}
        description="ItinerarySuggestion template — selection options in body"
      >
        <div className="space-y-4">
          <div>
            <Label>Template</Label>
            <Select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value as EmailTemplateId)}
              className="mt-1.5"
            >
              {Object.values(EMAIL_TEMPLATES).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-stone-500">
              {EMAIL_TEMPLATES[templateId].description}
            </p>
          </div>
          <div>
            <Label>To</Label>
            <Input
              type="email"
              value={toEmail}
              onChange={(e) => setToEmail(e.target.value)}
              className="mt-1.5"
            />
          </div>
          <div>
            <Label>Subject</Label>
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} className="mt-1.5" />
          </div>
          <div>
            <Label>Body</Label>
            <Textarea
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="mt-1.5 font-mono text-xs"
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="flex-1" onClick={handleSend} disabled={sending}>
              <Send className="h-4 w-4" />
              {sending ? "Sending…" : "Send now"}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
