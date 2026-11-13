import { useTranslations } from "next-intl";

// These phrases are part of the current offer payload and older saves.
const reasonKeys: Record<string, string> = {
  "Gia hạn hợp đồng": "renewal",
  "Gia hạn sớm — giữ chân": "earlyRenewal",
  "Cầu thủ tự do — tìm CLB mới": "freeAgentSearch",
  "Cầu thủ tự do — ký mới": "freeAgentSigning",
  "Bước tiến sự nghiệp": "higherPrestige",
  "Tìm môi trường đá chính": "moreStarts",
  "Phong độ cao thu hút CLB": "goodForm",
  "Quan tâm chuyển nhượng": "interest",
  "CLB muốn thanh lý hợp đồng": "release",
  "Gia hạn chủ động — CLB đồng ý": "renewalAccepted",
  "Chỉ chủ động ngỏ lời khi còn ≤1 năm HĐ hoặc hết hạn": "contractGate",
  "Phí phá HĐ vượt ngân sách CLB — không thể tự giảm": "budgetGate",
  "Không còn mùa nghề để ký HĐ": "careerGate",
  "Xác suất đã đổi — mở lại cửa sổ chuyển nhượng": "quoteChanged",
  "CLB chọn phương án khác": "clubDeclined",
  "Ban lãnh đạo CLB chưa muốn gia hạn hợp đồng lúc này": "renewalDeclined",
  "CLB đích không tồn tại trong danh sách hiện tại": "targetUnavailable",
  "CLB chưa thể nhận đề nghị": "approachUnavailable",
  "Không có CLB hiện tại để đề nghị gia hạn": "noClubToRenew",
  "Hợp đồng hiện tại đã đủ cho các mùa còn lại": "contractCoversCareer",
};

export function useTransferCopy() {
  const t = useTranslations("transfer");
  return (reason: string, fallback = "clubDeclined") => {
    const key = reasonKeys[reason];
    return t(key ?? fallback);
  };
}
