# 선언적 스니핏 레지스트리 설계

작성일: 2026-06-10

## 배경 / 문제

플러그인에서 사용자가 영역에 지정할 수 있는 "스니핏"이 [src/ui.ts](../../../src/ui.ts) 의
하드코딩된 `REGION_TYPES` 9개(타이틀/입출력테이블/그리드/버튼/인풋/셀렉트/텍스트/탭/그룹)뿐이다.
이 9개는 `RegionType`(enum) → [renderRegion](../../../src/core/assemble.ts) 의 `switch` 로 1:1 매핑되어,
WebSquare 스니핏 카탈로그(`all_components.xml`, ~80개 변형: 화면분할 2~4단·비대칭, 조회 N행 M단,
입출력테이블 1~5단·목록형·멀티형, 단일입력폼 인풋/셀렉트/라디오/체크박스/캘린더/체크콤보/오토컴플릿/업로드,
다중입력폼 주소/이메일/전화/기간/금액, 아코디언/트리/차트/메시지 등)에 비해 선택지가 빈약하다.

목표: 카탈로그 전체를 사용자가 2단계(카테고리→변형)로 선택할 수 있게 하고, 추가/수정이 데이터 한 줄로
끝나는 구조로 전환한다.

참고 학습 자료: 메모리 `websquare-snippet-catalog.md` (카탈로그 어휘/마크업 정리),
원본 `C:\WebSquare_Studio\...\pub\pageFlowTest\all_components.xml`.

## 접근

**A. 선언적 스니핏 레지스트리** (채택). 레지스트리 하나에서 UI 드롭다운·자동분류 기본값·렌더가 모두 파생된다.
대안 B(스니핏별 수작업 빌더 ~80개)는 코드량/유지보수 폭증으로 기각. C(하이브리드)는 A에 빌더 연결 규칙을
명문화한 것으로 사실상 A와 동일.

원칙: **내용을 추론·주입해야 하는 스니핏은 파라메트릭 빌더**, **내용이 없는 정적 스니핏은 카탈로그 리터럴 방출**.

## 아키텍처

### 모듈 구성 (신규 `src/core/snippets/`)

- `types.ts`
  ```ts
  export interface RenderOpts { checkboxes?: string[]; /* 향후 확장 */ }
  export interface SnippetDef {
    id: string;            // 안정 키 (예: "table-2col"), typeById/snippetById 키
    category: string;      // meta_snippetCategory, 예 "05_입출력테이블"
    categoryLabel: string; // UI 카테고리 표시명, 예 "입출력테이블"
    name: string;          // meta_snippetName, 예 "5_02 테이블(2단)"
    label: string;         // UI 변형 표시명, 예 "2단"
    build(node: FigmaNode, opts: RenderOpts): XmlEl;
  }
  ```
- `registry.ts` — `export const SNIPPETS: SnippetDef[]` + 헬퍼:
  - `getSnippet(id): SnippetDef | undefined`
  - `snippetsByCategory(): { category, categoryLabel, variants: {id,label}[] }[]` (UI/카탈로그 descriptor)
  - `defaultSnippetFor(node): { id, confidence }` (자동분류; 내부에서 기존 `classifyRegion` 휴리스틱 재사용)
  - `LEGACY_REGION_TYPE_TO_ID: Record<string, string>` (하위호환 매핑)
- `builders/` — 카테고리별 빌더 함수. 기존 `converters/inputTable.ts`·`converters/grid.ts`·
  `converters/formTable.ts` 를 재사용/이동하고 신규 빌더를 추가.

### 빌더 전략

**파라메트릭(내용 추론):**
- 화면분할: `buildSplit(cols: number[])` — `lybox` + `class="col_N"` 자식. 2단/3단/4단/비대칭(2-8,3-7,…)/
  셔틀(가로·세로) 10여 종을 하나의 빌더 + 인자로 표현.
- 타이틀: `buildTitle(variant, node, opts)` — 제목/소제목/페이지타이틀/버튼조합/건수조합/안내문조합.
  기존 renderRegion의 titbox 로직 흡수, 우측(rt) 체크박스(opts.checkboxes) 유지.
- 조회영역: `buildSearch(rows, cols)` — `schbox`>`schbox_inner`>`w2tb tbl`(adaptive 768) + 조회버튼.
- 입출력테이블: 기존 `buildInputTable(cols)` 재사용 + 목록형/멀티형 추가. 스마트폼(`buildFormFromNode`) 유지.
- 탭: `buildTab(variant, node)` — 기본/스크롤/서브/좌·우·하단 배치(class 차이).
- 그리드: 기존 `buildGrid` 재사용.
- 단일입력폼(11_): 인풋, 인풋(100), 셀렉트, 라디오, 체크박스, 캘린더(년월일/년월/년),
  텍스트에어리어, 체크콤보박스, 오토컴플릿, 업로드 — 각 소형 `el()` 빌더.
- 다중입력폼(12_): 주소, 이메일, 전화번호, 기간조회, 금액, 코드조회/상세 — 소형 복합 빌더(`xf:group class="flex"`).

**정적 템플릿(내용 없음):** 아코디언, 트리, 차트(막대/원/기타), 스케줄캘린더, 전체제어버튼 그룹,
메시지 리스트 등은 카탈로그 원본 마크업을 그대로 방출.

### xml.ts 확장: raw 패스스루

정적 템플릿을 손번역 없이 카탈로그 리터럴 그대로 보존하기 위해 `#raw` 노드를 추가한다.
```ts
export function raw(xml: string): XmlEl;      // { tag: "#raw", attrs:{}, children:[xml] }
// serialize(): node.tag === "#raw" → children[0] 문자열을 이스케이프 없이 그대로 반환
```
정적 빌더는 `() => raw(`<xf:group ...>…</xf:group>`)` 형태. 리터럴은 카탈로그에서 발췌하되 `id=""` 유지.

## 데이터 흐름

1. `analyze` → `analyzeRegions(root)` 가 각 영역에 `defaultSnippetFor(node)` 로 기본 `snippetId`+confidence 부여.
   `Region` 의 `type: RegionType` 필드를 `snippetId: string` 으로 교체(UI는 snippetId로 동작).
   레거시 RegionType 호환은 `assemblePage` 입력단에서만 처리(아래 호환 절).
2. `main.ts` 가 `regions` 메시지에 **카탈로그 descriptor**(`snippetsByCategory()` 결과)를 함께 실어 UI로 전송.
3. UI는 영역마다 **카테고리 select + 변형 select** 렌더. 카테고리 변경 시 변형 옵션 재구성.
   기본 선택 = 영역의 `snippetId` 가 속한 카테고리/변형.
4. `generate` → UI가 `snippetById: Record<regionId, snippetId>` 전송.
5. `assemblePage(root, snippetById)` 가 영역별 `getSnippet(id).build(node, opts)` 로 조립.

## assemble.ts 변경

- `renderRegion(type, node, opts)` switch → `renderSnippet(snippetId, node, opts)`:
  `getSnippet(snippetId)?.build(node, opts) ?? <group fallback>`.
- 연속 입출력테이블 병합 로직은 `getSnippet(id).category === "05_입출력테이블"` 기준으로 유지.
- 타이틀 우측 체크박스(`findCheckboxLabels(raw)`) 주입은 `opts.checkboxes` 로 계속 전달.
- `withMeta` 는 빌더 내부에서 각 스니핏의 category/name 을 직접 세팅(레지스트리 값 사용)하도록 통합.

## 하위호환 & 테스트

- 기존 테스트와 `typeById` 의 RegionType 문자열("inputTable","title",…)은 `LEGACY_REGION_TYPE_TO_ID`
  로 기본 snippetId 에 매핑. `assemblePage` 는 들어온 키가 레거시 타입이면 변환해 처리 → 기존 테스트 통과.
- 신규 단위테스트: `registry`(조회/그룹화/기본값), 대표 빌더(split/title/search/table/단일입력폼 일부/raw 정적 1종).
- 스냅샷: 대표 스니핏 출력이 카탈로그 마크업과 일치하는지.
- 통합: 기존 `addressForm`·`assemble`·`regions` 테스트가 새 흐름에서 그린.

## 범위 밖 (YAGNI)

- 정적 템플릿 스니핏의 내용 자동 채움(차트 데이터, 트리 노드 등).
- 자동분류의 정밀 변형 추론(예: 테이블 열 수 자동 카운트) — 기본값은 단순 휴리스틱, 사용자가 변형 조정.
- 카탈로그를 빌드타임에 파싱해 레지스트리 자동생성 — 이번엔 레지스트리를 수기 작성(정적 리터럴만 발췌).
