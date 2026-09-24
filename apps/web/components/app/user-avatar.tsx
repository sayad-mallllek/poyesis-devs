import type { UserRef } from "@repo/contracts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

export const fullName = (user: Pick<UserRef, "firstName" | "lastName">) =>
  `${user.firstName} ${user.lastName}`.trim();

const initials = (user: Pick<UserRef, "firstName" | "lastName">) =>
  `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase();

export function UserAvatar({
  user,
  className,
}: {
  user: Pick<UserRef, "firstName" | "lastName" | "avatarUrl">;
  className?: string;
}) {
  return (
    <Avatar className={cn("size-8", className)}>
      {user.avatarUrl && <AvatarImage src={user.avatarUrl} alt={fullName(user)} />}
      <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">{initials(user)}</AvatarFallback>
    </Avatar>
  );
}
