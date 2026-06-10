import type { FigmaNode } from "./types.js";

/** 노드(루트 포함)의 모든 TEXT 노드를 document 순서로 수집.
 *  사용자가 텍스트 레이어를 직접 선택한 경우도 잡아내기 위해 루트 자신부터 검사한다. */
export function collectTextNodes(node: FigmaNode): FigmaNode[] {
  const out: FigmaNode[] = [];
  const walk = (n: FigmaNode) => {
    if (n.type === "TEXT") out.push(n);
    for (const c of n.children) walk(c);
  };
  walk(node);
  return out;
}

/** 직계 자식 중 TEXT 노드만 */
export function directTextChildren(node: FigmaNode): FigmaNode[] {
  return node.children.filter((c) => c.type === "TEXT");
}

/** 텍스트 내용 (없으면 빈 문자열) */
export function textOf(node: FigmaNode): string {
  return (node.characters ?? "").trim();
}
