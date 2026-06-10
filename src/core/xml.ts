/** 자식은 엘리먼트 또는 텍스트(문자열). 문자열은 텍스트 노드로 직렬화된다. */
export type XmlChild = XmlEl | string;

export interface XmlEl {
  tag: string;
  attrs: Record<string, string>;
  children: XmlChild[];
}

export function el(
  tag: string,
  attrs: Record<string, string> = {},
  children: XmlChild[] = []
): XmlEl {
  return { tag, attrs, children };
}

/** 텍스트 노드 이스케이프 (속성과 달리 따옴표는 두어도 무방) */
export function escapeText(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** CDATA 섹션 노드. 내용은 이스케이프하지 않고 <![CDATA[...]]>로 직렬화된다. */
export function cdata(text: string): XmlEl {
  return { tag: "#cdata", attrs: {}, children: [text] };
}

export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function serialize(node: XmlEl): string {
  if (node.tag === "#cdata") {
    const text = node.children.map((c) => (typeof c === "string" ? c : "")).join("");
    return `<![CDATA[${text}]]>`;
  }
  const attrs = Object.entries(node.attrs)
    .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
    .join("");
  if (node.children.length === 0) {
    return `<${node.tag}${attrs}/>`;
  }
  const inner = node.children
    .map((c) => (typeof c === "string" ? escapeText(c) : serialize(c)))
    .join("");
  return `<${node.tag}${attrs}>${inner}</${node.tag}>`;
}
