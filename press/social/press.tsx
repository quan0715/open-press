import { Press, Text } from "@open-press/core";
import { SocialFrame } from "./components/SocialFrame";

const HERO_CLASS = "relative z-[2] grid max-w-[740px] gap-[24px]";
const COVER_HERO_CLASS =
  "relative z-[2] grid max-w-[588px] gap-[17px] border border-[var(--social-line-strong)] bg-white/92 px-[38px] pb-[38px] pt-[34px]";
const KICKER_CLASS =
  "m-0 text-[17px] font-semibold uppercase tracking-[0.12em] text-[var(--social-accent)] [font-family:var(--openpress-font-mono)]";
const TITLE_CLASS =
  "m-0 text-[112px] font-medium leading-[1.02] tracking-normal text-[var(--social-ink)] [font-family:var(--openpress-font-serif)]";
const COVER_TITLE_CLASS = `${TITLE_CLASS} max-w-[9.4ch] text-[96px] leading-[0.98]`;
const COMPACT_TITLE_CLASS = `${TITLE_CLASS} max-w-[9ch] text-[76px] leading-[1.08]`;
const SUBTITLE_CLASS =
  "m-0 text-[38px] italic leading-[1.2] text-[var(--social-muted)] [font-family:var(--openpress-font-serif)]";
const COVER_SUBTITLE_CLASS = `${SUBTITLE_CLASS} text-[32px]`;
const LEDE_CLASS =
  "m-0 max-w-[27ch] text-[28px] leading-[1.55] text-[rgb(8_9_10_/_78%)] [font-family:var(--openpress-font-serif)]";
const COVER_LEDE_CLASS = `${LEDE_CLASS} max-w-[28ch] text-[24px]`;
const MODEL_LEDE_CLASS =
  "m-0 max-w-[34ch] text-[26px] leading-[1.55] text-[rgb(8_9_10_/_78%)] [font-family:var(--openpress-font-body)]";
const SIDE_NOTE_CLASS =
  "absolute bottom-[36px] right-0 z-[2] grid w-[270px] border border-[var(--social-line-strong)] bg-white/84";
const SIDE_NOTE_ITEM_CLASS =
  "block border-b border-[var(--social-line)] px-[22px] py-[18px] text-[15px] uppercase tracking-[0.03em] text-[var(--social-ink)] last:border-b-0 [font-family:var(--openpress-font-mono)]";
const LEDGER_CLASS = "relative z-[2] grid max-w-[862px] gap-0 border-t border-[var(--social-line-strong)]";
const LEDGER_ROW_CLASS =
  "grid min-h-[108px] grid-cols-[68px_138px_minmax(0,1fr)] items-baseline gap-[24px] border-b border-[var(--social-line)] py-[22px] pt-[24px]";
const LEDGER_INDEX_CLASS =
  "text-[22px] font-semibold tracking-normal text-[var(--social-accent)] [font-family:var(--openpress-font-mono)]";
const LEDGER_LABEL_CLASS =
  "text-[28px] font-bold text-[var(--social-ink)] [font-family:var(--openpress-font-body)]";
const LEDGER_TEXT_CLASS =
  "m-0 text-[23px] leading-[1.5] text-[rgb(8_9_10_/_72%)] [font-family:var(--openpress-font-body)]";
const QUOTE_CLASS =
  "relative z-[2] m-0 max-w-[780px] border-l-4 border-[var(--social-accent)] bg-[var(--social-accent-soft)] px-[40px] pb-[38px] pt-[34px]";
const QUOTE_TEXT_CLASS =
  "m-0 text-[45px] font-medium italic leading-[1.36] tracking-normal text-[var(--social-ink)] [font-family:var(--openpress-font-serif)]";
const NOTES_CLASS =
  "relative z-[2] m-0 grid max-w-[862px] grid-cols-3 gap-0 border-l border-t border-[var(--social-line-strong)] list-none p-0";
const NOTE_ITEM_CLASS =
  "grid min-h-[112px] items-end border-b border-r border-[var(--social-line-strong)] bg-white/72 p-[20px] text-[18px] leading-[1.35] text-[var(--social-ink)] [font-family:var(--openpress-font-mono)]";

function SocialPlaceholder() {
  return (
    <>
      <SocialFrame frameKey="card-01" variant="cover" chip="01 · hello" meta="1080 × 1080">
        <section className={COVER_HERO_CLASS}>
          <Text as="p" objectId="kicker" label="Social card 01 kicker" className={KICKER_CLASS}>
            OpenPress Social Kit
          </Text>
          <Text as="h1" objectId="title" label="Social card 01 title" className={COVER_TITLE_CLASS}>
            Hello OpenPress
          </Text>
          <Text as="p" objectId="subtitle" label="Social card 01 subtitle" className={COVER_SUBTITLE_CLASS}>
            AI 文件工作台
          </Text>
          <Text as="p" objectId="lede" label="Social card 01 lede" className={COVER_LEDE_CLASS}>
            把 AI 產出的內容放進固定版面，保留註解、編輯、匯出等交付流程。
          </Text>
        </section>
        <aside className={SIDE_NOTE_CLASS} aria-label="OpenPress social card contract">
          <Text as="span" objectId="contract-format" label="Social card 01 format note" className={SIDE_NOTE_ITEM_CLASS}>Square canvas</Text>
          <Text as="span" objectId="contract-source" label="Social card 01 source note" className={SIDE_NOTE_ITEM_CLASS}>Source backed text</Text>
          <Text as="span" objectId="contract-output" label="Social card 01 output note" className={SIDE_NOTE_ITEM_CLASS}>Image ready</Text>
        </aside>
      </SocialFrame>

      <SocialFrame frameKey="card-02" variant="model" chip="02 · model" meta="Frame first">
        <section className={HERO_CLASS}>
          <Text as="p" objectId="kicker" label="Social card 02 kicker" className={KICKER_CLASS}>
            Canvas Model
          </Text>
          <Text as="h1" objectId="title" label="Social card 02 title" className={COMPACT_TITLE_CLASS}>
            一頁就是一個固定畫布
          </Text>
          <Text as="p" objectId="lede" label="Social card 02 lede" className={MODEL_LEDE_CLASS}>
            Social post 不走章節流。每張卡都是一個 Frame，保留尺寸、ObjectEntity 與 export 邊界。
          </Text>
        </section>
        <div className={LEDGER_CLASS}>
          <article className={LEDGER_ROW_CLASS}>
            <span className={LEDGER_INDEX_CLASS}>01</span>
            <Text as="strong" objectId="press-label" label="Social card 02 press label" className={LEDGER_LABEL_CLASS}>Press</Text>
            <Text as="p" objectId="press-text" label="Social card 02 press text" className={LEDGER_TEXT_CLASS}>
              設定交付物、尺寸與輸出方式。
            </Text>
          </article>
          <article className={LEDGER_ROW_CLASS}>
            <span className={LEDGER_INDEX_CLASS}>02</span>
            <Text as="strong" objectId="frame-label" label="Social card 02 frame label" className={LEDGER_LABEL_CLASS}>Frame</Text>
            <Text as="p" objectId="frame-text" label="Social card 02 frame text" className={LEDGER_TEXT_CLASS}>
              承載一頁一個 component 的版面。
            </Text>
          </article>
          <article className={LEDGER_ROW_CLASS}>
            <span className={LEDGER_INDEX_CLASS}>03</span>
            <Text as="strong" objectId="object-label" label="Social card 02 object label" className={LEDGER_LABEL_CLASS}>Object</Text>
            <Text as="p" objectId="object-text" label="Social card 02 object text" className={LEDGER_TEXT_CLASS}>
              讓文字、媒體、元件都能被 comment。
            </Text>
          </article>
        </div>
      </SocialFrame>

      <SocialFrame frameKey="card-03" variant="workflow" chip="03 · publish" meta="openpress.social">
        <section className={HERO_CLASS}>
          <Text as="p" objectId="kicker" label="Social card 03 kicker" className={KICKER_CLASS}>
            Workflow
          </Text>
          <Text as="h1" objectId="title" label="Social card 03 title" className={COMPACT_TITLE_CLASS}>
            寫、改、交付
          </Text>
        </section>
        <blockquote className={QUOTE_CLASS}>
          <Text as="p" objectId="workflow-quote" label="Social card 03 quote" className={QUOTE_TEXT_CLASS}>
            不是做完一張圖，而是建立一份可以被 agent 持續修改的 publication。
          </Text>
        </blockquote>
        <ul className={NOTES_CLASS} aria-label="OpenPress workflow highlights">
          <Text as="li" objectId="workflow-note-edit" label="Social card 03 edit note" className={NOTE_ITEM_CLASS}>Inline edit</Text>
          <Text as="li" objectId="workflow-note-comment" label="Social card 03 comment note" className={NOTE_ITEM_CLASS}>Comment thread</Text>
          <Text as="li" objectId="workflow-note-export" label="Social card 03 export note" className={NOTE_ITEM_CLASS}>Image / PDF export</Text>
        </ul>
      </SocialFrame>
    </>
  );
}

export default function SocialPress() {
  return (
    <Press
      slug="social"
      title="Hello, social"
      page={{
        id: "openpress-social-card",
        label: "OpenPress Social Card",
        width: "1080px",
        height: "1080px",
      }}
      componentsDir="./components"
      mediaDir="./media"
    >
      <SocialPlaceholder />
    </Press>
  );
}
