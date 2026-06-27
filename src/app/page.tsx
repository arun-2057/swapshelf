"use client";

import { useEffect } from "react";
import { useApp } from "@/store/app-store";
import { LandingView } from "@/components/views/landing-view";
import { AuthView } from "@/components/views/auth-view";
import { OnboardingView } from "@/components/views/onboarding-view";
import { AppShell } from "@/components/shared/app-shell";
import { DashboardView } from "@/components/views/dashboard-view";
import { DiscoverView } from "@/components/views/discover-view";
import { LoanView } from "@/components/views/loan-view";
import { ProfileView } from "@/components/views/profile-view";
import { AdminDashboard } from "@/components/views/admin-dashboard";
import { AddItemDialog } from "@/components/views/add-item-dialog";
import { Logo } from "@/components/shared/logo";

export default function Home() {
  const { view, user, authLoading, bootstrap } = useApp();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  // Splash while we check the session
  if (authLoading) {
    return <Splash />;
  }

  // Public routes
  if (view === "landing") return <LandingView />;
  if (view === "login") return <AuthView mode="login" />;
  if (view === "signup") return <AuthView mode="signup" />;
  if (view === "onboarding") return <OnboardingView />;

  // Authenticated routes — wrapped in the app shell
  if (!user) {
    // safety net: if no user but we're past auth, fall back to landing
    return <LandingView />;
  }

  return (
    <AppShell>
      {view === "dashboard" && <DashboardView />}
      {view === "discover" && <DiscoverView />}
      {view === "loan" && <LoanView />}
      {view === "profile" && <ProfileView />}
      {view === "admin" && <AdminDashboard />}
      <AddItemDialog />
    </AppShell>
  );
}

function Splash() {
  return (
    <div className="grid min-h-screen place-items-center bg-background paper-texture">
      <div className="flex flex-col items-center gap-4">
        <Logo size="lg" />
        <div className="flex gap-1.5">
          <span className="size-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <span className="size-2 animate-bounce rounded-full bg-accent [animation-delay:-0.15s]" />
          <span className="size-2 animate-bounce rounded-full bg-secondary-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Warming up the shelves…</p>
      </div>
    </div>
  );
}
