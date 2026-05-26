import { Frame, MdxArea, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, type SectionsPageProps } from "@open-press/core/manuscript";

export const config = {
  title: "Slide Deck",
  subtitle: "16:9 OpenPress slides",
  organization: "OpenPress",
  page: "slide-16-9",
};

export const sources = {
  slides: mdxSource({ preset: "section-folders", root: "chapters" }),
};

function SlidePage({
  frameKey,
  chainId,
  pageIndex,
  totalPages,
  sectionSlug,
}: SectionsPageProps) {
  return (
    <Frame
      frameKey={frameKey}
      role="slide.page"
      chrome={false}
      className="reader-page--slide"
      data-page-index={pageIndex}
      data-total-pages={totalPages}
      data-section-id={sectionSlug}
    >
      <div className="page-frame">
        <main className="page-body">
          <MdxArea chainId={chainId} overflow="truncate" />
        </main>
        <footer className="slide-footer" aria-hidden="true">
          {pageIndex + 1}
        </footer>
      </div>
    </Frame>
  );
}

export default function SlideDeckDocument() {
  return (
    <Press>
      <Sections source="slides" page={SlidePage} />
    </Press>
  );
}

