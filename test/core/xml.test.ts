import { describe, it, expect } from "vitest";
import { el, serialize, escapeAttr, raw } from "../../src/core/xml.js";

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

describe("raw passthrough", () => {
  it("emits its string verbatim without escaping", () => {
    expect(serialize(raw('<w2:foo a="1"><b/></w2:foo>'))).toBe('<w2:foo a="1"><b/></w2:foo>');
  });

  it("nests inside a built element unescaped", () => {
    const node = el("xf:group", { class: "x" }, [raw("<w2:bar/>")]);
    expect(serialize(node)).toBe('<xf:group class="x"><w2:bar/></xf:group>');
  });
});
