import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { gridConverter } from "../../src/core/converters/grid.js";
import { buttonConverter } from "../../src/core/converters/button.js";

function templateOrSkip(name: string): string | null {
  const path = `templates/${name}`;
  return existsSync(path) ? readFileSync(path, "utf8") : null;
}

describe("template fidelity (structural)", () => {
  it("grid output uses the same core tags/classes as the snippet", () => {
    const tpl = templateOrSkip("grid.xml");
    if (!tpl) return; // Studio 미동기화 환경: 스킵
    for (const token of ["gvwbox", "w2:gridView", "w2:header", "w2:gBody", "w2:column"]) {
      expect(tpl).toContain(token);
    }
    const out = gridConverter.render({ columns: [{ label: "A", width: 70 }], height: 153 });
    for (const token of ["gvwbox", "w2:gridView", "w2:header", "w2:gBody", "w2:column"]) {
      expect(out).toContain(token);
    }
  });

  it("button output uses the same core class as the snippet", () => {
    const tpl = templateOrSkip("button.xml");
    if (!tpl) return;
    expect(tpl).toContain("btn_cm");
    expect(buttonConverter.render({ label: "x" })).toContain("btn_cm");
  });
});
