/**
    @module plugins/sourcetag
    @author Michael Mathews <micmath@gmail.com>
 */

exports.handlers = {
    /**
        Support @source tag. Expected value like:
            { "filename": "myfile.js", "lineno": 123 }
        Modifies the corresponding meta values on the given doclet.
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
                    throw new Error('@source tag expects a valid JSON value, like { "filename": "myfile.js", "lineno": 123 }.');
                }

                !e.doclet.meta && (e.doclet.meta = {});
                e.doclet.meta.filename = value.filename || '';
                e.doclet.meta.lineno = value.lineno || '';
            }
        }
    }
};