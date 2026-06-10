import type { Converter, FigmaNode, Warning } from "../types.js";
import { el, serialize, type XmlEl } from "../xml.js";
import { collectTextNodes, textOf } from "../extract.js";

type InputTableSlots = { labels: string[]; cols: number } & Record<string, unknown>;

/** 입출력테이블 루트 XmlEl 빌드 (다른 변환기에서 재사용 가능) */
export function buildInputTable(slots: InputTableSlots): XmlEl {
  const cols = Math.max(1, slots.cols);

  // colgroup: 라벨열(100px) + 데이터열 쌍을 cols 만큼
  const colgroupChildren: XmlEl[] = [];
  for (let i = 0; i < cols; i++) {
    colgroupChildren.push(el("xf:group", { style: "width:100px;", tagname: "col" }));
    colgroupChildren.push(el("xf:group", { tagname: "col" }));
  }

  // 행: 라벨을 cols개씩 끊어 th/td 쌍 생성. 마지막 행은 빈 th로 패딩.
  const rows: XmlEl[] = [];
  for (let r = 0; r < slots.labels.length; r += cols) {
    const cells: XmlEl[] = [];
    for (let c = 0; c < cols; c++) {
      const label = slots.labels[r + c];
      const th = el("xf:group", { class: "w2tb_th", tagname: "th" }, [
        el("w2:textbox", label !== undefined ? { label } : {}),
      ]);
      const td = el("xf:group", { class: "w2tb_td", tagname: "td" });
      cells.push(th, td);
    }
    rows.push(el("xf:group", { tagname: "tr" }, cells));
  }

  return el("xf:group", { class: "tblbox", id: "", style: "" }, [
    el("xf:group", { class: "w2tb tbl", tagname: "table" }, [
      el("xf:group", { tagname: "colgroup" }, colgroupChildren),
      ...rows,
    ]),
  ]);
}

/** 행 기반 폼 테이블 빌드: 프레임 1개 = 1행. th=라벨, td=빈 입력칸(xf:input).
 *  연속된 입출력테이블 영역을 하나로 합칠 때 사용 (각 영역이 한 행). */
export function buildFormTable(labels: string[]): XmlEl {
  const colgroup = el("xf:group", { tagname: "colgroup" }, [
    el("xf:group", { style: "width:100px;", tagname: "col" }),
    el("xf:group", { tagname: "col" }),
  ]);
  const rows = labels.map((label) =>
    el("xf:group", { tagname: "tr" }, [
      el("xf:group", { class: "w2tb_th", tagname: "th" }, [el("w2:textbox", { label })]),
      el("xf:group", { class: "w2tb_td", tagname: "td" }, [el("xf:input", { class: "", id: "" })]),
    ])
  );
  return el("xf:group", { class: "tblbox", id: "", style: "" }, [
    el("xf:group", { class: "w2tb tbl", tagname: "table" }, [colgroup, ...rows]),
  ]);
}

export const inputTableConverter: Converter<InputTableSlots> = {
  type: "inputTable",
  extract(node: FigmaNode) {
    const labels = collectTextNodes(node).map(textOf).filter((s) => s !== "");
    const warnings: Warning[] = [];
    if (labels.length === 0) {
      warnings.push({ message: "테이블 라벨을 찾지 못했습니다 — 확인 필요" });
    }
    return { slots: { labels, cols: 2 }, warnings };
  },
  render(slots: InputTableSlots) {
    return serialize(buildInputTable(slots));
  },
};
