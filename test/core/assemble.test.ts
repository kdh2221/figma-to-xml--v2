import { describe, it, expect } from "vitest";
import { renderRegion, assemblePage } from "../../src/core/assemble.js";
import { serialize } from "../../src/core/xml.js";
import type { FigmaNode } from "../../src/core/types.js";

const text = (s: string): FigmaNode => ({
  id: "t" + s, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [],
});
const frame = (name: string, children: FigmaNode[], w = 300, h = 100): FigmaNode => ({
  id: name, type: "FRAME", name, width: w, height: h, children,
});

describe("renderRegion", () => {
  it("title -> titbox with tit_main label and snippet meta", () => {
    const xml = serialize(renderRegion("title", frame("bar", [text("검색조건")])));
    expect(xml).toContain('class="titbox"');
    expect(xml).toContain('class="tit_main"');
    expect(xml).toContain('label="검색조건"');
    expect(xml).toContain('meta_snippetCategory="02_타이틀"');
  });

  it("grid -> gvwbox with snippet meta and column from text", () => {
    const xml = serialize(renderRegion("grid", frame("g", [text("번호"), text("이름")])));
    expect(xml).toContain('class="gvwbox"');
    expect(xml).toContain('meta_snippetCategory="06_그리드"');
    expect(xml).toContain('value="번호"');
  });

  it("button -> btn_cm with label", () => {
    expect(serialize(renderRegion("button", frame("b", [text("저장")])))).toBe(
      '<w2:button class="btn_cm" id=""><w2:textbox id="" label="저장" tagname="span"/></w2:button>'
    );
  });
});

describe("assemblePage", () => {
  const root = frame("Screen", [
    frame("Frame 123", [text("검색조건"), text("전체")], 1553, 40),
    frame("row", [
      frame("c1", [text("발송"), text("0건")], 379, 132),
      frame("c2", [text("결제"), text("0건")], 379, 132),
      frame("c3", [text("미납"), text("0건")], 379, 132),
    ], 1553, 132),
  ], 1617, 248);

  it("assembles a sub_contents page from heuristic region types", () => {
    const doc = assemblePage(root);
    expect(doc).toContain("<?xml");
    expect(doc).toContain('class="sub_contents"');
    expect(doc).toContain('meta_screenName="Screen"');
    expect(doc).toContain('class="titbox"'); // first region -> title
    expect(doc).toContain('class="gvwbox"'); // repeated cards -> grid
  });

  it("honors a user type override by region id", () => {
    const doc = assemblePage(root, { "Frame 123": "grid" });
    // first region forced to grid -> two gvwbox now (both regions grid)
    expect(doc.match(/class="gvwbox"/g)?.length).toBe(2);
  });

  it("merges consecutive inputTable regions into one table, one row per region", () => {
    const form = frame("Form", [
      frame("r1", [text("플랜명"), text("*"), text("SignSquare")]),
      frame("r2", [text("관리용 이름"), text("*"), text("홍길동")]),
      frame("r3", [text("플랜 설명"), text("플랜 설명 입력하세요")]),
    ], 600, 300);
    const doc = assemblePage(form, { r1: "inputTable", r2: "inputTable", r3: "inputTable" });
    // 단 하나의 테이블(tblbox), 3개 행, 라벨은 th로
    expect(doc.match(/class="tblbox"/g)?.length).toBe(1);
    expect(doc.match(/tagname="tr"/g)?.length).toBe(3);
    expect(doc).toContain('label="플랜명"');
    expect(doc).toContain('label="관리용 이름"');
    expect(doc).toContain('label="플랜 설명"');
    // 값 셀은 빈 입력칸
    expect(doc).toContain("<xf:input");
    // 필수표시 '*'는 라벨로 새지 않는다
    expect(doc).not.toContain('label="*"');
  });
});
