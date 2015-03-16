/**
 * @file Wrapper for underscore's template utility to allow loading templates from files.
 * @author Rafał Wrzeszcz <rafal.wrzeszcz@wrzasq.pl>
 * @author <a href="mailto:matthewkastor@gmail.com">Matthew Christopher Kastor-Inare III</a>
 * @license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */
'use strict';

var _ = require('underscore'),
    fs = require('jsdoc/fs'),
    path = require('path');

/**
    @module jsdoc/template
 */

/**
    @class
    @classdesc Underscore template helper.
    @param {string} path - Templates directory.
 */
exports.Template = function(path) {
    this.path = path;
    this.layout = null;
    this.cache = {};
    // override default template tag settings
    this.settings = {
        evaluate   : /<\?js([\s\S]+?)\?>/g,
        interpolate: /<\?js=([\s\S]+?)\?>/g,
        escape     : /<\?js~([\s\S]+?)\?>/g
    };

};

/** Loads template from given file.
    @param {string} file - Template filename.
    @return {function} Returns template closure.
 */
exports.Template.prototype.load = function(file) {
    return _.template(fs.readFileSync(file, 'utf8'), null, this.settings);
};

/**
    Renders template using given data.

    This is low-level function, for rendering full templates use {@link Template.render()}.

    @param {string} file - Template filename.
    @param {object} data - Template variables (doesn't have to be object, but passing variables dictionary is best way and most common use).
    @return {string} Rendered template.
 */
exports.Template.prototype.partial = function(file, data) {
    file = path.resolve(this.path, file);

    // load template into cache
    if (!(file in this.cache)) {
        this.cache[file] = this.load(file);
    }

    // keep template helper context
    return this.cache[file].call(this, data);
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
