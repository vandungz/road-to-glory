"use client";

import type { CurrentClub } from "@/types/domain";

interface MobileCareerContextProps {
  currentAge: number;
  currentOvr: number;
  currentClub: CurrentClub | null;
  isUnemployed: boolean;
  careerSubStep: string;
  isProcessing: boolean;
  seasonApps?: number;
  seasonRating?: number;
}

const STEP_LABELS: Record<string, string> = {
  idle: "Sẵn sàng vào mùa", standing: "Bảng xếp hạng", domestic_cup: "Cúp quốc gia",
  continental_cup: "Cúp châu lục", national_callup: "Đội tuyển quốc gia",
  national_tournament: "Giải đấu quốc tế", season_stats: "Tổng kết mùa",
  ballon_dor_nomination: "Đề cử Ballon d'Or", ballon_dor_ranking: "Xếp hạng Ballon d'Or",
  dir_increase: "Phát triển chỉ số", dir_decrease: "Điều chỉnh chỉ số", count: "Chọn số chỉ số",
  selector: "Chọn chỉ số", magnitude: "Chọn mức thay đổi", transfer: "Cửa sổ chuyển nhượng",
  resolved: "Mùa giải đã hoàn tất",
};

export function MobileCareerContext({
  currentAge, currentOvr, currentClub, isUnemployed, careerSubStep,
  isProcessing, seasonApps, seasonRating,
}: MobileCareerContextProps) {
  const clubLabel = isUnemployed || !currentClub ? "Thất nghiệp" : currentClub.name;
  const stepLabel = STEP_LABELS[careerSubStep] ?? "Tiến trình sự nghiệp";

  return (
    <section className="mobile-career-context" aria-label="Tóm tắt sự nghiệp hiện tại" aria-live="polite">
      <div className="mobile-career-context__heading">
        <span className="mobile-career-context__eyebrow">TUỔI {currentAge} · {stepLabel}</span>
        <span className={isProcessing ? "mobile-career-context__status is-processing" : "mobile-career-context__status"}>
          {isProcessing ? "ĐANG XỬ LÝ" : "ĐANG THEO DÕI"}
        </span>
      </div>
      <div className="mobile-career-context__stats">
        <div className="mobile-career-context__stat"><span>OVR</span><strong>{currentOvr}</strong></div>
        <div className="mobile-career-context__club"><span>CLB HIỆN TẠI</span><strong title={clubLabel}>{clubLabel}</strong></div>
        {seasonApps !== undefined && seasonRating !== undefined && (
          <div className="mobile-career-context__season"><span>MÙA NÀY</span><strong>{seasonApps} trận · MR {seasonRating.toFixed(1)}</strong></div>
        )}
      </div>
    </section>
  );
}
