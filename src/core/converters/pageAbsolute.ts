import type { Converter, FigmaNode } from "../types.js";
import { el, serialize, escapeAttr, type XmlEl } from "../xml.js";
import { textOf } from "../extract.js";

type PageAbsoluteSlots = { root: FigmaNode } & Record<string, unknown>;

/** 부모 기준 좌표를 position:absolute 스타일 문자열로 변환 */
export function absoluteStyle(node: FigmaNode): string {
  const left = Math.round(node.x ?? 0);
  const top = Math.round(node.y ?? 0);
  const width = Math.round(node.width);
  const height = Math.round(node.height);
  return `position:absolute; left:${left}px; top:${top}px; width:${width}px; height:${height}px;`;
}

/** 한 Figma 노드를 WebSquare 요소(XmlEl)로 변환 (coarse 매핑) */
export function renderNode(node: FigmaNode, nextId: () => string): XmlEl {
  const id = nextId();
  const style = absoluteStyle(node);

  if (node.type === "TEXT") {
    return el("w2:textbox", { ctype: "Text", id, label: textOf(node), style });
  }
  if (node.children.length > 0) {
    const children = node.children.map((c) => renderNode(c, nextId));
    return el("xf:group", { ctype: "GroupBox", id, style }, children);
  }
  return el("xf:group", { id, style });
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
