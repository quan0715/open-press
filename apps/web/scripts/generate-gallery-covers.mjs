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
  <path d="M70 310H985M70 720H985M70 1125H985M360 68V1425M720 68V1425" stroke="#E0D7CA" stroke-width="2"/>
  <circle cx="816" cy="270" r="176" fill="#E4C486"/>
  <circle cx="816" cy="270" r="110" fill="#C69A57" opacity=".82"/>
  <path d="M92 1160C270 1050 350 1000 460 920S660 750 920 590" fill="none" stroke="#C69A57" stroke-width="48"/>
  <path d="M865 580l72 12-42 60z" fill="#171513"/>
  <rect x="68" y="68" width="292" height="242" fill="#171513"/>
  ${label(108, 132, "STRATEGY / MARKET / 2025", "#E4C486")}
  ${lines(108, 196, ["OPENPRESS"], { fill: "#F7F1E7", size: 27, weight: 600, letterSpacing: "4px" })}
  ${lines(108, 540, ["OpenPress 內容工作區", "產品策略與市場進入", "計畫書"], { size: 48, weight: 600, lineHeight: 62 })}
  ${lines(108, 1290, ["Product strategy and go-to-market plan"], { fill: "#5B4E40", size: 20, family: "Georgia, serif", italic: true })}
`, "#FBF8F1");

const courseNotes = () => frame(`
  <rect x="0" y="0" width="1054" height="1492" fill="#AA6036"/>
  <path d="M78 112H976M78 1186H976" stroke="#EED9C4" stroke-width="2" opacity=".75"/>
  <g fill="#F7F1E7" stroke="#171513" stroke-width="12" stroke-linejoin="round">
    <path d="M527 120l68 82H459z"/>
    <path d="M350 300l84 110H276z"/>
    <path d="M704 300l84 110H630z"/>
  </g>
  <g stroke="#171513" stroke-width="14" stroke-linecap="round" fill="none">
    <path d="M527 205L392 342M527 205L662 342"/>
  </g>
  <g fill="#171513">
    <circle cx="527" cy="205" r="28"/><circle cx="392" cy="342" r="24"/><circle cx="662" cy="342" r="24"/>
    <circle cx="338" cy="408" r="16"/><circle cx="446" cy="408" r="16"/><circle cx="608" cy="408" r="16"/><circle cx="716" cy="408" r="16"/>
  </g>
  ${label(78, 84, "COURSE NOTES", "#F7E9C9")}
  ${lines(78, 820, ["資料結構", "課程講義"], { fill: "#F7F1E7", size: 74, weight: 500, lineHeight: 86, family: "Georgia, 'Noto Serif TC', serif" })}
  ${lines(78, 1245, ["PREPARED FOR", "Data Structures / Spring 2026"], { fill: "#F7E9C9", size: 17, weight: 600, lineHeight: 38, letterSpacing: "2px" })}
`, "#AA6036");

const bookCover = () => frame(`
  <path d="M0 1040C160 940 330 1005 470 930S760 760 1054 845V1492H0Z" fill="#263746"/>
  <path d="M0 1120C170 1020 310 1080 470 1010S800 840 1054 920" fill="none" stroke="#C69A57" stroke-width="36"/>
  <rect x="752" y="0" width="174" height="1492" fill="#C69A57"/>
  <circle cx="476" cy="620" r="158" fill="#E4C486" opacity=".78"/>
  <circle cx="476" cy="620" r="84" fill="#171513" opacity=".92"/>
  <path d="M820 240C752 410 888 475 812 626S766 847 934 1010" fill="none" stroke="#171513" stroke-width="5"/>
  <path d="M812 626C720 510 665 450 630 395M812 626C880 535 924 465 956 380M812 626C760 730 740 820 770 930" fill="none" stroke="#171513" stroke-width="4"/>
  ${label(82, 126, "LONG-FORM / MANUSCRIPT", "#5B4E40")}
  ${lines(82, 780, ["把想法寫成一本書", "AI 時代的創作筆記"], { size: 54, weight: 600, lineHeight: 72 })}
  ${lines(82, 968, ["From chapters, voice, and revision to a complete manuscript"], { fill: "#5B4E40", size: 20, family: "Georgia, serif", italic: true })}
  <rect x="82" y="1050" width="170" height="4" fill="#171513"/>
`, "#F5EEE3");

const quotationSheet = () => frame(`
  <rect x="62" y="62" width="930" height="1368" fill="none" stroke="#D7CDBF" stroke-width="2"/>
  <rect x="62" y="62" width="930" height="180" fill="#171513"/>
  <rect x="62" y="62" width="18" height="1368" fill="#C69A57"/>
  ${label(112, 126, "QUOTATION / PROJECT DELIVERY", "#E4C486")}
  ${lines(112, 202, ["專案設計與開發報價單"], { fill: "#F7F1E7", size: 44, weight: 600 })}
  ${lines(112, 324, ["QUOTE NO. 2026-031", "VALID FOR 30 DAYS"], { fill: "#5B4E40", size: 17, weight: 600, letterSpacing: "2px", lineHeight: 32 })}
  ${lines(780, 324, ["OPENPRESS STUDIO"], { fill: "#5B4E40", size: 17, weight: 600, letterSpacing: "2px", anchor: "end" })}
  <line x1="112" y1="390" x2="942" y2="390" stroke="#CFC5B7" stroke-width="2"/>
  ${lines(112, 452, ["專案範圍", "設計系統與內容工作區建置"], { size: 21, weight: 600, lineHeight: 38 })}
  <line x1="112" y1="530" x2="942" y2="530" stroke="#D7CDBF"/>
  ${lines(112, 575, ["項目"], { size: 17, weight: 700, letterSpacing: "2px" })}
  ${lines(692, 575, ["數量"], { size: 17, weight: 700, letterSpacing: "2px", anchor: "end" })}
  ${lines(930, 575, ["費用"], { size: 17, weight: 700, letterSpacing: "2px", anchor: "end" })}
  <line x1="112" y1="608" x2="942" y2="608" stroke="#D7CDBF"/>
  ${lines(112, 662, ["Discovery / content audit"], { size: 19 })}
  ${lines(692, 662, ["01"], { size: 19, anchor: "end" })}
  ${lines(930, 662, ["NT$ 24,000"], { size: 19, anchor: "end" })}
  <line x1="112" y1="700" x2="942" y2="700" stroke="#E2D9CE"/>
  ${lines(112, 756, ["Editorial system / page templates"], { size: 19 })}
  ${lines(692, 756, ["01"], { size: 19, anchor: "end" })}
  ${lines(930, 756, ["NT$ 48,000"], { size: 19, anchor: "end" })}
  <line x1="112" y1="794" x2="942" y2="794" stroke="#E2D9CE"/>
  ${lines(112, 850, ["Delivery / print-ready export"], { size: 19 })}
  ${lines(692, 850, ["01"], { size: 19, anchor: "end" })}
  ${lines(930, 850, ["NT$ 12,000"], { size: 19, anchor: "end" })}
  <line x1="112" y1="900" x2="942" y2="900" stroke="#171513" stroke-width="3"/>
  ${lines(690, 970, ["TOTAL"], { size: 18, weight: 700, letterSpacing: "2px", anchor: "end" })}
  ${lines(930, 970, ["NT$ 84,000"], { size: 30, weight: 700, anchor: "end" })}
  ${lines(112, 1268, ["Prepared for review / scope, fee, and delivery in one document"], { fill: "#7B7063", size: 17, family: "Georgia, serif", italic: true })}
`, "#FBF8F1");

const contractCover = () => frame(`
  <rect x="0" y="0" width="236" height="1492" fill="#171513"/>
  <rect x="236" y="0" width="818" height="1492" fill="#F7F3EC"/>
  <rect x="236" y="0" width="818" height="22" fill="#C69A57"/>
  <line x1="318" y1="180" x2="972" y2="180" stroke="#CFC5B7" stroke-width="2"/>
  ${label(318, 136, "AGREEMENT / PARTIES / 2026", "#7B7063")}
  ${lines(318, 330, ["甲乙方", "軟體服務合約"], { size: 66, weight: 600, lineHeight: 82 })}
  ${lines(318, 570, ["SOFTWARE SERVICES AGREEMENT"], { fill: "#5B4E40", size: 21, family: "Georgia, serif", italic: true, letterSpacing: "1px" })}
  <rect x="318" y="700" width="574" height="210" fill="#E4C486" opacity=".72"/>
  ${lines(360, 765, ["甲方 / OPENPRESS STUDIO", "乙方 / CLIENT"], { size: 20, weight: 600, lineHeight: 60 })}
  <line x1="318" y1="1032" x2="972" y2="1032" stroke="#CFC5B7" stroke-width="2"/>
  ${lines(318, 1105, ["服務範圍、交付標準、付款條件與雙方責任"], { fill: "#5B4E40", size: 22 })}
  <circle cx="900" cy="1260" r="76" fill="none" stroke="#C69A57" stroke-width="3"/>
  ${lines(900, 1252, ["SIGNED", "2026"], { anchor: "middle", fill: "#8E6B38", size: 17, weight: 700, lineHeight: 30, letterSpacing: "2px" })}
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
