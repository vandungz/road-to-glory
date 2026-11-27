"use client";

import { PageGuide } from "@/features/onboarding/GuideProvider";
import { useTranslations } from "next-intl";
import { EditorialArt } from "@/components/shared/EditorialArt";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { NATIONALITY_CHOICES as NATIONALITY_POOL } from "@/lib/football-nations";
import { PlayerPortrait } from "@/features/player/components/PlayerPortrait";
import { useQuickMode } from "../hooks/useQuickMode";
import { QUICK_POSITIONS, type QuickPosition } from "../types";

export function QuickModeSetupScreen() {
  const ui = useTranslations("ui");
  const router = useRouter();
  const quick = useQuickMode();
  const [name, setName] = useState("");
  const [nationality, setNationality] = useState("England");
  const [position, setPosition] = useState<QuickPosition>("ST");
  const [starting, setStarting] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!quick.hydrated || initialized.current) return;
    initialized.current = true;
    setName((current) => current || quick.state.player.name);
    setNationality(quick.state.player.nationality || "England");
    setPosition(quick.state.player.position);
  }, [quick.hydrated, quick.state.player.nationality, quick.state.player.name, quick.state.player.position]);

  useEffect(() => {
    if (starting && quick.hydrated && name.trim().length >= 2) router.push("/quick/play");
  }, [name, quick.hydrated, router, starting]);

  const canStart = quick.hydrated && name.trim().length >= 2;
  const hasExistingRun = quick.state.phase !== "setup" || quick.state.setupStep > 0;
  const nationalityOptions = Array.from(new Set([nationality, ...NATIONALITY_POOL.map((item) => item.value)]));

  function begin() {
    if (!canStart) return;
    if (quick.state.phase === "complete") quick.reset();
    quick.setIdentity({ name: name.trim(), nationality: nationality.trim() || "England", position });
    setStarting(true);
  }

  return (
    <section className="football-quick-mode">
      <PageGuide id="quickSetup" paused={!quick.hydrated} />
      <header className="football-quick-mode__intro">
        <div>
          <h1>Quick Mode</h1>
          <p>{ui("createAPlayerAndSpinToSimulateACareer")}</p>
        </div>
      </header>

      <div className="football-quick-setup">
        <EditorialArt asset="air-control" className="football-editorial-art--setup" />
        <div className="football-quick-setup__card">
          <div className="football-quick-setup__identity" data-nation={nationality.replace(/\s+/g, "")}>
            {quick.state.phase !== "complete" && <PlayerPortrait portraitId={quick.state.player.portraitId} animate={false} />}
            <h2>{ui("yourPlayer")}</h2>
          </div>
          <div className="football-quick-setup__form" data-guide="quick-fields">
            <label>
              <span>{ui("playerName")}</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder={ui("egSamTaylor")} maxLength={40} autoFocus />
            </label>
            <div className="football-quick-field">
              <span>{ui("country")}</span>
              <FilterSelect label={ui("country")} value={nationality} onChange={setNationality} searchable options={nationalityOptions.map((country) => ({ value: country, label: country }))} />
            </div>
            <div className="football-quick-field">
              <span>{ui("position")}</span>
              <FilterSelect label={ui("position")} value={position} onChange={(value) => setPosition(value as QuickPosition)} options={QUICK_POSITIONS.map((item) => ({ value: item, label: item }))} />
            </div>
          </div>
          <div className="football-quick-setup__footer" data-guide="quick-start">
            <span>{ui("playWithoutAnAccount")}</span>
            <Button size="lg" onClick={begin} disabled={!canStart || starting} loading={starting}>
              {hasExistingRun && quick.state.phase !== "complete" ? ui("continue") : ui("startCareer")}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
