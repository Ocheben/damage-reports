import { redirect } from "next/navigation";

import { readIdentity } from "@/lib/identity";

import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string };
}) {
  // Cookie-only check; /api/auth/me verifies on the next page load.
  const identity = readIdentity();
  if (identity.userKey) {
    redirect(searchParams.next ?? "/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <header className="text-center">
          <h1 className="text-2xl font-semibold text-slate-900">
            Sign in to Damage Reports
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pick a demo persona below — credentials are pre-loaded for one-click sign-in.
          </p>
        </header>

        <LoginForm next={searchParams.next ?? "/"} />
      </div>
    </main>
  );
}
