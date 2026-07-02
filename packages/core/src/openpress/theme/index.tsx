import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

export type ThemeColorInput =
  | string
  | {
      value: string;
      label?: string;
      description?: string;
      foreground?: string;
    };

export type ThemeTypographyInput = {
  label?: string;
  font?: string;
  size: number | string;
  lineHeight?: number | string;
  weight?: number | string;
  tracking?: number | string;
  color?: string;
  transform?: CSSProperties["textTransform"];
  sample?: string;
};

export type ThemeProfile = "slide" | "document" | "bare";

export type ThemeColorInputMap<TRole extends string = string> =
  Partial<Record<TRole, ThemeColorInput>> & Record<string, ThemeColorInput>;

export type ThemeTypographyInputMap<TRole extends string = string> =
  Partial<Record<TRole, ThemeTypographyInput>> & Record<string, ThemeTypographyInput>;

export type SlideThemeColorRole =
  | "bg"
  | "surface"
  | "surfaceMuted"
  | "ink"
  | "muted"
  | "line"
  | "accent"
  | "quote"
  | "success"
  | "warning"
  | "danger"
  | "marker";

export type SlideThemeTypographyRole =
  | "display"
  | "title"
  | "section"
  | "lead"
  | "body"
  | "caption"
  | "eyebrow"
  | "marker"
  | "quote"
  | "mono";

export type DocumentThemeColorRole =
  | "bg"
  | "paper"
  | "surface"
  | "surfaceMuted"
  | "ink"
  | "muted"
  | "line"
  | "accent"
  | "link"
  | "quote"
  | "marker"
  | "annotation";

export type DocumentThemeTypographyRole =
  | "title"
  | "heading"
  | "subheading"
  | "body"
  | "bodyStrong"
  | "caption"
  | "footnote"
  | "pageNumber"
  | "eyebrow"
  | "marker"
  | "mono";

export type ThemeExtensionInput = {
  colors?: ThemeColorInputMap;
  fonts?: Record<string, string>;
  typography?: ThemeTypographyInputMap;
};

export type ThemeColorRolesForProfile<TProfile extends ThemeProfile> =
  TProfile extends "slide" ? SlideThemeColorRole
    : TProfile extends "document" ? DocumentThemeColorRole
      : string;

export type ThemeTypographyRolesForProfile<TProfile extends ThemeProfile> =
  TProfile extends "slide" ? SlideThemeTypographyRole
    : TProfile extends "document" ? DocumentThemeTypographyRole
      : string;

export type OpenPressThemeInput<TProfile extends ThemeProfile = ThemeProfile> = {
  name?: string;
  description?: string;
  profile?: TProfile;
  colors?: ThemeColorInputMap<ThemeColorRolesForProfile<TProfile>>;
  fonts?: Record<string, string>;
  typography?: ThemeTypographyInputMap<ThemeTypographyRolesForProfile<TProfile>>;
  extend?: ThemeExtensionInput;
};

export type DefinedThemeColor = {
  key: string;
  label: string;
  value: string;
  cssVar: `--op-theme-color-${string}`;
  description?: string;
  foreground?: string;
};

export type DefinedThemeTypography = {
  key: string;
  label: string;
  font?: string;
  fontFamily: string;
  size: string;
  lineHeight: string;
  weight?: string;
  tracking?: string;
  color?: string;
  transform?: CSSProperties["textTransform"];
  sample: string;
  cssVars: {
    fontFamily: `--op-theme-type-${string}-font-family`;
    fontSize: `--op-theme-type-${string}-font-size`;
    lineHeight: `--op-theme-type-${string}-line-height`;
    fontWeight: `--op-theme-type-${string}-font-weight`;
    letterSpacing: `--op-theme-type-${string}-letter-spacing`;
    color: `--op-theme-type-${string}-color`;
  };
};

export type DefinedOpenPressTheme<TProfile extends ThemeProfile = ThemeProfile> = {
  name: string;
  description?: string;
  profile: TProfile;
  colors: Record<string, DefinedThemeColor>;
  fonts: Record<string, string>;
  typography: Record<string, DefinedThemeTypography>;
  cssVars: Record<string, string>;
};

export type DefinedSlideTheme = DefinedOpenPressTheme<"slide">;
export type DefinedDocumentTheme = DefinedOpenPressTheme<"document">;
export type DefinedBareTheme = DefinedOpenPressTheme<"bare">;

export type ThemeVisualizationProps = HTMLAttributes<HTMLDivElement> & {
  theme: DefinedOpenPressTheme;
};

type CssVariableStyle = CSSProperties & Record<`--${string}`, string | number | undefined>;

const DEFAULT_FONT_FAMILY = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif";
const DEFAULT_SAMPLE = "OpenPress turns intent into editable pages.";

const STANDARD_FONTS = {
  sans: DEFAULT_FONT_FAMILY,
  body: DEFAULT_FONT_FAMILY,
  serif: "ui-serif, Georgia, Cambria, \"Times New Roman\", Times, serif",
  mono: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", monospace",
} satisfies Record<string, string>;

export const SLIDE_THEME_COLOR_ROLES = [
  "bg",
  "surface",
  "surfaceMuted",
  "ink",
  "muted",
  "line",
  "accent",
  "quote",
  "success",
  "warning",
  "danger",
  "marker",
] as const satisfies ReadonlyArray<SlideThemeColorRole>;

export const SLIDE_THEME_TYPOGRAPHY_ROLES = [
  "display",
  "title",
  "section",
  "lead",
  "body",
  "caption",
  "eyebrow",
  "marker",
  "quote",
  "mono",
] as const satisfies ReadonlyArray<SlideThemeTypographyRole>;

export const DOCUMENT_THEME_COLOR_ROLES = [
  "bg",
  "paper",
  "surface",
  "surfaceMuted",
  "ink",
  "muted",
  "line",
  "accent",
  "link",
  "quote",
  "marker",
  "annotation",
] as const satisfies ReadonlyArray<DocumentThemeColorRole>;

export const DOCUMENT_THEME_TYPOGRAPHY_ROLES = [
  "title",
  "heading",
  "subheading",
  "body",
  "bodyStrong",
  "caption",
  "footnote",
  "pageNumber",
  "eyebrow",
  "marker",
  "mono",
] as const satisfies ReadonlyArray<DocumentThemeTypographyRole>;

const STANDARD_THEMES = {
  bare: {
    colors: {},
    fonts: {},
    typography: {},
  },
  slide: {
    colors: {
      bg: { label: "Background", value: "#ffffff" },
      surface: { label: "Surface", value: "#ffffff" },
      surfaceMuted: { label: "Muted surface", value: "#f4f4f5" },
      ink: { label: "Ink", value: "#111111" },
      muted: { label: "Muted", value: "#6f6f76" },
      line: { label: "Line", value: "#d7d7dc" },
      accent: { label: "Accent", value: "#d42a20" },
      quote: { label: "Quote", value: "#0e638e" },
      success: { label: "Success", value: "#0e8e51" },
      warning: { label: "Warning", value: "#fac22b" },
      danger: { label: "Danger", value: "#b42318" },
      marker: { label: "Marker", value: "#d42a20" },
    },
    fonts: STANDARD_FONTS,
    typography: {
      display: { font: "serif", size: 132, lineHeight: 1.04, weight: 400, color: "ink", sample: "A new authoring loop" },
      title: { font: "serif", size: 72, lineHeight: 1.12, weight: 400, color: "ink", sample: "Frame is the page and the region" },
      section: { font: "sans", size: 52, lineHeight: 1.12, weight: 700, color: "ink", sample: "The system keeps structure visible" },
      lead: { font: "sans", size: 32, lineHeight: 1.35, weight: 400, color: "ink", sample: "Agents translate intent into editable source." },
      body: { font: "sans", size: 28, lineHeight: 1.42, weight: 400, color: "ink", sample: "Content remains editable after generation." },
      caption: { font: "sans", size: 14, lineHeight: 1.3, weight: 700, tracking: "0.12em", color: "muted", transform: "uppercase", sample: "26 June 2024" },
      eyebrow: { font: "sans", size: 14, lineHeight: 1.1, weight: 800, tracking: "0.16em", color: "accent", transform: "uppercase", sample: "Workflow" },
      marker: { font: "mono", size: 13, lineHeight: 1, weight: 800, color: "marker", sample: "01" },
      quote: { font: "serif", size: 42, lineHeight: 1.2, weight: 400, color: "quote", sample: "The user owns intent." },
      mono: { font: "mono", size: 18, lineHeight: 1.4, weight: 500, color: "muted", sample: "<Frame frameKey=\"hero\" />" },
    },
  },
  document: {
    colors: {
      bg: { label: "Background", value: "#f6f4ef" },
      paper: { label: "Paper", value: "#ffffff" },
      surface: { label: "Surface", value: "#ffffff" },
      surfaceMuted: { label: "Muted surface", value: "#f0eee8" },
      ink: { label: "Ink", value: "#16161d" },
      muted: { label: "Muted", value: "#6f6d68" },
      line: { label: "Line", value: "#d8d3c8" },
      accent: { label: "Accent", value: "#b6422c" },
      link: { label: "Link", value: "#0d5f89" },
      quote: { label: "Quote", value: "#0d5f89" },
      marker: { label: "Marker", value: "#b6422c" },
      annotation: { label: "Annotation", value: "#f4c542" },
    },
    fonts: STANDARD_FONTS,
    typography: {
      title: { font: "serif", size: 48, lineHeight: 1.08, weight: 500, color: "ink", sample: "A practical guide to OpenPress" },
      heading: { font: "serif", size: 32, lineHeight: 1.18, weight: 600, color: "ink", sample: "Document themes keep prose stable" },
      subheading: { font: "sans", size: 22, lineHeight: 1.32, weight: 700, color: "ink", sample: "A smaller section heading" },
      body: { font: "sans", size: 18, lineHeight: 1.62, weight: 400, color: "ink", sample: "Readable documents depend on stable spacing and type roles." },
      bodyStrong: { font: "sans", size: 18, lineHeight: 1.62, weight: 700, color: "ink", sample: "Important document claims remain clear." },
      caption: { font: "sans", size: 13, lineHeight: 1.38, weight: 600, color: "muted", sample: "Figure 1. Rendered object map." },
      footnote: { font: "sans", size: 11, lineHeight: 1.35, weight: 400, color: "muted", sample: "1. Source material supplied by the user." },
      pageNumber: { font: "mono", size: 11, lineHeight: 1, weight: 600, color: "muted", sample: "024" },
      eyebrow: { font: "sans", size: 11, lineHeight: 1, weight: 800, tracking: "0.14em", color: "accent", transform: "uppercase", sample: "Reference" },
      marker: { font: "mono", size: 12, lineHeight: 1, weight: 800, color: "marker", sample: "A1" },
      mono: { font: "mono", size: 14, lineHeight: 1.5, weight: 500, color: "muted", sample: "npm run build" },
    },
  },
} satisfies Record<ThemeProfile, {
  colors: ThemeColorInputMap;
  fonts: Record<string, string>;
  typography: ThemeTypographyInputMap;
}>;

type ThemeProfileFromInput<T extends OpenPressThemeInput> =
  T extends { profile: infer TProfile extends ThemeProfile } ? TProfile : "slide";

export function defineTheme<const T extends OpenPressThemeInput>(input: T): DefinedOpenPressTheme<ThemeProfileFromInput<T>> {
  const profile = input.profile ?? "slide";
  const standard = STANDARD_THEMES[profile];
  const fonts = { ...standard.fonts, ...input.fonts, ...input.extend?.fonts };
  const colors = normalizeColors({
    ...standard.colors,
    ...input.colors,
    ...input.extend?.colors,
  });
  const typography = normalizeTypography({
    ...standard.typography,
    ...input.typography,
    ...input.extend?.typography,
  }, { colors, fonts });
  const cssVars = {
    ...colorsToCssVars(colors),
    ...typographyToCssVars(typography),
  };

  return {
    name: input.name ?? "OpenPress Theme",
    description: input.description,
    profile: profile as ThemeProfileFromInput<T>,
    colors,
    fonts,
    typography,
    cssVars,
  };
}

export function defineSlideTheme<const T extends Omit<OpenPressThemeInput<"slide">, "profile">>(input: T = {} as T): DefinedSlideTheme {
  return defineTheme({ ...input, profile: "slide" });
}

export function defineDocumentTheme<const T extends Omit<OpenPressThemeInput<"document">, "profile">>(input: T = {} as T): DefinedDocumentTheme {
  return defineTheme({ ...input, profile: "document" });
}

export function themeToCssVariables(theme: DefinedOpenPressTheme): Record<string, string> {
  return { ...theme.cssVars };
}

export function themeToCssText(theme: DefinedOpenPressTheme, selector = ":root"): string {
  const declarations = Object.entries(theme.cssVars)
    .map(([key, value]) => `  ${key}: ${value};`)
    .join("\n");
  return `${selector} {\n${declarations}\n}`;
}

export function ThemeColorSwatches({
  theme,
  className,
  style,
  ...props
}: ThemeVisualizationProps) {
  const colors = Object.values(theme.colors);
  return (
    <div
      {...props}
      className={joinClassNames("openpress-theme-color-swatches", className)}
      style={withThemeVars(theme, {
        ...visualSectionStyle,
        ...style,
      })}
    >
      <div style={sectionHeaderStyle}>
        <div style={eyebrowStyle}>Color</div>
        <h2 style={sectionTitleStyle}>Theme color tokens</h2>
      </div>
      <div style={swatchGridStyle}>
        {colors.map((color) => (
          <article key={color.key} style={swatchCardStyle}>
            <div
              aria-hidden="true"
              style={{
                ...swatchPreviewStyle,
                background: `var(${color.cssVar})`,
              }}
            />
            <div style={swatchTextStyle}>
              <div style={swatchLabelStyle}>{color.label}</div>
              <code style={codeStyle}>{color.key}</code>
              <code style={codeMutedStyle}>{color.value}</code>
              {color.description ? <p style={descriptionStyle}>{color.description}</p> : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ThemeTypographyGraph({
  theme,
  sample,
  className,
  style,
  ...props
}: ThemeVisualizationProps & { sample?: string }) {
  const typeStyles = Object.values(theme.typography);
  return (
    <div
      {...props}
      className={joinClassNames("openpress-theme-typography-graph", className)}
      style={withThemeVars(theme, {
        ...visualSectionStyle,
        ...style,
      })}
    >
      <div style={sectionHeaderStyle}>
        <div style={eyebrowStyle}>Typography</div>
        <h2 style={sectionTitleStyle}>Type graph</h2>
      </div>
      <div style={typeGraphStyle}>
        {typeStyles.map((typeStyle) => (
          <article key={typeStyle.key} style={typeRowStyle}>
            <div style={typeMetaStyle}>
              <strong style={typeLabelStyle}>{typeStyle.label}</strong>
              <code style={codeStyle}>{typeStyle.key}</code>
              <span style={typeSpecStyle}>
                {typeStyle.size} / {typeStyle.lineHeight}
                {typeStyle.weight ? ` / ${typeStyle.weight}` : ""}
              </span>
            </div>
            <div
              style={{
                ...typeSampleStyle,
                fontFamily: `var(${typeStyle.cssVars.fontFamily})`,
                fontSize: `var(${typeStyle.cssVars.fontSize})`,
                lineHeight: `var(${typeStyle.cssVars.lineHeight})`,
                fontWeight: `var(${typeStyle.cssVars.fontWeight})`,
                letterSpacing: `var(${typeStyle.cssVars.letterSpacing})`,
                color: `var(${typeStyle.cssVars.color})`,
                textTransform: typeStyle.transform,
              }}
            >
              {sample ?? typeStyle.sample}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

export function ThemeSpec({
  theme,
  sections = ["colors", "typography"],
  sample,
  className,
  style,
  ...props
}: ThemeVisualizationProps & {
  sections?: ReadonlyArray<"colors" | "typography">;
  sample?: string;
  children?: ReactNode;
}) {
  return (
    <div
      {...props}
      className={joinClassNames("openpress-theme-spec", className)}
      style={withThemeVars(theme, {
        ...themeSpecStyle,
        ...style,
      })}
    >
      <header style={themeSpecHeaderStyle}>
        <div>
          <div style={eyebrowStyle}>Theme</div>
          <h1 style={themeSpecTitleStyle}>{theme.name}</h1>
        </div>
        {theme.description ? <p style={themeSpecDescriptionStyle}>{theme.description}</p> : null}
      </header>
      <div style={themeSpecBodyStyle}>
        {sections.includes("colors") ? <ThemeColorSwatches theme={theme} /> : null}
        {sections.includes("typography") ? <ThemeTypographyGraph theme={theme} sample={sample} /> : null}
      </div>
    </div>
  );
}

function normalizeColors(colors: Record<string, ThemeColorInput>): Record<string, DefinedThemeColor> {
  return Object.fromEntries(Object.entries(colors).map(([key, input]) => {
    const token = tokenName(key);
    const color = typeof input === "string" ? { value: input } : input;
    return [key, {
      key,
      label: color.label ?? readableName(key),
      value: color.value,
      cssVar: `--op-theme-color-${token}` as const,
      description: color.description,
      foreground: color.foreground,
    }];
  }));
}

function normalizeTypography(
  typography: Record<string, ThemeTypographyInput>,
  context: { colors: Record<string, DefinedThemeColor>; fonts: Record<string, string> },
): Record<string, DefinedThemeTypography> {
  return Object.fromEntries(Object.entries(typography).map(([key, input]) => {
    const token = tokenName(key);
    const fontFamily = resolveFontFamily(input.font, context.fonts);
    const color = input.color ? resolveColor(input.color, context.colors) : "currentColor";
    const lineHeight = input.lineHeight === undefined ? "1.2" : cssNumberOrLength(input.lineHeight);
    const weight = input.weight === undefined ? "400" : String(input.weight);
    const tracking = input.tracking === undefined ? "0" : cssLength(input.tracking);
    return [key, {
      key,
      label: input.label ?? readableName(key),
      font: input.font,
      fontFamily,
      size: cssLength(input.size),
      lineHeight,
      weight,
      tracking,
      color,
      transform: input.transform,
      sample: input.sample ?? DEFAULT_SAMPLE,
      cssVars: {
        fontFamily: `--op-theme-type-${token}-font-family`,
        fontSize: `--op-theme-type-${token}-font-size`,
        lineHeight: `--op-theme-type-${token}-line-height`,
        fontWeight: `--op-theme-type-${token}-font-weight`,
        letterSpacing: `--op-theme-type-${token}-letter-spacing`,
        color: `--op-theme-type-${token}-color`,
      },
    }];
  }));
}

function colorsToCssVars(colors: Record<string, DefinedThemeColor>): Record<string, string> {
  return Object.fromEntries(Object.values(colors).map((color) => [color.cssVar, color.value]));
}

function typographyToCssVars(typography: Record<string, DefinedThemeTypography>): Record<string, string> {
  const declarations: Record<string, string> = {};
  for (const typeStyle of Object.values(typography)) {
    declarations[typeStyle.cssVars.fontFamily] = typeStyle.fontFamily;
    declarations[typeStyle.cssVars.fontSize] = typeStyle.size;
    declarations[typeStyle.cssVars.lineHeight] = typeStyle.lineHeight;
    declarations[typeStyle.cssVars.fontWeight] = typeStyle.weight ?? "400";
    declarations[typeStyle.cssVars.letterSpacing] = typeStyle.tracking ?? "0";
    declarations[typeStyle.cssVars.color] = typeStyle.color ?? "currentColor";
  }
  return declarations;
}

function resolveFontFamily(font: string | undefined, fonts: Record<string, string>) {
  if (!font) return fonts.body ?? fonts.sans ?? DEFAULT_FONT_FAMILY;
  return fonts[font] ?? font;
}

function resolveColor(color: string, colors: Record<string, DefinedThemeColor>) {
  const token = colors[color];
  return token ? `var(${token.cssVar})` : color;
}

function cssLength(value: number | string) {
  return typeof value === "number" ? `${value}px` : value;
}

function cssNumberOrLength(value: number | string) {
  return typeof value === "number" ? String(value) : value;
}

function tokenName(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function readableName(value: string) {
  return tokenName(value)
    .split("-")
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

function withThemeVars(theme: DefinedOpenPressTheme, style: CSSProperties | undefined): CssVariableStyle {
  return {
    ...theme.cssVars,
    ...style,
  } as CssVariableStyle;
}

function joinClassNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

const themeSpecStyle: CSSProperties = {
  boxSizing: "border-box",
  display: "grid",
  gap: 28,
  width: "100%",
  height: "100%",
  padding: 64,
  background: "var(--op-theme-color-bg, #ffffff)",
  color: "var(--op-theme-color-ink, #111111)",
  fontFamily: "var(--op-theme-type-body-font-family, ui-sans-serif, system-ui, sans-serif)",
  overflow: "hidden",
};

const themeSpecHeaderStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 0.62fr)",
  alignItems: "end",
  gap: 32,
};

const themeSpecTitleStyle: CSSProperties = {
  margin: 0,
  fontFamily: "var(--op-theme-type-title-font-family, ui-serif, Georgia, serif)",
  fontSize: "56px",
  lineHeight: 1,
  fontWeight: 500,
  letterSpacing: 0,
};

const themeSpecDescriptionStyle: CSSProperties = {
  margin: 0,
  color: "var(--op-theme-color-muted, #666666)",
  fontSize: 18,
  lineHeight: 1.45,
};

const themeSpecBodyStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 0.82fr) minmax(0, 1.18fr)",
  gap: 28,
  alignItems: "start",
  minHeight: 0,
};

const sectionHeaderStyle: CSSProperties = {
  display: "grid",
  gap: 8,
};

const visualSectionStyle: CSSProperties = {
  display: "grid",
  gap: 16,
  minWidth: 0,
};

const eyebrowStyle: CSSProperties = {
  color: "var(--op-theme-color-accent, #d42a20)",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.18em",
  lineHeight: 1,
  textTransform: "uppercase",
};

const sectionTitleStyle: CSSProperties = {
  margin: 0,
  color: "var(--op-theme-color-ink, #111111)",
  fontSize: 24,
  lineHeight: 1.1,
  fontWeight: 700,
};

const swatchGridStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: 18,
};

const swatchCardStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "116px minmax(0, 1fr)",
  gap: 20,
  alignItems: "stretch",
  minHeight: 144,
  padding: 16,
  border: "1px solid color-mix(in srgb, var(--op-theme-color-line, #999999) 38%, transparent)",
  background: "color-mix(in srgb, var(--op-theme-color-surface-muted, #f8f8f8) 78%, transparent)",
};

const swatchPreviewStyle: CSSProperties = {
  minHeight: 108,
  border: "1px solid color-mix(in srgb, var(--op-theme-color-line, #999999) 46%, transparent)",
};

const swatchTextStyle: CSSProperties = {
  display: "grid",
  alignContent: "start",
  gap: 5,
  minWidth: 0,
};

const swatchLabelStyle: CSSProperties = {
  color: "var(--op-theme-color-ink, #111111)",
  fontSize: 24,
  lineHeight: 1.1,
  fontWeight: 700,
};

const codeStyle: CSSProperties = {
  display: "block",
  color: "var(--op-theme-color-muted, #666666)",
  fontFamily: "var(--op-theme-type-mono-font-family, ui-monospace, SFMono-Regular, Menlo, monospace)",
  fontSize: 12,
  lineHeight: 1.25,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
};

const codeMutedStyle: CSSProperties = {
  ...codeStyle,
  color: "color-mix(in srgb, var(--op-theme-color-muted, #666666) 78%, transparent)",
};

const descriptionStyle: CSSProperties = {
  margin: 0,
  color: "var(--op-theme-color-muted, #666666)",
  fontSize: 12,
  lineHeight: 1.25,
};

const typeGraphStyle: CSSProperties = {
  display: "grid",
  gap: 10,
};

const typeRowStyle: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "170px minmax(0, 1fr)",
  gap: 20,
  alignItems: "baseline",
  padding: "12px 0",
  borderTop: "1px solid color-mix(in srgb, var(--op-theme-color-line, #999999) 32%, transparent)",
};

const typeMetaStyle: CSSProperties = {
  display: "grid",
  gap: 5,
  minWidth: 0,
};

const typeLabelStyle: CSSProperties = {
  color: "var(--op-theme-color-ink, #111111)",
  fontSize: 16,
  lineHeight: 1.1,
};

const typeSpecStyle: CSSProperties = {
  color: "var(--op-theme-color-muted, #666666)",
  fontSize: 12,
  lineHeight: 1.2,
};

const typeSampleStyle: CSSProperties = {
  minWidth: 0,
  letterSpacing: 0,
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
};
