/**
 * Admin CMS / configuration surface layout.
 * Existing operational UI lives under (dashboard) until Phase 1 route migration.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div data-surface="admin">{children}</div>;
}
