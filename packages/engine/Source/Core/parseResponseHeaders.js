/**
 * Parses the result of XMLHttpRequest's getAllResponseHeaders() method into
 * a dictionary.
 *
 * @function parseResponseHeaders
 *
 * @param {string} headerString The header string returned by getAllResponseHeaders().  The format is
 *                 described here: http://www.w3.org/TR/XMLHttpRequest/#the-getallresponseheaders()-method
 * @returns {object} A dictionary of key/value pairs, where each key is the name of a header and the corresponding value
 *                   is that header's value.
 *
 * @private
 */
function parseResponseHeaders(headerString) {
  const headers = {};

  if (!headerString) {
    return headers;
  }

  const headerPairs = headerString.split("\u000d\u000a");

  for (let i = 0; i < headerPairs.length; ++i) {
    const headerPair = headerPairs[i];
    // Can't use split() here because it does the wrong thing
    // if the header value has the string ": " in it.
    const index = headerPair.indexOf("\u003a\u0020");
    if (index > 0) {
      const key = headerPair.substring(0, index);
      const val = headerPair.substring(index + 2);
      headers[key] = val;
    }
  }

  return headers;
}
export default parseResponseHeaders;
