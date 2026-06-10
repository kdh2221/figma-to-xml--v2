import { describe, it, expect } from "vitest";
import { convert } from "../../src/core/registry.js";
import type { FigmaNode } from "../../src/core/types.js";

const node: FigmaNode = { id: "n", type: "FRAME", name: "n", width: 1, height: 1, children: [] };

describe("convert", () => {
  it("returns a warning and empty xml for an unknown snippet type", () => {
    const res = convert(node, "doesNotExist" as never);
    expect(res.xml).toBe("");
    expect(res.warnings[0].message).toContain("지원하지 않는");
  });
});

describe("convert overrides", () => {
  const text = (s: string) => ({ id: "t" + s, type: "TEXT", name: s, characters: s, width: 60, height: 16, children: [] });
  const frame = (children: any[]) => ({ id: "f", type: "FRAME", name: "f", width: 300, height: 60, children });

  it("threads cols override into inputTable (3 labels, cols=3 => 1 row)", () => {
    const res = convert(frame([text("A"), text("B"), text("C")]), "inputTable", { cols: 3 });
    expect(res.xml.match(/tagname="tr"/g)?.length).toBe(1);
  });

  it("threads kind override into singleInput (kind=select => xf:select1)", () => {
    const res = convert(frame([]), "singleInput", { kind: "select" });
    expect(res.xml).toContain("xf:select1");
  });

  it("ignores undefined overrides (2-arg call still works)", () => {
    const res = convert(frame([text("이름")]), "title");
    expect(res.xml).toContain('label="이름"');
  });
});
