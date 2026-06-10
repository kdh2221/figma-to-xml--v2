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
});
