# WebSquare XML 구조 분석 & 현재 출력의 부족한 점

- **날짜**: 2026-06-10
- **참조**: `C:\WebSquare_Studio\...\WebContent\pub\kb` (실제 변환된 풀 페이지 42개)
- **목적**: 실제 WebSquare 페이지 XML 구조를 분석하고, 현재 MVP 출력과의 격차를 정리한다.

---

## 0. 참조 폴더(pub/kb)가 알려주는 것

각 화면이 **두 가지 버전**으로 존재한다:

| 파일 | 레이아웃 방식 | 설명 |
|---|---|---|
| `XXX.xml` | **절대좌표** `position:absolute; left/top/width/height` | 레거시 `.scn` → Craft 자동변환. 원본 픽셀 위치 보존 |
| `XXX_rel_v1.xml` | **시맨틱 테이블** `tagname="table/tr/td"` + `w2tb` 클래스 | 스니펫으로 재조립한 "정리본". 우리 스니펫 템플릿과 동일 스타일 |

→ 두 방식 모두 **유효한 WebSquare 출력**이다. 우리 플러그인은 둘 중 하나(또는 둘 다)를 목표로 잡을 수 있다.

**핵심 발견**: `_rel_v1`은 각 영역에 스니펫 식별 메타를 박는다.
```xml
<xf:group class="sub_contents" meta_componentContainer="true"
          meta_snippetCategory="00_화면시작" meta_snippetName="0_01 페이지시작">
  <xf:group class="tblbox" meta_snippetCategory="05_입출력테이블" meta_snippetName="5_01 테이블(1단)">
  <xf:group class="gvwbox"> <w2:gridView .../> </xf:group>
```
즉 실제 도구는 "페이지 = 식별된 스니펫들의 조립"으로 만든다. 우리 Approach A(사람이 타입 지정)와 정확히 같은 모델 — 다만 우리는 메타/조립/데이터바인딩이 빠져 있다.

---

## 1. 실제 페이지의 전체 구조 (KJI04811000 기준)

```
<?xml version="1.0" encoding="UTF-8"?>
<html xmlns=... xmlns:w2=... xmlns:xf=... xmlns:ev=...>     ← 4개 네임스페이스
  <head meta_screenId="..." meta_screenName="..." meta_convertType="Craft" ...>
    <w2:type>COMPONENT</w2:type> <w2:buildDate/> <w2:MSA/>
    <xf:model>
      <xf:instance><data/></xf:instance>
      <xf:submission id="KJI0481140" .../>               ← 서버 트랜잭션
      <w2:dataCollection>
        <w2:dataMap id="dma_..._INPUT"><w2:keyInfo>...    ← 입력 데이터 모델
        <w2:dataList id="dlt_..._OUTPUT"><w2:columnInfo>... ← 그리드 컬럼 모델
      </w2:dataCollection>
    </xf:model>
    <script><![CDATA[ function OnSendKey(){...} ... ]]></script>  ← 이벤트 핸들러
  </head>
  <body ev:onpageload="scwin.onpageload">
    <xf:group screentitle="..." screenno="..." screentype="AType" class="content_body">
      ... 실제 컴포넌트들 ...
    </xf:group>
  </body>
</html>
```

컴포넌트 예 (실제):
```xml
<xf:input ctype="Edit" style="position:absolute; left:102px; top:12px; width:112px; height:24px;"
  id="brnHanglName" indicator="부점한글명" tabIndex="2" maxlength="20" minlength="2"
  ev:onchange="scwin.brnHanglName_OnValidate"
  ref="data:dma_KJI04811000.brnHanglName"                ← 데이터 바인딩
  orgid="brnHanglName" hierarchy="brnHanglName"/>
```

---

## 2. 현재 MVP 출력 vs 실제 — 부족한 점

현재 우리 출력(예: inputTable):
```xml
<xf:group class="tblbox" id="" style="">
  <xf:group class="w2tb tbl" tagname="table">
    <xf:group tagname="tr">
      <xf:group class="w2tb_th" tagname="th"><w2:textbox label="이름"/></xf:group>
      <xf:group class="w2tb_td" tagname="td"/>
```

| # | 부족한 점 | 현재 | 실제 | 영향 |
|---|---|---|---|---|
| **G1** | **문서 외피** | 본문 조각만 | `<html>/<head>(meta·model·script)/<body>/루트 group` | 그대로는 페이지로 로드 불가 |
| **G2** | **데이터 모델·바인딩** | 없음. `id=""`, `dataList="data:dataList1"` 플레이스홀더 | `<xf:model>`+`dataMap`/`dataList`+`<xf:submission>`, 모든 입력 `ref="data:dma_XXX.field"` | **가장 큰 격차** — WebSquare의 핵심. 데이터 없으면 빈 껍데기 |
| **G3** | **의미있는 id/class/style** | 전부 빈 문자열 | `id="brnHanglName"`, `class="kb_MiddleRight"`, `style="width:112px;"` | id 비면 바인딩·스크립트 연결 불가 |
| **G4** | **지오메트리(위치/크기)** | x/y 버림, 폭 대부분 무시 | `position:absolute; left/top/width/height` 또는 `style="width:..."`·컬럼 width | Figma가 가진 정보를 버리는 중 → 레이아웃 재현 안 됨 |
| **G5** | **컴포넌트 속성** | label만 | `ctype`, `tabIndex`, `hierarchy`, `orgid`, `indicator`, `maxlength/minlength`, `ev:onchange`, `escape` | 검증·이벤트·접근성·탭순서 전무 |
| **G6** | **컴포넌트 어휘** | 6종(입력/셀렉트/텍스트/버튼/테이블/그리드 기본형) | `xf:select`+`choices/item`, `xf:trigger`, `GroupBox`, `w2:attributes`(colspan/rowspan/scope/summary), 다중 그리드, 라디오/체크/캘린더… | 실제 화면의 상당 부분 변환 불가 |
| **G7** | **스니펫 메타·페이지 조립** | 단일 조각, 메타 없음 | `meta_snippetCategory/Name`, 여러 스니펫을 `sub_contents` 루트에 순서 조립 | 화면 1장 = 여러 영역인데 모드2 미구현 |
| **G8** | **텍스트 정규화** | 원문 그대로 | `&amp;nbsp;`, `escape="false"`, 색상/정렬 클래스 | 표시 충실도 차이 |
| **G9** | **JSON 덤프 ≠ XML** | 노드 트리 JSON(개발용) | — | 덤프는 산출물이 아니라 픽스처 도구. 사용자 혼동 |

---

## 3. 전략적 시사점 (다음 방향)

### 두 목표 포맷 중 선택
- **절대좌표(`XXX.xml`) 방식이 Figma에서 가장 충실·저위험**이다. Figma는 모든 레이어의 x/y/w/h를 정확히 준다 → `position:absolute; left/top/width/height`로 거의 1:1 매핑. 추론 위험 낮고 시각 레이아웃 그대로 재현. **고충실도 1차 목표로 추천.**
- **시맨틱 테이블(`_rel_v1`) 방식**은 깔끔하지만 "어떤 텍스트가 라벨/셀/행/열인지" 추론이 필요 → 어려움. 2차 정제 목표.

### 우선순위 (격차 → 작업)
- **P1 — 로드 가능한 페이지로**: G1 문서 외피 + G3 의미있는 id 자동생성. (최소 model 골격 포함)
- **P1 — 데이터 바인딩 기초**: G2. 입력마다 `id`/`ref` 생성하고 model의 dataMap에 대응 key 추가(일관된 id 규칙). 그리드는 dataList+columnInfo.
- **P2 — 지오메트리 반영**: G4. Figma x/y/w/h → `style`. 절대좌표 포맷이면 그대로, 시맨틱이면 width만.
- **P2 — 페이지 조립(모드2) + 스니펫 메타**: G7. 여러 영역을 `sub_contents`에 순서 조립 + `meta_snippet*`.
- **P3 — 어휘·속성 확장**: G5/G6/G8. select+choices, trigger, GroupBox, 검증/이벤트 속성 등 점진 추가.

### JSON 덤프 정리 (G9)
덤프는 **픽스처 수집 전용 개발 도구**로 명확히 분리하거나 일반 UI에서 숨긴다. 사용자에게 보이는 산출물은 항상 XML이어야 한다.

---

## 4. 한 줄 요약

현재 MVP는 "스니펫 골격에 라벨 몇 개를 채운 본문 조각"이다. 실제 WebSquare 페이지는 **(외피 + 데이터모델/바인딩 + 의미있는 id + 지오메트리/스타일 + 풍부한 속성/어휘 + 스니펫 메타 조립)** 의 6겹 구조다. 가장 시급한 격차는 **G1(문서 외피)·G2(데이터 바인딩)·G4(지오메트리)** 이며, Figma 지오메트리를 살리는 **절대좌표 풀페이지 출력**이 가장 충실도 높은 1차 목표다.
