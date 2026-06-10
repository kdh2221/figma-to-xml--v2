import type { FigmaNode } from "./types.js";
import { collectTextNodes, textOf } from "./extract.js";
import { classify, type Kind } from "./converters/pageAbsolute.js";
import { denoise } from "./denoise.js";
import { defaultSnippetFor } from "./snippets/registry.js";

/** 영역 단위로 선택 가능한 스니펫 타입 */
export type RegionType =
  | "title" | "inputTable" | "grid" | "button" | "input" | "select" | "text" | "tab" | "group";

export type Confidence = "high" | "medium" | "low";

export interface Region {
  /** 원본 노드 id (생성 단계에서 사용자가 고른 타입을 다시 매칭) */
  id: string;
  name: string;
  snippetId: string;
  confidence: Confidence;
  texts: string[];
}

/** 이름규칙 Kind → 영역 타입 */
const KIND_TO_REGION: Record<Kind, RegionType> = {
  button: "button", input: "input", select: "select", radio: "select", checkbox: "select",
  textarea: "input", calendar: "input", label: "text", table: "inputTable", grid: "grid",
  tab: "tab", group: "group",
};

/** 폼 필드 행인가: 필수입력 표시(*)를 품은 라벨+값 한 줄 → 입출력테이블 행으로 본다.
 *  연속된 이런 행들은 조립 단계에서 하나의 입출력테이블로 합쳐진다. */
function isInputRow(node: FigmaNode): boolean {
  return collectTextNodes(node).map(textOf).some((s) => s.trim() === "*");
}

/** 직계 자식 중 크기가 같은 것이 3개 이상이면 반복 구조(그리드/카드) */
function hasRepeatedChildren(node: FigmaNode): boolean {
  const buckets = new Map<string, number>();
  for (const c of node.children) {
    const key = `${Math.round(c.width)}x${Math.round(c.height)}`;
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }
  for (const count of buckets.values()) if (count >= 3) return true;
  return false;
}

/** 한 영역의 스니펫 타입 1차 추측. 이름규칙 우선(高신뢰), 없으면 구조 휴리스틱 */
export function classifyRegion(node: FigmaNode): { type: RegionType; confidence: Confidence } {
  const kind = classify(node.name);
  if (kind) return { type: KIND_TO_REGION[kind], confidence: "high" };

  // 필수표시(*)는 폼 필드의 강한 신호 → 같은 크기 텍스트가 반복돼도 그리드보다 우선
  if (isInputRow(node)) return { type: "inputTable", confidence: "medium" };
  if (hasRepeatedChildren(node)) return { type: "grid", confidence: "medium" };

  const texts = collectTextNodes(node);
  if (node.type === "TEXT" || (texts.length === 1 && node.children.length <= 1)) {
    return { type: "text", confidence: "medium" };
  }
  if (node.height <= 60 && texts.length >= 1 && texts.length <= 2) {
    return { type: "title", confidence: "medium" };
  }
  return { type: "group", confidence: "low" };
}

/** 선택 루트를 denoise 후 직계 자식을 분류된 영역 목록으로 변환 */
export function analyzeRegions(root: FigmaNode): Region[] {
  const clean = denoise(root);
  return clean.children.map((child) => {
    const { id, confidence } = defaultSnippetFor(child);
    const texts = collectTextNodes(child).map(textOf).filter((s) => s !== "");
    return { id: child.id, name: child.name, snippetId: id, confidence, texts };
  });
}
