import { describe, it, expect } from "vitest";
import { collectTextNodes, directTextChildren } from "../../src/core/extract.js";
import type { FigmaNode } from "../../src/core/types.js";

function frame(children: FigmaNode[]): FigmaNode {
  return { id: "f", type: "FRAME", name: "f", width: 100, height: 50, children };
}
function text(s: string): FigmaNode {
  return { id: "t" + s, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [] };
}

describe("extract", () => {
  it("collectTextNodes returns all TEXT descendants in document order", () => {
    const root = frame([text("A"), frame([text("B"), text("C")])]);
    expect(collectTextNodes(root).map((n) => n.characters)).toEqual(["A", "B", "C"]);
  });

  it("directTextChildren returns only immediate TEXT children", () => {
    const root = frame([text("A"), frame([text("B")])]);
    expect(directTextChildren(root).map((n) => n.characters)).toEqual(["A"]);
  });
});
