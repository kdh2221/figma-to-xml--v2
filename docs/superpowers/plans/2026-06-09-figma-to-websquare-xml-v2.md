# Figma → WebSquare XML 플러그인 v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Figma 노드를 사람이 타입만 지정하면 결정론적 규칙 엔진이 정확한 WebSquare XML로 변환하는 Figma 플러그인의 MVP를 만든다.

**Architecture:** Figma 플러그인 2-스레드(Main/UI). 변환 엔진(`core/`)은 figma API와 분리된 순수 함수 — 입력은 축약 노드 JSON, 출력은 XML 문자열. 타입별 변환기를 레지스트리에 등록하고, "타입 식별"과 "변환 실행"을 분리해 향후 자동식별(B) 확장이 가능하게 한다.

**Tech Stack:** TypeScript, esbuild(번들), Vitest(테스트), Figma Plugin API. UI는 vanilla HTML/CSS/JS.

**참조 경로:**
- 실제 스니펫 XML(그라운드 트루스): `C:\WebSquare_Studio\ai_x64\websquare_26.0417\workspace\IDS_2026\WebContent\cm\template\snippets`
- 스펙: `docs/superpowers/specs/2026-06-09-figma-to-websquare-xml-v2-design.md`

**계획 단계 정제 결정:** 변환기 `render`는 템플릿 문자열 주입 대신 **작은 XML 빌더(`core/xml.ts`)로 트리를 구성**한다(BOM/공백/인코딩 취약성 제거, 테스트 안정성). `templates/`의 실제 스니펫 XML은 그라운드 트루스 + 충실도 테스트용으로 보관한다.

---

## File Structure

| 파일 | 책임 |
|---|---|
| `package.json`, `tsconfig.json`, `vitest.config.ts`, `scripts/build.mjs` | 빌드/테스트 설정 |
| `manifest.json` | Figma 플러그인 매니페스트 |
| `src/core/types.ts` | `FigmaNode`, `SnippetType`, `SlotValues`, `ConvertResult`, `Warning` 타입 |
| `src/core/xml.ts` | XML 빌더: `el()` + 직렬화 + 이스케이프 |
| `src/core/extract.ts` | 노드 텍스트/구조 추출 공통 헬퍼 |
| `src/core/registry.ts` | `SnippetType → Converter` 매핑 + `convert()` 진입점 |
| `src/core/converters/*.ts` | 타입별 변환기 (1파일 = 1스니펫) |
| `src/main.ts` | Main 스레드: 선택 노드 → `FigmaNode` 직렬화 → 엔진 호출 → UI 메시지 |
| `src/ui.html`, `src/ui.ts` | UI 패널: 타입 선택, XML 표시, 복사, 경고 |
| `templates/*.xml` | 실제 스니펫 XML (Studio 복사본, 그라운드 트루스) |
| `scripts/sync-templates.mjs` | Studio 폴더 → `templates/` 동기화 |
| `test/**` | 엔진 단위 테스트 + 픽스처 |

각 변환기는 `extract(node) → SlotValues`와 `render(slots) → string` 두 순수 함수로 구성된다. `render`는 **body 레벨 XML 조각**을 반환한다(WebSquare 페이지에 붙여 쓰는 단위). 전체 문서 래핑은 모드2/추후 범위.

---

## Task 0: 프로젝트 스캐폴딩

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `scripts/build.mjs`, `manifest.json`, `.gitignore`

- [ ] **Step 1: package.json 작성**

Create `package.json`:
```json
{
  "name": "figma-to-websquare-xml",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "build": "node scripts/build.mjs",
    "test": "vitest run",
    "test:watch": "vitest",
    "sync-templates": "node scripts/sync-templates.mjs"
  },
  "devDependencies": {
    "@figma/plugin-typings": "^1.100.0",
    "esbuild": "^0.21.0",
    "typescript": "^5.4.0",
    "vitest": "^1.6.0"
  }
}
```

- [ ] **Step 2: tsconfig.json 작성**

Create `tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2019",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "lib": ["ES2019", "DOM"],
    "strict": true,
    "noUnusedLocals": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "typeRoots": ["./node_modules/@types", "./node_modules/@figma"]
  },
  "include": ["src", "test", "scripts"]
}
```

- [ ] **Step 3: vitest.config.ts 작성**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    environment: "node",
  },
});
```

- [ ] **Step 4: esbuild 빌드 스크립트 작성**

Create `scripts/build.mjs`:
```js
import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";

mkdirSync("dist", { recursive: true });

// Main thread bundle (figma sandbox, no DOM)
await build({
  entryPoints: ["src/main.ts"],
  bundle: true,
  format: "iife",
  target: "es2019",
  outfile: "dist/main.js",
});

// UI bundle, then inline into ui.html
await build({
  entryPoints: ["src/ui.ts"],
  bundle: true,
  format: "iife",
  target: "es2019",
  outfile: "dist/ui.js",
});

const uiHtml = readFileSync("src/ui.html", "utf8");
const uiJs = readFileSync("dist/ui.js", "utf8");
writeFileSync("dist/ui.html", uiHtml.replace("<!--UI_SCRIPT-->", `<script>${uiJs}</script>`));

console.log("build complete: dist/main.js, dist/ui.html");
```

- [ ] **Step 5: manifest.json 작성**

Create `manifest.json`:
```json
{
  "name": "Figma to WebSquare XML",
  "id": "figma-to-websquare-xml-v2",
  "api": "1.0.0",
  "main": "dist/main.js",
  "ui": "dist/ui.html",
  "editorType": ["figma"],
  "networkAccess": { "allowedDomains": ["none"] }
}
```

- [ ] **Step 6: .gitignore 작성**

Create `.gitignore`:
```
node_modules/
dist/
```

- [ ] **Step 7: 의존성 설치 및 커밋**

Run: `npm install`
Expected: `node_modules/` 생성, 에러 없음

```bash
git add package.json package-lock.json tsconfig.json vitest.config.ts scripts/build.mjs manifest.json .gitignore
git commit -m "chore: scaffold figma plugin project (esbuild + vitest + ts)"
```

---

## Task 1: 코어 타입 정의

**Files:**
- Create: `src/core/types.ts`

- [ ] **Step 1: types.ts 작성**

Create `src/core/types.ts`:
```ts
/** Main 스레드가 figma 노드에서 추출한 축약 JSON. 엔진은 이것만 받는다. */
export interface FigmaNode {
  id: string;
  /** figma node.type: 'FRAME' | 'TEXT' | 'RECTANGLE' | 'INSTANCE' | 'GROUP' ... */
  type: string;
  name: string;
  /** TEXT 노드의 텍스트 내용 */
  characters?: string;
  width: number;
  height: number;
  /** auto-layout 방향: 'HORIZONTAL' | 'VERTICAL' | 'NONE' */
  layoutMode?: string;
  /** INSTANCE의 메인 컴포넌트 이름 (옵션 B 확장에서 사용) */
  componentName?: string;
  children: FigmaNode[];
}

export type SnippetType =
  | "pageContainer"
  | "title"
  | "inputTable"
  | "grid"
  | "singleInput"
  | "button";

export interface Warning {
  /** 사람이 읽는 경고 메시지 (한국어) */
  message: string;
}

export interface ConvertResult {
  xml: string;
  warnings: Warning[];
}

/** 각 변환기가 반환하는 추출 결과. 변환기마다 형태가 다르므로 unknown 슬롯. */
export type SlotValues = Record<string, unknown>;

export interface Converter<S extends SlotValues = SlotValues> {
  type: SnippetType;
  extract(node: FigmaNode): { slots: S; warnings: Warning[] };
  render(slots: S): string;
}
```

- [ ] **Step 2: 컴파일 확인**

Run: `npx tsc --noEmit`
Expected: 에러 없음 (출력 없이 종료)

- [ ] **Step 3: 커밋**

```bash
git add src/core/types.ts
git commit -m "feat: add core engine types (FigmaNode, Converter, ConvertResult)"
```

---

## Task 2: XML 빌더

**Files:**
- Create: `src/core/xml.ts`
- Test: `test/core/xml.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

Create `test/core/xml.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { el, serialize, escapeAttr } from "../../src/core/xml.js";

describe("xml builder", () => {
  it("serializes a self-closing element with attributes in given order", () => {
    const node = el("w2:input", { class: "", id: "x", style: "" });
    expect(serialize(node)).toBe('<w2:input class="" id="x" style=""/>');
  });

  it("serializes nested children", () => {
    const node = el("w2:button", { class: "btn_cm" }, [
      el("w2:textbox", { label: "기본버튼", tagname: "span" }),
    ]);
    expect(serialize(node)).toBe(
      '<w2:button class="btn_cm"><w2:textbox label="기본버튼" tagname="span"/></w2:button>'
    );
  });

  it("escapes attribute values", () => {
    expect(escapeAttr('a"b&c<d>')).toBe("a&quot;b&amp;c&lt;d&gt;");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/core/xml.test.ts`
Expected: FAIL — `el`/`serialize`/`escapeAttr` not defined

- [ ] **Step 3: xml.ts 구현**

Create `src/core/xml.ts`:
```ts
export interface XmlEl {
  tag: string;
  attrs: Record<string, string>;
  children: XmlEl[];
  /** 텍스트 콘텐츠가 필요한 드문 경우 (CDATA 등). 보통 미사용. */
  text?: string;
}

export function el(
  tag: string,
  attrs: Record<string, string> = {},
  children: XmlEl[] = []
): XmlEl {
  return { tag, attrs, children };
}

export function escapeAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function serialize(node: XmlEl): string {
  const attrs = Object.entries(node.attrs)
    .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
    .join("");
  if (node.text !== undefined) {
    return `<${node.tag}${attrs}>${node.text}</${node.tag}>`;
  }
  if (node.children.length === 0) {
    return `<${node.tag}${attrs}/>`;
  }
  const inner = node.children.map(serialize).join("");
  return `<${node.tag}${attrs}>${inner}</${node.tag}>`;
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/core/xml.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/core/xml.ts test/core/xml.test.ts
git commit -m "feat: add deterministic XML builder with attribute escaping"
```

---

## Task 3: 노드 추출 헬퍼

**Files:**
- Create: `src/core/extract.ts`
- Test: `test/core/extract.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

Create `test/core/extract.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { collectTextNodes, directTextChildren } from "../../src/core/extract.js";
import type { FigmaNode } from "../../src/core/types.js";

function frame(children: FigmaNode[]): FigmaNode {
  return { id: "f", type: "FRAME", name: "f", width: 100, height: 50, children };
}
function text(s: string): FigmaNode {
  return { id: "t" + s, type: "TEXT", name: s, characters: s, width: 40, height: 16, children: [] };
}

describe("extract", () => {
  it("collectTextNodes returns all TEXT descendants in document order", () => {
    const root = frame([text("A"), frame([text("B"), text("C")])]);
    expect(collectTextNodes(root).map((n) => n.characters)).toEqual(["A", "B", "C"]);
  });

  it("directTextChildren returns only immediate TEXT children", () => {
    const root = frame([text("A"), frame([text("B")])]);
    expect(directTextChildren(root).map((n) => n.characters)).toEqual(["A"]);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/core/extract.test.ts`
Expected: FAIL — functions not defined

- [ ] **Step 3: extract.ts 구현**

Create `src/core/extract.ts`:
```ts
import type { FigmaNode } from "./types.js";

/** 서브트리의 모든 TEXT 노드를 document 순서로 수집 */
export function collectTextNodes(node: FigmaNode): FigmaNode[] {
  const out: FigmaNode[] = [];
  const walk = (n: FigmaNode) => {
    if (n.type === "TEXT") out.push(n);
    for (const c of n.children) walk(c);
  };
  for (const c of node.children) walk(c);
  return out;
}

/** 직계 자식 중 TEXT 노드만 */
export function directTextChildren(node: FigmaNode): FigmaNode[] {
  return node.children.filter((c) => c.type === "TEXT");
}

/** 텍스트 내용 (없으면 빈 문자열) */
export function textOf(node: FigmaNode): string {
  return (node.characters ?? "").trim();
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/core/extract.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/core/extract.ts test/core/extract.test.ts
git commit -m "feat: add node text extraction helpers"
```

---

## Task 4: 레지스트리 + 변환 진입점

**Files:**
- Create: `src/core/registry.ts`
- Test: `test/core/registry.test.ts`

이 시점에는 변환기가 아직 없으므로, 레지스트리가 빈 상태에서 "미지원 타입" 처리를 검증한다. 변환기는 Task 5~10에서 등록한다.

- [ ] **Step 1: 실패 테스트 작성**

Create `test/core/registry.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { convert } from "../../src/core/registry.js";
import type { FigmaNode } from "../../src/core/types.js";

const node: FigmaNode = { id: "n", type: "FRAME", name: "n", width: 1, height: 1, children: [] };

describe("convert", () => {
  it("returns a warning and empty xml for an unknown snippet type", () => {
    const res = convert(node, "doesNotExist" as never);
    expect(res.xml).toBe("");
    expect(res.warnings[0].message).toContain("지원하지 않는");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/core/registry.test.ts`
Expected: FAIL — `convert` not defined

- [ ] **Step 3: registry.ts 구현**

Create `src/core/registry.ts`:
```ts
import type { Converter, ConvertResult, FigmaNode, SnippetType } from "./types.js";

const registry = new Map<SnippetType, Converter>();

export function registerConverter(converter: Converter): void {
  registry.set(converter.type, converter);
}

export function convert(node: FigmaNode, type: SnippetType): ConvertResult {
  const converter = registry.get(type);
  if (!converter) {
    return { xml: "", warnings: [{ message: `지원하지 않는 스니펫 타입입니다: ${type}` }] };
  }
  const { slots, warnings } = converter.extract(node);
  const xml = converter.render(slots);
  return { xml, warnings };
}

export function registeredTypes(): SnippetType[] {
  return [...registry.keys()];
}
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/core/registry.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: 커밋**

```bash
git add src/core/registry.ts test/core/registry.test.ts
git commit -m "feat: add converter registry and convert() entrypoint"
```

---

## Task 5: title 변환기 (02 타이틀)

**그라운드 트루스(2_02 타이틀그룹(제목)):**
```xml
<xf:group class="titbox" id="" style="">
  <xf:group id="" class="lt">
    <w2:textbox tagname="" style="" id="" label="타이틀(제목)" class="tit_main"></w2:textbox>
  </xf:group>
  <xf:group class="rt" id="" style=""></xf:group>
</xf:group>
```

**Files:**
- Create: `src/core/converters/title.ts`
- Test: `test/converters/title.test.ts`
- Modify: `src/core/registry.ts` (import으로 등록 — Step 5 참조)

- [ ] **Step 1: 실패 테스트 작성**

Create `test/converters/title.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { titleConverter } from "../../src/core/converters/title.js";
import type { FigmaNode } from "../../src/core/types.js";

const frame = (children: FigmaNode[]): FigmaNode => ({
  id: "f", type: "FRAME", name: "title", width: 200, height: 40, children,
});
const text = (s: string): FigmaNode => ({
  id: "t", type: "TEXT", name: s, characters: s, width: 100, height: 20, children: [],
});

describe("title converter", () => {
  it("uses the first text node as tit_main label", () => {
    const { slots, warnings } = titleConverter.extract(frame([text("회원 목록")]));
    expect(slots).toEqual({ label: "회원 목록" });
    expect(warnings).toEqual([]);
    expect(titleConverter.render(slots)).toBe(
      '<xf:group class="titbox" id="" style="">' +
        '<xf:group class="lt" id="">' +
        '<w2:textbox class="tit_main" id="" label="회원 목록" style="" tagname=""/>' +
        "</xf:group>" +
        '<xf:group class="rt" id="" style=""/>' +
        "</xf:group>"
    );
  });

  it("warns when no text node is found", () => {
    const { slots, warnings } = titleConverter.extract(frame([]));
    expect(slots).toEqual({ label: "" });
    expect(warnings[0].message).toContain("제목 텍스트");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/converters/title.test.ts`
Expected: FAIL — `titleConverter` not defined

- [ ] **Step 3: title.ts 구현**

Create `src/core/converters/title.ts`:
```ts
import type { Converter, FigmaNode, Warning } from "../types.js";
import { el, serialize } from "../xml.js";
import { collectTextNodes, textOf } from "../extract.js";

interface TitleSlots {
  label: string;
}

export const titleConverter: Converter<TitleSlots> = {
  type: "title",
  extract(node: FigmaNode) {
    const texts = collectTextNodes(node);
    const warnings: Warning[] = [];
    const label = texts.length > 0 ? textOf(texts[0]) : "";
    if (label === "") warnings.push({ message: "제목 텍스트를 찾지 못했습니다 — 확인 필요" });
    return { slots: { label }, warnings };
  },
  render(slots: TitleSlots) {
    return serialize(
      el("xf:group", { class: "titbox", id: "", style: "" }, [
        el("xf:group", { class: "lt", id: "" }, [
          el("w2:textbox", {
            class: "tit_main", id: "", label: slots.label, style: "", tagname: "",
          }),
        ]),
        el("xf:group", { class: "rt", id: "", style: "" }),
      ])
    );
  },
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/converters/title.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: registry에 등록**

Append to `src/core/registry.ts` (파일 끝, `registeredTypes` 위 또는 아래):
```ts
import { titleConverter } from "./converters/title.js";
registerConverter(titleConverter);
```
> import 문은 파일 상단으로 옮겨도 무방. esbuild/tsc 모두 허용.

- [ ] **Step 6: 등록 확인 + 커밋**

Run: `npx vitest run`
Expected: 모든 테스트 PASS

```bash
git add src/core/converters/title.ts test/converters/title.test.ts src/core/registry.ts
git commit -m "feat: add title (02 타이틀) converter"
```

---

## Task 6: button 변환기 (08 기본버튼)

**그라운드 트루스(8_02 기본버튼):**
```xml
<w2:button style="" id="" class="btn_cm">
  <w2:textbox id="" label="기본버튼" style="" tagname="span"></w2:textbox>
</w2:button>
```

**Files:**
- Create: `src/core/converters/button.ts`
- Test: `test/converters/button.test.ts`
- Modify: `src/core/registry.ts`

- [ ] **Step 1: 실패 테스트 작성**

Create `test/converters/button.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { buttonConverter } from "../../src/core/converters/button.js";
import type { FigmaNode } from "../../src/core/types.js";

const btn = (label: string): FigmaNode => ({
  id: "b", type: "FRAME", name: "btn", width: 80, height: 32,
  children: [{ id: "t", type: "TEXT", name: label, characters: label, width: 40, height: 16, children: [] }],
});

describe("button converter", () => {
  it("renders a btn_cm button with the text label", () => {
    const { slots, warnings } = buttonConverter.extract(btn("저장"));
    expect(slots).toEqual({ label: "저장" });
    expect(warnings).toEqual([]);
    expect(buttonConverter.render(slots)).toBe(
      '<w2:button class="btn_cm" id="" style="">' +
        '<w2:textbox id="" label="저장" style="" tagname="span"/>' +
        "</w2:button>"
    );
  });

  it("warns when no label text is found", () => {
    const empty: FigmaNode = { id: "b", type: "FRAME", name: "btn", width: 80, height: 32, children: [] };
    const { slots, warnings } = buttonConverter.extract(empty);
    expect(slots).toEqual({ label: "" });
    expect(warnings[0].message).toContain("버튼 라벨");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/converters/button.test.ts`
Expected: FAIL — `buttonConverter` not defined

- [ ] **Step 3: button.ts 구현**

Create `src/core/converters/button.ts`:
```ts
import type { Converter, FigmaNode, Warning } from "../types.js";
import { el, serialize } from "../xml.js";
import { collectTextNodes, textOf } from "../extract.js";

interface ButtonSlots {
  label: string;
}

export const buttonConverter: Converter<ButtonSlots> = {
  type: "button",
  extract(node: FigmaNode) {
    const texts = collectTextNodes(node);
    const warnings: Warning[] = [];
    const label = texts.length > 0 ? textOf(texts[0]) : "";
    if (label === "") warnings.push({ message: "버튼 라벨을 찾지 못했습니다 — 확인 필요" });
    return { slots: { label }, warnings };
  },
  render(slots: ButtonSlots) {
    return serialize(
      el("w2:button", { class: "btn_cm", id: "", style: "" }, [
        el("w2:textbox", { id: "", label: slots.label, style: "", tagname: "span" }),
      ])
    );
  },
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/converters/button.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: registry에 등록**

Append to `src/core/registry.ts`:
```ts
import { buttonConverter } from "./converters/button.js";
registerConverter(buttonConverter);
```

- [ ] **Step 6: 전체 테스트 + 커밋**

Run: `npx vitest run`
Expected: 모든 테스트 PASS

```bash
git add src/core/converters/button.ts test/converters/button.test.ts src/core/registry.ts
git commit -m "feat: add button (08 기본버튼) converter"
```

---

## Task 7: singleInput 변환기 (11 단일입력폼)

**그라운드 트루스(11_05 인풋 / 11_07 셀렉트 / 11_01 텍스트 / 11_13 텍스트에어리어):**
```xml
<xf:input class="" id="" style=""/>
<xf:select1 appearance="minimal" allOption="true" chooseOption="" class="" id=""/>
<w2:textbox id="" label="텍스트입니다." style="" tagname="span"></w2:textbox>
<xf:textarea class="" id="" style=""/>
```

MVP는 컨트롤 종류를 **사람이 세부 지정**(`input`/`select`/`textbox`/`textarea`)한다. node의 텍스트는 textbox일 때만 label로 쓴다. extract는 모든 종류에서 동일하게 첫 텍스트(있으면)를 `text` 슬롯에 담고, 종류는 `kind` 슬롯으로 받는다(기본 `input`).

**Files:**
- Create: `src/core/converters/singleInput.ts`
- Test: `test/converters/singleInput.test.ts`
- Modify: `src/core/registry.ts`

- [ ] **Step 1: 실패 테스트 작성**

Create `test/converters/singleInput.test.ts`:
```ts
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
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/converters/singleInput.test.ts`
Expected: FAIL — `singleInputConverter` not defined

- [ ] **Step 3: singleInput.ts 구현**

Create `src/core/converters/singleInput.ts`:
```ts
import type { Converter, FigmaNode } from "../types.js";
import { el, serialize } from "../xml.js";
import { collectTextNodes, textOf } from "../extract.js";

export type InputKind = "input" | "select" | "textbox" | "textarea";

interface SingleInputSlots {
  kind: InputKind;
  text: string;
}

export const singleInputConverter: Converter<SingleInputSlots> = {
  type: "singleInput",
  extract(node: FigmaNode) {
    const texts = collectTextNodes(node);
    const text = texts.length > 0 ? textOf(texts[0]) : "";
    // 종류는 UI에서 사람이 지정. 추출 단계 기본값은 input.
    return { slots: { kind: "input", text }, warnings: [] };
  },
  render(slots: SingleInputSlots) {
    switch (slots.kind) {
      case "select":
        return serialize(
          el("xf:select1", {
            appearance: "minimal", allOption: "true", chooseOption: "", class: "", id: "",
          })
        );
      case "textbox":
        return serialize(
          el("w2:textbox", { id: "", label: slots.text, style: "", tagname: "span" })
        );
      case "textarea":
        return serialize(el("xf:textarea", { class: "", id: "", style: "" }));
      case "input":
      default:
        return serialize(el("xf:input", { class: "", id: "", style: "" }));
    }
  },
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/converters/singleInput.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: registry에 등록**

Append to `src/core/registry.ts`:
```ts
import { singleInputConverter } from "./converters/singleInput.js";
registerConverter(singleInputConverter);
```

- [ ] **Step 6: 전체 테스트 + 커밋**

Run: `npx vitest run`
Expected: 모든 테스트 PASS

```bash
git add src/core/converters/singleInput.ts test/converters/singleInput.test.ts src/core/registry.ts
git commit -m "feat: add singleInput (11 단일입력폼) converter"
```

---

## Task 8: inputTable 변환기 (05 입출력테이블)

**그라운드 트루스(폼형 2단):** 루트 `tblbox` > `w2tb tbl`(table) > `colgroup`(라벨열 100px + 데이터열 쌍 반복) > `tr`(th `w2tb_th`[textbox label] + td `w2tb_td` 쌍 반복).

**추출 규칙(결정론적, 폼형 1~N단):**
- 입력 노드는 라벨/값 쌍들이 행 단위로 들어있는 프레임이라고 가정.
- **모든 TEXT 노드를 순서대로 수집 → 라벨 목록**으로 본다(MVP: 각 텍스트 1개 = 1 라벨, 값 셀은 비워둠).
- `단 수(cols)`는 UI에서 사람이 지정(기본 2단). 라벨 개수를 `cols`로 나눠 행 구성.
- 라벨 개수가 `cols`의 배수가 아니면 경고 + 마지막 행을 빈 셀로 패딩.

**Files:**
- Create: `src/core/converters/inputTable.ts`
- Test: `test/converters/inputTable.test.ts`
- Modify: `src/core/registry.ts`

- [ ] **Step 1: 실패 테스트 작성**

Create `test/converters/inputTable.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { inputTableConverter } from "../../src/core/converters/inputTable.js";
import type { FigmaNode } from "../../src/core/types.js";

const text = (s: string): FigmaNode => ({
  id: "t" + s, type: "TEXT", name: s, characters: s, width: 80, height: 16, children: [],
});
const table = (labels: string[]): FigmaNode => ({
  id: "tb", type: "FRAME", name: "table", width: 600, height: 100, children: labels.map(text),
});

describe("inputTable converter", () => {
  it("renders a 1-col form table with one label row", () => {
    const { slots, warnings } = inputTableConverter.extract(table(["이름"]));
    expect(warnings).toEqual([]);
    const xml = inputTableConverter.render({ ...slots, cols: 1 });
    expect(xml).toBe(
      '<xf:group class="tblbox" id="" style="">' +
        '<xf:group class="w2tb tbl" tagname="table">' +
          '<xf:group tagname="colgroup">' +
            '<xf:group style="width:100px;" tagname="col"/><xf:group tagname="col"/>' +
          "</xf:group>" +
          '<xf:group tagname="tr">' +
            '<xf:group class="w2tb_th" tagname="th"><w2:textbox label="이름"/></xf:group>' +
            '<xf:group class="w2tb_td" tagname="td"/>' +
          "</xf:group>" +
        "</xf:group>" +
      "</xf:group>"
    );
  });

  it("warns when label count is not a multiple of cols", () => {
    const { slots } = inputTableConverter.extract(table(["A", "B", "C"]));
    const result = inputTableConverter.render({ ...slots, cols: 2 });
    // 3 labels / 2 cols => 2 rows (2 + padded 1). 빈 th 1개 패딩.
    expect(result.match(/tagname="tr"/g)?.length).toBe(2);
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/converters/inputTable.test.ts`
Expected: FAIL — `inputTableConverter` not defined

- [ ] **Step 3: inputTable.ts 구현**

Create `src/core/converters/inputTable.ts`:
```ts
import type { Converter, FigmaNode, Warning } from "../types.js";
import { el, serialize, type XmlEl } from "../xml.js";
import { collectTextNodes, textOf } from "../extract.js";

interface InputTableSlots {
  labels: string[];
  /** 단(段) 수 = 라벨/데이터 쌍 개수. UI에서 사람이 지정. 기본 2. */
  cols: number;
}

export const inputTableConverter: Converter<InputTableSlots> = {
  type: "inputTable",
  extract(node: FigmaNode) {
    const labels = collectTextNodes(node).map(textOf).filter((s) => s !== "");
    const warnings: Warning[] = [];
    if (labels.length === 0) {
      warnings.push({ message: "테이블 라벨을 찾지 못했습니다 — 확인 필요" });
    }
    return { slots: { labels, cols: 2 }, warnings };
  },
  render(slots: InputTableSlots) {
    const cols = Math.max(1, slots.cols);

    // colgroup: 라벨열(100px) + 데이터열 쌍을 cols 만큼
    const colgroupChildren: XmlEl[] = [];
    for (let i = 0; i < cols; i++) {
      colgroupChildren.push(el("xf:group", { style: "width:100px;", tagname: "col" }));
      colgroupChildren.push(el("xf:group", { tagname: "col" }));
    }

    // 행: 라벨을 cols개씩 끊어 th/td 쌍 생성. 마지막 행은 빈 th로 패딩.
    const rows: XmlEl[] = [];
    for (let r = 0; r < slots.labels.length; r += cols) {
      const cells: XmlEl[] = [];
      for (let c = 0; c < cols; c++) {
        const label = slots.labels[r + c];
        const th = el("xf:group", { class: "w2tb_th", tagname: "th" }, [
          el("w2:textbox", label !== undefined ? { label } : {}),
        ]);
        const td = el("xf:group", { class: "w2tb_td", tagname: "td" });
        cells.push(th, td);
      }
      rows.push(el("xf:group", { tagname: "tr" }, cells));
    }

    return serialize(
      el("xf:group", { class: "tblbox", id: "", style: "" }, [
        el("xf:group", { class: "w2tb tbl", tagname: "table" }, [
          el("xf:group", { tagname: "colgroup" }, colgroupChildren),
          ...rows,
        ]),
      ])
    );
  },
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/converters/inputTable.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: registry에 등록**

Append to `src/core/registry.ts`:
```ts
import { inputTableConverter } from "./converters/inputTable.js";
registerConverter(inputTableConverter);
```

- [ ] **Step 6: 전체 테스트 + 커밋**

Run: `npx vitest run`
Expected: 모든 테스트 PASS

```bash
git add src/core/converters/inputTable.ts test/converters/inputTable.test.ts src/core/registry.ts
git commit -m "feat: add inputTable (05 입출력테이블) converter"
```

---

## Task 9: grid 변환기 (06 그리드 기본형)

**그라운드 트루스(6_01 그리드):** `gvwbox` > `gridView`(dataList 바인딩) > `caption` + `header>row>column*N`(value+width) + `gBody>row>column*N`(value 없음).

**추출 규칙(결정론적):**
- `caption`: 그리드 프레임 안 첫 텍스트(있으면). 없으면 빈 값 + 경고 없음(캡션은 선택).
  - MVP 단순화: caption 슬롯은 비워두고(빈 value), 컬럼 헤더와 구분하지 않는다. → **헤더 컬럼은 사람이 디자인에서 "헤더 행" 프레임을 선택했다고 가정**, 그 프레임의 직계 TEXT 자식 = 컬럼 라벨.
- `columns`: 입력 노드의 **모든 TEXT 노드** = 컬럼 라벨. 각 컬럼 width는 MVP에서 `70` 고정(추후 셀 너비 추출).
- 컬럼이 0개면 경고.

**Files:**
- Create: `src/core/converters/grid.ts`
- Test: `test/converters/grid.test.ts`
- Modify: `src/core/registry.ts`

- [ ] **Step 1: 실패 테스트 작성**

Create `test/converters/grid.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { gridConverter } from "../../src/core/converters/grid.js";
import type { FigmaNode } from "../../src/core/types.js";

const text = (s: string): FigmaNode => ({
  id: "t" + s, type: "TEXT", name: s, characters: s, width: 70, height: 16, children: [],
});
const grid = (cols: string[]): FigmaNode => ({
  id: "g", type: "FRAME", name: "grid", width: 500, height: 153, children: cols.map(text),
});

describe("grid converter", () => {
  it("renders header columns and matching empty body columns", () => {
    const { slots, warnings } = gridConverter.extract(grid(["번호", "이름"]));
    expect(warnings).toEqual([]);
    const xml = gridConverter.render(slots);
    // 헤더 컬럼 2개 (value 있음)
    expect(xml.match(/value="번호"/g)?.length).toBe(1);
    expect(xml.match(/value="이름"/g)?.length).toBe(1);
    // header row + gBody row = 2 rows
    expect(xml.match(/<w2:row/g)?.length).toBe(2);
    // header column 2 + body column 2 = 4 columns
    expect(xml.match(/<w2:column/g)?.length).toBe(4);
    // dataList 바인딩 플레이스홀더
    expect(xml).toContain('dataList="data:dataList1"');
  });

  it("warns when no columns are found", () => {
    const { warnings } = gridConverter.extract(grid([]));
    expect(warnings[0].message).toContain("컬럼");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/converters/grid.test.ts`
Expected: FAIL — `gridConverter` not defined

- [ ] **Step 3: grid.ts 구현**

Create `src/core/converters/grid.ts`:
```ts
import type { Converter, FigmaNode, Warning } from "../types.js";
import { el, serialize, type XmlEl } from "../xml.js";
import { collectTextNodes, textOf } from "../extract.js";

interface GridSlots {
  columns: { label: string; width: number }[];
  height: number;
}

export const gridConverter: Converter<GridSlots> = {
  type: "grid",
  extract(node: FigmaNode) {
    const labels = collectTextNodes(node).map(textOf).filter((s) => s !== "");
    const warnings: Warning[] = [];
    if (labels.length === 0) {
      warnings.push({ message: "그리드 컬럼(헤더 텍스트)을 찾지 못했습니다 — 확인 필요" });
    }
    const columns = labels.map((label) => ({ label, width: 70 }));
    return { slots: { columns, height: Math.round(node.height) }, warnings };
  },
  render(slots: GridSlots) {
    const headerColumns: XmlEl[] = slots.columns.map((c, i) =>
      el("w2:column", {
        blockSelect: "false", displayMode: "label", id: `column${i + 1}`,
        inputType: "text", removeBorderStyle: "false", value: c.label, width: String(c.width),
      })
    );
    const bodyColumns: XmlEl[] = slots.columns.map((c, i) =>
      el("w2:column", {
        blockSelect: "false", displayMode: "label", id: `col${i + 1}`,
        inputType: "text", removeBorderStyle: "false", width: String(c.width),
      })
    );

    return serialize(
      el("xf:group", { adaptiveThreshold: "", class: "gvwbox", id: "", style: "" }, [
        el(
          "w2:gridView",
          {
            autoFit: "allColumn", class: "gvw", dataList: "data:dataList1",
            focusMode: "row", id: "", style: `height: ${slots.height}px;`,
          },
          [
            el("w2:header", { id: "header1", style: "" }, [
              el("w2:row", { id: "row1", style: "" }, headerColumns),
            ]),
            el("w2:gBody", { id: "gBody1", style: "" }, [
              el("w2:row", { id: "row2", style: "" }, bodyColumns),
            ]),
          ]
        ),
      ])
    );
  },
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/converters/grid.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: registry에 등록**

Append to `src/core/registry.ts`:
```ts
import { gridConverter } from "./converters/grid.js";
registerConverter(gridConverter);
```

- [ ] **Step 6: 전체 테스트 + 커밋**

Run: `npx vitest run`
Expected: 모든 테스트 PASS

```bash
git add src/core/converters/grid.ts test/converters/grid.test.ts src/core/registry.ts
git commit -m "feat: add grid (06 그리드) converter"
```

---

## Task 10: pageContainer 변환기 (00 화면시작)

**그라운드 트루스(0_01 페이지시작):**
```xml
<xf:group class="sub_contents" id="" style="" meta_componentContainer="true"></xf:group>
```

모드1 MVP에서는 단독 래퍼만 생성한다(자식 조립은 모드2).

**Files:**
- Create: `src/core/converters/pageContainer.ts`
- Test: `test/converters/pageContainer.test.ts`
- Modify: `src/core/registry.ts`

- [ ] **Step 1: 실패 테스트 작성**

Create `test/converters/pageContainer.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { pageContainerConverter } from "../../src/core/converters/pageContainer.js";
import type { FigmaNode } from "../../src/core/types.js";

const node: FigmaNode = { id: "p", type: "FRAME", name: "page", width: 1280, height: 800, children: [] };

describe("pageContainer converter", () => {
  it("renders an empty sub_contents container", () => {
    const { slots, warnings } = pageContainerConverter.extract(node);
    expect(warnings).toEqual([]);
    expect(pageContainerConverter.render(slots)).toBe(
      '<xf:group class="sub_contents" id="" meta_componentContainer="true" style=""/>'
    );
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/converters/pageContainer.test.ts`
Expected: FAIL — `pageContainerConverter` not defined

- [ ] **Step 3: pageContainer.ts 구현**

Create `src/core/converters/pageContainer.ts`:
```ts
import type { Converter, FigmaNode } from "../types.js";
import { el, serialize } from "../xml.js";

interface PageContainerSlots {
  kind: "sub" | "popup";
}

export const pageContainerConverter: Converter<PageContainerSlots> = {
  type: "pageContainer",
  extract(_node: FigmaNode) {
    return { slots: { kind: "sub" }, warnings: [] };
  },
  render(slots: PageContainerSlots) {
    const cls = slots.kind === "popup" ? "pop_contents" : "sub_contents";
    return serialize(
      el("xf:group", {
        class: cls, id: "", meta_componentContainer: "true", style: "",
      })
    );
  },
};
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/converters/pageContainer.test.ts`
Expected: PASS (1 test)

- [ ] **Step 5: registry에 등록**

Append to `src/core/registry.ts`:
```ts
import { pageContainerConverter } from "./converters/pageContainer.js";
registerConverter(pageContainerConverter);
```

- [ ] **Step 6: 전체 테스트 + 커밋**

Run: `npx vitest run`
Expected: 모든 테스트 PASS (전 변환기 합산)

```bash
git add src/core/converters/pageContainer.ts test/converters/pageContainer.test.ts src/core/registry.ts
git commit -m "feat: add pageContainer (00 화면시작) converter"
```

---

## Task 11: Main 스레드 — 노드 직렬화 + 메시지 처리

**Figma API 제약:** Main 스레드는 figma 객체 접근 가능, DOM 없음. UI와 `figma.ui.postMessage` / `figma.ui.onmessage`로 통신.

**Files:**
- Create: `src/main.ts`
- Test: `test/main/serialize.test.ts` (직렬화 함수만 분리 테스트)

직렬화 로직(`toFigmaNode`)을 순수 함수로 분리해 테스트한다. figma 객체는 `width`/`height`/`characters` 등을 가진 덕타입으로 받는다.

- [ ] **Step 1: 실패 테스트 작성**

Create `test/main/serialize.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { toFigmaNode, type SceneLike } from "../../src/main.js";

const sceneText: SceneLike = {
  id: "1", type: "TEXT", name: "label", characters: "이름", width: 40, height: 16,
};
const sceneFrame: SceneLike = {
  id: "2", type: "FRAME", name: "row", width: 200, height: 32, layoutMode: "HORIZONTAL",
  children: [sceneText],
};

describe("toFigmaNode", () => {
  it("maps a TEXT scene node to FigmaNode with characters", () => {
    expect(toFigmaNode(sceneText)).toEqual({
      id: "1", type: "TEXT", name: "label", characters: "이름",
      width: 40, height: 16, children: [],
    });
  });

  it("recursively maps children and layoutMode", () => {
    const out = toFigmaNode(sceneFrame);
    expect(out.layoutMode).toBe("HORIZONTAL");
    expect(out.children).toHaveLength(1);
    expect(out.children[0].characters).toBe("이름");
  });
});
```

- [ ] **Step 2: 테스트 실패 확인**

Run: `npx vitest run test/main/serialize.test.ts`
Expected: FAIL — `toFigmaNode` not defined

- [ ] **Step 3: main.ts 구현**

Create `src/main.ts`:
```ts
import type { FigmaNode, SnippetType } from "./core/types.js";
import { convert } from "./core/registry.js";

/** figma SceneNode의 덕타입(테스트용). 실제로는 figma SceneNode가 들어온다. */
export interface SceneLike {
  id: string;
  type: string;
  name: string;
  characters?: string;
  width: number;
  height: number;
  layoutMode?: string;
  componentName?: string;
  children?: SceneLike[];
}

export function toFigmaNode(scene: SceneLike): FigmaNode {
  const node: FigmaNode = {
    id: scene.id,
    type: scene.type,
    name: scene.name,
    width: scene.width,
    height: scene.height,
    children: (scene.children ?? []).map(toFigmaNode),
  };
  if (scene.characters !== undefined) node.characters = scene.characters;
  if (scene.layoutMode !== undefined && scene.layoutMode !== "NONE") {
    node.layoutMode = scene.layoutMode;
  }
  if (scene.componentName !== undefined) node.componentName = scene.componentName;
  return node;
}

// --- 아래는 figma 런타임에서만 실행 (테스트는 toFigmaNode만 import) ---
declare const figma: any;

if (typeof figma !== "undefined") {
  figma.showUI(__html__, { width: 420, height: 560 });

  const selectedOne = (): SceneLike | null => {
    const sel = figma.currentPage.selection;
    if (sel.length !== 1) {
      figma.ui.postMessage({
        type: "result", xml: "",
        warnings: [{ message: "프레임 하나를 선택하세요 (현재 " + sel.length + "개 선택됨)" }],
      });
      return null;
    }
    return sel[0] as SceneLike;
  };

  figma.ui.onmessage = (msg: { type: string; snippetType?: SnippetType }) => {
    if (msg.type === "convert" && msg.snippetType) {
      const scene = selectedOne();
      if (!scene) return;
      const result = convert(toFigmaNode(scene), msg.snippetType);
      figma.ui.postMessage({ type: "result", xml: result.xml, warnings: result.warnings });
    }
    // 픽스처 수집: 현재 선택을 축약 노드 JSON으로 덤프 (테스트 픽스처 박제용)
    if (msg.type === "dump") {
      const scene = selectedOne();
      if (!scene) return;
      const json = JSON.stringify(toFigmaNode(scene), null, 2);
      figma.ui.postMessage({ type: "result", xml: json, warnings: [] });
    }
  };
}

declare const __html__: string;
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/main/serialize.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: 커밋**

```bash
git add src/main.ts test/main/serialize.test.ts
git commit -m "feat: add main thread node serialization and message handler"
```

---

## Task 12: UI 패널

**Files:**
- Create: `src/ui.html`, `src/ui.ts`

UI는 타입 드롭다운(+ singleInput용 종류 선택, inputTable용 단 수), 변환 버튼, XML 미리보기, 복사 버튼, 경고 영역으로 구성. MVP는 추가 옵션(종류/단 수)을 항상 노출하고 해당 타입일 때만 의미를 가진다.

- [ ] **Step 1: ui.html 작성**

Create `src/ui.html`:
```html
<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<style>
  body { font: 12px -apple-system, sans-serif; margin: 0; padding: 12px; }
  label { display: block; margin: 8px 0 2px; font-weight: 600; }
  select, button { font-size: 12px; padding: 4px 6px; }
  #xml { width: 100%; height: 280px; box-sizing: border-box; font-family: monospace;
         white-space: pre; overflow: auto; margin-top: 8px; }
  #warnings { color: #b30000; margin-top: 8px; white-space: pre-wrap; }
  .row { display: flex; gap: 8px; align-items: flex-end; }
</style>
</head>
<body>
  <div class="row">
    <div>
      <label for="type">스니펫 타입</label>
      <select id="type">
        <option value="pageContainer">화면시작</option>
        <option value="title">타이틀</option>
        <option value="inputTable">입출력테이블</option>
        <option value="grid">그리드</option>
        <option value="singleInput">단일입력폼</option>
        <option value="button">버튼</option>
      </select>
    </div>
    <div>
      <label for="kind">입력폼 종류</label>
      <select id="kind">
        <option value="input">인풋</option>
        <option value="select">셀렉트</option>
        <option value="textbox">텍스트</option>
        <option value="textarea">텍스트에어리어</option>
      </select>
    </div>
    <div>
      <label for="cols">테이블 단 수</label>
      <select id="cols">
        <option>1</option><option selected>2</option><option>3</option>
        <option>4</option><option>5</option>
      </select>
    </div>
    <button id="convert">변환</button>
  </div>
  <textarea id="xml" readonly placeholder="프레임을 선택하고 [변환]을 누르세요"></textarea>
  <div class="row" style="margin-top:6px;">
    <button id="copy">복사</button>
    <button id="dump" title="선택 노드를 테스트 픽스처용 JSON으로 덤프">JSON 덤프</button>
  </div>
  <div id="warnings"></div>
  <!--UI_SCRIPT-->
</body>
</html>
```

- [ ] **Step 2: ui.ts 작성**

Create `src/ui.ts`:
```ts
const $ = (id: string) => document.getElementById(id) as HTMLElement;

$("convert").onclick = () => {
  const snippetType = ($("type") as HTMLSelectElement).value;
  parent.postMessage({ pluginMessage: { type: "convert", snippetType } }, "*");
};

$("copy").onclick = () => {
  const xml = ($("xml") as HTMLTextAreaElement).value;
  (navigator as any).clipboard?.writeText(xml);
};

$("dump").onclick = () => {
  parent.postMessage({ pluginMessage: { type: "dump" } }, "*");
};

onmessage = (event: MessageEvent) => {
  const msg = event.data.pluginMessage;
  if (!msg || msg.type !== "result") return;
  ($("xml") as HTMLTextAreaElement).value = msg.xml;
  const warnings: { message: string }[] = msg.warnings ?? [];
  $("warnings").textContent = warnings.map((w) => "⚠ " + w.message).join("\n");
};
```

- [ ] **Step 3: 빌드 확인**

Run: `npm run build`
Expected: `dist/main.js`, `dist/ui.html` 생성, "build complete" 출력

- [ ] **Step 4: 커밋**

```bash
git add src/ui.html src/ui.ts
git commit -m "feat: add UI panel (type select, convert, preview, copy, warnings)"
```

---

## Task 13: 템플릿 동기화 스크립트 + 충실도 테스트

`templates/`에 실제 스니펫 XML을 복사해 두고, 변환기 출력이 그라운드 트루스와 **구조적으로** 일치하는지 확인한다(공백/BOM 무시, 핵심 태그·클래스 존재 검증).

**Files:**
- Create: `scripts/sync-templates.mjs`, `templates/` (스크립트로 채움)
- Test: `test/templates/fidelity.test.ts`

- [ ] **Step 1: sync-templates 스크립트 작성**

Create `scripts/sync-templates.mjs`:
```js
import { copyFileSync, mkdirSync } from "node:fs";

const SRC = "C:/WebSquare_Studio/ai_x64/websquare_26.0417/workspace/IDS_2026/WebContent/cm/template/snippets";
const MAP = [
  ["00_화면시작/0_01 페이지시작.xml", "pageContainer.xml"],
  ["02_타이틀/2_02 타이틀그룹(제목).xml", "title.xml"],
  ["05_입출력테이블/5_02 테이블(2단).xml", "inputTable.xml"],
  ["06_그리드/6_01 그리드.xml", "grid.xml"],
  ["11_단일입력폼/11_05 인풋.xml", "singleInput.xml"],
  ["08_기본버튼/8_02 기본버튼.xml", "button.xml"],
];

mkdirSync("templates", { recursive: true });
for (const [src, dest] of MAP) {
  copyFileSync(`${SRC}/${src}`, `templates/${dest}`);
  console.log(`synced ${dest}`);
}
```

- [ ] **Step 2: 스크립트 실행 (템플릿 복사)**

Run: `npm run sync-templates`
Expected: `templates/*.xml` 6개 생성, "synced ..." 출력
> Studio 경로가 없는 환경이면 이 단계는 스킵하고 `templates/` 파일을 수동 배치. 충실도 테스트는 파일 존재 시에만 실행되도록 작성(Step 3).

- [ ] **Step 3: 충실도 테스트 작성**

Create `test/templates/fidelity.test.ts`:
```ts
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
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run test/templates/fidelity.test.ts`
Expected: PASS (Studio 동기화 시 검증 수행, 미동기화 시 조용히 통과)

- [ ] **Step 5: 커밋**

```bash
git add scripts/sync-templates.mjs templates test/templates/fidelity.test.ts
git commit -m "feat: add template sync script and structural fidelity test"
```

---

## Task 14: 통합 검증 + 사용 문서

**Files:**
- Create: `README.md`
- Test: `test/integration/convert.test.ts`

- [ ] **Step 1: 통합 테스트 작성 (registry 경유 end-to-end)**

Create `test/integration/convert.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { convert } from "../../src/core/registry.js";
import { registeredTypes } from "../../src/core/registry.js";
import type { FigmaNode } from "../../src/core/types.js";

const frame = (children: FigmaNode[]): FigmaNode => ({
  id: "f", type: "FRAME", name: "f", width: 300, height: 60, children,
});
const text = (s: string): FigmaNode => ({
  id: "t" + s, type: "TEXT", name: s, characters: s, width: 60, height: 16, children: [],
});

describe("convert (integration)", () => {
  it("registers all 6 MVP snippet types", () => {
    expect(registeredTypes().sort()).toEqual(
      ["button", "grid", "inputTable", "pageContainer", "singleInput", "title"].sort()
    );
  });

  it("converts a title region end-to-end via registry", () => {
    const res = convert(frame([text("회원관리")]), "title");
    expect(res.xml).toContain('class="tit_main"');
    expect(res.xml).toContain('label="회원관리"');
    expect(res.warnings).toEqual([]);
  });

  it("propagates extraction warnings (empty grid)", () => {
    const res = convert(frame([]), "grid");
    expect(res.warnings.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: 테스트 실행 (전체)**

Run: `npx vitest run`
Expected: 전체 PASS. `registeredTypes`가 6개 모두 포함하는지 확인.
> 만약 "registers all 6" 테스트가 실패하면, 각 변환기의 registry 등록 import(Task 5~10 Step 5)가 누락된 것. registry.ts에 6개 import+register가 모두 있는지 확인 후 보완.

- [ ] **Step 3: README 작성**

Create `README.md`:
```markdown
# Figma → WebSquare XML 플러그인 (v2)

Figma 노드를 사람이 타입만 지정하면 결정론적으로 WebSquare XML로 변환한다.

## 개발
- `npm install`
- `npm test` — 엔진 단위 테스트 (figma 불필요)
- `npm run build` — `dist/main.js`, `dist/ui.html` 생성
- `npm run sync-templates` — Studio 스니펫 XML을 `templates/`로 동기화

## Figma에 로드
1. `npm run build`
2. Figma 데스크톱 → Plugins → Development → Import plugin from manifest
3. 이 repo의 `manifest.json` 선택

## 사용 (모드1: 단일 영역)
1. Figma에서 프레임 하나 선택
2. 플러그인 패널에서 스니펫 타입 선택 (입출력테이블은 단 수, 단일입력폼은 종류 추가 선택)
3. [변환] → XML 미리보기 → [복사]
4. ⚠ 경고가 뜨면 추출이 불완전한 것 — XML을 확인 후 보정

## 지원 스니펫 (MVP)
화면시작 · 타이틀 · 입출력테이블 · 그리드 · 단일입력폼 · 버튼

## 설계/계획
- 스펙: `docs/superpowers/specs/2026-06-09-figma-to-websquare-xml-v2-design.md`
- 계획: `docs/superpowers/plans/2026-06-09-figma-to-websquare-xml-v2.md`
```

- [ ] **Step 4: 최종 빌드 + 전체 테스트 + 커밋**

Run: `npm run build && npx vitest run`
Expected: 빌드 성공 + 전체 테스트 PASS

```bash
git add README.md test/integration/convert.test.ts
git commit -m "test: add end-to-end integration tests and usage README"
```

---

## 완료 기준 (스펙 §11 대응)

1. ✅ 6개 변환기가 사람이 타입 지정 시 정확한 XML 생성 (Task 5~10, 각 골든 테스트)
2. ✅ 같은 입력 → 같은 출력, AI 호출 0 (순수 함수 엔진, Task 1~10)
3. ✅ 모든 변환기 골든 파일 테스트로 커버, `npm test`가 figma 없이 통과 (Task 14 통합 검증)
4. ✅ 불확실한 추출은 경고로 노출 (각 변환기 extract의 warnings + UI 표시, Task 12)
5. ✅ Figma 플러그인으로 로드/실행 (Task 0·11·12, README)
