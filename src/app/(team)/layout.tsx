/**
 * Team / sales / operations surface layout.
 * Itinerary builder remains under (dashboard) until Phase 1 migration.
 */
export default function TeamLayout({ children }: { children: React.ReactNode }) {
  return <div data-surface="team">{children}</div>;
}
