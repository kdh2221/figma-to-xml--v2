import type { FigmaNode } from "../../types.js";
import { raw, type XmlEl } from "../../xml.js";
import { buildGrid, gridConverter } from "../../converters/grid.js";

/** 그리드: 노드에서 컬럼 라벨을 뽑아 기존 빌더 재사용. */
export function buildGridForNode(node: FigmaNode): XmlEl {
  return buildGrid(gridConverter.extract(node).slots);
}

// 아래 템플릿은 all_components.xml 의 해당 스니핏 블록을 옮긴 카탈로그 리터럴.
export function buildTree(): XmlEl {
  return raw(`<xf:group class="tvwbox " id="" meta_snippetCategory="07_트리" meta_snippetKeyComponent="true" meta_snippetName="7_01 트리" style=""><w2:treeview class="tvw" dataType="listed" id="" style="height:300px;" tooltipGroupClass="false"><w2:node><w2:label><![CDATA[New]]></w2:label><w2:value></w2:value><w2:folder></w2:folder><w2:checkbox></w2:checkbox><w2:checkboxDisabled></w2:checkboxDisabled><w2:image></w2:image><w2:iconImage></w2:iconImage><w2:selectedImage></w2:selectedImage><w2:expandedImage></w2:expandedImage><w2:leafImage></w2:leafImage><w2:node><w2:label><![CDATA[New]]></w2:label><w2:value></w2:value><w2:folder></w2:folder></w2:node></w2:node><w2:node><w2:label><![CDATA[New]]></w2:label><w2:value></w2:value><w2:folder></w2:folder></w2:node></w2:treeview></xf:group>`);
}

export function buildAccordion(): XmlEl {
  return raw(`<xf:group class="acdbox" id="" meta_snippetCategory="10_아코디언" meta_snippetKeyComponent="true" meta_snippetName="10_01 아코디언"><w2:accordion class="acd" id="" style=""><w2:panels class="" id="panels1" style=""><w2:panelTitle class="" id="panelTitle1" label="타이틀" style=""></w2:panelTitle><w2:panelContent class="" id="panelContent1" style=""><w2:textbox id="" label="내용" style="" tagname="span"></w2:textbox></w2:panelContent></w2:panels><w2:panels class="" id="panels2" style=""><w2:panelTitle id="panelTitle2" label="타이틀" style=""></w2:panelTitle><w2:panelContent id="panelContent2" style=""><w2:textbox id="" label="내용" style="" tagname="span"></w2:textbox></w2:panelContent></w2:panels></w2:accordion></xf:group>`);
}

export function buildMessageList(): XmlEl {
  return raw(`<xf:group class="list_msg" id="" meta_snippetCategory="13_메시지" meta_snippetKeyComponent="true" meta_snippetName="13_08 리스트" style="" tagname="ul"><xf:group id="" style="" tagname="li"><w2:textbox id="" label="텍스트" style="" tagname="p"></w2:textbox></xf:group><xf:group id="" style="" tagname="li"><w2:textbox id="" label="텍스트" style="" tagname="p"></w2:textbox></xf:group></xf:group>`);
}

export function buildSchedule(): XmlEl {
  return raw(`<xf:group class="schedulebox" id="" meta_snippetCategory="99_기타" meta_snippetKeyComponent="true" meta_snippetName="99_01 스케줄캘린더" style=""><w2:scheduleCalendar dataList="" defaultDate="" editable="true" endColumn="end" eventLimit="true" eventOrderColumn="" headerLeftBtn="true" headerRightBtn="true" headerTitle="true" id="scheduleCalendar1" idColumn="id" includeScheduleEnd="false" ioFormat="yyyyMMdd" lang="ko" locale="ko" nextDayThreshold="" selectable="true" startColumn="start" style="width: 100%;height: 600px" themeColumn="" timeFormat="" titleColumn="title" tooltipDisplay="" version="3.6"></w2:scheduleCalendar></xf:group>`);
}

export function buildChartBar(): XmlEl {
  return raw(`<xf:group class="graphbox" id="" meta_snippetCategory="99_기타" meta_snippetKeyComponent="true" meta_snippetName="99_02 차트(막대형)" style=""><w2:fusionchart chartType="Column2D" drawType="javascript" id="" runflashAt="IE6,IE7,IE8" seriesType="simple" style="width: 100%;height: 300px;"></w2:fusionchart></xf:group>`);
}

export function buildChartPie(): XmlEl {
  return raw(`<xf:group class="graphbox" id="" meta_snippetCategory="99_기타" meta_snippetKeyComponent="true" meta_snippetName="99_03 차트(원형)" style=""><w2:fusionchart chartType="Pie2D" drawType="javascript" id="" runflashAt="IE6,IE7,IE8" seriesType="simple" style="width: 100%;height: 300px;"></w2:fusionchart></xf:group>`);
}
