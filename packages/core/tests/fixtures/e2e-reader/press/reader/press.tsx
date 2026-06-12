import { Frame, PageFolio, Press } from "@open-press/core";

const pageClassName = "reader-e2e-page";
const bodyClassName = "reader-e2e-page-body";
const folioClassName = "reader-e2e-page-folio";

export default function ReaderE2EPress() {
  return (
    <Press slug="reader" title="Reader E2E Fixture" page="a4">
      <Frame frameKey="cover" role="manuscript.cover" className={pageClassName} data-page-title="Reader E2E Fixture">
        <article className={bodyClassName}>
          <p>Reader E2E Fixture</p>
          <h1>Published Reader</h1>
          <p>
            This deterministic fixture keeps public reader behavior tests away
            from dogfood content and visual contracts.
          </p>
          <a href="#topic-target">Go to topic target</a>
        </article>
        <PageFolio className={folioClassName} />
      </Frame>

      <Frame frameKey="chapter" role="manuscript.content" className={pageClassName} data-page-title="Chapter Bookmark">
        <article className={bodyClassName}>
          <h2 id="chapter-start" data-chapter="01">Chapter Bookmark</h2>
          <p>
            This page gives the public reader an h2 bookmark with a stable page
            target.
          </p>
        </article>
        <PageFolio className={folioClassName} />
      </Frame>

      <Frame frameKey="section" role="manuscript.content" className={pageClassName} data-page-title="Section Bookmark">
        <article className={bodyClassName}>
          <h3 id="section-start" data-section="01.1">Section Bookmark</h3>
          <p>
            This page gives the public reader an h3 bookmark and a keyboard
            navigation target.
          </p>
        </article>
        <PageFolio className={folioClassName} />
      </Frame>

      <Frame frameKey="topic" role="manuscript.content" className={pageClassName} data-page-title="Topic Bookmark">
        <article className={bodyClassName}>
          <h4 id="topic-target" data-topic="01.1.1">Topic Bookmark</h4>
          <p>
            topic-search-token appears once so public reader search can jump to
            this page without relying on source files or a backend.
          </p>
        </article>
        <PageFolio className={folioClassName} />
      </Frame>
    </Press>
  );
}
