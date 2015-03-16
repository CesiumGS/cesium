/*global env: true */
/**
 * @module jsdoc/util/templateHelper
 */
'use strict';

var dictionary = require('jsdoc/tag/dictionary');
var util = require('util');

var hasOwnProp = Object.prototype.hasOwnProperty;

var files = {};

// each container gets its own html file
var containers = ['class', 'module', 'external', 'namespace', 'mixin'];

var tutorials;

/** Sets tutorials map.
    @param {jsdoc.tutorial.Tutorial} root - Root tutorial node.
 */
exports.setTutorials = function(root) {
    tutorials = root;
};

exports.globalName = 'global';
exports.fileExtension = '.html';
exports.scopeToPunc = require('jsdoc/name').scopeToPunc;

function getNamespace(kind) {
    if (dictionary.isNamespace(kind)) {
        return kind + ':';
    }
    return '';
}

function makeFilenameUnique(filename, str) {
    var key = filename.toLowerCase();
    var nonUnique = true;

    // append enough underscores to make the filename unique
    while (nonUnique) {
        if ( files[key] && hasOwnProp.call(files, key) ) {
            filename += '_';
            key = filename.toLowerCase();
        } else {
            nonUnique = false;
        }
    }

    files[key] = str;
    return filename;
}

function cleanseFilename(str) {
    str = str || '';

    // allow for namespace prefix
    // TODO: use prefixes in jsdoc/doclet
    return str.replace(/^(event|module|external|package):/, '$1-')
        // use - instead of ~ to denote 'inner'
        .replace(/~/g, '-')
        // use _ instead of # to denote 'instance'
        .replace(/\#/g, '_')
        // remove the variation, if any
        .replace(/\([\s\S]*\)$/, '');
}

var htmlsafe = exports.htmlsafe = function(str) {
    return str.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;');
};

/**
 * Convert a string to a unique filename, including an extension.
 *
 * Filenames are cached to ensure that they are used only once. For example, if the same string is
 * passed in twice, two different filenames will be returned.
 *
 * Also, filenames are not considered unique if they are capitalized differently but are otherwise
 * identical.
 * @param {string} str The string to convert.
 * @return {string} The filename to use for the string.
 */
var getUniqueFilename = exports.getUniqueFilename = function(str) {
    // allow for namespace prefix
    var basename = cleanseFilename(str);

    // if the basename includes characters that we can't use in a filepath, remove everything up to
    // and including the last bad character
    var regexp = /[^$a-z0-9._\-](?=[$a-z0-9._\-]*$)/i;
    var result = regexp.exec(basename);
    if (result && result.index) {
        basename = basename.substr(result.index + 1);
    }

    // make sure we don't create hidden files on POSIX systems
    basename = basename.replace(/^\./, '');
    // and in case we've now stripped the entire basename (uncommon, but possible):
    basename = basename.length ? basename : '_';

    return makeFilenameUnique(basename, str) + exports.fileExtension;
};

// two-way lookup
var linkMap = {
    longnameToUrl: {},
    urlToLongname: {}
};

var tutorialLinkMap = {
    nameToUrl: {},
    urlToName: {}
};

var longnameToUrl = exports.longnameToUrl = linkMap.longnameToUrl;

function parseType(longname) {
    var catharsis = require('catharsis');
    var err;

    try {
        return catharsis.parse(longname, {jsdoc: true});
    }
    catch (e) {
        err = new Error('unable to parse ' + longname + ': ' + e.message);
        require('jsdoc/util/logger').error(err);
        return longname;
    }
}

function stringifyType(parsedType, cssClass, linkMap) {
    return require('catharsis').stringify(parsedType, {
        cssClass: cssClass,
        htmlSafe: true,
        links: linkMap
    });
}

function hasUrlPrefix(text) {
    return (/^(http|ftp)s?:\/\//).test(text);
}

function isComplexTypeExpression(expr) {
    // record types, type unions, and type applications all count as "complex"
    return expr.search(/[{(|]/) !== -1 || expr.search(/</) > 0;
}

/**
 * Build an HTML link to the symbol with the specified longname. If the longname is not
 * associated with a URL, this method simply returns the link text, if provided, or the longname.
 *
 * The `longname` parameter can also contain a URL rather than a symbol's longname.
 *
 * This method supports type applications that can contain one or more types, such as
 * `Array.<MyClass>` or `Array.<(MyClass|YourClass)>`. In these examples, the method attempts to
 * replace `Array`, `MyClass`, and `YourClass` with links to the appropriate types. The link text
 * is ignored for type applications.
 *
 * @param {string} longname - The longname (or URL) that is the target of the link.
 * @param {string=} linkText - The text to display for the link, or `longname` if no text is
 * provided.
 * @param {Object} options - Options for building the link.
 * @param {string=} options.cssClass - The CSS class (or classes) to include in the link's `<a>`
 * tag.
 * @param {string=} options.fragmentId - The fragment identifier (for example, `name` in
 * `foo.html#name`) to append to the link target.
 * @param {string=} options.linkMap - The link map in which to look up the longname.
 * @param {boolean=} options.monospace - Indicates whether to display the link text in a monospace
 * font.
 * @return {string} The HTML link, or the link text if the link is not available.
 */
function buildLink(longname, linkText, options) {
    var catharsis = require('catharsis');

    var classString = options.cssClass ? util.format(' class="%s"', options.cssClass) : '';
    var fragmentString = options.fragmentId ? '#' + options.fragmentId : '';
    var stripped;
    var text;
    var url;
    var parsedType;

    // handle cases like:
    // @see <http://example.org>
    // @see http://example.org
    stripped = longname ? longname.replace(/^<|>$/g, '') : '';
    if ( hasUrlPrefix(stripped) ) {
        url = stripped;
        text = linkText || stripped;
    }
    // handle complex type expressions that may require multiple links
    // (but skip anything that looks like an inline tag)
    else if (longname && isComplexTypeExpression(longname) && /\{\@.+\}/.test(longname) === false) {
        parsedType = parseType(longname);
        return stringifyType(parsedType, options.cssClass, options.linkMap);
    }
    else {
        url = hasOwnProp.call(options.linkMap, longname) ? options.linkMap[longname] : '';
        text = linkText || longname;
    }

    text = options.monospace ? '<code>' + text + '</code>' : text;

    if (!url) {
        return text;
    }
    else {
        return util.format('<a href="%s%s"%s>%s</a>', url, fragmentString, classString, text);
    }
}

/**
 * Retrieve an HTML link to the symbol with the specified longname. If the longname is not
 * associated with a URL, this method simply returns the link text, if provided, or the longname.
 *
 * The `longname` parameter can also contain a URL rather than a symbol's longname.
 *
 * This method supports type applications that can contain one or more types, such as
 * `Array.<MyClass>` or `Array.<(MyClass|YourClass)>`. In these examples, the method attempts to
 * replace `Array`, `MyClass`, and `YourClass` with links to the appropriate types. The link text
 * is ignored for type applications.
 *
 * @param {string} longname - The longname (or URL) that is the target of the link.
 * @param {string=} linkText - The text to display for the link, or `longname` if no text is
 * provided.
 * @param {string=} cssClass - The CSS class (or classes) to include in the link's `<a>` tag.
 * @param {string=} fragmentId - The fragment identifier (for example, `name` in `foo.html#name`) to
 * append to the link target.
 * @return {string} The HTML link, or a plain-text string if the link is not available.
 */
var linkto = exports.linkto = function(longname, linkText, cssClass, fragmentId) {
    return buildLink(longname, linkText, {
        cssClass: cssClass,
        fragmentId: fragmentId,
        linkMap: longnameToUrl
    });
};

function useMonospace(tag, text) {
    var cleverLinks;
    var monospaceLinks;
    var result;

    if ( hasUrlPrefix(text) ) {
        result = false;
    }
    else if (tag === 'linkplain') {
        result = false;
    }
    else if (tag === 'linkcode') {
        result = true;
    }
    else {
        cleverLinks = env.conf.templates.cleverLinks;
        monospaceLinks = env.conf.templates.monospaceLinks;

        if (monospaceLinks || cleverLinks) {
            result = true;
        }
    }

    return result || false;
}

function splitLinkText(text) {
    var linkText;
    var target;
    var splitIndex;

    // if a pipe is not present, we split on the first space
    splitIndex = text.indexOf('|');
    if (splitIndex === -1) {
        splitIndex = text.search(/\s/);
    }

    if (splitIndex !== -1) {
        linkText = text.substr(splitIndex + 1);
        // Normalize subsequent newlines to a single space.
        linkText = linkText.replace(/\n+/, ' ');
        target = text.substr(0, splitIndex);
    }

    return {
        linkText: linkText,
        target: target || text
    };
}

var tutorialToUrl = exports.tutorialToUrl = function(tutorial) {
    var node = tutorials.getByName(tutorial);
    // no such tutorial
    if (!node) {
        require('jsdoc/util/logger').error( new Error('No such tutorial: ' + tutorial) );
        return null;
    }

    var url;
    // define the URL if necessary
    if (!hasOwnProp.call(tutorialLinkMap.nameToUrl, node.name)) {
        url = 'tutorial-' + getUniqueFilename(node.name);
        tutorialLinkMap.nameToUrl[node.name] = url;
        tutorialLinkMap.urlToName[url] = node.name;
    }

    return tutorialLinkMap.nameToUrl[node.name];
};

/**
 * Retrieve a link to a tutorial, or the name of the tutorial if the tutorial is missing. If the
 * `missingOpts` parameter is supplied, the names of missing tutorials will be prefixed by the
 * specified text and wrapped in the specified HTML tag and CSS class.
 *
 * @todo Deprecate missingOpts once we have a better error-reporting mechanism.
 * @param {string} tutorial The name of the tutorial.
 * @param {string} content The link text to use.
 * @param {object} [missingOpts] Options for displaying the name of a missing tutorial.
 * @param {string} missingOpts.classname The CSS class to wrap around the tutorial name.
 * @param {string} missingOpts.prefix The prefix to add to the tutorial name.
 * @param {string} missingOpts.tag The tag to wrap around the tutorial name.
 * @return {string} An HTML link to the tutorial, or the name of the tutorial with the specified
 * options.
 */
var toTutorial = exports.toTutorial = function(tutorial, content, missingOpts) {
    if (!tutorial) {
        require('jsdoc/util/logger').error( new Error('Missing required parameter: tutorial') );
        return null;
    }

    var node = tutorials.getByName(tutorial);
    // no such tutorial
    if (!node) {
        missingOpts = missingOpts || {};
        var tag = missingOpts.tag;
        var classname = missingOpts.classname;

        var link = tutorial;
        if (missingOpts.prefix) {
            link = missingOpts.prefix + link;
        }
        if (tag) {
            link = '<' + tag + (classname ? (' class="' + classname + '">') : '>') + link;
            link += '</' + tag + '>';
        }
        return link;
    }

    content = content || node.title;

    return '<a href="' + tutorialToUrl(tutorial) + '">' + content + '</a>';
};

/** Find symbol {@link ...} and {@tutorial ...} strings in text and turn into html links */
exports.resolveLinks = function(str) {
    var replaceInlineTags = require('jsdoc/tag/inline').replaceInlineTags;

    function extractLeadingText(string, completeTag) {
        var tagIndex = string.indexOf(completeTag);
        var leadingText = null;
        var leadingTextRegExp = /\[(.+?)\]/g;
        var leadingTextInfo = leadingTextRegExp.exec(string);

        // did we find leading text, and if so, does it immediately precede the tag?
        while (leadingTextInfo && leadingTextInfo.length) {
            if (leadingTextInfo.index + leadingTextInfo[0].length === tagIndex) {
                string = string.replace(leadingTextInfo[0], '');
                leadingText = leadingTextInfo[1];
                break;
            }

            leadingTextInfo = leadingTextRegExp.exec(string);
        }

        return {
            leadingText: leadingText,
            string: string
        };
    }

    function processLink(string, tagInfo) {
        var leading = extractLeadingText(string, tagInfo.completeTag);
        var linkText = leading.leadingText;
        var monospace;
        var split;
        var target;
        string = leading.string;

        split = splitLinkText(tagInfo.text);
        target = split.target;
        linkText = linkText || split.linkText;

        monospace = useMonospace(tagInfo.tag, tagInfo.text);

        return string.replace( tagInfo.completeTag, buildLink(target, linkText, {
            linkMap: longnameToUrl,
            monospace: monospace
        }) );
    }

    function processTutorial(string, tagInfo) {
        var leading = extractLeadingText(string, tagInfo.completeTag);
        string = leading.string;

        return string.replace( tagInfo.completeTag, toTutorial(tagInfo.text, leading.leadingText) );
    }

    var replacers = {
        link: processLink,
        linkcode: processLink,
        linkplain: processLink,
        tutorial: processTutorial
    };

    return replaceInlineTags(str, replacers).newString;
};

/** Convert tag text like "Jane Doe <jdoe@example.org>" into a mailto link */
exports.resolveAuthorLinks = function(str) {
    var author;
    var matches = str.match(/^\s?([\s\S]+)\b\s+<(\S+@\S+)>\s?$/);
    if (matches && matches.length === 3) {
        author = '<a href="mailto:' + matches[2] + '">' + htmlsafe(matches[1]) + '</a>';
    }
    else {
        author = htmlsafe(str);
    }

    return author;
};

/**
 * Find items in a TaffyDB database that match the specified key-value pairs.
 * @param {TAFFY} data The TaffyDB database to search.
 * @param {object|function} spec Key-value pairs to match against (for example,
 * `{ longname: 'foo' }`), or a function that returns `true` if a value matches or `false` if it
 * does not match.
 * @return {array<object>} The matching items.
 */
var find = exports.find = function(data, spec) {
    return data(spec).get();
};

/**
 * Check whether a symbol is the only symbol exported by a module (as in
 * `module.exports = function() {};`).
 *
 * @private
 * @param {module:jsdoc/doclet.Doclet} doclet - The doclet for the symbol.
 * @return {boolean} `true` if the symbol is the only symbol exported by a module; otherwise,
 * `false`.
 */
function isModuleExports(doclet) {
    var MODULE_PREFIX = require('jsdoc/name').MODULE_PREFIX;

    return doclet.longname && doclet.longname === doclet.name &&
        doclet.longname.indexOf(MODULE_PREFIX) === 0 && doclet.kind !== 'module';
}

/**
 * Retrieve all of the following types of members from a set of doclets:
 *
 * + Classes
 * + Externals
 * + Globals
 * + Mixins
 * + Modules
 * + Namespaces
 * + Events
 * @param {TAFFY} data The TaffyDB database to search.
 * @return {object} An object with `classes`, `externals`, `globals`, `mixins`, `modules`,
 * `events`, and `namespaces` properties. Each property contains an array of objects.
 */
exports.getMembers = function(data) {
    var members = {
        classes: find( data, {kind: 'class'} ),
        externals: find( data, {kind: 'external'} ),
        events: find( data, {kind: 'event'} ),
        globals: find(data, {
            kind: ['member', 'function', 'constant', 'typedef'],
            memberof: { isUndefined: true }
        }),
        mixins: find( data, {kind: 'mixin'} ),
        modules: find( data, {kind: 'module'} ),
        namespaces: find( data, {kind: 'namespace'} )
    };

    // functions that are also modules (as in "module.exports = function() {};") are not globals
    members.globals = members.globals.filter(function(doclet) {
        return !isModuleExports(doclet);
    });

    return members;
};

/**
 * Retrieve the member attributes for a doclet (for example, `virtual`, `static`, and
 * `readonly`).
 * @param {object} d The doclet whose attributes will be retrieved.
 * @return {array<string>} The member attributes for the doclet.
 */
exports.getAttribs = function(d) {
    var attribs = [];

    if (d.virtual) {
        attribs.push('abstract');
    }

    if (d.access && d.access !== 'public') {
        attribs.push(d.access);
    }

    if (d.scope && d.scope !== 'instance' && d.scope !== 'global') {
        if (d.kind === 'function' || d.kind === 'member' || d.kind === 'constant') {
            attribs.push(d.scope);
        }
    }

    if (d.readonly === true) {
        if (d.kind === 'member') {
            attribs.push('readonly');
        }
    }

    if (d.kind === 'constant') {
        attribs.push('constant');
    }

    if (d.nullable === true) {
        attribs.push('nullable');
    }
    else if (d.nullable === false) {
        attribs.push('non-null');
    }

    return attribs;
};

/**
 * Retrieve links to allowed types for the member.
 *
 * @param {Object} d - The doclet whose types will be retrieved.
 * @param {string} [cssClass] - The CSS class to include in the `class` attribute for each link.
 * @return {Array.<string>} HTML links to allowed types for the member.
 */
exports.getSignatureTypes = function(d, cssClass) {
    var types = [];

    if (d.type && d.type.names) {
        types = d.type.names;
    }

    if (types && types.length) {
        types = types.map(function(t) {
            return linkto(t, htmlsafe(t), cssClass);
        });
    }

    return types;
};

/**
 * Retrieve names of the parameters that the member accepts. If a value is provided for `optClass`,
 * the names of optional parameters will be wrapped in a `<span>` tag with that class.
 * @param {object} d The doclet whose parameter names will be retrieved.
 * @param {string} [optClass] The class to assign to the `<span>` tag that is wrapped around the
 * names of optional parameters. If a value is not provided, optional parameter names will not be
 * wrapped with a `<span>` tag. Must be a legal value for a CSS class name.
 * @return {array<string>} An array of parameter names, with or without `<span>` tags wrapping the
 * names of optional parameters.
 */
exports.getSignatureParams = function(d, optClass) {
    var pnames = [];

    if (d.params) {
        d.params.forEach(function(p) {
            if (p.name && p.name.indexOf('.') === -1) {
                if (p.optional && optClass) {
                    pnames.push('<span class="' + optClass + '">' + p.name + '</span>');
                }
                else {
                    pnames.push(p.name);
                }
            }
        });
    }

    return pnames;
};

/**
 * Retrieve links to types that the member can return.
 *
 * @param {Object} d - The doclet whose types will be retrieved.
 * @param {string} [cssClass] - The CSS class to include in the `class` attribute for each link.
 * @return {Array.<string>} HTML links to types that the member can return.
 */
exports.getSignatureReturns = function(d, cssClass) {
    var returnTypes = [];

    if (d.returns) {
        d.returns.forEach(function(r) {
            if (r && r.type && r.type.names) {
                if (!returnTypes.length) {
                    returnTypes = r.type.names;
                }
            }
        });
    }

    if (returnTypes && returnTypes.length) {
        returnTypes = returnTypes.map(function(r) {
            return linkto(r, htmlsafe(r), cssClass);
        });
    }

    return returnTypes;
};

/**
 * Retrieve links to a member's ancestors.
 *
 * @param {TAFFY} data - The TaffyDB database to search.
 * @param {Object} doclet - The doclet whose ancestors will be retrieved.
 * @param {string} [cssClass] - The CSS class to include in the `class` attribute for each link.
 * @return {Array.<string>} HTML links to a member's ancestors.
 */
exports.getAncestorLinks = function(data, doclet, cssClass) {
    var ancestors = [],
        doc = doclet.memberof;

    while (doc) {
        doc = find( data, {longname: doc}, false );
        if (doc) { doc = doc[0]; }
        if (!doc) { break; }
        ancestors.unshift( linkto(doc.longname, (exports.scopeToPunc[doc.scope] || '') + doc.name,
            cssClass) );
        doc = doc.memberof;
    }
    if (ancestors.length) {
        ancestors[ancestors.length - 1] += (exports.scopeToPunc[doclet.scope] || '');
    }
    return ancestors;
};

/**
 * Iterates through all the doclets in `data`, ensuring that if a method
 * @listens to an event, then that event has a 'listeners' array with the
 * longname of the listener in it.
 *
 * @param {TAFFY} data - The TaffyDB database to search.
 */
exports.addEventListeners = function(data) {
    // TODO: do this on the *pruned* data
    // find all doclets that @listen to something.
    var listeners = find(data, function () { return this.listens && this.listens.length; });

    if (!listeners.length) {
        return;
    }

    var doc,
        l,
        _events = {}; // just a cache to prevent me doing so many lookups

    listeners.forEach(function (listener) {
        l = listener.listens;
        l.forEach(function (eventLongname) {
            doc = _events[eventLongname] || find(data, {longname: eventLongname, kind: 'event'})[0];
            if (doc) {
                if (!doc.listeners) {
                    doc.listeners = [listener.longname];
                } else {
                    doc.listeners.push(listener.longname);
                }
                _events[eventLongname] = _events[eventLongname] || doc;
            }
        });
    });
};

/**
 * Remove members that will not be included in the output, including:
 *
 * + Undocumented members.
 * + Members tagged `@ignore`.
 * + Members of anonymous classes.
 * + Members tagged `@private`, unless the `private` option is enabled.
 * @param {TAFFY} data The TaffyDB database to prune.
 * @return {TAFFY} The pruned database.
 */
exports.prune = function(data) {
    data({undocumented: true}).remove();
    data({ignore: true}).remove();
    if (!env.opts.private) { data({access: 'private'}).remove(); }
    data({memberof: '<anonymous>'}).remove();

    return data;
};

var registerLink = exports.registerLink = function(longname, url) {
    linkMap.longnameToUrl[longname] = url;
    linkMap.urlToLongname[url] = longname;
};

/**
 * Get a longname's filename if one has been registered; otherwise, generate a unique filename, then
 * register the filename.
 * @private
 */
function getFilename(longname) {
    var url;

    if ( longnameToUrl[longname] && hasOwnProp.call(longnameToUrl, longname) ) {
        url = longnameToUrl[longname];
    } else {
        url = getUniqueFilename(longname);
        registerLink(longname, url);
    }

    return url;
}

/** Turn a doclet into a URL. */
exports.createLink = function(doclet) {
    var filename;
    var fragment;
    var match;
    var fakeContainer;

    var url = '';
    var INSTANCE = exports.scopeToPunc.instance;
    var longname = doclet.longname;

    // handle doclets in which doclet.longname implies that the doclet gets its own HTML file, but
    // doclet.kind says otherwise. this happens due to mistagged JSDoc (for example, a module that
    // somehow has doclet.kind set to `member`).
    // TODO: generate a warning (ideally during parsing!)
    if (containers.indexOf(doclet.kind) === -1) {
        match = /(\S+):/.exec(longname);
        if (match && containers.indexOf(match[1]) !== -1) {
            fakeContainer = match[1];
        }
    }

    // the doclet gets its own HTML file
    if ( containers.indexOf(doclet.kind) !== -1 || isModuleExports(doclet) ) {
        filename = getFilename(longname);
    }
    // mistagged version of a doclet that gets its own HTML file
    else if ( containers.indexOf(doclet.kind) === -1 && fakeContainer ) {
        filename = getFilename(doclet.memberof || longname);
        if (doclet.name === doclet.longname) {
            fragment = '';
        }
        else {
            fragment = doclet.name || '';
        }
    }
    // the doclet is within another HTML file
    else {
        filename = getFilename(doclet.memberof || exports.globalName);
        fragment = getNamespace(doclet.kind) + (doclet.name || '');
    }

    url = fragment ? (filename + INSTANCE + fragment) : filename;

    return url;
};
