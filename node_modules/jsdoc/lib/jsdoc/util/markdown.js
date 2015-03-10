/*global env */

/**
 * Provides access to Markdown-related functions.
 * @module jsdoc/util/markdown
 * @author Michael Mathews <micmath@gmail.com>
 * @author Ben Blank <ben.blank@gmail.com>
 */
'use strict';

var util = require('util');

/**
 * Enumeration of Markdown parsers that are available.
 * @enum {String}
 */
var parserNames = {
    /**
     * The "[markdown-js](https://github.com/evilstreak/markdown-js)" (aka "evilstreak") parser.
     *
     * @deprecated Replaced by "marked," as markdown-js does not support inline HTML.
     */
    evilstreak: 'marked',
    /**
     * The "GitHub-flavored Markdown" parser.
     * @deprecated Replaced by "marked."
     */
    gfm: 'marked',
    /**
     * The "[Marked](https://github.com/chjj/marked)" parser.
     */
    marked: 'marked'
};

/**
 * Escape underscores that occur within {@ ... } in order to protect them
 * from the markdown parser(s).
 * @param {String} source the source text to sanitize.
 * @returns {String} `source` where underscores within {@ ... } have been
 * protected with a preceding backslash (i.e. \_) -- the markdown parsers
 * will strip the backslash and protect the underscore.
 */
function escapeUnderscores(source) {
    return source.replace(/\{@[^}\r\n]+\}/g, function (wholeMatch) {
        return wholeMatch.replace(/(^|[^\\])_/g, '$1\\_');
    });
}

/**
 * Escape HTTP/HTTPS URLs so that they are not automatically converted to HTML links.
 *
 * @param {string} source - The source text to escape.
 * @return {string} The source text with escape characters added to HTTP/HTTPS URLs.
 */
function escapeUrls(source) {
    return source.replace(/(https?)\:\/\//g, '$1:\\/\\/');
}

/**
 * Unescape HTTP/HTTPS URLs after Markdown parsing is complete.
 *
 * @param {string} source - The source text to unescape.
 * @return {string} The source text with escape characters removed from HTTP/HTTPS URLs.
 */
function unescapeUrls(source) {
    return source.replace(/(https?)\:\\\/\\\//g, '$1://');
}

/**
 * Escape characters in text within a code block.
 *
 * @param {string} source - The source text to escape.
 * @return {string} The escaped source text.
 */
function escapeCode(source) {
    return source.replace(/</g, '&lt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/**
 * Retrieve a function that accepts a single parameter containing Markdown source. The function uses
 * the specified parser to transform the Markdown source to HTML, then returns the HTML as a string.
 *
 * @private
 * @param {String} parserName The name of the selected parser.
 * @param {Object} [conf] Configuration for the selected parser, if any.
 * @returns {Function} A function that accepts Markdown source, feeds it to the selected parser, and
 * returns the resulting HTML.
 */
function getParseFunction(parserName, conf) {
    var logger = require('jsdoc/util/logger');
    var marked = require('marked');

    var markedRenderer;
    var parserFunction;

    conf = conf || {};

    if (parserName === parserNames.marked) {
        // Marked generates an "id" attribute for headers; this custom renderer suppresses it
        markedRenderer = new marked.Renderer();

        markedRenderer.heading = function(text, level) {
            return util.format('<h%s>%s</h%s>', level, text, level);
        };

        // Allow prettyprint to work on inline code samples
        markedRenderer.code = function(code, language) {
            var langClass = language ? ' lang-' + language : '';

            return util.format( '<pre class="prettyprint source%s"><code>%s</code></pre>',
                langClass, escapeCode(code) );
        };

        parserFunction = function(source) {
            var result;

            source = escapeUnderscores(source);
            source = escapeUrls(source);

            result = marked(source, { renderer: markedRenderer })
                .replace(/\s+$/, '')
                .replace(/&#39;/g, "'");
            result = unescapeUrls(result);

            return result;
        };
        parserFunction._parser = parserNames.marked;
        return parserFunction;
    }
    else {
        logger.error('Unrecognized Markdown parser "%s". Markdown support is disabled.',
            parserName);
    }
}

/**
 * Retrieve a Markdown parsing function based on the value of the `conf.json` file's
 * `env.conf.markdown` property. The parsing function accepts a single parameter containing Markdown
 * source. The function uses the parser specified in `conf.json` to transform the Markdown source to
 * HTML, then returns the HTML as a string.
 *
 * @returns {function} A function that accepts Markdown source, feeds it to the selected parser, and
 * returns the resulting HTML.
 */
exports.getParser = function() {
    var conf = env.conf.markdown;
    if (conf && conf.parser) {
        return getParseFunction(parserNames[conf.parser], conf);
    }
    else {
        // marked is the default parser
        return getParseFunction(parserNames.marked, conf);
    }
};
