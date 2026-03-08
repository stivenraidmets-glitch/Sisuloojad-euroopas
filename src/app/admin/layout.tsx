// Admin panel: temporarily open (no auth) for testing.
// TODO: Re-enable auth by restoring session + ADMIN_EMAILS check.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
