export interface XmlEl {
  tag: string;
  attrs: Record<string, string>;
  children: XmlEl[];
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
  if (node.children.length === 0) {
    return `<${node.tag}${attrs}/>`;
  }
  const inner = node.children.map(serialize).join("");
  return `<${node.tag}${attrs}>${inner}</${node.tag}>`;
}
