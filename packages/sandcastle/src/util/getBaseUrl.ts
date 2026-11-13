export function getBaseUrl() {
  // omits query string and hash
  return `${location.protocol}//${location.host}${location.pathname}`;
}
