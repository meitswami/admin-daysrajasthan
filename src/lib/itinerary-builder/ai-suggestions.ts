export type AiSuggestion = {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  source: "seed" | "learned" | "manual";
};

const STORAGE_KEY = "td_ai_suggestions_v1";

const SEED: Omit<AiSuggestion, "id" | "created_at" | "updated_at" | "source">[] = [
  {
    title: "Arrival At Jaipur",
    description:
      "You are received at Airport/Railway Station/Hotel and transferred to Hotel. By the evening we visit the modern attractions of the pink city, which includes the Statue Circle, Birla Auditorium & Planetarium, New Vidhan Sabha, Birla Mandir and Jawahar Kala Kendra. Overnight at Jaipur.",
  },
  {
    title: "Jaipur Sightseeing",
    description:
      "After breakfast we drive out to explore the well planned city of Sawai Jai Singh II still alive with culture. Visit City Palace, Hawa Mahal, Amber Fort and Jal Mahal. Overnight at Jaipur.",
  },
  {
    title: "Departure From Jaipur",
    description:
      "After breakfast you will be transferred to Airport / Railway station to connect your onwards journey. (The Tour Ends)",
  },
  {
    title: "Arrival At Udaipur",
    description:
      "On arrival at Udaipur you are received and transferred to hotel. Evening boat ride on Lake Pichola (subject to water level). Overnight at Udaipur.",
  },
  {
    title: "Udaipur Sightseeing",
    description:
      "After breakfast visit City Palace, Jagdish Temple, Saheliyon Ki Bari and Bagore Ki Haveli. Overnight at Udaipur.",
  },
  {
    title: "Departure From Udaipur",
    description:
      "After breakfast transfer to Airport / Railway station for onwards journey. (The Tour Ends)",
  },
  {
    title: "Arrival At Jodhpur",
    description:
      "On arrival at Jodhpur you are received and transferred to hotel. Evening free to explore the blue city markets. Overnight at Jodhpur.",
  },
  {
    title: "Jodhpur Sightseeing",
    description:
      "After breakfast proceed to Jodhpur. Upon arrival check in at hotel. Soon after we climb up the Majestic Mehrangarh Fort and visit Jaswant Thada. Overnight at Jodhpur.",
  },
  {
    title: "Departure From Jodhpur",
    description:
      "You will be transferred to Jodhpur Airport / Railway station to connect your onwards journey. (The Tour Ends)",
  },
  {
    title: "Arrival At Jaisalmer",
    description:
      "On arrival at Jaisalmer transfer to hotel. Evening visit to Gadisar Lake. Overnight at Jaisalmer.",
  },
  {
    title: "Jaisalmer Sightseeing With Desert Stay",
    description:
      "Visit Jaisalmer Fort, Patwon Ki Haveli and proceed to desert camp for camel ride, bonfire and cultural program. Overnight at desert camp / hotel.",
  },
  {
    title: "Departure From Jaisalmer",
    description:
      "After breakfast transfer to Airport / Railway station for onwards journey.",
  },
  {
    title: "Jodhpur - Mount Abu:",
    description:
      "After breakfast drive to Mount Abu. On arrival check in at hotel. Evening Nakki Lake. Overnight at Mount Abu.",
  },
  {
    title: "Jodhpur - Jaisalmer",
    description:
      "After breakfast drive to Jaisalmer. On arrival check in at hotel. Overnight at Jaisalmer.",
  },
  {
    title: "Udaipur - Jodhpur",
    description:
      "After breakfast drive to Jodhpur. On arrival check in at hotel. Overnight at Jodhpur.",
  },
  {
    title: "Jaipur - Jodhpur",
    description:
      "After breakfast drive to Jodhpur. On arrival check in at hotel. Overnight at Jodhpur.",
  },
];

function now() {
  return new Date().toISOString();
}

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `sug-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function seedList(): AiSuggestion[] {
  const t = now();
  return SEED.map((s) => ({
    ...s,
    id: uid(),
    created_at: t,
    updated_at: t,
    source: "seed" as const,
  }));
}

export function listAiSuggestions(): AiSuggestion[] {
  if (typeof window === "undefined") return seedList();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedList();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as AiSuggestion[];
    return Array.isArray(parsed) ? parsed : seedList();
  } catch {
    return seedList();
  }
}

function saveAll(list: AiSuggestion[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function searchAiSuggestions(query: string): AiSuggestion[] {
  const q = query.trim().toLowerCase();
  const all = listAiSuggestions();
  if (!q) return all.slice(0, 20);
  return all.filter(
    (s) =>
      s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q)
  );
}

export function createAiSuggestion(input: {
  title: string;
  description: string;
  source?: AiSuggestion["source"];
}): AiSuggestion {
  const list = listAiSuggestions();
  const t = now();
  const item: AiSuggestion = {
    id: uid(),
    title: input.title.trim(),
    description: input.description.trim(),
    created_at: t,
    updated_at: t,
    source: input.source ?? "manual",
  };
  list.unshift(item);
  saveAll(list);
  return item;
}

export function updateAiSuggestion(
  id: string,
  input: { title: string; description: string }
): AiSuggestion | null {
  const list = listAiSuggestions();
  const idx = list.findIndex((s) => s.id === id);
  if (idx < 0) return null;
  list[idx] = {
    ...list[idx],
    title: input.title.trim(),
    description: input.description.trim(),
    updated_at: now(),
  };
  saveAll(list);
  return list[idx];
}

export function deleteAiSuggestion(id: string): boolean {
  const list = listAiSuggestions();
  const next = list.filter((s) => s.id !== id);
  if (next.length === list.length) return false;
  saveAll(next);
  return true;
}

/** Learn from custom day title/description so suggestions stay fresh */
export function learnAiSuggestionFromDay(title: string, description: string) {
  const t = title.trim();
  const d = description.trim();
  if (!t || t.length < 3) return;
  const list = listAiSuggestions();
  const existing = list.find((s) => s.title.toLowerCase() === t.toLowerCase());
  if (existing) {
    if (d && d !== existing.description) {
      updateAiSuggestion(existing.id, { title: existing.title, description: d });
    }
    return;
  }
  createAiSuggestion({ title: t, description: d || t, source: "learned" });
}
