import type { FigmaNode } from "../types.js";
import { el, type XmlEl } from "../xml.js";
import { collectTextNodes, textOf } from "../extract.js";
import * as SF from "../snippets/builders/singleForm.js";
import { buildButton } from "../snippets/builders/button.js";
import {
  isLabelCell, isTdCell, isSelectbox, isBoxItem, isButtonNode,
  isRequiredLabel, controlKindOfBoxItem,
} from "./names.js";

type Role = "th" | "td";
interface Cell { role: Role; node: FigmaNode; }

const isCellBoundary = (n: FigmaNode): boolean =>
  isLabelCell(n) || isTdCell(n) || isSelectbox(n) || isBoxItem(n) || isButtonNode(n);
const isControl = (n: FigmaNode): boolean =>
  isSelectbox(n) || isBoxItem(n) || isButtonNode(n);

/** 셀 경계에서 멈추며 문서순으로 셀 수집(경계 내부는 안 내려감). */
function collectCells(node: FigmaNode): Cell[] {
  const out: Cell[] = [];
  const walk = (n: FigmaNode) => {
    for (const c of n.children) {
      if (isCellBoundary(c)) out.push({ role: isLabelCell(c) ? "th" : "td", node: c });
      else walk(c);
    }
  };
  walk(node);
  return out;
}

/** 컨트롤 노드 → 스니핏 빌더 XmlEl (스니핏 모듈 우선) */
export function buildControl(n: FigmaNode): XmlEl {
  if (isButtonNode(n)) return buildButton(n);
  if (isSelectbox(n)) return SF.buildSelect("100%");
  if (isBoxItem(n)) {
    const k = controlKindOfBoxItem(n);
    if (k === "select") return SF.buildSelect("100%");
    if (k === "calendar") return SF.buildCalendar("yearMonthDate", "100%");
    return SF.buildInput("100%");
  }
  return SF.buildInput("100%");
}

function labelText(n: FigmaNode): string {
  return collectTextNodes(n).map(textOf).find((t) => t !== "" && t.trim() !== "*") ?? "";
}

function thCell(n: FigmaNode): XmlEl {
  const attrs: Record<string, string> = { label: labelText(n) };
  if (isRequiredLabel(n)) attrs["class"] = "req";
  return el("xf:group", { class: "w2tb_th", tagname: "th" }, [el("w2:textbox", attrs)]);
}

function tdCell(n: FigmaNode): XmlEl {
  let inner: XmlEl[];
  if (isControl(n)) {
    inner = [buildControl(n)];
  } else {
    const ctrls: FigmaNode[] = [];
    const walk = (m: FigmaNode) => {
      for (const c of m.children) { if (isControl(c)) ctrls.push(c); else walk(c); }
    };
    walk(n);
    inner = ctrls.length ? ctrls.map(buildControl) : [SF.buildInput("100%")];
  }
  return el("xf:group", { class: "w2tb_td", tagname: "td" }, inner);
}

/** table의 행 격자 복원 (좌표 없이: 중첩 + layoutMode) */
function tableRows(table: FigmaNode): Cell[][] {
  const groups = table.children.map(collectCells).filter((g) => g.length > 0);
  if (table.layoutMode !== "HORIZONTAL") return groups; // 행-major
  // 열-major → 전치
  const maxLen = groups.reduce((m, g) => Math.max(m, g.length), 0);
  const rows: Cell[][] = [];
  for (let i = 0; i < maxLen; i++) rows.push(groups.map((g) => g[i]).filter((c): c is Cell => !!c));
  return rows;
}

export function buildTableXml(table: FigmaNode): XmlEl {
  const rows = tableRows(table).filter((r) => r.length > 0);
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const colgroup = el("xf:group", { tagname: "colgroup" },
    Array.from({ length: cols }, (_, i) => {
      const role = rows.find((r) => r[i])?.[i]?.role;
      return role === "th"
        ? el("xf:group", { style: "width:100px;", tagname: "col" })
        : el("xf:group", { tagname: "col" });
    }));
  const trs = rows.map((r) =>
    el("xf:group", { tagname: "tr" }, r.map((c) => (c.role === "th" ? thCell(c.node) : tdCell(c.node)))));
  return el("xf:group", { class: "tblbox", id: "", style: "" }, [
    el("xf:group", { class: "w2tb tbl", tagname: "table" }, [colgroup, ...trs]),
  ]);
}
