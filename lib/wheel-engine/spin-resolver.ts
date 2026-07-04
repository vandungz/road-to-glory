// ============================================================
// SPIN RESOLVER
// ============================================================

export interface WeightedItem<T> {
  value: T;
  weight: number;
}

/**
 * Chọn một phần tử ngẫu nhiên có trọng số từ danh sách.
 * Đây là nơi DUY NHẤT trong toàn bộ game loop được gọi Math.random().
 */
export function resolveWeightedOutcome<T>(items: WeightedItem<T>[]): T {
  if (items.length === 0) {
    throw new Error("resolveWeightedOutcome: Items list is empty");
  }

  // Loại bỏ các item có weight <= 0
  const validItems = items.filter((item) => item.weight > 0);
  if (validItems.length === 0) {
    // Nếu tất cả weights đều <= 0, chọn ngẫu nhiên đều
    const randomIndex = Math.floor(Math.random() * items.length);
    return items[randomIndex].value;
  }

  const totalWeight = validItems.reduce((sum, item) => sum + item.weight, 0);
  let randomValue = Math.random() * totalWeight;

  for (const item of validItems) {
    if (randomValue < item.weight) {
      return item.value;
    }
    randomValue -= item.weight;
  }

  // Fallback phòng trường hợp sai số dấu phẩy động
  return validItems[validItems.length - 1].value;
}
