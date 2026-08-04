import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const WIDTH = 1054;
const HEIGHT = 1492;
const outputDirectory = fileURLToPath(new URL("../public/gallery/covers/", import.meta.url));

const xml = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const lines = (x, y, values, {
  fill = "#171513",
  size = 48,
  weight = 500,
  family = "IBM Plex Sans, Arial, sans-serif",
  anchor = "start",
  lineHeight = size * 1.12,
  letterSpacing = "0",
  italic = false,
} = {}) => `<text x="${x}" y="${y}" fill="${fill}" font-family="${family}" font-size="${size}px" font-weight="${weight}" text-anchor="${anchor}" letter-spacing="${letterSpacing}"${italic ? ' font-style="italic"' : ""}>${values.map((value, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : lineHeight}px">${xml(value)}</tspan>`).join("")}</text>`;

const label = (x, y, value, fill = "#7B7063") => lines(x, y, [value], {
  fill,
  size: 16,
  weight: 600,
  letterSpacing: "3px",
});

const frame = (body, background) => `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}"><rect width="${WIDTH}" height="${HEIGHT}" fill="${background}"/>${body}</svg>`;

const formalPaper = () => frame(`
  <rect x="38" y="38" width="978" height="1416" fill="none" stroke="#CFC8BC" stroke-width="2"/>
  <line x1="86" y1="124" x2="968" y2="124" stroke="#D8D1C7"/>
  <line x1="86" y1="1367" x2="968" y2="1367" stroke="#D8D1C7"/>
  ${lines(527, 180, ["國立陽明交通大學", "資訊與科學工程研究所", "碩士論文"], { anchor: "middle", size: 24, weight: 500, lineHeight: 54 })}
  ${lines(527, 470, ["臺北市都市熱島效應與", "街道遮蔭之觀察研究"], { anchor: "middle", size: 47, weight: 600, lineHeight: 64 })}
  ${lines(527, 650, ["An Observational Study of Urban Heat", "and Street Shade in Taipei"], { anchor: "middle", size: 22, family: "Georgia, serif", lineHeight: 34, italic: true, fill: "#5B4E40" })}
  <circle cx="527" cy="830" r="5" fill="#C69A57"/>
  ${lines(527, 1005, ["研究生：張百寬 Pai-Kuan Chang", "指導教授：袁賢銘 Shyan-Ming Yuan"], { anchor: "middle", size: 24, lineHeight: 54 })}
  ${lines(527, 1238, ["中華民國一一五年七月", "July 2026"], { anchor: "middle", size: 20, family: "Georgia, serif", lineHeight: 42, fill: "#5B4E40" })}
  ${label(86, 118, "FORMAL RESEARCH PAPER")}
`, "#FBF9F4");

const riskReport = () => frame(`
  <rect x="0" y="0" width="190" height="1492" fill="#C69A57"/>
  <rect x="190" y="0" width="864" height="1492" fill="#1B1B19"/>
  <path d="M190 270H1054M190 425H1054M190 580H1054M190 735H1054M190 890H1054M190 1045H1054" stroke="#3A3731" stroke-width="2"/>
  <path d="M230 835C330 720 380 900 470 780S620 650 700 780 860 930 1030 690" fill="none" stroke="#E4C486" stroke-width="4"/>
  <path d="M230 884C330 769 380 949 470 829S620 699 700 829 860 979 1030 739" fill="none" stroke="#8A6D3D" stroke-width="2"/>
  <circle cx="700" cy="780" r="13" fill="#F7E9C9"/>
  <circle cx="1030" cy="690" r="13" fill="#C69A57"/>
  ${label(242, 142, "RISK / DECISION / 2025", "#E4C486")}
  ${lines(242, 420, ["2025 年新創企業", "營運風險評估報告"], { fill: "#F7F1E7", size: 66, weight: 600, lineHeight: 80 })}
  ${lines(242, 670, ["Enterprise Risk Assessment Report"], { fill: "#BBAF99", size: 21, family: "Georgia, serif", italic: true })}
  <rect x="242" y="1170" width="210" height="4" fill="#C69A57"/>
  ${lines(242, 1235, ["Prepared for strategic review", "CONFIDENTIAL / WORKING EDITION"], { fill: "#BBAF99", size: 17, weight: 500, lineHeight: 34, letterSpacing: "1px" })}
`, "#1B1B19");

const startupPlan = () => frame(`
  <rect x="68" y="66" width="918" height="1360" fill="none" stroke="#D9D0C2" stroke-width="2"/>
  <path d="M70 308H984M70 1035H984" stroke="#E0D7CA" stroke-width="2"/>
  <rect x="68" y="66" width="292" height="242" fill="#171513"/>
  ${label(108, 132, "STRATEGY / MARKET / 2025", "#E4C486")}
  ${lines(108, 196, ["OPENPRESS"], { fill: "#F7F1E7", size: 27, weight: 600, letterSpacing: "4px" })}
  ${lines(108, 520, ["OpenPress 內容工作區", "產品策略與市場進入", "計畫書"], { size: 46, weight: 600, lineHeight: 60 })}
  <g fill="#FBF8F1" stroke="#C69A57" stroke-width="2">
    <rect x="108" y="650" width="250" height="170"/>
    <rect x="402" y="650" width="250" height="170"/>
    <rect x="696" y="650" width="250" height="170"/>
  </g>
  <g fill="none" stroke="#C69A57" stroke-width="2">
    <path d="M358 735H402M652 735H696"/>
    <path d="M387 725l15 10-15 10M681 725l15 10-15 10"/>
  </g>
  ${label(132, 700, "01 / PROBLEM", "#8E6B38")}
  ${lines(132, 752, ["素材分散"], { size: 25, weight: 600 })}
  ${label(426, 700, "02 / PRODUCT", "#8E6B38")}
  ${lines(426, 752, ["工作區整合"], { size: 25, weight: 600 })}
  ${label(720, 700, "03 / MARKET", "#8E6B38")}
  ${lines(720, 752, ["正式交付"], { size: 25, weight: 600 })}
  <line x1="108" y1="1164" x2="946" y2="1164" stroke="#D9D0C2" stroke-width="2"/>
  <g fill="#C69A57">
    <circle cx="150" cy="1164" r="7"/><circle cx="456" cy="1164" r="7"/><circle cx="762" cy="1164" r="7"/>
  </g>
  ${label(108, 1215, "90 DAY LAUNCH PLAN", "#8E6B38")}
  ${lines(108, 1290, ["Product strategy and go-to-market plan"], { fill: "#5B4E40", size: 20, family: "Georgia, serif", italic: true })}
`, "#FBF8F1");

const courseNotes = () => frame(`
  <rect x="0" y="0" width="1054" height="1492" fill="#F2ECE2"/>
  <path d="M78 112H976M78 1170H976" stroke="#CFC3B4" stroke-width="1.5"/>
  <path d="M78 170H976M78 218H976M78 266H976M78 314H976M78 362H976M78 410H976" stroke="#DDD3C7" stroke-width="1"/>
  <g fill="none" stroke="#AA6036" stroke-width="2">
    <path d="M160 242C255 178 344 178 426 242S590 306 674 242S838 178 930 242"/>
    <path d="M160 294C255 230 344 230 426 294S590 358 674 294S838 230 930 294" opacity=".55"/>
  </g>
  <g fill="#F2ECE2" stroke="#AA6036" stroke-width="2">
    <circle cx="222" cy="430" r="34"/><circle cx="527" cy="430" r="34"/><circle cx="832" cy="430" r="34"/>
  </g>
  <g fill="none" stroke="#AA6036" stroke-width="1.5">
    <path d="M256 430H493M561 430H798"/>
  </g>
  ${lines(222, 437, ["01"], { anchor: "middle", fill: "#AA6036", size: 17, weight: 700 })}
  ${lines(527, 437, ["02"], { anchor: "middle", fill: "#AA6036", size: 17, weight: 700 })}
  ${lines(832, 437, ["03"], { anchor: "middle", fill: "#AA6036", size: 17, weight: 700 })}
  ${label(78, 84, "COURSE NOTES / DATA STRUCTURES", "#8E6B38")}
  ${lines(78, 780, ["資料結構", "課程講義"], { fill: "#171513", size: 72, weight: 500, lineHeight: 84, family: "Georgia, 'Noto Serif TC', serif" })}
  ${lines(78, 900, ["陣列　→　串列　→　樹與圖"], { fill: "#8E6B38", size: 22, weight: 600, letterSpacing: "1px" })}
  ${lines(78, 1245, ["PREPARED FOR", "Data Structures / Spring 2026"], { fill: "#8E6B38", size: 17, weight: 600, lineHeight: 38, letterSpacing: "2px" })}
`, "#F2ECE2");

const bookCover = () => frame(`
  <rect x="0" y="0" width="1054" height="1492" fill="#F5EEE3"/>
  <rect x="930" y="0" width="124" height="1492" fill="#C69A57"/>
  ${label(82, 126, "LONG-FORM / MANUSCRIPT", "#5B4E40")}
  ${lines(82, 370, ["把想法寫成一本書", "AI 時代的創作筆記"], { size: 58, weight: 600, lineHeight: 76 })}
  ${lines(82, 560, ["From chapters, voice, and revision", "to a complete manuscript"], { fill: "#5B4E40", size: 22, family: "Georgia, serif", italic: true, lineHeight: 34 })}
  <line x1="82" y1="640" x2="330" y2="640" stroke="#171513" stroke-width="3"/>
  <g fill="#263746" stroke="#263746" stroke-linejoin="round">
    <path d="M88 910Q302 820 520 930V1360Q300 1250 88 1340Z"/>
    <path d="M520 930Q740 820 966 910V1340Q748 1250 520 1360Z"/>
  </g>
  <g fill="#F5EEE3" stroke="#F5EEE3" stroke-width="2">
    <path d="M112 940Q305 875 500 968V1308Q304 1215 112 1288Z"/>
    <path d="M540 968Q735 875 942 940V1288Q746 1215 540 1308Z"/>
  </g>
  <path d="M520 930V1360" stroke="#C69A57" stroke-width="16"/>
  <g stroke="#CFC3B4" stroke-width="2" opacity=".9">
    <path d="M152 1010Q325 955 470 1018M152 1060Q325 1005 470 1068M152 1110Q325 1055 470 1118"/>
    <path d="M570 1018Q735 955 900 1010M570 1068Q735 1005 900 1060M570 1118Q735 1055 900 1110"/>
  </g>
  <path d="M862 210l-26 76 60-34z" fill="#263746"/>
`, "#F5EEE3");

const quotationSheet = () => frame(`
  <rect x="0" y="0" width="1054" height="1492" fill="#FBF8F1"/>
  <rect x="0" y="0" width="1054" height="224" fill="#171513"/>
  <rect x="0" y="0" width="18" height="1492" fill="#C69A57"/>
  ${label(84, 116, "QUOTATION / PROJECT DELIVERY", "#E4C486")}
  ${lines(84, 194, ["專案設計與開發報價單"], { fill: "#F7F1E7", size: 44, weight: 600 })}
  ${lines(84, 310, ["QUOTE NO. 2026-031", "VALID FOR 30 DAYS"], { fill: "#5B4E40", size: 17, weight: 600, letterSpacing: "2px", lineHeight: 32 })}
  ${lines(970, 310, ["OPENPRESS STUDIO"], { fill: "#5B4E40", size: 17, weight: 600, letterSpacing: "2px", anchor: "end" })}
  <line x1="84" y1="376" x2="970" y2="376" stroke="#CFC5B7" stroke-width="2"/>
  ${lines(84, 438, ["專案範圍", "設計系統與內容工作區建置"], { size: 21, weight: 600, lineHeight: 38 })}
  <line x1="84" y1="516" x2="970" y2="516" stroke="#D7CDBF"/>
  ${lines(84, 560, ["項目"], { size: 17, weight: 700, letterSpacing: "2px" })}
  ${lines(724, 560, ["數量"], { size: 17, weight: 700, letterSpacing: "2px", anchor: "end" })}
  ${lines(958, 560, ["費用"], { size: 17, weight: 700, letterSpacing: "2px", anchor: "end" })}
  <line x1="84" y1="592" x2="970" y2="592" stroke="#D7CDBF"/>
  ${lines(84, 646, ["Discovery / content audit"], { size: 19 })}
  ${lines(724, 646, ["01"], { size: 19, anchor: "end" })}
  ${lines(958, 646, ["NT$ 24,000"], { size: 19, anchor: "end" })}
  <line x1="84" y1="684" x2="970" y2="684" stroke="#E2D9CE"/>
  ${lines(84, 740, ["Editorial system / page templates"], { size: 19 })}
  ${lines(724, 740, ["01"], { size: 19, anchor: "end" })}
  ${lines(958, 740, ["NT$ 48,000"], { size: 19, anchor: "end" })}
  <line x1="84" y1="778" x2="970" y2="778" stroke="#E2D9CE"/>
  ${lines(84, 834, ["Delivery / print-ready export"], { size: 19 })}
  ${lines(724, 834, ["01"], { size: 19, anchor: "end" })}
  ${lines(958, 834, ["NT$ 12,000"], { size: 19, anchor: "end" })}
  <line x1="84" y1="884" x2="970" y2="884" stroke="#171513" stroke-width="3"/>
  ${lines(724, 952, ["TOTAL"], { size: 18, weight: 700, letterSpacing: "2px", anchor: "end" })}
  ${lines(958, 952, ["NT$ 84,000"], { size: 30, weight: 700, anchor: "end" })}
  <line x1="84" y1="1080" x2="970" y2="1080" stroke="#D7CDBF"/>
  ${lines(84, 1140, ["交付內容", "可檢視工作區、頁面範本與印製就緒檔案"], { size: 19, weight: 600, lineHeight: 34 })}
  ${lines(84, 1324, ["Prepared for review / scope, fee, and delivery in one document"], { fill: "#7B7063", size: 17, family: "Georgia, serif", italic: true })}
`, "#FBF8F1");

const contractCover = () => frame(`
  <rect x="0" y="0" width="236" height="1492" fill="#171513"/>
  <rect x="236" y="0" width="818" height="1492" fill="#F7F3EC"/>
  <rect x="236" y="0" width="818" height="22" fill="#C69A57"/>
  ${lines(108, 190, ["AGREEMENT", "2026"], { fill: "#E4C486", size: 19, weight: 700, lineHeight: 34, letterSpacing: "3px", anchor: "middle" })}
  <line x1="318" y1="148" x2="972" y2="148" stroke="#CFC5B7" stroke-width="2"/>
  ${label(318, 136, "AGREEMENT / PARTIES / 2026", "#7B7063")}
  ${lines(318, 280, ["甲乙方", "軟體服務合約"], { size: 58, weight: 600, lineHeight: 70 })}
  ${lines(318, 470, ["SOFTWARE SERVICES AGREEMENT"], { fill: "#5B4E40", size: 21, family: "Georgia, serif", italic: true, letterSpacing: "1px" })}
  <rect x="318" y="530" width="574" height="126" fill="#E4C486" opacity=".72"/>
  ${lines(350, 580, ["甲方 / OPENPRESS STUDIO", "乙方 / CLIENT"], { size: 19, weight: 600, lineHeight: 38 })}
  <line x1="318" y1="708" x2="972" y2="708" stroke="#CFC5B7" stroke-width="2"/>
  ${lines(318, 758, ["第一條　服務內容"], { size: 18, weight: 700 })}
  ${lines(318, 792, ["甲方委託乙方提供內容整理、頁面設計與出版輸出服務。"], { fill: "#5B4E40", size: 16 })}
  <line x1="318" y1="830" x2="972" y2="830" stroke="#D7CDBF"/>
  ${lines(318, 880, ["第二條　交付與驗收"], { size: 18, weight: 700 })}
  ${lines(318, 914, ["乙方交付可檢視之網頁、PNG 與 PDF；甲方於五個工作日內回覆。"], { fill: "#5B4E40", size: 16 })}
  <line x1="318" y1="952" x2="972" y2="952" stroke="#D7CDBF"/>
  ${lines(318, 1002, ["第三條　費用與付款"], { size: 18, weight: 700 })}
  ${lines(318, 1036, ["專案總價新臺幣 84,000 元，簽約支付 50%，驗收支付餘款。"], { fill: "#5B4E40", size: 16 })}
  <line x1="318" y1="1090" x2="972" y2="1090" stroke="#CFC5B7" stroke-width="2"/>
  ${lines(318, 1150, ["甲方簽署：________________", "乙方簽署：________________"], { size: 17, weight: 600, lineHeight: 42 })}
  ${lines(318, 1286, ["示範條款 / SAMPLE AGREEMENT / NOT LEGAL ADVICE"], { fill: "#8E6B38", size: 15, weight: 700, letterSpacing: "1px" })}
  ${lines(318, 1372, ["Formal terms / clear responsibilities / ready to sign"], { fill: "#7B7063", size: 17, family: "Georgia, serif", italic: true })}
`, "#F7F3EC");

const covers = {
  paper: formalPaper(),
  "risk-report": riskReport(),
  "startup-plan": startupPlan(),
  "subject-notes": courseNotes(),
  book: bookCover(),
  quote: quotationSheet(),
  contract: contractCover(),
};

await fs.mkdir(outputDirectory, { recursive: true });
const browser = await chromium.launch({ headless: true });

for (const [name, svg] of Object.entries(covers)) {
  const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
  await page.setContent(`<style>html,body{margin:0;padding:0;width:${WIDTH}px;height:${HEIGHT}px;overflow:hidden;background:#fff}svg{display:block}</style>${svg}`);
  await page.screenshot({ path: path.join(outputDirectory, `${name}.png`), fullPage: false });
  await page.close();
}

await browser.close();
console.log(`Generated ${Object.keys(covers).length} A4 gallery covers in ${outputDirectory}`);
