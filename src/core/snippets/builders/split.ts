import { el, type XmlEl } from "../../xml.js";

/** 화면분할: 컬럼 비율 배열(합이 10 권장)마다 컨테이너 자식 1개.
 *  [5,5]=2단, [3,3,3]=3단(균등은 class 비움), [2,8]=비대칭. */
export function buildSplit(ratios: number[]): XmlEl {
  const even = ratios.every((r) => r === ratios[0]);
  const children = ratios.map((r) =>
    el("xf:group", {
      class: even ? "" : ` col_${r}`,
      id: "",
      meta_componentContainer: "true",
      style: "",
    })
  );
  return el("xf:group", { class: "lybox", id: "", style: "" }, children);
}
