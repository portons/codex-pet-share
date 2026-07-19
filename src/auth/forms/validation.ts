export function validateUsername(value: string) {
  const nextDisplayName = value.trim().replace(/\s+/g, " ");
  if (nextDisplayName.length < 2 || nextDisplayName.length > 32) {
    return { value: nextDisplayName, error: "Username must be 2-32 characters." };
  }
  if (!/^[A-Za-z0-9 _-]+$/.test(nextDisplayName)) {
    return { value: nextDisplayName, error: "Username can use letters, numbers, spaces, hyphens, and underscores." };
  }
  return { value: nextDisplayName, error: "" };
}
