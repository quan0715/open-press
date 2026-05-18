import type { QDocIndexedHtmlPage } from "./indexes";
import type { QDocHtmlPageBlock } from "./types";

export type QDocDisplayPage = QDocIndexedHtmlPage & Pick<QDocHtmlPageBlock, "source">;
