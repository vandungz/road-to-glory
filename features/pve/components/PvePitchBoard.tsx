"use client";

import { useState } from "react";
import { TabsContent, TabsList, TabsTrigger } from "@/components/ui/Tabs";
import { ReadonlyPitchBoard } from "@/features/squad/components/PitchBoard";
import { PVE_FORMATION_SLOTS, type PveOpponentTeam, type PveUserLineupPlayer } from "@/types/pve";
import type { Formation } from "@/types/game";

export function PvePitchBoard({ formation, userPlayers, opponent }: { formation: Formation; userPlayers: PveUserLineupPlayer[]; opponent: PveOpponentTeam }) {
  const [activeTeam, setActiveTeam] = useState<"user" | "opponent">("user");
  const opponentPlayers = opponent.players.map((player, slotIndex) => ({ slotIndex, name: player.name, position: player.position, overall: player.overall }));
  return <div className="football-pve-pitch" aria-label="Đội hình trận đấu">
    <TabsList className="football-pve-pitch__tabs">
      <TabsTrigger value="user" active={activeTeam === "user"} onSelect={() => setActiveTeam("user")}>Đội bạn</TabsTrigger>
      <TabsTrigger value="opponent" active={activeTeam === "opponent"} onSelect={() => setActiveTeam("opponent")}>{opponent.name}</TabsTrigger>
    </TabsList>
    <TabsContent active={activeTeam === "user"} className="football-pve-pitch__panel"><span className="football-pve-pitch__label">Đội bạn · {formation}</span><ReadonlyPitchBoard formation={formation} players={userPlayers} ariaLabel="Đội hình đội bạn" className="football-pve-pitch__field" /></TabsContent>
    <TabsContent active={activeTeam === "opponent"} className="football-pve-pitch__panel"><span className="football-pve-pitch__label">{opponent.name} · {opponent.formation}</span><ReadonlyPitchBoard formation="4-3-3" slots={PVE_FORMATION_SLOTS[opponent.formation]} players={opponentPlayers} ariaLabel={`Đội hình ${opponent.name}`} className="football-pve-pitch__field" /></TabsContent>
  </div>;
}
