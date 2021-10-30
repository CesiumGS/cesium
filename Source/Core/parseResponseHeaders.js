/**
 * Parses the result of XMLHttpRequest's getAllResponseHeaders() method into
 * a dictionary.
 *
 * @function parseResponseHeaders
 *
 * @param {String} headerString The header string returned by getAllResponseHeaders().  The format is
 *                 described here: http://www.w3.org/TR/XMLHttpRequest/#the-getallresponseheaders()-method
 * @returns {Object} A dictionary of key/value pairs, where each key is the name of a header and the corresponding value
 *                   is that header's value.
 *
 * @private
 */
function parseResponseHeaders(headerString) {
  var headers = {};

  if (!headerString) {
    return headers;
  }

  var headerPairs = headerString.split("\u000d\u000a");

  for (var i = 0; i < headerPairs.length; ++i) {
    var headerPair = headerPairs[i];
    // Can't use split() here because it does the wrong thing
    // if the header value has the string ": " in it.
    var index = headerPair.indexOf("\u003a\u0020");
    if (index > 0) {
      var key = headerPair.substring(0, index);
      var val = headerPair.substring(index + 2);
      headers[key] = val;
    }
  }

  return headers;
}
export default parseResponseHeaders;
