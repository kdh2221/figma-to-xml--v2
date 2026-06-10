import { describe, it, expect } from "vitest";
import { classifyRegion, analyzeRegions } from "../../src/core/regions.js";
import type { FigmaNode } from "../../src/core/types.js";

const text = (s: string): FigmaNode => ({
  id: "t" + s, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [],
});
const frame = (name: string, children: FigmaNode[], w = 300, h = 100): FigmaNode => ({
  id: "f" + name, type: "FRAME", name, width: w, height: h, children,
});
const card = (i: number): FigmaNode => frame("card" + i, [text("발송"), text("0건")], 379, 132);

describe("classifyRegion", () => {
  it("uses layer-name prefix with high confidence", () => {
    expect(classifyRegion(frame("btn_저장", [text("저장")]))).toEqual({ type: "button", confidence: "high" });
    expect(classifyRegion(frame("grid_목록", [text("번호")]))).toEqual({ type: "grid", confidence: "high" });
  });

  it("detects repeated similar children as grid", () => {
    const row = frame("row", [card(1), card(2), card(3), card(4)], 1553, 132);
    expect(classifyRegion(row)).toEqual({ type: "grid", confidence: "medium" });
  });

  it("detects a wide short labeled region as title", () => {
    const bar = frame("Frame 123", [text("검색조건"), text("전체")], 1553, 40);
    expect(classifyRegion(bar)).toEqual({ type: "title", confidence: "medium" });
  });
});

describe("analyzeRegions", () => {
  it("segments root direct children into classified regions", () => {
    const root = frame("Screen", [
      frame("Frame 123", [text("검색조건"), text("전체")], 1553, 40),
      frame("row", [card(1), card(2), card(3), card(4)], 1553, 132),
    ], 1617, 248);
    const regions = analyzeRegions(root);
    expect(regions).toHaveLength(2);
    expect(regions[0].type).toBe("title");
    expect(regions[1].type).toBe("grid");
    expect(regions[1].texts).toContain("발송");
  });
});
