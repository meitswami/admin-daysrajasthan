/**
 * Customer portal surface layout.
 * Proposal flows remain at /proposal until Phase 1 migration into this group.
 */
export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return <div data-surface="customer">{children}</div>;
}
