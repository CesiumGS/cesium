/**
    @overview Strips the rails template tags from a js.erb file
    @module plugins/railsTemplate
    @author Jannon Frank <jannon@jannon.net>
 */
'use strict';

exports.handlers = {
    /**
     * Remove rails tags from the source input (e.g. <% foo bar %>)
     * @param e
     * @param e.filename
     * @param e.source
     */
    beforeParse: function(e) {
        if (e.filename.match(/\.erb$/)) {
            e.source = e.source.replace(/<%.*%>/g, '');
        }
    }
};