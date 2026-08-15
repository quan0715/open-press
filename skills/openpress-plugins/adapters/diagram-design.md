# Diagram Design Adapter

Adapts output from the `diagram-design` skill into native OpenPress React Figure components.

## Target Component Structure

Place generated components at either:
- `press/<slug>/components/figures/<Name>Figure.tsx` (Recommended)
- `press/<slug>/components/<Name>Figure/index.tsx`

### Example Component Template

```tsx
interface FigureProps {
  caption?: string;
  className?: string;
}

export default function ArchitectureDiagramFigure({
  caption = "系統架構圖：使用者端、API 閘道與後端微服務的互動流程",
  className = "",
}: FigureProps) {
  return (
    <figure
      className={`!mx-auto !my-[var(--openpress-space-4)] !w-full break-inside-avoid ${className}`}
      data-openpress-component="ArchitectureDiagramFigure"
      aria-label="系統架構圖"
    >
      <svg
        role="img"
        viewBox="0 0 800 400"
        className="!h-auto !w-full"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Nodes, connectors, badges, and labels styled with OpenPress tokens */}
      </svg>
      {caption && <figcaption>{caption}</figcaption>}
    </figure>
  );
}
```

## Styling & Token Rules

1. **Colors**: Use CSS variables for theme compatibility:
   - Surface / Card backgrounds: `var(--openpress-color-surface)` or `var(--openpress-color-document)`
   - Primary text: `var(--openpress-color-text)`
   - Muted labels / borders: `var(--openpress-color-muted)` / `var(--openpress-color-border)`
   - Accent highlights: `var(--openpress-color-accent)`
2. **Typography**:
   - System fonts: `var(--openpress-font-sans)` / `var(--openpress-font-mono)`
   - Keep node labels concise; put explanatory prose in the document or `<figcaption>`.
3. **Accessibility**:
   - Always include `role="img"` and descriptive `aria-label` or `<title>` within the `<svg>`.
