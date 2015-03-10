/**
    @module plugins/sourcetag
    @author Michael Mathews <micmath@gmail.com>
 */
'use strict';

var logger = require('jsdoc/util/logger');

exports.handlers = {
    /**
        Support @source tag. Expected value like:
            { "filename": "myfile.js", "lineno": 123 }
        Modifies the corresponding meta values on the given doclet.

        WARNING: If you are using a JSDoc template that generates pretty-printed source files,
        such as JSDoc's default template, this plugin can cause JSDoc to crash. To fix this issue,
        update your template settings to disable pretty-printed source files.

        @source { "filename": "sourcetag.js", "lineno": 13 }
     */
    newDoclet: function(e) {
        var tags = e.doclet.tags,
            tag,
            value;

        //console.log(e.doclet);
        // any user-defined tags in this doclet?
        if (typeof tags !== 'undefined') {
            // only interested in the @source tags
            tags = tags.filter(function($) {
                return $.title === 'source';
            });

            if (tags.length) {
                // take the first one
                tag = tags[0];

                try {
                    value = JSON.parse(tag.value);
                }
                catch(e) {
                    logger.error('@source tag expects a valid JSON value, like { "filename": "myfile.js", "lineno": 123 }.');
                    return;
                }

                e.doclet.meta = e.doclet.meta || {};
                e.doclet.meta.filename = value.filename || '';
                e.doclet.meta.lineno = value.lineno || '';
            }
        }
    }
};
