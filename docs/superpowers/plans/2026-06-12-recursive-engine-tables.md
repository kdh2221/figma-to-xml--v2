# 재귀 변환 엔진 + 테이블 패밀리 (슬라이스 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 선택 레이어의 하위 구조를 **이름 기반으로 재귀 분석**해 변환하는 엔진을 신설하고, 테이블을 `label`→th / `\btd`→td 로 정확히 매핑한다(보고된 th/td 버그 해결). 행/열은 **프레임 중첩 + `layoutMode`** 로만 복원(절대좌표 미사용), td 컨트롤은 **기존 스니핏 빌더** 재사용.

**Architecture:** 새 모듈 `src/core/recursive/` (기존 `assemble.ts`/`regions.ts`와 분리). `names.ts`(이름 판정) → `table.ts`(구조 기반 테이블) → `engine.ts`(인식기 레지스트리 + 재귀 walker) → `index.ts`(`convertPageRecursive`, 기존 `wrapDocument` 재사용). `main.ts`의 `generate`가 새 엔진을 호출.

**Tech Stack:** TypeScript ESM(`.js` import 확장자), Vitest. XML은 기존 `el()`/`serialize()`. 컨트롤은 `src/core/snippets/builders/*` 재사용.

**참고:** `el(tag, attrs, children)`은 자식 없으면 self-closing. `denoise.ts`의 `isNoise(n)`은 텍스트 없는 도형/컨테이너=노이즈. `FigmaNode.layoutMode`는 `"HORIZONTAL"|"VERTICAL"`(없을 수 있음). 덤프의 `\btd`는 이름이 백스페이스(\x08)+`td`.

---

### Task 1: names.ts — 이름 판정 헬퍼

**Files:**
- Create: `src/core/recursive/names.ts`
- Test: `test/core/recursive/names.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`test/core/recursive/names.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import * as N from "../../../src/core/recursive/names.js";
import type { FigmaNode } from "../../../src/core/types.js";

const node = (name: string, children: FigmaNode[] = [], type = "INSTANCE"): FigmaNode =>
  ({ id: name, type, name, width: 40, height: 20, children });
const text = (s: string): FigmaNode =>
  ({ id: "t" + s, type: "TEXT", name: s, characters: s, width: 10, height: 10, children: [] });

describe("recursive names", () => {
  it("isTable matches 'Table' case-insensitively", () => {
    expect(N.isTable(node("Table"))).toBe(true);
    expect(N.isTable(node("table"))).toBe(true);
    expect(N.isTable(node("Frame 2561"))).toBe(false);
  });
  it("isLabelCell matches 'label'", () => {
    expect(N.isLabelCell(node("label"))).toBe(true);
    expect(N.isLabelCell(node("Table"))).toBe(false);
  });
  it("isTdCell matches control-char-prefixed td (\\btd)", () => {
    expect(N.isTdCell(node("\btd"))).toBe(true);
    expect(N.isTdCell(node("td"))).toBe(true);
    expect(N.isTdCell(node("label"))).toBe(false);
  });
  it("isSelectbox / isBoxItem / isButtonNode", () => {
    expect(N.isSelectbox(node("selectbox"))).toBe(true);
    expect(N.isBoxItem(node("item/boxitem"))).toBe(true);
    expect(N.isButtonNode(node("Button"))).toBe(true);
    expect(N.isButtonNode(node("Button_M"))).toBe(true);
    expect(N.isButtonNode(node("label"))).toBe(false);
  });
  it("isRequiredLabel detects a '*' text descendant", () => {
    expect(N.isRequiredLabel(node("label", [text("필수 항목"), text("*")]))).toBe(true);
    expect(N.isRequiredLabel(node("label", [text("항목")]))).toBe(false);
  });
  it("controlKindOfBoxItem reads child icon name", () => {
    expect(N.controlKindOfBoxItem(node("item/boxitem", [text("P"), node("arrow-down")]))).toBe("select");
    expect(N.controlKindOfBoxItem(node("item/boxitem", [text("P"), node("calendar")]))).toBe("calendar");
    expect(N.controlKindOfBoxItem(node("item/boxitem", [text("P"), node("search-01")]))).toBe("input");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run test/core/recursive/names.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`src/core/recursive/names.ts`:
```ts
import type { FigmaNode } from "../types.js";
import { collectTextNodes, textOf } from "../extract.js";

/** 제어문자 제거 + trim + 소문자 (\btd → "td") */
function cleanName(n: FigmaNode): string {
  return n.name.replace(/[\x00-\x1f]/g, "").trim().toLowerCase();
}

export function isTable(n: FigmaNode): boolean { return cleanName(n) === "table"; }
export function isLabelCell(n: FigmaNode): boolean { return cleanName(n) === "label"; }
export function isTdCell(n: FigmaNode): boolean { return cleanName(n) === "td"; }
export function isSelectbox(n: FigmaNode): boolean { return cleanName(n) === "selectbox"; }
export function isBoxItem(n: FigmaNode): boolean { return cleanName(n).includes("boxitem"); }
export function isButtonNode(n: FigmaNode): boolean { return cleanName(n).startsWith("button"); }

/** 라벨 안에 '*' 텍스트가 있으면 필수 */
export function isRequiredLabel(n: FigmaNode): boolean {
  return collectTextNodes(n).map(textOf).some((t) => t.trim() === "*");
}

/** item/boxitem 안의 아이콘 인스턴스 이름으로 컨트롤 종류 추론 */
export function controlKindOfBoxItem(n: FigmaNode): "input" | "select" | "calendar" {
  let kind: "input" | "select" | "calendar" = "input";
  const walk = (m: FigmaNode) => {
    for (const c of m.children) {
      const nm = c.name.replace(/[\x00-\x1f]/g, "").trim().toLowerCase();
      if (nm.includes("calendar")) kind = "calendar";
      else if (nm.includes("arrow-down")) kind = "select";
      walk(c);
    }
  };
  walk(n);
  return kind;
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run test/core/recursive/names.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**
```bash
git add src/core/recursive/names.ts test/core/recursive/names.test.ts
git commit -m "feat(recursive): semantic layer-name matchers"
```

---

### Task 2: table.ts — 구조 기반 테이블 변환

**Files:**
- Create: `src/core/recursive/table.ts`
- Test: `test/core/recursive/table.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`test/core/recursive/table.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import { buildTableXml, buildControl } from "../../../src/core/recursive/table.js";
import type { FigmaNode } from "../../../src/core/types.js";

let seq = 0;
const F = (name: string, children: FigmaNode[], layoutMode?: string): FigmaNode =>
  ({ id: name + ++seq, type: "FRAME", name, width: 100, height: 38, children, ...(layoutMode ? { layoutMode } : {}) });
const I = (name: string, children: FigmaNode[]): FigmaNode =>
  ({ id: name + ++seq, type: "INSTANCE", name, width: 40, height: 20, children });
const TX = (s: string): FigmaNode =>
  ({ id: "t" + ++seq, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [] });

const label = (t: string, req = false) => I("label", req ? [TX(t), TX("*")] : [TX(t)]);
const td = (children: FigmaNode[]) => I("\btd", children);
const boxSelect = () => I("item/boxitem", [TX("Placeholder"), I("arrow-down", [])]);
const button = (l: string) => I("Button", [TX(l)]);

// 폼형 2단 테이블 (332:10400 구조 모사)
const formTable = F("Table", [
  F("row1", [
    F("h1", [label("항목"), td([TX("input field"), button("버튼")])], "HORIZONTAL"),
    F("h2", [label("항목"), td([TX("input field")])], "HORIZONTAL"),
  ], "HORIZONTAL"),
  F("row2", [
    F("h3", [label("필수 항목", true), boxSelect()], "HORIZONTAL"),
    F("h4", [label("항목"), td([TX("input field")])], "HORIZONTAL"),
  ], "HORIZONTAL"),
], "VERTICAL");

describe("buildControl", () => {
  it("selectbox/boxitem(arrow-down) → select", () => {
    expect(serialize(buildControl(boxSelect()))).toContain("xf:select1");
  });
  it("Button → btn_cm with label", () => {
    expect(serialize(buildControl(button("조회")))).toContain('label="조회"');
  });
});

describe("buildTableXml (form, no coords)", () => {
  const xml = serialize(buildTableXml(formTable));
  it("th count = number of label cells (4), not every text", () => {
    expect((xml.match(/tagname="th"/g) ?? []).length).toBe(4);
  });
  it("td count = number of value cells (4)", () => {
    expect((xml.match(/tagname="td"/g) ?? []).length).toBe(4);
  });
  it("required label gets req class", () => {
    expect(xml).toContain('class="req"');
  });
  it("value cell renders a control (select for arrow-down boxitem)", () => {
    expect(xml).toContain("xf:select1");
  });
  it("is wrapped in tblbox/w2tb tbl", () => {
    expect(xml).toContain('class="tblbox"');
    expect(xml).toContain('class="w2tb tbl"');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run test/core/recursive/table.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`src/core/recursive/table.ts`:
```ts
import type { FigmaNode } from "../types.js";
import { el, type XmlEl } from "../xml.js";
import { collectTextNodes, textOf } from "../extract.js";
import * as SF from "../snippets/builders/singleForm.js";
import { buildButton } from "../snippets/builders/button.js";
import {
  isLabelCell, isTdCell, isSelectbox, isBoxItem, isButtonNode,
  isRequiredLabel, controlKindOfBoxItem,
} from "./names.js";

type Role = "th" | "td";
interface Cell { role: Role; node: FigmaNode; }

const isCellBoundary = (n: FigmaNode): boolean =>
  isLabelCell(n) || isTdCell(n) || isSelectbox(n) || isBoxItem(n) || isButtonNode(n);
const isControl = (n: FigmaNode): boolean =>
  isSelectbox(n) || isBoxItem(n) || isButtonNode(n);

/** 셀 경계에서 멈추며 문서순으로 셀 수집(경계 내부는 안 내려감). */
function collectCells(node: FigmaNode): Cell[] {
  const out: Cell[] = [];
  const walk = (n: FigmaNode) => {
    for (const c of n.children) {
      if (isCellBoundary(c)) out.push({ role: isLabelCell(c) ? "th" : "td", node: c });
      else walk(c);
    }
  };
  walk(node);
  return out;
}

/** 컨트롤 노드 → 스니핏 빌더 XmlEl (스니핏 모듈 우선) */
export function buildControl(n: FigmaNode): XmlEl {
  if (isButtonNode(n)) return buildButton(n);
  if (isSelectbox(n)) return SF.buildSelect("100%");
  if (isBoxItem(n)) {
    const k = controlKindOfBoxItem(n);
    if (k === "select") return SF.buildSelect("100%");
    if (k === "calendar") return SF.buildCalendar("yearMonthDate", "100%");
    return SF.buildInput("100%");
  }
  return SF.buildInput("100%");
}

function labelText(n: FigmaNode): string {
  return collectTextNodes(n).map(textOf).find((t) => t !== "" && t.trim() !== "*") ?? "";
}

function thCell(n: FigmaNode): XmlEl {
  const attrs = isRequiredLabel(n) ? { class: "req", label: labelText(n) } : { label: labelText(n) };
  return el("xf:group", { class: "w2tb_th", tagname: "th" }, [el("w2:textbox", attrs)]);
}

function tdCell(n: FigmaNode): XmlEl {
  let inner: XmlEl[];
  if (isControl(n)) {
    inner = [buildControl(n)];
  } else {
    const ctrls: FigmaNode[] = [];
    const walk = (m: FigmaNode) => {
      for (const c of m.children) { if (isControl(c)) ctrls.push(c); else walk(c); }
    };
    walk(n);
    inner = ctrls.length ? ctrls.map(buildControl) : [SF.buildInput("100%")];
  }
  return el("xf:group", { class: "w2tb_td", tagname: "td" }, inner);
}

/** table의 행 격자 복원 (좌표 없이: 중첩 + layoutMode) */
function tableRows(table: FigmaNode): Cell[][] {
  const groups = table.children.map(collectCells).filter((g) => g.length > 0);
  if (table.layoutMode !== "HORIZONTAL") return groups; // 행-major
  // 열-major → 전치
  const maxLen = groups.reduce((m, g) => Math.max(m, g.length), 0);
  const rows: Cell[][] = [];
  for (let i = 0; i < maxLen; i++) rows.push(groups.map((g) => g[i]).filter((c): c is Cell => !!c));
  return rows;
}

export function buildTableXml(table: FigmaNode): XmlEl {
  const rows = tableRows(table).filter((r) => r.length > 0);
  const cols = rows.reduce((m, r) => Math.max(m, r.length), 0);
  const colgroup = el("xf:group", { tagname: "colgroup" },
    Array.from({ length: cols }, (_, i) => {
      const role = rows.find((r) => r[i])?.[i]?.role;
      return role === "th"
        ? el("xf:group", { style: "width:100px;", tagname: "col" })
        : el("xf:group", { tagname: "col" });
    }));
  const trs = rows.map((r) =>
    el("xf:group", { tagname: "tr" }, r.map((c) => (c.role === "th" ? thCell(c.node) : tdCell(c.node)))));
  return el("xf:group", { class: "tblbox", id: "", style: "" }, [
    el("xf:group", { class: "w2tb tbl", tagname: "table" }, [colgroup, ...trs]),
  ]);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run test/core/recursive/table.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**
```bash
git add src/core/recursive/table.ts test/core/recursive/table.test.ts
git commit -m "feat(recursive): structure-driven table (label->th, td->td) reusing snippet builders"
```

---

### Task 3: engine.ts — 인식기 레지스트리 + 재귀 walker

**Files:**
- Create: `src/core/recursive/engine.ts`
- Test: `test/core/recursive/engine.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`test/core/recursive/engine.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { serialize } from "../../../src/core/xml.js";
import { convertTree } from "../../../src/core/recursive/engine.js";
import type { FigmaNode } from "../../../src/core/types.js";

let seq = 0;
const F = (name: string, children: FigmaNode[], layoutMode?: string): FigmaNode =>
  ({ id: name + ++seq, type: "FRAME", name, width: 100, height: 38, children, ...(layoutMode ? { layoutMode } : {}) });
const I = (name: string, children: FigmaNode[]): FigmaNode =>
  ({ id: name + ++seq, type: "INSTANCE", name, width: 40, height: 20, children });
const TX = (s: string): FigmaNode =>
  ({ id: "t" + ++seq, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [] });
const VEC = (): FigmaNode => ({ id: "v" + ++seq, type: "VECTOR", name: "Icon", width: 12, height: 12, children: [] });

const ser = (n: FigmaNode) => convertTree(n).map(serialize).join("");

describe("convertTree", () => {
  it("recognizes a nested Table anywhere in the tree", () => {
    const root = F("root", [
      F("section", [
        F("Table", [F("row", [I("label", [TX("항목")]), I("\btd", [TX("input field")])], "HORIZONTAL")], "VERTICAL"),
      ]),
    ]);
    const xml = ser(root);
    expect(xml).toContain('class="tblbox"');
    expect((xml.match(/tagname="th"/g) ?? []).length).toBe(1);
  });
  it("emits a textbox for an unrecognized TEXT (no content loss)", () => {
    const root = F("root", [TX("그냥 텍스트")]);
    expect(ser(root)).toContain('label="그냥 텍스트"');
  });
  it("skips decorative (text-less vector/icon) nodes", () => {
    const root = F("root", [VEC(), F("iconGroup", [VEC()])]);
    expect(ser(root)).toBe("");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run test/core/recursive/engine.test.ts`
Expected: FAIL — 모듈 없음.

- [ ] **Step 3: 구현**

`src/core/recursive/engine.ts`:
```ts
import type { FigmaNode } from "../types.js";
import { el, type XmlEl } from "../xml.js";
import { textOf } from "../extract.js";
import { isNoise } from "../denoise.js";
import { isTable } from "./names.js";
import { buildTableXml } from "./table.js";

interface Recognizer { match(n: FigmaNode): boolean; build(n: FigmaNode): XmlEl; }

/** 슬라이스 1: Table 인식기만. 이후 슬라이스에서 추가. */
const RECOGNIZERS: Recognizer[] = [
  { match: isTable, build: buildTableXml },
];

/** 한 노드를 변환. 인식 → 매핑, 컨테이너 → 재귀, 미인식 TEXT → textbox, 장식 → []. */
export function convertNode(n: FigmaNode): XmlEl[] {
  if (isNoise(n)) return [];
  for (const r of RECOGNIZERS) if (r.match(n)) return [r.build(n)];
  if (n.children.length > 0) return n.children.flatMap(convertNode);
  if (n.type === "TEXT") {
    const t = textOf(n);
    return t ? [el("w2:textbox", { id: "", label: t, tagname: "span" })] : [];
  }
  return [];
}

/** 선택 루트의 자식들을 변환한 XmlEl 목록. */
export function convertTree(root: FigmaNode): XmlEl[] {
  return root.children.flatMap(convertNode);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run test/core/recursive/engine.test.ts`
Expected: PASS.

- [ ] **Step 5: 커밋**
```bash
git add src/core/recursive/engine.ts test/core/recursive/engine.test.ts
git commit -m "feat(recursive): recognizer registry + recursive walker"
```

---

### Task 4: index.ts + wrapDocument 재사용 + generate 배선

**Files:**
- Modify: `src/core/assemble.ts` (export `wrapDocument`)
- Create: `src/core/recursive/index.ts`
- Modify: `src/main.ts` (generate → convertPageRecursive)
- Test: `test/core/recursive/index.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`test/core/recursive/index.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { convertPageRecursive } from "../../../src/core/recursive/index.js";
import type { FigmaNode } from "../../../src/core/types.js";

let seq = 0;
const F = (name: string, children: FigmaNode[], layoutMode?: string): FigmaNode =>
  ({ id: name + ++seq, type: "FRAME", name, width: 100, height: 38, children, ...(layoutMode ? { layoutMode } : {}) });
const I = (name: string, children: FigmaNode[]): FigmaNode =>
  ({ id: name + ++seq, type: "INSTANCE", name, width: 40, height: 20, children });
const TX = (s: string): FigmaNode =>
  ({ id: "t" + ++seq, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [] });

describe("convertPageRecursive", () => {
  const root = F("Screen", [
    F("Table", [F("row", [I("label", [TX("항목")]), I("\btd", [TX("input field")])], "HORIZONTAL")], "VERTICAL"),
  ]);
  const doc = convertPageRecursive(root);
  it("produces a full WebSquare document shell with the table", () => {
    expect(doc).toContain("<?xml");
    expect(doc).toContain('class="sub_contents"');
    expect(doc).toContain('meta_screenName="Screen"');
    expect(doc).toContain('class="tblbox"');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run test/core/recursive/index.test.ts`
Expected: FAIL — 모듈/ export 없음.

- [ ] **Step 3: 구현**

(a) `src/core/assemble.ts`: `wrapDocument` 선언을 `export` 로 변경. 현재:
```ts
function wrapDocument(screenName: string, bodyInner: string, hasGrid: boolean): string {
```
변경:
```ts
export function wrapDocument(screenName: string, bodyInner: string, hasGrid: boolean): string {
```
(다른 변경 없음.)

(b) `src/core/recursive/index.ts` 생성:
```ts
import type { FigmaNode } from "../types.js";
import { el, serialize } from "../xml.js";
import { wrapDocument } from "../assemble.js";
import { convertTree } from "./engine.js";

/** 선택 루트를 하위 레이어까지 재귀 분석해 완성 WebSquare 페이지 생성. */
export function convertPageRecursive(root: FigmaNode): string {
  const sub = el("xf:group",
    { class: "sub_contents", id: "", meta_componentContainer: "true" },
    convertTree(root));
  // 슬라이스 1은 그리드 인식기가 없으므로 hasGrid=false.
  return wrapDocument(root.name, serialize(sub), false);
}
```

(c) `src/main.ts`: import 추가 및 generate 교체. 상단 import 그룹에 추가:
```ts
import { convertPageRecursive } from "./core/recursive/index.js";
```
generate 분기에서:
```ts
      const xml = assemblePage(toFigmaNode(scene), msg.snippetById ?? {});
```
를
```ts
      const xml = convertPageRecursive(toFigmaNode(scene));
```
로 교체. (`assemblePage` import는 유지 — analyze/레거시 호환용으로 남겨두되, 사용되지 않으면 lint 경고가 날 수 있으니 그대로 두고 `msg.snippetById`도 유지. 만약 `noUnusedLocals`로 `assemblePage` 미사용 오류가 나면 import에서 `assemblePage`를 제거한다. tsc로 확인할 것.)

- [ ] **Step 4: 통과 확인 + 타입체크**

Run: `npx vitest run test/core/recursive/index.test.ts`
Expected: PASS.
Run: `npx tsc --noEmit`
Expected: 오류 없음. (만약 `assemblePage` 미사용 오류 → main.ts import에서 `assemblePage` 제거 후 재실행. `analyzeRegions`/`catalogDescriptor`는 analyze 분기에서 계속 사용되므로 유지.)

- [ ] **Step 5: 커밋**
```bash
git add src/core/assemble.ts src/core/recursive/index.ts src/main.ts test/core/recursive/index.test.ts
git commit -m "feat(recursive): convertPageRecursive + wire generate to recursive engine"
```

---

### Task 5: 전체 검증

**Files:** (없음 — 검증만)

- [ ] **Step 1: 전체 테스트**

Run: `npx vitest run`
Expected: 전체 PASS. 기존 `assemble.test.ts`/`pageAbsolute.test.ts` 불변(assemblePage/wrapDocument 시그니처는 export만 추가됨, 동작 동일).

- [ ] **Step 2: 타입체크 + 빌드**

Run: `npx tsc --noEmit` (오류 없음) 그리고 `npm run build` (`build complete`).

- [ ] **Step 3: 검증 중 수정이 있었다면 커밋**
```bash
git add -A
git commit -m "test: recursive engine slice 1 verification"
```

---

## 수용 기준 (재확인)
1. 폼형 테이블에서 **th 개수 = `label` 셀 수**, 값/입력은 td (버그 해결).
2. td 컨트롤은 스니핏 빌더 출력(input/select/calendar/button).
3. 행/열 복원에 x/y 미사용(중첩+layoutMode만).
4. `generate`가 재귀 엔진 사용, 미인식 TEXT 손실 없음.
5. 전체 테스트 통과, `pageAbsolute.ts`/`assemblePage` 동작 불변.
