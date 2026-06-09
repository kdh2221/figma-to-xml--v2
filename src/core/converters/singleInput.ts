import type { Converter, FigmaNode } from "../types.js";
import { el, serialize } from "../xml.js";
import { collectTextNodes, textOf } from "../extract.js";

export type InputKind = "input" | "select" | "textbox" | "textarea";

type SingleInputSlots = { kind: InputKind; text: string } & Record<string, unknown>;

export const singleInputConverter: Converter<SingleInputSlots> = {
  type: "singleInput",
  extract(node: FigmaNode) {
    const texts = collectTextNodes(node);
    const text = texts.length > 0 ? textOf(texts[0]) : "";
    // 종류는 UI에서 사람이 지정. 추출 단계 기본값은 input.
    return { slots: { kind: "input", text }, warnings: [] };
  },
  render(slots: SingleInputSlots) {
    switch (slots.kind) {
      case "select":
        return serialize(
          el("xf:select1", {
            appearance: "minimal", allOption: "true", chooseOption: "", class: "", id: "",
          })
        );
      case "textbox":
        return serialize(
          el("w2:textbox", { id: "", label: slots.text, style: "", tagname: "span" })
        );
      case "textarea":
        return serialize(el("xf:textarea", { class: "", id: "", style: "" }));
      case "input":
      default:
        return serialize(el("xf:input", { class: "", id: "", style: "" }));
    }
  },
};
