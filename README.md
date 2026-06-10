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
1. Figma에서 레이어 하나 선택 → 상단에 `선택: <레이어명> · 텍스트(n): ...` 표시(레이어 반영 확인)
2. 플러그인 패널에서 스니펫 타입 선택 (입출력테이블은 단 수, 단일입력폼은 종류 추가 선택)
3. [변환] → 들여쓰기된 XML 미리보기 → [복사] 또는 [XML 파일로 저장](`websquare-<타입>.xml` 다운로드)
4. ⚠ 경고가 뜨면 추출이 불완전한 것 — XML을 확인 후 보정

## 출력 모드
- **풀페이지(절대좌표)** — 선택 프레임 **전체**를 위치·크기·계층 보존한 **로드 가능한 WebSquare 풀 페이지**로 변환(`position:absolute`). Figma x/y/w/h를 1:1 매핑. 1차 범위는 문서외피+지오메트리(데이터바인딩·의미매핑은 다음 단계).
- **단일 스니펫(조각)** — 화면시작 · 타이틀 · 입출력테이블 · 그리드 · 단일입력폼 · 버튼. 사람이 타입 지정 → 스니펫 골격에 텍스트 채움.

### 추후 보충 예정 (현재 미지원)
드롭다운에 없는 유형은 아직 변환할 수 없다. 다음 스니펫을 점진 추가 예정:
조회영역 · 탭 · 트리 · 아코디언 · 다중입력폼 · 메시지 · 전체제어버튼 · 그리드 특수변형(순번/체크/상태/드릴다운/페이지리스트) ·
단일입력폼 확장(라디오/체크박스/캘린더/오토컴플릿/체크콤보/업로드).
새 유형 추가 = `src/core/converters/`에 변환기 1개 + `registry.ts` 등록 + 골든 테스트.
자세한 목록은 스펙 §10 "범위 밖" 참고.

## 설계/계획
- 스펙: `docs/superpowers/specs/2026-06-09-figma-to-websquare-xml-v2-design.md`
- 계획: `docs/superpowers/plans/2026-06-09-figma-to-websquare-xml-v2.md`
