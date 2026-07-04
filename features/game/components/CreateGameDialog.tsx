"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { X, Plus, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createGameSession } from "@/features/game/actions/createGameSession";
import { FORMATIONS, type Formation } from "@/types/game";

// ============================================================
// FORMATION DESCRIPTIONS
// ============================================================

const FORMATION_INFO: Record<Formation, { label: string; desc: string }> = {
  "4-3-3": { label: "4-3-3", desc: "Tấn công mạnh, wing rộng" },
  "4-4-2": { label: "4-4-2", desc: "Cân bằng cổ điển" },
  "3-5-2": { label: "3-5-2", desc: "Kiểm soát tuyến giữa" },
};

// ============================================================
// COMPONENT
// ============================================================

export function CreateGameDialog() {
  const [isMounted, setIsMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFormation, setSelectedFormation] = useState<Formation>("4-3-3");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Defer AnimatePresence render đến sau hydration để tránh
  // Framer Motion 12 + React 19 hidden={true} vs hidden={null} mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  function openDialog() {
    setErrorMsg(null);
    setIsOpen(true);
  }

  function closeDialog() {
    if (isPending) return;
    setIsOpen(false);
    setErrorMsg(null);
    formRef.current?.reset();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createGameSession(formData);
      // If result returns (no redirect), it means an error occurred
      if (result && !result.success) {
        setErrorMsg(result.error);
      }
      // On success, redirect() in server action handles navigation
    });
  }

  return (
    <>
      {/* ── TRIGGER BUTTON ── */}
      <button
        id="btn-new-squad"
        type="button"
        onClick={openDialog}
        className="btn-primary"
      >
        <Plus size={16} strokeWidth={2.5} />
        New Squad
      </button>

      {/* ── MODAL ── */}
      {isMounted && <AnimatePresence>
        {isOpen && (
          <motion.div
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) closeDialog();
            }}
          >
            <motion.div
              className="modal-panel"
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
            >
              {/* ── HEADER ── */}
              <div className="flex items-center justify-between px-6 py-4 border-b-2 border-charcoal">
                <div>
                  <p
                    className="font-stamp text-xs tracking-widest text-ink-gray uppercase"
                    style={{ fontFamily: "var(--font-stamp)" }}
                  >
                    Football Life
                  </p>
                  <h2
                    className="font-headline text-xl font-bold leading-tight"
                    style={{ fontFamily: "var(--font-headline)", letterSpacing: "0.05em", textTransform: "uppercase" }}
                  >
                    Create New Squad
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeDialog}
                  disabled={isPending}
                  aria-label="Đóng dialog"
                  className="p-1.5 rounded border-2 border-charcoal bg-cream-dark hover:bg-cream-border transition-colors disabled:opacity-50"
                  style={{ borderColor: "var(--charcoal)", backgroundColor: "var(--cream-dark)" }}
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>

              {/* ── FORM BODY ── */}
              <form ref={formRef} onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-5">
                {/* Squad Name */}
                <div className="flex flex-col gap-2">
                  <label
                    htmlFor="squad-name"
                    className="font-headline text-xs font-semibold tracking-widest uppercase"
                    style={{ fontFamily: "var(--font-headline)" }}
                  >
                    Squad Name
                  </label>
                  <input
                    id="squad-name"
                    name="name"
                    type="text"
                    placeholder="Vd: Los Galácticos, The Invincibles..."
                    maxLength={50}
                    required
                    disabled={isPending}
                    className="input-retro disabled:opacity-60 disabled:cursor-not-allowed"
                    autoComplete="off"
                  />
                </div>

                {/* Formation */}
                <div className="flex flex-col gap-2">
                  <label
                    className="font-headline text-xs font-semibold tracking-widest uppercase"
                    style={{ fontFamily: "var(--font-headline)" }}
                  >
                    Default Formation
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    {FORMATIONS.map((f) => (
                      <button
                        key={f}
                        type="button"
                        disabled={isPending}
                        onClick={() => setSelectedFormation(f)}
                        className={[
                          "flex flex-col items-center gap-1 py-3 px-2 border-2 rounded transition-all duration-75 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed",
                          selectedFormation === f
                            ? "border-charcoal bg-charcoal text-white"
                            : "border-charcoal bg-white text-charcoal hover:bg-cream-dark",
                        ].join(" ")}
                        style={{
                          borderColor: "var(--charcoal)",
                          backgroundColor: selectedFormation === f ? "var(--charcoal)" : undefined,
                          color: selectedFormation === f ? "var(--white)" : "var(--charcoal)",
                        }}
                      >
                        <span
                          className="font-headline text-base font-bold"
                          style={{ fontFamily: "var(--font-headline)", letterSpacing: "0.04em" }}
                        >
                          {FORMATION_INFO[f].label}
                        </span>
                        <span
                          className="font-stamp text-center leading-tight"
                          style={{
                            fontFamily: "var(--font-stamp)",
                            fontSize: "0.6rem",
                            opacity: 0.75,
                          }}
                        >
                          {FORMATION_INFO[f].desc}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Hidden input for formation value */}
                  <input type="hidden" name="formation" value={selectedFormation} />
                </div>

                {/* Error Message */}
                {isMounted && <AnimatePresence>
                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <p
                        className="font-stamp text-sm px-3 py-2 border-2 border-coral-hover rounded"
                        style={{
                          fontFamily: "var(--font-stamp)",
                          color: "var(--coral-hover)",
                          borderColor: "var(--coral-hover)",
                          backgroundColor: "rgba(255,90,67,0.06)",
                        }}
                      >
                        ⚠ {errorMsg}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>}

                {/* ── ACTIONS ── */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={closeDialog}
                    disabled={isPending}
                    className="btn-secondary flex-1"
                  >
                    Cancel
                  </button>
                  <button
                    id="btn-submit-squad"
                    type="submit"
                    disabled={isPending}
                    className="btn-primary flex-1"
                  >
                    {isPending ? (
                      <>
                        <Loader2 size={14} className="animate-spin" />
                        Creating...
                      </>
                    ) : (
                      "Create Squad →"
                    )}
                  </button>
                </div>
              </form>

              {/* ── FOOTER STAMP ── */}
              <div
                className="px-6 pb-4 pt-1 text-center"
                style={{ fontFamily: "var(--font-stamp)", fontSize: "0.65rem", color: "var(--ink-light)", letterSpacing: "0.1em" }}
              >
                FOOTBALL LIFE © ROAD TO GLORY
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>}
    </>
  );
}
