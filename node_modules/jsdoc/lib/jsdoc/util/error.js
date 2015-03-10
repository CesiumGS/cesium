/*global env: true */
/**
 * Helper functions for handling errors.
 *
 * @deprecated As of JSDoc 3.3.0. This module may be removed in a future release. Use the module
 * {@link module:jsdoc/util/logger} to log warnings and errors.
 * @module jsdoc/util/error
 */
'use strict';

/**
 * Log an exception as an error.
 *
 * Prior to JSDoc 3.3.0, this method would either log the exception (if lenient mode was enabled) or
 * re-throw the exception (default).
 *
 * In JSDoc 3.3.0 and later, lenient mode has been replaced with strict mode, which is disabled by
 * default. If strict mode is enabled, calling the `handle` method causes JSDoc to exit immediately,
 * just as if the exception had been re-thrown.
 *
 * @deprecated As of JSDoc 3.3.0. This module may be removed in a future release.
 * @param {Error} e - The exception to log.
 * @memberof module:jsdoc/util/error
 */
exports.handle = function(e) {
    var logger = require('jsdoc/util/logger');
    var msg = e ? ( e.message || JSON.stringify(e) ) : '';

    // include the error type if it's an Error object
    if (e instanceof Error) {
        msg = e.name + ': ' + msg;
    }

    logger.error(msg);
};
