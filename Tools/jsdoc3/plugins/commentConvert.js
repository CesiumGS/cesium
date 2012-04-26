/**
    @overview Demonstrate how to modify the source code before the parser sees it.
    @module plugins/comentConvert
    @author Michael Mathews <micmath@gmail.com>
 */

 
exports.handlers = {
    ///
    /// Convert ///-style comments into jsdoc comments.
    /// @param e
    /// @param e.filename
    /// @param e.source
    ///
    beforeParse: function(e) {
        e.source = e.source.replace(/(\n[ \t]*\/\/\/[^\n]*)+/g, function($) {
            var replacement = '\n/**' + $.replace(/^[ \t]*\/\/\//mg, '').replace(/(\n$|$)/, '*/$1');
            return  replacement;
        });
    }
};