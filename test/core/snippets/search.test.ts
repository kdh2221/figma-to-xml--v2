import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import { buildSearch } from "../../../src/core/snippets/builders/search.js";

describe("buildSearch", () => {
  it("renders rows x cols th/td pairs", () => {
    const xml = serialize(buildSearch(2, 2)); // 2행 2단 => 2 tr, 각 행 2쌍 => 4 th
    expect(xml.match(/tagname="tr"/g)?.length).toBe(2);
    expect(xml.match(/class="w2tb_th"/g)?.length).toBe(4);
  });

  it("includes a search button", () => {
    expect(serialize(buildSearch(1, 2))).toContain("btn_cm fill search");
  });

  it("wraps in schbox > schbox_inner", () => {
    const xml = serialize(buildSearch(1, 2));
    expect(xml).toContain('class="schbox"');
    expect(xml).toContain('class="schbox_inner"');
  });
});
