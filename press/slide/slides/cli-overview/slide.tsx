import { type SlideMeta } from "@open-press/core";
import { TwoColumnSlide } from "../../layouts/SlideProtocol";

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
    <TwoColumnSlide id="cli-overview">
      <TwoColumnSlide.Left>
        <TwoColumnSlide.Kicker>02 · CLI 介紹</TwoColumnSlide.Kicker>
        <TwoColumnSlide.Title>用 command 操作 deck，不手動同步兩邊</TwoColumnSlide.Title>
      </TwoColumnSlide.Left>
      <TwoColumnSlide.Right>
        <TwoColumnSlide.List>
          <TwoColumnSlide.Item>
            <TwoColumnSlide.ItemNumber>01</TwoColumnSlide.ItemNumber>
            <TwoColumnSlide.ItemCopy>
              <TwoColumnSlide.ItemTitle>open-press slide status</TwoColumnSlide.ItemTitle>
              <TwoColumnSlide.ItemBody>靜態讀取 `meta`，快速看全 deck 的 layout、skip 與順序。</TwoColumnSlide.ItemBody>
            </TwoColumnSlide.ItemCopy>
          </TwoColumnSlide.Item>
          <TwoColumnSlide.Item>
            <TwoColumnSlide.ItemNumber>02</TwoColumnSlide.ItemNumber>
            <TwoColumnSlide.ItemCopy>
              <TwoColumnSlide.ItemTitle>add / remove / rename</TwoColumnSlide.ItemTitle>
              <TwoColumnSlide.ItemBody>同時維護 `press.tsx` marker 和 `slides/&lt;id&gt;/slide.tsx` folder。</TwoColumnSlide.ItemBody>
            </TwoColumnSlide.ItemCopy>
          </TwoColumnSlide.Item>
          <TwoColumnSlide.Item>
            <TwoColumnSlide.ItemNumber>03</TwoColumnSlide.ItemNumber>
            <TwoColumnSlide.ItemCopy>
              <TwoColumnSlide.ItemTitle>skip / reorder</TwoColumnSlide.ItemTitle>
              <TwoColumnSlide.ItemBody>只改 marker 狀態與順序；folder name 永遠保留語意 id。</TwoColumnSlide.ItemBody>
            </TwoColumnSlide.ItemCopy>
          </TwoColumnSlide.Item>
        </TwoColumnSlide.List>
      </TwoColumnSlide.Right>
    </TwoColumnSlide>
  );
}
