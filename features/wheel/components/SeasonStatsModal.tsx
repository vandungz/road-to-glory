"use client";

import type { CompetitionStats, SeasonRecord } from "@/types/game";
import type { SimulatedSeasonResult } from "@/features/season/services/season-simulator.service";
import { getContinentalCupLabel, getDomesticCupName } from "../lib/simulation-helpers";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DataRow } from "@/components/ui/DataRow";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";

interface Props {
  record: SeasonRecord;
  yearSimResult: SimulatedSeasonResult;
  currentContinentalCup: string;
  onClose: () => void;
}

function CompetitionRow({ label, stats, result }: { label: string; stats?: CompetitionStats; result?: string }) {
  if (!stats || stats.apps === 0) return null;
  return (
    <div className="rtg-competition-row">
      <div>
        <strong>{label}</strong>
        {result && <span>{result}</span>}
      </div>
      <small>
        {stats.apps} trận · {stats.goals} bàn · {stats.assists} kiến tạo
        {stats.cleanSheets > 0 ? ` · ${stats.cleanSheets} sạch lưới` : ""} · Rating {stats.rating.toFixed(2)}
      </small>
    </div>
  );
}

function cupResult(result: string | null | undefined): string {
  if (!result || result === "Chờ quay") return "";
  if (result === "Winner") return "Vô địch";
  if (result === "Runner-Up") return "Á quân";
  if (result === "Semi-Finals") return "Bán kết";
  return "Vòng loại";
}

export function SeasonStatsModal({ record, yearSimResult, currentContinentalCup, onClose }: Props) {
  const awards = yearSimResult.events.filter((event) => event.type === "individual_award");
  const hasAwards = awards.length > 0 || yearSimResult.ballonDor.eligible;

  return (
    <Modal open title="Thống kê mùa giải" onClose={onClose} size="sm">
      <ModalHeader onClose={onClose} closeLabel="Đóng thống kê mùa giải">
        Thống kê mùa giải
      </ModalHeader>

      <ModalBody>
        <div className="rtg-season-stats">
          <div className="rtg-season-stats__heading">
            <span>Hồ sơ mùa giải</span>
            <strong>{record.clubName}</strong>
            <small>{record.leagueName}</small>
          </div>

          <section>
            <h3 className="rtg-modal-section-label">Tổng mùa giải</h3>
            <div className="rtg-data-list">
              <DataRow label="Số trận ra sân" value={yearSimResult.apps} />
              <DataRow label="Bàn thắng" value={yearSimResult.goals} />
              <DataRow label="Kiến tạo" value={yearSimResult.assists} />
              {yearSimResult.cleanSheets > 0 && <DataRow label="Trận giữ sạch lưới" value={yearSimResult.cleanSheets} />}
              <DataRow label="Điểm đánh giá trung bình" value={yearSimResult.matchRating.toFixed(2)} />
            </div>
          </section>

          <section>
            <h3 className="rtg-modal-section-label">Theo từng giải</h3>
            <div className="rtg-competition-list">
              <CompetitionRow
                label={record.leagueName || "Giải VĐQG"}
                stats={yearSimResult.leagueStats}
                result={record.standing != null ? `Hạng #${record.standing}` : undefined}
              />
              <CompetitionRow
                label={getDomesticCupName(record.leagueName, record.leagueId)}
                stats={yearSimResult.domesticCupStats}
                result={cupResult(record.domesticCup)}
              />
              <CompetitionRow
                label={getContinentalCupLabel(record.continentalCup?.type ?? currentContinentalCup)}
                stats={yearSimResult.continentalStats}
                result={cupResult(record.continentalCup?.result)}
              />
              <CompetitionRow
                label={record.nationalTeam?.type ?? "Đội tuyển quốc gia"}
                stats={yearSimResult.nationalStats}
                result={cupResult(record.nationalTeam?.result)}
              />
            </div>
          </section>

          {hasAwards && (
            <section className="rtg-awards-section">
              <h3 className="rtg-modal-section-label">Danh hiệu cá nhân</h3>
              {awards.map((award, index) => <Badge key={index} tone="accent">{award.label}</Badge>)}
              {yearSimResult.ballonDor.eligible && (
                <div className="rtg-honour-note">Đủ điều kiện dự tranh Quả Bóng Vàng — quay để xem kết quả.</div>
              )}
            </section>
          )}
        </div>
      </ModalBody>

      <ModalFooter>
        <Button onClick={onClose}>Tiếp tục phát triển chỉ số</Button>
      </ModalFooter>
    </Modal>
  );
}
