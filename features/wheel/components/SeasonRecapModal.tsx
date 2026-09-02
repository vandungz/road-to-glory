"use client";

import type { SeasonRecord } from "@/types/game";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import { getContinentalCupLabel, getSeasonYearString } from "../lib/simulation-helpers";
import { Button } from "@/components/ui/Button";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";

interface Props {
  record: SeasonRecord;
  yearSimResult: SimulatedSeasonResult;
  currentContinentalCup: string;
  playerDebutAge: number;
  hasBallonDorWinner?: boolean;
  onClose: () => void;
}

function resultLabel(result: string | null | undefined) {
  if (!result || result === "Chờ quay") return "—";
  if (result === "Winner") return "Vô địch";
  if (result === "Runner-Up") return "Á quân";
  if (result === "Semi-Finals") return "Bán kết";
  if (result === "Quarter-Finals") return "Tứ kết";
  if (result === "Round of 16") return "Vòng 1/8";
  if (result === "Round of 32") return "Vòng 1/16";
  if (result === "Early Exit") return "Vòng loại sớm";
  if (result === "Group Stage") return "Vòng bảng";
  return result;
}

function getStandingLabel(record: SeasonRecord) {
  if (!record.standing) return "—";
  return record.standing === 1 ? "Vô địch" : `Hạng ${record.standing}`;
}

function SummaryMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rtg-season-close__metric">
      <span>{label}</span>
      <strong className={accent ? "is-accent" : undefined}>{value}</strong>
    </div>
  );
}

function SeasonStat({ label, value, accent = false }: { label: string; value: number | string; accent?: boolean }) {
  return (
    <div className="rtg-season-close__stat">
      <span>{label}</span>
      <strong className={accent ? "is-positive" : undefined}>{value}</strong>
    </div>
  );
}

function AwardItem({ title, detail, accent = false }: { title: string; detail: string; accent?: boolean }) {
  return (
    <div className={`rtg-season-close__award${accent ? " is-accent" : ""}`}>
      <i aria-hidden="true" />
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}

export function SeasonRecapModal({ record, yearSimResult, currentContinentalCup, playerDebutAge, hasBallonDorWinner = false, onClose }: Props) {
  const season = getSeasonYearString(record.age, playerDebutAge);
  const continentalName = record.continentalCup?.type
    ? getContinentalCupLabel(record.continentalCup.type)
    : currentContinentalCup !== "none" ? getContinentalCupLabel(currentContinentalCup) : "Cúp châu lục";
  const individualAwards = yearSimResult.events?.filter((event) => event.type === "individual_award") ?? [];
  const awards = [
    ...(record.continentalCup?.result === "Winner" ? [{ title: continentalName, detail: `Vô địch · ${record.clubName}` }] : []),
    ...individualAwards.map((award) => ({ title: award.label, detail: `Mùa ${record.age}` })),
    ...(hasBallonDorWinner ? [{ title: "Quả bóng vàng", detail: "Chiến thắng danh giá", accent: true }] : []),
  ];

  return (
    <Modal open title={`Mùa giải khép lại · ${season}`} onClose={onClose} size="md" className="rtg-season-close-modal">
      <ModalHeader onClose={onClose} closeLabel="Đóng tổng kết" eyebrow={`Kết quả mùa giải · ${record.clubName} · tuổi ${record.age}`}>
        Mùa giải khép lại
      </ModalHeader>

      <ModalBody>
        <section className="rtg-season-close__metrics" aria-label="Kết quả mùa giải">
          <SummaryMetric label="Kết quả VĐQG" value={getStandingLabel(record)} />
          <SummaryMetric label="Cúp quốc gia" value={resultLabel(record.domesticCup)} />
          <SummaryMetric label="Cúp châu lục" value={record.continentalCup ? resultLabel(record.continentalCup.result) : "—"} accent={record.continentalCup?.result === "Winner"} />
          <SummaryMetric label="Vòng quay" value="6 lần" />
        </section>

        <div className="rtg-season-close__columns">
          <section className="rtg-season-close__section" aria-labelledby="season-close-stats">
            <h3 id="season-close-stats">Số liệu mùa giải</h3>
            <div className="rtg-season-close__stats">
              <SeasonStat label="Ra sân" value={yearSimResult.apps} />
              <SeasonStat label="Bàn thắng" value={yearSimResult.goals} />
              <SeasonStat label="Kiến tạo" value={yearSimResult.assists} />
              <SeasonStat label="Điểm phong độ" value={yearSimResult.matchRating.toFixed(2)} accent />
            </div>
          </section>

          <section className="rtg-season-close__section" aria-labelledby="season-close-awards">
            <h3 id="season-close-awards">Danh hiệu nhận được</h3>
            <div className="rtg-season-close__awards">
              {awards.length > 0 ? awards.map((award, index) => <AwardItem key={`${award.title}-${index}`} {...award} />) : <p className="rtg-modal-note">Chưa có danh hiệu mùa này.</p>}
            </div>
          </section>
        </div>
      </ModalBody>

      <ModalFooter className="rtg-season-close__footer">
        <p>Cửa sổ chuyển nhượng đã mở — các đề nghị mới đang chờ.</p>
        <Button size="lg" onClick={onClose}>Vào cửa sổ chuyển nhượng</Button>
      </ModalFooter>
    </Modal>
  );
}
