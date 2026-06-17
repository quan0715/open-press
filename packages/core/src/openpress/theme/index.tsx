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

export type OpenPressThemeInput = {
  name?: string;
  description?: string;
  colors?: Record<string, ThemeColorInput>;
  fonts?: Record<string, string>;
  typography?: Record<string, ThemeTypographyInput>;
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

export type DefinedOpenPressTheme = {
  name: string;
  description?: string;
  colors: Record<string, DefinedThemeColor>;
  fonts: Record<string, string>;
  typography: Record<string, DefinedThemeTypography>;
  cssVars: Record<string, string>;
};

export type ThemeVisualizationProps = HTMLAttributes<HTMLDivElement> & {
  theme: DefinedOpenPressTheme;
};

type CssVariableStyle = CSSProperties & Record<`--${string}`, string | number | undefined>;

const DEFAULT_FONT_FAMILY = "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, \"Segoe UI\", sans-serif";
const DEFAULT_SAMPLE = "OpenPress turns intent into editable pages.";

export function defineTheme<const T extends OpenPressThemeInput>(input: T): DefinedOpenPressTheme {
  const fonts = { ...input.fonts };
  const colors = normalizeColors(input.colors ?? {});
  const typography = normalizeTypography(input.typography ?? {}, { colors, fonts });
  const cssVars = {
    ...colorsToCssVars(colors),
    ...typographyToCssVars(typography),
  };

  return {
    name: input.name ?? "OpenPress Theme",
    description: input.description,
    colors,
    fonts,
    typography,
    cssVars,
  };
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
