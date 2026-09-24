import { ROLE_DESCRIPTIONS, type Role, type UserStatus } from "@repo/contracts";
import { ToneBadge, type Tone } from "@/components/app/status-badges";

export const ROLE_TONE: Record<Role, Tone> = {
  ADMIN: "primary",
  MANAGER: "info",
  MEMBER: "neutral",
  GUEST: "warning",
};

export const RoleBadge = ({ role, className }: { role: Role; className?: string }) => (
  <ToneBadge tone={ROLE_TONE[role]} className={className}>
    {ROLE_DESCRIPTIONS[role].label}
  </ToneBadge>
);

export const UserStatusBadge = ({ status }: { status: UserStatus }) =>
  status === "SUSPENDED" ? (
    <ToneBadge tone="danger" dot>
      Suspended
    </ToneBadge>
  ) : (
    <ToneBadge tone="success" dot>
      Active
    </ToneBadge>
  );
