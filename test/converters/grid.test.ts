import { describe, it, expect } from "vitest";
import { gridConverter } from "../../src/core/converters/grid.js";
import type { FigmaNode } from "../../src/core/types.js";

const text = (s: string): FigmaNode => ({
  id: "t" + s, type: "TEXT", name: s, characters: s, width: 70, height: 16, children: [],
});
const grid = (cols: string[]): FigmaNode => ({
  id: "g", type: "FRAME", name: "grid", width: 500, height: 153, children: cols.map(text),
});

describe("grid converter", () => {
  it("renders header columns and matching empty body columns", () => {
    const { slots, warnings } = gridConverter.extract(grid(["번호", "이름"]));
    expect(warnings).toEqual([]);
    const xml = gridConverter.render(slots);
    expect(xml.match(/value="번호"/g)?.length).toBe(1);
    expect(xml.match(/value="이름"/g)?.length).toBe(1);
    expect(xml.match(/<w2:row/g)?.length).toBe(2);
    expect(xml.match(/<w2:column/g)?.length).toBe(4);
    expect(xml).toContain('dataList="data:dataList1"');
  });

  it("warns when no columns are found", () => {
    const { warnings } = gridConverter.extract(grid([]));
    expect(warnings[0].message).toContain("컬럼");
  });
});
