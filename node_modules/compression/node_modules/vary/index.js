/*!
 * vary
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */

/**
 * Module exports.
 */

module.exports = vary;

/**
 * Variables.
 */

var separators = /[\(\)<>@,;:\\"\/\[\]\?=\{\}\u0020\u0009]/;

/**
 * Mark that a request is varied on a header field.
 *
 * @param {Object} res
 * @param {String|Array} field
 * @api public
 */

function vary(res, field) {
  if (!res || !res.getHeader || !res.setHeader) {
    // quack quack
    throw new TypeError('res argument is required');
  }

  if (!field) {
    throw new TypeError('field argument is required');
  }

  var fields = !Array.isArray(field)
    ? [String(field)]
    : field;

  for (var i = 0; i < fields.length; i++) {
    if (separators.test(fields[i])) {
      throw new TypeError('field argument contains an invalid header');
    }
  }

  var val = res.getHeader('Vary') || ''
  var headers = Array.isArray(val)
    ? val.join(', ')
    : String(val);

  // existing unspecified vary
  if (headers === '*') {
    return;
  }

  // enumerate current values
  var vals = headers.toLowerCase().split(/ *, */);

  // unspecified vary
  if (fields.indexOf('*') !== -1 || vals.indexOf('*') !== -1) {
    res.setHeader('Vary', '*');
    return;
  }

  for (var i = 0; i < fields.length; i++) {
    field = fields[i].toLowerCase();

    // append value (case-preserving)
    if (vals.indexOf(field) === -1) {
      vals.push(field);
      headers = headers
        ? headers + ', ' + fields[i]
        : fields[i];
    }
  }

  res.setHeader('Vary', headers);
}
