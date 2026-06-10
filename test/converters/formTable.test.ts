import { describe, it, expect } from "vitest";
import { classifyText, extractFields, hasFormControls, buildFormFromNode } from "../../src/core/converters/formTable.js";
import { serialize } from "../../src/core/xml.js";
import type { FigmaNode } from "../../src/core/types.js";

const text = (s: string, x: number, y: number): FigmaNode => ({
  id: "t" + s, type: "TEXT", name: s, characters: s, x, y, width: 80, height: 16, children: [],
});

// page5(주소 폼) 미러: 라벨 주소* / 1행: 우편번호 입력 + 우편번호 찾기 / 2행: 기본주소 / 3행: 상세주소
const addressForm = (): FigmaNode => ({
  id: "form", type: "FRAME", name: "주소 폼", x: 0, y: 0, width: 1560, height: 140,
  children: [
    text("주소", 0, 50), text("*", 38, 50),
    text("우편번호 입력", 110, 50), text("우편번호 찾기", 360, 50),
    text("기본 주소를 입력해주세요", 110, 100),
    text("상세 주소를 입력해주세요", 110, 130),
  ],
});

describe("classifyText", () => {
  it("classifies required / placeholder / button / label", () => {
    expect(classifyText("*")).toBe("required");
    expect(classifyText("우편번호 입력")).toBe("placeholder");
    expect(classifyText("기본 주소를 입력해주세요")).toBe("placeholder");
    expect(classifyText("우편번호 찾기")).toBe("button");
    expect(classifyText("주소")).toBe("label");
  });
});

describe("extractFields", () => {
  it("groups input rows under one required label (rowspan source)", () => {
    const fields = extractFields(addressForm());
    expect(fields).toHaveLength(1);
    expect(fields[0].label).toBe("주소");
    expect(fields[0].required).toBe(true);
    expect(fields[0].rows).toHaveLength(3); // -> rowspan 3
    // 1행은 인풋+버튼, 나머지는 인풋 하나씩
    expect(fields[0].rows[0].map((c) => c.kind)).toEqual(["input", "button"]);
    expect(fields[0].rows[1].map((c) => c.kind)).toEqual(["input"]);
    expect(fields[0].rows[2].map((c) => c.kind)).toEqual(["input"]);
  });
});

describe("buildFormFromNode", () => {
  const xml = () => serialize(buildFormFromNode(addressForm()));

  it("emits a single 2-col table with one th(rowspan=3) and no stray '*' cell", () => {
    const doc = xml();
    expect(doc.match(/tagname="table"/g)?.length).toBe(1);
    expect(doc).toContain("<w2:rowspan>3</w2:rowspan>");
    expect(doc).toContain('<w2:textbox label="주소" style="" class="req"/>');
    expect(doc).not.toContain('label="*"');
    // 라벨 th는 하나뿐 (rowspan으로 묶이므로)
    expect(doc.match(/class="w2tb_th"/g)?.length).toBe(1);
  });

  it("renders placeholders as inputs and the action text as an emphasized button", () => {
    const doc = xml();
    expect(doc).not.toContain('label="우편번호 입력"'); // 라벨 아님
    expect(doc.match(/<xf:input/g)?.length).toBe(3); // 인풋 3개
    expect(doc).toContain('class="btn_cm fill pt"'); // 강조버튼
    expect(doc).toContain('label="우편번호 찾기"');
    // 버튼과 한 행인 인풋은 150px, 단독 인풋은 100%
    expect(doc).toContain("width:150px;");
    expect(doc.match(/width:100%;/g)?.length).toBe(2);
  });
});

describe("hasFormControls", () => {
  it("is true when placeholders/buttons present, false for label-only tables", () => {
    expect(hasFormControls(addressForm())).toBe(true);
    const labelsOnly: FigmaNode = {
      id: "t", type: "FRAME", name: "t", width: 600, height: 80,
      children: [text("이름", 0, 0), text("주민번호", 0, 40)],
    };
    expect(hasFormControls(labelsOnly)).toBe(false);
  });
});
