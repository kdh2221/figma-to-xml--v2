import { describe, it, expect } from "vitest";
import { isNoise, denoise } from "../../src/core/denoise.js";
import type { FigmaNode } from "../../src/core/types.js";

const text = (s: string): FigmaNode => ({
  id: "t" + s, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [],
});
const vec = (): FigmaNode => ({ id: "v", type: "VECTOR", name: "Vector", width: 8, height: 8, children: [] });
const frame = (name: string, children: FigmaNode[], w = 200, h = 100): FigmaNode => ({
  id: "f" + name, type: "FRAME", name, width: w, height: h, children,
});

describe("denoise", () => {
  it("isNoise: shape types are noise, text is not", () => {
    expect(isNoise(vec())).toBe(true);
    expect(isNoise(text("발송"))).toBe(false);
  });

  it("isNoise: a textless container (icon group) is noise; a container with text is kept", () => {
    expect(isNoise(frame("icon", [vec(), vec()]))).toBe(true);
    expect(isNoise(frame("card", [text("발송"), vec()]))).toBe(false);
  });

  it("isNoise: textless leaf is noise only when tiny", () => {
    const tinyRect: FigmaNode = { id: "r", type: "RECTANGLE", name: "r", width: 4, height: 8, children: [] };
    const inputBox: FigmaNode = { id: "b", type: "RECTANGLE", name: "b", width: 200, height: 32, children: [] };
    expect(isNoise(tinyRect)).toBe(true);
    expect(isNoise(inputBox)).toBe(false);
  });

  it("denoise removes icon subtrees but keeps text-bearing structure", () => {
    const card = frame("card", [text("발송"), text("0건"), frame("icon", [vec(), vec()])]);
    const out = denoise(card);
    expect(out.children.map((c) => c.type)).toEqual(["TEXT", "TEXT"]);
    expect(out.children.map((c) => c.characters)).toEqual(["발송", "0건"]);
  });
});
