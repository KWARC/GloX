let currentUserId: string | null = null;

export function setSessionUser(id: string) {
  currentUserId = id;
}

export function getSessionUser() {
  return currentUserId;
}

export function clearSession() {
  currentUserId = null;
}