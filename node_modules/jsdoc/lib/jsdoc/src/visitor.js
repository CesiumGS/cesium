/**
 * @module jsdoc/src/visitor
 */
'use strict';

// TODO: consider exporting more stuff so users can override it

var jsdoc = {
    doclet: require('jsdoc/doclet'),
    src: {
        astnode: require('jsdoc/src/astnode'),
        syntax: require('jsdoc/src/syntax')
    },
    util: {
        logger: require('jsdoc/util/logger')
    }
};
var util = require('util');

var hasOwnProp = Object.prototype.hasOwnProperty;
var Syntax = jsdoc.src.syntax.Syntax;

// TODO: docs
function getLeadingComment(node) {
    var comment = null;
    var leadingComments = node.leadingComments;

    if (Array.isArray(leadingComments) && leadingComments.length && leadingComments[0].raw) {
        comment = leadingComments[0].raw;
    }

    return comment;
}

// TODO: docs
function makeVarsFinisher(scopeDoclet) {
    return function(e) {
        // no need to evaluate all things related to scopeDoclet again, just use it
        if (scopeDoclet && e.doclet && e.doclet.alias) {
            scopeDoclet.meta.vars[e.code.name] = e.doclet.longname;
        }
    };
}

/**
 * For function parameters that have inline documentation, create a function that will merge the
 * inline documentation into the function's doclet. If the parameter is already documented in the
 * function's doclet, the inline documentation will be ignored.
 *
 * @private
 * @param {module:jsdoc/src/parser.Parser} parser - The JSDoc parser.
 * @return {function} A function that merges a parameter's inline documentation into the function's
 * doclet.
 */
function makeInlineParamsFinisher(parser) {
    return function(e) {
        var documentedParams;
        var knownParams;
        var param;
        var parentDoclet;

        var i = 0;

        if (e.doclet && e.doclet.meta && e.doclet.meta.code && e.doclet.meta.code.node &&
            e.doclet.meta.code.node.parent) {
            parentDoclet = parser._getDoclet(e.doclet.meta.code.node.parent.nodeId);
        }
        if (!parentDoclet) {
            return;
        }

        parentDoclet.params = parentDoclet.params || [];
        documentedParams = parentDoclet.params;
        knownParams = parentDoclet.meta.code.paramnames;

        while (true) {
            param = documentedParams[i];

            // is the param already documented? if so, we're done
            if (param && param.name === e.doclet.name) {
                // the doclet is no longer needed
                e.doclet.undocumented = true;
                break;
            }

            // if we ran out of documented params, or we're at the parameter's actual position,
            // splice in the param at the current index
            if ( !param || i === knownParams.indexOf(e.doclet.name) ) {
                documentedParams.splice(i, 0, {
                    type: e.doclet.type,
                    description: '',
                    name: e.doclet.name
                });

                // the doclet is no longer needed
                e.doclet.undocumented = true;

                break;
            }

            i++;
        }
    };
}

// TODO: docs
function SymbolFound(node, filename, extras) {
    var self = this;
    extras = extras || {};

    this.id = extras.id || node.nodeId;
    this.comment = extras.comment || getLeadingComment(node) || '@undocumented';
    this.lineno = extras.lineno || node.loc.start.line;
    this.range = extras.range || node.range;
    this.filename = extras.filename || filename;
    this.astnode = extras.astnode || node;
    this.code = extras.code;
    this.event = extras.event || 'symbolFound';
    this.finishers = extras.finishers || [];

    // make sure the event includes properties that don't have default values
    Object.keys(extras).forEach(function(key) {
        self[key] = extras[key];
    });
}

// TODO: docs
function JsdocCommentFound(comment, filename) {
    this.comment = comment.raw;
    this.lineno = comment.loc.start.line;
    this.filename = filename;
    this.range = comment.range;

    Object.defineProperty(this, 'event', {
        value: 'jsdocCommentFound'
    });
}

// TODO: docs
var Visitor = exports.Visitor = function(parser) {
    this._parser = parser;

    // Mozilla Parser API node visitors added by plugins
    this._nodeVisitors = [];
    // built-in visitors
    this._visitors = [
        this.visitNodeComments,
        this.visitNode
    ];
};

// TODO: docs
Visitor.prototype.addAstNodeVisitor = function(visitor) {
    this._nodeVisitors.push(visitor);
};

// TODO: docs
Visitor.prototype.removeAstNodeVisitor = function(visitor) {
    var idx = this._nodeVisitors.indexOf(visitor);
    if (idx !== -1) {
        this._nodeVisitors.splice(idx, 1);
    }
};

// TODO: docs
Visitor.prototype.getAstNodeVisitors = function() {
    return this._nodeVisitors;
};

// TODO: docs; visitor signature is (node, parser, filename)
Visitor.prototype.visit = function(node, filename) {
    var i;
    var l;

    for (i = 0, l = this._visitors.length; i < l; i++) {
        this._visitors[i].call(this, node, this._parser, filename);
    }

    // we also need to visit standalone comments, which are not attached to a node
    if (node.type === Syntax.Program && node.comments && node.comments.length) {
        for (i = 0, l = node.comments.length; i < l; i++) {
            this.visitNodeComments.call(this, node.comments[i], this._parser, filename);
        }
    }

    return true;
};

// TODO: docs
/**
 * Verify that a block comment exists and that its leading delimiter does not contain three or more
 * asterisks.
 *
 * @private
 * @memberof module:jsdoc/src/parser.Parser
 */
function isValidJsdoc(commentSrc) {
    return commentSrc && commentSrc.indexOf('/***') !== 0;
}

// TODO: docs
function hasJsdocComments(node) {
    return (node && node.leadingComments && node.leadingComments.length > 0) ||
        (node && node.trailingComments && node.trailingComments.length > 0);
}

// TODO: docs
function removeCommentDelimiters(comment) {
    return comment.substring(2, comment.length - 2);
}

// TODO: docs
function updateCommentNode(commentNode, comment) {
    commentNode.raw = comment;
    commentNode.value = removeCommentDelimiters(comment);
}

// TODO: docs
Visitor.prototype.visitNodeComments = function(node, parser, filename) {
    var comment;
    var comments;
    var e;

    var BLOCK_COMMENT = 'Block';

    if ( !hasJsdocComments(node) && (!node.type || node.type !== BLOCK_COMMENT) ) {
        return true;
    }

    comments = [];
    if (node.type === BLOCK_COMMENT) {
        comments.push(node);
    }

    if (node.leadingComments && node.leadingComments.length) {
        comments = node.leadingComments.slice(0);
    }

    if (node.trailingComments && node.trailingComments.length) {
        comments = comments.concat( node.trailingComments.slice(0) );
    }

    for (var i = 0, l = comments.length; i < l; i++) {
        comment = comments[i];
        if ( isValidJsdoc(comment.raw) ) {
            e = new JsdocCommentFound(comment, filename);

            parser.emit(e.event, e, parser);

            if (e.comment !== comment.raw) {
                updateCommentNode(comment, e.comment);
            }
        }
    }

    return true;
};

// TODO: docs
Visitor.prototype.visitNode = function(node, parser, filename) {
    var i;
    var l;

    var e = this.makeSymbolFoundEvent(node, parser, filename);

    if (!node.nodeId) {
        Object.defineProperty(node, 'nodeId', {
            value: parser.getUniqueId()
        });
    }

    if (this._nodeVisitors && this._nodeVisitors.length) {
        for (i = 0, l = this._nodeVisitors.length; i < l; i++) {
            this._nodeVisitors[i].visitNode(node, e, parser, filename);
            if (e.stopPropagation) {
                break;
            }
        }
    }

    if (!e.preventDefault && e.comment && isValidJsdoc(e.comment)) {
        parser.emit(e.event, e, parser);
    }

    // add the node to the parser's lookup table
    parser.addDocletRef(e);

    for (i = 0, l = e.finishers.length; i < l; i++) {
        e.finishers[i].call(parser, e);
    }

    return true;
};

// TODO: docs
// TODO: note that it's essential to call this function before you try to resolve names!
// TODO: may be able to get rid of this using knownAliases
function trackVars(parser, node, e) {
    var enclosingScopeId = node.enclosingScope ? node.enclosingScope.nodeId :
        jsdoc.src.astnode.GLOBAL_NODE_ID;
    var doclet = parser.refs[enclosingScopeId];

    if (doclet) {
        doclet.meta.vars = doclet.meta.vars || {};
        doclet.meta.vars[e.code.name] = null;
        e.finishers.push( makeVarsFinisher(doclet) );
    }
}

// TODO: docs
Visitor.prototype.makeSymbolFoundEvent = function(node, parser, filename) {
    var logger = jsdoc.util.logger;

    var e;
    var basename;
    var i;
    var l;
    var parent;

    var extras = {
        code: jsdoc.src.astnode.getInfo(node)
    };

    switch (node.type) {
        // like: i = 0;
        case Syntax.AssignmentExpression:
            e = new SymbolFound(node, filename, extras);

            trackVars(parser, node, e);

            basename = parser.getBasename(e.code.name);
            if (basename !== 'this') {
                e.code.funcscope = parser.resolveVar(node, basename);
            }

            break;

        // like: function foo() {}
        case Syntax.FunctionDeclaration:
            // falls through

        // like: var foo = function() {};
        case Syntax.FunctionExpression:
            e = new SymbolFound(node, filename, extras);

            trackVars(parser, node, e);

            basename = parser.getBasename(e.code.name);
            e.code.funcscope = parser.resolveVar(node, basename);

            break;

        // like "bar" in: function foo(/** @type {string} */ bar) {}
        // This is an extremely common type of node; we only care about function parameters with
        // inline type annotations. No need to fire events unless they're already commented.
        case Syntax.Identifier:
            parent = node.parent;
            if ( node.leadingComments && parent && jsdoc.src.astnode.isFunction(parent) ) {
                extras.finishers = [makeInlineParamsFinisher(parser)];
                e = new SymbolFound(node, filename, extras);
            }

            break;

        // like "obj.prop" in: /** @typedef {string} */ obj.prop;
        // Closure Compiler uses this pattern extensively for enums.
        // No need to fire events for them unless they're already commented.
        case Syntax.MemberExpression:
            if (node.leadingComments) {
                e = new SymbolFound(node, filename, extras);
            }

            break;

        // like the object literal in: function Foo = Class.create(/** @lends Foo */ {});
        case Syntax.ObjectExpression:
            e = new SymbolFound(node, filename, extras);

            break;

        // like "bar: true" in: var foo = { bar: true };
        // like "get bar() {}" in: var foo = { get bar() {} };
        case Syntax.Property:
            if ( node.kind !== ('get' || 'set') ) {
                extras.finishers = [parser.resolveEnum];
            }

            e = new SymbolFound(node, filename, extras);

            break;

        // like: var i = 0;
        case Syntax.VariableDeclarator:
            e = new SymbolFound(node, filename, extras);

            trackVars(parser, node, e);

            basename = parser.getBasename(e.code.name);

            break;

        // for now, log a warning for all ES6 nodes, since we don't do anything useful with them
        case Syntax.ArrowFunctionExpression:
        case Syntax.ClassBody:
        case Syntax.ClassDeclaration:
        case Syntax.ClassExpression:
        case Syntax.ExportBatchSpecifier:
        case Syntax.ExportDeclaration:
        case Syntax.ExportSpecifier:
        case Syntax.ImportDeclaration:
        case Syntax.ImportSpecifier:
        case Syntax.MethodDefinition:
        case Syntax.ModuleDeclaration:
        case Syntax.SpreadElement:
        case Syntax.TaggedTemplateExpression:
        case Syntax.TemplateElement:
        case Syntax.TemplateLiteral:
            logger.warn('JSDoc does not currently handle %s nodes. Source file: %s, line %s',
                node.type, filename, (node.loc && node.loc.start) ? node.loc.start.line : '??');

            break;

        default:
            // ignore
    }

    if (!e) {
        e = {
            finishers: []
        };
    }

    return e;
};
