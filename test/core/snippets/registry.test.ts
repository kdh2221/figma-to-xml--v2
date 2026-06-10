import { describe, it, expect } from "vitest";
import {
  getSnippet, snippetsByCategory, catalogDescriptor,
  LEGACY_REGION_TYPE_TO_ID, defaultSnippetFor, SNIPPETS,
} from "../../../src/core/snippets/registry.js";
import type { FigmaNode } from "../../../src/core/types.js";

describe("snippet registry", () => {
  it("every snippet id is unique", () => {
    const ids = SNIPPETS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getSnippet returns a buildable def", () => {
    const def = getSnippet("title-main");
    expect(def?.category).toBe("02_타이틀");
  });

  it("groups variants under categories", () => {
    const cats = snippetsByCategory();
    const table = cats.find((c) => c.categoryLabel === "입출력테이블");
    expect((table?.variants.length ?? 0)).toBeGreaterThanOrEqual(2);
  });

  it("descriptor has no build functions (serializable)", () => {
    const json = JSON.stringify(catalogDescriptor());
    expect(json).not.toContain("function");
    expect(JSON.parse(json)[0]).toHaveProperty("variants");
  });

  it("legacy region types map to real ids", () => {
    for (const id of Object.values(LEGACY_REGION_TYPE_TO_ID)) {
      expect(getSnippet(id)).toBeTruthy();
    }
  });

  it("defaultSnippetFor returns an existing id with confidence", () => {
    const node: FigmaNode = { id: "n", type: "FRAME", name: "btn_저장", width: 80, height: 30,
      children: [{ id: "t", type: "TEXT", name: "저장", characters: "저장", width: 40, height: 16, children: [] }] };
    const { id, confidence } = defaultSnippetFor(node);
    expect(getSnippet(id)).toBeTruthy();
    expect(confidence).toBe("high");
  });
});
