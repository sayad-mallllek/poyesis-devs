import type { UserRef } from "@repo/contracts";
import { fullName, UserAvatar } from "@/components/app/user-avatar";
import { AvatarGroup, AvatarGroupCount } from "@/components/ui/avatar";

/**
 * Overlapping avatars for the first few people plus a "+N" chip for the rest.
 * `total` may exceed `users.length` when only a subset is known (list rows carry the owner and a count).
 */
export function MemberStack({ users, total, max = 4 }: { users: UserRef[]; total?: number; max?: number }) {
  const shown = users.slice(0, max);
  const rest = (total ?? users.length) - shown.length;
  const names = users.map(fullName).join(", ");
  return (
    <AvatarGroup className="-space-x-1.5" aria-label={`${total ?? users.length} people${names ? `: ${names}` : ""}`} title={names}>
      {shown.map((user) => (
        <UserAvatar key={user.id} user={user} className="size-6 text-[10px]" />
      ))}
      {rest > 0 && <AvatarGroupCount className="size-6 text-[10px] font-medium">+{rest}</AvatarGroupCount>}
    </AvatarGroup>
  );
}
