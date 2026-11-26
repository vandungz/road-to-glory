"use client";

import { useState, useTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { ArrowRightLeft, RotateCcw, Trash2 } from "lucide-react";
import type { MovePlayerSummary } from "@/types/squad";
import { PlayerMoveComparison } from "./PlayerMoveComparison";
import { Button } from "@/components/ui/Button";
import { FilterSelect } from "@/components/ui/FilterSelect";
import { ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { ConfirmDialogContent } from "@/components/ui/ConfirmDialog";
import { getPlayerMoveDestinationsAction, manageSquadPlayerAction, moveSquadPlayerAction, type MoveDestination } from "@/actions/squad.actions";

export function PlayerManagement({ gameId, player, moveUsed, preview = false, onClose, onDone, onBusyChange, onMoveView }: {
  gameId: string; player: MovePlayerSummary; moveUsed: boolean; preview?: boolean; onClose: () => void; onDone: () => void; onBusyChange: (busy: boolean) => void; onMoveView: (moving: boolean) => void;
}) {
  const { id: playerId, name: playerName } = player;
  const t = useTranslations("squadManagement"); const ui = useTranslations("ui"); const router = useRouter();
  const [mode, setMode] = useState<"options" | "replace" | "delete" | "move">("options");
  const [pending, start] = useTransition(); const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const requestVersion = useRef(0);
  useEffect(() => () => { requestVersion.current++; }, []);
  const [destinations, setDestinations] = useState<MoveDestination[]>([]); const [selected, setSelected] = useState("");
  const [replacementConfirmation, setReplacementConfirmation] = useState("");
  const [selectedTarget, selectedIndex] = selected.split(":");
  const occupant = destinations.find((squad) => squad.id === selectedTarget)?.slots.find((slot) => slot.index === Number(selectedIndex))?.occupant;
  useEffect(() => { onBusyChange(pending); return () => onBusyChange(false); }, [pending, onBusyChange]);
  async function loadDestinations() {
    if (pending || loading) return;
    const version = ++requestVersion.current;
    setMode("move"); onMoveView(true); setError(null); setSelected(""); setReplacementConfirmation(""); setDestinations([]); setLoading(true);
    try {
      if (preview) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        if (version === requestVersion.current) setDestinations([
          { id: "preview-destination", name: "Đội hình thử nghiệm", formation: "4-4-2", slots: [{ index: 1, position: player.position }] },
          { id: "preview-occupied", name: "Đội hình khác", formation: "4-4-2", slots: [{ index: 1, position: player.position, occupant: { id: "44444444-4444-4444-8444-444444444444", name: "Cầu thủ B", peakOvr: 88, position: player.position, nationality: "France", portraitId: "p02", updatedAt: "2026-11-26T00:00:00.000Z" } }] },
        ]);
        return;
      }
      const result = await getPlayerMoveDestinationsAction({ gameId, playerId });
      if (version !== requestVersion.current) return;
      if (!result.success) setError(result.error); else setDestinations(result.destinations);
    } catch { if (version === requestVersion.current) setError(t("failed")); }
    finally { if (version === requestVersion.current) setLoading(false); }
  }
  function submit() {
    if (pending || (mode === "move" && (!selected || (occupant && replacementConfirmation !== "DELETE")))) return; setError(null);
    start(async () => {
      try {
        if (preview) { await new Promise((resolve) => setTimeout(resolve, 400)); setError(t("preview")); return; }
        if (mode === "move") {
          const [targetId, slot] = selected.split(":");
          const result = await moveSquadPlayerAction({ gameId, playerId, targetId, slotIndex: Number(slot), replacement: occupant ? { id: occupant.id, updatedAt: occupant.updatedAt, confirmation: "DELETE" } : null });
          if (!result.success) { setError(result.error); return; }
          onDone(); router.refresh();
        } else if (mode === "delete" || mode === "replace") {
          const result = await manageSquadPlayerAction({ gameId, playerId, mode });
          if (!result.success) { setError(result.error); return; }
          onDone(); if (mode === "replace") router.push(`/classic/${gameId}/draft/${result.slotIndex}`); else router.refresh();
        }
      } catch { setError(t("failed")); }
    });
  }
  const back = () => { if (!pending) { requestVersion.current++; setLoading(false); setMode("options"); onMoveView(false); setError(null); } };
  if (mode === "replace" || mode === "delete") return <ConfirmDialogContent title={ui(mode === "replace" ? "replacePlayer" : "removeFromSquad")} description={ui(mode === "replace" ? "replacePlayerConfirmation" : "removePlayerConfirmation", { name: playerName })} confirmLabel={ui(mode === "replace" ? "replacePlayer" : "removeFromSquad")} pending={pending} error={error} onCancel={back} onConfirm={submit} />;
  return <>
    <ModalHeader onClose={pending ? undefined : onClose}>{t(mode === "move" ? "movePlayer" : "managePlayer")}</ModalHeader>
    <ModalBody>
      {mode === "options" ? <div className="football-player-options">
        <p>{playerName}</p>
        <button onClick={loadDestinations} disabled={moveUsed}><ArrowRightLeft size={18} aria-hidden="true" /><span><strong>{t("movePlayer")}</strong><small>{t(moveUsed ? "moveUsed" : "moveRule")}</small></span></button>
        <button onClick={() => setMode("replace")}><RotateCcw size={18} aria-hidden="true" /><span><strong>{ui("replacePlayer")}</strong><small>{t("replaceHint")}</small></span></button>
        <button className="is-danger" onClick={() => setMode("delete")}><Trash2 size={18} aria-hidden="true" /><span><strong>{ui("removeFromSquad")}</strong><small>{t("removeHint")}</small></span></button>
      </div> : <div className="football-player-move-form">

        <FilterSelect label={t("destination")} value={selected} onChange={(value) => { setSelected(value); setReplacementConfirmation(""); setError(null); }} disabled={pending || loading || !destinations.length} options={destinations.flatMap((squad) => squad.slots.map((slot) => ({ value: `${squad.id}:${slot.index}`, label: `${squad.name} — ${slot.position} (${slot.index + 1})`, description: slot.occupant ? t("replaceOption", { name: slot.occupant.name }) : t("emptySlot") })))} />
        {loading && <p role="status" className="football-player-move-note">{t("loading")}</p>}
        {!loading && !destinations.length && !error && <p role="status">{t("noDestination")}</p>}
        <PlayerMoveComparison incoming={player} outgoing={occupant} selected={!!selected} destination={destinations.find((squad) => squad.id === selectedTarget)?.name} loading={loading} />
        <p className="football-player-move-note">{t("moveRuleShort")}</p>
        {occupant && <div className="football-player-replacement">
          <p>{t("replacementWarning", { name: occupant.name })}</p>
          <label className="football-field"><span>{t("replacementConfirmation", { name: occupant.name })}</span><input className="football-input" value={replacementConfirmation} onChange={(event) => setReplacementConfirmation(event.target.value)} disabled={pending} autoComplete="off" spellCheck={false} /></label>
        </div>}
        {error && <p role="alert" className="football-confirm-dialog__error">{error}</p>}
      </div>}
    </ModalBody>
    {mode === "move" && <ModalFooter><Button variant="outline" disabled={pending} onClick={back}>{t("back")}</Button><Button loading={pending && !!selected} disabled={!selected || pending || (!!occupant && replacementConfirmation !== "DELETE")} onClick={submit}>{t(occupant ? "confirmReplacement" : "confirmMove")}</Button></ModalFooter>}
  </>;
}
