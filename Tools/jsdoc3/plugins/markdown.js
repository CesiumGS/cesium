/**
    @overview Translate doclet descriptions from MarkDown into HTML.
    @module plugins/markdown
    @author Michael Mathews <micmath@gmail.com>
    @author Ben Blank <ben.blank@gmail.com>
 */

var conf = env.conf.markdown;
var defaultTags = [ "classdesc", "description", "params", "properties", "returns" ];
var parse;
var tags;

/**
    Pull in the selected parser and wrap it in a common interface.

    @param {String} parser The name of the selected parser.
    @param {Object} [conf] Configuration for the selected parser, if any.

    @returns {Function} A function which accepts markdown source, feeds it to
                        the selected parser, and returns the resulting HTML.

    @throws {Exception} If the name does not correspond to a known parser.
 */
function getParser(parser, conf) {
    conf = conf || {};

    if (parser === "gfm") {
        parser = new (require("gfm/showdown").Converter)();
        parser.githubRepoOwner = conf.githubRepoOwner;
        parser.githubRepoName = conf.githubRepoName;
        parser.hardwrap = !!conf.hardwrap;

        return function(source) {
            return parser.makeHtml(source);
        };
    } else if (parser === "evilstreak") {
        parser = require("evilstreak/markdown");

        return function(source) {
            return parser.renderJsonML(parser.toHTMLTree(source, conf.dialect));
        }
    } else {
        throw "unknown Markdown parser: '" + parser + "'";
    }
}

/**
    Process the markdown source in a doclet. The properties which should be
    processed are configurable, but always include "classdesc", "description",
    "params", "properties", and "returns".  Handled properties can be bare
    strings, objects, or arrays of objects.
 */
function process(doclet) {
    tags.forEach(function(tag) {
        if (!doclet.hasOwnProperty(tag)) {
            return;
        }

        if (typeof doclet[tag] === "string") {
            doclet[tag] = parse(doclet[tag]);
        } else if (doclet[tag] instanceof Array) {
            doclet[tag].forEach(process);
        } else if (doclet[tag]) {
            process(doclet[tag]);
        }
    });
}

// determine which parser should be used based on configuration options, if any
if (conf && conf.parser) {
    parse = getParser(conf.parser, conf);
} else if (conf && conf.githubRepoOwner && conf.githubRepoName) {
    // use GitHub-friendly parser if GitHub-specific options are present
    parse = getParser("gfm", conf);
} else {
    // evilstreak is the default parser
    parse = getParser("evilstreak", conf);
}

// set up the list of "tags" (properties) to process
if (conf && conf.tags) {
    tags = conf.tags.slice();

    defaultTags.forEach(function(tag) {
        if (tags.indexOf(tag) === -1) {
            tags.push(tag);
        }
    });
} else {
    tags = defaultTags;
}

exports.handlers = {
    /**
        Translate markdown syntax in a new doclet's description into HTML. Is run
        by JSDoc 3 whenever a "newDoclet" event fires.
     */
    newDoclet: function(e) {
        process(e.doclet);
    }
};