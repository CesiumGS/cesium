/**
    @overview
    @author Rafał Wrzeszcz <rafal.wrzeszcz@wrzasq.pl>
    @license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */
'use strict';

var markdown = require('jsdoc/util/markdown');

/** Removes child tutorial from the parent. Does *not* unset child.parent though.
    @param {Tutorial} parent - parent tutorial.
    @param {Tutorial} child - Old child.
    @private
 */
function removeChild(parent, child) {
    var index = parent.children.indexOf(child);
    if (index !== -1) {
        parent.children.splice(index, 1);
    }
}

/** Adds a child to the parent tutorial. Does *not* set child.parent though.
    @param {Tutorial} parent - parent tutorial.
    @param {Tutorial} child - New child.
    @private
 */
function addChild(parent, child) {
    parent.children.push(child);
}

/**
    @module jsdoc/tutorial
 */

/**
    @class
    @classdesc Represents a single JSDoc tutorial.
    @param {string} name - Tutorial name.
    @param {string} content - Text content.
    @param {number} type - Source formating.
 */
exports.Tutorial = function(name, content, type) {
    this.title = this.name = name;
    this.content = content;
    this.type = type;

    // default values
    this.parent = null;
    this.children = [];
};

/** Moves children from current parent to different one.
    @param {?Tutorial} parent - New parent. If null, the tutorial has no parent.
 */
exports.Tutorial.prototype.setParent = function(parent) {
    // removes node from old parent
    if (this.parent) {
        removeChild(this.parent, this);
    }

    this.parent = parent;
    if (parent) {
        addChild(parent, this);
    }
};

/** Removes children from current node.
    @param {Tutorial} child - Old child.
 */
exports.Tutorial.prototype.removeChild = function(child) {
    child.setParent(null);
};

/** Adds new children to current node.
    @param {Tutorial} child - New child.
 */
exports.Tutorial.prototype.addChild = function(child) {
    child.setParent(this);
};

/** Prepares source.
    @return {string} HTML source.
 */
exports.Tutorial.prototype.parse = function() {
    switch (this.type) {
        // nothing to do
        case exports.TYPES.HTML:
            return this.content;

        // markdown
        case exports.TYPES.MARKDOWN:
            var mdParse = markdown.getParser();
            return mdParse(this.content)
                .replace(/&amp;/g, '&') // because markdown escapes these
                .replace(/&lt;/g, '<')
                .replace(/&gt;/g, '>');

        // uhm... should we react somehow?
        // if not then this case can be merged with TYPES.HTML
        default:
            return this.content;
    }
};

/** Tutorial source types.
    @enum {number}
 */
exports.TYPES = {
    HTML: 1,
    MARKDOWN: 2
};
