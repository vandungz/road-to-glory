"use client";

import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { ResultBanner } from "@/components/ui/ResultBanner";

interface Props {
  nominated: boolean;
  age: number;
  onClose: () => void;
}

export function BallonDorNominationModal({ nominated, age, onClose }: Props) {
  return (
    <Modal open title="Quả Bóng Vàng — đề cử" onClose={onClose} size="sm" className="football-season-result-modal">
      <ModalHeader onClose={onClose} closeLabel="Đóng kết quả" eyebrow={`Quả Bóng Vàng · Tuổi ${age}`}>
        Quả Bóng Vàng — đề cử
      </ModalHeader>
      <ModalBody>
        <ResultBanner tone={nominated ? "positive" : "default"}>
          {nominated ? "Được đề cử Top 10" : "Chưa được đề cử năm này"}
        </ResultBanner>
        <p className="football-modal-note">
          {nominated
            ? "Bạn sẽ tiếp tục tới vòng xếp hạng chung cuộc."
            : "Bạn sẽ tiếp tục sang phần phát triển chỉ số của mùa giải."}
        </p>
      </ModalBody>
      <ModalFooter>
        <Button fullWidth onClick={onClose}>Tiếp tục hành trình</Button>
      </ModalFooter>
    </Modal>
  );
}
