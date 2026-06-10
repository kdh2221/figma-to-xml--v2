import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import { buildButton, buildText } from "../../../src/core/snippets/builders/button.js";
import type { FigmaNode } from "../../../src/core/types.js";

const frame = (s: string): FigmaNode => ({
  id: "f", type: "FRAME", name: "f", width: 80, height: 30,
  children: [{ id: "t", type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [] }],
});

describe("button/text", () => {
  it("button wraps first text in a span textbox", () => {
    const xml = serialize(buildButton(frame("저장")));
    expect(xml).toContain("btn_cm");
    expect(xml).toContain('label="저장"');
    expect(xml).toContain('tagname="span"');
  });

  it("text is a span textbox", () => {
    expect(serialize(buildText(frame("안내")))).toContain('label="안내"');
  });
});
