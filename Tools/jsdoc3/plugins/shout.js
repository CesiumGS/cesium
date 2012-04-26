/**
    @overview This is just an example.
    @module plugins/shout
    @author Michael Mathews <micmath@gmail.com>
 */

exports.handlers = {
    /**
        Make your descriptions more shoutier.
     */
    newDoclet: function(e) {
        if (typeof e.doclet.description === 'string') {
            e.doclet.description = e.doclet.description.toUpperCase();
        }
    }
};