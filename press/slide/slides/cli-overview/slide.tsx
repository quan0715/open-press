import { Text, type SlideMeta } from "@open-press/core";
import { DeckSlide } from "../../components/DeckSlide";

export const meta = {
  layout: "agenda",
  description: "Introduces the slide CLI commands that keep press markers and folders in sync.",
  keypoints: [
    "status summarizes the deck",
    "add/remove/rename maintain two locations",
    "skip/reorder update marker state"
  ]
} satisfies SlideMeta;

export const notes = "The CLI is the safe mutation layer. Users and agents should avoid manually updating only one side of the two-location contract.";

export default function CliOverviewSlide() {
  return (
    <DeckSlide id="cli-overview" variant="agenda">
        <section className="agenda-layout">
          <div>
            <Text as="p" className="kicker">02 · CLI 介紹</Text>
            <Text as="h2">用 command 操作 deck，不手動同步兩邊</Text>
          </div>
          <ol className="agenda-list">
            <li>
              <span className="agenda-number">01</span>
              <div>
                <Text as="h3">open-press slide status</Text>
                <Text as="p">靜態讀取 `meta`，快速看全 deck 的 layout、skip 與順序。</Text>
              </div>
            </li>
            <li>
              <span className="agenda-number">02</span>
              <div>
                <Text as="h3">add / remove / rename</Text>
                <Text as="p">同時維護 `press.tsx` marker 和 `slides/&lt;id&gt;/slide.tsx` folder。</Text>
              </div>
            </li>
            <li>
              <span className="agenda-number">03</span>
              <div>
                <Text as="h3">skip / reorder</Text>
                <Text as="p">只改 marker 狀態與順序；folder name 永遠保留語意 id。</Text>
              </div>
            </li>
          </ol>
        </section>
    </DeckSlide>
  );
}
