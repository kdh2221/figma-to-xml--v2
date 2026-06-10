import { describe, it, expect } from "vitest";
import {
  pageAbsoluteConverter,
  absoluteStyle,
  renderNode,
  classify,
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

describe("pageAbsolute naming convention (G5/G6)", () => {
  const idGen = () => {
    let n = 0;
    return () => `g${++n}`;
  };
  const leaf = (name: string): FigmaNode => ({
    id: "n", type: "FRAME", name, x: 5, y: 6, width: 100, height: 30, children: [],
  });
  const withText = (name: string, t: string): FigmaNode => ({
    id: "n", type: "FRAME", name, x: 5, y: 6, width: 100, height: 30,
    children: [{ id: "t", type: "TEXT", name: "t", characters: t, x: 0, y: 0, width: 50, height: 16, children: [] }],
  });

  it("classify maps prefixes case-insensitively, null for unknown", () => {
    expect(classify("btn_저장")).toBe("button");
    expect(classify("INP_이름")).toBe("input");
    expect(classify("sel-부서")).toBe("select");
    expect(classify("chk:동의")).toBe("checkbox");
    expect(classify("grid_목록")).toBe("grid");
    expect(classify("tab_정보")).toBe("tab");
    expect(classify("그냥프레임")).toBeNull();
  });

  it("button prefix -> w2:button.btn_cm with label from text", () => {
    expect(serialize(renderNode(withText("btn_저장", "저장"), idGen()))).toBe(
      '<w2:button class="btn_cm" id="g1" style="position:absolute; left:5px; top:6px; width:100px; height:30px;">' +
        '<w2:textbox label="저장" tagname="span"/></w2:button>'
    );
  });

  it("input prefix -> xf:input (children not recursed)", () => {
    expect(serialize(renderNode(leaf("inp_이름"), idGen()))).toBe(
      '<xf:input class="" id="g1" style="position:absolute; left:5px; top:6px; width:100px; height:30px;"/>'
    );
  });

  it("select prefix -> xf:select1 minimal", () => {
    expect(serialize(renderNode(leaf("sel_부서"), idGen()))).toContain(
      '<xf:select1 appearance="minimal" allOption="true" chooseOption="" class="" id="g1"'
    );
  });

  it("table prefix -> tblbox region with snippet meta + position", () => {
    const xml = serialize(renderNode(withText("tbl_상세", "이름"), idGen()));
    expect(xml).toContain('class="tblbox"');
    expect(xml).toContain('meta_snippetCategory="05_입출력테이블"');
    expect(xml).toContain("position:absolute;");
    expect(xml).toContain('label="이름"');
  });

  it("grid prefix -> gvwbox region with snippet meta", () => {
    const xml = serialize(renderNode(withText("grid_목록", "번호"), idGen()));
    expect(xml).toContain('class="gvwbox"');
    expect(xml).toContain('meta_snippetCategory="06_그리드"');
    expect(xml).toContain('value="번호"');
  });

  it("tab prefix -> tbcbox with tabs from text labels", () => {
    const node: FigmaNode = {
      id: "n", type: "FRAME", name: "tab_정보", x: 0, y: 0, width: 200, height: 100,
      children: [
        { id: "t1", type: "TEXT", name: "t", characters: "기본", x: 0, y: 0, width: 40, height: 16, children: [] },
        { id: "t2", type: "TEXT", name: "t", characters: "상세", x: 0, y: 0, width: 40, height: 16, children: [] },
      ],
    };
    const xml = serialize(renderNode(node, idGen()));
    expect(xml).toContain('class="tbcbox"');
    expect(xml).toContain('meta_snippetCategory="04_탭"');
    expect(xml).toContain('label="기본"');
    expect(xml).toContain('label="상세"');
    expect(xml).toContain('id="content2"');
  });
});
