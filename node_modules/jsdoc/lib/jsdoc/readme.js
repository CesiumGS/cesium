/*global env: true */

/**
 * Make the contents of a README file available to include in the output.
 * @module jsdoc/readme
 * @author Michael Mathews <micmath@gmail.com>
 * @author Ben Blank <ben.blank@gmail.com>
 */
'use strict';

var fs = require('jsdoc/fs'),
    markdown = require('jsdoc/util/markdown');

/**
 * @class
 * @classdesc Represents a README file.
 * @param {string} path - The filepath to the README.
 */
function ReadMe(path) {
    var content = fs.readFileSync(path, env.opts.encoding),
        parse = markdown.getParser();

    this.html = parse(content);
}

module.exports = ReadMe;
