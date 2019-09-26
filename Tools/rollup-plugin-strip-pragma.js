'use strict';
/**
 * Inspired from rollup-plugin-replace https://github.com/rollup/rollup-plugin-replace/blob/master/src/index.js
 * and
 * strip-pragma-loader https://github.com/AnalyticalGraphicsInc/strip-pragma-loader/blob/master/index.js
 *
 * Usage:
 *
 * const rollup = require('rollup');
 * const rollupStripPragma = require('./rollup-plugin-strip-pragma');
 * const bundle = await rollup.rollup({
 *     input: .....,
 *     plugins: [
 *         rollupStripPragma({
 *             include: '*', // optional
 *             pragmas: [ 'debug', .... ]
 *         })
 *     ]
 * });
 */
const MagicString = require('magic-string');
const { createFilter } = require('rollup-pluginutils');

function escapeCharacters(token) {
    return token.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

function constructRegex(pragma) {
    const prefix = 'include';
    pragma = escapeCharacters(pragma);

    const s = '[\\t ]*\\/\\/>>\\s?' +
        prefix +
        'Start\\s?\\(\\s?(["\'])' +
        pragma +
        '\\1\\s?,\\s?pragmas\\.' +
        pragma +
        '\\s?\\)\\s?;?' +

        // multiline code block
        '[\\s\\S]*?' +

        // end comment
        '[\\t ]*\\/\\/>>\\s?' +
        prefix +
        'End\\s?\\(\\s?(["\'])' +
        pragma +
        '\\2\\s?\\)\\s?;?\\s?[\\t]*\\n?';

    return new RegExp(s, 'gm');
}

function stripPragma(options = {}) {
    const filter = createFilter(options.include, options.exclude);
    const patterns = options.pragmas.map(pragma => constructRegex(pragma));

    return {
        name: 'replace',

        // code: The contents of the file
        // id: the file path
        transform(code, id) {
            // Filters out includes and excluded files
            if (!filter(id)) {
                return null;
            }

            const magicString = new MagicString(code);

            let match;
            let start;
            let end;

            for (let i = 0; i < patterns.length; i++) {
                const pattern = patterns[i];
                while ((match = pattern.exec(code))) {
                    start = match.index;
                    end = start + match[0].length;
                    magicString.overwrite(start, end, '');
                }
            }

            const result = { code: magicString.toString() };
            return result;
        }
    };
}

module.exports = stripPragma;
