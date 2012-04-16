/**
    @overview
    @author Rafał Wrzeszcz <rafal.wrzeszcz@wrzasq.pl>
    @license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */

/**
    @module jsdoc/tutorial/resolver
 */

var tutorial = require('jsdoc/tutorial'),
    fs = require('fs'),
    conf = {},
    tutorials = {},
    finder = /^(.*)\.(x(?:ht)?ml|html?|md|markdown|js(?:on)?)$/i;

/** Adds new tutorial.
    @param {tutorial.Tutorial} current - New tutorial.
 */
exports.addTutorial = function(current) {
    tutorials[current.name] = current;

    // default temporary parent
    current.setParent(exports.root);
};

/** Root tutorial.
    @type tutorial.Tutorial
 */
exports.root = new tutorial.Tutorial('', '');

/** Additional instance method for root node.
    @param {string} name - Tutorial name.
    @reutrn {tutorial.Tutorial} Tutorial instance.
 */
exports.root.getByName = function(name) {
    return tutorials[name];
};

/** Load tutorials from given path.
    @param {string} path - Tutorials directory.
 */
exports.load = function(path) {
    var match,
        type,
        name,
        current,
        files = fs.ls(path);

    // tutorials handling
    files.forEach(function(file) {
        match = file.match(finder);

        // any filetype that can apply to tutorials
        if (match) {
            name = fs.toFile(match[1]);
            content = fs.readFileSync(file);

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
                case 'js':
                case 'json':
                    conf[name] = JSON.parse(content);

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
    @param {object} map - Contents map.
 */
exports.resolve = function() {
    var item,
        current;
    for (var name in conf) {
        // should we be restrictive here?
        // what is someone just wants to keep sample sources in same directory with tutorials?
        // I've decided to leave such cases alone
        if (!(name in tutorials)) {
            continue;
        }

        item = conf[name];
        current = tutorials[name]

        // set title
        if (item.title) {
            current.title = item.title;
        }

        // add children
        if (item.children) {
            item.children.forEach(function(child) {
                // I really didn't want to throw you an exception in most cases
                // but now, user, you pissed me off ;)
                if (!(child in tutorials)) {
                    throw new Error("Missing child tutorial: " + child);
                }

                tutorials[child].setParent(current);
            });
        }
    }
};
