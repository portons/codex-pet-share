type UserAvatarSize = "sm" | "md" | "lg";

export function UserAvatar({
  name,
  avatarUrl,
  size = "md",
  className = ""
}: {
  name: string;
  avatarUrl?: string | null;
  size?: UserAvatarSize;
  className?: string;
}) {
  const classes = ["userAvatar", `userAvatar-${size}`, className].filter(Boolean).join(" ");
  if (avatarUrl) {
    return (
      <span className={classes} aria-hidden="true">
        <img src={avatarUrl} alt="" decoding="async" draggable={false} />
      </span>
    );
  }
  return <span className={classes} aria-hidden="true">{initials(name)}</span>;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const text = `${parts[0]?.[0] || "A"}${parts[1]?.[0] || ""}`.toUpperCase();
  return text.slice(0, 2);
}
