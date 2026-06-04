import { Frame, Press } from "@open-press/core";
import { mdxSource } from "@open-press/core/mdx";
import { Sections } from "@open-press/core/manuscript";
import Page from "./components/Page";

function Cover() {
  return (
    <Frame
      frameKey="cover"
      role="manuscript.cover"
      chrome={false}
      className="reader-page--cover"
      data-page-title="Title page"
      aria-labelledby="paper-title"
    >
      <div className="paper-cover">
        <p className="paper-cover-date">May 18, 2026 – This is a non-peer reviewed Express letter submitted to J SEDI</p>
        <p className="paper-cover-lead">This is a non-peer reviewed Express letter submitted to J SEDI</p>
        <p className="paper-cover-short-title">Your short title goes here</p>
        <h1 id="paper-title" className="paper-title">
          Your article title goes here
          <sup>*</sup>
        </h1>
        <p className="paper-author-contact-note">
          <span aria-hidden="true">∗</span> Corresponding author:
          firstauthor@university.jp
        </p>

        <p className="paper-author-line" aria-label="Authors">
          Name Firstauthor<sup>1</sup>, Name Secondauthor<sup>2</sup>, Name
          Thirdauthor<sup>1,3</sup>
        </p>

        <ol className="paper-author-affiliations" aria-label="Author affiliations">
          <li className="paper-author">
            <p className="paper-author-affiliation">
              1 Department of Earth Sciences, A University, City, Country
            </p>
          </li>
          <li className="paper-author">
            <p className="paper-author-affiliation">
              2 School of Earth Sciences, Another University, City, Country
            </p>
          </li>
          <li className="paper-author">
            <p className="paper-author-affiliation">
              3 Center for Studying Cool Things, University of X, City, Country
            </p>
          </li>
        </ol>

        <section className="paper-contributions" aria-label="Author contributions">
          <p>
            <span className="paper-section-label">Author contributions:</span>{" "}
            Conceptualization: Name Firstauthor, Name Thirdauthor. Formal
            Analysis: Name Firstauthor, Name Secondauthor.
          </p>
          <p>
            <span className="paper-section-label">Writing - Original draft:</span>{" "}
            Name Firstauthor.{" "}
            <span className="paper-section-label">
              Writing - Review &amp; Editing:
            </span>{" "}
            Name Firstauthor, Name Secondauthor, Name Thirdauthor.
          </p>
        </section>

        <section className="paper-abstract" aria-label="Abstract">
          <p>
            <span className="paper-abstract-label">Abstract</span> The text for the
            first abstract goes here. This should be in English, no longer than
            200 words, and should not include references.
          </p>
        </section>

        <section className="paper-nontechnical-summary" aria-label="Non-technical summary">
          <p>
            <span className="paper-abstract-label">Non-technical summary</span> The
            text for the non-technical summary goes here. Again, no longer than
            200 words, no reference.
          </p>
        </section>
      </div>
    </Frame>
  );
}

export default function AcademicPaperPress() {
  return (
    <Press
      slug="academic-paper"
      title="Your article title goes here"
      page="a4"
      componentsDir="./components"
      mediaDir="./media"
      sources={[
        mdxSource({ id: "story", preset: "section-folders", root: "academic-paper/chapters" }),
      ]}
    >
      <Cover />
      <Sections source="story" page={Page} />
    </Press>
  );
}
