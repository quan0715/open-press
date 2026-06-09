import path from "node:path";

export function generateSlidesFolderPressModule({ pressDir, markers, pressPropsSource, generatedDir }) {
  const imports = markers.map((marker, index) => {
    const target = path.join(pressDir, "slides", marker.id, "slide.tsx");
    return `import Slide${index} from "${relativeImportPath(generatedDir, target)}";`;
  }).join("\n");
  const indexRows = markers
    .map((marker) => {
      const notes = typeof marker.notes === "string" && marker.notes.trim()
        ? `, notes: ${JSON.stringify(marker.notes.trim())}`
        : "";
      return `  { id: "${marker.id}", skip: ${marker.skip === true}${notes} },`;
    })
    .join("\n");
  const children = markers.map((_, index) => `      <Slide${index} />`).join("\n");

  return `import { Press } from "@open-press/core";
${imports}

export const __openpressSlidesIndex = [
${indexRows}
];

export default function GeneratedSlidesPress() {
  return (
    <Press ${pressPropsSource}>
${children}
    </Press>
  );
}
`;
}

export function relativeImportPath(fromDir, toFile) {
  let relative = path.relative(fromDir, toFile).replaceAll(path.sep, "/");
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative;
}
