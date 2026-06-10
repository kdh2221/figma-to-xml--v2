import type { FigmaNode } from "../../types.js";
import { collectTextNodes, textOf } from "../../extract.js";

/** 노드 하위 첫 텍스트(없으면 빈 문자열). 여러 빌더가 라벨 추출에 공유한다. */
export function firstText(node: FigmaNode): string {
  const texts = collectTextNodes(node);
  return texts.length > 0 ? textOf(texts[0]) : "";
}
