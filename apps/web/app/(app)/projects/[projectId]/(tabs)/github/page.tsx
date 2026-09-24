import { FolderGit2 } from "lucide-react";
import { ComingSoon } from "@/features/projects/detail/coming-soon";

export default function ProjectGithubPage() {
  return (
    <ComingSoon
      icon={<FolderGit2 />}
      title="GitHub is coming soon"
      description="Linked repositories, pull requests and commit activity will appear here."
    />
  );
}
