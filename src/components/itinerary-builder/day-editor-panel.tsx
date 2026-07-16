"use client";

import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { Tabs } from "@/components/ui/tabs";
import {
  DAY_THEMES,
  HOTEL_OPTIONS,
  MEAL_PLANS,
  ROOM_CATEGORIES,
  VEHICLE_TYPES,
  emptyActivity,
  newUuid,
} from "@/lib/itinerary-builder/defaults";
import type { ItineraryDay } from "@/types/itinerary-builder";
import { GripVertical, Plus, Trash2, Sparkles } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/toast";

const DAY_TABS = [
  { id: "content", label: "Content" },
  { id: "hotel", label: "Hotel & Meals" },
  { id: "transport", label: "Transport" },
  { id: "activities", label: "Activities" },
  { id: "notes", label: "Notes" },
] as const;

export function DayEditorPanel({
  day,
  onChange,
}: {
  day: ItineraryDay;
  onChange: (day: ItineraryDay) => void;
}) {
  const { show } = useToast();
  const [tab, setTab] = useState<string>("content");

  function patch(partial: Partial<ItineraryDay>) {
    onChange({ ...day, ...partial });
  }

  function addActivity() {
    const activities = [...day.activities, emptyActivity(day.activities.length)];
    patch({ activities });
  }

  function updateActivity(index: number, field: string, value: string | number | boolean) {
    const activities = (day.activities ?? []).map((a, i) =>
      i === index ? { ...a, [field]: value } : a
    );
    patch({ activities });
  }

  function removeActivity(index: number) {
    patch({ activities: day.activities.filter((_, i) => i !== index) });
  }

  function aiRewrite() {
    if (!day.day_description.trim()) {
      show("Add a short description first, then use AI rewrite");
      return;
    }
    patch({
      day_description: `${day.day_description.trim()}\n\nExperience curated highlights with expert local guidance, comfortable transfers, and time for photography at iconic landmarks.`,
    });
    show("AI expanded day description (demo)");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-stone-900">
          Day {day.day_number}
          {day.day_title ? ` — ${day.day_title}` : ""}
        </h2>
        <Button type="button" variant="outline" size="sm" onClick={aiRewrite}>
          <Sparkles className="h-3.5 w-3.5" />
          AI Expand
        </Button>
      </div>

      <Tabs tabs={[...DAY_TABS]} active={tab} onChange={setTab} />

      {tab === "content" && (
              <div className="space-y-4 pt-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="day_title">Day title</Label>
                    <Input
                      id="day_title"
                      value={day.day_title}
                      onChange={(e) => patch({ day_title: e.target.value })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="day_subtitle">Day subtitle</Label>
                    <Input
                      id="day_subtitle"
                      value={day.day_subtitle ?? ""}
                      onChange={(e) => patch({ day_subtitle: e.target.value || null })}
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="day_theme">Theme</Label>
                    <Select
                      id="day_theme"
                      value={day.day_theme ?? ""}
                      onChange={(e) => patch({ day_theme: e.target.value || null })}
                      className="mt-1.5"
                    >
                      <option value="">Select theme</option>
                      {DAY_THEMES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="start_time">Start time</Label>
                    <Input
                      id="start_time"
                      type="time"
                      value={day.start_time ?? ""}
                      onChange={(e) => patch({ start_time: e.target.value || null })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_time">End time</Label>
                    <Input
                      id="end_time"
                      type="time"
                      value={day.end_time ?? ""}
                      onChange={(e) => patch({ end_time: e.target.value || null })}
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="day_description">Description</Label>
                  <Textarea
                    id="day_description"
                    rows={6}
                    value={day.day_description}
                    onChange={(e) => patch({ day_description: e.target.value })}
                    className="mt-1.5"
                    placeholder="Rich narrative for client proposal…"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="completion">Completion %</Label>
                    <Input
                      id="completion"
                      type="number"
                      min={0}
                      max={100}
                      value={day.completion_pct}
                      onChange={(e) =>
                        patch({ completion_pct: Math.min(100, Math.max(0, Number(e.target.value))) })
                      }
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="day_status">Status</Label>
                    <Select
                      id="day_status"
                      value={day.status}
                      onChange={(e) =>
                        patch({ status: e.target.value as ItineraryDay["status"] })
                      }
                      className="mt-1.5"
                    >
                      <option value="planned">Planned</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in_progress">In progress</option>
                      <option value="completed">Completed</option>
                    </Select>
                  </div>
                </div>
              </div>
      )}

      {tab === "hotel" && (
              <div className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="hotel">Hotel</Label>
                  <Select
                    id="hotel"
                    value={day.hotel_name ?? ""}
                    onChange={(e) => patch({ hotel_name: e.target.value || null })}
                    className="mt-1.5"
                  >
                    <option value="">No hotel (transit day)</option>
                    {HOTEL_OPTIONS.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="room">Room category</Label>
                    <Select
                      id="room"
                      value={day.room_category ?? ""}
                      onChange={(e) => patch({ room_category: e.target.value || null })}
                      className="mt-1.5"
                    >
                      <option value="">Select</option>
                      {ROOM_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="meal">Meal plan</Label>
                    <Select
                      id="meal"
                      value={day.meal_plan ?? "MAP"}
                      onChange={(e) => patch({ meal_plan: e.target.value })}
                      className="mt-1.5"
                    >
                      {MEAL_PLANS.map((m) => (
                        <option key={m} value={m}>
                          {m}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4">
                  {(["breakfast", "lunch", "dinner"] as const).map((meal) => (
                    <label key={meal} className="flex items-center gap-2 text-sm capitalize">
                      <input
                        type="checkbox"
                        checked={day[meal]}
                        onChange={(e) => patch({ [meal]: e.target.checked })}
                        className="rounded border-stone-300"
                      />
                      {meal}
                    </label>
                  ))}
                </div>
              </div>
      )}

      {tab === "transport" && (
              <div className="space-y-4 pt-2">
                <div>
                  <Label htmlFor="vehicle">Vehicle</Label>
                  <Select
                    id="vehicle"
                    value={day.vehicle_type ?? ""}
                    onChange={(e) => patch({ vehicle_type: e.target.value || null })}
                    className="mt-1.5"
                  >
                    <option value="">Not assigned</option>
                    {VEHICLE_TYPES.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="pickup">Pickup</Label>
                    <Input
                      id="pickup"
                      value={day.pickup_location ?? ""}
                      onChange={(e) => patch({ pickup_location: e.target.value || null })}
                      className="mt-1.5"
                    />
                  </div>
                  <div>
                    <Label htmlFor="drop">Drop</Label>
                    <Input
                      id="drop"
                      value={day.drop_location ?? ""}
                      onChange={(e) => patch({ drop_location: e.target.value || null })}
                      className="mt-1.5"
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={day.guide_required}
                    onChange={(e) => patch({ guide_required: e.target.checked })}
                    className="rounded border-stone-300"
                  />
                  Guide required this day
                </label>
              </div>
      )}

      {tab === "activities" && (
              <div className="space-y-4 pt-2">
                {day.activities.length === 0 && (
                  <p className="text-sm text-stone-500">No activities yet — add sightseeing or experiences.</p>
                )}
                {(day.activities ?? []).map((act, i) => (
                  <div
                    key={act.activity_uuid || i}
                    className="rounded-xl border border-stone-200 bg-stone-50/50 p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1 text-xs font-medium text-stone-500">
                        <GripVertical className="h-3 w-3" /> Activity {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeActivity(i)}
                        className="text-stone-400 hover:text-red-600"
                        aria-label="Remove activity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <Input
                      placeholder="Activity title"
                      value={act.title}
                      onChange={(e) => updateActivity(i, "title", e.target.value)}
                    />
                    <Textarea
                      rows={2}
                      placeholder="Description"
                      value={act.description}
                      onChange={(e) => updateActivity(i, "description", e.target.value)}
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <Input
                        type="time"
                        value={act.start_time ?? ""}
                        onChange={(e) => updateActivity(i, "start_time", e.target.value)}
                      />
                      <Input
                        type="number"
                        placeholder="Entry fee ₹"
                        value={act.entry_fee || ""}
                        onChange={(e) => updateActivity(i, "entry_fee", Number(e.target.value) || 0)}
                      />
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={act.guide_required}
                          onChange={(e) => updateActivity(i, "guide_required", e.target.checked)}
                        />
                        Guide
                      </label>
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addActivity}>
                  <Plus className="h-4 w-4" />
                  Add activity
                </Button>
              </div>
      )}

      {tab === "notes" && (
            <div className="space-y-4 pt-2">
              <div>
                <Label htmlFor="internal_notes">Internal notes (staff only)</Label>
                <Textarea
                  id="internal_notes"
                  rows={3}
                  value={day.internal_notes}
                  onChange={(e) => patch({ internal_notes: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="client_notes">Client notes</Label>
                <Textarea
                  id="client_notes"
                  rows={3}
                  value={day.client_notes}
                  onChange={(e) => patch({ client_notes: e.target.value })}
                  className="mt-1.5"
                />
              </div>
              <div>
                <Label htmlFor="ops_notes">Operations notes</Label>
                <Textarea
                  id="ops_notes"
                  rows={3}
                  value={day.operations_notes}
                  onChange={(e) => patch({ operations_notes: e.target.value })}
                  className="mt-1.5"
                />
              </div>
            </div>
      )}
    </div>
  );
}
