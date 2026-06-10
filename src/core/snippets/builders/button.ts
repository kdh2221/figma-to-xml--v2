import type { FigmaNode } from "../../types.js";
import { el, type XmlEl } from "../../xml.js";
import { collectTextNodes, textOf } from "../../extract.js";

function firstText(node: FigmaNode): string {
  const texts = collectTextNodes(node);
  return texts.length > 0 ? textOf(texts[0]) : "";
}

export function buildButton(node: FigmaNode): XmlEl {
  return el("w2:button", { class: "btn_cm", id: "" }, [
    el("w2:textbox", { id: "", label: firstText(node), tagname: "span" }),
  ]);
}

export function buildText(node: FigmaNode): XmlEl {
  return el("w2:textbox", { id: "", label: firstText(node), tagname: "span" });
}
