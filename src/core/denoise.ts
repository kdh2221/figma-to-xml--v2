import type { FigmaNode } from "./types.js";

/** 도형/벡터 계열 노드 타입 (아이콘 구성 요소) */
const SHAPE_TYPES = new Set([
  "VECTOR", "BOOLEAN_OPERATION", "ELLIPSE", "STAR", "POLYGON", "LINE",
]);

/** 서브트리에 TEXT 노드가 하나라도 있는가 */
function hasText(node: FigmaNode): boolean {
  if (node.type === "TEXT") return true;
  return node.children.some(hasText);
}

/** 가로·세로 모두 작은(≤24px) 노드 = 아이콘 조각 가능성 */
function isTiny(node: FigmaNode): boolean {
  return node.width <= 24 && node.height <= 24;
}

/** 인식·렌더에서 제거할 노이즈(아이콘/벡터/장식)인가 */
export function isNoise(node: FigmaNode): boolean {
  if (hasText(node)) return false; // 텍스트를 품은 건 의미 있는 콘텐츠 → 유지
  if (SHAPE_TYPES.has(node.type)) return true; // 벡터/도형 = 노이즈
  if (node.children.length > 0) return true; // 텍스트 없는 컨테이너 = 아이콘 그룹
  return isTiny(node); // 텍스트 없는 단일 leaf: 작을 때만 노이즈
}

/** 노이즈 서브트리를 제거한 새 트리 반환 (아이콘 벡터 조각 정리) */
export function denoise(node: FigmaNode): FigmaNode {
  const kept = node.children.filter((c) => !isNoise(c)).map(denoise);
  return { ...node, children: kept };
}
