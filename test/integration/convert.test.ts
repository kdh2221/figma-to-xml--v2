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
  it("registers all 6 MVP snippet types", () => {
    expect(registeredTypes().sort()).toEqual(
      ["button", "grid", "inputTable", "pageContainer", "singleInput", "title"].sort()
    );
  });

  it("converts a title region end-to-end via registry", () => {
    const res = convert(frame([text("회원관리")]), "title");
    expect(res.xml).toContain('class="tit_main"');
    expect(res.xml).toContain('label="회원관리"');
    expect(res.warnings).toEqual([]);
  });

  it("propagates extraction warnings (empty grid)", () => {
    const res = convert(frame([]), "grid");
    expect(res.warnings.length).toBeGreaterThan(0);
  });
});
