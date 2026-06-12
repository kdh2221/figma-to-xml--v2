import type { FigmaNode } from "../types.js";
import { collectTextNodes, textOf } from "../extract.js";

/** 제어문자 제거 + trim + 소문자 (\btd → "td") */
function cleanName(n: FigmaNode): string {
  return n.name.replace(/[\x00-\x1f]/g, "").trim().toLowerCase();
}

export function isTable(n: FigmaNode): boolean { return cleanName(n) === "table"; }
export function isLabelCell(n: FigmaNode): boolean { return cleanName(n) === "label"; }
export function isTdCell(n: FigmaNode): boolean { return cleanName(n) === "td"; }
export function isSelectbox(n: FigmaNode): boolean { return cleanName(n) === "selectbox"; }
export function isBoxItem(n: FigmaNode): boolean { return cleanName(n).includes("boxitem"); }
export function isButtonNode(n: FigmaNode): boolean { return cleanName(n).startsWith("button"); }

/** 라벨 안에 '*' 텍스트가 있으면 필수 */
export function isRequiredLabel(n: FigmaNode): boolean {
  return collectTextNodes(n).map(textOf).some((t) => t.trim() === "*");
}

/** item/boxitem 안의 아이콘 인스턴스 이름으로 컨트롤 종류 추론 */
export function controlKindOfBoxItem(n: FigmaNode): "input" | "select" | "calendar" {
  let kind: "input" | "select" | "calendar" = "input";
  const walk = (m: FigmaNode) => {
    for (const c of m.children) {
      const nm = c.name.replace(/[\x00-\x1f]/g, "").trim().toLowerCase();
      if (nm.includes("calendar")) kind = "calendar";
      else if (nm.includes("arrow-down")) kind = "select";
      walk(c);
    }
  };
  walk(n);
  return kind;
}
