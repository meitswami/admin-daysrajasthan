import { extractQueryTokens, parseDurationDaysFromQuery } from "@/modules/search";

const STARTER_TIPS = [
  "Want to explore for 5 Days in Rajasthan",
  "Show 3 Days Jaipur packages",
  "Jaipur & Pushkar tour options",
  "Best desert safari packages",
];

/**
 * Ready-made follow-up tips from the latest user query (+ optional package context).
 */
export function buildChatSuggestionTips(input: {
  lastUserText: string | null;
  packageTitles?: string[];
}): string[] {
  const tips: string[] = [];
  const seen = new Set<string>();
  const push = (tip: string) => {
    const t = tip.trim();
    if (!t || seen.has(t.toLowerCase())) return;
    seen.add(t.toLowerCase());
    tips.push(t);
  };

  const last = input.lastUserText?.trim() ?? "";
  if (!last) {
    for (const s of STARTER_TIPS) push(s);
    return tips.slice(0, 4);
  }

  const tokens = extractQueryTokens(last);
  const duration = parseDurationDaysFromQuery(last);
  const places = tokens.places;
  const days = duration.min;

  if (places.length >= 2) {
    const label = places.map(titleCase).join(" & ");
    if (days != null) {
      push(`Show ${days + 1} Days ${label} packages`);
      push(`Any ${Math.max(1, days - 1)}–${days + 1} day ${label} tours?`);
    } else {
      push(`Best packages for ${label}`);
    }
    push(`Compare packages for ${label}`);
  } else if (places.length === 1) {
    const city = titleCase(places[0]!);
    if (days != null) {
      push(`Add Pushkar to a ${days} Days ${city} trip`);
      push(`Show ${days + 2} Days ${city} packages`);
    } else {
      push(`${city} packages for 3 Days`);
      push(`${city} packages for 5 Days`);
    }
    push(`Best time to visit ${city}`);
  } else if (days != null) {
    push(`Want to explore for ${days} Days in Jaipur & Udaipur`);
    push(`Show ${days} Days desert safari packages`);
    push(`Family-friendly ${days} Days Rajasthan tours`);
  } else {
    push("Want to explore for 5 Days in Rajasthan");
    push("Show Jaipur & Pushkar packages");
  }

  const firstPkg = input.packageTitles?.[0];
  if (firstPkg) {
    const short = firstPkg.replace(/\s+Tour Package$/i, "").trim();
    if (short.length > 8 && short.length < 70) {
      push(`Tell me more about ${short}`);
    }
    push("Which of these is best for a family?");
  }

  push("Can I get a quote for this trip?");
  push("What is included in these packages?");

  return tips.slice(0, 4);
}

function titleCase(value: string): string {
  if (value === "abu") return "Abu";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
