export interface XmlEl {
  tag: string;
  attrs: Record<string, string>;
  children: XmlEl[];
  /** 텍스트 콘텐츠가 필요한 드문 경우 (CDATA 등). 보통 미사용. */
  text?: string;
}

export function el(
  tag: string,
  attrs: Record<string, string> = {},
  children: XmlEl[] = []
): XmlEl {
  return { tag, attrs, children };
}

export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function serialize(node: XmlEl): string {
  const attrs = Object.entries(node.attrs)
    .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
    .join("");
  if (node.text !== undefined) {
    return `<${node.tag}${attrs}>${node.text}</${node.tag}>`;
  }
  if (node.children.length === 0) {
    return `<${node.tag}${attrs}/>`;
  }
  const inner = node.children.map(serialize).join("");
  return `<${node.tag}${attrs}>${inner}</${node.tag}>`;
}
