import type { FigmaNode } from "../types.js";
import { el, type XmlEl } from "../xml.js";
import { collectTextNodes, textOf } from "../extract.js";

/** 폼 한 덩어리 안에서 텍스트가 가지는 역할 */
export type CellRole = "label" | "required" | "placeholder" | "button";

/** 버튼으로 보는 동작 어휘 (텍스트 끝이 이걸로 끝나면 버튼) */
const BUTTON_VERBS = [
  "찾기", "조회", "검색", "추가", "등록", "삭제", "저장", "수정",
  "확인", "취소", "적용", "초기화", "선택", "변경", "다운로드", "업로드",
];

/** 플레이스홀더(입력칸 안내문)로 보는 표지 — 이게 들어가면 인풋 */
const PLACEHOLDER_HINTS = ["입력", "하세요", "선택하"];

/** 한 텍스트의 폼 역할을 내용으로 추정 */
export function classifyText(raw: string): CellRole {
  const s = raw.trim();
  if (s === "*") return "required";
  if (PLACEHOLDER_HINTS.some((h) => s.includes(h))) return "placeholder";
  if (BUTTON_VERBS.some((v) => s.endsWith(v))) return "button";
  return "label";
}

interface Leaf { text: string; role: CellRole; x: number; y: number; }
interface Control { kind: "input" | "button"; label: string; }
interface VisualRow { label?: string; required: boolean; controls: Control[]; y: number; }
/** rows.length = 라벨 th 의 rowspan */
interface Field { label: string; required: boolean; rows: Control[][]; }

/** TEXT 리프를 폼 기준 절대좌표와 역할로 수집.
 *  입력칸이 박스 프레임 안에 중첩돼 있어도(자식 좌표가 박스 기준) 부모 오프셋을 누적해
 *  폼 전체 기준 좌표로 맞춘다 → 행 클러스터링이 중첩 구조에 견딘다. */
function leaves(node: FigmaNode): Leaf[] {
  const out: Leaf[] = [];
  const push = (n: FigmaNode, x: number, y: number) => {
    const text = textOf(n);
    if (text !== "") out.push({ text, role: classifyText(text), x, y });
  };
  const walk = (n: FigmaNode, ox: number, oy: number) => {
    const ax = ox + (n.x ?? 0), ay = oy + (n.y ?? 0);
    if (n.type === "TEXT") push(n, ax, ay);
    for (const c of n.children) walk(c, ax, ay);
  };
  // 루트 좌표는 기준점이라 제외하고 자식부터 누적. 루트 자체가 TEXT인 경우도 처리.
  if (node.type === "TEXT") push(node, 0, 0);
  for (const c of node.children) walk(c, 0, 0);
  return out;
}

/** y 근접도로 같은 시각적 행으로 묶는다 (행 높이 추정 24px) */
function clusterRows(items: Leaf[]): Leaf[][] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const rows: Leaf[][] = [];
  for (const it of sorted) {
    const row = rows.find((r) => Math.abs(r[0].y - it.y) <= 24);
    if (row) row.push(it);
    else rows.push([it]);
  }
  for (const r of rows) r.sort((a, b) => a.x - b.x);
  return rows;
}

/** 폼 프레임 → 필드 목록. 라벨 없는 행은 직전 필드에 붙어 rowspan을 키운다. */
export function extractFields(node: FigmaNode): Field[] {
  const rows = clusterRows(leaves(node)).map<VisualRow>((r) => {
    const label = r.find((l) => l.role === "label")?.text;
    const required = r.some((l) => l.role === "required");
    const controls: Control[] = r
      .filter((l) => l.role === "placeholder" || l.role === "button")
      .map((l) => ({ kind: l.role === "button" ? "button" : "input", label: l.text }));
    return { label, required, controls, y: r[0].y };
  });

  const fields: Field[] = [];
  for (const row of rows) {
    if (row.label !== undefined) {
      fields.push({ label: row.label, required: row.required, rows: [row.controls] });
    } else if (fields.length > 0) {
      fields[fields.length - 1].rows.push(row.controls);
    } else {
      fields.push({ label: "", required: false, rows: [row.controls] });
    }
  }
  return fields;
}

/** 폼 프레임 안에 인풋/버튼 신호가 있는가 (있으면 스마트 폼 테이블로 렌더) */
export function hasFormControls(node: FigmaNode): boolean {
  return collectTextNodes(node)
    .map(textOf)
    .some((t) => { const r = classifyText(t); return r === "placeholder" || r === "button"; });
}

function inputEl(width: string, snippetName: string): XmlEl {
  return el("xf:input", {
    class: "", id: "", placeholder: "", style: `width:${width};`,
    meta_snippetCategory: "11_단일입력폼", meta_snippetName: snippetName, meta_snippetKeyComponent: "true",
  });
}

function buttonEl(label: string): XmlEl {
  return el("w2:button", {
    class: "btn_cm fill pt", id: "", style: "",
    meta_snippetCategory: "08_기본버튼", meta_snippetName: "8_03 강조버튼", meta_snippetKeyComponent: "true",
  }, [el("w2:textbox", { id: "", label, style: "", tagname: "span" })]);
}

/** 한 td 안의 컨트롤들. 인풋이 버튼과 한 행이면 150px, 단독이면 100%. */
function renderControls(controls: Control[]): XmlEl[] {
  const hasButton = controls.some((c) => c.kind === "button");
  return controls.map((c) =>
    c.kind === "button"
      ? buttonEl(c.label)
      : inputEl(hasButton ? "150px" : "100%", hasButton ? "11_05 인풋" : "11_06 인풋(100)")
  );
}

/** 필드 목록 → 입출력테이블(1단) XmlEl. 라벨 th(rowspan) + 컨트롤 td. */
export function buildSmartFormTable(fields: Field[]): XmlEl {
  const rows: XmlEl[] = [];
  for (const f of fields) {
    f.rows.forEach((controls, i) => {
      const cells: XmlEl[] = [];
      if (i === 0) {
        cells.push(
          el("xf:group", { class: "w2tb_th", style: "", tagname: "th" }, [
            el("w2:attributes", {}, [
              el("w2:colspan", {}, ["1"]),
              el("w2:rowspan", {}, [String(f.rows.length)]),
            ]),
            el("w2:textbox", f.required ? { label: f.label, style: "", class: "req" } : { label: f.label, style: "" }),
          ])
        );
      }
      cells.push(el("xf:group", { class: "w2tb_td", style: "", tagname: "td" }, renderControls(controls)));
      rows.push(el("xf:group", { style: "", tagname: "tr" }, cells));
    });
  }

  return el("xf:group", { class: "tblbox", id: "", style: "" }, [
    el("xf:group", { adaptive: "layout", adaptiveThreshold: "768", class: "w2tb tbl", id: "", style: "", tagname: "table" }, [
      el("w2:attributes", {}, [el("w2:summary", {})]),
      el("xf:group", { tagname: "colgroup" }, [
        el("xf:group", { style: "width:100px;", tagname: "col" }),
        el("xf:group", { style: "", tagname: "col" }),
      ]),
      ...rows,
    ]),
  ]);
}

/** 폼 프레임 → 스마트 입출력테이블 XmlEl */
export function buildFormFromNode(node: FigmaNode): XmlEl {
  return buildSmartFormTable(extractFields(node));
}
