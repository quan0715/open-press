import type { IndexedHtmlPage } from "./indexes";
import type { HtmlPageBlock } from "./types";

export type DisplayPage = IndexedHtmlPage & Pick<HtmlPageBlock, "source">;
