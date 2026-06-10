import type { XmlEl } from "../../xml.js";

/** 스니핏 루트에 식별 메타를 부착한다. */
export function withMeta(root: XmlEl, category: string, name: string): XmlEl {
  root.attrs.meta_snippetCategory = category;
  root.attrs.meta_snippetName = name;
  root.attrs.meta_snippetKeyComponent = "true";
  return root;
}
