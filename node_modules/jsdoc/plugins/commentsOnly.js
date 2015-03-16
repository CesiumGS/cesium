/**
 * @overview Remove everything in a file except JSDoc-style comments. By enabling this plugin, you
 * can document source files that are not valid JavaScript (including source files for other
 * languages).
 * @module plugins/commentsOnly
 * @author Jeff Williams <jeffrey.l.williams@gmail.com>
 */
'use strict';

exports.handlers = {
    beforeParse: function(e) {
        // a JSDoc comment looks like: /**[one or more chars]*/
        var comments = e.source.match(/\/\*\*[\s\S]+?\*\//g);
        if (comments) {
            e.source = comments.join('\n\n');
        }
    }
};
