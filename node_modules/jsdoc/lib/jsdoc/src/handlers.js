/**
 * @module jsdoc/src/handlers
 */
'use strict';

var jsdoc = {
    doclet: require('jsdoc/doclet'),
    name: require('jsdoc/name'),
    util: {
        logger: require('jsdoc/util/logger')
    }
};
var util = require('util');

var currentModule = null;

var moduleRegExp = /^((?:module.)?exports|this)(\.|$)/;

function getNewDoclet(comment, e) {
    var Doclet = jsdoc.doclet.Doclet;
    var doclet;
    var err;

    try {
        doclet = new Doclet(comment, e);
    }
    catch (error) {
        err = new Error( util.format('cannot create a doclet for the comment "%s": %s',
            comment.replace(/[\r\n]/g, ''), error.message) );
        jsdoc.util.logger.error(err);
        doclet = new Doclet('', e);
    }

    return doclet;
}

function setCurrentModule(doclet) {
    if (doclet.kind === 'module') {
        currentModule = doclet.longname;
    }
}

function setDefaultScopeMemberOf(doclet) {
    // add @inner and @memberof tags unless the current module exports only this symbol
    if (currentModule && currentModule !== doclet.name) {
        // add @inner unless the current module exports only this symbol
        if (!doclet.scope) {
            doclet.addTag('inner');
        }

        if (!doclet.memberof && doclet.scope !== 'global') {
            doclet.addTag('memberof', currentModule);
        }
    }
}

/**
 * Attach these event handlers to a particular instance of a parser.
 * @param parser
 */
exports.attachTo = function(parser) {
    function filter(doclet) {
        // you can't document prototypes
        if ( /#$/.test(doclet.longname) ) {
            return true;
        }

        return false;
    }

    function addDoclet(newDoclet) {
        var e;
        if (newDoclet) {
            setCurrentModule(newDoclet);
            e = { doclet: newDoclet };
            parser.emit('newDoclet', e);

            if ( !e.defaultPrevented && !filter(e.doclet) ) {
                parser.addResult(e.doclet);
            }
        }
    }

    // TODO: for clarity, decompose into smaller functions
    function newSymbolDoclet(docletSrc, e) {
        var memberofName = null,
            newDoclet = getNewDoclet(docletSrc, e);

        // A JSDoc comment can define a symbol name by including:
        //
        // + A `@name` tag
        // + Another tag that accepts a name, such as `@function`
        //
        // When the JSDoc comment defines a symbol name, we treat it as a "virtual comment" for a
        // symbol that isn't actually present in the code. And if a virtual comment is attached to
        // a symbol, it's quite possible that the comment and symbol have nothing to do with one
        // another.
        //
        // As a result, if we create a doclet for a `symbolFound` event, and we've already added a
        // name attribute by parsing the JSDoc comment, we need to create a new doclet that ignores
        // the attached JSDoc comment and only looks at the code.
        if (newDoclet.name) {
            // try again, without the comment
            e.comment = '@undocumented';
            newDoclet = getNewDoclet(e.comment, e);
        }

        if (newDoclet.alias) {
            if (newDoclet.alias === '{@thisClass}') {
                memberofName = parser.resolveThis(e.astnode);

                // "class" refers to the owner of the prototype, not the prototype itself
                if ( /^(.+?)(\.prototype|#)$/.test(memberofName) ) {
                    memberofName = RegExp.$1;
                }
                newDoclet.alias = memberofName;
            }
            newDoclet.addTag('name', newDoclet.alias);
            newDoclet.postProcess();
        }
        else if (e.code && e.code.name) { // we need to get the symbol name from code
            newDoclet.addTag('name', e.code.name);
            if (!newDoclet.memberof && e.astnode) {
                var basename = null,
                    scope = '';
                if ( moduleRegExp.test(newDoclet.name) ) {
                    var nameStartsWith = RegExp.$1;

                    // remove stuff that indicates module membership (but don't touch the name
                    // `module.exports`, which identifies the module object itself)
                    if (newDoclet.name !== 'module.exports') {
                        newDoclet.name = newDoclet.name.replace(moduleRegExp, '');
                    }

                    // like /** @module foo */ exports.bar = 1;
                    // or /** @module foo */ module.exports.bar = 1;
                    // but not /** @module foo */ module.exports = 1;
                    if ( (nameStartsWith === 'exports' || nameStartsWith === 'module.exports') &&
                        newDoclet.name !== 'module.exports' && currentModule ) {
                        memberofName = currentModule;
                        scope = 'static';
                    }
                    else if (newDoclet.name === 'module.exports' && currentModule) {
                        newDoclet.addTag('name', currentModule);
                        newDoclet.postProcess();
                    }
                    else {
                        // like /** @module foo */ exports = {bar: 1};
                        // or /** blah */ this.foo = 1;
                        memberofName = parser.resolveThis(e.astnode);
                        scope = nameStartsWith === 'exports' ? 'static' : 'instance';

                        // like /** @module foo */ this.bar = 1;
                        if (nameStartsWith === 'this' && currentModule && !memberofName) {
                            memberofName = currentModule;
                            scope = 'static';
                        }
                    }

                    if (memberofName) {
                        if (newDoclet.name) {
                            newDoclet.name = memberofName + (scope === 'instance' ? '#' : '.') +
                                newDoclet.name;
                        }
                        else { newDoclet.name = memberofName; }
                    }
                }
                else {
                    memberofName = parser.astnodeToMemberof(e.astnode);
                    if( Array.isArray(memberofName) ) {
                        basename = memberofName[1];
                        memberofName = memberofName[0];
                    }
                }

                if (memberofName) {
                    newDoclet.addTag('memberof', memberofName);
                    if (basename) {
                        newDoclet.name = (newDoclet.name || '')
                            .replace(new RegExp('^' + RegExp.escape(basename) + '.'), '');
                    }
                }
                else {
                    setDefaultScopeMemberOf(newDoclet);
                }
            }

            newDoclet.postProcess();
        }
        else {
            return false;
        }

        // set the scope to global unless a) the doclet is a memberof something or b) the current
        // module exports only this symbol
        if (!newDoclet.memberof && currentModule !== newDoclet.name) {
            newDoclet.scope = 'global';
        }

        addDoclet.call(parser, newDoclet);
        e.doclet = newDoclet;
    }

    // handles JSDoc comments that include a @name tag -- the code is ignored in such a case
    parser.on('jsdocCommentFound', function(e) {
        var newDoclet = getNewDoclet(e.comment, e);

        if (!newDoclet.name) {
            return false; // only interested in virtual comments (with a @name) here
        }

        setDefaultScopeMemberOf(newDoclet);
        newDoclet.postProcess();
        addDoclet.call(parser, newDoclet);

        e.doclet = newDoclet;
    });

    // handles named symbols in the code, may or may not have a JSDoc comment attached
    parser.on('symbolFound', function(e) {
        var subDoclets = e.comment.split(/@also\b/g);

        for (var i = 0, l = subDoclets.length; i < l; i++) {
            newSymbolDoclet.call(parser, subDoclets[i], e);
        }
    });

    parser.on('fileComplete', function(e) {
        currentModule = null;
    });
};
