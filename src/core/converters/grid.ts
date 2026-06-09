import type { Converter, FigmaNode, Warning } from "../types.js";
import { el, serialize, type XmlEl } from "../xml.js";
import { collectTextNodes, textOf } from "../extract.js";

type GridSlots = { columns: { label: string; width: number }[]; height: number } & Record<string, unknown>;

export const gridConverter: Converter<GridSlots> = {
  type: "grid",
  extract(node: FigmaNode) {
    const labels = collectTextNodes(node).map(textOf).filter((s) => s !== "");
    const warnings: Warning[] = [];
    if (labels.length === 0) {
      warnings.push({ message: "그리드 컬럼(헤더 텍스트)을 찾지 못했습니다 — 확인 필요" });
    }
    const columns = labels.map((label) => ({ label, width: 70 }));
    return { slots: { columns, height: Math.round(node.height) }, warnings };
  },
  render(slots: GridSlots) {
    const headerColumns: XmlEl[] = slots.columns.map((c, i) =>
      el("w2:column", {
        blockSelect: "false", displayMode: "label", id: `column${i + 1}`,
        inputType: "text", removeBorderStyle: "false", value: c.label, width: String(c.width),
      })
    );
    const bodyColumns: XmlEl[] = slots.columns.map((c, i) =>
      el("w2:column", {
        blockSelect: "false", displayMode: "label", id: `col${i + 1}`,
        inputType: "text", removeBorderStyle: "false", width: String(c.width),
      })
    );

    return serialize(
      el("xf:group", { adaptiveThreshold: "", class: "gvwbox", id: "", style: "" }, [
        el(
          "w2:gridView",
          {
            autoFit: "allColumn", class: "gvw", dataList: "data:dataList1",
            focusMode: "row", id: "", style: `height: ${slots.height}px;`,
          },
          [
            el("w2:header", { id: "header1", style: "" }, [
              el("w2:row", { id: "row1", style: "" }, headerColumns),
            ]),
            el("w2:gBody", { id: "gBody1", style: "" }, [
              el("w2:row", { id: "row2", style: "" }, bodyColumns),
            ]),
          ]
        ),
      ])
    );
  },
};
