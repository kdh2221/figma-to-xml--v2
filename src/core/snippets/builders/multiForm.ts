import { el, type XmlEl } from "../../xml.js";

const flex = (children: XmlEl[], cls = "flex"): XmlEl =>
  el("xf:group", { class: cls, id: "" }, children);

const input = (width?: string): XmlEl =>
  el("xf:input", width ? { class: "", id: "", placeholder: "", style: `width:${width};` } : { class: "", id: "", style: "" });

const searchBtn = (): XmlEl =>
  el("w2:button", { class: "btn_cm search icon", id: "", style: "" }, [
    el("w2:textbox", { id: "", label: "검색", style: "", tagname: "span" }),
  ]);

const span = (label: string): XmlEl => el("w2:span", { id: "", label, style: "" });

const plainSelect = (): XmlEl =>
  el("xf:select1", {
    allOption: "false", appearance: "minimal", chooseOption: "false", direction: "auto",
    disabled: "false", disabledClass: "w2selectbox_disabled", id: "", style: "", submenuSize: "auto",
  });

export function buildPhone(): XmlEl {
  return flex([plainSelect(), span("-"), input(), span("-"), input()]);
}

export function buildEmail(): XmlEl {
  return flex([input("150px"), span("@"), input("150px"), plainSelect()]);
}

export function buildAddress(): XmlEl {
  return el("xf:group", { class: "flex_col", id: "", style: "" }, [
    flex([input("100%"), searchBtn(), input("100%")]),
    input("100%"),
    input("100%"),
  ]);
}

export function buildPeriod(): XmlEl {
  const cal = (): XmlEl => el("w2:inputCalendar", {
    calendarValueType: "yearMonthDate", focusOnDateSelect: "false", footerDiv: "true", id: "",
    renderDiv: "true", renderType: "", rightAlign: "false", style: "width: 120px;",
  });
  return flex([cal(), span("~"), cal()]);
}

export function buildAmount(): XmlEl {
  return flex([
    el("xf:input", { class: "tar", dataType: "number", editType: "", id: "", placeholder: "", style: "width:150px;", type: "" }),
    el("w2:textbox", { id: "", label: "원", style: "", tagname: "span" }),
  ]);
}

export function buildCodeSearch(): XmlEl {
  return flex([
    el("xf:input", { class: "flex_no", id: "", placeholder: "", style: "width:150px;" }),
    searchBtn(),
    input("200px"),
  ]);
}
