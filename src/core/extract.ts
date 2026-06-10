import type { FigmaNode } from "./types.js";

/** 서브트리의 모든 TEXT 노드를 document 순서로 수집 */
export function collectTextNodes(node: FigmaNode): FigmaNode[] {
  const out: FigmaNode[] = [];
  const walk = (n: FigmaNode) => {
    if (n.type === "TEXT") out.push(n);
    for (const c of n.children) walk(c);
  };
  for (const c of node.children) walk(c);
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
