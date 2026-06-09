# Figma → WebSquare XML 변환 플러그인 v2 — 설계 문서

- **날짜**: 2026-06-09
- **상태**: 설계 확정 (구현 계획 작성 전)
- **작업 위치**: `c:\Users\user\.claude\html-to-xml-v2`

---

## 1. 배경 & 문제 정의

Figma 안에서 실행되는 플러그인으로, Figma 디자인을 **WebSquare XML**(Inswave WebSquare 프레임워크 마크업)로 변환한다.

### v1 실패 분석
- **변환 정확도가 낮아** 케이스마다 일일이 대응(case study)해야 했다.
- **토큰 비용 과다** — AI에게 매번 통째로 변환을 시켰다.
- **AI 활용 의미 저하** — AI 결과가 부정확하니 결국 사람이 다 손봐야 했다.

### 근본 원인
v1은 "임의의 Figma 디자인 → XML"을 **AI 자유 생성**으로 풀었다. 출력이 그럴듯하지만 틀린 경우가 많았고, 비용이 컸다.

### v2의 핵심 통찰
WebSquare 마크업은 **"고정된 스니펫 템플릿 + 슬롯 채우기"** 구조다. (실제 스니펫 XML 확인 완료 — `C:\WebSquare_Studio\ai_x64\websquare_26.0417\workspace\IDS_2026\WebContent\cm\template\snippets`)

따라서 변환의 80%(슬롯 추출 → 템플릿 주입 → XML 생성)는 **결정론적으로 완벽하게** 만들 수 있다. 진짜 어려운 20%는 단 하나 — **"이 Figma 영역이 어떤 스니펫인가?"** 라는 *타입 식별 한 비트*다. v1은 이 한 비트를 AI로 풀려다 실패했다.

**Figma 쪽에는 컴포넌트 체계가 없다**(디자이너가 1:1 대응 컴포넌트를 쓰지 않음). 따라서 타입을 결정론적으로 알아낼 신호가 없다.

---

## 2. 결정 사항 (확정)

| 항목 | 결정 |
|---|---|
| 변환 엔진 | **규칙 기반(결정론적) 우선**. AI는 기본 경로에서 배제 |
| 입력 소스 | **Figma 노드 트리 직접** (플러그인 API) |
| 타입 식별 | **A: 사람이 플러그인에서 직접 지정** (MVP). 엔진은 B(자동식별) 확장 가능하게 설계 |
| 컴포넌트 범위 | **핵심 6개 스니펫** (아래) |
| 작업 모드 | **모드1(단일 영역 변환)만 MVP**. 모드2(페이지 조립)는 다음 단계 |

### 접근법 선택 근거 (A 우선 + B 확장)
- **A (사람이 타입 지정)**: 사람은 기계가 못 맞히는 "타입 한 비트"만 주고, 지루하고 정확해야 하는 나머지(슬롯 추출·XML 생성)는 전부 기계가 한다. → AI 비용 0, 정확도 100%, 재현 가능, Figma 사전작업 불필요.
- **B (Figma UI Kit로 자동 식별)**: 장기 목표. 엔진의 "타입 주입" 자리에 `componentName 매칭`만 갈아끼우면 됨. 엔진은 그대로 재사용.
- **C (구조 휴리스틱 / AI 추론)**: v1이 실패한 길. 기본 경로에서 **배제**.

---

## 3. 아키텍처

Figma 플러그인의 2-스레드 구조를 따른다.

```
┌─────────────────────────────────────────────────────────┐
│ Figma Plugin                                              │
│  ┌──────────────────┐  postMessage   ┌──────────────────┐│
│  │  UI 스레드 (iframe) │ ◄───────────► │  Main 스레드(code) ││
│  │  - 스니펫 타입 선택  │                │  - figma API 접근  ││
│  │  - 결과 XML 표시    │                │  - 노드 트리 읽기   ││
│  │  - 복사/내보내기     │                │  - 변환 엔진 호출   ││
│  └──────────────────┘                └────────┬─────────┘│
└───────────────────────────────────────────────┼──────────┘
                                                 │ (순수 TS, figma 무관)
                                    ┌────────────▼──────────────┐
                                    │  변환 엔진 (core/)          │
                                    │  extract: 노드→슬롯값(결정론) │
                                    │  template: 슬롯→XML주입(결정론)│
                                    │  registry: 타입별 변환기(확장점)│
                                    │  templates/ (실제 스니펫 XML) │
                                    └────────────────────────────┘
```

### 핵심 설계 원칙
1. **변환 엔진은 figma API와 완전히 분리된 순수 함수.** 입력은 평범한 JS 객체(축약 노드 JSON), 출력은 XML 문자열. → figma 없이 Node에서 단위 테스트 가능 = v1의 "끝없는 케이스 스터디"를 테스트로 잠금.
2. **타입별 변환기(converter) 레지스트리.** "타입 식별"과 "변환 실행"이 분리됨. MVP(A)는 사람이 타입 주입, B는 `componentName`으로 주입 — 엔진은 동일.
3. **스니펫 템플릿은 repo 안에 동봉**(`templates/`). Studio 폴더에서 실제 XML을 복사, 동기화 스크립트로 갱신. → 자기완결적·버전관리 가능.

### 기술 스택
- TypeScript + esbuild (번들)
- UI: 가벼운 vanilla HTML/CSS/JS (무거운 프레임워크 없음)
- 테스트: Vitest (또는 Node 내장 test)

---

## 4. 모듈 구성

```
html-to-xml-v2/
├─ manifest.json              # Figma 플러그인 매니페스트
├─ src/
│  ├─ main.ts                 # Main 스레드: 선택 노드 읽기 → 엔진 호출 → UI로 결과
│  ├─ ui.html / ui.ts         # UI 패널: 타입 선택, XML 표시, 복사/내보내기
│  └─ core/                   # ★ 순수 변환 엔진 (figma 무관)
│     ├─ types.ts             # FigmaNode(축약 JSON), SlotValues, ConvertResult 타입
│     ├─ registry.ts          # snippetType → converter 매핑
│     ├─ template.ts          # 템플릿 로드 + 슬롯 주입 + XML 직렬화
│     ├─ extract.ts           # 노드에서 텍스트/구조 추출 공통 헬퍼
│     └─ converters/          # 타입별 변환기 (1파일 = 1스니펫)
│        ├─ pageContainer.ts  #   화면시작 (페이지 래퍼 = 조립 루트)
│        ├─ title.ts          #   타이틀
│        ├─ inputTable.ts     #   입출력테이블 (단 수 자동 산출)
│        ├─ grid.ts           #   그리드 (헤더 컬럼 + 본문 템플릿)
│        ├─ singleInput.ts    #   단일입력폼 (input/select/textbox/textarea)
│        └─ button.ts         #   기본버튼 / 전체제어버튼
├─ templates/                 # 실제 스니펫 XML (Studio에서 복사)
├─ scripts/sync-templates.ts  # Studio 폴더 → templates/ 동기화
└─ test/                      # 엔진 단위 테스트 + 픽스처(노드JSON→기대XML)
```

### 변환기 공통 인터페이스 (확장점 B의 핵심)

```ts
interface Converter {
  type: SnippetType;                      // '입출력테이블' 등
  extract(node: FigmaNode): SlotValues;   // 노드에서 슬롯 값을 결정론적으로 추출
  render(slots: SlotValues): string;      // 슬롯 값을 템플릿에 주입해 XML 조각 생성
}
```

main.ts 흐름: `(선택노드, 사용자가_고른_타입)` → `registry[type].extract()` → `.render()` → XML.
B 확장 시: "사용자가_고른_타입" 자리에 `node.componentName 매칭 결과`만 들어가면 끝.

---

## 5. MVP 범위 — 6개 스니펫

전형적인 WebSquare 업무화면("타이틀 + 조회 폼 + 결과 그리드 + 버튼")을 한 장 끝까지 변환할 수 있는 수직 슬라이스.

| 스니펫 | 변환기 | 비고 |
|---|---|---|
| 00 화면시작 | `pageContainer` | 페이지 래퍼/조립 루트 |
| 02 타이틀 | `title` | 상단 제목 |
| 05 입출력테이블 | `inputTable` | 단(段) 수 자동 산출 |
| 06 그리드 | `grid` | 기본형(헤더 컬럼 + 본문 템플릿) |
| 11 단일입력폼 | `singleInput` | input/select/textbox/textarea |
| 08·09 버튼 | `button` | 개별 / 하단 액션바 |

### 각 변환기의 슬롯 정의

**`inputTable` (05 입출력테이블)** — 루트 `<xf:group class="tblbox">` > `<xf:group class="w2tb tbl" tagname="table">`
- `colgroup`: 라벨열(`width:100px`) + 데이터열(가변) 쌍 반복. **단 수 = 라벨/데이터 쌍 개수**(Figma 구조에서 산출).
- 셀: `th`(`w2tb_th`, 라벨 텍스트) / `td`(`w2tb_td`, 값·입력).
- 슬롯: 단 수, 행별 라벨 텍스트 목록.

**`grid` (06 그리드 기본형)** — `<xf:group class="gvwbox">` > `<w2:gridView>`
- 슬롯: `caption`(상단 제목, 선택), `columns: [{label, width}]`(헤더 행 텍스트 셀 → 라벨, 셀 너비 → width), 컬럼 개수 N, gridView 높이(프레임 높이).
- `<w2:header>`에 N개 column(`value`=라벨, `width`), `<w2:gBody>`에 **같은 개수의 column 템플릿**(값 없음, `dataList="data:dataList1"` 바인딩 플레이스홀더).
- MVP에서 `inputType="text" displayMode="label"` 고정. 특수변형(순번/체크/상태/드릴다운/페이지리스트)·셀별 inputType 자동판별은 2단계.

**`singleInput` (11 단일입력폼)** — 컨트롤별 태그가 다름
- 텍스트 표시 `<w2:textbox>`, 인풋 `<xf:input>`, 셀렉트 `<xf:select1 appearance="minimal">`, 텍스트에어리어 `<xf:textarea>`.
- MVP: input / select / textbox / textarea. 라디오·체크·캘린더·업로드 등은 2단계.
- 슬롯: 컨트롤 종류(사람이 세부 지정하거나 기본 input), 폭(`(100)` 여부), 초기 텍스트.

**`button` (08·09)** — `btn_cm` + 기능 클래스 / 하단 액션바 `btnbox`(lt/ct/rt)
- 슬롯: 버튼 라벨, 위치(좌/중/우, 09의 경우).

**`title` (02)** — `pgtbox`/`titbox`, `tit_main/sub`
- 슬롯: 제목 텍스트(main/sub).

**`pageContainer` (00 화면시작)** — `sub_contents`/`pop_contents`
- 슬롯: 페이지 종류(서브/팝업). 모드1 MVP에서는 단독 래퍼 생성. (자식 조립은 모드2.)

---

## 6. 데이터 흐름 (모드1 — 단일 영역 변환, MVP)

```
[UI] 타입 선택 + "현재 선택 변환" 클릭
   │ postMessage({type:'convert', snippetType:'입출력테이블'})
   ▼
[Main] figma.currentPage.selection[0] 읽기
   │ → 노드를 축약 JSON(FigmaNode)으로 직렬화
   │   (필요한 필드만: type, name, characters, children,
   │    width/height, layoutMode 등)
   ▼
[core] registry[type].extract(node) → SlotValues   (결정론적)
   ▼
[core] .render(slots) → 템플릿 슬롯 주입 → XML 문자열  (결정론적)
   ▼
[Main] postMessage({type:'result', xml, warnings})
   ▼
[UI] XML 미리보기 + 경고 표시 + 복사 버튼
```

### UI (모드1)
```
선택된 프레임: "검색폼"        [스니펫 타입 ▾]  [변환]
┌─ 생성된 XML ──────────────────────────────┐
│ <xf:group class="tblbox"> ...             │
└────────────────────────────────────────────┘
[복사]                          ⚠ 경고: (있으면 표시)
```

### "축약 JSON(FigmaNode)" 경계 — 중요
엔진은 figma의 실제 노드 객체가 아니라 main.ts가 뽑아낸 **평범한 JSON**만 받는다. 덕분에:
- 엔진을 figma 없이 테스트(픽스처 = 이 JSON)
- figma API 변경에 엔진이 흔들리지 않음
- 나중에 "Figma가 생성한 HTML 입력"도 같은 JSON으로 정규화하면 엔진 재사용 가능

### 모드2 (다음 단계, MVP 제외)
영역들을 누적 → 순서 조정 → `00 화면시작` 래퍼 안에 순서대로 조립된 완성 페이지 XML 출력 + `.xml` 내보내기.

---

## 7. 에러 처리 — "조용히 틀린 XML"을 만들지 않는다

v1의 가장 큰 문제는 *그럴듯하지만 틀린* 결과였다. v2는 불확실하면 숨기지 않고 경고한다.

| 상황 | 처리 |
|---|---|
| 선택 없음 / 여러 개 선택 | "프레임 하나를 선택하세요" 안내, 변환 중단 |
| 슬롯 추출 실패 (예: 테이블인데 라벨 0개) | XML은 생성하되 **경고 배지**: "라벨을 찾지 못함 — 확인 필요". 빈 슬롯은 빈 채로 표시 |
| 추출 모호 (예: 입력칸 개수 ≠ 라벨 개수) | 경고 + 어느 부분이 비었는지 명시 |
| 생성 XML이 well-formed 아님 | 직렬화 단계에서 차단, 내부 오류 표시 |

**원칙: 생성 XML과 함께 "무엇을 채웠고 무엇을 비웠는지"를 항상 보여준다.** 사람이 신뢰하고 손볼 수 있게.

---

## 8. 테스트 전략 (TDD) — 케이스를 자산으로

엔진이 순수 함수라 figma 없이 전부 테스트 가능하다.

```
test/
├─ fixtures/
│  ├─ inputTable_2dan.node.json      ← 입력: 축약 Figma 노드 JSON
│  ├─ inputTable_2dan.expected.xml   ← 기대 출력
│  ├─ grid_5col.node.json
│  ├─ grid_5col.expected.xml
│  └─ ...
└─ converters/*.test.ts              ← extract→render 결과 == expected
```

1. **골든 파일 테스트**: 변환기별 `node.json → expected.xml` 쌍. 회귀 즉시 포착.
2. **픽스처 수집 도구**: 플러그인에 "현재 선택을 노드 JSON으로 덤프" 기능 → 실제 Figma 디자인을 픽스처로 박제. 새 케이스 = 픽스처+기대XML 추가 → **케이스가 테스트로 영구 박제**.
3. **템플릿 동기화 검증**: `templates/`가 Studio 원본과 일치하는지 확인하는 테스트.

→ "케이스 스터디"가 일회성 수작업에서 **누적되는 테스트 자산**으로 바뀐다. v1과의 결정적 차이.

---

## 9. 빌드 & 실행

| 명령 | 동작 |
|---|---|
| `npm run build` | esbuild로 main/ui 번들 → Figma에서 manifest.json import해 로드 |
| `npm test` | Vitest로 엔진 테스트 (figma 불필요, CI 가능) |
| `npm run sync-templates` | Studio 폴더에서 최신 스니펫 XML 복사 |

**참조 경로:**
- 실제 스니펫 XML: `C:\WebSquare_Studio\ai_x64\websquare_26.0417\workspace\IDS_2026\WebContent\cm\template\snippets`
- 스니펫 매뉴얼(md): `C:\Users\user\Documents\Obsidian Vault\99_Snippet\WebSquare_cm`

---

## 10. 범위 밖 (다음 단계)

- 모드2 (페이지 조립 + `.xml` 내보내기)
- 옵션 B (Figma UI Kit 기반 자동 타입 식별)
- 추가 스니펫: 03 조회영역, 04 탭, 07 트리, 10 아코디언, 12 다중입력폼, 13 메시지, 99 기타
- 그리드 특수변형(순번/체크/상태/드릴다운/페이지리스트), 셀별 inputType 자동판별
- 단일입력폼 확장: 라디오, 체크박스, 캘린더, 오토컴플릿, 체크콤보, 업로드
- AI 보조 (정말 모호한 케이스의 타입 분류 한정 — 자유 생성 아님)

---

## 11. 성공 기준

1. "타이틀 + 입출력테이블 + 그리드 + 버튼"으로 된 실제 폼 화면 1장의 각 영역을, 사람이 타입만 지정하면 정확한 WebSquare XML로 변환한다.
2. 같은 입력 → 항상 같은 출력 (결정론적, AI 호출 0).
3. 모든 변환기가 골든 파일 테스트로 커버되고, `npm test`가 figma 없이 통과한다.
4. 불확실한 추출은 조용히 틀린 XML 대신 경고로 드러난다.
