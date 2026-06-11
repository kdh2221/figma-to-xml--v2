# 페이지 외피 template_test.xml 동일화 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 컴포넌트 페이지 외피 `wrapDocument`(assemble.ts)를 `template_test.xml`와 동일하게 — head `meta_*_guides`/`w2:MSA`, body `ev:onpageload`/`class=""` + onpageload 안전 스텁, 그리고 그리드 페이지에 `dataCollection/dataList1`(col1…col15) 모델 스캐폴드를 생성해 그리드 바인딩을 해결한다.

**Architecture:** `src/core/assemble.ts`의 문자열 기반 `wrapDocument`를 확장한다. 모델 XML은 작은 헬퍼 `buildModelXml(hasGrid)`로 분리(상수 기반 컬럼/행 반복). `assemblePage`는 외피 생성 전 최상위 영역에 그리드(`06_그리드`)가 있는지 계산해 `hasGrid`를 `wrapDocument`로 전달한다. `pageAbsolute.ts`는 건드리지 않는다.

**Tech Stack:** TypeScript (ESM, `.js` import 확장자), Vitest. 페이지 외피는 순수 문자열 조립(현재 방식 유지). 속성 이스케이프는 기존 `escapeAttr`.

**참고 — 현재 코드:** `wrapDocument(screenName, bodyInner)`는 [assemble.ts:49-62]. `assemblePage`는 마지막에 `wrapDocument(root.name, serialize(sub))` 호출 [assemble.ts:103]. `idOf(i)`는 함수 내부에 정의됨. 그리드 영역 판정은 `getSnippet(idOf(i))?.category === "06_그리드"`.

---

### Task 1: buildModelXml 헬퍼 + onpageload 스텁 상수

**Files:**
- Modify: `src/core/assemble.ts`
- Test: `test/core/assemble.test.ts`

이 태스크는 모델 XML을 만드는 순수 헬퍼를 추가하고 테스트로 고정한다(아직 wrapDocument에 연결하지 않음).

- [ ] **Step 1: 실패 테스트 작성**

`test/core/assemble.test.ts` 상단 import에 `buildModelXml`를 추가하고(기존 import 구문 병합), 파일 끝에 describe 블록을 추가한다:

```ts
import { renderRegion, renderSnippet, assemblePage, buildModelXml } from "../../src/core/assemble.js";
```

```ts
describe("buildModelXml", () => {
  it("grid page emits dataCollection/dataList1 with col1..col15", () => {
    const xml = buildModelXml(true);
    expect(xml).toContain('<w2:dataCollection baseNode="map">');
    expect(xml).toContain('id="dataList1"');
    expect(xml).toContain('<w2:column id="col1" name="name1" dataType="text"/>');
    expect(xml).toContain('<w2:column id="col15" name="name15" dataType="text"/>');
    expect(xml).not.toContain('col16');
    expect((xml.match(/<w2:column /g) ?? []).length).toBe(15);
    expect((xml.match(/<w2:row\/>/g) ?? []).length).toBe(5);
    expect(xml).not.toContain("<xf:instance>");
  });
  it("non-grid page emits the empty instance model", () => {
    const xml = buildModelXml(false);
    expect(xml).toBe('<xf:model><xf:instance><data xmlns=""/></xf:instance></xf:model>');
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run test/core/assemble.test.ts`
Expected: FAIL — `buildModelXml` export 없음.

- [ ] **Step 3: 구현**

`src/core/assemble.ts`에서 `wrapDocument` 함수 바로 위에 상수와 헬퍼를 추가한다:

```ts
/** 그리드 바인딩용 dataList1 컬럼 수(템플릿 동일). */
const DATALIST_COLS = 15;
/** dataList1 빈 데이터행 수. */
const DATALIST_ROWS = 5;
/** body ev:onpageload 핸들러를 안전하게 만드는 스크립트 스텁. */
const ONPAGELOAD_STUB = "scwin.onpageload = function(){};";

/** xf:model XML. 그리드가 있으면 dataCollection/dataList1 스캐폴드, 아니면 빈 instance. */
export function buildModelXml(hasGrid: boolean): string {
  if (!hasGrid) {
    return '<xf:model><xf:instance><data xmlns=""/></xf:instance></xf:model>';
  }
  let cols = "";
  for (let i = 1; i <= DATALIST_COLS; i++) {
    cols += `<w2:column id="col${i}" name="name${i}" dataType="text"/>`;
  }
  const rows = "<w2:row/>".repeat(DATALIST_ROWS);
  return (
    "<xf:model>" +
    '<w2:dataCollection baseNode="map">' +
    '<w2:dataList baseNode="list" repeatNode="map" id="dataList1" saveRemovedData="true">' +
    `<w2:columnInfo>${cols}</w2:columnInfo>` +
    `<w2:data use="true">${rows}</w2:data>` +
    "</w2:dataList>" +
    "</w2:dataCollection>" +
    "</xf:model>"
  );
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run test/core/assemble.test.ts`
Expected: PASS (신규 describe 포함, 기존 케이스 불변).

- [ ] **Step 5: 커밋**

```bash
git add src/core/assemble.ts test/core/assemble.test.ts
git commit -m "feat(assemble): buildModelXml scaffold for grid dataList binding"
```

---

### Task 2: wrapDocument head/body 동일화 + hasGrid 배선

**Files:**
- Modify: `src/core/assemble.ts`
- Test: `test/core/assemble.test.ts`

- [ ] **Step 1: 실패 테스트 작성**

`test/core/assemble.test.ts`의 `describe("assemblePage", ...)` 블록 안에 케이스를 추가한다(기존 `root` 픽스처 재사용 — 둘째 영역이 휴리스틱 그리드가 되어 그리드 페이지가 된다):

```ts
  it("wraps grid page with full scaffold (MSA, onpageload, dataList1)", () => {
    const doc = assemblePage(root);
    expect(doc).toContain('meta_vertical_guides=""');
    expect(doc).toContain('meta_horizontal_guides=""');
    expect(doc).toContain("<w2:MSA/>");
    expect(doc).toContain('<body ev:onpageload="scwin.onpageload" class="">');
    expect(doc).toContain("scwin.onpageload = function(){};");
    expect(doc).toContain('id="dataList1"');
    expect(doc).toContain('<w2:column id="col15" name="name15" dataType="text"/>');
    expect(doc).not.toContain("<xf:instance>");
  });

  it("wraps non-grid page with empty-instance model but same head/body shell", () => {
    const form = frame("FormOnly", [
      frame("r1", [text("플랜명"), text("SignSquare")]),
    ], 600, 100);
    const doc = assemblePage(form, { r1: "inputTable" });
    expect(doc).toContain("<w2:MSA/>");
    expect(doc).toContain('<body ev:onpageload="scwin.onpageload" class="">');
    expect(doc).toContain("scwin.onpageload = function(){};");
    expect(doc).toContain('<xf:instance><data xmlns=""/></xf:instance>');
    expect(doc).not.toContain("w2:dataCollection");
  });
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run test/core/assemble.test.ts`
Expected: FAIL — 현재 외피에 `w2:MSA`/`meta_*_guides`/onpageload/dataCollection 없음.

- [ ] **Step 3: 구현**

(a) `wrapDocument`를 시그니처 확장 + head/body 동일화로 교체한다. 기존 함수 전체를 아래로 대체:

```ts
/** 문서 외피로 감싼다 (body 루트 = 전달된 inner XML). hasGrid면 모델에 dataList1 스캐폴드. */
function wrapDocument(screenName: string, bodyInner: string, hasGrid: boolean): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:ev="http://www.w3.org/2001/xml-events" ' +
    'xmlns:w2="http://www.inswave.com/websquare" xmlns:xf="http://www.w3.org/2002/xforms">' +
    `<head meta_vertical_guides="" meta_horizontal_guides="" meta_screenName="${escapeAttr(screenName)}">` +
    "<w2:type>COMPONENT</w2:type><w2:buildDate/><w2:MSA/>" +
    buildModelXml(hasGrid) +
    `<script type="text/javascript"><![CDATA[${ONPAGELOAD_STUB}]]></script>` +
    "</head>" +
    `<body ev:onpageload="scwin.onpageload" class="">${bodyInner}</body>` +
    "</html>"
  );
}
```

(b) `assemblePage` 안에서 `hasGrid`를 계산해 `wrapDocument`에 전달한다. 함수 마지막의 반환부를 교체:

기존:
```ts
  const sub = el("xf:group", { class: "sub_contents", id: "", meta_componentContainer: "true" }, regionEls);
  return wrapDocument(root.name, serialize(sub));
```
교체:
```ts
  const hasGrid = children.some((_, i) => getSnippet(idOf(i))?.category === "06_그리드");
  const sub = el("xf:group", { class: "sub_contents", id: "", meta_componentContainer: "true" }, regionEls);
  return wrapDocument(root.name, serialize(sub), hasGrid);
```

(`idOf`와 `getSnippet`는 이미 `assemblePage` 스코프/모듈에 존재.)

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run test/core/assemble.test.ts`
Expected: PASS (신규 2케이스 + 기존 케이스 전부. 기존 케이스는 `toContain` 기반이라 외피 확장에 영향 없음).

- [ ] **Step 5: 커밋**

```bash
git add src/core/assemble.ts test/core/assemble.test.ts
git commit -m "feat(assemble): page scaffold parity (MSA, onpageload, grid dataList)"
```

---

### Task 3: 전체 검증

**Files:** (없음 — 검증만)

- [ ] **Step 1: 전체 테스트**

Run: `npx vitest run`
Expected: 전체 PASS. 특히 `pageAbsolute.test.ts`가 불변임을 확인(절대좌표 경로 미변경).

- [ ] **Step 2: 타입체크 + 빌드**

Run: `npx tsc --noEmit` (Expected: 오류 없음) 그리고 `npm run build` (Expected: `build complete`).

- [ ] **Step 3: 검증 중 수정이 있었다면 커밋**

```bash
git add -A
git commit -m "test: page scaffold parity verification"
```

---

## 수용 기준 (재확인)
1. 그리드 페이지 모델이 `dataList1`(col1…col15) 정의 → 그리드 `col{N}` 바인딩.
2. 모든 컴포넌트 페이지 head에 `meta_*_guides`/`w2:MSA`, body에 `ev:onpageload`/`class=""`, script에 onpageload 스텁.
3. 그리드 없는 페이지는 `w2:dataCollection` 미생성(빈 instance 유지).
4. `pageAbsolute.ts` 출력 불변.
5. 전체 테스트 통과.
