import type { FigmaNode } from "../../types.js";
import { type XmlEl } from "../../xml.js";
import { collectTextNodes, textOf } from "../../extract.js";
import { buildInputTable, buildListTable, buildMultiTable } from "../../converters/inputTable.js";
import { buildFormFromNode, hasFormControls } from "../../converters/formTable.js";

/** 입출력테이블: 폼 컨트롤 신호가 있으면 스마트 폼, 아니면 라벨 N단 테이블. */
export function buildTableForNode(node: FigmaNode, cols: number): XmlEl {
  if (hasFormControls(node)) return buildFormFromNode(node);
  const labels = collectTextNodes(node).map(textOf).filter((s) => s !== "");
  return buildInputTable({ labels, cols });
}

/** 5_06 목록형: 노드 텍스트를 컬럼 헤더로 사용. */
export function buildListTableForNode(node: FigmaNode): XmlEl {
  const headers = collectTextNodes(node).map(textOf).filter((s) => s !== "");
  return buildListTable(headers);
}

/** 5_07 멀티형: 노드 텍스트를 컬럼 헤더로 사용. */
export function buildMultiTableForNode(node: FigmaNode): XmlEl {
  const headers = collectTextNodes(node).map(textOf).filter((s) => s !== "");
  return buildMultiTable(headers);
}
