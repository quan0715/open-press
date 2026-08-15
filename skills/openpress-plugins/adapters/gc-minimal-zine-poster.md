# Minimal Zine Poster Adapter

Adapts output from `LiamGvchi/gc-minimal-zine-poster` into OpenPress document covers, editorial posters, and title frames using Agent Image Generation.

## Workflow

1. **Craft Zine Prompt Recipe**:
   - Follow the `gc-minimal-zine-poster` design rules:
     - 70%–90% generous whitespace on warm textured cream / linen paper.
     - A single, distinct focal visual event (e.g. ceramic dripper, botanical specimen, vintage stamp, architectural window).
     - Restrained serif, typewriter, or Japanese kanji touches.
     - Single clear high-saturation accent color (terracotta, cinnabar red, mustard amber).
     - Natural paper grain, letterpress, risograph ink imperfections.
     - Ban: glossy commercial 3D render, dark futuristic glow, neon gradients, cluttered photo collages.

2. **Invoke Agent Image Generation**:
   - Call `generate_image` with `AspectRatio: '3:4'` (or `'2:3'` for portrait A4, `'16:9'` for slides).
   - Save the generated image file to `press/<slug>/media/cover.jpg` (and `media/back-cover.jpg`).

3. **OpenPress Cover Integration**:
   - Place component at `press/<slug>/components/figures/CoverPoster.tsx`:

```tsx
interface CoverPosterProps {
  src?: string;
  alt?: string;
  className?: string;
}

export default function CoverPoster({
  src = "/openpress/media/cover.jpg",
  alt = "文件封面海報",
  className = "",
}: CoverPosterProps) {
  return (
    <div
      className={`relative h-full w-full overflow-hidden bg-[#faf6ef] ${className}`}
      data-openpress-component="CoverPoster"
    >
      <img
        src={src}
        alt={alt}
        className="h-full w-full object-cover"
      />
    </div>
  );
}
```

4. **Usage in `press/<slug>/press.tsx`**:

```tsx
<Frame frameKey="cover" role="manuscript.cover" className="reader-page--cover !bg-[#faf6ef]">
  <CoverPoster src="/openpress/<slug>/media/cover.jpg" alt="OpenPress 封面" />
</Frame>
```
