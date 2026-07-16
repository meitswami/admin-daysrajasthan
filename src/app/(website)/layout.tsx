/**
 * Public marketing surface layout.
 * Branding tokens land in Phase 1 (design-system); existing demo data path unchanged.
 */
export default function WebsiteLayout({ children }: { children: React.ReactNode }) {
  return <div data-surface="website">{children}</div>;
}
