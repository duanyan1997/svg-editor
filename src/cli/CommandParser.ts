/** 命令行分词：空白分隔，双引号包裹的为一个 token（引号剥除），未闭合引号视为到行尾 */
export class CommandParser {
  static parse(line: string): string[] {
    const tokens: string[] = [];
    let current = "";
    let inQuotes = false;
    let started = false;

    for (const ch of line) {
      if (ch === '"') {
        inQuotes = !inQuotes;
        started = true;
        continue;
      }
      if (!inQuotes && /\s/.test(ch)) {
        if (started) tokens.push(current);
        current = "";
        started = false;
        continue;
      }
      current += ch;
      started = true;
    }
    if (started) tokens.push(current);
    return tokens;
  }
}
