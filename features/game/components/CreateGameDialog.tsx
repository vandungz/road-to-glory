"use client";

import { useTranslations } from "next-intl";
import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createGameSession } from "@/features/game/actions/createGameSession";
import { FORMATIONS, type Formation } from "@/types/game";
import { Button } from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";

const FORMATION_INFO: Record<Formation, { label: string; desc: string }> = {
  "4-3-3": { label: "4-3-3", desc: "formation433" },
  "4-4-2": { label: "4-4-2", desc: "formation442" },
  "3-5-2": { label: "3-5-2", desc: "formation352" },
};

export function CreateGameDialog() {
  const ui = useTranslations("ui");
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState<Formation>("4-3-3");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  function openDialog() {
    setErrorMsg(null);
    setIsOpen(true);
  }

  function closeDialog() {
    if (isPending) return;
    setIsOpen(false);
    setErrorMsg(null);
    formRef.current?.reset();
    setSelectedFormation("4-3-3");
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg(null);

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createGameSession(formData);
      if (result && !result.success) setErrorMsg(result.error);
    });
  }

  return (
    <>
      <Button id="btn-new-squad" type="button" onClick={openDialog}>
        <Plus aria-hidden="true" size={16} />
        {ui("createSquad")}
      </Button>

      <Modal
        open={isOpen}
        title={ui("createASquad")}
        onClose={closeDialog}
        size="sm"
        closeOnBackdrop={!isPending}
      >
        <ModalHeader onClose={closeDialog} closeLabel={ui("closeSquadCreation")}>
          {ui("createASquad")}
        </ModalHeader>

        <form ref={formRef} onSubmit={handleSubmit}>
          <ModalBody>
            <div className="football-form-stack">
              <label className="football-field">
                <span className="football-field__label">{ui("squadName")}</span>
                <input
                  id="squad-name"
                  name="name"
                  type="text"
                  placeholder={ui("yourSquadName")}
                  maxLength={50}
                  required
                  disabled={isPending}
                  className="input-retro"
                  autoComplete="off"
                />
              </label>

              <fieldset className="football-field">
                <legend className="football-field__label">{ui("formation")}</legend>
                <div className="football-formation-list">
                  {FORMATIONS.map((formation) => {
                    const isSelected = selectedFormation === formation;
                    return (
                      <label
                        key={formation}
                        className={`football-formation-option ${isSelected ? "is-selected" : ""}`}
                      >
                        <input
                          type="radio"
                          name="formation-choice"
                          value={formation}
                          checked={isSelected}
                          onChange={() => setSelectedFormation(formation)}
                          disabled={isPending}
                        />
                        <span>
                          <strong>{FORMATION_INFO[formation].label}</strong>
                          <small>{ui(FORMATION_INFO[formation].desc)}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
                <input type="hidden" name="formation" value={selectedFormation} />
              </fieldset>

              {errorMsg && <p className="football-form-error">{errorMsg}</p>}
            </div>
          </ModalBody>

          <ModalFooter>
            <Button type="button" variant="quiet" onClick={closeDialog} disabled={isPending}>
              {ui("cancel")}
            </Button>
            <Button id="btn-submit-squad" type="submit" loading={isPending}>
              {ui("createSquad")}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
