import { TwoColumnSlide } from "../../layouts/SlideProtocol";

export default function Slide() {
  return (
    <TwoColumnSlide id="agenda">
      <TwoColumnSlide.Left>
        <TwoColumnSlide.Kicker>AGENDA</TwoColumnSlide.Kicker>
        <TwoColumnSlide.Title>Today's Topics</TwoColumnSlide.Title>
      </TwoColumnSlide.Left>

      <TwoColumnSlide.Right>
        <TwoColumnSlide.List>
          <TwoColumnSlide.Item>
            <TwoColumnSlide.ItemNumber>01</TwoColumnSlide.ItemNumber>
            <TwoColumnSlide.ItemCopy>
              <TwoColumnSlide.ItemTitle>Introduction</TwoColumnSlide.ItemTitle>
              <TwoColumnSlide.ItemBody>Overview of the OpenPress framework</TwoColumnSlide.ItemBody>
            </TwoColumnSlide.ItemCopy>
          </TwoColumnSlide.Item>

          <TwoColumnSlide.Item>
            <TwoColumnSlide.ItemNumber>02</TwoColumnSlide.ItemNumber>
            <TwoColumnSlide.ItemCopy>
              <TwoColumnSlide.ItemTitle>Folder Architecture</TwoColumnSlide.ItemTitle>
              <TwoColumnSlide.ItemBody>Understanding how the workspace is structured</TwoColumnSlide.ItemBody>
            </TwoColumnSlide.ItemCopy>
          </TwoColumnSlide.Item>

          <TwoColumnSlide.Item>
            <TwoColumnSlide.ItemNumber>03</TwoColumnSlide.ItemNumber>
            <TwoColumnSlide.ItemCopy>
              <TwoColumnSlide.ItemTitle>Authoring Workflow</TwoColumnSlide.ItemTitle>
              <TwoColumnSlide.ItemBody>How to write and organize content efficiently</TwoColumnSlide.ItemBody>
            </TwoColumnSlide.ItemCopy>
          </TwoColumnSlide.Item>

          <TwoColumnSlide.Item>
            <TwoColumnSlide.ItemNumber>04</TwoColumnSlide.ItemNumber>
            <TwoColumnSlide.ItemCopy>
              <TwoColumnSlide.ItemTitle>CLI Overview</TwoColumnSlide.ItemTitle>
              <TwoColumnSlide.ItemBody>Exploring the commands to build and deploy</TwoColumnSlide.ItemBody>
            </TwoColumnSlide.ItemCopy>
          </TwoColumnSlide.Item>
        </TwoColumnSlide.List>
      </TwoColumnSlide.Right>
    </TwoColumnSlide>
  );
}
