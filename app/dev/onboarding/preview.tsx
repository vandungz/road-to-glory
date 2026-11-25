"use client";

import { useState } from "react";
import { AppShell } from "@/components/shared/AppShell";
import { PageGuide } from "@/features/onboarding/GuideProvider";
import { LanguageSettings } from "@/features/settings/components/LanguageSettings";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { PveTournamentScreen } from "@/features/pve/components/PveTournamentScreen";
import { DisplayNameForm } from "@/features/auth/components/DisplayNameForm";

export function OnboardingPreview({ view }: { view?: string }) {
  const [busy, setBusy] = useState(true);
  const [showTarget, setShowTarget] = useState(false);
  const [modal, setModal] = useState(false);
  if (view === "ballonResult") return <AppShell guide="ballonResult">
    <section className="football-account"><h1>Isolated award result fixture</h1>
      <article data-guide="ballon-ranking"><h2>Top 10 fixture</h2><p>This page loads no career data.</p></article>
      <Button data-guide="ballon-return">Continue fixture</Button>
    </section>
  </AppShell>;
  if (view === "tournament") return <AppShell><PveTournamentScreen gameId="onboarding-fixture" sessionName="Isolated fixture"
    formation="4-3-3" squadRating={80} userPlayers={[]} initialState={null} /></AppShell>;
  if (view === "profile") return <AppShell guide="profile" className="football-account-shell">
    <section className="football-account"><h1>Isolated profile fixture</h1>
      <div className="football-account-sheet football-account-profile">
        <section data-guide="account-profile"><h2>Account</h2><DisplayNameForm initialName="Fixture" /></section>
        <section data-guide="account-squads"><h2>Classic</h2><p>No account data is loaded.</p></section>
      </div>
    </section>
  </AppShell>;
  return <AppShell className="football-account-shell">
    <PageGuide id="settings" paused={busy} />
    <section className="football-account">
      <h1>Isolated onboarding fixture</h1>
      <div>
        <Button onClick={() => setBusy((value) => !value)}>Toggle busy</Button>
        <Button onClick={() => setShowTarget((value) => !value)}>Toggle target</Button>
        <Button onClick={() => setModal(true)}>Open fixture dialog</Button>
      </div>
      <div className="football-account-sheet football-settings-sheet">
        <div data-guide="settings-content"><LanguageSettings /></div>
        {showTarget && <div data-guide="settings-navigation">Settings navigation fixture</div>}
      </div>
    </section>
    <ConfirmDialog open={modal} title="Fixture dialog" description="No game data is changed."
      confirmLabel="Close fixture" onConfirm={() => setModal(false)} onCancel={() => setModal(false)} />
  </AppShell>;
}
