import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import { convertTree } from "../../../src/core/recursive/engine.js";
import type { FigmaNode } from "../../../src/core/types.js";

let seq = 0;
const F = (name: string, children: FigmaNode[], layoutMode?: string): FigmaNode =>
  ({ id: name + ++seq, type: "FRAME", name, width: 100, height: 38, children, ...(layoutMode ? { layoutMode } : {}) });
const I = (name: string, children: FigmaNode[]): FigmaNode =>
  ({ id: name + ++seq, type: "INSTANCE", name, width: 40, height: 20, children });
const TX = (s: string): FigmaNode =>
  ({ id: "t" + ++seq, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [] });
const VEC = (): FigmaNode => ({ id: "v" + ++seq, type: "VECTOR", name: "Icon", width: 12, height: 12, children: [] });

const ser = (n: FigmaNode) => convertTree(n).map(serialize).join("");

describe("convertTree", () => {
  it("recognizes a nested Table anywhere in the tree", () => {
    const root = F("root", [
      F("section", [
        F("Table", [F("row", [I("label", [TX("항목")]), I("\btd", [TX("input field")])], "HORIZONTAL")], "VERTICAL"),
      ]),
    ]);
    const xml = ser(root);
    expect(xml).toContain('class="tblbox"');
    expect((xml.match(/tagname="th"/g) ?? []).length).toBe(1);
  });
  it("emits a textbox for an unrecognized TEXT (no content loss)", () => {
    const root = F("root", [TX("그냥 텍스트")]);
    expect(ser(root)).toContain('label="그냥 텍스트"');
  });
  it("skips decorative (text-less vector/icon) nodes", () => {
    const root = F("root", [VEC(), F("iconGroup", [VEC()])]);
    expect(ser(root)).toBe("");
  });
});
