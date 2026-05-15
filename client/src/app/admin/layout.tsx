import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { adminFetch, type AdminStats } from "@/lib/admin-api";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Stats failure should not break the shell — components handle null.
  let stats: AdminStats | null = null;
  try {
    stats = await adminFetch<AdminStats>("/api/admin/stats");
  } catch (err) {
    console.error("Admin stats fetch failed", err);
  }

  return (
    <div className="flex min-h-[calc(100vh-48px)]">
      <aside className="w-60 flex-shrink-0">
        <AdminSidebar stats={stats} />
      </aside>
      <div className="min-w-0 flex-1 px-8 py-8">{children}</div>
    </div>
  );
}
