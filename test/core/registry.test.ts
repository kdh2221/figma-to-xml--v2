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
