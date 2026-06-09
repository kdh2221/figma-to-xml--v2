import { copyFileSync, mkdirSync } from "node:fs";

const SRC = "C:/WebSquare_Studio/ai_x64/websquare_26.0417/workspace/IDS_2026/WebContent/cm/template/snippets";
const MAP = [
  ["00_화면시작/0_01 페이지시작.xml", "pageContainer.xml"],
  ["02_타이틀/2_02 타이틀그룹(제목).xml", "title.xml"],
  ["05_입출력테이블/5_02 테이블(2단).xml", "inputTable.xml"],
  ["06_그리드/6_01 그리드.xml", "grid.xml"],
  ["11_단일입력폼/11_05 인풋.xml", "singleInput.xml"],
  ["08_기본버튼/8_02 기본버튼.xml", "button.xml"],
];

mkdirSync("templates", { recursive: true });
for (const [src, dest] of MAP) {
  copyFileSync(`${SRC}/${src}`, `templates/${dest}`);
  console.log(`synced ${dest}`);
}
