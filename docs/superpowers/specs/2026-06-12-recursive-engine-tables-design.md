# 재귀 변환 엔진 + 테이블 패밀리 (슬라이스 1) 설계

날짜: 2026-06-12
대상: 새 모듈 `src/core/recursive/` (기존 1단 `assemble.ts`/`regions.ts`와 분리)

## 배경 / 문제

현재 `analyzeRegions`/`assemblePage`는 선택 루트의 **직계 자식만** 영역으로 보고, 영역 내부는 `collectTextNodes`로 **모든 텍스트를 평면화**한다(분석 깊이 1단). 그래서 입출력/목록 테이블에서 라벨·값·헤더·데이터 구분이 사라져 **모든 텍스트가 th**로 나온다(보고된 th/td 버그).

실측 Figma 덤프(`websquare-page4.xml`, 픽스처로 박제 예정)로 확인된 사실: **디자인이 레이어 이름에 의미를 담는다**.
- `Table`(프레임) = 테이블, `label`(인스턴스) = **헤더/라벨 셀(th)**, `\btd`(인스턴스) = **데이터 셀(td)**
- `selectbox`/`item/boxitem` = 입력박스(Placeholder+아이콘), `Button`/`Button_M/S` = 버튼, `*`+`필수 항목` = 필수
- 행/열 구조는 **프레임 중첩 + `layoutMode`** 에 들어있다(좌표 불필요).

## 제약 (사용자 확정)
1. **절대좌표(x/y) 의존 금지.** 행/열은 프레임 중첩과 `layoutMode`로 복원한다. `clusterRows`/좌표 클러스터링 사용 안 함.
2. **스니핏 모듈 우선 활용.** td 안 컨트롤은 기존 스니핏 빌더 재사용, 폼형 테이블 렌더는 기존 `buildSmartFormTable`를 재사용한다.

## 범위 (슬라이스 1)
- **재귀 엔진**: walker + 인식기(recognizer) 레지스트리. 슬라이스 1 인식기 = **Table**(및 그 셀/컨트롤). 컨테이너는 재귀, 장식(아이콘/벡터/텍스트 없는 노드)은 skip.
- **테이블 패밀리**: `label`→th / `\btd`→td, 구조 기반(중첩+layoutMode), td 컨트롤은 스니핏 빌더로.
- **통합**: `generate` 경로가 재귀 엔진을 쓰도록 배선, 페이지 외피는 기존 `wrapDocument` 재사용. 미인식 TEXT는 손실 방지로 `w2:textbox` 방출.

## 비목표 (슬라이스 2+, 각각 별도 스펙)
타이틀/소제목, 조회영역(schbox), 버튼그룹, 탭, breadcrumb, 사이드바, 메시지(bullet). 그리고 **테이블 데이터의 dataList 바인딩**(슬라이스 1은 정적 th/td로 두고 헤더 정확화 우선 — "안되면 빼는 방향" 지시 반영).

## 아키텍처

### 모듈
- `src/core/recursive/names.ts` — 이름 판정 헬퍼(순수, 테스트 용이):
  `isTable(n)`, `isLabelCell(n)`, `isTdCell(n)`, `isSelectbox(n)`, `isBoxItem(n)`, `isButtonNode(n)`, `controlKindOfBoxItem(n): "input"|"select"|"calendar"`(자식 아이콘 인스턴스 이름 `search`/`arrow-down`/`calendar`로 추론), `isRequiredLabel(n)`(자손에 `*` 텍스트 존재).
  - `\btd` 매칭: 이름 끝이 `td`(제어문자/공백 trim 후). `label`/`selectbox`/`item/boxitem`/`Button`은 부분일치(대소문자 무시).
- `src/core/recursive/table.ts` — 구조 기반 테이블 변환:
  - `fieldsFromTable(table): Field[]` — `Field`/`Control`은 기존 `formTable.ts` 타입 재사용.
  - `buildTableXml(table): XmlEl` — `buildSmartFormTable(fieldsFromTable(table))` 호출(폼형). 목록/전치형은 아래 규칙으로 같은 추출기에서 처리.
- `src/core/recursive/engine.ts` — `Recognizer = { match(n): boolean; build(n): XmlEl | XmlEl[] }`, `RECOGNIZERS = [tableRecognizer]`, `convertNode(n): XmlEl[]`, `convertTree(root): XmlEl[]`.
- `src/core/recursive/index.ts` — `convertPageRecursive(root): string` (= `wrapDocument(root.name, serialize(sub), hasGrid)` 재사용; `sub`=`sub_contents` 그룹에 `convertTree` 결과).

### 구조 기반 행/열 복원 (좌표 없이)
`fieldsFromTable(table)`:
1. 테이블의 **셀 수집**: 테이블 서브트리를 DFS하되 **인식 셀 경계(`label`/`\btd`/`selectbox`/`item/boxitem`/`Button`)에서 멈춰** 그 노드를 셀로 수집(셀 내부는 더 안 내려감). 각 셀: `{ role: "th"|"td", node }` (label=th, 그 외=td).
2. **행/열 방향**: 가장 가까운 공통 조상(table)의 `layoutMode`로 판정.
   - `VERTICAL`(행-major): table의 직계 자식 = 행. 각 행을 DFS해 셀을 문서순으로 → 한 행의 셀들(th td th td …).
   - `HORIZONTAL`(열-major): table의 직계 자식 = 열. 각 열의 셀을 DFS 수집 후 **전치**(행 i = 각 열의 i번째 셀).
   - 자식이 또 `Table`이면 그 Table로 재귀(중첩 테이블).
3. **Field 매핑**(폼형): 한 행이 `[th(label), td]` 또는 `[th, td, th, td]`면 각 (th,td)쌍 → `Field{ label: th텍스트, required: isRequiredLabel, rows: [[control]] }`. `control` = td를 `tdToControl`로 변환.
   - 헤더만 있는 행(전부 th, 목록형 헤더행)·데이터만 있는 행(전부 td)도 `buildSmartFormTable`이 처리 가능한 형태로 정규화(헤더행은 label들, 데이터행은 빈 라벨+control). 깔끔히 안 되면 정적 th/td로 폴백.

### td → 컨트롤 (스니핏 빌더 재사용)
`tdToControl(td): Control` 및 방출:
- `selectbox` 또는 `controlKindOfBoxItem==="select"` → `SF.buildSelect("100%")`
- `item/boxitem` + `search` 아이콘 → `SF.buildInput("100%")`
- `item/boxitem` + `calendar` → `SF.buildCalendar("yearMonthDate")`
- `Button` → 기존 버튼 빌더 `buildButton(node)` (텍스트=라벨)
- 그 외(텍스트 "input field" 등) → `SF.buildInput("100%")` (빈 입력칸)
- **모두 기존 스니핏 빌더 호출**(신규 XML 직접작성 금지). `buildSmartFormTable`의 `Control` 모델로 안 들어가는 컨트롤(select/calendar)은 `td` XmlEl을 직접 구성하되 **내용은 스니핏 빌더 출력**을 넣는다.

### 엔진 동작
`convertNode(n)`:
- `isTable(n)` → `[buildTableXml(n)]`
- 자식 있는 컨테이너 → 자식들 `convertNode` 결과를 평탄화(필요시 group 래핑은 슬라이스 2의 컨테이너 인식기에서; 슬라이스 1은 평탄화)
- TEXT(미소비) → `[el("w2:textbox",{ label: textOf(n), tagname:"span" })]` (손실 방지)
- 장식(텍스트 0 & 비컨테이너 / 아이콘·벡터) → `[]`

## 통합
- `main.ts`의 `generate`: `assemblePage` → `convertPageRecursive` 로 교체.
- `assemblePage`/`analyzeRegions`(및 그 테스트)는 **유지**(레거시·analyze 흐름). 슬라이스 1은 generate만 새 엔진으로.

## 테스트 전략 (TDD)
- `test/core/recursive/names.test.ts` — 이름 판정(각 헬퍼), `\btd` 제어문자 trim, required 감지.
- `test/core/recursive/table.test.ts` — **첨부 덤프를 픽스처로**(`test/fixtures/websquare-page4.json`): 폼형 테이블(332:10400)에서 th 개수 = `label` 셀 수, td 개수 = `\btd`+컨트롤 수, 값 텍스트가 th로 새지 않음, 필수(*) → `req`. 목록형(332:10479)·전치형(332:10444)은 헤더행 th / 데이터 td 구조 검증(가능 범위, 안 되면 정적 폴백 검증).
- `test/core/recursive/engine.test.ts` — 합성 노드: Table 인식 → 테이블, 미인식 TEXT → textbox, 장식 → skip, 컨테이너 재귀.
- 기존 전체 테스트 불변(특히 `assemble.test.ts`, `pageAbsolute.test.ts`).

## 수용 기준
1. 첨부 덤프의 폼형 테이블 변환에서 **th 개수 = `label` 셀 수**, 값/입력은 **td**. (버그 해결)
2. td 컨트롤은 기존 스니핏 빌더 출력(input/select/calendar/button)으로 채워진다.
3. 행/열 복원에 **x/y 좌표를 사용하지 않는다**(중첩+layoutMode만).
4. `generate`가 재귀 엔진을 사용하고, 미인식 TEXT도 손실 없이 방출.
5. 전체 테스트 통과, `pageAbsolute.ts`/`assemblePage` 출력 불변.
