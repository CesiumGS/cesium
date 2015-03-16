/*global app, env */
/**
    Define tags that are known in JSDoc.
    @module jsdoc/tag/dictionary/definitions

    @author Michael Mathews <micmath@gmail.com>
    @license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */
'use strict';

var hasOwnProp = Object.prototype.hasOwnProperty;
var jsdoc = {
    name: require('jsdoc/name'),
    src: {
        astnode: require('jsdoc/src/astnode')
    },
    tag: {
        type: require('jsdoc/tag/type')
    },
    util: {
        logger: require('jsdoc/util/logger')
    }
};
var path = require('jsdoc/path');
var Syntax = require('jsdoc/src/syntax').Syntax;

var GLOBAL_LONGNAME = jsdoc.name.GLOBAL_LONGNAME;
var MODULE_PREFIX = jsdoc.name.MODULE_PREFIX;

function getSourcePaths() {
    var sourcePaths = env.sourceFiles.slice(0) || [];

    if (env.opts._) {
        env.opts._.forEach(function(sourcePath) {
            var resolved = path.resolve(env.pwd, sourcePath);
            if (sourcePaths.indexOf(resolved) === -1) {
                sourcePaths.push(resolved);
            }
        });
    }

    return sourcePaths;
}

function filepathMinusPrefix(filepath) {
    var sourcePaths = getSourcePaths();
    var commonPrefix = path.commonPrefix(sourcePaths);
    var result = '';

    if (filepath) {
        // always use forward slashes
        result = (filepath + path.sep).replace(commonPrefix, '')
            .replace(/\\/g, '/');
    }

    if (result.length > 0 && result[result.length - 1] !== '/') {
        result += '/';
    }

    return result;
}

/** @private */
function setDocletKindToTitle(doclet, tag) {
    doclet.addTag( 'kind', tag.title );
}

function setDocletScopeToTitle(doclet, tag) {
    try {
        doclet.setScope(tag.title);
    }
    catch(e) {
        jsdoc.util.logger.error(e.message);
    }
}

function setDocletNameToValue(doclet, tag) {
    if (tag.value && tag.value.description) { // as in a long tag
        doclet.addTag( 'name', tag.value.description);
    }
    else if (tag.text) { // or a short tag
        doclet.addTag('name', tag.text);
    }
}

function setDocletNameToValueName(doclet, tag) {
    if (tag.value && tag.value.name) {
        doclet.addTag('name', tag.value.name);
    }
}

function setDocletDescriptionToValue(doclet, tag) {
    if (tag.value) {
        doclet.addTag( 'description', tag.value );
    }
}

function setDocletTypeToValueType(doclet, tag) {
    if (tag.value && tag.value.type) {
        // Add the type names and other type properties (such as `optional`).
        // Don't overwrite existing properties.
        Object.keys(tag.value).forEach(function(prop) {
            if ( !hasOwnProp.call(doclet, prop) ) {
                doclet[prop] = tag.value[prop];
            }
        });
    }
}

function setNameToFile(doclet, tag) {
    var name;

    if (doclet.meta.filename) {
        name = filepathMinusPrefix(doclet.meta.path) + doclet.meta.filename;
        doclet.addTag('name', name);
    }
}

function setDocletMemberof(doclet, tag) {
    if (tag.value && tag.value !== '<global>') {
        doclet.setMemberof(tag.value);
    }
}

function applyNamespace(docletOrNs, tag) {
    if (typeof docletOrNs === 'string') { // ns
        tag.value = app.jsdoc.name.applyNamespace(tag.value, docletOrNs);
    }
    else { // doclet
        if (!docletOrNs.name) {
            return; // error?
        }

        //doclet.displayname = doclet.name;
        docletOrNs.longname = app.jsdoc.name.applyNamespace(docletOrNs.name, tag.title);
    }
}

function setDocletNameToFilename(doclet, tag) {
    var name = '';

    if (doclet.meta.path) {
        name = filepathMinusPrefix(doclet.meta.path);
    }
    name += doclet.meta.filename.replace(/\.js$/i, '');

    doclet.name = name;
}

function parseBorrows(doclet, tag) {
    var m = /^(\S+)(?:\s+as\s+(\S+))?$/.exec(tag.text);
    if (m) {
        if (m[1] && m[2]) {
            return { target: m[1], source: m[2] };
        }
        else if (m[1]) {
            return { target: m[1] };
        }
    } else {
        return {};
    }
}

function firstWordOf(string) {
    var m = /^(\S+)/.exec(string);
    if (m) { return m[1]; }
    else { return ''; }
}

/** Populate the given dictionary with all known JSDoc tag definitions.
    @param {module:jsdoc/tag/dictionary} dictionary
*/
exports.defineTags = function(dictionary) {

    dictionary.defineTag('abstract', {
        mustNotHaveValue: true,
        onTagged: function(doclet, tag) {
            // since "abstract" is reserved word in JavaScript let's use "virtual" in code
            doclet.virtual = true;
        }
    })
    .synonym('virtual');

    dictionary.defineTag('access', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            // only valid values are private and protected, public is default
            if ( /^(private|protected)$/i.test(tag.value) ) {
                doclet.access = tag.value.toLowerCase();
            }
            else {
                delete doclet.access;
            }
        }
    });

    dictionary.defineTag('alias', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            doclet.alias = tag.value;
        }
    });

    // Special separator tag indicating that multiple doclets should be generated for the same
    // comment. Used internally (and by some JSDoc users, although it's not officially supported).
    //
    // In the following example, the parser will replace `//**` with an `@also` tag:
    //
    // /**
    //  * Foo.
    //  *//**
    //  * Foo with a param.
    //  * @param {string} bar
    //  */
    //  function foo(bar) {}
    dictionary.defineTag('also', {
        onTagged: function(doclet, tag) {
            // let the parser handle it; we define the tag here to avoid "not a known tag" errors
        }
    });

    // this symbol inherits from the specified symbol
    dictionary.defineTag('augments', {
        mustHaveValue: true,
        // Allow augments value to be specified as a normal type, e.g. {Type}
        onTagText: function(text) {

            var tagType = jsdoc.tag.type.parse(text, false, true);
            return tagType.typeExpression || text;
        },
        onTagged: function(doclet, tag) {
            doclet.augment( firstWordOf(tag.value) );
        }
    })
    .synonym('extends');

    dictionary.defineTag('author', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            if (!doclet.author) { doclet.author = []; }
            doclet.author.push(tag.value);
        }
    });

    // this symbol has a member that should use the same docs as another symbol
    dictionary.defineTag('borrows', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            var borrows = parseBorrows(doclet, tag);
            doclet.borrow(borrows.target, borrows.source);
        }
    });

    dictionary.defineTag('class', {
        onTagged: function(doclet, tag) {
            doclet.addTag('kind', 'class');

            // handle special case where both @class and @constructor tags exist in same doclet
            if (tag.originalTitle === 'class') {
                var looksLikeDesc = (tag.value || '').match(/\S+\s+\S+/); // multiple words after @class?
                if ( looksLikeDesc || /@construct(s|or)\b/i.test(doclet.comment) ) {
                    doclet.classdesc = tag.value; // treat the @class tag as a @classdesc tag instead
                    return;
                }
            }

            setDocletNameToValue(doclet, tag);
        }
    })
    .synonym('constructor');

    dictionary.defineTag('classdesc', {
        onTagged: function(doclet, tag) {
            doclet.classdesc = tag.value;
        }
    });

    dictionary.defineTag('constant', {
        canHaveType: true,
        canHaveName: true,
        onTagged: function(doclet, tag) {
            setDocletKindToTitle(doclet, tag);
            setDocletNameToValueName(doclet, tag);
            setDocletTypeToValueType(doclet, tag);
        }
    })
    .synonym('const');

    dictionary.defineTag('constructs', {
        onTagged: function(doclet, tag) {
            var ownerClassName;
            if (!tag.value) {
                ownerClassName = '{@thisClass}'; // this can be resolved later in the handlers
            }
            else {
                ownerClassName = firstWordOf(tag.value);
            }
            doclet.addTag('alias', ownerClassName);
            doclet.addTag('kind', 'class');
        }
    });

    dictionary.defineTag('copyright', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            doclet.copyright = tag.value;
        }
    });

    dictionary.defineTag('default', {
        onTagged: function(doclet, tag) {
            var type;
            var value;

            var nodeToString = jsdoc.src.astnode.nodeToString;

            if (tag.value) {
                doclet.defaultvalue = tag.value;
            }
            else if (doclet.meta && doclet.meta.code && doclet.meta.code.value) {
                type = doclet.meta.code.type;
                value = doclet.meta.code.value;

                switch(type) {
                    case Syntax.ArrayExpression:
                        doclet.defaultvalue = nodeToString(doclet.meta.code.node);
                        doclet.defaultvaluetype = 'array';
                        break;

                    case Syntax.Literal:
                        doclet.defaultvalue = String(value);
                        break;

                    case Syntax.ObjectExpression:
                        doclet.defaultvalue = nodeToString(doclet.meta.code.node);
                        doclet.defaultvaluetype = 'object';
                        break;

                    default:
                        // do nothing
                        break;
                }
            }
        }
    })
    .synonym('defaultvalue');

    dictionary.defineTag('deprecated', {
        // value is optional
        onTagged: function(doclet, tag) {
            doclet.deprecated = tag.value || true;
        }
    });

    dictionary.defineTag('description', {
        mustHaveValue: true
    })
    .synonym('desc');

    dictionary.defineTag('enum', {
        canHaveType: true,
        onTagged: function(doclet, tag) {
            doclet.kind = 'member';
            doclet.isEnum = true;
            setDocletTypeToValueType(doclet, tag);
        }
    });

    dictionary.defineTag('event', {
        isNamespace: true,
        onTagged: function(doclet, tag) {
            setDocletKindToTitle(doclet, tag);
            setDocletNameToValue(doclet, tag);
        }
    });

    dictionary.defineTag('example', {
        keepsWhitespace: true,
        removesIndent: true,
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            if (!doclet.examples) { doclet.examples = []; }
            doclet.examples.push(tag.value);
        }
    });

    dictionary.defineTag('exports', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            var modName = firstWordOf(tag.value);

            doclet.addTag('alias', modName);
            doclet.addTag('kind', 'module');
         }
    });

    dictionary.defineTag('external', {
        canHaveType: true,
        isNamespace: true,
        onTagged: function(doclet, tag) {
            setDocletKindToTitle(doclet, tag);
            if (tag.value && tag.value.type) {
                setDocletTypeToValueType(doclet, tag);
                doclet.addTag('name', doclet.type.names[0]);
            }
            else {
                setDocletNameToValue(doclet, tag);
            }
        }
    })
    .synonym('host');

    dictionary.defineTag('file', {
        onTagged: function(doclet, tag) {
            setNameToFile(doclet, tag);
            setDocletKindToTitle(doclet, tag);
            setDocletDescriptionToValue(doclet, tag);

            doclet.preserveName = true;
        }
    })
    .synonym('fileoverview')
    .synonym('overview');

    dictionary.defineTag('fires', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            if (!doclet.fires) { doclet.fires = []; }
            applyNamespace('event', tag);
            doclet.fires.push(tag.value);
        }
    })
    .synonym('emits');

    dictionary.defineTag('function', {
        onTagged: function(doclet, tag) {
            setDocletKindToTitle(doclet, tag);
            setDocletNameToValue(doclet, tag);
        }
    })
    .synonym('func')
    .synonym('method');

    dictionary.defineTag('global', {
        mustNotHaveValue: true,
        onTagged: function(doclet, tag) {
            doclet.scope = 'global';
            delete doclet.memberof;
        }
    });

    dictionary.defineTag('ignore', {
        mustNotHaveValue: true,
        onTagged: function(doclet, tag) {
            doclet.ignore = true;
        }
    });

    dictionary.defineTag('inner', {
        onTagged: function(doclet, tag) {
            setDocletScopeToTitle(doclet, tag);
         }
    });

    dictionary.defineTag('instance', {
        onTagged: function(doclet, tag) {
            setDocletScopeToTitle(doclet, tag);
        }
    });

    dictionary.defineTag('kind', {
        mustHaveValue: true
    });

    dictionary.defineTag('lends', {
        onTagged: function(doclet, tag) {
            doclet.alias = tag.value || GLOBAL_LONGNAME;
            doclet.addTag('undocumented');
        }
    });

    dictionary.defineTag('license', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            doclet.license = tag.value;
        }
    });

    dictionary.defineTag('listens', {
        mustHaveValue: true,
        onTagged: function (doclet, tag) {
            if (!doclet.listens) { doclet.listens = []; }
            applyNamespace('event', tag);
            doclet.listens.push(tag.value);
            // TODO: verify that parameters match the event parameters?
        }
    });

    dictionary.defineTag('member', {
        canHaveType: true,
        canHaveName: true,
        onTagged: function(doclet, tag) {
            setDocletKindToTitle(doclet, tag);
            setDocletNameToValueName(doclet, tag);
            setDocletTypeToValueType(doclet, tag);
        }
    })
    .synonym('var');

    dictionary.defineTag('memberof', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            if (tag.originalTitle === 'memberof!') {
                doclet.forceMemberof = true;
                if (tag.value === GLOBAL_LONGNAME) {
                    doclet.addTag('global');
                    delete doclet.memberof;
                }
            }
            setDocletMemberof(doclet, tag);
         }
    })
    .synonym('memberof!');

    // this symbol mixes in all of the specified object's members
    dictionary.defineTag('mixes', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            var source = firstWordOf(tag.value);
            doclet.mix(source);
        }
    });

    dictionary.defineTag('mixin', {
        onTagged: function(doclet, tag) {
            setDocletKindToTitle(doclet, tag);
            setDocletNameToValue(doclet, tag);
        }
    });

    dictionary.defineTag('module', {
        canHaveType: true,
        isNamespace: true,
        onTagged: function(doclet, tag) {
            setDocletKindToTitle(doclet, tag);
            setDocletNameToValue(doclet, tag);
            if (!doclet.name) {
                setDocletNameToFilename(doclet, tag);
            }
            setDocletTypeToValueType(doclet, tag);
         }
    });

    dictionary.defineTag('name', {
        mustHaveValue: true
    });

    dictionary.defineTag('namespace', {
        canHaveType: true,
        onTagged: function(doclet, tag) {
            setDocletKindToTitle(doclet, tag);
            setDocletNameToValue(doclet, tag);
            setDocletTypeToValueType(doclet, tag);
        }
    });

    dictionary.defineTag('param', {
        //mustHaveValue: true, // param name can be found in the source code if not provided
        canHaveType: true,
        canHaveName: true,
        onTagged: function(doclet, tag) {
            if (!doclet.params) { doclet.params = []; }
            doclet.params.push(tag.value || {});
        }
    })
    .synonym('argument')
    .synonym('arg');

    dictionary.defineTag('private', {
        mustNotHaveValue: true,
        onTagged: function(doclet, tag) {
            doclet.access = 'private';
        }
    });

    dictionary.defineTag('property', {
        mustHaveValue: true,
        canHaveType: true,
        canHaveName: true,
        onTagged: function(doclet, tag) {
            if (!doclet.properties) { doclet.properties = []; }
            doclet.properties.push(tag.value);
        }
    })
    .synonym('prop');

    dictionary.defineTag('protected', {
        mustNotHaveValue: true,
        onTagged: function(doclet, tag) {
            doclet.access = 'protected';
        }
    });

    dictionary.defineTag('public', {
        mustNotHaveValue: true,
        onTagged: function(doclet, tag) {
            delete doclet.access; // public is default
        }
    });

    // use this instead of old deprecated @final tag
    dictionary.defineTag('readonly', {
        mustNotHaveValue: true,
        onTagged: function(doclet, tag) {
            doclet.readonly = true;
        }
    });

    dictionary.defineTag('requires', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            var requiresName;

            // inline link tags are passed through as-is so that `@requires {@link foo}` works
            if ( require('jsdoc/tag/inline').isInlineTag(tag.value, 'link\\S*') ) {
                requiresName = tag.value;
            }
            // otherwise, assume it's a module
            else {
                requiresName = firstWordOf(tag.value);
                if (requiresName.indexOf(MODULE_PREFIX) !== 0) {
                    requiresName = MODULE_PREFIX + requiresName;
                }
            }

            if (!doclet.requires) { doclet.requires = []; }
            doclet.requires.push(requiresName);
        }
    });

    dictionary.defineTag('returns', {
        mustHaveValue: true,
        canHaveType: true,
        onTagged: function(doclet, tag) {
            if (!doclet.returns) { doclet.returns = []; }
            doclet.returns.push(tag.value);
        }
    })
    .synonym('return');

    dictionary.defineTag('see', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            if (!doclet.see) { doclet.see = []; }
            doclet.see.push(tag.value);
        }
    });

    dictionary.defineTag('since', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            doclet.since = tag.value;
        }
    });

    dictionary.defineTag('static', {
        onTagged: function(doclet, tag) {
            setDocletScopeToTitle(doclet, tag);
        }
    });

    dictionary.defineTag('summary', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            doclet.summary = tag.value;
        }
    });

    dictionary.defineTag('this', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            doclet['this'] = firstWordOf(tag.value);
        }
    });

    dictionary.defineTag('todo', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            if (!doclet.todo) { doclet.todo = []; }
            doclet.todo.push(tag.value);
        }
    });

    dictionary.defineTag('throws', {
        mustHaveValue: true,
        canHaveType: true,
        onTagged: function(doclet, tag) {
            if (!doclet.exceptions) { doclet.exceptions = []; }
            doclet.exceptions.push(tag.value);
            setDocletTypeToValueType(doclet, tag);
        }
    })
    .synonym('exception');

    dictionary.defineTag('tutorial', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            if (!doclet.tutorials) { doclet.tutorials = []; }
            doclet.tutorials.push(tag.value);
        }
    });

    dictionary.defineTag('type', {
        mustHaveValue: true,
        mustNotHaveDescription: true,
        canHaveType: true,
        onTagText: function(text) {
            var closeIdx;
            var openIdx;

            var OPEN_BRACE = '{';
            var CLOSE_BRACE = '}';

            // remove line breaks
            text = text.replace(/[\f\n\r]/g, '');

            // Text must be a type expression; for backwards compatibility, we add braces if they're
            // missing. But do NOT add braces to things like `@type {string} some pointless text`.
            openIdx = text.indexOf(OPEN_BRACE);
            closeIdx = text.indexOf(CLOSE_BRACE);

            // a type expression is at least one character long
            if ( openIdx !== 0 || closeIdx <= openIdx + 1) {
                text = OPEN_BRACE + text + CLOSE_BRACE;
            }

            return text;
        },
        onTagged: function(doclet, tag) {
            if (tag.value && tag.value.type) {
                setDocletTypeToValueType(doclet, tag);

                // for backwards compatibility, we allow @type for functions to imply return type
                if (doclet.kind === 'function') {
                    doclet.addTag('returns', tag.text);
                }
            }
        }
    });

    dictionary.defineTag('typedef', {
        canHaveType: true,
        canHaveName: true,
        onTagged: function(doclet, tag) {
            setDocletKindToTitle(doclet, tag);

            if (tag.value) {
                setDocletNameToValueName(doclet, tag);

                // callbacks are always type {function}
                if (tag.originalTitle === 'callback') {
                    doclet.type = {
                        names: [
                            'function'
                        ]
                    };
                }
                else {
                    setDocletTypeToValueType(doclet, tag);
                }
            }
        }
    })
    .synonym('callback');

    dictionary.defineTag('undocumented', {
        mustNotHaveValue: true,
        onTagged: function(doclet, tag) {
            doclet.undocumented = true;
            doclet.comment = '';
        }
    });

    dictionary.defineTag('variation', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            doclet.variation = tag.value;
        }
    });

    dictionary.defineTag('version', {
        mustHaveValue: true,
        onTagged: function(doclet, tag) {
            doclet.version = tag.value;
        }
    });
};
