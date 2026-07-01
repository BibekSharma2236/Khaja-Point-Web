export function getToken() {
  return localStorage.getItem('khaja_token');
}

export function setToken(token) {
  if (token) localStorage.setItem('khaja_token', token);
  else localStorage.removeItem('khaja_token');
}

export function clearToken() {
  localStorage.removeItem('khaja_token');
}

