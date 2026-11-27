/** Visual-only variation, independent of career outcomes. */
export function visualRandomInt(min: number, max: number): number {
    const values = new Uint32Array(1);
    globalThis.crypto.getRandomValues(values);
    return min + Math.floor(values[0] / 0x100000000 * (max - min + 1));
}
