# 페이지 외피(page scaffold) template_test.xml 동일화 설계

날짜: 2026-06-11
대상: 컴포넌트/시맨틱 페이지 외피 `wrapDocument` (`src/core/assemble.ts`)

## 배경 / 문제

레퍼런스 풀페이지 템플릿 `template_test.xml`(`...\pub\template_test.xml`)은 WebSquare 컴포넌트 페이지의 외피를 보여준다. 현재 툴의 `assemblePage` → `wrapDocument`가 만드는 외피는 이에 비해 빈약하다:

- 현재 `<head meta_screenName="...">` + `w2:type`/`w2:buildDate` + **빈 모델**(`<xf:model><xf:instance><data xmlns=""/></xf:instance></xf:model>`) + 빈 script.
- 현재 `<body>` (속성 없음).

핵심 기능 결함: 그리드 빌더(`grid.ts`)가 `dataList="data:dataList1"`를 참조하고 바디 컬럼 id로 `col1…colN`을 쓰지만(바인딩 키), 툴이 생성하는 모델에는 `dataList1` 정의가 없다 → 생성된 페이지의 그리드가 데이터에 바인딩되지 않는다. 템플릿은 `xf:model > w2:dataCollection > w2:dataList(id=dataList1)`에 `col1…col15`을 정의해 이 바인딩을 충족한다.

목표: `wrapDocument`가 만드는 외피를 `template_test.xml`의 범용 외피와 동일하게 맞춘다(head/body 속성 + 그리드 바인딩용 모델 스캐폴드).

비목표:
- 절대좌표 출력 경로 `pageAbsolute.ts`의 외피는 이번 범위에서 다루지 않는다.
- 템플릿의 데모 전용 내용(`<style class=templatebox>`, 팝업 열기 `<script>` 본문, `<w2:require udc_tooltipMessage>`)은 페이지 고유 콘텐츠이므로 생성하지 않는다.

## 변경 상세

### 1. Head
`wrapDocument`가 생성하는 head를 다음으로 변경:
```
<head meta_vertical_guides="" meta_horizontal_guides="" meta_screenName="${screenName}">
  <w2:type>COMPONENT</w2:type>
  <w2:buildDate/>
  <w2:MSA/>
  <xf:model>…(아래 3)…</xf:model>
  <script type="text/javascript"><![CDATA[scwin.onpageload = function(){};]]></script>
</head>
```
- 신규: `meta_vertical_guides=""`, `meta_horizontal_guides=""`(head 속성), `<w2:MSA/>`.
- `meta_screenName`은 기존대로 `root.name`(이스케이프) 사용.
- script: 빈 본문 대신 onpageload 안전 스텁(아래 2와 연동).

### 2. Body
```
<body ev:onpageload="scwin.onpageload" class="">${bodyInner}</body>
```
- 신규: `ev:onpageload="scwin.onpageload"`, `class=""`.
- **결정 A (확정): onpageload 안전 스텁.** 빈 스크립트에 `ev:onpageload="scwin.onpageload"`만 두면 핸들러 미정의로 런타임 에러가 나므로, head의 `<script>`에 `scwin.onpageload = function(){};` 한 줄을 함께 생성한다. `scwin`은 WebSquare 페이지 스코프 전역 객체이므로 별도 선언 없이 안전.

### 3. Model (그리드 바인딩 스캐폴드)
페이지에 **그리드 영역이 1개 이상** 있으면:
```
<xf:model>
  <w2:dataCollection baseNode="map">
    <w2:dataList baseNode="list" repeatNode="map" id="dataList1" saveRemovedData="true">
      <w2:columnInfo>
        <w2:column id="col1" name="name1" dataType="text"/>
        … col2 … col15 …
      </w2:columnInfo>
      <w2:data use="true">
        <w2:row/>  (5개)
      </w2:data>
    </w2:dataList>
  </w2:dataCollection>
</xf:model>
```
- **결정 B (확정): 컬럼 수 15 고정.** `col1…col15`(name=`name{N}`, dataType=`text`). 템플릿과 동일. (그리드가 15컬럼을 초과하는 드문 경우의 미바인딩 컬럼은 허용 범위.)
- 빈 데이터행 5개(`<w2:row/>`).
- **그리드가 없으면** 현재의 빈 모델 `<xf:model><xf:instance><data xmlns=""/></xf:instance></xf:model>`을 유지(그리드 없는 페이지는 불필요한 dataList를 달지 않음). head/body 속성(1·2)은 그리드 유무와 무관하게 항상 적용.

### 4. 그리드 존재 판정
`assemblePage`에서 외피를 만들기 전에 `hasGrid`를 계산해 `wrapDocument`에 전달:
- 최상위 영역들에 대해 `getSnippet(idOf(i))?.category === "06_그리드"`가 하나라도 참이면 `hasGrid = true`.
- `idOf`는 이미 `assemblePage` 내에 정의돼 있음(레거시 정규화 포함).

## 구현 메모
- `wrapDocument(screenName, bodyInner)` → `wrapDocument(screenName, bodyInner, hasGrid)`로 시그니처 확장.
- 모델 문자열은 작은 헬퍼 `buildModelXml(hasGrid: boolean): string`로 분리(컬럼/행 반복 생성). 컬럼 수(15)·행 수(5)는 파일 상단 상수로.
- 문자열 조립 방식은 기존 `wrapDocument`의 문자열 연결 스타일을 유지(이미 문자열 기반). 속성값 이스케이프는 `escapeAttr` 재사용(screenName).
- `pageAbsolute.ts`는 변경하지 않음.

## 테스트 전략 (TDD)
`test/core/assemble.test.ts` 확장:
1. **그리드 포함 페이지**: `assemblePage`가 만든 문자열에 대해
   - `<head` 에 `meta_vertical_guides=""`, `meta_horizontal_guides=""`, `meta_screenName="..."` 존재
   - `<w2:MSA/>` 존재
   - `<body ev:onpageload="scwin.onpageload" class="">` 존재
   - `scwin.onpageload = function(){};` 스텁 존재
   - 모델에 `w2:dataCollection`, `id="dataList1"`, `col1`…`col15`(15개) 존재, `<xf:instance>`는 없음
2. **그리드 없는 페이지**: 동일 head/body 속성 + onpageload 스텁은 존재하되, 모델은 `<xf:instance><data xmlns=""/></xf:instance>` 유지(=`w2:dataCollection` 없음).
3. 기존 `assemble.test.ts` 케이스가 head/body 형식 변화로 깨지면 새 외피에 맞게 갱신(스냅샷/부분 문자열 단언).

## 수용 기준
1. 그리드 페이지의 모델이 `dataList1`(col1…col15)을 정의해 그리드 `col{N}` 참조가 바인딩된다.
2. 모든 컴포넌트 페이지의 head에 `meta_*_guides`/`w2:MSA`, body에 `ev:onpageload`/`class=""`, script에 onpageload 스텁이 존재한다.
3. 그리드 없는 페이지는 dataCollection을 만들지 않는다.
4. `pageAbsolute.ts` 출력은 불변.
5. 전체 테스트 통과.
