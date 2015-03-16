/*global env: true */
/**
    @overview
    @author Rafa&#322; Wrzeszcz <rafal.wrzeszcz@wrzasq.pl>
    @license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */

/**
    @module jsdoc/tutorial/resolver
 */
'use strict';

var logger = require('jsdoc/util/logger');
var fs = require('jsdoc/fs');
var path = require('path');
var tutorial = require('jsdoc/tutorial');

var hasOwnProp = Object.prototype.hasOwnProperty;

var conf = {};
var finder = /^(.*)\.(x(?:ht)?ml|html?|md|markdown|json)$/i;
var tutorials = {};

/** checks if `conf` is the metadata for a single tutorial.
 * A tutorial's metadata has a property 'title' and/or a property 'children'.
 * @param {object} json - the object we want to test (typically from JSON.parse)
 * @returns {boolean} whether `json` could be the metadata for a tutorial.
 */
function isTutorialJSON(json) {
    // if conf.title exists or conf.children exists, it is metadata for a tutorial
    return (hasOwnProp.call(json, 'title') || hasOwnProp.call(json, 'children'));
}

/** Helper function that adds tutorial configuration to the `conf` variable.
 * This helps when multiple tutorial configurations are specified in one object,
 * or when a tutorial's children are specified as tutorial configurations as
 * opposed to an array of tutorial names.
 *
 * Recurses as necessary to ensure all tutorials are added.
 *
 * @param {string} name - if `meta` is a configuration for a single tutorial,
 *                        this is that tutorial's name.
 * @param {object} meta - object that contains tutorial information.
 *                        Can either be for a single tutorial, or for multiple
 *                        (where each key in `meta` is the tutorial name and each
 *                         value is the information for a single tutorial).
 *                        Additionally, a tutorial's 'children' property may
 *                        either be an array of strings (names of the child tutorials),
 *                        OR an object giving the configuration for the child tutorials.
 */
function addTutorialConf(name, meta) {
    var names, i;
    if (isTutorialJSON(meta)) {
        // if the children are themselves tutorial defintions as opposed to an
        // array of strings, add each child.
        if (hasOwnProp.call(meta, 'children') && !Array.isArray(meta.children)) {
            names = Object.keys(meta.children);
            for (i = 0; i < names.length; ++i) {
                addTutorialConf(names[i], meta.children[names[i]]);
            }
            // replace with an array of names.
            meta.children = names;
        }
        // check if the tutorial has already been defined...
        if (hasOwnProp.call(conf, name)) {
            logger.warn('Metadata for the tutorial %s is defined more than once. Only the first definition will be used.', name );
        } else {
            conf[name] = meta;
        }
    } else {
        // it's an object of tutorials, the keys are th etutorial names.
        names = Object.keys(meta);
        for (i = 0; i < names.length; ++i) {
            addTutorialConf(names[i], meta[names[i]]);
        }
    }
}

/** Adds new tutorial.
    @param {tutorial.Tutorial} current - New tutorial.
 */
exports.addTutorial = function(current) {
    if (hasOwnProp.call(tutorials, current.name)) {
        logger.warn('The tutorial %s is defined more than once. Only the first definition will be used.', current.name);
    } else {
        tutorials[current.name] = current;

        // default temporary parent
        current.setParent(exports.root);
    }
};

/** Root tutorial.
    @type tutorial.Tutorial
 */
exports.root = new tutorial.Tutorial('', '');

/** Additional instance method for root node.
    @param {string} name - Tutorial name.
    @return {tutorial.Tutorial} Tutorial instance.
 */
exports.root.getByName = function(name) {
    return hasOwnProp.call(tutorials, name) && tutorials[name];
};

/** Load tutorials from given path.
    @param {string} _path - Tutorials directory.
 */
exports.load = function(_path) {
    var match,
        type,
        name,
        content,
        current,
        files = fs.ls(_path);

    // tutorials handling
    files.forEach(function(file) {
        match = file.match(finder);

        // any filetype that can apply to tutorials
        if (match) {
            name = path.basename(match[1]);
            content = fs.readFileSync(file, env.opts.encoding);

            switch (match[2].toLowerCase()) {
                // HTML type
                case 'xml':
                case 'xhtml':
                case 'html':
                case 'htm':
                    type = tutorial.TYPES.HTML;
                    break;

                // Markdown typs
                case 'md':
                case 'markdown':
                    type = tutorial.TYPES.MARKDOWN;
                    break;

                // configuration file
                case 'json':
                    var meta = JSON.parse(content);
                    addTutorialConf(name, meta);
                    // don't add this as a tutorial
                    return;

                // how can it be? check `finder' regexp
                default:
                    // not a file we want to work with
                    return;
            }

            current = new tutorial.Tutorial(name, content, type);
            exports.addTutorial(current);
        }
    });
};

/** Resolves hierarchical structure.
 */
exports.resolve = function() {
    var item,
        current;
    for (var name in conf) {
        if ( hasOwnProp.call(conf, name) ) {
            // TODO: should we complain about this?
            if (!hasOwnProp.call(tutorials, name)) {
                continue;
            }

            item = conf[name];
            current = tutorials[name];

            // set title
            if (item.title) {
                current.title = item.title;
            }

            // add children
            if (item.children) {
                item.children.forEach(function(child) {
                    if (!hasOwnProp.call(tutorials, child)) {
                        logger.error('Missing child tutorial: %s', child);
                    }
                    else {
                        tutorials[child].setParent(current);
                    }
                });
            }
        }
    }
};
