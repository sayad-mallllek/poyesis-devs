import type { Metadata } from "next";
import { AssistantPanel } from "@/features/assistant/assistant-panel";

export const metadata: Metadata = { title: "Assistant" };

export default function AssistantPage() {
  return (
    <div className="h-[calc(100svh-3.5rem)]">
      <AssistantPanel layout="wide" />
    </div>
  );
}
