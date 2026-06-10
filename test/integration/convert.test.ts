import { describe, it, expect } from "vitest";
import { convert, registeredTypes } from "../../src/core/registry.js";
import type { FigmaNode } from "../../src/core/types.js";

const frame = (children: FigmaNode[]): FigmaNode => ({
  id: "f", type: "FRAME", name: "f", width: 300, height: 60, children,
});
const text = (s: string): FigmaNode => ({
  id: "t" + s, type: "TEXT", name: s, characters: s, width: 60, height: 16, children: [],
});

describe("convert (integration)", () => {
  it("registers all snippet types (6 fragment converters + pageAbsolute)", () => {
    expect(registeredTypes().sort()).toEqual(
      ["button", "grid", "inputTable", "pageAbsolute", "pageContainer", "singleInput", "title"].sort()
    );
  });

  it("converts a title region end-to-end via registry", () => {
    const res = convert(frame([text("회원관리")]), "title");
    expect(res.xml).toContain('class="tit_main"');
    expect(res.xml).toContain('label="회원관리"');
    expect(res.warnings).toEqual([]);
  });

  it("converts a whole frame to a full absolute-positioned page", () => {
    const root: FigmaNode = {
      id: "r", type: "FRAME", name: "조회화면", x: 0, y: 0, width: 800, height: 600,
      children: [{ id: "t", type: "TEXT", name: "제목", characters: "제목", x: 10, y: 20, width: 80, height: 20, children: [] }],
    };
    const res = convert(root, "pageAbsolute");
    expect(res.xml).toContain("<?xml");
    expect(res.xml).toContain('class="content_body"');
    expect(res.xml).toContain("position:absolute; left:10px; top:20px;");
    expect(res.warnings).toEqual([]);
  });

  it("propagates extraction warnings (empty grid)", () => {
    const res = convert(frame([]), "grid");
    expect(res.warnings.length).toBeGreaterThan(0);
  });
});
