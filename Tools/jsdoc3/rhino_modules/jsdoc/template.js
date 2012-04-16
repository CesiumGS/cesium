/**
    @overview
    @author Rafał Wrzeszcz <rafal.wrzeszcz@wrzasq.pl>
    @license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */

var template = require('underscore/template'),
    fs = require('fs');

// override default settings
template.settings.evaluate    = /<\?js([\s\S]+?)\?>/g;
template.settings.interpolate = /<\?js=([\s\S]+?)\?>/g;

/**
    @module jsdoc/template
 */

/**
    @class
    @classdesc Underscore template helper.
    @param {string} path - Templates directory.
 */
exports.Template = function(path) {
    // make sure path contains trailing slash
    this.path = path.replace(/\/$/, '') + '/';

    this.layout = null;
};

/** Loads template from given file.
    @param {string} file - Template filename.
    @return {function} Returns template closure.
 */
exports.Template.prototype.load = function(file) {
    return template.render(fs.readFileSync(this.path + file));
};

// templates cache
var cache = {};

/**
    Renders template using given data.
    
    This is low-level function, for rendering full templates use {@link Template.render()}.
    
    @param {string} file - Template filename.
    @param {object} data - Template variables (doesn't have to be object, but passing variables dictionary is best way and most common use).
    @return {string} Rendered template.
 */
exports.Template.prototype.partial = function(file, data) {
    // load template into cache
    if (!(file in cache)) {
        cache[file] = this.load(file);
    }

    // keep template helper context
    return cache[file].call(this, data);
};

/**
    Renders template with given data.
    
    This method automaticaly applies layout if set.
    
    @param {string} file - Template filename.
    @param {object} data - Template variables (doesn't have to be object, but passing variables dictionary is best way and most common use).
    @return {string} Rendered template.
 */
exports.Template.prototype.render = function(file, data) {
    // main content
    var content = this.partial(file, data);

    // apply layout
    if (this.layout) {
        data.content = content;
        content = this.partial(this.layout, data);
    }

    return content;
};
