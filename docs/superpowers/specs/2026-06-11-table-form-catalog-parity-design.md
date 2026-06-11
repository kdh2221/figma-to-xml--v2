# 입출력테이블 + 입력폼 카탈로그 완전 동일화 (Catalog Parity)

날짜: 2026-06-11
대상 카테고리: `05_입출력테이블`, `11_단일입력폼`, `12_다중입력폼`

## 배경 / 문제

레퍼런스 파일 `all_components.xml`(WebSquare Studio 스니핏 카탈로그)에 입출력테이블·입력폼 변형이 추가/정리되었으나, 툴의 스니핏 레지스트리(`src/core/snippets/registry.ts`)는 이전 부분집합만 등록하고 있다. 그 결과 플러그인 카탈로그 UI(`catalogDescriptor()` → `snippetsByCategory()`)에 입출력테이블은 **1·2·3단만** 노출되고 4단·5단·목록형·멀티형, 그리고 입력폼의 다수 변형이 보이지 않는다.

목표: 위 3개 카테고리에 한해 레지스트리를 파일의 스니핏 어휘와 **동일하게(semantically identical)** 맞춰, UI에 전 변형이 노출되고 각 변형이 파일과 같은 마크업 형태를 생성하도록 한다.

비목표: 다른 카테고리(01~04, 06~10, 13, 99)의 파일-레지스트리 차이는 이번 범위에서 다루지 않는다. (예: `grid`가 6_01인지 6_07인지 등은 별도 작업.)

## 현재 상태 vs 목표 (3개 카테고리)

### 05_입출력테이블 — 추가 4
| id (신규) | name | builder |
|---|---|---|
| `table-4` | 5_04 테이블(4단) | `buildTableForNode(n, 4)` (기존 재사용) |
| `table-5` | 5_05 테이블(5단) | `buildTableForNode(n, 5)` (기존 재사용) |
| `table-list` | 5_06 테이블(목록형) | `buildListTable(headers)` **신규** |
| `table-multi` | 5_07 테이블(멀티형) | `buildMultiTable(headers)` **신규** |

기존 `table-1/2/3`(5_01~5_03)는 그대로 유지.

### 11_단일입력폼 — 추가 10
| id (신규) | name | builder |
|---|---|---|
| `form-text` | 11_01 텍스트 | `buildFormText()` **신규** |
| `checkbox-single` | 11_04 체크박스(단일) | `buildCheckboxSingle()` **신규** |
| `calendar-year` | 11_12 인풋캘린더(년) | `buildCalendar("year")` (타입 이미 지원) |
| `input-100` | 11_06 인풋(100) | `buildInput("100%")` (이미 지원) |
| `select-100` | 11_08 셀렉트(100) | `buildSelect("100%")` |
| `calendar-100` | 11_10 인풋캘린더(100) | `buildCalendar("yearMonthDate","100%")` |
| `textarea-100` | 11_14 텍스트에어리어(100) | `buildTextarea("100%")` |
| `autocomplete-100` | 11_16 오토컴플릿(100) | `buildAutoComplete("100%")` |
| `checkcombo-100` | 11_18 체크콤보박스(100) | `buildCheckCombo("100%")` |
| `upload-100` | 11_20 업로드(100) | `buildUpload("100%")` |

기존 11 항목(`input`/`select`/`radio`/`checkbox`/`calendar-ymd`/`calendar-ym`/`textarea`/`checkcombo`/`autocomplete`/`upload`)은 그대로 유지.

### 12_다중입력폼 — 추가 1 + 정정 1
파일 기준 실제 마크업:
- `12_01 코드조회` = 단일 `xf:input style="width:150px;"` (현재 툴은 여기에 input+버튼+input를 잘못 연결)
- `12_02 코드상세조회` = `flex`(input.flex_no 150px + 검색버튼 + input 200px) = 현재 `buildCodeSearch`

| id | name | builder | 비고 |
|---|---|---|---|
| `code` | 12_01 코드조회 | `buildInput("150px")` | **정정** (기존 buildCodeSearch에서 변경) |
| `code-detail` (신규) | 12_02 코드상세조회 | `buildCodeSearch()` | 기존 빌더 재사용 |

기존 `phone`/`email`/`period`/`addr`/`amount`(12_03~07)는 그대로 유지.

## 빌더 변경 상세

### singleForm.ts — width 파라미터화
`buildInput`은 이미 `width` 인자를 받는다. 다음 6개에 선택적 `width` 인자를 추가하되 **기본값은 현재 출력 문자열을 그대로** 유지한다(기존 스냅샷/테스트 불변):

- `buildSelect(width = "150px")` — `style: "width: ${width};"` → 기본 `"width: 150px;"`
- `buildCalendar(valueType, width = "120px")` — `style: "width: ${width};"` → 기본 `"width: 120px;"`
- `buildTextarea(width = "150px")` — `style: "width:${width};height: 82px;"` → 기본 `"width:150px;height: 82px;"`
- `buildCheckCombo(width = "150px")` — `style: "width: ${width};"`
- `buildAutoComplete(width = "150px")` — `style: "width: ${width};"`
- `buildUpload(width = "250px")` — `style: "width: ${width};"`

**결정 ① (확정): width만 파라미터화.** 파일의 `(100)` 스니핏이 베이스와 가지는 부수적 차이(샘플 `xf:item` 개수, `xf:select1` allOption 빈값, `w2:upload`의 `ev:` 핸들러/`id`)는 페이지 고유 노이즈로 보고 복제하지 않는다. 또한 style 속성 내 공백은 **각 베이스 빌더의 기존 포맷을 따른다**(예: select-100 = `width: 100%;`). 파일이 일부 변형에서 `width:100%;`(공백 없음)을 쓰더라도 CSS 의미상 동일하므로, 수용 기준은 "파일과 의미상 동일 + width 정확"이며 바이트 단위 일치가 아니다.

### 신규 빌더

**`buildFormText()`** (singleForm.ts) — 정적 텍스트:
```
<w2:textbox id="" label="텍스트입니다." style="" tagname="span"></w2:textbox>
```
(기존 `text`(2_08)의 `buildText(n)`와 별개. 2_08은 노드 텍스트 기반 제목, 11_01은 폼 어휘의 정적 텍스트.)

**`buildCheckboxSingle()`** (singleForm.ts) — 단일 체크박스: `buildCheckboxGroup`과 동일 속성(`xf:select renderType="checkboxgroup"`)이되 `xf:choices`에 빈 항목 1개:
```
<xf:item><xf:label><![CDATA[]]></xf:label><xf:value><![CDATA[]]></xf:value></xf:item>
```

**`buildListTable(headers: string[])`** (inputTable.ts) — 목록형: 라벨열 없는 N컬럼.
- colgroup: 헤더 수만큼 plain `col`
- tr 1: 각 컬럼 `th.w2tb_th tac` 안에 `w2:textbox label="<header>"`
- tr 2: 각 컬럼 빈 `td.w2tb_td`
- 래퍼 `xf:group.tblbox > xf:group.w2tb.tbl[tagname=table]` (다른 테이블 빌더와 동일)

**`buildMultiTable(headers: string[])`** (inputTable.ts) — 멀티형: 행헤더열 + 컬럼헤더 + 데이터행.
- colgroup: `col style="width:100px;"` + 헤더 수만큼 plain `col`
- tr 1(헤더행): 선두 `th.w2tb_th req`(빈) + 각 컬럼 `th.w2tb_th tac` 안 `w2:textbox label="<header>"`
- tr 2(데이터행): 선두 `th.w2tb_th req` 안 `w2:textbox label="<rowheader>"` + 각 컬럼 빈 `td.w2tb_td`

**결정 ② (확정): 목록형/멀티형은 노드 기반.** 컬럼 헤더는 노드의 텍스트 노드에서 수집(다른 테이블 빌더와 일관). 파일의 5컬럼 고정 샘플을 하드코딩하지 않는다. 출력 마크업의 *형태*는 파일과 동일하고, 컬럼 수/라벨만 입력에서 온다. 헤더가 없을 때의 폴백(예: 최소 1컬럼, 빈 label)도 정의한다.

### table.ts 디스패치
`buildTableForNode(node, cols)`는 그대로(4/5단은 cols만 4/5). 목록형/멀티형은 레지스트리에서 별도 빌더로 직접 호출하며, 노드의 텍스트 수집은 기존 `collectTextNodes`/`textOf` 패턴을 재사용한다.

## registry.ts 변경
- 위 표의 신규 `def(...)` 항목 15개 추가(05: 2 param-재사용 + 2 신규, 11: 10, 12: 1 신규).
- `code`(12_01) 항목의 build를 `buildInput("150px")`로 정정.
- `LEGACY_REGION_TYPE_TO_ID`는 영향 없음(`inputTable → table-1` 유지).
- 카테고리 라벨/표시 라벨은 기존 패턴(`categoryLabel`, 짧은 `label`)을 따른다. 신규 변형 `label` 예: 4단/5단/목록형/멀티형/텍스트/체크박스(단일)/인풋(100)/셀렉트(100)/… /코드상세조회.

## 테스트 전략 (TDD)
패밀리별 기존 테스트 파일에 케이스 추가:
- `test/core/snippets/table.test.ts` — 4단/5단(컬럼 수), 목록형/멀티형(구조: th행+td행, 행헤더열 유무), 노드 기반 헤더 수집, 헤더 0개 폴백.
- `test/core/snippets/singleForm.test.ts` — `form-text`, `checkbox-single`(빈 항목 1개), 각 `(100)` 빌더가 width만 바뀌고 나머지 속성/기본값 출력은 불변임을 검증(기본값 호출 스냅샷 불변 포함), `calendar-year`.
- `test/core/snippets/multiForm.test.ts` — `code-detail` = 기존 코드검색 구조.
- `test/core/snippets/registry.test.ts` — 3개 카테고리의 `snippetsByCategory()`/`catalogDescriptor()` variants 목록이 기대 id/label 집합과 일치, `code`(12_01) build 결과가 단일 input.

각 빌더는 구현 전 실패 테스트 → 구현 → 통과 순서로 진행.

## 수용 기준
1. `catalogDescriptor()`의 `05_입출력테이블` variants = 7개(1·2·3·4·5단·목록형·멀티형), `11_단일입력폼` = 20개, `12_다중입력폼` = 7개.
2. 각 신규 변형의 생성 XML이 파일의 해당 스니핏과 의미상 동일(태그/클래스/핵심 속성 일치, width 정확).
3. 기존 변형(1·2·3단, 기존 입력폼, phone/email/period/addr/amount)의 출력은 불변.
4. `code`(12_01)는 단일 input, `code-detail`(12_02)은 input+버튼+input flex.
5. 전체 테스트 통과.
