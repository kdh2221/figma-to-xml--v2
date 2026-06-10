import type { FigmaNode } from "../../types.js";
import { el, type XmlEl } from "../../xml.js";
import { collectTextNodes, textOf } from "../../extract.js";

/** 탭컨트롤: 텍스트들 = 탭 라벨. */
export function buildTab(node: FigmaNode): XmlEl {
  const found = collectTextNodes(node).map(textOf).filter((s) => s !== "");
  const labels = found.length > 0 ? found : ["TAB1"];
  const tabs = labels.map((label, i) =>
    el("w2:tabs", { disabled: "false", style: "", id: `tabs${i + 1}`, label })
  );
  const contents = labels.map((_, i) =>
    el("w2:content", { alwaysDraw: "false", style: "", id: `content${i + 1}` })
  );
  return el("xf:group", { id: "", class: "tbcbox" }, [
    el("w2:tabControl", { alwaysDraw: "false", style: "", id: "", class: "tbc" }, [...tabs, ...contents]),
  ]);
}
