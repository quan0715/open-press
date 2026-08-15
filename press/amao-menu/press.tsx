import { Frame, MdxArea, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections } from "@open-press/core/manuscript";
import type { SectionsPageProps } from "@open-press/core/manuscript";
import { defineDocumentTheme } from "@open-press/core/theme";
import AmaoCoverPoster from "./components/figures/AmaoCoverPoster.tsx";
import AmaoBackCover from "./components/figures/AmaoBackCover.tsx";

const amaoTheme = defineDocumentTheme({
  name: "Amao Coffee Menu Theme",
  description: "A printable Japanese/Nordic minimal editorial zine menu for Amao Coffee Roasters.",
  colors: {
    bg: "#faf6ef",
    paper: "#faf6ef",
    surface: "#faf6ef",
    surfaceMuted: "#f5ede0",
    ink: "#1c1917",
    muted: "#78716c",
    line: "#e7e5e4",
    accent: "#c2410c",
    link: "#c2410c",
    quote: "#78716c",
    marker: "#c2410c",
  },
  fonts: {
    body: '"Noto Serif TC", "Songti TC", "Source Han Serif TC", "PMingLiU", serif',
    serif: '"Noto Serif TC", "Songti TC", "Source Han Serif TC", "PMingLiU", serif',
    mono: '"SFMono-Regular", Menlo, Consolas, monospace',
    display: '"Noto Serif TC", "Songti TC", "Source Han Serif TC", "PMingLiU", serif',
  },
});

function MenuContentPage({ frameKey, chainId, pageIndex, totalPages }: SectionsPageProps) {
  return (
    <Frame frameKey={frameKey} role="manuscript.content" className="reader-page--menu-content w-full !bg-[#faf6ef] !text-[#1c1917]">
      <div className="page-frame grid h-full min-h-[inherit] w-full !max-w-none grid-rows-[minmax(0,1fr)_auto] !bg-[#faf6ef] px-[20mm] py-[18mm] !text-[#1c1917]">
        {/* Page Body */}
        <main className="page-body w-full !max-w-none min-h-0">
          <MdxArea chainId={chainId} className="openpress-prose !w-full !max-w-none h-full min-h-0 !text-[#1c1917]" />
        </main>

        {/* Page Footer */}
        <footer className="page-footer flex w-full !max-w-none items-center justify-between border-t border-[#292524]/20 pt-[3mm] [font-family:'Noto_Serif_TC',serif] text-[8pt] tracking-[0.14em] !text-[#a8a29e]">
          <span className="text-[7.5pt] uppercase tracking-[0.2em] !text-[#78716c]">
            AMAO COFFEE ROASTERS · 自家焙煎
          </span>
          <span className="font-mono !text-[#78716c]">
            PAGE {pageIndex + 2} / {totalPages + 2}
          </span>
        </footer>
      </div>
    </Frame>
  );
}

export default function AmaoMenuPress() {
  return (
    <Press
      slug="amao-menu"
      title="Amao Coffee Menu"
      type="pages"
      page="a4"
      theme={amaoTheme}
      componentsDir="./components"
      mediaDir="./media"
      sources={[
        mdxSource({ id: "menu", preset: "section-folders", root: "amao-menu/chapters" }),
      ]}
    >
      {/* 1. Cover Page (Zine Poster Artwork) */}
      <Frame frameKey="cover" role="manuscript.cover" className="reader-page--menu-cover w-full !bg-[#faf6ef]">
        <AmaoCoverPoster src="/openpress/media/cover.jpg" />
      </Frame>

      {/* 2. Menu Content Pages */}
      <Sections source="menu" page={MenuContentPage} />

      {/* 3. Back Cover Page (Zine Colophon Artwork) */}
      <Frame frameKey="back-cover" role="manuscript.back-cover" className="reader-page--menu-back-cover w-full !bg-[#faf6ef]">
        <AmaoBackCover src="/openpress/media/back-cover.jpg" />
      </Frame>
    </Press>
  );
}
