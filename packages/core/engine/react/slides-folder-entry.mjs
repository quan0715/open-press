import path from "node:path";

export function generateSlidesFolderPressModule({ pressDir, markers, pressPropsSource, generatedDir, pressScopeSource = "" }) {
  const imports = markers.map((marker, index) => {
    const target = path.join(pressDir, "slides", marker.id, "slide.tsx");
    return `import OpenPressGeneratedSlide${index} from "${relativeImportPath(generatedDir, target)}";`;
  }).join("\n");
  const indexRows = markers
    .map((marker) => {
      const notes = typeof marker.notes === "string" && marker.notes.trim()
        ? `, notes: ${JSON.stringify(marker.notes.trim())}`
        : "";
      return `  { id: "${marker.id}", skip: ${marker.skip === true}${notes} },`;
    })
    .join("\n");
  const children = markers.map((_, index) => `      <OpenPressGeneratedSlide${index} />`).join("\n");
  const scope = pressScopeSource.trim() ? `\n${pressScopeSource.trim()}\n` : "\n";

  return `import { Press as OpenPressGeneratedPress } from "@open-press/core";
${scope}
${imports}

export const __openpressSlidesIndex = [
${indexRows}
];

export default function GeneratedSlidesPress() {
  return (
    <OpenPressGeneratedPress ${pressPropsSource}>
${children}
    </OpenPressGeneratedPress>
  );
}
`;
}

export function relativeImportPath(fromDir, toFile) {
  let relative = path.relative(fromDir, toFile).replaceAll(path.sep, "/");
  if (!relative.startsWith(".")) relative = `./${relative}`;
  return relative;
}
