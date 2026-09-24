import type { UiBlock } from "@repo/contracts";
import { ChartBlockView } from "./chart-block";
import { ConfirmBlockView } from "./confirm-block";
import { EntityListBlockView } from "./entity-list-block";
import { FormBlockView } from "./form-block";
import { StatsBlockView } from "./stats-block";
import { TableBlockView } from "./table-block";
import { TimelineBlockView } from "./timeline-block";
import type { BlockAnswer, RespondToBlock } from "./types";

/** One renderer per generative-UI block kind (exhaustive by construction). */
export function UiBlockView({
  block,
  answer,
  onRespond,
}: {
  block: UiBlock;
  answer: BlockAnswer;
  onRespond: RespondToBlock;
}) {
  switch (block.kind) {
    case "chart":
      return <ChartBlockView block={block} />;
    case "stats":
      return <StatsBlockView block={block} />;
    case "table":
      return <TableBlockView block={block} />;
    case "entityList":
      return <EntityListBlockView block={block} />;
    case "timeline":
      return <TimelineBlockView block={block} />;
    case "form":
      return <FormBlockView block={block} answer={answer} onRespond={onRespond} />;
    case "confirm":
      return <ConfirmBlockView block={block} answer={answer} onRespond={onRespond} />;
  }
}
