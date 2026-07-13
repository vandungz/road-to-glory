// ============================================================
// SPIN RESOLVER
// ============================================================
// Math.random() chỉ được gọi trong file này. Mọi nơi khác
// phải dùng các hàm export bên dưới để đảm bảo mockable trong test.

export interface WeightedItem<T> {
  value: T;
  weight: number;
}

/** Uniform random float trong [0, 1) */
export function resolveRandom(): number {
  return Math.random();
}

/** Uniform random float trong [min, max) */
export function resolveRandomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/** Uniform random integer trong [min, max] (inclusive) */
export function resolveRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Chọn một phần tử ngẫu nhiên có trọng số từ danh sách.
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
