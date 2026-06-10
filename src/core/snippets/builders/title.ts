import type { FigmaNode } from "../../types.js";
import type { RenderOpts } from "../types.js";
import { el, cdata, type XmlEl } from "../../xml.js";
import { collectTextNodes, textOf } from "../../extract.js";

export type TitleVariant = "main" | "sub";

function firstText(node: FigmaNode): string {
  const texts = collectTextNodes(node);
  return texts.length > 0 ? textOf(texts[0]) : "";
}

/** 단일 체크박스 (11_03 체크박스). 라벨 1개를 가진 checkboxgroup. */
function buildCheckbox(label: string): XmlEl {
  return el("xf:select", {
    appearance: "full", cols: "", disabled: "", id: "",
    meta_snippetCategory: "11_단일입력폼", meta_snippetKeyComponent: "true",
    meta_snippetName: "11_03 체크박스", ref: "", renderType: "checkboxgroup", rows: "",
    selectedindex: "", style: "",
  }, [
    el("xf:choices", {}, [
      el("xf:item", {}, [el("xf:label", {}, [cdata(label)]), el("xf:value", {}, [cdata("")])]),
    ]),
  ]);
}

/** 타이틀그룹(titbox): lt 에 제목/소제목, rt 에 체크박스(opts). */
export function buildTitle(variant: TitleVariant, node: FigmaNode, opts: RenderOpts): XmlEl {
  const cls = variant === "sub" ? "tit_sub" : "tit_main";
  return el("xf:group", { class: "titbox", id: "" }, [
    el("xf:group", { class: "lt", id: "" }, [
      el("w2:textbox", { class: cls, id: "", label: firstText(node), tagname: "" }),
    ]),
    el("xf:group", { class: "rt", id: "" }, (opts.checkboxes ?? []).map(buildCheckbox)),
  ]);
}
