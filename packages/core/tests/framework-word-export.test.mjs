import { test } from "node:test";
import assert from "node:assert/strict";
import { buildVisualWordDocument, buildWordDocument, wordFilenameFromPdfFilename } from "../engine/output/word-docx.mjs";

test("buildWordDocument creates a DOCX package from a page Press reader document", () => {
  const docx = buildWordDocument({
    document: {
      meta: {
        title: "Fixture & Report",
        subtitle: "Export preview",
        organization: "OpenPress",
        type: "pages",
      },
      theme: {
        pageWidth: "210mm",
        pageHeight: "297mm",
      },
      blocks: [
        {
          role: "manuscript.cover",
          html: `
            <section>
              <h1>Cover & Growth</h1>
              <p>Opening <strong>bold</strong> text.</p>
              <ul><li>First item</li><li>Second item</li></ul>
              <table>
                <tr><th>Metric</th><th>Value</th></tr>
                <tr><td>ARR</td><td>$1M</td></tr>
              </table>
            </section>
          `,
        },
        {
          role: "manuscript.content",
          html: "<section><h2>Next Page</h2><p>Done.</p></section>",
        },
      ],
    },
    createdAt: new Date("2026-06-22T00:00:00.000Z"),
  });

  assert.equal(docx.subarray(0, 4).toString("binary"), "PK\u0003\u0004");
  const documentXml = extractStoredZipEntry(docx, "word/document.xml");
  assert.match(documentXml, /Fixture &amp; Report/);
  assert.match(documentXml, /Cover &amp; Growth/);
  assert.match(documentXml, /<w:b\/>/);
  assert.match(documentXml, /First item/);
  assert.match(documentXml, /<w:tbl>/);
  assert.match(documentXml, /<w:br w:type="page"\/>/);
  assert.match(documentXml, /<w:pgSz w:w="11906" w:h="16838"\/>/);

  const coreXml = extractStoredZipEntry(docx, "docProps/core.xml");
  assert.match(coreXml, /Fixture &amp; Report/);
  assert.match(coreXml, /2026-06-22T00:00:00.000Z/);
});

test("buildWordDocument rejects slide Press reader documents", () => {
  assert.throws(
    () => buildWordDocument({ document: { meta: { type: "slides", title: "Deck" }, blocks: [] } }),
    /Word export only supports page Press documents/,
  );
});

test("buildVisualWordDocument creates a DOCX package from rendered page snapshots", () => {
  const docx = buildVisualWordDocument({
    document: {
      meta: { title: "Visual Report", type: "pages" },
      theme: { pageWidth: "210mm", pageHeight: "297mm" },
    },
    images: [
      { filename: "page-001.png", data: Buffer.from("PNGDATA"), contentType: "image/png", alt: "Visual Report page 1" },
      { filename: "page-002.png", data: Buffer.from("PNGDATA2"), contentType: "image/png", alt: "Visual Report page 2" },
    ],
    createdAt: new Date("2026-06-22T00:00:00.000Z"),
  });

  const documentXml = extractStoredZipEntry(docx, "word/document.xml");
  assert.match(documentXml, /<w:drawing>/);
  assert.match(documentXml, /r:embed="rIdImage1"/);
  assert.match(documentXml, /r:embed="rIdImage2"/);
  assert.doesNotMatch(documentXml, /<w:br w:type="page"\/>/);
  assert.match(documentXml, /<w:pgMar w:top="0" w:right="0" w:bottom="0" w:left="0" w:header="0" w:footer="0" w:gutter="0"\/>/);
  assert.match(documentXml, /<wp:extent cx="7560310" cy="10692130"\/>/);

  const relationshipsXml = extractStoredZipEntry(docx, "word/_rels/document.xml.rels");
  assert.match(relationshipsXml, /Target="media\/page-001.png"/);
  assert.match(relationshipsXml, /Target="media\/page-002.png"/);

  const contentTypes = extractStoredZipEntry(docx, "[Content_Types].xml");
  assert.match(contentTypes, /<Default Extension="png" ContentType="image\/png"\/>/);

  const imageEntry = extractStoredZipEntry(docx, "word/media/page-001.png");
  assert.equal(imageEntry, "PNGDATA");
});

test("wordFilenameFromPdfFilename derives a DOCX filename from the PDF filename", () => {
  assert.equal(wordFilenameFromPdfFilename("annual-report.pdf"), "annual-report.docx");
  assert.equal(wordFilenameFromPdfFilename("document"), "document.docx");
});

function extractStoredZipEntry(buffer, name) {
  let offset = 0;
  while (offset < buffer.length - 30) {
    const signature = buffer.readUInt32LE(offset);
    if (signature !== 0x04034b50) break;
    const compression = buffer.readUInt16LE(offset + 8);
    const compressedSize = buffer.readUInt32LE(offset + 18);
    const fileNameLength = buffer.readUInt16LE(offset + 26);
    const extraLength = buffer.readUInt16LE(offset + 28);
    const fileName = buffer.subarray(offset + 30, offset + 30 + fileNameLength).toString("utf8");
    const dataStart = offset + 30 + fileNameLength + extraLength;
    const dataEnd = dataStart + compressedSize;
    if (fileName === name) {
      assert.equal(compression, 0, `${name} should use stored ZIP entries in this test`);
      return buffer.subarray(dataStart, dataEnd).toString("utf8");
    }
    offset = dataEnd;
  }
  throw new Error(`Missing ZIP entry: ${name}`);
}
