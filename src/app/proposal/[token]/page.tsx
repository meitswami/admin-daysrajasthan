"use client";

import { useEffect, useState } from "react";
import { ClientProposalView } from "@/components/itinerary-builder/client-proposal-view";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { ItinerarySnapshot } from "@/types/itinerary-builder";

type ProposalPayload = {
  token: string;
  quote_id: string;
  version_number: number;
  revision_id: string;
  client_name: string;
  snapshot: ItinerarySnapshot;
  requires_pin: boolean;
  accepted_at: string | null;
  accepted_by_name: string | null;
};

export default function ProposalPage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<ProposalPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [pinOk, setPinOk] = useState(false);

  useEffect(() => {
    params.then(({ token: t }) => setToken(t));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/itinerary-builder/share/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? "Not found");
        }
        return res.json();
      })
      .then((json) => {
        setData(json);
        if (!json.requires_pin) setPinOk(true);
      })
      .catch((e) => setError(e.message));
  }, [token]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100 p-4">
        <p className="text-stone-600">{error}</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-100">
        <p className="text-sm text-stone-500">Loading your proposal…</p>
      </div>
    );
  }

  if (data.requires_pin && !pinOk) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-amber-50 to-stone-100 p-4">
        <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-6 shadow-lg">
          <h1 className="text-lg font-bold text-stone-900">Protected proposal</h1>
          <p className="mt-1 text-sm text-stone-600">
            Enter the PIN shared by your travel advisor to view {data.quote_id}.
          </p>
          <div className="mt-4">
            <Label htmlFor="pin">PIN</Label>
            <Input
              id="pin"
              type="password"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="mt-1.5"
            />
          </div>
          <Button type="button" className="mt-4 w-full" onClick={() => setPinOk(true)}>
            View proposal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <ClientProposalView
      token={data.token}
      quoteId={data.quote_id}
      versionNumber={data.version_number}
      revisionId={data.revision_id}
      snapshot={data.snapshot}
      acceptedAt={data.accepted_at}
      acceptedByName={data.accepted_by_name}
      onAccept={
        data.accepted_at
          ? undefined
          : async (name, clientPin) => {
              const res = await fetch(`/api/itinerary-builder/share/${data.token}/accept`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ accepted_by_name: name, pin: clientPin || null }),
              });
              return res.ok;
            }
      }
    />
  );
}
