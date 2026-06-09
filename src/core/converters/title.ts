import type { Converter, FigmaNode, Warning } from "../types.js";
import { el, serialize } from "../xml.js";
import { collectTextNodes, textOf } from "../extract.js";

type TitleSlots = {
  label: string;
} & Record<string, unknown>;

export const titleConverter: Converter<TitleSlots> = {
  type: "title",
  extract(node: FigmaNode) {
    const texts = collectTextNodes(node);
    const warnings: Warning[] = [];
    const label = texts.length > 0 ? textOf(texts[0]) : "";
    if (label === "") warnings.push({ message: "제목 텍스트를 찾지 못했습니다 — 확인 필요" });
    return { slots: { label }, warnings };
  },
  render(slots: TitleSlots) {
    return serialize(
      el("xf:group", { class: "titbox", id: "", style: "" }, [
        el("xf:group", { class: "lt", id: "" }, [
          el("w2:textbox", {
            class: "tit_main", id: "", label: slots.label, style: "", tagname: "",
          }),
        ]),
        el("xf:group", { class: "rt", id: "", style: "" }),
      ])
    );
  },
};
