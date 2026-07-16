/**
 * Auth surface layout (login, MFA, password recovery).
 * Wraps existing routes under this group without changing auth behavior.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div data-surface="auth">{children}</div>;
}
