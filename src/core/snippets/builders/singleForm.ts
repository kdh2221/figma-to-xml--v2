import { el, cdata, type XmlEl } from "../../xml.js";

const choices = (labels: string[]): XmlEl =>
  el("xf:choices", {}, labels.map((l) =>
    el("xf:item", {}, [el("xf:label", {}, [cdata(l)]), el("xf:value", {}, [cdata("")])])
  ));

export function buildInput(width = "150px"): XmlEl {
  return el("xf:input", { class: "", id: "", placeholder: "", style: `width:${width};` });
}

export function buildSelect(width = "150px"): XmlEl {
  return el("xf:select1", {
    allOption: "true", appearance: "minimal", chooseOption: "", class: "", direction: "auto",
    disabled: "false", disabledClass: "w2selectbox_disabled", id: "", ref: "", renderType: "",
    style: `width: ${width};`, submenuSize: "auto",
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

export function buildCalendar(valueType: "yearMonthDate" | "yearMonth" | "year", width = "120px"): XmlEl {
  return el("w2:inputCalendar", {
    calendarValueType: valueType, focusOnDateSelect: "false", footerDiv: "false", id: "",
    renderDiv: "true", renderType: "component", rightAlign: "false", style: `width: ${width};`,
  });
}

export function buildTextarea(width = "150px"): XmlEl {
  return el("xf:textarea", { class: "", id: "", placeholder: "", style: `width:${width};height: 82px;` });
}

export function buildCheckCombo(width = "150px"): XmlEl {
  return el("xf:checkcombobox", {
    allOption: "", chooseOption: "", direction: "auto", disabled: "false", displayMode: "label",
    id: "", ref: "", style: `width: ${width};`, submenuSize: "auto",
  }, [choices(["A", "B", "C"])]);
}

export function buildAutoComplete(width = "150px"): XmlEl {
  const w2choices = el("w2:choices", {}, ["A", "AB", "ABC"].map((l) =>
    el("w2:item", {}, [el("w2:label", {}, [cdata(l)]), el("w2:value", {}, [cdata("")])])
  ));
  return el("w2:autoComplete", {
    allOption: "", chooseOption: "", editType: "select", id: "", ref: "", search: "start",
    style: `width: ${width};`, submenuSize: "auto", useKeywordHighlight: "false",
  }, [w2choices]);
}

export function buildUpload(width = "250px"): XmlEl {
  return el("w2:upload", { class: "", disabled: "", id: "", imageStyle: "", inputStyle: "", style: `width: ${width};`, type: "" });
}

/** 11_01 텍스트: 폼 어휘의 정적 텍스트 (span). 2_08 타이틀과 별개. */
export function buildFormText(): XmlEl {
  return el("w2:textbox", { id: "", label: "텍스트입니다.", style: "", tagname: "span" });
}

/** 11_04 체크박스(단일): 체크박스그룹과 동일 속성, 빈 항목 1개. */
export function buildCheckboxSingle(): XmlEl {
  return el("xf:select", {
    appearance: "full", cols: "", disabled: "", id: "", ref: "", renderType: "checkboxgroup",
    rows: "", selectedindex: "1", style: "",
  }, [choices([""])]);
}
