# Jensen Huang Two-Page Resume Design

## Objective

Replace the fictional product-engineer resume in the `resume` Press with an
unofficial, two-page executive resume for Jensen Huang. The example should show
that OpenPress can turn verifiable public material into a concise, printable
professional document.

## Editorial Approach

Use an executive resume rather than a biography or an achievement collage.
Organize the document around roles, responsibilities, education, and selected
public honors. Keep the language factual and restrained.

The document must not imply endorsement by Jensen Huang or NVIDIA. It must not
include invented contact details, private information, skill ratings, personal
traits presented as facts, or company performance attributed solely to one
person.

## Page Structure

### Page 1 — Executive Profile

- Name and current role: Founder, President and CEO, NVIDIA.
- A compact executive summary based on official biographies and filings.
- NVIDIA tenure from 1993 to the present.
- Selected leadership scope and documented company milestones, clearly worded
  as company developments rather than personal claims.

### Page 2 — Earlier Career and Credentials

- LSI Logic and AMD experience.
- B.S. in electrical engineering from Oregon State University.
- M.S. in electrical engineering from Stanford University.
- A short selection of honors supported by authoritative sources.
- A visible source note linking the reader to the principal references.

## Visual Direction

Retain the current compact editorial resume shell and its strong typographic
hierarchy. Replace the orange accent with a restrained NVIDIA-associated green,
but do not use NVIDIA's logo or reproduce an official corporate template.

The page header identifies the artifact as `Public-source profile · Unofficial
resume`. Remove fictional contact fields. Both pages remain A4 and use the
existing `Sections` pagination model.

## Sources

Use first-party or regulatory sources:

- NVIDIA board biography for current role, founding date, prior experience, and
  education.
- NVIDIA's SEC filings for role history and precise career descriptions.
- Oregon State University for degree and alumni information.
- NVIDIA annual reports or official institutional pages for any selected honor.

Where first-party sources disagree on an exact early-career start date, omit the
disputed year or use the SEC filing's wording. Do not resolve discrepancies by
guessing.

## Files in Scope

- `press/resume/press.tsx`
- `press/resume/chapters/01-profile.mdx`
- `press/resume/chapters/02-selected-work.mdx`
- `press/resume/theme/tokens.css` only if needed for the approved visual change

The resume slug remains `resume`, so the existing Showcase route and gallery
entry continue to work without a routing change. Marketing copy may be updated
only where it still describes the example as fictional.

## Validation

- Run the full OpenPress build after source changes.
- Confirm the resume renders as exactly two A4 pages.
- Review both pages in Workbench for overflow, clipping, hierarchy, source-note
  readability, and pending comments.
- Confirm generated output contains no fictional Mina Chen content.
- Confirm the disclaimer is visible and the document does not appear official.
- Do not deploy or publish as part of this change.
