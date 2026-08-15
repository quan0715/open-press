# Minimal Zine Poster Adapter

Adapts output from `LiamGvchi/gc-minimal-zine-poster` into OpenPress document covers, editorial posters, and title frames using Agent Image Generation.

## If It Is Not Installed

Tell the user that Minimal Zine Poster is an optional external skill and point
them to its [installation instructions](https://github.com/LiamGvchi/gc-minimal-zine-poster/blob/main/README.zh-CN.md).
Once it is available in the current agent workspace, continue with this adapter.

## Workflow

1. **Craft Zine Prompt Recipe**:
   - Follow the `gc-minimal-zine-poster` design rules:
     - 70%–90% generous whitespace on warm textured cream / linen paper.
     - A single, distinct focal visual event (e.g. ceramic dripper, botanical specimen, vintage stamp, architectural window).
     - Restrained serif, typewriter, or Japanese kanji touches.
     - Single clear high-saturation accent color (terracotta, cinnabar red, mustard amber).
     - Natural paper grain, letterpress, risograph ink imperfections.
     - Ban: glossy commercial 3D render, dark futuristic glow, neon gradients, cluttered photo collages.

2. **Propose Before Generating**:
   - Present the purpose, composition, style, exact prompt, and destination.
   - Wait for the user's next message to approve that exact proposal before calling the available image generator.
   - After approval, save the generated image file to `press/<slug>/media/cover.jpg` (and `media/back-cover.jpg`).

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
