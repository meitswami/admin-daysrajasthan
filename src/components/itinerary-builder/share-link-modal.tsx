"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { Copy, ExternalLink, Link2 } from "lucide-react";

export function ShareLinkModal({
  open,
  onClose,
  onCreate,
  quoteId,
  versionNumber,
}: {
  open: boolean;
  onClose: () => void;
  onCreate: (options: { pin: string | null }) => Promise<string | null>;
  quoteId: string;
  versionNumber: number;
}) {
  const { show } = useToast();
  const [pin, setPin] = useState("");
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    setLoading(true);
    const link = await onCreate({ pin: pin.trim() || null });
    setLoading(false);
    if (link) {
      setUrl(link);
      show("Share link created — pinned to current revision");
    } else {
      show("Failed to create share link");
    }
  }

  function handleCopy() {
    if (!url) return;
    navigator.clipboard.writeText(url);
    show("Link copied to clipboard");
  }

  function handleClose() {
    setUrl(null);
    setPin("");
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Share with client"
      description={`Creates a live link pinned to ${quoteId} v${versionNumber} — never auto-updates to latest`}
    >
      <div className="space-y-4">
        {!url ? (
          <>
            <div>
              <Label htmlFor="share_pin">Optional PIN (4 digits)</Label>
              <Input
                id="share_pin"
                placeholder="Leave empty for open link"
                maxLength={4}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                className="mt-1.5"
              />
            </div>
            <p className="text-xs text-stone-500">
              Client can view itinerary, download PDF, and digitally accept this exact version.
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="button" className="flex-1" disabled={loading} onClick={handleCreate}>
                <Link2 className="h-4 w-4" />
                {loading ? "Creating…" : "Generate link"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-medium text-amber-900">Live share URL</p>
              <p className="mt-1 break-all text-sm text-stone-800">{url}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={handleCopy}>
                <Copy className="h-4 w-4" />
                Copy link
              </Button>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                <ExternalLink className="h-4 w-4" />
                Open preview
              </a>
            </div>
            <Button type="button" variant="ghost" className="w-full text-sm" onClick={handleClose}>
              Done
            </Button>
          </>
        )}
      </div>
    </Modal>
  );
}
