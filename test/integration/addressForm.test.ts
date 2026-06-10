import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { toFigmaNode, type SceneLike } from "../../src/main.js";
import { assemblePage } from "../../src/core/assemble.js";
import { analyzeRegions } from "../../src/core/regions.js";

// 실제 Figma 'JSON' 덤프(주소지 정보 폼, 깊게 중첩된 auto-layout) → 사용자 수정본 page5_new 구조 재현 회귀 테스트.
const fixture = fileURLToPath(new URL("../fixtures/addressForm.figma.json", import.meta.url));
const scene = JSON.parse(readFileSync(fixture, "utf8")) as SceneLike;
const node = () => toFigmaNode(scene);

describe("address form (real Figma dump)", () => {
  it("splits into a title region and an inputTable region", () => {
    const regions = analyzeRegions(node());
    expect(regions.map((r) => r.snippetId)).toEqual(["title-main", "table-1"]);
  });

  it("reproduces the user-corrected page5_new table structure", () => {
    const doc = assemblePage(node());

    // 제목 + 우측 체크박스("주소지 추가") 보존
    expect(doc).toContain('class="tit_main" id="" label="주소지 정보"');
    expect(doc).toContain('meta_snippetName="11_03 체크박스"');
    expect(doc).toContain('renderType="checkboxgroup"');
    expect(doc).toContain("<![CDATA[주소지 추가]]>");
    // 체크박스 라벨이 제목으로 새지 않는다
    expect(doc).not.toContain('label="주소지 추가"');

    // 단일 2열 테이블 + 라벨 th 하나(rowspan=3), '*'는 별도 셀 아님
    expect(doc.match(/tagname="table"/g)?.length).toBe(1);
    expect(doc.match(/class="w2tb_th"/g)?.length).toBe(1);
    expect(doc).toContain("<w2:rowspan>3</w2:rowspan>");
    expect(doc).toContain('<w2:textbox label="주소" style="" class="req"/>');
    expect(doc).not.toContain('label="*"');

    // 플레이스홀더 3개 → 인풋, 동작 텍스트 → 강조버튼(인풋과 같은 td)
    expect(doc.match(/<xf:input/g)?.length).toBe(3);
    expect(doc).toContain('class="btn_cm fill pt"');
    expect(doc).toContain('label="우편번호 찾기"');
    expect(doc).not.toContain('label="우편번호 입력"');

    // 버튼과 한 행인 인풋은 150px, 단독 인풋은 100%
    expect(doc.match(/width:150px;/g)?.length).toBe(1);
    expect(doc.match(/width:100%;/g)?.length).toBe(2);
  });
});
