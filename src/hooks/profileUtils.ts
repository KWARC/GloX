export type NamedUser = {
  firstName?: string | null;
  lastName?: string | null;
  email: string;
};

export function getInitials(email: string) {
  return email.substring(0, 2).toUpperCase();
}

export function getDisplayName(user: NamedUser) {
  const fullName = [user.firstName, user.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return fullName || user.email;
}
