import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import * as F from "../../../src/core/snippets/builders/singleForm.js";

describe("single form controls", () => {
  it("input", () => expect(serialize(F.buildInput("150px"))).toContain("xf:input"));
  it("select", () => expect(serialize(F.buildSelect())).toContain('renderType=""'));
  it("radio", () => expect(serialize(F.buildRadio())).toContain('renderType="radiogroup"'));
  it("checkbox", () => expect(serialize(F.buildCheckboxGroup())).toContain('renderType="checkboxgroup"'));
  it("calendar ymd", () => expect(serialize(F.buildCalendar("yearMonthDate"))).toContain('calendarValueType="yearMonthDate"'));
  it("textarea", () => expect(serialize(F.buildTextarea())).toContain("xf:textarea"));
  it("checkcombo", () => expect(serialize(F.buildCheckCombo())).toContain("xf:checkcombobox"));
  it("autocomplete", () => expect(serialize(F.buildAutoComplete())).toContain("w2:autoComplete"));
  it("upload", () => expect(serialize(F.buildUpload())).toContain("w2:upload"));

  // --- width 파라미터: 기본값은 기존 출력 불변 ---
  it("select default width unchanged", () => expect(serialize(F.buildSelect())).toContain('style="width: 150px;"'));
  it("calendar default width unchanged", () => expect(serialize(F.buildCalendar("yearMonthDate"))).toContain('style="width: 120px;"'));
  it("textarea default width unchanged", () => expect(serialize(F.buildTextarea())).toContain('style="width:150px;height: 82px;"'));
  it("checkcombo default width unchanged", () => expect(serialize(F.buildCheckCombo())).toContain('style="width: 150px;"'));
  it("autocomplete default width unchanged", () => expect(serialize(F.buildAutoComplete())).toContain('style="width: 150px;"'));
  it("upload default width unchanged", () => expect(serialize(F.buildUpload())).toContain('style="width: 250px;"'));

  // --- (100) 변형: width만 100% ---
  it("input 100", () => expect(serialize(F.buildInput("100%"))).toContain('style="width:100%;"'));
  it("select 100", () => expect(serialize(F.buildSelect("100%"))).toContain('style="width: 100%;"'));
  it("calendar 100", () => expect(serialize(F.buildCalendar("yearMonthDate", "100%"))).toContain('style="width: 100%;"'));
  it("textarea 100", () => expect(serialize(F.buildTextarea("100%"))).toContain('style="width:100%;height: 82px;"'));
  it("autocomplete 100", () => expect(serialize(F.buildAutoComplete("100%"))).toContain('style="width: 100%;"'));
  it("checkcombo 100", () => expect(serialize(F.buildCheckCombo("100%"))).toContain('style="width: 100%;"'));
  it("upload 100", () => expect(serialize(F.buildUpload("100%"))).toContain('style="width: 100%;"'));
  it("calendar year type", () => expect(serialize(F.buildCalendar("year"))).toContain('calendarValueType="year"'));

  // --- 신규 빌더 ---
  it("form text is a span textbox with label", () => {
    const xml = serialize(F.buildFormText());
    expect(xml).toContain('tagname="span"');
    expect(xml).toContain('label="텍스트입니다."');
  });
  it("single checkbox has exactly one empty item", () => {
    const xml = serialize(F.buildCheckboxSingle());
    expect(xml).toContain('renderType="checkboxgroup"');
    expect(xml.match(/<xf:item>/g)?.length).toBe(1);
    expect(xml).toContain("<xf:label><![CDATA[]]></xf:label>");
  });
});
