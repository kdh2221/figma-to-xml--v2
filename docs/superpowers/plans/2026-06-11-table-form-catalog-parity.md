# 입출력테이블 + 입력폼 카탈로그 완전 동일화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 툴 스니핏 레지스트리의 `05_입출력테이블`·`11_단일입력폼`·`12_다중입력폼` 카테고리를 `all_components.xml` 어휘와 동일하게 맞춰, 빠진 15개 변형이 카탈로그 UI에 노출되고 파일과 의미상 동일한 마크업을 생성하도록 한다.

**Architecture:** 기존 빌더 패턴(`src/core/snippets/builders/*.ts`가 `XmlEl`을 반환, `registry.ts`의 `SNIPPETS` 배열이 id→build 매핑)을 그대로 따른다. `(100)` 변형은 기존 singleForm 빌더에 선택적 `width` 인자를 추가해 처리하고, 목록형/멀티형 테이블과 정적 텍스트·단일 체크박스는 신규 빌더로 추가한다. 12_01/12_02는 파일 기준으로 정정한다.

**Tech Stack:** TypeScript (ESM, `.js` import 확장자), Vitest, 자체 `el()`/`serialize()` XML 빌더.

**참고 — `el`/`serialize` 동작:** 자식이 없는 엘리먼트는 self-closing(`<tag .../>`)로 직렬화된다. 속성 순서 = 객체 삽입 순서. `cdata("")` → `<![CDATA[]]>`.

---

### Task 1: singleForm — width 파라미터화 + 신규 빌더 2개

**Files:**
- Modify: `src/core/snippets/builders/singleForm.ts`
- Test: `test/core/snippets/singleForm.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`test/core/snippets/singleForm.test.ts`의 `describe` 블록 안에 케이스를 추가한다(기존 케이스는 유지):

```ts
  // --- width 파라미터: 기본값은 기존 출력 불변 ---
  it("select default width unchanged", () => expect(serialize(F.buildSelect())).toContain('style="width: 150px;"'));
  it("calendar default width unchanged", () => expect(serialize(F.buildCalendar("yearMonthDate"))).toContain('style="width: 120px;"'));
  it("textarea default width unchanged", () => expect(serialize(F.buildTextarea())).toContain('style="width:150px;height: 82px;"'));
  it("checkcombo default width unchanged", () => expect(serialize(F.buildCheckCombo())).toContain('style="width: 150px;"'));
  it("autocomplete default width unchanged", () => expect(serialize(F.buildAutoComplete())).toContain('style="width: 150px;"'));
  it("upload default width unchanged", () => expect(serialize(F.buildUpload())).toContain('style="width: 250px;"'));

  // --- (100) 변형: width만 100% ---
  it("input 100", () => expect(serialize(F.buildInput("100%"))).toContain('style="width:100%;"'));
  it("select 100", () => expect(serialize(F.buildSelect("100%"))).toContain('style="width: 100%;"'));
  it("calendar 100", () => expect(serialize(F.buildCalendar("yearMonthDate", "100%"))).toContain('style="width: 100%;"'));
  it("textarea 100", () => expect(serialize(F.buildTextarea("100%"))).toContain('style="width:100%;height: 82px;"'));
  it("autocomplete 100", () => expect(serialize(F.buildAutoComplete("100%"))).toContain('style="width: 100%;"'));
  it("checkcombo 100", () => expect(serialize(F.buildCheckCombo("100%"))).toContain('style="width: 100%;"'));
  it("upload 100", () => expect(serialize(F.buildUpload("100%"))).toContain('style="width: 100%;"'));
  it("calendar year type", () => expect(serialize(F.buildCalendar("year"))).toContain('calendarValueType="year"'));

  // --- 신규 빌더 ---
  it("form text is a span textbox with label", () => {
    const xml = serialize(F.buildFormText());
    expect(xml).toContain('tagname="span"');
    expect(xml).toContain('label="텍스트입니다."');
  });
  it("single checkbox has exactly one empty item", () => {
    const xml = serialize(F.buildCheckboxSingle());
    expect(xml).toContain('renderType="checkboxgroup"');
    expect(xml.match(/<xf:item>/g)?.length).toBe(1);
    expect(xml).toContain("<xf:label><![CDATA[]]></xf:label>");
  });
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run test/core/snippets/singleForm.test.ts`
Expected: FAIL — `buildFormText`/`buildCheckboxSingle` 미정의, `buildSelect("100%")` 등은 인자를 무시해 `width: 150px;`가 나와 100% 단언 실패.

- [ ] **Step 3: 구현**

`src/core/snippets/builders/singleForm.ts`에서 6개 빌더에 `width` 인자를 추가하고, 파일 하단에 신규 빌더 2개를 추가한다. `buildInput`은 이미 `width` 인자가 있으므로 변경 없음. `choices` 헬퍼는 기존 그대로 재사용한다(`choices([""])` → 빈 label/value 항목 1개).

`buildSelect`:
```ts
export function buildSelect(width = "150px"): XmlEl {
  return el("xf:select1", {
    allOption: "true", appearance: "minimal", chooseOption: "", class: "", direction: "auto",
    disabled: "false", disabledClass: "w2selectbox_disabled", id: "", ref: "", renderType: "",
    style: `width: ${width};`, submenuSize: "auto",
  }, [choices(["new row", "new row"])]);
}
```

`buildCalendar`:
```ts
export function buildCalendar(valueType: "yearMonthDate" | "yearMonth" | "year", width = "120px"): XmlEl {
  return el("w2:inputCalendar", {
    calendarValueType: valueType, focusOnDateSelect: "false", footerDiv: "false", id: "",
    renderDiv: "true", renderType: "component", rightAlign: "false", style: `width: ${width};`,
  });
}
```

`buildTextarea`:
```ts
export function buildTextarea(width = "150px"): XmlEl {
  return el("xf:textarea", { class: "", id: "", placeholder: "", style: `width:${width};height: 82px;` });
}
```

`buildCheckCombo`:
```ts
export function buildCheckCombo(width = "150px"): XmlEl {
  return el("xf:checkcombobox", {
    allOption: "", chooseOption: "", direction: "auto", disabled: "false", displayMode: "label",
    id: "", ref: "", style: `width: ${width};`, submenuSize: "auto",
  }, [choices(["A", "B", "C"])]);
}
```

`buildAutoComplete` (choices 부분 유지, style만 변경):
```ts
export function buildAutoComplete(width = "150px"): XmlEl {
  const w2choices = el("w2:choices", {}, ["A", "AB", "ABC"].map((l) =>
    el("w2:item", {}, [el("w2:label", {}, [cdata(l)]), el("w2:value", {}, [cdata("")])])
  ));
  return el("w2:autoComplete", {
    allOption: "", chooseOption: "", editType: "select", id: "", ref: "", search: "start",
    style: `width: ${width};`, submenuSize: "auto", useKeywordHighlight: "false",
  }, [w2choices]);
}
```

`buildUpload`:
```ts
export function buildUpload(width = "250px"): XmlEl {
  return el("w2:upload", { class: "", disabled: "", id: "", imageStyle: "", inputStyle: "", style: `width: ${width};`, type: "" });
}
```

파일 끝에 신규 빌더 추가:
```ts
/** 11_01 텍스트: 폼 어휘의 정적 텍스트 (span). 2_08 타이틀과 별개. */
export function buildFormText(): XmlEl {
  return el("w2:textbox", { id: "", label: "텍스트입니다.", style: "", tagname: "span" });
}

/** 11_04 체크박스(단일): 체크박스그룹과 동일 속성, 빈 항목 1개. */
export function buildCheckboxSingle(): XmlEl {
  return el("xf:select", {
    appearance: "full", cols: "", disabled: "", id: "", ref: "", renderType: "checkboxgroup",
    rows: "", selectedindex: "1", style: "",
  }, [choices([""])]);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run test/core/snippets/singleForm.test.ts`
Expected: PASS (기존 + 신규 케이스 모두).

- [ ] **Step 5: 커밋**

```bash
git add src/core/snippets/builders/singleForm.ts test/core/snippets/singleForm.test.ts
git commit -m "feat(snippets): width param on single-form builders; formText + single checkbox"
```

---

### Task 2: inputTable — 목록형/멀티형 빌더

**Files:**
- Modify: `src/core/converters/inputTable.ts`
- Test: `test/converters/inputTable.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

테스트 파일 경로는 `test/converters/inputTable.test.ts`(기존 위치)다. 상단 import 아래에 **새 import 2줄을 추가**하고(기존 `inputTableConverter` import는 그대로 둔다), 파일 끝에 describe 블록을 추가한다:

```ts
import { buildListTable, buildMultiTable } from "../../src/core/converters/inputTable.js";
import { serialize } from "../../src/core/xml.js";

describe("buildListTable (목록형)", () => {
  it("header row of th + data row of td, no label column", () => {
    const xml = serialize(buildListTable(["A", "B", "C"]));
    expect(xml.match(/class="w2tb_th tac"/g)?.length).toBe(3);
    expect(xml.match(/class="w2tb_td"/g)?.length).toBe(3);
    expect(xml).toContain('label="A"');
    expect(xml).not.toContain('style="width:100px;"'); // 라벨열 없음
  });
  it("falls back to 1 column when no headers", () => {
    const xml = serialize(buildListTable([]));
    expect(xml.match(/class="w2tb_th tac"/g)?.length).toBe(1);
  });
});

describe("buildMultiTable (멀티형)", () => {
  it("row-header column + column headers + data row", () => {
    const xml = serialize(buildMultiTable(["A", "B"]));
    expect(xml).toContain('style="width:100px;"');        // 행헤더 col
    expect(xml.match(/class="w2tb_th req"/g)?.length).toBe(2); // 헤더행 선두 + 데이터행 선두
    expect(xml.match(/class="w2tb_th tac"/g)?.length).toBe(2); // 컬럼헤더 2
    expect(xml.match(/class="w2tb_td"/g)?.length).toBe(2);     // 데이터 셀 2
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run test/converters/inputTable.test.ts`
Expected: FAIL — `buildListTable`/`buildMultiTable` export 없음.

- [ ] **Step 3: 구현**

`src/core/converters/inputTable.ts`의 `buildFormTable` 함수 뒤(컨버터 정의 앞)에 추가:

```ts
/** 5_06 테이블(목록형): 라벨열 없는 N컬럼. 헤더행(th) + 빈 데이터행(td). */
export function buildListTable(headers: string[]): XmlEl {
  const cols = Math.max(1, headers.length);
  const colgroup = el("xf:group", { tagname: "colgroup" },
    Array.from({ length: cols }, () => el("xf:group", { tagname: "col" })));
  const headerRow = el("xf:group", { tagname: "tr" },
    Array.from({ length: cols }, (_, i) =>
      el("xf:group", { class: "w2tb_th tac", tagname: "th" }, [
        el("w2:textbox", { label: headers[i] ?? "" }),
      ])));
  const dataRow = el("xf:group", { tagname: "tr" },
    Array.from({ length: cols }, () => el("xf:group", { class: "w2tb_td", tagname: "td" })));
  return el("xf:group", { class: "tblbox", id: "", style: "" }, [
    el("xf:group", { class: "w2tb tbl", tagname: "table" }, [colgroup, headerRow, dataRow]),
  ]);
}

/** 5_07 테이블(멀티형): 행헤더열(100px) + 컬럼헤더행 + 데이터행(선두 행헤더 th). */
export function buildMultiTable(headers: string[]): XmlEl {
  const cols = Math.max(1, headers.length);
  const colgroup = el("xf:group", { tagname: "colgroup" }, [
    el("xf:group", { style: "width:100px;", tagname: "col" }),
    ...Array.from({ length: cols }, () => el("xf:group", { tagname: "col" })),
  ]);
  const headerRow = el("xf:group", { tagname: "tr" }, [
    el("xf:group", { class: "w2tb_th req", tagname: "th" }),
    ...Array.from({ length: cols }, (_, i) =>
      el("xf:group", { class: "w2tb_th tac", tagname: "th" }, [
        el("w2:textbox", { label: headers[i] ?? "" }),
      ])),
  ]);
  const dataRow = el("xf:group", { tagname: "tr" }, [
    el("xf:group", { class: "w2tb_th req", tagname: "th" }, [el("w2:textbox", { label: "" })]),
    ...Array.from({ length: cols }, () => el("xf:group", { class: "w2tb_td", tagname: "td" })),
  ]);
  return el("xf:group", { class: "tblbox", id: "", style: "" }, [
    el("xf:group", { class: "w2tb tbl", tagname: "table" }, [colgroup, headerRow, dataRow]),
  ]);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run test/converters/inputTable.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/core/converters/inputTable.ts test/converters/inputTable.test.ts
git commit -m "feat(inputTable): list-type and multi-type table builders"
```

---

### Task 3: table.ts — 목록형/멀티형 노드 디스패치

**Files:**
- Modify: `src/core/snippets/builders/table.ts`
- Test: `test/core/snippets/table.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`test/core/snippets/table.test.ts`의 import에 `buildListTableForNode, buildMultiTableForNode`를 추가하고(기존 import 구문에 병합), describe 블록에 케이스를 추가한다(기존 `frame` 헬퍼 재사용):

```ts
import { buildTableForNode, buildListTableForNode, buildMultiTableForNode } from "../../../src/core/snippets/builders/table.js";

// ... 기존 describe 블록 내부 또는 새 describe 추가:
describe("list/multi table from node", () => {
  it("list table uses node text as column headers", () => {
    const xml = serialize(buildListTableForNode(frame(["A", "B"])));
    expect(xml.match(/class="w2tb_th tac"/g)?.length).toBe(2);
    expect(xml).toContain('label="A"');
  });
  it("multi table has a row-header column", () => {
    const xml = serialize(buildMultiTableForNode(frame(["A", "B"])));
    expect(xml).toContain('style="width:100px;"');
    expect(xml.match(/class="w2tb_th tac"/g)?.length).toBe(2);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run test/core/snippets/table.test.ts`
Expected: FAIL — `buildListTableForNode`/`buildMultiTableForNode` export 없음.

- [ ] **Step 3: 구현**

`src/core/snippets/builders/table.ts`의 import와 함수를 추가한다. 기존 import에서 `buildInputTable` 옆에 새 빌더를 병합:

```ts
import { buildInputTable, buildListTable, buildMultiTable } from "../../converters/inputTable.js";
```

파일 끝에 추가:
```ts
/** 5_06 목록형: 노드 텍스트를 컬럼 헤더로 사용. */
export function buildListTableForNode(node: FigmaNode): XmlEl {
  const headers = collectTextNodes(node).map(textOf).filter((s) => s !== "");
  return buildListTable(headers);
}

/** 5_07 멀티형: 노드 텍스트를 컬럼 헤더로 사용. */
export function buildMultiTableForNode(node: FigmaNode): XmlEl {
  const headers = collectTextNodes(node).map(textOf).filter((s) => s !== "");
  return buildMultiTable(headers);
}
```

(`collectTextNodes`, `textOf`, `FigmaNode`, `XmlEl`는 기존 import에 이미 존재.)

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run test/core/snippets/table.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/core/snippets/builders/table.ts test/core/snippets/table.test.ts
git commit -m "feat(snippets): node dispatch for list/multi tables"
```

---

### Task 4: registry — 15개 변형 등록 + 12_01 정정

**Files:**
- Modify: `src/core/snippets/registry.ts`
- Test: `test/core/snippets/registry.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`test/core/snippets/registry.test.ts`의 describe 블록 안에 추가:

```ts
  it("입출력테이블 exposes 7 variants", () => {
    const cat = snippetsByCategory().find((c) => c.categoryLabel === "입출력테이블");
    const labels = cat?.variants.map((v) => v.label) ?? [];
    expect(labels).toEqual(["1단", "2단", "3단", "4단", "5단", "목록형", "멀티형"]);
  });
  it("단일입력폼 exposes 20 variants", () => {
    const cat = snippetsByCategory().find((c) => c.categoryLabel === "단일입력폼");
    expect(cat?.variants.length).toBe(20);
  });
  it("다중입력폼 exposes 7 variants incl. code-detail", () => {
    const cat = snippetsByCategory().find((c) => c.categoryLabel === "다중입력폼");
    expect(cat?.variants.length).toBe(7);
    expect(cat?.variants.some((v) => v.id === "code-detail")).toBe(true);
  });
  it("code (12_01) builds a single input, not a search flex", () => {
    const node: FigmaNode = { id: "n", type: "FRAME", name: "x", width: 80, height: 30, children: [] };
    const xml = serialize(getSnippet("code")!.build(node, {}));
    expect(xml).toContain("xf:input");
    expect(xml).not.toContain("btn_cm");
  });
  it("table-multi builds a multi-type table", () => {
    const node: FigmaNode = { id: "n", type: "FRAME", name: "x", width: 80, height: 30,
      children: [{ id: "t", type: "TEXT", name: "A", characters: "A", width: 10, height: 10, children: [] }] };
    const xml = serialize(getSnippet("table-multi")!.build(node, {}));
    expect(xml).toContain('style="width:100px;"');
  });
```

`serialize` import가 없으면 상단 import에 추가:
```ts
import { serialize } from "../../../src/core/xml.js";
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run test/core/snippets/registry.test.ts`
Expected: FAIL — 입출력테이블 variants 3개뿐, `code-detail`/`table-multi` 미존재, `code`가 `btn_cm` 포함.

- [ ] **Step 3: 구현**

`src/core/snippets/registry.ts`를 수정한다.

(a) import에 신규 table 디스패치를 병합:
```ts
import { buildTableForNode, buildListTableForNode, buildMultiTableForNode } from "./builders/table.js";
```

(b) `// 05_입출력테이블` 블록의 `table-3` 줄 뒤에 추가:
```ts
  def("table-4", "05_입출력테이블", "입출력테이블", "5_04 테이블(4단)", "4단", (n) => buildTableForNode(n, 4)),
  def("table-5", "05_입출력테이블", "입출력테이블", "5_05 테이블(5단)", "5단", (n) => buildTableForNode(n, 5)),
  def("table-list", "05_입출력테이블", "입출력테이블", "5_06 테이블(목록형)", "목록형", (n) => buildListTableForNode(n)),
  def("table-multi", "05_입출력테이블", "입출력테이블", "5_07 테이블(멀티형)", "멀티형", (n) => buildMultiTableForNode(n)),
```

(c) `// 11_단일입력폼` 블록에 추가(순서: 기존 항목 사이에 번호순으로 배치). 기존 블록을 아래 전체로 교체한다:
```ts
  // 11_단일입력폼
  def("input", "11_단일입력폼", "단일입력폼", "11_05 인풋", "인풋", () => SF.buildInput()),
  def("input-100", "11_단일입력폼", "단일입력폼", "11_06 인풋(100)", "인풋(100)", () => SF.buildInput("100%")),
  def("select", "11_단일입력폼", "단일입력폼", "11_07 셀렉트", "셀렉트", () => SF.buildSelect()),
  def("select-100", "11_단일입력폼", "단일입력폼", "11_08 셀렉트(100)", "셀렉트(100)", () => SF.buildSelect("100%")),
  def("radio", "11_단일입력폼", "단일입력폼", "11_02 라디오", "라디오", () => SF.buildRadio()),
  def("checkbox", "11_단일입력폼", "단일입력폼", "11_03 체크박스", "체크박스", () => SF.buildCheckboxGroup()),
  def("checkbox-single", "11_단일입력폼", "단일입력폼", "11_04 체크박스(단일)", "체크박스(단일)", () => SF.buildCheckboxSingle()),
  def("calendar-ymd", "11_단일입력폼", "단일입력폼", "11_09 인풋캘린더(년월일)", "캘린더(년월일)", () => SF.buildCalendar("yearMonthDate")),
  def("calendar-100", "11_단일입력폼", "단일입력폼", "11_10 인풋캘린더(100)", "캘린더(100)", () => SF.buildCalendar("yearMonthDate", "100%")),
  def("calendar-ym", "11_단일입력폼", "단일입력폼", "11_11 인풋캘린더(년월)", "캘린더(년월)", () => SF.buildCalendar("yearMonth")),
  def("calendar-year", "11_단일입력폼", "단일입력폼", "11_12 인풋캘린더(년)", "캘린더(년)", () => SF.buildCalendar("year")),
  def("textarea", "11_단일입력폼", "단일입력폼", "11_13 텍스트에어리어", "텍스트에어리어", () => SF.buildTextarea()),
  def("textarea-100", "11_단일입력폼", "단일입력폼", "11_14 텍스트에어리어(100)", "텍스트에어리어(100)", () => SF.buildTextarea("100%")),
  def("autocomplete", "11_단일입력폼", "단일입력폼", "11_15 오토컴플릿", "오토컴플릿", () => SF.buildAutoComplete()),
  def("autocomplete-100", "11_단일입력폼", "단일입력폼", "11_16 오토컴플릿(100)", "오토컴플릿(100)", () => SF.buildAutoComplete("100%")),
  def("checkcombo", "11_단일입력폼", "단일입력폼", "11_17 체크콤보박스", "체크콤보박스", () => SF.buildCheckCombo()),
  def("checkcombo-100", "11_단일입력폼", "단일입력폼", "11_18 체크콤보박스(100)", "체크콤보박스(100)", () => SF.buildCheckCombo("100%")),
  def("upload", "11_단일입력폼", "단일입력폼", "11_19 업로드", "업로드", () => SF.buildUpload()),
  def("upload-100", "11_단일입력폼", "단일입력폼", "11_20 업로드(100)", "업로드(100)", () => SF.buildUpload("100%")),
  def("form-text", "11_단일입력폼", "단일입력폼", "11_01 텍스트", "텍스트", () => SF.buildFormText()),
```

(d) `// 12_다중입력폼` 블록을 아래로 교체(`code` build 정정 + `code-detail` 추가):
```ts
  // 12_다중입력폼
  def("code", "12_다중입력폼", "다중입력폼", "12_01 코드조회", "코드조회", () => SF.buildInput("150px")),
  def("code-detail", "12_다중입력폼", "다중입력폼", "12_02 코드상세조회", "코드상세조회", () => MF.buildCodeSearch()),
  def("addr", "12_다중입력폼", "다중입력폼", "12_06 주소", "주소", () => MF.buildAddress()),
  def("email", "12_다중입력폼", "다중입력폼", "12_04 이메일", "이메일", () => MF.buildEmail()),
  def("phone", "12_다중입력폼", "다중입력폼", "12_03 전화번호", "전화번호", () => MF.buildPhone()),
  def("period", "12_다중입력폼", "다중입력폼", "12_05 기간조회", "기간조회", () => MF.buildPeriod()),
  def("amount", "12_다중입력폼", "다중입력폼", "12_07 금액", "금액", () => MF.buildAmount()),
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run test/core/snippets/registry.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/core/snippets/registry.ts test/core/snippets/registry.test.ts
git commit -m "feat(registry): add table/form variants for catalog parity; fix 12_01 code"
```

---

### Task 5: 전체 검증

**Files:** (없음 — 검증만)

- [ ] **Step 1: 전체 테스트 실행**

Run: `npx vitest run`
Expected: 전체 PASS. 실패 시 해당 Task로 돌아가 수정.

- [ ] **Step 2: 타입체크/빌드 (있는 경우)**

Run: `npm run build` (또는 `npx tsc --noEmit`)
Expected: 타입 오류 없음.

- [ ] **Step 3: 최종 커밋(있을 경우)**

검증 중 수정이 있었다면:
```bash
git add -A
git commit -m "test: catalog parity full verification"
```

---

## 수용 기준 (재확인)
1. `catalogDescriptor()` 입출력테이블 7 / 단일입력폼 20 / 다중입력폼 7.
2. 신규 변형 XML이 파일과 의미상 동일(태그/클래스/핵심 속성·width 일치).
3. 기존 변형 출력 불변(기본값 호출 단언으로 보증).
4. `code`(12_01)=단일 input, `code-detail`(12_02)=input+버튼+input flex.
5. 전체 테스트 통과.
