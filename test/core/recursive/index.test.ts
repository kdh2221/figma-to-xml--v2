import { describe, it, expect } from "vitest";
import { convertPageRecursive } from "../../../src/core/recursive/index.js";
import type { FigmaNode } from "../../../src/core/types.js";

let seq = 0;
const F = (name: string, children: FigmaNode[], layoutMode?: string): FigmaNode =>
  ({ id: name + ++seq, type: "FRAME", name, width: 100, height: 38, children, ...(layoutMode ? { layoutMode } : {}) });
const I = (name: string, children: FigmaNode[]): FigmaNode =>
  ({ id: name + ++seq, type: "INSTANCE", name, width: 40, height: 20, children });
const TX = (s: string): FigmaNode =>
  ({ id: "t" + ++seq, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [] });

describe("convertPageRecursive", () => {
  const root = F("Screen", [
    F("Table", [F("row", [I("label", [TX("항목")]), I("\btd", [TX("input field")])], "HORIZONTAL")], "VERTICAL"),
  ]);
  const doc = convertPageRecursive(root);
  it("produces a full WebSquare document shell with the table", () => {
    expect(doc).toContain("<?xml");
    expect(doc).toContain('class="sub_contents"');
    expect(doc).toContain('meta_screenName="Screen"');
    expect(doc).toContain('class="tblbox"');
  });
});
