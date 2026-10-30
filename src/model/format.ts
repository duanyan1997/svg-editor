import { SvgError } from "./SvgError.js";

/** 解析数字参数/属性，非法时抛领域错误 */
export function parseNumber(attr: string, raw: string): number {
  const n = Number(raw);
  if (Number.isNaN(n)) throw new SvgError(`invalid number: ${raw}`);
  return n;
}

/**
 * 数值显示：整数不带小数点；浮点收敛到 6 位小数，
 * 避免连续 scale 产生的二进制浮点尾巴（如 3.3000000000000003）
 */
export function formatNumber(n: number): string {
  return String(Number(n.toFixed(6)));
}

export interface Position {
  x: number;
  y: number;
}
