"use client";

import { useRef, useState, useTransition } from "react";
import { Plus } from "lucide-react";
import { createGameSession } from "@/features/game/actions/createGameSession";
import { FORMATIONS, type Formation } from "@/types/game";
import { Button } from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";

const FORMATION_INFO: Record<Formation, { label: string; desc: string }> = {
  "4-3-3": { label: "4-3-3", desc: "Tấn công mạnh, cánh rộng" },
  "4-4-2": { label: "4-4-2", desc: "Cân bằng cổ điển" },
  "3-5-2": { label: "3-5-2", desc: "Kiểm soát tuyến giữa" },
};

export function CreateGameDialog() {
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
        Tạo đội hình
      </Button>

      <Modal
        open={isOpen}
        title="Tạo đội hình mới"
        onClose={closeDialog}
        size="sm"
        closeOnBackdrop={!isPending}
      >
        <ModalHeader onClose={closeDialog} closeLabel="Đóng cửa sổ tạo đội hình">
          Tạo đội hình mới
        </ModalHeader>

        <form ref={formRef} onSubmit={handleSubmit}>
          <ModalBody>
            <div className="football-form-stack">
              <label className="football-field">
                <span className="football-field__label">Tên đội hình</span>
                <input
                  id="squad-name"
                  name="name"
                  type="text"
                  placeholder="Ví dụ: Những chiến binh"
                  maxLength={50}
                  required
                  disabled={isPending}
                  className="input-retro"
                  autoComplete="off"
                />
              </label>

              <fieldset className="football-field">
                <legend className="football-field__label">Sơ đồ chiến thuật</legend>
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
                          <small>{FORMATION_INFO[formation].desc}</small>
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
              Huỷ
            </Button>
            <Button id="btn-submit-squad" type="submit" loading={isPending}>
              {isPending ? "Đang tạo" : "Tạo đội hình"}
            </Button>
          </ModalFooter>
        </form>
      </Modal>
    </>
  );
}
