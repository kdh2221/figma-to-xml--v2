import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import * as S from "../../../src/core/snippets/builders/statics.js";
import type { FigmaNode } from "../../../src/core/types.js";

const frame = (texts: string[]): FigmaNode => ({
  id: "f", type: "FRAME", name: "f", width: 300, height: 100,
  children: texts.map((s, i) => ({ id: "t" + i, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [] })),
});

describe("static snippets", () => {
  it("grid reuses buildGrid with extracted columns", () => {
    expect(serialize(S.buildGridForNode(frame(["번호", "이름"])))).toContain("w2:gridView");
  });
  it("accordion emits a w2:accordion", () => {
    expect(serialize(S.buildAccordion())).toContain("w2:accordion");
  });
  it("tree emits a w2:treeview", () => {
    expect(serialize(S.buildTree())).toContain("w2:treeview");
  });
  it("message list emits a ul list", () => {
    expect(serialize(S.buildMessageList())).toContain('tagname="ul"');
  });
  it("charts emit fusionchart", () => {
    expect(serialize(S.buildChartBar())).toContain('chartType="Column2D"');
    expect(serialize(S.buildChartPie())).toContain('chartType="Pie2D"');
  });
  it("schedule emits a scheduleCalendar", () => {
    expect(serialize(S.buildSchedule())).toContain("w2:scheduleCalendar");
  });
});
