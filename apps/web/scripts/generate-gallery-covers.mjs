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

const agentRobot = ({ x, y, scale = 1, fill = "#F5EEE3", stroke = "#171513", accent = "#C69A57" }) => `<g transform="translate(${x} ${y}) scale(${scale})" fill="none" stroke="${stroke}" stroke-width="4" stroke-linejoin="round" stroke-linecap="round">
  <path d="M110 0V18"/>
  <circle cx="110" cy="-7" r="7" fill="${accent}" stroke="none"/>
  <rect x="30" y="18" width="160" height="110" rx="24" fill="${fill}"/>
  <circle cx="78" cy="68" r="10" fill="${accent}" stroke="none"/>
  <circle cx="142" cy="68" r="10" fill="${accent}" stroke="none"/>
  <path d="M82 99H138"/>
  <rect x="66" y="144" width="88" height="105" rx="18" fill="${fill}"/>
  <path d="M66 166L20 218M154 166L200 218"/>
  <circle cx="20" cy="218" r="10" fill="${accent}"/>
  <circle cx="200" cy="218" r="10" fill="${accent}"/>
  <path d="M88 249V278M132 249V278"/>
  <path d="M48 144H20M172 144H200"/>
</g>`;

const formalPaper = () => frame(`
  <rect x="38" y="38" width="978" height="1416" fill="none" stroke="#CFC8BC" stroke-width="2"/>
  <line x1="86" y1="124" x2="968" y2="124" stroke="#D8D1C7"/>
  <line x1="86" y1="1367" x2="968" y2="1367" stroke="#D8D1C7"/>
  ${lines(527, 180, ["NORTH HARBOR UNIVERSITY", "SCHOOL OF URBAN STUDIES", "MASTER'S THESIS"], { anchor: "middle", size: 22, weight: 500, lineHeight: 50 })}
  ${lines(527, 470, ["URBAN HEAT AND STREET SHADE", "IN TAIPEI"], { anchor: "middle", size: 44, weight: 600, lineHeight: 62 })}
  ${lines(527, 650, ["An observational study of thermal comfort", "and public space"], { anchor: "middle", size: 22, family: "Georgia, serif", lineHeight: 34, italic: true, fill: "#5B4E40" })}
  <circle cx="527" cy="830" r="5" fill="#C69A57"/>
  ${lines(527, 1005, ["Researcher: Evelyn Lin", "Advisor: Marcus Huang"], { anchor: "middle", size: 24, lineHeight: 54 })}
  ${lines(527, 1238, ["June 2026", "Taipei, Taiwan"], { anchor: "middle", size: 20, family: "Georgia, serif", lineHeight: 42, fill: "#5B4E40" })}
  ${label(86, 118, "FORMAL RESEARCH PAPER")}
`, "#FBF9F4");

const schoolReport = (background) => frame(`
  <image href="${background}" x="0" y="0" width="${WIDTH}" height="${HEIGHT}" preserveAspectRatio="xMidYMid slice"/>
  <defs>
    <linearGradient id="school-wash" x1="0" y1="0" x2="0.75" y2="0.45">
      <stop offset="0" stop-color="#F5F1E7" stop-opacity=".86"/>
      <stop offset=".68" stop-color="#F5F1E7" stop-opacity=".12"/>
      <stop offset="1" stop-color="#F5F1E7" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="760" fill="url(#school-wash)"/>
  ${lines(76, 220, ["DOG OWNERSHIP", "CONFIDENCE &", "COMPANIONSHIP"], { fill: "#173B43", size: 49, weight: 600, lineHeight: 61, family: "Georgia, Times New Roman, serif" })}
  <line x1="78" y1="390" x2="294" y2="390" stroke="#E28A5B" stroke-width="7"/>
  ${lines(78, 450, ["A study of everyday relationships and self-efficacy", "— how living with a dog can support", "confidence and companionship."], { fill: "#2B5964", size: 20, weight: 500, lineHeight: 32, family: "Arial, Helvetica, sans-serif" })}
`, "#F5F1E7");

const startupPlan = (background) => frame(`
  <image href="${background}" x="0" y="0" width="${WIDTH}" height="${HEIGHT}" preserveAspectRatio="xMidYMid slice"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#111820" opacity=".16"/>
  <rect x="54" y="58" width="650" height="680" fill="#111820" opacity=".9"/>
  <rect x="54" y="58" width="650" height="8" fill="#F04D3A"/>
  ${label(92, 120, "STRATEGY BRIEF / 2026", "#B9D5EA")}
  ${lines(92, 232, ["AGENTIC AI", "PRODUCT STRATEGY", "AND GO-TO-MARKET", "PLAN"], { fill: "#F5F1E8", size: 42, weight: 700, lineHeight: 60, family: "Arial, Helvetica, sans-serif", letterSpacing: "-1px" })}
  <line x1="92" y1="508" x2="292" y2="508" stroke="#F04D3A" stroke-width="8"/>
  ${lines(92, 568, ["A VISION FOR", "MACHINES THAT BUILD WITH US"], { fill: "#F5F1E8", size: 21, weight: 500, lineHeight: 32, family: "Arial, Helvetica, sans-serif", letterSpacing: "1px" })}
  <rect x="54" y="1348" width="946" height="70" fill="#111820" opacity=".88"/>
  ${label(86, 1394, "RESEARCH / SYSTEMS / DELIVERY", "#B9D5EA")}
`, "#111820");

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
  ${lines(78, 780, ["DATA STRUCTURES", "COURSE NOTES"], { fill: "#171513", size: 64, weight: 600, lineHeight: 76 })}
  ${lines(78, 900, ["Arrays　→　Lists　→　Trees　→　Graphs"], { fill: "#8E6B38", size: 20, weight: 600, letterSpacing: "1px" })}
  ${lines(78, 1245, ["PREPARED FOR", "Data Structures / Spring 2026"], { fill: "#8E6B38", size: 17, weight: 600, lineHeight: 38, letterSpacing: "2px" })}
`, "#F2ECE2");

const magazineCover = (background) => frame(`
  <image href="${background}" x="0" y="0" width="${WIDTH}" height="${HEIGHT}" preserveAspectRatio="xMidYMid slice"/>
  <rect x="0" y="0" width="${WIDTH}" height="${HEIGHT}" fill="#0A0A0A" opacity=".08"/>
  <rect x="0" y="0" width="${WIDTH}" height="54" fill="#ED1C24"/>
  ${lines(60, 38, ["JULY 2026"], { fill: "#090909", size: 20, weight: 800, family: "Arial, Helvetica, sans-serif", letterSpacing: "4px" })}
  <rect x="42" y="56" width="970" height="1380" fill="none" stroke="#F7F3EC" stroke-width="10"/>
  ${lines(74, 182, ["AGENTIC"], { fill: "#F7F3EC", size: 108, weight: 800, family: "Georgia, Times New Roman, serif", letterSpacing: "-3px" })}
  <rect x="74" y="200" width="540" height="8" fill="#ED1C24"/>
  <rect x="74" y="1042" width="906" height="334" fill="#080808" opacity=".84"/>
  ${lines(112, 1110, ["THE NEW", "COLLABORATORS"], { fill: "#F7F3EC", size: 62, weight: 800, family: "Arial, Helvetica, sans-serif", lineHeight: 70, letterSpacing: "-1px" })}
  ${lines(112, 1270, ["HOW AGENTIC AI IS CHANGING", "THE WORK OF IDEAS"], { fill: "#F7D64A", size: 24, weight: 700, family: "Arial, Helvetica, sans-serif", lineHeight: 32, letterSpacing: "1px" })}
  ${lines(760, 1330, ["A FIELD GUIDE TO", "MACHINES THAT BUILD WITH US"], { fill: "#F7F3EC", size: 17, weight: 600, family: "Arial, Helvetica, sans-serif", lineHeight: 25, anchor: "end", letterSpacing: "1px" })}
  <rect x="0" y="1438" width="${WIDTH}" height="54" fill="#ED1C24"/>
  <line x1="42" y1="1438" x2="1012" y2="1438" stroke="#F7F3EC" stroke-width="10"/>
`, "#ED1C24");

const newspaperCover = (background) => frame(`
  <image href="${background}" x="0" y="0" width="${WIDTH}" height="${HEIGHT}" preserveAspectRatio="xMidYMid slice"/>
  <rect x="38" y="44" width="978" height="184" fill="#F8F6EF" opacity=".92"/>
  <line x1="54" y1="62" x2="1000" y2="62" stroke="#111111" stroke-width="4"/>
  ${lines(82, 116, ["VOL. 19"], { fill: "#111111", size: 18, weight: 700, family: "Georgia, serif", letterSpacing: "1px" })}
  ${lines(527, 150, ["THE NEWS TODAY"], { fill: "#111111", size: 52, weight: 700, anchor: "middle", family: "Georgia, Times New Roman, serif", letterSpacing: "1px" })}
  ${lines(527, 190, ["Latest reports on the work of ideas"], { fill: "#111111", size: 16, weight: 500, anchor: "middle", family: "Georgia, serif", letterSpacing: "1px" })}
  ${lines(970, 116, ["MONDAY", "JUNE 26, 2026"], { fill: "#111111", size: 16, weight: 700, anchor: "end", family: "Arial, Helvetica, sans-serif", lineHeight: 24, letterSpacing: "1px" })}
  <line x1="54" y1="208" x2="1000" y2="208" stroke="#111111" stroke-width="3"/>
  <rect x="62" y="252" width="424" height="332" fill="#F8F6EF" opacity=".92"/>
  ${lines(82, 304, ["AGENTIC AI", "CHANGES THE", "WORK OF IDEAS"], { fill: "#111111", size: 39, weight: 700, lineHeight: 48, family: "Georgia, Times New Roman, serif" })}
  ${lines(82, 488, ["A field report on people, tools,", "and the systems they build together."], { fill: "#222222", size: 18, weight: 500, lineHeight: 28, family: "Georgia, serif" })}
  <line x1="82" y1="548" x2="316" y2="548" stroke="#111111" stroke-width="4"/>
  <rect x="62" y="1260" width="938" height="146" fill="#111111" opacity=".9"/>
  ${lines(88, 1306, ["CITY / CULTURE / SYSTEMS"], { fill: "#F8F6EF", size: 17, weight: 700, family: "Arial, Helvetica, sans-serif", letterSpacing: "2px" })}
  ${lines(88, 1352, ["How autonomous tools are becoming part of everyday work"], { fill: "#F8F6EF", size: 22, weight: 500, family: "Georgia, serif" })}
`, "#F8F6EF");

const invoiceReceipt = () => frame(`
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#FFFFFF"/>
  <rect x="0" y="0" width="${WIDTH}" height="12" fill="#E9E9E6"/>
  ${lines(72, 136, ["Receipt"], { fill: "#111111", size: 48, weight: 700, family: "Arial, Helvetica, sans-serif" })}
  <g fill="#111111">
    <path d="M884 82h56l-28 70z"/>
    <path d="M918 82h56l-28 70z" opacity=".68"/>
  </g>
  ${lines(72, 214, ["Invoice number", "Receipt number", "Date paid"], { fill: "#111111", size: 16, weight: 700, lineHeight: 34, family: "Arial, Helvetica, sans-serif" })}
  ${lines(262, 214, ["OP-2026-0031", "2545-6197-5516", "June 26, 2026"], { fill: "#111111", size: 16, weight: 500, lineHeight: 34, family: "Arial, Helvetica, sans-serif" })}
  ${lines(72, 374, ["OpenPress Studio", "Taipei, Taiwan", "billing@openpress.dev"], { fill: "#111111", size: 18, weight: 600, lineHeight: 32, family: "Arial, Helvetica, sans-serif" })}
  ${lines(548, 374, ["Bill to", "Chatbotta, Co. Ltd.", "New Taipei City, Taiwan", "quan787887@gmail.com"], { fill: "#111111", size: 18, weight: 600, lineHeight: 32, family: "Arial, Helvetica, sans-serif" })}
  ${lines(72, 590, ["NT$ 84,000 paid on June 26, 2026"], { fill: "#111111", size: 28, weight: 700, family: "Arial, Helvetica, sans-serif" })}
  ${lines(72, 658, ["Thank you for your payment. This receipt records the completed", "OpenPress workspace design and print-ready delivery."], { fill: "#333333", size: 17, weight: 500, lineHeight: 28, family: "Arial, Helvetica, sans-serif" })}
  <line x1="72" y1="748" x2="982" y2="748" stroke="#111111" stroke-width="1"/>
  ${lines(72, 724, ["Description"], { fill: "#111111", size: 15, weight: 500, family: "Arial, Helvetica, sans-serif" })}
  ${lines(748, 724, ["Qty"], { fill: "#111111", size: 15, weight: 500, anchor: "end", family: "Arial, Helvetica, sans-serif" })}
  ${lines(866, 724, ["Unit price"], { fill: "#111111", size: 15, weight: 500, anchor: "end", family: "Arial, Helvetica, sans-serif" })}
  ${lines(982, 724, ["Amount"], { fill: "#111111", size: 15, weight: 500, anchor: "end", family: "Arial, Helvetica, sans-serif" })}
  ${lines(72, 800, ["Content workspace / print-ready delivery", "June 26, 2026–June 26, 2027"], { fill: "#111111", size: 18, weight: 500, lineHeight: 30, family: "Arial, Helvetica, sans-serif" })}
  ${lines(748, 800, ["1"], { fill: "#111111", size: 18, anchor: "end", family: "Arial, Helvetica, sans-serif" })}
  ${lines(866, 800, ["NT$ 84,000"], { fill: "#111111", size: 18, anchor: "end", family: "Arial, Helvetica, sans-serif" })}
  ${lines(982, 800, ["NT$ 84,000"], { fill: "#111111", size: 18, anchor: "end", family: "Arial, Helvetica, sans-serif" })}
  <line x1="510" y1="906" x2="982" y2="906" stroke="#D9D9D6"/>
  ${lines(748, 954, ["Subtotal"], { fill: "#333333", size: 17, anchor: "end", family: "Arial, Helvetica, sans-serif" })}
  ${lines(982, 954, ["NT$ 84,000"], { fill: "#333333", size: 17, anchor: "end", family: "Arial, Helvetica, sans-serif" })}
  <line x1="510" y1="982" x2="982" y2="982" stroke="#D9D9D6"/>
  ${lines(748, 1030, ["Total"], { fill: "#333333", size: 17, anchor: "end", family: "Arial, Helvetica, sans-serif" })}
  ${lines(982, 1030, ["NT$ 84,000"], { fill: "#333333", size: 17, anchor: "end", family: "Arial, Helvetica, sans-serif" })}
  ${lines(748, 1106, ["Amount paid"], { fill: "#111111", size: 18, weight: 700, anchor: "end", family: "Arial, Helvetica, sans-serif" })}
  ${lines(982, 1106, ["NT$ 84,000"], { fill: "#111111", size: 18, weight: 700, anchor: "end", family: "Arial, Helvetica, sans-serif" })}
  ${lines(72, 1240, ["Payment history"], { fill: "#111111", size: 27, weight: 700, family: "Arial, Helvetica, sans-serif" })}
  <line x1="72" y1="1308" x2="982" y2="1308" stroke="#111111"/>
  ${lines(72, 1288, ["Payment method"], { fill: "#333333", size: 14, family: "Arial, Helvetica, sans-serif" })}
  ${lines(606, 1288, ["Date"], { fill: "#333333", size: 14, family: "Arial, Helvetica, sans-serif" })}
  ${lines(760, 1288, ["Amount paid"], { fill: "#333333", size: 14, family: "Arial, Helvetica, sans-serif" })}
  ${lines(982, 1288, ["Receipt number"], { fill: "#333333", size: 14, anchor: "end", family: "Arial, Helvetica, sans-serif" })}
  ${lines(72, 1360, ["Visa - 3211"], { fill: "#111111", size: 17, family: "Arial, Helvetica, sans-serif" })}
  ${lines(606, 1360, ["June 26, 2026"], { fill: "#111111", size: 17, family: "Arial, Helvetica, sans-serif" })}
  ${lines(760, 1360, ["NT$ 84,000"], { fill: "#111111", size: 17, family: "Arial, Helvetica, sans-serif" })}
  ${lines(982, 1360, ["2545-6197-5516"], { fill: "#111111", size: 17, anchor: "end", family: "Arial, Helvetica, sans-serif" })}
  <line x1="72" y1="1436" x2="982" y2="1436" stroke="#E3E3E0"/>
  ${lines(982, 1468, ["Page 1 of 1"], { fill: "#333333", size: 14, anchor: "end", family: "Arial, Helvetica, sans-serif" })}
`, "#FFFFFF");

const contractCover = () => frame(`
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#FAF9F6"/>
  <rect x="0" y="0" width="${WIDTH}" height="16" fill="#B42318"/>
  <rect x="82" y="88" width="890" height="1308" fill="none" stroke="#D8D5CF" stroke-width="2"/>
  <circle cx="908" cy="166" r="54" fill="none" stroke="#B42318" stroke-width="4"/>
  ${lines(908, 158, ["A", "B"], { fill: "#B42318", size: 23, weight: 700, lineHeight: 24, anchor: "middle", family: "Georgia, serif" })}
  ${label(126, 150, "PRIVATE AGREEMENT / 2026", "#B42318")}
  ${lines(126, 300, ["SOFTWARE SERVICES", "AGREEMENT"], { fill: "#1F2933", size: 62, weight: 500, lineHeight: 78, family: "Georgia, Times New Roman, serif" })}
  <line x1="126" y1="432" x2="928" y2="432" stroke="#1F2933" stroke-width="3"/>
  ${lines(126, 500, ["PARTIES"], { fill: "#B42318", size: 17, weight: 700, letterSpacing: "3px" })}
  ${lines(126, 556, ["PARTY A", "OpenPress Studio"], { fill: "#1F2933", size: 20, weight: 600, lineHeight: 34 })}
  ${lines(512, 556, ["PARTY B", "Client / commissioning party"], { fill: "#1F2933", size: 20, weight: 600, lineHeight: 34 })}
  <line x1="126" y1="650" x2="928" y2="650" stroke="#D8D5CF"/>
  ${lines(126, 726, ["01  SERVICES"], { fill: "#1F2933", size: 19, weight: 700, letterSpacing: "1px" })}
  ${lines(126, 764, ["Party B provides content editing, page design, and publication output."], { fill: "#59636D", size: 18, family: "Georgia, serif" })}
  <line x1="126" y1="820" x2="928" y2="820" stroke="#D8D5CF"/>
  ${lines(126, 896, ["02  DELIVERY & ACCEPTANCE"], { fill: "#1F2933", size: 19, weight: 700, letterSpacing: "1px" })}
  ${lines(126, 934, ["Deliverables include a web reader, PNG exports, and a PDF for review."], { fill: "#59636D", size: 18, family: "Georgia, serif" })}
  <line x1="126" y1="990" x2="928" y2="990" stroke="#D8D5CF"/>
  ${lines(126, 1066, ["03  FEES & PAYMENT"], { fill: "#1F2933", size: 19, weight: 700, letterSpacing: "1px" })}
  ${lines(126, 1104, ["Project fee: NT$ 84,000. Fifty percent is due at signing."], { fill: "#59636D", size: 18, family: "Georgia, serif" })}
  <line x1="126" y1="1170" x2="928" y2="1170" stroke="#1F2933" stroke-width="3"/>
  ${lines(126, 1240, ["PARTY A SIGNATURE: ____________________", "PARTY B SIGNATURE: ____________________"], { fill: "#1F2933", size: 17, weight: 600, lineHeight: 46 })}
  ${lines(126, 1350, ["SAMPLE AGREEMENT / NOT LEGAL ADVICE"], { fill: "#B42318", size: 15, weight: 700, letterSpacing: "1px" })}
`, "#FAF9F6");

const imageDataUri = async (filePath) => {
  const data = await fs.readFile(filePath);
  return `data:image/png;base64,${data.toString("base64")}`;
};

const startupBackground = await imageDataUri(fileURLToPath(new URL("../public/gallery/backgrounds/startup-vision.png", import.meta.url)));
const magazineBackground = await imageDataUri(fileURLToPath(new URL("../public/gallery/backgrounds/magazine-cover.png", import.meta.url)));
const schoolReportBackground = await imageDataUri(fileURLToPath(new URL("../public/gallery/backgrounds/school-report.png", import.meta.url)));
const newspaperBackground = await imageDataUri(fileURLToPath(new URL("../public/gallery/backgrounds/newspaper.png", import.meta.url)));

const covers = {
  paper: formalPaper(),
  "school-report": schoolReport(schoolReportBackground),
  "startup-plan": startupPlan(startupBackground),
  "subject-notes": courseNotes(),
  magazine: magazineCover(magazineBackground),
  newspaper: newspaperCover(newspaperBackground),
  invoice: invoiceReceipt(),
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
