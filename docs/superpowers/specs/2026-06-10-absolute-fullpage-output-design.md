# 절대좌표 풀페이지 출력 — 설계 (1차: G1 문서외피 + G4 지오메트리)

- **날짜**: 2026-06-10
- **배경**: `2026-06-10-websquare-xml-gap-analysis.md` 의 격차 분석 결과, Figma가 주는 x/y/w/h를 살린 **절대좌표 풀페이지**가 최저위험·최고충실도 1차 목표로 결정됨.

## 목표
선택한 Figma 프레임 **전체 트리**를 위치·크기·계층이 보존된 **로드 가능한 WebSquare 풀 페이지**로 변환한다. 기존 6개 스니펫 변환기(단일 영역 조각)와 **별개의 새 모드**.

## 결정
- 출력 포맷: **절대좌표**(`position:absolute; left/top/width/height`).
- 1차 범위: **G1(문서 외피) + G4(지오메트리)**. 노드→요소 매핑은 의도적으로 **coarse**(TEXT/컨테이너/leaf).
- 범위 밖(다음): 데이터바인딩(G2), input/button 의미 매핑(G5/G6), 스니펫 메타·조립(G7), 색/폰트 스타일 충실도.

## 구조

### 1) 지오메트리 (G4)
Figma `x/y`는 **부모 기준 상대좌표**이며, 실제 WebSquare 중첩 절대좌표도 부모 기준이다(pub/kb 실파일로 확인). → 변환 없이 그대로 매핑.
- `FigmaNode`에 `x?: number; y?: number` 추가, `toFigmaNode`에서 `scene.x/scene.y` 캡처.
- `absoluteStyle(node)` → `"position:absolute; left:{x}px; top:{y}px; width:{w}px; height:{h}px;"` (정수 반올림).

### 2) 노드 → 요소 매핑 (coarse, 1차)
| Figma 노드 | WebSquare |
|---|---|
| TEXT | `<w2:textbox ctype="Text" id="{genId}" label="{글자}" style="{absStyle}"/>` |
| 자식 있는 컨테이너(FRAME/GROUP/COMPONENT/INSTANCE) | `<xf:group ctype="GroupBox" id="{genId}" style="{absStyle}">{자식 재귀}</xf:group>` |
| 기타 leaf | `<xf:group id="{genId}" style="{absStyle}"/>` |

- `genId`: 결정론적 카운터 `g1, g2, …` (유일성 보장). 의미있는 id(레이어명 기반)·data ref는 G2 단계에서.

### 3) 문서 외피 (G1)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<html xmlns=".../xhtml" xmlns:ev=".../xml-events" xmlns:w2=".../websquare" xmlns:xf=".../xforms">
  <head meta_screenName="{루트 프레임명}">
    <w2:type>COMPONENT</w2:type>
    <w2:buildDate/>
    <xf:model><xf:instance><data xmlns=""/></xf:instance></xf:model>
    <script type="text/javascript"><![CDATA[]]></script>
  </head>
  <body>
    <xf:group class="content_body" screentitle="{프레임명}" style="width:{W}px; height:{H}px;">
      {루트 자식들 재귀}
    </xf:group>
  </body>
</html>
```
- 빈 모델/빈 스크립트(데이터바인딩 G2는 다음 단계).
- 루트 그룹은 x/y 없이 width/height만.

## 구현 단위
1. `FigmaNode`/`SceneLike`/`toFigmaNode`에 `x,y` 추가 (TDD).
2. `src/core/converters/pageAbsolute.ts`: `absoluteStyle`, `renderNode`(→XmlEl), `buildPage`(→full doc string). 변환기 인터페이스로 등록(`extract`는 루트 노드를 slot에 담아 전달, `render`가 buildPage 호출).
3. `SnippetType`에 `"pageAbsolute"` 추가, registry 등록, UI 드롭다운에 "풀페이지(절대좌표)" 항목.
4. 골든 테스트(픽스처 노드트리→기대 XML) + `pub/kb`의 실제 `XXX.xml` 구조 토큰 대조.

## 검증 기준
- 텍스트+중첩 프레임을 가진 픽스처가 `position:absolute` 좌표·계층이 보존된 풀 페이지로 나온다.
- 출력이 `<?xml`/`<html`/`class="content_body"`/screentitle 을 포함하고 well-formed 단일 루트.
- 같은 입력 → 같은 출력(결정론적).
