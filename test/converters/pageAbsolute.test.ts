import { describe, it, expect } from "vitest";
import {
  pageAbsoluteConverter,
  absoluteStyle,
  renderNode,
} from "../../src/core/converters/pageAbsolute.js";
import { serialize } from "../../src/core/xml.js";
import type { FigmaNode } from "../../src/core/types.js";

const text = (s: string, x: number, y: number): FigmaNode => ({
  id: "t", type: "TEXT", name: s, characters: s, x, y, width: 80, height: 20, children: [],
});

describe("pageAbsolute", () => {
  it("absoluteStyle maps x/y/w/h to position:absolute", () => {
    const node: FigmaNode = {
      id: "n", type: "FRAME", name: "n", x: 12, y: 6, width: 100, height: 40, children: [],
    };
    expect(absoluteStyle(node)).toBe(
      "position:absolute; left:12px; top:6px; width:100px; height:40px;"
    );
  });

  it("renderNode maps a TEXT node to a positioned w2:textbox", () => {
    let n = 0;
    const xml = serialize(renderNode(text("제목", 10, 20), () => `g${++n}`));
    expect(xml).toBe(
      '<w2:textbox ctype="Text" id="g1" label="제목" ' +
        'style="position:absolute; left:10px; top:20px; width:80px; height:20px;"/>'
    );
  });

  it("renderNode maps a container with children to xf:group GroupBox + recurses", () => {
    let n = 0;
    const frame: FigmaNode = {
      id: "f", type: "FRAME", name: "box", x: 0, y: 0, width: 200, height: 50,
      children: [text("A", 5, 5)],
    };
    const xml = serialize(renderNode(frame, () => `g${++n}`));
    expect(xml).toContain('<xf:group ctype="GroupBox" id="g1"');
    expect(xml).toContain('<w2:textbox ctype="Text" id="g2" label="A"');
  });

  it("renderNode maps a childless non-text leaf to an empty positioned group", () => {
    let n = 0;
    const rect: FigmaNode = {
      id: "r", type: "RECTANGLE", name: "r", x: 1, y: 2, width: 3, height: 4, children: [],
    };
    expect(serialize(renderNode(rect, () => `g${++n}`))).toBe(
      '<xf:group id="g1" style="position:absolute; left:1px; top:2px; width:3px; height:4px;"/>'
    );
  });

  it("converter render produces a full loadable document with content_body root", () => {
    const root: FigmaNode = {
      id: "r", type: "FRAME", name: "회원관리", width: 800, height: 600,
      children: [text("제목", 10, 20)],
    };
    const { slots, warnings } = pageAbsoluteConverter.extract(root);
    expect(warnings).toEqual([]);
    const doc = pageAbsoluteConverter.render(slots);
    expect(doc).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(doc).toContain('xmlns:w2="http://www.inswave.com/websquare"');
    expect(doc).toContain('meta_screenName="회원관리"');
    expect(doc).toContain("<w2:type>COMPONENT</w2:type>");
    expect(doc).toContain('class="content_body"');
    expect(doc).toContain('screentitle="회원관리"');
    expect(doc).toContain('style="width:800px; height:600px;"');
    expect(doc).toContain('label="제목"');
  });
});
