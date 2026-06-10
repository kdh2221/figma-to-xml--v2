import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import { buildSplit } from "../../../src/core/snippets/builders/split.js";

describe("buildSplit", () => {
  it("makes one componentContainer child per column", () => {
    const xml = serialize(buildSplit([5, 5]));
    expect(xml.match(/meta_componentContainer="true"/g)?.length).toBe(2);
  });

  it("applies col_N class per ratio", () => {
    const xml = serialize(buildSplit([2, 8]));
    expect(xml).toContain('class=" col_2"');
    expect(xml).toContain('class=" col_8"');
  });

  it("wraps in a lybox group", () => {
    expect(serialize(buildSplit([5, 5]))).toContain('class="lybox"');
  });
});
