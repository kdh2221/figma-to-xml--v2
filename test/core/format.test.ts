import { describe, it, expect } from "vitest";
import { prettyXml } from "../../src/core/format.js";

describe("prettyXml", () => {
  it("returns a self-closing root unchanged (no children)", () => {
    expect(prettyXml('<xf:input class="" id=""/>')).toBe('<xf:input class="" id=""/>');
  });

  it("indents nested elements one level per depth", () => {
    const compact = '<a><b x="1"/></a>';
    expect(prettyXml(compact)).toBe('<a>\n  <b x="1"/>\n</a>');
  });

  it("handles multiple children and deeper nesting", () => {
    const compact = '<a><b><c/></b><d/></a>';
    expect(prettyXml(compact)).toBe(
      ["<a>", "  <b>", "    <c/>", "  </b>", "  <d/>", "</a>"].join("\n")
    );
  });

  it("returns empty string unchanged", () => {
    expect(prettyXml("")).toBe("");
  });

  it("keeps an XML declaration at depth 0 without affecting indentation", () => {
    const compact = '<?xml version="1.0"?><a><b/></a>';
    expect(prettyXml(compact)).toBe('<?xml version="1.0"?>\n<a>\n  <b/>\n</a>');
  });

  it("preserves text content inline with its element", () => {
    const compact = "<a><b>COMPONENT</b><c/></a>";
    expect(prettyXml(compact)).toBe("<a>\n  <b>COMPONENT</b>\n  <c/>\n</a>");
  });
});
