import { el, type XmlEl } from "../../xml.js";

/** 조회영역(schbox): rows 행 × cols 단. 각 칸 = th(라벨)+td(빈 입력). 우측 조회버튼. */
export function buildSearch(rows: number, cols: number): XmlEl {
  const colgroup: XmlEl[] = [];
  for (let c = 0; c < cols; c++) {
    colgroup.push(el("xf:group", { style: "width:100px;", tagname: "col" }));
    colgroup.push(el("xf:group", { style: "", tagname: "col" }));
  }
  const trs: XmlEl[] = [];
  for (let r = 0; r < rows; r++) {
    const cells: XmlEl[] = [];
    for (let c = 0; c < cols; c++) {
      cells.push(
        el("xf:group", { class: "w2tb_th", style: "", tagname: "th" }, [
          el("w2:textbox", { class: "", id: "", label: "조회조건", style: "" }),
        ]),
        el("xf:group", { class: "w2tb_td", style: "", tagname: "td" })
      );
    }
    trs.push(el("xf:group", { class: "", id: "", style: "", tagname: "tr" }, cells));
  }
  const table = el("xf:group", {
    adaptive: "layout", adaptiveThreshold: "768", class: "w2tb tbl ", id: "", style: "", tagname: "table",
  }, [
    el("w2:attributes", {}, [el("w2:summary", {})]),
    el("xf:group", { tagname: "colgroup" }, colgroup),
    ...trs,
  ]);
  const button = el("xf:group", { class: "btn_schbox", id: "", style: "" }, [
    el("w2:button", { class: "btn_cm fill search", disabled: "", escape: "false", id: "", style: "" }, [
      el("w2:textbox", { id: "", label: "조회", style: "", tagname: "span" }),
    ]),
  ]);
  return el("xf:group", { class: "schbox", id: "", style: "" }, [
    el("xf:group", { class: "schbox_inner", id: "", style: "" }, [table]),
    button,
  ]);
}
