const TONES = new Set(["sage", "lavender", "mint", "amber"]);

const VISUALS = {
  "linked-list": `<svg viewBox="0 0 520 330" focusable="false" aria-hidden="true">
      <rect class="chapter-opener-illustration__paper" x="42" y="96" width="116" height="82" rx="4" />
      <rect class="chapter-opener-illustration__paper" x="204" y="96" width="116" height="82" rx="4" />
      <rect class="chapter-opener-illustration__paper" x="366" y="96" width="116" height="82" rx="4" />
      <path class="chapter-opener-illustration__stroke" d="M158 137 H204" />
      <path class="chapter-opener-illustration__stroke" d="M320 137 H366" />
      <path class="chapter-opener-illustration__arrow" d="M190 122 206 137 190 152" />
      <path class="chapter-opener-illustration__arrow" d="M352 122 368 137 352 152" />
      <path class="chapter-opener-illustration__thin" d="M72 128 H118 M72 150 H128 M234 128 H280 M234 150 H286 M396 128 H442 M396 150 H452" />
      <circle class="chapter-opener-illustration__node" cx="144" cy="137" r="13" />
      <circle class="chapter-opener-illustration__node" cx="306" cy="137" r="13" />
      <circle class="chapter-opener-illustration__node" cx="468" cy="137" r="13" />
      <path class="chapter-opener-illustration__stroke" d="M262 178 C262 222 220 244 158 244 C98 244 68 222 68 190" />
      <path class="chapter-opener-illustration__arrow" d="M52 204 68 188 84 204" />
    </svg>`,
  tree: `<svg viewBox="0 0 520 330" focusable="false" aria-hidden="true">
      <path class="chapter-opener-illustration__paper" d="M232 40 316 40 352 86 330 132 218 132 194 86Z" />
      <path class="chapter-opener-illustration__paper" d="M88 198 170 178 228 218 204 288 100 288 58 240Z" />
      <path class="chapter-opener-illustration__paper" d="M314 198 400 176 466 224 450 292 328 292 282 238Z" />
      <path class="chapter-opener-illustration__stroke" d="M262 118 160 214 M270 118 374 214" />
      <path class="chapter-opener-illustration__stroke" d="M160 214 122 258 M160 214 204 258 M374 214 330 258 M374 214 420 258" />
      <circle class="chapter-opener-illustration__node" cx="266" cy="100" r="24" />
      <circle class="chapter-opener-illustration__node" cx="160" cy="214" r="22" />
      <circle class="chapter-opener-illustration__node" cx="374" cy="214" r="22" />
      <circle class="chapter-opener-illustration__dot" cx="122" cy="258" r="13" />
      <circle class="chapter-opener-illustration__dot" cx="204" cy="258" r="13" />
      <circle class="chapter-opener-illustration__dot" cx="330" cy="258" r="13" />
      <circle class="chapter-opener-illustration__dot" cx="420" cy="258" r="13" />
    </svg>`,
  code: `<svg viewBox="0 0 520 330" focusable="false" aria-hidden="true">
      <path class="chapter-opener-illustration__paper" d="M92 52 338 52 386 104 386 286 92 286Z" />
      <path class="chapter-opener-illustration__paper" d="M348 82 438 82 476 122 452 226 356 226 326 154Z" />
      <path class="chapter-opener-illustration__thin" d="M132 112 H250 M132 146 H292 M132 180 H238 M132 214 H276" />
      <path class="chapter-opener-illustration__stroke" d="M308 114 C340 122 356 148 356 180 C356 220 332 244 292 250" />
      <path class="chapter-opener-illustration__arrow" d="M304 226 288 250 316 260" />
      <path class="chapter-opener-illustration__stroke" d="M406 124 V202" />
      <circle class="chapter-opener-illustration__node" cx="406" cy="124" r="17" />
      <circle class="chapter-opener-illustration__node" cx="406" cy="202" r="17" />
    </svg>`,
  answers: `<svg viewBox="0 0 520 330" focusable="false" aria-hidden="true">
      <path class="chapter-opener-illustration__paper" d="M128 44 396 44 440 90 418 292 104 292 82 86Z" />
      <path class="chapter-opener-illustration__thin" d="M178 116 H350 M178 168 H350 M178 220 H322" />
      <path class="chapter-opener-illustration__stroke" d="M128 112 148 134 190 88" />
      <path class="chapter-opener-illustration__stroke" d="M128 164 148 186 190 140" />
      <path class="chapter-opener-illustration__stroke" d="M128 216 148 238 190 192" />
      <circle class="chapter-opener-illustration__node" cx="386" cy="92" r="18" />
      <path class="chapter-opener-illustration__stroke" d="M386 92 C420 126 424 172 394 208" />
      <path class="chapter-opener-illustration__arrow" d="M380 186 394 210 420 200" />
    </svg>`,
};

export type ChapterOpenerVisualVariant = keyof typeof VISUALS;

export interface ChapterOpenerVisualProps {
  variant?: ChapterOpenerVisualVariant;
  tone?: string;
}

export default function ChapterOpenerVisual({
  variant = "linked-list",
  tone = "sage",
}: ChapterOpenerVisualProps) {
  const visual = VISUALS[variant] ?? VISUALS["linked-list"];
  const safeTone = TONES.has(tone) ? tone : "sage";

  return (
    <figure
      className={`chapter-opener-illustration chapter-opener-illustration--${variant} chapter-opener-tone--${safeTone}`}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: visual }}
    />
  );
}
