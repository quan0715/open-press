# QDoc PDF Output Maintenance

## Single Source Of PDF Output

The project maintains one PDF generation path:

```text
document/content/*.md
  -> engine/cli.mjs export/render
  -> React print route (?print=1)
  -> engine/chrome-pdf.mjs (Chrome print media, A4 paper options)
  -> Chrome DevTools Page.printToPDF
  -> <config.pdf.filename>
```

`engine/chrome-pdf.mjs` is the only module that talks to Chrome DevTools for PDF output. It owns Chrome startup, tab discovery, readiness polling, `Page.printToPDF`, process cleanup, and temporary profile cleanup.

The maintained entry points are:

- `npm run qdoc:pdf`
- `node engine/cli.mjs pdf .`
- `npm run qdoc:deploy`, which builds the same PDF into `.deploy/<project>/<config.pdf.filename>`

The local workbench PDF action is a thin UI wrapper around the same CLI path. It may call `/__qdoc/local-pdf-export`, but that endpoint must only run `node engine/cli.mjs pdf .` and then serve `dist-react/<config.pdf.filename>` through `/__qdoc/local-pdf-file`. It must not inspect, serialize, or print the current reader DOM.

Do not add another browser-current-view PDF endpoint. The removed `/__qdoc/pdf` and `/__qdoc/current-print` path serialized the visible reader DOM, carried a second print stylesheet, and created a second output contract. Public buttons should open the deployed static PDF asset. Local workbench buttons may generate the latest local PDF only by calling the maintained CLI PDF command.

## Page Count Notes

Use `pdfinfo <config.pdf.filename>` for the physical PDF page count. Use the in-app page count only for reader navigation diagnostics.

The non-chapter surfaces are the cover, TOC, and back cover. They can explain a three-page offset between chapter/page-label counts and full document surface counts. Before treating a count mismatch as an output bug, verify whether the comparison includes these three surfaces.

The official PDF artifact must include:

- cover
- TOC
- all chapter pages
- back cover

## Readiness Contract

The print route is `/?print=1`. The React renderer mounts `QDocPrintDocument`, then client-side pagination finishes and sets:

```html
data-qdoc-print-document="true"
data-qdoc-pagination="ready"
```

`waitForQDocPrintReady` in `engine/chrome-pdf.mjs` waits for that state and returns the number of `.qdoc-html-page` nodes under `.qdoc-public-page`.

Pagination readiness is not only the React state flag. The print route waits until fonts and images are loaded before measuring page breaks, because late image decode can expand figures after pagination and push content beyond the footer. The paginator measures the actual block bottom, including bottom margin, against the fixed page body instead of relying only on `scrollHeight`. The Chrome PDF module keeps DevTools on print media so measurement CSS and PDF output CSS match, keeps the measurement page visible under print CSS, fixes the paper size through `Page.printToPDF` A4 options, repeats the asset wait after pagination, and refuses to call `Page.printToPDF` while any page body overflows its fixed page frame.

If the PDF has blank pages, debug in this order:

1. Run `npm run qdoc:render`.
2. Run `npm run qdoc:pdf -- --output .qdoc/tmp/smoke.pdf --no-build`.
3. Check page count with `pdfinfo`.
4. Extract text with `pdftotext -f 1 -l 3`.
5. Render sample pages with `pdftoppm`.
6. Inspect `/?print=1` and check whether any `.page-body` has `scrollHeight > clientHeight`. If page body overflows, debug asset timing or pagination before changing print CSS.
7. Only then inspect pagination or print CSS.

## Deployment Contract

Deploy writes:

```text
.deploy/<project>/<config.pdf.filename>
.deploy/<project>/qdoc/deploy.json
.deploy/<project>/_headers
```

`deploy.json` exposes the static PDF href:

```json
{
  "pdf": "/<config.pdf.filename>",
  "deployed_at": "..."
}
```

The public reader reads this metadata through `QDocDeploymentInfo.pdf`. Its PDF button is an open-file action, not a generation action. The local workbench intentionally differs: its PDF button regenerates the latest local PDF through the CLI wrapper described above.

On Cloudflare Pages, that href is the relative asset path `/<config.pdf.filename>`. In local workbench deploy flows, the deploy endpoint may return the absolute Cloudflare preview PDF URL parsed from Wrangler output so the same button opens the real deployed artifact instead of a dev-server path.

## Ownership Rules

- Keep PDF generation in `engine/cli.mjs` and `engine/chrome-pdf.mjs`.
- Keep page layout in React print mode and `src/qdoc/pagination.ts`.
- Keep QDoc page geometry in `document/theme/base/page-contract.css`.
- Keep global document theme rules in `document/theme/base/*.css`.
- Keep named document component and specimen styles in `document/theme/patterns/*.css` or `document/components/*/style.css`.
- Keep exported reader controls in `document/theme/shell/*.css`.
- Treat `public/qdoc/report.css` as generated output from `engine/file-utils.mjs`, not source.
- Keep static PDF delivery in Cloudflare Pages assets and `_headers`.
- Do not reintroduce client-side PDF libraries such as `html2canvas` or `jspdf`.
- Do not reintroduce a current-view POST endpoint for PDF output.
- Do not duplicate print CSS into a server-side HTML string.
