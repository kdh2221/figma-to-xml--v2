import type { FigmaNode } from "../types.js";
import { el, type XmlEl } from "../xml.js";
import { textOf } from "../extract.js";
import { isNoise } from "../denoise.js";
import { isTable } from "./names.js";
import { buildTableXml } from "./table.js";

interface Recognizer { match(n: FigmaNode): boolean; build(n: FigmaNode): XmlEl; }

/** 슬라이스 1: Table 인식기만. 이후 슬라이스에서 추가. */
const RECOGNIZERS: Recognizer[] = [
  { match: isTable, build: buildTableXml },
];

/** 한 노드를 변환. 인식 → 매핑, 컨테이너 → 재귀, 미인식 TEXT → textbox, 장식 → []. */
export function convertNode(n: FigmaNode): XmlEl[] {
  if (isNoise(n)) return [];
  for (const r of RECOGNIZERS) if (r.match(n)) return [r.build(n)];
  if (n.children.length > 0) return n.children.flatMap(convertNode);
  if (n.type === "TEXT") {
    const t = textOf(n);
    return t ? [el("w2:textbox", { id: "", label: t, tagname: "span" })] : [];
  }
  return [];
}

/** 선택 루트의 자식들을 변환한 XmlEl 목록. */
export function convertTree(root: FigmaNode): XmlEl[] {
  return root.children.flatMap(convertNode);
}
