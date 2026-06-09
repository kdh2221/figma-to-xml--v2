import type { Converter, FigmaNode } from "../types.js";
import { el, serialize } from "../xml.js";

type PageContainerSlots = { kind: "sub" | "popup" } & Record<string, unknown>;

export const pageContainerConverter: Converter<PageContainerSlots> = {
  type: "pageContainer",
  extract(_node: FigmaNode) {
    return { slots: { kind: "sub" }, warnings: [] };
  },
  render(slots: PageContainerSlots) {
    const cls = slots.kind === "popup" ? "pop_contents" : "sub_contents";
    return serialize(
      el("xf:group", {
        class: cls, id: "", meta_componentContainer: "true", style: "",
      })
    );
  },
};
