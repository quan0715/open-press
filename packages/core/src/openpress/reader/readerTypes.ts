import type { IndexedHtmlPage } from "../document-model";
import type { HtmlPageBlock } from "../document-model";

export type DisplayPage = IndexedHtmlPage & Pick<HtmlPageBlock, "source" | "frameKey">;
