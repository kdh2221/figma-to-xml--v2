import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import { buildTableForNode, buildListTableForNode, buildMultiTableForNode } from "../../../src/core/snippets/builders/table.js";
import type { FigmaNode } from "../../../src/core/types.js";

const frame = (texts: string[]): FigmaNode => ({
  id: "f", type: "FRAME", name: "f", width: 300, height: 100,
  children: texts.map((s, i) => ({ id: "t" + i, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [] })),
});

describe("buildTableForNode", () => {
  it("cols=2 with 2 labels => 1 row, 2 th", () => {
    const xml = serialize(buildTableForNode(frame(["A", "B"]), 2));
    expect(xml.match(/tagname="tr"/g)?.length).toBe(1);
    expect(xml.match(/class="w2tb_th"/g)?.length).toBe(2);
  });

  it("cols=1 with 3 labels => 3 rows", () => {
    const xml = serialize(buildTableForNode(frame(["A", "B", "C"]), 1));
    expect(xml.match(/tagname="tr"/g)?.length).toBe(3);
  });
});

describe("list/multi table from node", () => {
  it("list table uses node text as column headers", () => {
    const xml = serialize(buildListTableForNode(frame(["A", "B"])));
    expect(xml.match(/class="w2tb_th tac"/g)?.length).toBe(2);
    expect(xml).toContain('label="A"');
  });
  it("multi table has a row-header column", () => {
    const xml = serialize(buildMultiTableForNode(frame(["A", "B"])));
    expect(xml).toContain('style="width:100px;"');
    expect(xml.match(/class="w2tb_th tac"/g)?.length).toBe(2);
  });
});
