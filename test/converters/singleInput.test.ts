import { describe, it, expect } from "vitest";
import { singleInputConverter } from "../../src/core/converters/singleInput.js";
import type { FigmaNode } from "../../src/core/types.js";

const node = (text?: string): FigmaNode => ({
  id: "i", type: "FRAME", name: "field", width: 120, height: 32,
  children: text ? [{ id: "t", type: "TEXT", name: text, characters: text, width: 80, height: 16, children: [] }] : [],
});

describe("singleInput converter", () => {
  it("defaults to xf:input", () => {
    const { slots } = singleInputConverter.extract(node());
    expect(slots.kind).toBe("input");
    expect(singleInputConverter.render({ ...slots, kind: "input" })).toBe(
      '<xf:input class="" id="" style=""/>'
    );
  });

  it("renders xf:select1 minimal for kind=select", () => {
    expect(singleInputConverter.render({ kind: "select", text: "" })).toBe(
      '<xf:select1 appearance="minimal" allOption="true" chooseOption="" class="" id=""/>'
    );
  });

  it("renders w2:textbox with label for kind=textbox", () => {
    expect(singleInputConverter.render({ kind: "textbox", text: "안내문" })).toBe(
      '<w2:textbox id="" label="안내문" style="" tagname="span"/>'
    );
  });

  it("renders xf:textarea for kind=textarea", () => {
    expect(singleInputConverter.render({ kind: "textarea", text: "" })).toBe(
      '<xf:textarea class="" id="" style=""/>'
    );
  });
});
