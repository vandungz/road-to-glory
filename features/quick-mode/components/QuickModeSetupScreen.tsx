"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { getFlagEmoji } from "@/types/squad";
import { NATIONALITY_POOL } from "@/lib/wheel-engine/weight-pools";
import { useQuickMode } from "../hooks/useQuickMode";
import { QUICK_POSITIONS, type QuickClubOption, type QuickLeagueOption, type QuickPosition } from "../types";

interface Props {
  leagues: QuickLeagueOption[];
  clubs: QuickClubOption[];
  isAuthenticated: boolean;
}

export function QuickModeSetupScreen({ leagues, clubs }: Props) {
  const router = useRouter();
  const quick = useQuickMode({ leagues, clubs });
  const [name, setName] = useState("");
  const [nationality, setNationality] = useState("England");
  const [position, setPosition] = useState<QuickPosition>("ST");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!quick.hydrated || name) return;
    setName(quick.state.player.name);
    setNationality(quick.state.player.nationality || "England");
    setPosition(quick.state.player.position);
  }, [name, quick.hydrated, quick.state.player.nationality, quick.state.player.name, quick.state.player.position]);

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
    <section className="football-quick-mode" data-anim>
      <header className="football-quick-mode__intro">
        <div>
          <span className="football-quick-mode__eyebrow">Tạo cầu thủ nhanh</span>
          <h1>Quick Mode</h1>
          <p>Chọn ba thông tin cơ bản. Phần còn lại để wheel viết tiếp câu chuyện.</p>
        </div>
      </header>

      <div className="football-quick-setup">
        <div className="football-quick-setup__card">
          <span className="football-quick-setup__eyebrow">Bắt đầu hành trình</span>
          <h2>Cầu thủ của bạn</h2>
          <p className="football-quick-setup__copy">Tên, quốc gia và vị trí là những lựa chọn duy nhất bạn cần quyết định.</p>
          <div className="football-quick-setup__form">
            <label>
              <span>Tên cầu thủ</span>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: Minh Nguyễn" maxLength={40} autoFocus />
            </label>
            <label htmlFor="quick-nationality">
              <span>Quốc gia</span>
              <select id="quick-nationality" value={nationality} onChange={(event) => setNationality(event.target.value)}>
                {nationalityOptions.map((country) => <option key={country} value={country}>{getFlagEmoji(country)} {country}</option>)}
              </select>
            </label>
            <label>
              <span>Vị trí</span>
              <select value={position} onChange={(event) => setPosition(event.target.value as QuickPosition)}>
                {QUICK_POSITIONS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
          </div>
          <div className="football-quick-setup__footer">
            <span>Không cần đăng nhập để chơi.</span>
            <Button size="lg" onClick={begin} disabled={!canStart || starting} loading={starting}>
              {hasExistingRun && quick.state.phase !== "complete" ? "Tiếp tục hành trình" : "Bắt đầu hành trình"}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
