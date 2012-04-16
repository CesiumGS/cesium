/**
    @overview Escape HTML tags in descriptions.
    @module plugins/escapeHtml
    @author Michael Mathews <micmath@gmail.com>
 */


exports.handlers = {
    /**
        Translate HTML tags in descriptions into safe entities.
     */
    newDoclet: function(e) {
        if (e.doclet.description) {
            e.doclet.description = e.doclet.description
                                   .replace(/&/g,'&amp;')
                                   .replace(/</g,'&lt;')
                                   .replace(/\n/g, '<br>');
        }
    }
};
