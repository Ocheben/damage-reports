import type { Metadata } from "next";
import { cookies, headers } from "next/headers";

import { MaintenanceBanner } from "@/components/Flagged/MaintenanceBanner";
import { AppSwitcherBar } from "@/components/layout/AppSwitcherBar";
import { ToastProvider } from "@/components/Ui/Toast";
import { env } from "@/lib/env";
import { FeatureFlagProvider } from "@/lib/flags/provider";
import { fetchFlagsServerSide } from "@/lib/flags/server";
import { readIdentity } from "@/lib/identity";
import {
  ANONYMOUS_IDENTITY,
  TOKEN_COOKIE_NAME,
  type Identity,
} from "@/lib/identity-shared";

import "./globals.css";

export const metadata: Metadata = {
  title: "Damage Reports",
  description:
    "Demo car damage reporting app driven by a custom feature flag service.",
};

// Per-user flags — never pre-render.
export const dynamic = "force-dynamic";

/**
 * Confirm the cookie maps to a live Sanctum session via /api/auth/me. Runs
 * once per fresh page load so a revoked token can't render the admin shell.
 */
async function verifyIdentity(): Promise<Identity | null> {
  const token = cookies().get(TOKEN_COOKIE_NAME)?.value;
  if (!token) return null;

  const { apiBaseInternal } = env();
  try {
    const res = await fetch(`${apiBaseInternal}/api/auth/me`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      user: { name: string; email: string; role: string; country: string };
    };
    return {
      userKey: body.user.email,
      role: body.user.role,
      country: body.user.country,
      name: body.user.name,
    };
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // x-pathname is set by middleware.ts; login renders without the auth shell.
  const pathname = headers().get("x-pathname") ?? "";
  const isAuthShellRoute = pathname.startsWith("/login");

  if (isAuthShellRoute) {
    return (
      <html lang="en">
        <body className="min-h-screen">
          <ToastProvider>{children}</ToastProvider>
        </body>
      </html>
    );
  }

  const verified = await verifyIdentity();
  const identity: Identity = verified ?? readIdentity() ?? ANONYMOUS_IDENTITY;
  const initialFlags = await fetchFlagsServerSide();

  return (
    <html lang="en">
      <body className="min-h-screen">
        <ToastProvider>
          <FeatureFlagProvider initialFlags={initialFlags}>
            <MaintenanceBanner />
            <AppSwitcherBar identity={identity} />
            {children}
          </FeatureFlagProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
