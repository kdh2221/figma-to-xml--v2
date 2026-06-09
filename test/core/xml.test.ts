import { describe, it, expect } from "vitest";
import { el, serialize, escapeAttr } from "../../src/core/xml.js";

describe("xml builder", () => {
  it("serializes a self-closing element with attributes in given order", () => {
    const node = el("w2:input", { class: "", id: "x", style: "" });
    expect(serialize(node)).toBe('<w2:input class="" id="x" style=""/>');
  });

  it("serializes nested children", () => {
    const node = el("w2:button", { class: "btn_cm" }, [
      el("w2:textbox", { label: "기본버튼", tagname: "span" }),
    ]);
    expect(serialize(node)).toBe(
      '<w2:button class="btn_cm"><w2:textbox label="기본버튼" tagname="span"/></w2:button>'
    );
  });

  it("escapes attribute values", () => {
    expect(escapeAttr('a"b&c<d>')).toBe("a&quot;b&amp;c&lt;d&gt;");
  });
});
