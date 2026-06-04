import { Press, Text } from "@open-press/core";
import { SocialFrame } from "./components/SocialFrame";

function SocialPlaceholder() {
  return (
    <>
      <SocialFrame frameKey="card-01" variant="cover" chip="01 · hello" meta="1080 × 1080">
        <section className="social-magazine__hero">
          <Text as="p" objectId="kicker" label="Social card 01 kicker" className="social-magazine__kicker">
            OpenPress Social Kit
          </Text>
          <Text as="h1" objectId="title" label="Social card 01 title" className="social-magazine__title">
            Hello OpenPress
          </Text>
          <Text as="p" objectId="subtitle" label="Social card 01 subtitle" className="social-magazine__subtitle">
            AI 文件工作台
          </Text>
          <Text as="p" objectId="lede" label="Social card 01 lede" className="social-magazine__lede">
            把 AI 產出的內容放進固定版面，保留註解、編輯、匯出等交付流程。
          </Text>
        </section>
        <aside className="social-magazine__side-note" aria-label="OpenPress social card contract">
          <Text as="span" objectId="contract-format" label="Social card 01 format note">Square canvas</Text>
          <Text as="span" objectId="contract-source" label="Social card 01 source note">Source backed text</Text>
          <Text as="span" objectId="contract-output" label="Social card 01 output note">Image ready</Text>
        </aside>
      </SocialFrame>

      <SocialFrame frameKey="card-02" variant="model" chip="02 · model" meta="Frame first">
        <section className="social-magazine__hero">
          <Text as="p" objectId="kicker" label="Social card 02 kicker" className="social-magazine__kicker">
            Canvas Model
          </Text>
          <Text as="h1" objectId="title" label="Social card 02 title" className="social-magazine__title">
            一頁就是一個固定畫布
          </Text>
          <Text as="p" objectId="lede" label="Social card 02 lede" className="social-magazine__lede">
            Social post 不走章節流。每張卡都是一個 Frame，保留尺寸、ObjectEntity 與 export 邊界。
          </Text>
        </section>
        <div className="social-magazine__ledger">
          <article className="social-magazine__ledger-row">
            <span>01</span>
            <Text as="strong" objectId="press-label" label="Social card 02 press label">Press</Text>
            <Text as="p" objectId="press-text" label="Social card 02 press text">
              設定交付物、尺寸與輸出方式。
            </Text>
          </article>
          <article className="social-magazine__ledger-row">
            <span>02</span>
            <Text as="strong" objectId="frame-label" label="Social card 02 frame label">Frame</Text>
            <Text as="p" objectId="frame-text" label="Social card 02 frame text">
              承載一頁一個 component 的版面。
            </Text>
          </article>
          <article className="social-magazine__ledger-row">
            <span>03</span>
            <Text as="strong" objectId="object-label" label="Social card 02 object label">Object</Text>
            <Text as="p" objectId="object-text" label="Social card 02 object text">
              讓文字、媒體、元件都能被 comment。
            </Text>
          </article>
        </div>
      </SocialFrame>

      <SocialFrame frameKey="card-03" variant="workflow" chip="03 · publish" meta="openpress.social">
        <section className="social-magazine__hero">
          <Text as="p" objectId="kicker" label="Social card 03 kicker" className="social-magazine__kicker">
            Workflow
          </Text>
          <Text as="h1" objectId="title" label="Social card 03 title" className="social-magazine__title">
            寫、改、交付
          </Text>
        </section>
        <blockquote className="social-magazine__quote">
          <Text as="p" objectId="workflow-quote" label="Social card 03 quote">
            不是做完一張圖，而是建立一份可以被 agent 持續修改的 publication。
          </Text>
        </blockquote>
        <ul className="social-magazine__notes" aria-label="OpenPress workflow highlights">
          <Text as="li" objectId="workflow-note-edit" label="Social card 03 edit note">Inline edit</Text>
          <Text as="li" objectId="workflow-note-comment" label="Social card 03 comment note">Comment thread</Text>
          <Text as="li" objectId="workflow-note-export" label="Social card 03 export note">Image / PDF export</Text>
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
      page="social-square"
      componentsDir="./components"
      mediaDir="./media"
    >
      <SocialPlaceholder />
    </Press>
  );
}
