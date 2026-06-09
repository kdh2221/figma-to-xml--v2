import type { Converter, FigmaNode, Warning } from "../types.js";
import { el, serialize } from "../xml.js";
import { collectTextNodes, textOf } from "../extract.js";

type ButtonSlots = { label: string } & Record<string, unknown>;

export const buttonConverter: Converter<ButtonSlots> = {
  type: "button",
  extract(node: FigmaNode) {
    const texts = collectTextNodes(node);
    const warnings: Warning[] = [];
    const label = texts.length > 0 ? textOf(texts[0]) : "";
    if (label === "") warnings.push({ message: "버튼 라벨을 찾지 못했습니다 — 확인 필요" });
    return { slots: { label }, warnings };
  },
  render(slots: ButtonSlots) {
    return serialize(
      el("w2:button", { class: "btn_cm", id: "", style: "" }, [
        el("w2:textbox", { id: "", label: slots.label, style: "", tagname: "span" }),
      ])
    );
  },
};
