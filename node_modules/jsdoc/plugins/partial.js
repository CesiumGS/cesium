/*global env: true */
/**
    @overview Adds support for reusable partial jsdoc files.
    @module plugins/partial
    @author Ludo Antonov <ludo@hulu.com>
 */
'use strict';

var fs = require('jsdoc/fs');
var path = require('path');

exports.handlers = {
    ///
    /// Include a partial jsdoc
    /// @param e
    /// @param e.filename
    /// @param e.source
    ///
    /// @example
    ///     @partial "partial_doc.jsdoc"
    ///
    beforeParse: function(e) {
        e.source = e.source.replace(/(@partial \".*\")+/g, function($) {
            var pathArg = $.match(/\".*\"/)[0].replace(/"/g,'');
            var fullPath =  path.join(e.filename , '..', pathArg);

            var partialData = fs.readFileSync(fullPath, env.opts.encoding);

            return partialData;
        });
    }
};
