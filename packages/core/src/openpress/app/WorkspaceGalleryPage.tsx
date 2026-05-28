import type { WorkspaceManifest, WorkspaceManifestPress } from "../document-model";

interface Props {
  manifest: WorkspaceManifest;
  // Called when the reader navigates into a specific Press. The host
  // is responsible for routing (history.pushState, hash, etc.); the
  // gallery just emits the chosen slug.
  onSelectPress: (press: WorkspaceManifestPress) => void;
}

// Reader landing page for multi-Press workspaces. Shows a card per
// Press child of the <Workspace>; clicking a card hands off to the
// reader to load that Press's document.json.
//
// Single-Press workspaces skip the gallery entirely — the reader
// loads document.json directly and routes straight into the document.
export function WorkspaceGalleryPage({ manifest, onSelectPress }: Props) {
  const heading = manifest.name ?? "Workspace";

  return (
    <main className="openpress-workspace-gallery" aria-labelledby="workspace-gallery-heading">
      <header className="openpress-workspace-gallery__header">
        <p className="openpress-workspace-gallery__eyebrow">Workspace</p>
        <h1 id="workspace-gallery-heading">{heading}</h1>
        <p className="openpress-workspace-gallery__count">
          {manifest.presses.length} documents in this project
        </p>
      </header>

      <ul className="openpress-workspace-gallery__grid" role="list">
        {manifest.presses.map((press) => (
          <li key={press.slug || "root"} className="openpress-workspace-gallery__item">
            <button
              type="button"
              className="openpress-workspace-gallery__card"
              onClick={() => onSelectPress(press)}
              aria-label={`Open ${press.title}`}
            >
              <span
                className="openpress-workspace-gallery__thumb"
                style={pressThumbStyle(press)}
                aria-hidden="true"
              >
                <span className="openpress-workspace-gallery__thumb-frame" />
              </span>
              <span className="openpress-workspace-gallery__body">
                <span className="openpress-workspace-gallery__slug">
                  /{press.slug || ""}
                </span>
                <span className="openpress-workspace-gallery__title">{press.title}</span>
                <span className="openpress-workspace-gallery__stats">
                  {press.pageCount} pages
                  {press.page?.pageLabel ? ` · ${press.page.pageLabel}` : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

function pressThumbStyle(press: WorkspaceManifestPress): React.CSSProperties {
  const ratio = press.page?.pageAspectRatio;
  return ratio ? { aspectRatio: ratio } : {};
}
