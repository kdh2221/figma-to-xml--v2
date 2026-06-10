# 스니핏 레지스트리 (2단계 선택) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 플러그인에서 사용자가 영역에 지정할 수 있는 스니핏을 카탈로그(all_components.xml) 전체로 늘리고, UI를 카테고리→변형 2단계 선택으로 바꾼다.

**Architecture:** 새 `src/core/snippets/` 레지스트리(SnippetDef[])를 단일 소스로, UI 드롭다운·자동분류 기본값·렌더가 모두 파생된다. 내용을 추론하는 스니핏은 파라메트릭 빌더(기존 `el()` 빌더 재사용), 내용 없는 스니핏은 카탈로그 리터럴을 `raw()`로 방출. 기존 `Converter` 레지스트리(`registry.ts`)는 그대로 두고 건드리지 않는다.

**Tech Stack:** TypeScript (ESM, `.js` import 확장자), vitest, esbuild. 테스트는 `npm test` (vitest run).

**참고:** 카탈로그 원본 `C:\WebSquare_Studio\ai_x64\websquare_26.0417\workspace\IDS_2026\WebContent\pub\pageFlowTest\all_components.xml`, 메모리 `websquare-snippet-catalog.md`, 스펙 `docs/superpowers/specs/2026-06-10-snippet-registry-design.md`.

---

## 파일 구조

- 신규 `src/core/snippets/types.ts` — `SnippetDef`, `RenderOpts`.
- 신규 `src/core/snippets/registry.ts` — `SNIPPETS`, `getSnippet`, `snippetsByCategory`, `defaultSnippetFor`, `LEGACY_REGION_TYPE_TO_ID`, `catalogDescriptor`.
- 신규 `src/core/snippets/builders/split.ts|title.ts|search.ts|table.ts|tab.ts|singleForm.ts|multiForm.ts|button.ts|statics.ts` — 카테고리별 빌더.
- 수정 `src/core/xml.ts` — `raw()` + `#raw` 직렬화.
- 수정 `src/core/regions.ts` — `Region.type` → `snippetId`, `defaultSnippetFor` 사용.
- 수정 `src/core/assemble.ts` — `renderRegion` switch → 레지스트리 디스패치, 레거시 키 호환.
- 수정 `src/main.ts` — `regions` 메시지에 카탈로그 descriptor 동봉, `generate` 가 `snippetById` 사용.
- 수정 `src/ui.ts` — 2단계 select, `REGION_TYPES` 제거.
- 테스트 신규: `test/core/snippets/*.test.ts`. 기존 `test/core/regions.test.ts`, `test/core/assemble.test.ts`, `test/integration/*` 갱신.

---

## Task 1: `raw()` XML 패스스루

정적 카탈로그 리터럴을 손번역 없이 그대로 방출하기 위한 노드.

**Files:**
- Modify: `src/core/xml.ts`
- Test: `test/core/xml.test.ts`

- [ ] **Step 1: Write the failing test**

`test/core/xml.test.ts` 끝에 추가:

```ts
import { raw } from "../../src/core/xml.js";

describe("raw passthrough", () => {
  it("emits its string verbatim without escaping", () => {
    expect(serialize(raw('<w2:foo a="1"><b/></w2:foo>'))).toBe('<w2:foo a="1"><b/></w2:foo>');
  });

  it("nests inside a built element unescaped", () => {
    const node = el("xf:group", { class: "x" }, [raw("<w2:bar/>")]);
    expect(serialize(node)).toBe('<xf:group class="x"><w2:bar/></xf:group>');
  });
});
```

(파일 상단 import 에 `serialize, el` 이 이미 있으면 `raw` 만 추가.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/xml.test.ts`
Expected: FAIL — `raw` is not exported.

- [ ] **Step 3: Implement**

`src/core/xml.ts` 의 `cdata` 아래에 추가:

```ts
/** 원본 XML 문자열을 이스케이프 없이 그대로 방출하는 노드. 카탈로그 리터럴 보존용. */
export function raw(xml: string): XmlEl {
  return { tag: "#raw", attrs: {}, children: [xml] };
}
```

`serialize` 의 `#cdata` 분기 바로 위에 `#raw` 분기 추가:

```ts
  if (node.tag === "#raw") {
    return node.children.map((c) => (typeof c === "string" ? c : "")).join("");
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/xml.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/xml.ts test/core/xml.test.ts
git commit -m "feat(xml): raw() passthrough node for verbatim catalog literals"
```

---

## Task 2: 스니핏 타입 정의

**Files:**
- Create: `src/core/snippets/types.ts`

- [ ] **Step 1: Create the types file**

```ts
import type { FigmaNode } from "../types.js";
import type { XmlEl } from "../xml.js";

/** 렌더 시 빌더에 전달되는 부가 정보. */
export interface RenderOpts {
  /** 타이틀 우측(rt)에 넣을 체크박스 라벨들 (denoise 전 RAW에서 추출) */
  checkboxes?: string[];
}

/** 사용자가 선택 가능한 스니핏 한 종류. 레지스트리의 단위. */
export interface SnippetDef {
  /** 안정 키. typeById/snippetById 의 값으로 쓰인다. 예: "table-2" */
  id: string;
  /** meta_snippetCategory. 예: "05_입출력테이블" */
  category: string;
  /** UI 카테고리 표시명. 예: "입출력테이블" */
  categoryLabel: string;
  /** meta_snippetName. 예: "5_02 테이블(2단)" */
  name: string;
  /** UI 변형 표시명. 예: "2단" */
  label: string;
  /** 영역 노드를 받아 스니핏 XmlEl 을 만든다. */
  build(node: FigmaNode, opts: RenderOpts): XmlEl;
}

/** UI로 보내는 경량 카탈로그 descriptor (build 제외, postMessage 직렬화 가능). */
export interface CatalogCategory {
  category: string;
  categoryLabel: string;
  variants: { id: string; label: string }[];
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p .`
Expected: no errors (파일은 아직 어디서도 import 되지 않음).

- [ ] **Step 3: Commit**

```bash
git add src/core/snippets/types.ts
git commit -m "feat(snippets): SnippetDef and RenderOpts types"
```

---

## Task 3: `withMeta` 헬퍼와 분할 빌더 (화면분할)

화면분할은 한 빌더로 2단/3단/4단/비대칭/셔틀을 모두 표현한다.

**Files:**
- Create: `src/core/snippets/builders/meta.ts`
- Create: `src/core/snippets/builders/split.ts`
- Test: `test/core/snippets/split.test.ts`

- [ ] **Step 1: Write the failing test**

`test/core/snippets/split.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import { buildSplit } from "../../../src/core/snippets/builders/split.js";

describe("buildSplit", () => {
  it("makes one componentContainer child per column", () => {
    const xml = serialize(buildSplit([5, 5]));
    expect(xml.match(/meta_componentContainer="true"/g)?.length).toBe(2);
  });

  it("applies col_N class per ratio", () => {
    const xml = serialize(buildSplit([2, 8]));
    expect(xml).toContain('class=" col_2"');
    expect(xml).toContain('class=" col_8"');
  });

  it("wraps in a lybox group", () => {
    expect(serialize(buildSplit([5, 5]))).toContain('class="lybox"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/snippets/split.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement meta helper**

`src/core/snippets/builders/meta.ts`:

```ts
import type { XmlEl } from "../../xml.js";

/** 스니핏 루트에 식별 메타를 부착한다. */
export function withMeta(root: XmlEl, category: string, name: string): XmlEl {
  root.attrs.meta_snippetCategory = category;
  root.attrs.meta_snippetName = name;
  root.attrs.meta_snippetKeyComponent = "true";
  return root;
}
```

- [ ] **Step 4: Implement split builder**

`src/core/snippets/builders/split.ts`:

```ts
import { el, type XmlEl } from "../../xml.js";

/** 화면분할: 컬럼 비율 배열(합이 10 권장)마다 컨테이너 자식 1개.
 *  [5,5]=2단, [3,3,3]=3단(균등은 class 비움), [2,8]=비대칭. */
export function buildSplit(ratios: number[]): XmlEl {
  const even = ratios.every((r) => r === ratios[0]);
  const children = ratios.map((r) =>
    el("xf:group", {
      class: even ? "" : ` col_${r}`,
      id: "",
      meta_componentContainer: "true",
      style: "",
    })
  );
  return el("xf:group", { class: "lybox", id: "", style: "" }, children);
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run test/core/snippets/split.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/core/snippets/builders/meta.ts src/core/snippets/builders/split.ts test/core/snippets/split.test.ts
git commit -m "feat(snippets): split (화면분할) builder + withMeta helper"
```

---

## Task 4: 타이틀 빌더 변형 (02_타이틀)

**Files:**
- Create: `src/core/snippets/builders/title.ts`
- Test: `test/core/snippets/title.test.ts`

- [ ] **Step 1: Write the failing test**

`test/core/snippets/title.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/snippets/title.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/core/snippets/builders/title.ts`:

```ts
import type { FigmaNode } from "../../types.js";
import type { RenderOpts } from "../types.js";
import { el, cdata, type XmlEl } from "../../xml.js";
import { collectTextNodes, textOf } from "../../extract.js";

export type TitleVariant = "main" | "sub";

function firstText(node: FigmaNode): string {
  const texts = collectTextNodes(node);
  return texts.length > 0 ? textOf(texts[0]) : "";
}

/** 단일 체크박스 (11_03 체크박스). 라벨 1개를 가진 checkboxgroup. */
function buildCheckbox(label: string): XmlEl {
  return el("xf:select", {
    appearance: "full", cols: "", disabled: "", id: "",
    meta_snippetCategory: "11_단일입력폼", meta_snippetKeyComponent: "true",
    meta_snippetName: "11_03 체크박스", ref: "", renderType: "checkboxgroup", rows: "",
    selectedindex: "", style: "",
  }, [
    el("xf:choices", {}, [
      el("xf:item", {}, [el("xf:label", {}, [cdata(label)]), el("xf:value", {}, [cdata("")])]),
    ]),
  ]);
}

/** 타이틀그룹(titbox): lt 에 제목/소제목, rt 에 체크박스(opts). */
export function buildTitle(variant: TitleVariant, node: FigmaNode, opts: RenderOpts): XmlEl {
  const cls = variant === "sub" ? "tit_sub" : "tit_main";
  return el("xf:group", { class: "titbox", id: "" }, [
    el("xf:group", { class: "lt", id: "" }, [
      el("w2:textbox", { class: cls, id: "", label: firstText(node), tagname: "" }),
    ]),
    el("xf:group", { class: "rt", id: "" }, (opts.checkboxes ?? []).map(buildCheckbox)),
  ]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/snippets/title.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/snippets/builders/title.ts test/core/snippets/title.test.ts
git commit -m "feat(snippets): title (제목/소제목) builder with rt checkboxes"
```

---

## Task 5: 조회영역 빌더 (03_조회영역)

**Files:**
- Create: `src/core/snippets/builders/search.ts`
- Test: `test/core/snippets/search.test.ts`

- [ ] **Step 1: Write the failing test**

`test/core/snippets/search.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import { buildSearch } from "../../../src/core/snippets/builders/search.js";

describe("buildSearch", () => {
  it("renders rows x cols th/td pairs", () => {
    const xml = serialize(buildSearch(2, 2)); // 2행 2단 => 2 tr, 각 행 2쌍 => 4 th
    expect(xml.match(/tagname="tr"/g)?.length).toBe(2);
    expect(xml.match(/class="w2tb_th"/g)?.length).toBe(4);
  });

  it("includes a search button", () => {
    expect(serialize(buildSearch(1, 2))).toContain("btn_cm fill search");
  });

  it("wraps in schbox > schbox_inner", () => {
    const xml = serialize(buildSearch(1, 2));
    expect(xml).toContain('class="schbox"');
    expect(xml).toContain('class="schbox_inner"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/snippets/search.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/core/snippets/builders/search.ts`:

```ts
import { el, type XmlEl } from "../../xml.js";

/** 조회영역(schbox): rows 행 × cols 단. 각 칸 = th(라벨)+td(빈 입력). 우측 조회버튼. */
export function buildSearch(rows: number, cols: number): XmlEl {
  const colgroup: XmlEl[] = [];
  for (let c = 0; c < cols; c++) {
    colgroup.push(el("xf:group", { style: "width:100px;", tagname: "col" }));
    colgroup.push(el("xf:group", { style: "", tagname: "col" }));
  }
  const trs: XmlEl[] = [];
  for (let r = 0; r < rows; r++) {
    const cells: XmlEl[] = [];
    for (let c = 0; c < cols; c++) {
      cells.push(
        el("xf:group", { class: "w2tb_th", style: "", tagname: "th" }, [
          el("w2:textbox", { class: "", id: "", label: "조회조건", style: "" }),
        ]),
        el("xf:group", { class: "w2tb_td", style: "", tagname: "td" })
      );
    }
    trs.push(el("xf:group", { class: "", id: "", style: "", tagname: "tr" }, cells));
  }
  const table = el("xf:group", {
    adaptive: "layout", adaptiveThreshold: "768", class: "w2tb tbl ", id: "", style: "", tagname: "table",
  }, [
    el("w2:attributes", {}, [el("w2:summary", {})]),
    el("xf:group", { tagname: "colgroup" }, colgroup),
    ...trs,
  ]);
  const button = el("xf:group", { class: "btn_schbox", id: "", style: "" }, [
    el("w2:button", { class: "btn_cm fill search", disabled: "", escape: "false", id: "", style: "" }, [
      el("w2:textbox", { id: "", label: "조회", style: "", tagname: "span" }),
    ]),
  ]);
  return el("xf:group", { class: "schbox", id: "", style: "" }, [
    el("xf:group", { class: "schbox_inner", id: "", style: "" }, [table]),
    button,
  ]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/snippets/search.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/snippets/builders/search.ts test/core/snippets/search.test.ts
git commit -m "feat(snippets): search area (조회영역) builder rows x cols"
```

---

## Task 6: 입출력테이블 변형 (05_입출력테이블)

기존 `buildInputTable`/`buildFormTable`/`buildFormFromNode`(`converters/inputTable.ts`, `converters/formTable.ts`)를 재사용하고, N단을 인자로 받는 래퍼를 더한다.

**Files:**
- Create: `src/core/snippets/builders/table.ts`
- Test: `test/core/snippets/table.test.ts`

- [ ] **Step 1: Write the failing test**

`test/core/snippets/table.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import { buildTableForNode } from "../../../src/core/snippets/builders/table.js";
import type { FigmaNode } from "../../../src/core/types.js";

const frame = (texts: string[]): FigmaNode => ({
  id: "f", type: "FRAME", name: "f", width: 300, height: 100,
  children: texts.map((s, i) => ({ id: "t" + i, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [] })),
});

describe("buildTableForNode", () => {
  it("cols=2 with 2 labels => 1 row, 2 th", () => {
    const xml = serialize(buildTableForNode(frame(["A", "B"]), 2));
    expect(xml.match(/tagname="tr"/g)?.length).toBe(1);
    expect(xml.match(/class="w2tb_th"/g)?.length).toBe(2);
  });

  it("cols=1 with 3 labels => 3 rows", () => {
    const xml = serialize(buildTableForNode(frame(["A", "B", "C"]), 1));
    expect(xml.match(/tagname="tr"/g)?.length).toBe(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/snippets/table.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/core/snippets/builders/table.ts`:

```ts
import type { FigmaNode } from "../../types.js";
import { type XmlEl } from "../../xml.js";
import { collectTextNodes, textOf } from "../../extract.js";
import { buildInputTable } from "../../converters/inputTable.js";
import { buildFormFromNode, hasFormControls } from "../../converters/formTable.js";

/** 입출력테이블: 폼 컨트롤 신호가 있으면 스마트 폼, 아니면 라벨 N단 테이블. */
export function buildTableForNode(node: FigmaNode, cols: number): XmlEl {
  if (hasFormControls(node)) return buildFormFromNode(node);
  const labels = collectTextNodes(node).map(textOf).filter((s) => s !== "");
  return buildInputTable({ labels, cols });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/snippets/table.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/snippets/builders/table.ts test/core/snippets/table.test.ts
git commit -m "feat(snippets): input table builder with N-column param"
```

---

## Task 7: 탭 빌더 (04_탭)

기존 `assemble.ts` 의 `buildTab` 로직을 옮겨 변형 인자를 추가한다.

**Files:**
- Create: `src/core/snippets/builders/tab.ts`
- Test: `test/core/snippets/tab.test.ts`

- [ ] **Step 1: Write the failing test**

`test/core/snippets/tab.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import { buildTab } from "../../../src/core/snippets/builders/tab.js";
import type { FigmaNode } from "../../../src/core/types.js";

const frame = (texts: string[]): FigmaNode => ({
  id: "f", type: "FRAME", name: "f", width: 300, height: 40,
  children: texts.map((s, i) => ({ id: "t" + i, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [] })),
});

describe("buildTab", () => {
  it("emits one w2:tabs per label", () => {
    const xml = serialize(buildTab(frame(["탭1", "탭2", "탭3"])));
    expect(xml.match(/<w2:tabs/g)?.length).toBe(3);
  });

  it("falls back to TAB1 when no text", () => {
    expect(serialize(buildTab(frame([])))).toContain('label="TAB1"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/snippets/tab.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/core/snippets/builders/tab.ts`:

```ts
import type { FigmaNode } from "../../types.js";
import { el, type XmlEl } from "../../xml.js";
import { collectTextNodes, textOf } from "../../extract.js";

/** 탭컨트롤: 텍스트들 = 탭 라벨. */
export function buildTab(node: FigmaNode): XmlEl {
  const found = collectTextNodes(node).map(textOf).filter((s) => s !== "");
  const labels = found.length > 0 ? found : ["TAB1"];
  const tabs = labels.map((label, i) =>
    el("w2:tabs", { disabled: "false", style: "", id: `tabs${i + 1}`, label })
  );
  const contents = labels.map((_, i) =>
    el("w2:content", { alwaysDraw: "false", style: "", id: `content${i + 1}` })
  );
  return el("xf:group", { id: "", class: "tbcbox" }, [
    el("w2:tabControl", { alwaysDraw: "false", style: "", id: "", class: "tbc" }, [...tabs, ...contents]),
  ]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/snippets/tab.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/snippets/builders/tab.ts test/core/snippets/tab.test.ts
git commit -m "feat(snippets): tab control builder"
```

---

## Task 8: 단일입력폼 컨트롤 (11_단일입력폼)

인풋/셀렉트/라디오/체크박스/캘린더/텍스트에어리어/체크콤보/오토컴플릿/업로드. 각 컨트롤은 인자 없는 소형 빌더.

**Files:**
- Create: `src/core/snippets/builders/singleForm.ts`
- Test: `test/core/snippets/singleForm.test.ts`

- [ ] **Step 1: Write the failing test**

`test/core/snippets/singleForm.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import * as F from "../../../src/core/snippets/builders/singleForm.js";

describe("single form controls", () => {
  it("input", () => expect(serialize(F.buildInput("150px"))).toContain("xf:input"));
  it("select", () => expect(serialize(F.buildSelect())).toContain('renderType=""'));
  it("radio", () => expect(serialize(F.buildRadio())).toContain('renderType="radiogroup"'));
  it("checkbox", () => expect(serialize(F.buildCheckboxGroup())).toContain('renderType="checkboxgroup"'));
  it("calendar ymd", () => expect(serialize(F.buildCalendar("yearMonthDate"))).toContain('calendarValueType="yearMonthDate"'));
  it("textarea", () => expect(serialize(F.buildTextarea())).toContain("xf:textarea"));
  it("checkcombo", () => expect(serialize(F.buildCheckCombo())).toContain("xf:checkcombobox"));
  it("autocomplete", () => expect(serialize(F.buildAutoComplete())).toContain("w2:autoComplete"));
  it("upload", () => expect(serialize(F.buildUpload())).toContain("w2:upload"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/snippets/singleForm.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/core/snippets/builders/singleForm.ts`:

```ts
import { el, cdata, type XmlEl } from "../../xml.js";

const choices = (labels: string[]): XmlEl =>
  el("xf:choices", {}, labels.map((l) =>
    el("xf:item", {}, [el("xf:label", {}, [cdata(l)]), el("xf:value", {}, [cdata("")])])
  ));

export function buildInput(width = "150px"): XmlEl {
  return el("xf:input", { class: "", id: "", placeholder: "", style: `width:${width};` });
}

export function buildSelect(): XmlEl {
  return el("xf:select1", {
    allOption: "true", appearance: "minimal", chooseOption: "", class: "", direction: "auto",
    disabled: "false", disabledClass: "w2selectbox_disabled", id: "", ref: "", renderType: "",
    style: "width: 150px;", submenuSize: "auto",
  }, [choices(["new row", "new row"])]);
}

export function buildRadio(): XmlEl {
  return el("xf:select1", {
    appearance: "full", cols: "", disabled: "", id: "", ref: "", renderType: "radiogroup",
    rows: "", selectedIndex: "1", style: "",
  }, [choices(["Atype", "Btype"])]);
}

export function buildCheckboxGroup(): XmlEl {
  return el("xf:select", {
    appearance: "full", cols: "", disabled: "", id: "", ref: "", renderType: "checkboxgroup",
    rows: "", selectedindex: "1", style: "",
  }, [choices(["Atype", "Btype"])]);
}

export function buildCalendar(valueType: "yearMonthDate" | "yearMonth" | "year"): XmlEl {
  return el("w2:inputCalendar", {
    calendarValueType: valueType, focusOnDateSelect: "false", footerDiv: "false", id: "",
    renderDiv: "true", renderType: "component", rightAlign: "false", style: "width: 120px;",
  });
}

export function buildTextarea(): XmlEl {
  return el("xf:textarea", { class: "", id: "", placeholder: "", style: "width:150px;height: 82px;" });
}

export function buildCheckCombo(): XmlEl {
  return el("xf:checkcombobox", {
    allOption: "", chooseOption: "", direction: "auto", disabled: "false", displayMode: "label",
    id: "", ref: "", style: "width: 150px;", submenuSize: "auto",
  }, [choices(["A", "B", "C"])]);
}

export function buildAutoComplete(): XmlEl {
  const w2choices = el("w2:choices", {}, ["A", "AB", "ABC"].map((l) =>
    el("w2:item", {}, [el("w2:label", {}, [cdata(l)]), el("w2:value", {}, [cdata("")])])
  ));
  return el("w2:autoComplete", {
    allOption: "", chooseOption: "", editType: "select", id: "", ref: "", search: "start",
    style: "width: 150px;", submenuSize: "auto", useKeywordHighlight: "false",
  }, [w2choices]);
}

export function buildUpload(): XmlEl {
  return el("w2:upload", { class: "", disabled: "", id: "", imageStyle: "", inputStyle: "", style: "width: 250px;", type: "" });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/snippets/singleForm.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/snippets/builders/singleForm.ts test/core/snippets/singleForm.test.ts
git commit -m "feat(snippets): single input form controls (11_*)"
```

---

## Task 9: 다중입력폼 (12_다중입력폼)

주소/이메일/전화/기간/금액. `xf:group class="flex"` 가로배치 복합 빌더.

**Files:**
- Create: `src/core/snippets/builders/multiForm.ts`
- Test: `test/core/snippets/multiForm.test.ts`

- [ ] **Step 1: Write the failing test**

`test/core/snippets/multiForm.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import * as M from "../../../src/core/snippets/builders/multiForm.js";

describe("multi input forms", () => {
  it("phone has a select and dash separators", () => {
    const xml = serialize(M.buildPhone());
    expect(xml).toContain("xf:select1");
    expect(xml.match(/label="-"/g)?.length).toBe(2);
  });

  it("email has @ separator and 3 inputs/select", () => {
    const xml = serialize(M.buildEmail());
    expect(xml).toContain('label="@"');
  });

  it("address is flex_col with a search button", () => {
    const xml = serialize(M.buildAddress());
    expect(xml).toContain('class="flex_col"');
    expect(xml).toContain("btn_cm search icon");
  });

  it("amount is a right-aligned number input with 원", () => {
    const xml = serialize(M.buildAmount());
    expect(xml).toContain('dataType="number"');
    expect(xml).toContain('label="원"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/snippets/multiForm.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/core/snippets/builders/multiForm.ts`:

```ts
import { el, type XmlEl } from "../../xml.js";

const flex = (children: XmlEl[], cls = "flex"): XmlEl =>
  el("xf:group", { class: cls, id: "" }, children);

const input = (width?: string): XmlEl =>
  el("xf:input", width ? { class: "", id: "", placeholder: "", style: `width:${width};` } : { class: "", id: "", style: "" });

const searchBtn = (): XmlEl =>
  el("w2:button", { class: "btn_cm search icon", id: "", style: "" }, [
    el("w2:textbox", { id: "", label: "검색", style: "", tagname: "span" }),
  ]);

const span = (label: string): XmlEl => el("w2:span", { id: "", label, style: "" });

const plainSelect = (): XmlEl =>
  el("xf:select1", {
    allOption: "false", appearance: "minimal", chooseOption: "false", direction: "auto",
    disabled: "false", disabledClass: "w2selectbox_disabled", id: "", style: "", submenuSize: "auto",
  });

export function buildPhone(): XmlEl {
  return flex([plainSelect(), span("-"), input(), span("-"), input()]);
}

export function buildEmail(): XmlEl {
  return flex([input("150px"), span("@"), input("150px"), plainSelect()]);
}

export function buildAddress(): XmlEl {
  return el("xf:group", { class: "flex_col", id: "", style: "" }, [
    flex([input("100%"), searchBtn(), input("100%")]),
    input("100%"),
    input("100%"),
  ]);
}

export function buildPeriod(): XmlEl {
  const cal = (): XmlEl => el("w2:inputCalendar", {
    calendarValueType: "yearMonthDate", focusOnDateSelect: "false", footerDiv: "true", id: "",
    renderDiv: "true", renderType: "", rightAlign: "false", style: "width: 120px;",
  });
  return flex([cal(), span("~"), cal()]);
}

export function buildAmount(): XmlEl {
  return flex([
    el("xf:input", { class: "tar", dataType: "number", editType: "", id: "", placeholder: "", style: "width:150px;", type: "" }),
    el("w2:textbox", { id: "", label: "원", style: "", tagname: "span" }),
  ]);
}

export function buildCodeSearch(): XmlEl {
  return flex([
    el("xf:input", { class: "flex_no", id: "", placeholder: "", style: "width:150px;" }),
    searchBtn(),
    input("200px"),
  ]);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/snippets/multiForm.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/snippets/builders/multiForm.ts test/core/snippets/multiForm.test.ts
git commit -m "feat(snippets): multi input forms (12_* address/email/phone/period/amount)"
```

---

## Task 10: 버튼·텍스트 빌더 (08_기본버튼, 단일 텍스트)

**Files:**
- Create: `src/core/snippets/builders/button.ts`
- Test: `test/core/snippets/button.test.ts`

- [ ] **Step 1: Write the failing test**

`test/core/snippets/button.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/snippets/button.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/core/snippets/builders/button.ts`:

```ts
import type { FigmaNode } from "../../types.js";
import { el, type XmlEl } from "../../xml.js";
import { collectTextNodes, textOf } from "../../extract.js";

function firstText(node: FigmaNode): string {
  const texts = collectTextNodes(node);
  return texts.length > 0 ? textOf(texts[0]) : "";
}

export function buildButton(node: FigmaNode): XmlEl {
  return el("w2:button", { class: "btn_cm", id: "" }, [
    el("w2:textbox", { id: "", label: firstText(node), tagname: "span" }),
  ]);
}

export function buildText(node: FigmaNode): XmlEl {
  return el("w2:textbox", { id: "", label: firstText(node), tagname: "span" });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/snippets/button.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/snippets/builders/button.ts test/core/snippets/button.test.ts
git commit -m "feat(snippets): button and static text builders"
```

---

## Task 11: 정적 템플릿 빌더 (그리드/트리/아코디언/차트/스케줄캘린더/메시지)

내용 추론이 없는 스니핏은 카탈로그 리터럴을 `raw()`로 방출. 그리드만 기존 `buildGrid` 재사용.

**Files:**
- Create: `src/core/snippets/builders/statics.ts`
- Test: `test/core/snippets/statics.test.ts`

- [ ] **Step 1: Write the failing test**

`test/core/snippets/statics.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import * as S from "../../../src/core/snippets/builders/statics.js";
import type { FigmaNode } from "../../../src/core/types.js";

const frame = (texts: string[]): FigmaNode => ({
  id: "f", type: "FRAME", name: "f", width: 300, height: 100,
  children: texts.map((s, i) => ({ id: "t" + i, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [] })),
});

describe("static snippets", () => {
  it("grid reuses buildGrid with extracted columns", () => {
    expect(serialize(S.buildGridForNode(frame(["번호", "이름"])))).toContain("w2:gridView");
  });
  it("accordion emits a w2:accordion", () => {
    expect(serialize(S.buildAccordion())).toContain("w2:accordion");
  });
  it("tree emits a w2:treeview", () => {
    expect(serialize(S.buildTree())).toContain("w2:treeview");
  });
  it("message list emits a ul list", () => {
    expect(serialize(S.buildMessageList())).toContain('tagname="ul"');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/snippets/statics.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement grid wrapper + raw templates**

`src/core/snippets/builders/statics.ts`. 그리드는 기존 빌더 재사용. 나머지는 카탈로그에서 발췌한 리터럴을 `raw()` 로 감싼다. **아래 트리/아코디언/차트/스케줄/메시지 리터럴은 `all_components.xml` 의 해당 스니핏 블록을 그대로 복사해 채운다** (라인 범위: 트리 7_01 ≈ 1764–1876, 아코디언 10_01 ≈ 2116–2137, 메시지리스트 13_08 ≈ 2445–2480, 스케줄캘린더 99_01 ≈ 2488–2495, 차트 99_02/99_03 ≈ 2496–2520). 각 블록의 바깥 `meta_snippet*` 속성은 유지한다.

```ts
import type { FigmaNode } from "../../types.js";
import { raw, type XmlEl } from "../../xml.js";
import { buildGrid, gridConverter } from "../../converters/grid.js";

/** 그리드: 노드에서 컬럼 라벨을 뽑아 기존 빌더 재사용. */
export function buildGridForNode(node: FigmaNode): XmlEl {
  return buildGrid(gridConverter.extract(node).slots);
}

// 아래 템플릿 문자열은 all_components.xml 의 해당 스니핏 블록을 그대로 옮긴 것.
export function buildAccordion(): XmlEl {
  return raw(`<!-- TODO: 카탈로그 10_01 아코디언 블록(약 2116-2137행)을 그대로 붙여넣기 -->`);
}
export function buildTree(): XmlEl {
  return raw(`<!-- TODO: 카탈로그 7_01 트리 블록(약 1764-1876행)을 그대로 붙여넣기 -->`);
}
export function buildChartBar(): XmlEl {
  return raw(`<!-- TODO: 카탈로그 99_02 차트(막대형) 블록을 그대로 붙여넣기 -->`);
}
export function buildChartPie(): XmlEl {
  return raw(`<!-- TODO: 카탈로그 99_03 차트(원형) 블록을 그대로 붙여넣기 -->`);
}
export function buildSchedule(): XmlEl {
  return raw(`<!-- TODO: 카탈로그 99_01 스케줄캘린더 블록을 그대로 붙여넣기 -->`);
}
export function buildMessageList(): XmlEl {
  return raw(`<!-- TODO: 카탈로그 13_08 리스트 블록을 그대로 붙여넣기 -->`);
}
```

> **구현자 주의:** 위 `TODO` 주석은 플레이스홀더가 아니라 **데이터 복사 지시**다. 실제 구현 시 각 `raw(...)` 안의 주석을 `all_components.xml` 의 해당 블록 문자열로 교체해야 테스트(`w2:accordion`, `w2:treeview`, `tagname="ul"` 등 포함)가 통과한다. 백틱/`${` 가 포함될 수 있으니 템플릿 리터럴 대신 `String.raw` 또는 일반 따옴표 연결을 쓰고, 내부 `"` 는 그대로 둔다. 줄바꿈/들여쓰기는 제거해도 무방.

- [ ] **Step 4: Replace TODO literals with catalog blocks, then run test**

`all_components.xml` 의 각 블록(위 라인 범위)을 Read 로 열어 해당 스니핏의 최상위 엘리먼트 전체를 복사해 각 `raw()` 인자로 넣는다. 그 후:

Run: `npx vitest run test/core/snippets/statics.test.ts`
Expected: PASS (grid/accordion/tree/messageList 어서션 충족)

- [ ] **Step 5: Commit**

```bash
git add src/core/snippets/builders/statics.ts test/core/snippets/statics.test.ts
git commit -m "feat(snippets): static catalog templates (tree/accordion/chart/schedule/message) + grid wrapper"
```

---

## Task 12: 레지스트리 조립 (SNIPPETS + 헬퍼)

모든 빌더를 SnippetDef 로 등록하고 조회/그룹화/기본값/레거시 매핑을 제공.

**Files:**
- Create: `src/core/snippets/registry.ts`
- Test: `test/core/snippets/registry.test.ts`

- [ ] **Step 1: Write the failing test**

`test/core/snippets/registry.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import {
  getSnippet, snippetsByCategory, catalogDescriptor,
  LEGACY_REGION_TYPE_TO_ID, defaultSnippetFor, SNIPPETS,
} from "../../../src/core/snippets/registry.js";
import type { FigmaNode } from "../../../src/core/types.js";

describe("snippet registry", () => {
  it("every snippet id is unique", () => {
    const ids = SNIPPETS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getSnippet returns a buildable def", () => {
    const def = getSnippet("title-main");
    expect(def?.category).toBe("02_타이틀");
  });

  it("groups variants under categories", () => {
    const cats = snippetsByCategory();
    const table = cats.find((c) => c.categoryLabel === "입출력테이블");
    expect((table?.variants.length ?? 0)).toBeGreaterThanOrEqual(2);
  });

  it("descriptor has no build functions (serializable)", () => {
    const json = JSON.stringify(catalogDescriptor());
    expect(json).not.toContain("function");
    expect(JSON.parse(json)[0]).toHaveProperty("variants");
  });

  it("legacy region types map to real ids", () => {
    for (const id of Object.values(LEGACY_REGION_TYPE_TO_ID)) {
      expect(getSnippet(id)).toBeTruthy();
    }
  });

  it("defaultSnippetFor returns an existing id with confidence", () => {
    const node: FigmaNode = { id: "n", type: "FRAME", name: "btn_저장", width: 80, height: 30,
      children: [{ id: "t", type: "TEXT", name: "저장", characters: "저장", width: 40, height: 16, children: [] }] };
    const { id, confidence } = defaultSnippetFor(node);
    expect(getSnippet(id)).toBeTruthy();
    expect(confidence).toBe("high");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/snippets/registry.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement**

`src/core/snippets/registry.ts`:

```ts
import type { FigmaNode } from "../types.js";
import type { SnippetDef, CatalogCategory, RenderOpts } from "./types.js";
import { classifyRegion } from "../regions.js";
import { buildSplit } from "./builders/split.js";
import { buildTitle } from "./builders/title.js";
import { buildSearch } from "./builders/search.js";
import { buildTableForNode } from "./builders/table.js";
import { buildTab } from "./builders/tab.js";
import * as SF from "./builders/singleForm.js";
import * as MF from "./builders/multiForm.js";
import { buildButton, buildText } from "./builders/button.js";
import * as ST from "./builders/statics.js";

/** id → {category, name, label, build}. 카테고리 라벨은 def 마다 명시. */
function def(
  id: string, category: string, categoryLabel: string, name: string, label: string,
  build: (n: FigmaNode, o: RenderOpts) => import("../xml.js").XmlEl
): SnippetDef {
  return { id, category, categoryLabel, name, label, build };
}

export const SNIPPETS: SnippetDef[] = [
  // 01_화면분할
  def("split-2", "01_화면분할", "화면분할", "1_01 분할(2단)", "2단", () => buildSplit([5, 5])),
  def("split-3", "01_화면분할", "화면분할", "1_03 분할(3단)", "3단", () => buildSplit([3, 3, 3])),
  def("split-4", "01_화면분할", "화면분할", "1_04 분할(4단)", "4단", () => buildSplit([2, 2, 2, 2])),
  def("split-2-8", "01_화면분할", "화면분할", "1_05 분할(2-8)", "2-8", () => buildSplit([2, 8])),
  def("split-3-7", "01_화면분할", "화면분할", "1_06 분할(3-7)", "3-7", () => buildSplit([3, 7])),
  def("split-7-3", "01_화면분할", "화면분할", "1_09 분할(7-3)", "7-3", () => buildSplit([7, 3])),
  // 02_타이틀
  def("title-main", "02_타이틀", "타이틀", "2_02 타이틀그룹(제목)", "제목", (n, o) => buildTitle("main", n, o)),
  def("title-sub", "02_타이틀", "타이틀", "2_03 타이틀그룹(소제목)", "소제목", (n, o) => buildTitle("sub", n, o)),
  // 03_조회영역
  def("search-1x2", "03_조회영역", "조회영역", "3_01 조회(1행 2단)", "1행 2단", () => buildSearch(1, 2)),
  def("search-2x2", "03_조회영역", "조회영역", "3_03 조회(2행 2단)", "2행 2단", () => buildSearch(2, 2)),
  def("search-2x3", "03_조회영역", "조회영역", "3_04 조회(2행 3단)", "2행 3단", () => buildSearch(2, 3)),
  // 04_탭
  def("tab", "04_탭", "탭", "4_01 탭", "탭", (n) => buildTab(n)),
  // 05_입출력테이블
  def("table-1", "05_입출력테이블", "입출력테이블", "5_01 테이블(1단)", "1단", (n) => buildTableForNode(n, 1)),
  def("table-2", "05_입출력테이블", "입출력테이블", "5_02 테이블(2단)", "2단", (n) => buildTableForNode(n, 2)),
  def("table-3", "05_입출력테이블", "입출력테이블", "5_03 테이블(3단)", "3단", (n) => buildTableForNode(n, 3)),
  // 06_그리드
  def("grid", "06_그리드", "그리드", "6_01 그리드", "그리드", (n) => ST.buildGridForNode(n)),
  // 07_트리
  def("tree", "07_트리", "트리", "7_01 트리", "트리", () => ST.buildTree()),
  // 08_기본버튼
  def("button", "08_기본버튼", "버튼", "8_02 기본버튼", "기본버튼", (n) => buildButton(n)),
  // 10_아코디언
  def("accordion", "10_아코디언", "아코디언", "10_01 아코디언", "아코디언", () => ST.buildAccordion()),
  // 11_단일입력폼
  def("input", "11_단일입력폼", "단일입력폼", "11_05 인풋", "인풋", () => SF.buildInput()),
  def("select", "11_단일입력폼", "단일입력폼", "11_07 셀렉트", "셀렉트", () => SF.buildSelect()),
  def("radio", "11_단일입력폼", "단일입력폼", "11_02 라디오", "라디오", () => SF.buildRadio()),
  def("checkbox", "11_단일입력폼", "단일입력폼", "11_03 체크박스", "체크박스", () => SF.buildCheckboxGroup()),
  def("calendar-ymd", "11_단일입력폼", "단일입력폼", "11_09 인풋캘린더(년월일)", "캘린더(년월일)", () => SF.buildCalendar("yearMonthDate")),
  def("calendar-ym", "11_단일입력폼", "단일입력폼", "11_11 인풋캘린더(년월)", "캘린더(년월)", () => SF.buildCalendar("yearMonth")),
  def("textarea", "11_단일입력폼", "단일입력폼", "11_13 텍스트에어리어", "텍스트에어리어", () => SF.buildTextarea()),
  def("checkcombo", "11_단일입력폼", "단일입력폼", "11_17 체크콤보박스", "체크콤보박스", () => SF.buildCheckCombo()),
  def("autocomplete", "11_단일입력폼", "단일입력폼", "11_15 오토컴플릿", "오토컴플릿", () => SF.buildAutoComplete()),
  def("upload", "11_단일입력폼", "단일입력폼", "11_19 업로드", "업로드", () => SF.buildUpload()),
  // 12_다중입력폼
  def("addr", "12_다중입력폼", "다중입력폼", "12_06 주소", "주소", () => MF.buildAddress()),
  def("email", "12_다중입력폼", "다중입력폼", "12_04 이메일", "이메일", () => MF.buildEmail()),
  def("phone", "12_다중입력폼", "다중입력폼", "12_03 전화번호", "전화번호", () => MF.buildPhone()),
  def("period", "12_다중입력폼", "다중입력폼", "12_05 기간조회", "기간조회", () => MF.buildPeriod()),
  def("amount", "12_다중입력폼", "다중입력폼", "12_07 금액", "금액", () => MF.buildAmount()),
  def("code", "12_다중입력폼", "다중입력폼", "12_01 코드조회", "코드조회", () => MF.buildCodeSearch()),
  // 13_메시지
  def("msg-list", "13_메시지", "메시지", "13_08 리스트", "리스트", () => ST.buildMessageList()),
  // 99_기타
  def("chart-bar", "99_기타", "기타", "99_02 차트(막대형)", "차트(막대형)", () => ST.buildChartBar()),
  def("chart-pie", "99_기타", "기타", "99_03 차트(원형)", "차트(원형)", () => ST.buildChartPie()),
  def("schedule", "99_기타", "기타", "99_01 스케줄캘린더", "스케줄캘린더", () => ST.buildSchedule()),
  // 텍스트 / 그룹 (구조 영역)
  def("text", "02_타이틀", "타이틀", "2_08 타이틀(제목)", "단일 텍스트", (n) => buildText(n)),
];

const BY_ID = new Map(SNIPPETS.map((s) => [s.id, s]));

export function getSnippet(id: string): SnippetDef | undefined {
  return BY_ID.get(id);
}

export function snippetsByCategory(): CatalogCategory[] {
  const out: CatalogCategory[] = [];
  for (const s of SNIPPETS) {
    let cat = out.find((c) => c.category === s.category);
    if (!cat) { cat = { category: s.category, categoryLabel: s.categoryLabel, variants: [] }; out.push(cat); }
    cat.variants.push({ id: s.id, label: s.label });
  }
  return out;
}

/** UI postMessage 용 (snippetsByCategory 와 동일 구조, build 없음). */
export function catalogDescriptor(): CatalogCategory[] {
  return snippetsByCategory();
}

/** 기존 RegionType 문자열 → 기본 snippetId (하위호환). */
export const LEGACY_REGION_TYPE_TO_ID: Record<string, string> = {
  title: "title-main", inputTable: "table-1", grid: "grid", button: "button",
  input: "input", select: "select", text: "text", tab: "tab", group: "split-2",
};

/** 노드 1차 추측 → 기본 snippetId + confidence. 기존 classifyRegion 휴리스틱 재사용. */
export function defaultSnippetFor(node: FigmaNode): { id: string; confidence: "high" | "medium" | "low" } {
  const { type, confidence } = classifyRegion(node);
  return { id: LEGACY_REGION_TYPE_TO_ID[type] ?? "split-2", confidence };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run test/core/snippets/registry.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/core/snippets/registry.ts test/core/snippets/registry.test.ts
git commit -m "feat(snippets): assemble registry (SNIPPETS, lookup, descriptor, legacy map)"
```

---

## Task 13: regions.ts — Region.snippetId 로 전환

**Files:**
- Modify: `src/core/regions.ts`
- Test: `test/core/regions.test.ts`

- [ ] **Step 1: Update the test**

`test/core/regions.test.ts` 에서 `analyzeRegions` 검사 부분을 snippetId 기준으로 바꾼다. 기존 `classifyRegion` 단언은 그대로 둔다(함수는 유지). `analyzeRegions` 관련 테스트를 다음으로 교체/추가:

```ts
import { analyzeRegions } from "../../src/core/regions.js";
import { getSnippet } from "../../src/core/snippets/registry.js";

describe("analyzeRegions", () => {
  it("assigns an existing snippetId per child", () => {
    const root: FigmaNode = { id: "r", type: "FRAME", name: "r", width: 800, height: 400, children: [
      frame("btn_저장", [text("저장")]),
      frame("grid_목록", [text("번호")]),
    ]};
    const regions = analyzeRegions(root);
    expect(regions).toHaveLength(2);
    for (const r of regions) expect(getSnippet(r.snippetId)).toBeTruthy();
    expect(regions[0].snippetId).toBe("button");
  });
});
```

(파일에 `analyzeRegions` 를 검사하는 기존 테스트가 `type` 필드를 본다면 `snippetId` 로 수정.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/regions.test.ts`
Expected: FAIL — `Region.snippetId` 없음 / 컴파일 에러.

- [ ] **Step 3: Implement**

`src/core/regions.ts` 의 `Region` 인터페이스에서 `type: RegionType` 를 `snippetId: string` 로 바꾸고, `analyzeRegions` 를 `defaultSnippetFor` 기반으로 수정. `classifyRegion`/`RegionType`/`KIND_TO_REGION` 은 그대로 유지(레지스트리가 재사용).

```ts
import { defaultSnippetFor } from "./snippets/registry.js";
// ... 기존 import 유지 ...

export interface Region {
  id: string;
  name: string;
  snippetId: string;
  confidence: Confidence;
  texts: string[];
}

export function analyzeRegions(root: FigmaNode): Region[] {
  const clean = denoise(root);
  return clean.children.map((child) => {
    const { id, confidence } = defaultSnippetFor(child);
    const texts = collectTextNodes(child).map(textOf).filter((s) => s !== "");
    return { id: child.id, name: child.name, snippetId: id, confidence, texts };
  });
}
```

> **순환 import 주의:** `regions.ts` 가 `registry.ts` 를 import 하고 `registry.ts` 가 `regions.ts`(classifyRegion) 를 import 한다. ESM 은 함수 호출이 런타임이라 동작하지만, 안전을 위해 `defaultSnippetFor` 는 `classifyRegion` 을 모듈 최상위가 아닌 함수 본문에서 호출한다(현재 구현이 이미 그러함). 빌드(`npx tsc --noEmit -p .`)로 확인.

- [ ] **Step 4: Run test + typecheck**

Run: `npx vitest run test/core/regions.test.ts && npx tsc --noEmit -p .`
Expected: PASS, no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/core/regions.ts test/core/regions.test.ts
git commit -m "refactor(regions): Region carries snippetId from registry default"
```

---

## Task 14: assemble.ts — 레지스트리 디스패치

**Files:**
- Modify: `src/core/assemble.ts`
- Test: `test/core/assemble.test.ts`

- [ ] **Step 1: Update the test**

`assemblePage` 호출의 두번째 인자(과거 `typeById: Record<id, RegionType>`)는 그대로 RegionType 문자열을 받아도 동작해야 한다(레거시 호환). snippetId 도 받는다. 다음 테스트를 추가:

```ts
import { assemblePage } from "../../src/core/assemble.js";

it("accepts snippetId overrides directly", () => {
  const root: FigmaNode = { id: "r", type: "FRAME", name: "scr", width: 400, height: 100, children: [
    { id: "c1", type: "FRAME", name: "f", width: 400, height: 40, children: [
      { id: "t", type: "TEXT", name: "이메일", characters: "이메일", width: 40, height: 16, children: [] }] },
  ]};
  const xml = assemblePage(root, { c1: "email" });
  expect(xml).toContain('label="@"');
});

it("still accepts legacy RegionType strings", () => {
  const root: FigmaNode = { id: "r", type: "FRAME", name: "scr", width: 400, height: 100, children: [
    { id: "c1", type: "FRAME", name: "f", width: 400, height: 40, children: [
      { id: "t", type: "TEXT", name: "제목", characters: "제목", width: 40, height: 16, children: [] }] },
  ]};
  const xml = assemblePage(root, { c1: "title" });
  expect(xml).toContain('class="tit_main"');
});
```

(기존 assemble 테스트가 `renderRegion` 을 직접 import 한다면 아래 호환 export 로 유지된다.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run test/core/assemble.test.ts`
Expected: FAIL (snippetId 경로 미구현 / 컴파일 에러).

- [ ] **Step 3: Implement**

`src/core/assemble.ts` 를 다음 골격으로 재작성. 핵심 변경: `renderRegion(type,...)` switch 를 `renderSnippet(snippetId,...)` 로 교체, snippetId 는 `getSnippet` 로 빌드하고 레지스트리 def 의 category/name 으로 `withMeta`. 연속 입출력테이블 병합은 `getSnippet(id).category === "05_입출력테이블"` 로 판정. 레거시 RegionType 문자열은 `LEGACY_REGION_TYPE_TO_ID` 로 변환.

```ts
import type { FigmaNode } from "./types.js";
import { el, serialize, escapeAttr, type XmlEl } from "./xml.js";
import { collectTextNodes, textOf } from "./extract.js";
import { denoise, isNoise } from "./denoise.js";
import { defaultSnippetFor } from "./snippets/registry.js";
import { getSnippet, LEGACY_REGION_TYPE_TO_ID } from "./snippets/registry.js";
import { withMeta } from "./snippets/builders/meta.js";
import { buildFormTable } from "./converters/inputTable.js";
import type { RenderOpts } from "./snippets/types.js";

/** 작은 정사각형(체크 박스) — denoise 전 RAW에서 본다. */
function isControlBox(n: FigmaNode): boolean {
  if (collectTextNodes(n).length > 0) return false;
  const square = Math.abs(n.width - n.height) <= 6;
  return square && n.width >= 10 && n.width <= 28;
}

export function findCheckboxLabels(node: FigmaNode): string[] {
  const out: string[] = [];
  const walk = (n: FigmaNode) => {
    if (n.children.some(isControlBox)) {
      const label = n.children.filter((c) => c.type === "TEXT").map(textOf).find((t) => t !== "");
      if (label) out.push(label);
    }
    n.children.forEach(walk);
  };
  walk(node);
  return out;
}

/** 들어온 키가 레거시 RegionType 이면 snippetId 로 변환. */
function normalizeId(key: string): string {
  return getSnippet(key) ? key : (LEGACY_REGION_TYPE_TO_ID[key] ?? key);
}

/** 한 영역을 snippetId 로 렌더 (레지스트리 빌더 + 메타). */
export function renderSnippet(snippetId: string, node: FigmaNode, opts: RenderOpts = {}): XmlEl {
  const def = getSnippet(normalizeId(snippetId));
  if (!def) return el("xf:group", { class: "", id: "" });
  return withMeta(def.build(node, opts), def.category, def.name);
}

function wrapDocument(screenName: string, bodyInner: string): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" ' +
    'xmlns:w2="http://www.inswave.com/websquare" xmlns:xf="http://www.w3.org/2002/xforms">' +
    `<head meta_screenName="${escapeAttr(screenName)}">` +
    "<w2:type>COMPONENT</w2:type><w2:buildDate/>" +
    '<xf:model><xf:instance><data xmlns=""/></xf:instance></xf:model>' +
    '<script type="text/javascript"><![CDATA[]]></script>' +
    "</head>" +
    `<body>${bodyInner}</body>` +
    "</html>"
  );
}

function rowLabel(node: FigmaNode): string {
  const texts = collectTextNodes(node).map(textOf).filter((s) => s !== "" && s.trim() !== "*");
  return texts[0] ?? "";
}

export function assemblePage(root: FigmaNode, idById: Record<string, string> = {}): string {
  const raws = root.children.filter((c) => !isNoise(c));
  const children = raws.map(denoise);
  const idOf = (i: number): string =>
    normalizeId(idById[children[i].id] ?? defaultSnippetFor(children[i]).id);
  const isTable = (i: number): boolean => getSnippet(idOf(i))?.category === "05_입출력테이블";

  const regionEls: XmlEl[] = [];
  for (let i = 0; i < children.length; ) {
    if (isTable(i)) {
      const start = i;
      while (i < children.length && isTable(i)) i++;
      const run = children.slice(start, i);
      if (run.length >= 2) {
        regionEls.push(withMeta(buildFormTable(run.map(rowLabel)), "05_입출력테이블", "5_01 테이블(1단)"));
      } else {
        regionEls.push(renderSnippet(idOf(start), run[0]));
      }
      continue;
    }
    const def = getSnippet(idOf(i));
    const opts: RenderOpts = def?.category === "02_타이틀" ? { checkboxes: findCheckboxLabels(raws[i]) } : {};
    regionEls.push(renderSnippet(idOf(i), children[i], opts));
    i++;
  }

  const sub = el("xf:group", { class: "sub_contents", id: "", meta_componentContainer: "true" }, regionEls);
  return wrapDocument(root.name, serialize(sub));
}
```

> 기존 `assemble.ts` 의 `renderRegion`/`buildTab`/`buildCheckbox`/`withMeta` 로컬 정의는 삭제(레지스트리/빌더로 이동했음). 기존 테스트가 `renderRegion` 을 import 한다면, 호환 위해 파일 끝에 `export const renderRegion = (type: string, node: FigmaNode, opts: RenderOpts = {}) => renderSnippet(type, node, opts);` 를 추가한다.

- [ ] **Step 4: Run test + full suite**

Run: `npx vitest run test/core/assemble.test.ts`
Expected: PASS
Run: `npm test`
Expected: 전체 그린 (실패 시 해당 테스트의 `type`→`snippetId`/문자열 기대값을 맞춘다).

- [ ] **Step 5: Commit**

```bash
git add src/core/assemble.ts test/core/assemble.test.ts
git commit -m "refactor(assemble): dispatch via snippet registry, keep legacy RegionType compat"
```

---

## Task 15: main.ts — 카탈로그 descriptor 전송 + snippetById

**Files:**
- Modify: `src/main.ts`
- Test: `test/main/serialize.test.ts` (해당되면) — 주로 수동 빌드 확인

- [ ] **Step 1: Implement**

`src/main.ts` 변경:
1. import 추가: `import { catalogDescriptor } from "./core/snippets/registry.js";`
2. `analyze` 핸들러에서 `regions` 메시지에 `catalog` 동봉:

```ts
    if (msg.type === "analyze") {
      const scene = selectedOne();
      if (!scene) return;
      const regions = analyzeRegions(toFigmaNode(scene));
      figma.ui.postMessage({ type: "regions", regions, catalog: catalogDescriptor() });
      return;
    }
```

3. `generate` 핸들러의 메시지 타입을 `snippetById` 로:

```ts
  figma.ui.onmessage = (
    msg: { type: string; snippetById?: Record<string, string> }
  ) => {
    ...
    if (msg.type === "generate") {
      const scene = selectedOne();
      if (!scene) return;
      const xml = assemblePage(toFigmaNode(scene), msg.snippetById ?? {});
      figma.ui.postMessage({ type: "result", xml: prettyXml(xml), warnings: [] });
      return;
    }
```

`RegionType` import 가 더 이상 쓰이지 않으면 제거.

- [ ] **Step 2: Typecheck + build**

Run: `npx tsc --noEmit -p . && npm run build`
Expected: no errors, `build complete` 출력.

- [ ] **Step 3: Commit**

```bash
git add src/main.ts
git commit -m "feat(main): send catalog descriptor on analyze, accept snippetById on generate"
```

---

## Task 16: ui.ts — 2단계 카테고리/변형 드롭다운

**Files:**
- Modify: `src/ui.ts`
- (필요 시) Modify: `src/ui.html`

- [ ] **Step 1: Implement**

`src/ui.ts` 변경 요지:
1. `REGION_TYPES` 상수 삭제.
2. 수신한 `catalog`(CatalogCategory[]) 를 모듈 변수에 저장.
3. `Region` 인터페이스의 `type` → `snippetId`.
4. 영역 행마다 **카테고리 select + 변형 select** 2개 생성. 카테고리 변경 시 변형 옵션 재구성. 초기값은 영역 `snippetId` 가 속한 카테고리/변형.
5. `generate` 클릭 시 변형 select 의 값(snippetId)을 모아 `snippetById` 로 전송.

```ts
interface CatalogCategory { category: string; categoryLabel: string; variants: { id: string; label: string }[]; }
interface Region { id: string; name: string; snippetId: string; confidence: "high" | "medium" | "low"; texts: string[]; }

let CATALOG: CatalogCategory[] = [];

function categoryOf(snippetId: string): CatalogCategory | undefined {
  return CATALOG.find((c) => c.variants.some((v) => v.id === snippetId));
}

function fillVariants(variantSel: HTMLSelectElement, cat: CatalogCategory, selectedId?: string): void {
  variantSel.innerHTML = "";
  for (const v of cat.variants) {
    const o = document.createElement("option");
    o.value = v.id; o.textContent = v.label;
    if (v.id === selectedId) o.selected = true;
    variantSel.appendChild(o);
  }
}

$("generate").onclick = () => {
  const snippetById: Record<string, string> = {};
  $("regions").querySelectorAll<HTMLSelectElement>("select[data-variant]").forEach((sel) => {
    snippetById[sel.dataset.variant as string] = sel.value;
  });
  post({ type: "generate", snippetById });
};
```

`renderRegions` 의 select 생성부를 다음으로 교체:

```ts
    const initCat = categoryOf(r.snippetId) ?? CATALOG[0];

    const catSel = document.createElement("select");
    catSel.dataset.cat = r.id;
    for (const c of CATALOG) {
      const o = document.createElement("option");
      o.value = c.category; o.textContent = c.categoryLabel;
      if (c.category === initCat.category) o.selected = true;
      catSel.appendChild(o);
    }

    const varSel = document.createElement("select");
    varSel.dataset.variant = r.id;
    fillVariants(varSel, initCat, r.snippetId);

    catSel.onchange = () => {
      const cat = CATALOG.find((c) => c.category === catSel.value);
      if (cat) fillVariants(varSel, cat);
    };

    row.appendChild(info);
    row.appendChild(badge);
    row.appendChild(catSel);
    row.appendChild(varSel);
    host.appendChild(row);
```

`onmessage` 의 `regions` 분기에서 catalog 저장:

```ts
  if (msg.type === "regions") {
    CATALOG = msg.catalog ?? [];
    renderRegions(msg.regions);
    return;
  }
```

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: `build complete: dist/main.js, dist/ui.html`

- [ ] **Step 3: Manual smoke (선택)**

Figma 에서 dist 플러그인 로드 → 프레임 선택 → 분석 → 영역마다 카테고리/변형 두 드롭다운 노출, 변형 변경 후 생성 시 해당 스니핏 XML 출력 확인.

- [ ] **Step 4: Commit**

```bash
git add src/ui.ts src/ui.html
git commit -m "feat(ui): two-level category/variant snippet selection from catalog"
```

---

## Task 17: 전체 검증

- [ ] **Step 1: Full test + typecheck + build**

Run: `npm test && npx tsc --noEmit -p . && npm run build`
Expected: 전체 PASS, 타입 에러 0, 빌드 성공.

- [ ] **Step 2: 통합 테스트 확인**

`test/integration/addressForm.test.ts`, `test/integration/convert.test.ts` 가 그린인지 확인. 주소 폼 영역이 `addr`/`table-1` 등으로 잘 조립되는지 스냅샷/문자열 단언 점검. 깨지면 기대값을 새 스니핏 출력에 맞춘다(회귀가 아니라 의도된 변경인지 확인 후).

- [ ] **Step 3: Commit (필요 시 픽스처/기대값 갱신)**

```bash
git add -A
git commit -m "test: align integration fixtures with snippet registry output"
```

---

## Self-Review 메모

- **스펙 커버리지:** 2단계 UI(Task 16), 카탈로그 전체 매핑(Task 3–12 빌더 + Task 12 레지스트리), raw 패스스루(Task 1), 자동분류 기본 변형(Task 12 `defaultSnippetFor`, Task 13), 하위호환(Task 12 LEGACY 맵 + Task 14 normalizeId), 테스트(각 Task) 모두 태스크로 존재.
- **정적 템플릿(Task 11)** 의 `raw()` 리터럴은 카탈로그 블록 복사가 필요한 데이터 태스크 — 구현자 주의 문구로 명시(플레이스홀더 아님).
- **타입 일관성:** `Region.snippetId`(string), `assemblePage(root, idById)`, `renderSnippet(snippetId,...)`, `getSnippet/snippetsByCategory/catalogDescriptor/defaultSnippetFor/LEGACY_REGION_TYPE_TO_ID` 시그니처가 Task 12–16 에서 일관.
- **범위 밖:** 기존 `Converter` 레지스트리(`registry.ts`)·`convert()` 는 변경하지 않음(독립 유지).
