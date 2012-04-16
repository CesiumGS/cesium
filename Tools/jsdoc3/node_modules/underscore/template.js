// By default, Underscore uses ERB-style template delimiters, change the
// following template settings to use alternative delimiters.
exports.settings = {
    evaluate    : /<%([\s\S]+?)%>/g,
    interpolate : /<%=([\s\S]+?)%>/g
};

// JavaScript micro-templating, similar to John Resig's implementation.
// Underscore templating handles arbitrary delimiters, preserves whitespace,
// and correctly escapes quotes within interpolated code.
exports.render = function(templateStr, data) {
    var settings = exports.settings,
        compiledTemplate,
        renderFunction;
    
    compiledTemplate = 'var __p=[],print=function(){__p.push.apply(__p,arguments);};' +
      'with(data||{}){__p.push(\'' +
      templateStr.replace(/\\/g, '\\\\')
         .replace(/'/g, "\\'")
         .replace(settings.interpolate, function(match, code) {
           return "'," + code.replace(/\\'/g, "'") + ",'";
         })
         .replace(settings.evaluate || null, function(match, code) {
           return "');" + code.replace(/\\'/g, "'")
                              .replace(/[\r\n\t]/g, ' ') + "__p.push('";
         })
         .replace(/\r/g, '\\r')
         .replace(/\n/g, '\\n')
         .replace(/\t/g, '\\t')
         + "');}return __p.join('');";
         
    renderFunction = new Function('data', compiledTemplate);
    return data ? renderFunction(data) : renderFunction;
};