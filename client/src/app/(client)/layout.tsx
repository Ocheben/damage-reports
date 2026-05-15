import { SiteHeader } from "@/components/layout/SiteHeader";
import { readAdminIdentity, readIdentity } from "@/lib/identity";

export const dynamic = "force-dynamic";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const identity = readIdentity();
  const adminIdentity = readAdminIdentity();
  return (
    <>
      <SiteHeader identity={identity} adminIdentity={adminIdentity} />
      <main className="mx-auto max-w-[1700px] px-8 py-8">{children}</main>
    </>
  );
}
