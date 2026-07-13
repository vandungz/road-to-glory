"use client";

import { Dices, Sparkles } from "lucide-react";
import { SpinnerWheel } from "./SpinnerWheel";
import { getFlagEmoji } from "@/types/squad";

interface SetupStageProps {
  activeStep: number;
  isSpinning: boolean;
  wheelItems: any[];
  targetIndex: number;
  handleSetupSpinComplete: () => void;
  tempValue: string | number | null;
  handleSetupSpin: () => void;
  handleStartCareer: () => void;
  draftData: any;
  position: string;
  STEP_LABELS: string[];
}

export function SetupStage({
  activeStep,
  isSpinning,
  wheelItems,
  targetIndex,
  handleSetupSpinComplete,
  tempValue,
  handleSetupSpin,
  handleStartCareer,
  draftData,
  position,
  STEP_LABELS,
}: SetupStageProps) {
  return (
    <main style={{ flex: 1, maxWidth: "1100px", width: "100%", margin: "0 auto", padding: "32px 20px" }}>
      <div style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "40px", alignItems: "flex-start", justifyContent: "center" }}>
        
        {/* CỘT TRÁI: VÒNG QUAY SETUP */}
        <div style={{ flex: "1 1 500px", minWidth: "320px", display: "flex", flexDirection: "column", gap: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", border: "2px solid var(--charcoal)", borderRadius: "4px", backgroundColor: "var(--white)", boxShadow: "2px 2px 0 var(--charcoal)", padding: "10px 12px", gap: "4px" }}>
            {STEP_LABELS.map((label, idx) => {
              const isCurrent = idx === activeStep;
              const isCompleted = idx < activeStep;
              return (
                <div key={label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px", opacity: isCurrent ? 1 : isCompleted ? 0.75 : 0.4, flex: 1, textAlign: "center" }}>
                  <span style={{
                    width: "18px", height: "18px", borderRadius: "50%", border: "1.5px solid var(--charcoal)",
                    backgroundColor: isCurrent ? "var(--coral)" : isCompleted ? "var(--charcoal)" : "var(--white)",
                    color: isCurrent || isCompleted ? "var(--white)" : "var(--charcoal)",
                    fontFamily: "var(--font-headline)", fontSize: "0.62rem", fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center"
                  }}>
                    {idx + 1}
                  </span>
                </div>
              );
            })}
          </div>

          <div style={{ backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", boxShadow: "3px 3px 0 var(--charcoal)", padding: "32px 20px", display: "flex", flexDirection: "column", alignItems: "center", gap: "24px" }}>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontFamily: "var(--font-stamp)", fontSize: "0.58rem", color: "var(--ink-gray)", letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: "4px" }}>
                {activeStep < 11 ? `VÒNG QUAY SỐ ${activeStep + 1} / 11` : "HOÀN TẤT VÒNG QUAY SETUP"}
              </p>
              <h3 style={{ fontFamily: "var(--font-headline)", fontSize: "1.45rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--charcoal)", margin: 0 }}>
                {activeStep < 11 ? STEP_LABELS[activeStep] : "BẮT ĐẦU SỰ NGHIỆP CẦU THỦ"}
              </h3>
            </div>

            {activeStep < 11 ? (
              <>
                <SpinnerWheel
                  isSpinning={isSpinning}
                  items={wheelItems}
                  targetIndex={targetIndex}
                  onSpinComplete={handleSetupSpinComplete}
                />
                {tempValue !== null && !isSpinning && (
                  <div style={{ fontFamily: "var(--font-headline)", fontSize: "1.35rem", fontWeight: 700, color: "var(--charcoal)", border: "2px solid var(--charcoal)", padding: "6px 20px", backgroundColor: "var(--cream)", boxShadow: "2px 2px 0 var(--charcoal)", borderRadius: "3px", textTransform: "uppercase" }}>
                    {tempValue}
                  </div>
                )}
                <button type="button" onClick={handleSetupSpin} disabled={isSpinning} className="btn-primary" style={{ fontSize: "1.1rem", padding: "14px 48px", opacity: isSpinning ? 0.6 : 1, cursor: isSpinning ? "not-allowed" : "pointer" }}>
                  <Dices size={18} /> BẮT ĐẦU QUAY
                </button>
              </>
            ) : (
              <button type="button" onClick={handleStartCareer} className="btn-primary" style={{ fontSize: "1.2rem", padding: "16px 48px", backgroundColor: "var(--coral)", color: "var(--white)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Sparkles size={20} /> BẮT ĐẦU SỰ NGHIỆP CỦA BẠN
              </button>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: STICKER PANINI SETUP PREVIEW */}
        <div style={{ flex: "0 0 380px", width: "380px", display: "flex", flexDirection: "column", gap: "18px", margin: "0 auto" }}>
          <div style={{ backgroundColor: "var(--white)", border: "2px solid var(--charcoal)", borderRadius: "4px", boxShadow: "3px 3px 0 var(--charcoal)", padding: "16px", display: "flex", flexDirection: "column", aspectRatio: "2 / 3", position: "relative", overflow: "hidden" }}>
            <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1.5px solid var(--charcoal)", paddingBottom: "6px", marginBottom: "12px" }}>
              <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.52rem", color: "var(--ink-gray)", letterSpacing: "0.08em", textTransform: "uppercase" }}>RTG SETUP WHEELS</span>
              <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.68rem", fontWeight: 700, color: "var(--coral)", textTransform: "uppercase" }}>{position}</span>
            </div>

            <div style={{ flex: "1 1 auto", backgroundColor: "var(--cream-dark)", border: "2px dashed var(--cream-border)", borderRadius: "3px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-end", marginBottom: "12px", position: "relative" }}>
              {draftData.nationality && (
                <div style={{ position: "absolute", top: "10px", right: "10px", fontSize: "1.75rem" }}>{getFlagEmoji(draftData.nationality)}</div>
              )}
              {draftData.debutOvr && (
                <div style={{ position: "absolute", bottom: "10px", left: "10px", fontFamily: "var(--font-headline)", fontSize: "2rem", fontWeight: 700 }}>{draftData.debutOvr}</div>
              )}
              <div style={{ width: "66px", height: "80px", borderRadius: "50% 50% 0 0", backgroundColor: "var(--cream-border)" }} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--cream-border)", paddingBottom: "3px" }}>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>Quốc Tịch</span>
                <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.75rem", fontWeight: 700 }}>{draftData.nationality ? draftData.nationality.toUpperCase() : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--cream-border)", paddingBottom: "3px" }}>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>Tuổi Debut</span>
                <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.75rem", fontWeight: 700 }}>{draftData.debutAge ? `${draftData.debutAge} TUỔI` : "—"}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", borderBottom: "1px solid var(--cream-border)", padding: "4px 0", textAlign: "center", backgroundColor: "var(--cream-dark)", borderRadius: "3px" }}>
                {(position === "GK"
                  ? [
                      { label: "DIV", val: draftData.div },
                      { label: "HAN", val: draftData.han },
                      { label: "KIC", val: draftData.kic },
                      { label: "REF", val: draftData.ref },
                      { label: "SPD", val: draftData.spd },
                      { label: "POS", val: draftData.pos },
                    ]
                  : [
                      { label: "PAC", val: draftData.pac },
                      { label: "SHO", val: draftData.sho },
                      { label: "PAS", val: draftData.pas },
                      { label: "DRI", val: draftData.dri },
                      { label: "DEF", val: draftData.def },
                      { label: "PHY", val: draftData.phy },
                    ]
                ).map((st) => (
                  <div key={st.label} style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.45rem", color: "var(--ink-gray)" }}>{st.label}</span>
                    <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.78rem", fontWeight: 700 }}>{st.val !== null ? st.val : "—"}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderBottom: "1px solid var(--cream-border)", paddingBottom: "3px" }}>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>Thời Gian Sự Nghiệp</span>
                <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.75rem", fontWeight: 700 }}>{draftData.careerLength ? `${draftData.careerLength} Năm` : "—"}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", paddingBottom: "2px" }}>
                <span style={{ fontFamily: "var(--font-stamp)", fontSize: "0.55rem", color: "var(--ink-gray)", textTransform: "uppercase" }}>CLB Đầu Tiên</span>
                <span style={{ fontFamily: "var(--font-headline)", fontSize: "0.75rem", fontWeight: 700, maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{draftData.clubName ? draftData.clubName.toUpperCase() : "—"}</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
