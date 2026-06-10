import { el, cdata, type XmlEl } from "../../xml.js";

const choices = (labels: string[]): XmlEl =>
  el("xf:choices", {}, labels.map((l) =>
    el("xf:item", {}, [el("xf:label", {}, [cdata(l)]), el("xf:value", {}, [cdata("")])])
  ));

export function buildInput(width = "150px"): XmlEl {
  return el("xf:input", { class: "", id: "", placeholder: "", style: `width:${width};` });
}

export function buildSelect(): XmlEl {
  return el("xf:select1", {
    allOption: "true", appearance: "minimal", chooseOption: "", class: "", direction: "auto",
    disabled: "false", disabledClass: "w2selectbox_disabled", id: "", ref: "", renderType: "",
    style: "width: 150px;", submenuSize: "auto",
  }, [choices(["new row", "new row"])]);
}

export function buildRadio(): XmlEl {
  return el("xf:select1", {
    appearance: "full", cols: "", disabled: "", id: "", ref: "", renderType: "radiogroup",
    rows: "", selectedIndex: "1", style: "",
  }, [choices(["Atype", "Btype"])]);
}

export function buildCheckboxGroup(): XmlEl {
  return el("xf:select", {
    appearance: "full", cols: "", disabled: "", id: "", ref: "", renderType: "checkboxgroup",
    rows: "", selectedindex: "1", style: "",
  }, [choices(["Atype", "Btype"])]);
}

export function buildCalendar(valueType: "yearMonthDate" | "yearMonth" | "year"): XmlEl {
  return el("w2:inputCalendar", {
    calendarValueType: valueType, focusOnDateSelect: "false", footerDiv: "false", id: "",
    renderDiv: "true", renderType: "component", rightAlign: "false", style: "width: 120px;",
  });
}

export function buildTextarea(): XmlEl {
  return el("xf:textarea", { class: "", id: "", placeholder: "", style: "width:150px;height: 82px;" });
}

export function buildCheckCombo(): XmlEl {
  return el("xf:checkcombobox", {
    allOption: "", chooseOption: "", direction: "auto", disabled: "false", displayMode: "label",
    id: "", ref: "", style: "width: 150px;", submenuSize: "auto",
  }, [choices(["A", "B", "C"])]);
}

export function buildAutoComplete(): XmlEl {
  const w2choices = el("w2:choices", {}, ["A", "AB", "ABC"].map((l) =>
    el("w2:item", {}, [el("w2:label", {}, [cdata(l)]), el("w2:value", {}, [cdata("")])])
  ));
  return el("w2:autoComplete", {
    allOption: "", chooseOption: "", editType: "select", id: "", ref: "", search: "start",
    style: "width: 150px;", submenuSize: "auto", useKeywordHighlight: "false",
  }, [w2choices]);
}

export function buildUpload(): XmlEl {
  return el("w2:upload", { class: "", disabled: "", id: "", imageStyle: "", inputStyle: "", style: "width: 250px;", type: "" });
}
