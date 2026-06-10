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
