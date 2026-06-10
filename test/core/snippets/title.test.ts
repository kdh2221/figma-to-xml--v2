import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import { buildTitle } from "../../../src/core/snippets/builders/title.js";
import type { FigmaNode } from "../../../src/core/types.js";

const frame = (texts: string[]): FigmaNode => ({
  id: "f", type: "FRAME", name: "f", width: 300, height: 40,
  children: texts.map((s, i) => ({ id: "t" + i, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [] })),
});

describe("buildTitle", () => {
  it("main variant uses tit_main with first text", () => {
    const xml = serialize(buildTitle("main", frame(["제목"]), {}));
    expect(xml).toContain('class="tit_main"');
    expect(xml).toContain('label="제목"');
    expect(xml).toContain('class="titbox"');
  });

  it("sub variant uses tit_sub", () => {
    expect(serialize(buildTitle("sub", frame(["소제목"]), {}))).toContain('class="tit_sub"');
  });

  it("main variant places checkboxes in rt group", () => {
    const xml = serialize(buildTitle("main", frame(["제목"]), { checkboxes: ["동의"] }));
    expect(xml).toContain('renderType="checkboxgroup"');
    expect(xml).toContain("동의");
  });
});
