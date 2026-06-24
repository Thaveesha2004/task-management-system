export function parseJwtPayload(token) {
  try {
    const segment = token.split('.')[1];
    if (!segment) return null;
    const json = atob(segment.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = parseJwtPayload(token);
  if (!payload?.exp) return true;
  return payload.exp * 1000 <= Date.now();
}

export function getValidStoredAuth() {
  const raw = localStorage.getItem('tms_auth');
  if (!raw) return null;

  try {
    const auth = JSON.parse(raw);
    if (!auth?.token || !auth?.user) {
      localStorage.removeItem('tms_auth');
      return null;
    }
    if (isTokenExpired(auth.token)) {
      localStorage.removeItem('tms_auth');
      return null;
    }
    return auth;
  } catch {
    localStorage.removeItem('tms_auth');
    return null;
  }
}

export function clearStoredAuth() {
  localStorage.removeItem('tms_auth');
}
