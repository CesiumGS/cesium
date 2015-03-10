/**
    A collection of functions relating to JSDoc symbol name manipulation.
    @module jsdoc/name
    @requires jsdoc/tag/dictionary
    @author Michael Mathews <micmath@gmail.com>
    @license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */
'use strict';

var _ = require('underscore');

// Longname used for doclets whose actual longname cannot be identified.
var ANONYMOUS_LONGNAME = exports.ANONYMOUS_LONGNAME = '<anonymous>';
// Longname used for doclets in global scope.
var GLOBAL_LONGNAME = exports.GLOBAL_LONGNAME = '<global>';
var INNER = exports.INNER = '~';
var INSTANCE = exports.INSTANCE = '#';
var MODULE_PREFIX = exports.MODULE_PREFIX = 'module:';
// Scope identifiers.
var SCOPE_NAMES = exports.SCOPE_NAMES = {
    global: 'global',
    inner: 'inner',
    instance: 'instance',
    'static': 'static'
};
var STATIC = exports.STATIC = '.';
var scopeToPunc = exports.scopeToPunc = {
    'inner': INNER,
    'instance': INSTANCE,
    'static': STATIC
};
var puncToScope = exports.puncToScope = _.invert(scopeToPunc);

var DEFAULT_SCOPE = SCOPE_NAMES.static;
var REGEXP_SCOPE_PUNC = '([' + INNER + INSTANCE + STATIC + '])';

function nameIsLongname(name, memberof) {
    var regexp = new RegExp('^' + memberof + REGEXP_SCOPE_PUNC);

    return regexp.test(name);
}

function prototypeToPunc(name) {
    return name.replace(/(?:^|\.)prototype\.?/g, INSTANCE);
}

/**
    Resolves the longname, memberof, variation and name values of the given doclet.
    @param {module:jsdoc/doclet.Doclet} doclet
 */
exports.resolve = function(doclet) {
    var about = {};
    var leadingScope = new RegExp('^' + REGEXP_SCOPE_PUNC);
    var memberof = doclet.memberof || '';
    var name = doclet.name ? String(doclet.name) : '';
    var trailingScope = new RegExp(REGEXP_SCOPE_PUNC + '$');

    var parentDoc;

    // change MyClass.prototype.instanceMethod to MyClass#instanceMethod
    // (but not in function params, which lack doclet.kind)
    // TODO: check for specific doclet.kind values (probably function, class, and module)
    if (name && doclet.kind) {
        name = prototypeToPunc(name);
    }
    doclet.name = name;

    // member of a var in an outer scope?
    if (name && !memberof && doclet.meta.code && doclet.meta.code.funcscope) {
        name = doclet.longname = doclet.meta.code.funcscope + INNER + name;
    }

    if (memberof || doclet.forceMemberof) { // @memberof tag given
        memberof = prototypeToPunc(memberof);

        // the name is a complete longname, like @name foo.bar, @memberof foo
        if (name && nameIsLongname(name, memberof) && name !== memberof) {
            about = exports.shorten(name, (doclet.forceMemberof ? memberof : undefined));
        }
        // the name and memberof are identical and refer to a module,
        // like @name module:foo, @memberof module:foo (probably a member like 'var exports')
        else if (name && name === memberof && name.indexOf(MODULE_PREFIX) === 0) {
            about = exports.shorten(name, (doclet.forceMemberof ? memberof : undefined));
        }
        // the name and memberof are identical, like @name foo, @memberof foo
        else if (name && name === memberof) {
            doclet.scope = doclet.scope || DEFAULT_SCOPE;
            name = memberof + scopeToPunc[doclet.scope] + name;
            about = exports.shorten(name, (doclet.forceMemberof ? memberof : undefined));
        }
        // like @memberof foo# or @memberof foo~
        else if (name && trailingScope.test(memberof) ) {
            about = exports.shorten(memberof + name, (doclet.forceMemberof ? memberof : undefined));
        }
        else if (name && doclet.scope) {
            about = exports.shorten(memberof + (scopeToPunc[doclet.scope] || '') + name,
                (doclet.forceMemberof ? memberof : undefined));
        }
    }
    else { // no @memberof
        about = exports.shorten(name);
    }

    if (about.name) {
        doclet.name = about.name;
    }

    if (about.memberof) {
        doclet.setMemberof(about.memberof);
    }

    if (about.longname && (!doclet.longname || doclet.longname === doclet.name)) {
        doclet.setLongname(about.longname);
    }

    if (doclet.scope === 'global') { // via @global tag?
        doclet.setLongname(doclet.name);
        delete doclet.memberof;
    }
    else if (about.scope) {
        if (about.memberof === GLOBAL_LONGNAME) { // via @memberof <global> ?
            doclet.scope = 'global';
        }
        else {
            doclet.scope = puncToScope[about.scope];
        }
    }
    else {
        if (doclet.name && doclet.memberof && !doclet.longname) {
            if ( leadingScope.test(doclet.name) ) {
                doclet.scope = puncToScope[RegExp.$1];
                doclet.name = doclet.name.substr(1);
            }
            else {
                doclet.scope = DEFAULT_SCOPE;
            }

            doclet.setLongname(doclet.memberof + scopeToPunc[doclet.scope] + doclet.name);
        }
    }

    if (about.variation) {
        doclet.variation = about.variation;
    }

    // if we never found a longname, just use an empty string
    if (!doclet.longname) {
        doclet.longname = '';
    }
};

// TODO: make this a private method, or remove it if possible
RegExp.escape = RegExp.escape || function(str) {
    var specials = new RegExp('[.*+?|()\\[\\]{}\\\\]', 'g'); // .*+?|()[]{}\
    return str.replace(specials, '\\$&');
};

/**
    @method module:jsdoc/name.applyNamespace
    @param {string} longname The full longname of the symbol.
    @param {string} ns The namespace to be applied.
    @returns {string} The longname with the namespace applied.
 */
exports.applyNamespace = function(longname, ns) {
    var nameParts = exports.shorten(longname),
        name = nameParts.name;
    longname = nameParts.longname;

    if ( !/^[a-zA-Z]+?:.+$/i.test(name) ) {
        longname = longname.replace( new RegExp(RegExp.escape(name) + '$'), ns + ':' + name );
    }

    return longname;
};

/**
    Given a longname like "a.b#c(2)", slice it up into ["a.b", "#", 'c', '2'],
    representing the memberof, the scope, the name, and variation.
    @param {string} longname
    @param {string} forcedMemberof
    @returns {object} Representing the properties of the given name.
 */
exports.shorten = function(longname, forcedMemberof) {
    // quoted strings in a longname are atomic, convert to tokens
    var atoms = [], token;

    // handle quoted names like foo["bar"] or foo['bar']
    longname = longname.replace(/(\[?["'].+?["']\]?)/g, function($) {
        var dot = '';
        if ( /^\[/.test($) ) {
            dot = '.';
            $ = $.replace( /^\[/g, '' ).replace( /\]$/g, '' );
        }

        token = '@{' + atoms.length + '}@';
        atoms.push($);

        return dot + token; // foo["bar"] => foo.@{1}@
    });

    var name = '',
        scope = '', // ., ~, or #
        memberof =  '',
        parts,
        variation;

    longname = prototypeToPunc(longname);

    if (typeof forcedMemberof !== 'undefined') {
        name = longname.substr(forcedMemberof.length);
        parts = forcedMemberof.match(/^(.*?)([#.~]?)$/);

        if (parts[1]) { memberof = parts[1] || forcedMemberof; }
        if (parts[2]) { scope = parts[2]; }
    }
    else {
        parts = longname ?
                (longname.match( /^(:?(.+)([#.~]))?(.+?)$/ ) || []).reverse() :
                [''];

        name = parts[0] || ''; // ensure name is always initialised to avoid error being thrown when calling replace on undefined [gh-24]
        scope = parts[1] || ''; // ., ~, or #
        memberof = parts[2] || '';
    }

    // like /** @name foo.bar(2) */
    if ( /(.+)\(([^)]+)\)$/.test(name) ) {
        name = RegExp.$1;
        variation = RegExp.$2;
    }

    //// restore quoted strings back again
    var i = atoms.length;
    while (i--) {
        longname = longname.replace('@{' + i + '}@', atoms[i]);
        memberof = memberof.replace('@{' + i + '}@', atoms[i]);
        scope = scope.replace('@{' + i + '}@', atoms[i]);
        name = name.replace('@{' + i + '}@', atoms[i]);
    }

    ////
    return {longname: longname, memberof: memberof, scope: scope, name: name, variation: variation};
};

/**
    Split a string that starts with a name and ends with a description into its parts.
    @param {string} nameDesc
    @returns {object} Hash with "name" and "description" properties.
 */
exports.splitName = function(nameDesc) {
    // like: name, [name], name text, [name] text, name - text, or [name] - text
    // the hyphen must be on the same line as the name; this prevents us from treating a Markdown
    // dash as a separator
    nameDesc.match(/^(\[[^\]]+\]|\S+)((?:[ \t]*\-\s*|\s+)(\S[\s\S]*))?$/);
    return {
        name: RegExp.$1,
        description: RegExp.$3
    };
};
