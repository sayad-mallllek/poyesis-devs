import { Bug } from "lucide-react";
import { ComingSoon } from "@/features/projects/detail/coming-soon";

export default function ProjectErrorsPage() {
  return (
    <ComingSoon
      icon={<Bug />}
      title="Error tracking is coming soon"
      description="Sentry issues and error trends for this project will appear here."
    />
  );
}
