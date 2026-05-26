import { Frame, MdxArea, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections, type SectionsPageProps } from "@open-press/core/manuscript";

export const config = {
  title: "Social Post",
  subtitle: "Square announcement card",
  organization: "OpenPress",
  page: "social-square",
};

export const sources = {
  posts: mdxSource({ preset: "section-folders", root: "chapters" }),
};

function PostPage({
  frameKey,
  chainId,
  pageIndex,
  totalPages,
  sectionSlug,
}: SectionsPageProps) {
  return (
    <Frame
      frameKey={frameKey}
      role="social.post"
      chrome={false}
      className="reader-page--social-post"
      data-page-index={pageIndex}
      data-total-pages={totalPages}
      data-section-id={sectionSlug}
    >
      <div className="page-frame">
        <main className="page-body">
          <MdxArea chainId={chainId} overflow="truncate" />
        </main>
      </div>
    </Frame>
  );
}

export default function SocialPostDocument() {
  return (
    <Press>
      <Sections source="posts" page={PostPage} />
    </Press>
  );
}

