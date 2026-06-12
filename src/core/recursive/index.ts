import type { FigmaNode } from "../types.js";
import { el, serialize } from "../xml.js";
import { wrapDocument } from "../assemble.js";
import { convertTree } from "./engine.js";

/** 선택 루트를 하위 레이어까지 재귀 분석해 완성 WebSquare 페이지 생성. */
export function convertPageRecursive(root: FigmaNode): string {
  const sub = el("xf:group",
    { class: "sub_contents", id: "", meta_componentContainer: "true" },
    convertTree(root));
  // 슬라이스 1은 그리드 인식기가 없으므로 hasGrid=false.
  return wrapDocument(root.name, serialize(sub), false);
}
