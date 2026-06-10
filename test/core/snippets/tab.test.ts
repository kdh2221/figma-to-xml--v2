import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import { buildTab } from "../../../src/core/snippets/builders/tab.js";
import type { FigmaNode } from "../../../src/core/types.js";

const frame = (texts: string[]): FigmaNode => ({
  id: "f", type: "FRAME", name: "f", width: 300, height: 40,
  children: texts.map((s, i) => ({ id: "t" + i, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [] })),
});

describe("buildTab", () => {
  it("emits one w2:tabs per label", () => {
    const xml = serialize(buildTab(frame(["탭1", "탭2", "탭3"])));
    expect(xml.match(/<w2:tabs/g)?.length).toBe(3);
  });

  it("falls back to TAB1 when no text", () => {
    expect(serialize(buildTab(frame([])))).toContain('label="TAB1"');
  });
});
