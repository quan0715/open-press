const VISUALS = {
  overview: `<svg viewBox="0 0 520 330" focusable="false" aria-hidden="true">
      <rect class="chapter-opener-illustration__paper" x="58" y="52" width="318" height="174" rx="6" />
      <path class="chapter-opener-illustration__thin" d="M58 92 H376 M96 72 H124 M144 72 H172 M192 72 H220" />
      <path class="chapter-opener-illustration__stroke" d="M132 116 104 144 132 172 M302 116 330 144 302 172" />
      <path class="chapter-opener-illustration__thin" d="M162 122 H244 M162 148 H276 M162 174 H224" />
      <path class="chapter-opener-illustration__thin" d="M244 122 276 148 244 174 M276 148 H324" />
      <circle class="chapter-opener-illustration__node" cx="244" cy="122" r="9" />
      <circle class="chapter-opener-illustration__node" cx="276" cy="148" r="9" />
      <circle class="chapter-opener-illustration__dot" cx="244" cy="174" r="8" />
      <circle class="chapter-opener-illustration__dot" cx="324" cy="148" r="8" />
      <path class="chapter-opener-illustration__paper" d="M398 42 466 56 486 122 438 166 370 140 374 72Z" />
      <path class="chapter-opener-illustration__thin" d="M428 74 V132 M398 102 H460 M410 84 446 120" />
      <circle class="chapter-opener-illustration__node" cx="428" cy="74" r="11" />
      <circle class="chapter-opener-illustration__node" cx="398" cy="102" r="10" />
      <circle class="chapter-opener-illustration__node" cx="460" cy="102" r="10" />
      <circle class="chapter-opener-illustration__dot" cx="428" cy="132" r="9" />
      <rect class="chapter-opener-illustration__paper" x="86" y="256" width="68" height="44" rx="4" />
      <rect class="chapter-opener-illustration__paper" x="214" y="256" width="68" height="44" rx="4" />
      <rect class="chapter-opener-illustration__paper" x="342" y="256" width="68" height="44" rx="4" />
      <path class="chapter-opener-illustration__stroke" d="M154 278 H214 M282 278 H342" />
      <path class="chapter-opener-illustration__arrow" d="M198 262 216 278 198 294 M326 262 344 278 326 294" />
      <path class="chapter-opener-illustration__thin" d="M110 278 H132 M238 278 H260 M366 278 H388" />
    </svg>`,
  structure: `<svg viewBox="0 0 520 330" focusable="false" aria-hidden="true">
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
  model: `<svg viewBox="0 0 520 330" focusable="false" aria-hidden="true">
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
  draft: `<svg viewBox="0 0 520 330" focusable="false" aria-hidden="true">
      <path class="chapter-opener-illustration__paper" d="M92 52 338 52 386 104 386 286 92 286Z" />
      <path class="chapter-opener-illustration__paper" d="M348 82 438 82 476 122 452 226 356 226 326 154Z" />
      <path class="chapter-opener-illustration__thin" d="M132 112 H250 M132 146 H292 M132 180 H238 M132 214 H276" />
      <path class="chapter-opener-illustration__stroke" d="M308 114 C340 122 356 148 356 180 C356 220 332 244 292 250" />
      <path class="chapter-opener-illustration__arrow" d="M304 226 288 250 316 260" />
      <path class="chapter-opener-illustration__stroke" d="M406 124 V202" />
      <circle class="chapter-opener-illustration__node" cx="406" cy="124" r="17" />
      <circle class="chapter-opener-illustration__node" cx="406" cy="202" r="17" />
    </svg>`,
  review: `<svg viewBox="0 0 520 330" focusable="false" aria-hidden="true">
      <path class="chapter-opener-illustration__paper" d="M128 44 396 44 440 90 418 292 104 292 82 86Z" />
      <path class="chapter-opener-illustration__thin" d="M178 116 H350 M178 168 H350 M178 220 H322" />
      <path class="chapter-opener-illustration__stroke" d="M128 112 148 134 190 88" />
      <path class="chapter-opener-illustration__stroke" d="M128 164 148 186 190 140" />
      <path class="chapter-opener-illustration__stroke" d="M128 216 148 238 190 192" />
      <circle class="chapter-opener-illustration__node" cx="386" cy="92" r="18" />
      <path class="chapter-opener-illustration__stroke" d="M386 92 C420 126 424 172 394 208" />
      <path class="chapter-opener-illustration__arrow" d="M380 186 394 210 420 200" />
    </svg>`,
} as const;

type ChapterOpenerVisualVariant = keyof typeof VISUALS;
type ChapterOpenerVisualTone = "sage" | "lavender" | "mint" | "amber";

export interface ChapterOpenerVisualProps {
  variant?: ChapterOpenerVisualVariant;
  tone?: ChapterOpenerVisualTone;
}

export default function ChapterOpenerVisual({
  variant = "structure",
  tone = "sage",
}: ChapterOpenerVisualProps) {
  const html = VISUALS[variant] ?? VISUALS.structure;
  return (
    <figure
      className={`chapter-opener-illustration chapter-opener-illustration--${variant} chapter-opener-tone--${tone}`}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
