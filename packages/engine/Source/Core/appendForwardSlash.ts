/**
 * @private
 */
function appendForwardSlash(url) {
  if (url.length === 0 || url[url.length - 1] !== "/") {
    url = `${url}/`;
  }
  return url;
}
export { appendForwardSlash };
export default appendForwardSlash;
