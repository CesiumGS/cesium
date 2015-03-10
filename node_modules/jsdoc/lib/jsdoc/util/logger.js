/**
 * Logging tools for JSDoc.
 *
 * Log messages are printed to the console based on the current logging level. By default, messages
 * at level `{@link module:jsdoc/util/logger.LEVELS.ERROR}` or above are logged; all other messages
 * are ignored.
 *
 * In addition, the module object emits an event whenever a logger method is called, regardless of
 * the current logging level. The event's name is the string `logger:` followed by the logger's name
 * (for example, `logger:error`). The event handler receives an array of arguments that were passed
 * to the logger method.
 *
 * Each logger method accepts a `message` parameter that may contain zero or more placeholders. Each
 * placeholder is replaced by the corresponding argument following the message. If the placeholder
 * does not have a corresponding argument, the placeholder is not replaced.
 *
 * The following placeholders are supported:
 *
 * + `%s`: String.
 * + `%d`: Number.
 * + `%j`: JSON.
 *
 * @module jsdoc/util/logger
 * @extends module:events.EventEmitter
 * @example
 * var logger = require('jsdoc/util/logger');
 *
 * var data = {
 *   foo: 'bar'
 * };
 * var name = 'baz';
 *
 * logger.warn('%j %s', data, name);  // prints '{"foo":"bar"} baz'
 * @see http://nodejs.org/api/util.html#util_util_format_format
 */
'use strict';

var runtime = require('jsdoc/util/runtime');
var util = require('util');

function Logger() {}
util.inherits(Logger, require('events').EventEmitter);

var logger = module.exports = new Logger();

/**
 * Logging levels for the JSDoc logger. The default logging level is
 * {@link module:jsdoc/util/logger.LEVELS.ERROR}.
 *
 * @enum
 * @type {number}
 */
var LEVELS = logger.LEVELS = {
    /** Do not log any messages. */
    SILENT: 0,
    /** Log fatal errors that prevent JSDoc from running. */
    FATAL: 10,
    /** Log all errors, including errors from which JSDoc can recover. */
    ERROR: 20,
    /**
     * Log the following messages:
     *
     * + Warnings
     * + Errors
     */
    WARN: 30,
    /**
     * Log the following messages:
     *
     * + Informational messages
     * + Warnings
     * + Errors
     */
    INFO: 40,
    /**
     * Log the following messages:
     *
     * + Debugging messages
     * + Informational messages
     * + Warnings
     * + Errors
     */
    DEBUG: 50,
    /** Log all messages. */
    VERBOSE: 1000
};

var DEFAULT_LEVEL = LEVELS.WARN;
var logLevel = DEFAULT_LEVEL;

var PREFIXES = {
    DEBUG: 'DEBUG: ',
    ERROR: 'ERROR: ',
    FATAL: 'FATAL: ',
    WARN: 'WARNING: '
};

// Add a prefix to a log message if necessary.
function addPrefix(args, prefix) {
    var updatedArgs;

    if (prefix && typeof args[0] === 'string') {
        updatedArgs = args.slice(0);
        updatedArgs[0] = prefix + updatedArgs[0];
    }

    return updatedArgs || args;
}

// TODO: document events
function wrapLogFunction(name, func) {
    var eventName = 'logger:' + name;
    var upperCaseName = name.toUpperCase();
    var level = LEVELS[upperCaseName];
    var prefix = PREFIXES[upperCaseName];

    return function() {
        var loggerArgs;

        var args = Array.prototype.slice.call(arguments, 0);

        if (logLevel >= level) {
            loggerArgs = addPrefix(args, prefix);
            func.apply(null, loggerArgs);
        }

        args.unshift(eventName);
        logger.emit.apply(logger, args);
    };
}

// Print a message to STDOUT without a terminating newline.
function printToStdout() {
    var args = Array.prototype.slice.call(arguments, 0);

    process.stdout.write( util.format.apply(util, args) );
}

/**
 * Log a message at log level {@link module:jsdoc/util/logger.LEVELS.DEBUG}.
 *
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.debug = wrapLogFunction('debug', console.info);
/**
 * Print a string at log level {@link module:jsdoc/util/logger.LEVELS.DEBUG}. The string is not
 * terminated by a newline.
 *
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.printDebug = wrapLogFunction('debug', printToStdout);
/**
 * Log a message at log level {@link module:jsdoc/util/logger.LEVELS.ERROR}.
 *
 * @name module:jsdoc/util/logger.error
 * @function
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.error = wrapLogFunction('error', console.error);
/**
 * Log a message at log level {@link module:jsdoc/util/logger.LEVELS.FATAL}.
 *
 * @name module:jsdoc/util/logger.error
 * @function
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.fatal = wrapLogFunction('fatal', console.error);
/**
 * Log a message at log level {@link module:jsdoc/util/logger.LEVELS.INFO}.
 *
 * @name module:jsdoc/util/logger.info
 * @function
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.info = wrapLogFunction('info', console.info);
/**
 * Print a string at log level {@link module:jsdoc/util/logger.LEVELS.INFO}. The string is not
 * terminated by a newline.
 *
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.printInfo = wrapLogFunction('info', printToStdout);
/**
 * Log a message at log level {@link module:jsdoc/util/logger.LEVELS.VERBOSE}.
 *
 * @name module:jsdoc/util/logger.verbose
 * @function
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.verbose = wrapLogFunction('verbose', console.info);
/**
 * Print a string at log level {@link module:jsdoc/util/logger.LEVELS.VERBOSE}. The string is not
 * terminated by a newline.
 *
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.printVerbose = wrapLogFunction('verbose', printToStdout);
/**
 * Log a message at log level {@link module:jsdoc/util/logger.LEVELS.WARN}.
 *
 * @name module:jsdoc/util/logger.warn
 * @function
 * @param {string} message - The message to log.
 * @param {...*=} values - The values that will replace the message's placeholders.
 */
logger.warn = wrapLogFunction('warn', console.warn);

/**
 * Set the log level.
 *
 * @param {module:jsdoc/util/logger.LEVELS} level - The log level to use.
 */
logger.setLevel = function setLevel(level) {
    logLevel = (level !== undefined) ? level : DEFAULT_LEVEL;
};

/**
 * Get the current log level.
 *
 * @return {module:jsdoc/util/logger.LEVELS} The current log level.
 */
logger.getLevel = function getLevel() {
    return logLevel;
};
