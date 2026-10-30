import { parseNumber } from "../model/format.js";
import { SvgError } from "../model/SvgError.js";

/** init/canvas 的尺寸参数：必须是正数 */
export function parsePositiveSize(raw: string): number {
  const n = parseNumber("size", raw);
  if (n <= 0) throw new SvgError("canvas size must be positive");
  return n;
}
