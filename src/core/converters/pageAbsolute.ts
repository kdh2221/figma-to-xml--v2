import type { Converter, FigmaNode } from "../types.js";
import { el, serialize, escapeAttr, type XmlEl } from "../xml.js";
import { collectTextNodes, textOf } from "../extract.js";
import { buildInputTable, inputTableConverter } from "./inputTable.js";
import { buildGrid, gridConverter } from "./grid.js";

type PageAbsoluteSlots = { root: FigmaNode } & Record<string, unknown>;

/** 레이어 이름 접두사로 식별되는 WebSquare 컴포넌트 종류 */
export type Kind =
  | "button" | "input" | "select" | "radio" | "checkbox"
  | "textarea" | "calendar" | "label"
  | "table" | "grid" | "tab" | "group";

/** 접두사 → 컴포넌트 종류 매핑 (대소문자 무시) */
const PREFIX_MAP: Record<string, Kind> = {
  btn: "button", button: "button",
  inp: "input", input: "input",
  sel: "select", select: "select", combo: "select",
  rad: "radio", radio: "radio",
  chk: "checkbox", check: "checkbox", checkbox: "checkbox",
  ta: "textarea", textarea: "textarea",
  cal: "calendar", date: "calendar", calendar: "calendar",
  lbl: "label", label: "label", txt: "label", text: "label",
  tbl: "table", table: "table",
  grid: "grid", gvw: "grid",
  tab: "tab", tbc: "tab",
  grp: "group", group: "group", box: "group",
};

/** 레이어 이름의 접두사(첫 _ / - / : / 공백 앞)로 컴포넌트 종류 판별. 없으면 null */
export function classify(name: string): Kind | null {
  const prefix = name.split(/[_\-: ]/, 1)[0].toLowerCase();
  return PREFIX_MAP[prefix] ?? null;
}

/** 접두사를 제거한 나머지 이름 (라벨 대체용) */
function stripPrefix(name: string): string {
  const m = name.match(/^[A-Za-z]+[_\-: ](.*)$/);
  return m ? m[1] : name;
}

/** 노드의 첫 텍스트(루트 포함). 없으면 접두사 제거한 이름 */
function firstLabel(node: FigmaNode): string {
  const texts = collectTextNodes(node);
  return texts.length > 0 ? textOf(texts[0]) : stripPrefix(node.name);
}

/** 부모 기준 좌표를 position:absolute 스타일 문자열로 변환 */
export function absoluteStyle(node: FigmaNode): string {
  const left = Math.round(node.x ?? 0);
  const top = Math.round(node.y ?? 0);
  const width = Math.round(node.width);
  const height = Math.round(node.height);
  return `position:absolute; left:${left}px; top:${top}px; width:${width}px; height:${height}px;`;
}

/** 탭컨트롤 빌드: 텍스트들 = 탭 라벨, 라벨 수만큼 content 생성 */
function buildTab(node: FigmaNode, id: string, style: string): XmlEl {
  const found = collectTextNodes(node).map(textOf).filter((s) => s !== "");
  const labels = found.length > 0 ? found : ["TAB1", "TAB2", "TAB3"];
  const tabs = labels.map((label, i) =>
    el("w2:tabs", { disabled: "false", style: "", id: `tabs${i + 1}`, label })
  );
  const contents = labels.map((_, i) =>
    el("w2:content", { alwaysDraw: "false", style: "", id: `content${i + 1}` })
  );
  return el(
    "xf:group",
    { id, class: "tbcbox", style, meta_snippetCategory: "04_탭" },
    [el("w2:tabControl", { alwaysDraw: "false", style: "", id: "", class: "tbc" }, [...tabs, ...contents])]
  );
}

/** 영역 변환기 결과 루트에 위치/id/스니펫 메타를 주입 */
function withRegionMeta(root: XmlEl, id: string, style: string, category: string, name: string): XmlEl {
  root.attrs.id = id;
  root.attrs.style = style;
  root.attrs.meta_snippetCategory = category;
  root.attrs.meta_snippetName = name;
  return root;
}

/** 한 Figma 노드를 WebSquare 요소(XmlEl)로 변환. 이름 규칙으로 의미 매핑, 없으면 coarse 폴백 */
export function renderNode(node: FigmaNode, nextId: () => string): XmlEl {
  const kind = classify(node.name);
  const id = nextId();
  const style = absoluteStyle(node);

  switch (kind) {
    case "button":
      return el("w2:button", { class: "btn_cm", id, style }, [
        el("w2:textbox", { label: firstLabel(node), tagname: "span" }),
      ]);
    case "input":
      return el("xf:input", { class: "", id, style });
    case "select":
      return el("xf:select1", {
        appearance: "minimal", allOption: "true", chooseOption: "", class: "", id, style,
      });
    case "radio":
      return el("xf:select1", { class: "", id, style });
    case "checkbox":
      return el("xf:select", { class: "", id, style });
    case "textarea":
      return el("xf:textarea", { class: "", id, style });
    case "calendar":
      return el("w2:inputCalendar", { class: "", id, style });
    case "label":
      return el("w2:textbox", { id, label: firstLabel(node), style, tagname: "span" });
    case "table":
      return withRegionMeta(
        buildInputTable(inputTableConverter.extract(node).slots),
        id, style, "05_입출력테이블", "5_01 테이블(1단)"
      );
    case "grid":
      return withRegionMeta(
        buildGrid(gridConverter.extract(node).slots),
        id, style, "06_그리드", "6_01 그리드"
      );
    case "tab":
      return buildTab(node, id, style);
    case "group":
      return el("xf:group", { ctype: "GroupBox", id, style }, node.children.map((c) => renderNode(c, nextId)));
    default:
      // 접두사 없음 → coarse 폴백
      if (node.type === "TEXT") {
        return el("w2:textbox", { ctype: "Text", id, label: textOf(node), style });
      }
      if (node.children.length > 0) {
        return el("xf:group", { ctype: "GroupBox", id, style }, node.children.map((c) => renderNode(c, nextId)));
      }
      return el("xf:group", { id, style });
  }
}

function idGenerator(): () => string {
  let n = 0;
  return () => `g${++n}`;
}

/** 선택한 루트 프레임을 로드 가능한 WebSquare 풀 페이지 문서로 생성 */
export function buildPage(root: FigmaNode): string {
  const nextId = idGenerator();
  const bodyChildren = root.children.map((c) => renderNode(c, nextId));
  const rootGroup = el(
    "xf:group",
    {
      class: "content_body",
      screentitle: root.name,
      style: `width:${Math.round(root.width)}px; height:${Math.round(root.height)}px;`,
    },
    bodyChildren
  );
  const bodyXml = serialize(rootGroup);
  const screenName = escapeAttr(root.name);

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" ' +
    'xmlns:w2="http://www.inswave.com/websquare" xmlns:xf="http://www.w3.org/2002/xforms">' +
    `<head meta_screenName="${screenName}">` +
    "<w2:type>COMPONENT</w2:type><w2:buildDate/>" +
    '<xf:model><xf:instance><data xmlns=""/></xf:instance></xf:model>' +
    '<script type="text/javascript"><![CDATA[]]></script>' +
    "</head>" +
    `<body>${bodyXml}</body>` +
    "</html>"
  );
}

export const pageAbsoluteConverter: Converter<PageAbsoluteSlots> = {
  type: "pageAbsolute",
  extract(node: FigmaNode) {
    return { slots: { root: node }, warnings: [] };
  },
  render(slots: PageAbsoluteSlots) {
    return buildPage(slots.root);
  },
};
