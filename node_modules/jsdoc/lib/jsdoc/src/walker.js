/**
 * Traversal utilities for ASTs that are compatible with the Mozilla Parser API. Adapted from
 * [Acorn](http://marijnhaverbeke.nl/acorn/).
 *
 * @module jsdoc/src/walker
 * @license MIT
 */
'use strict';

var astnode = require('jsdoc/src/astnode');
var doclet = require('jsdoc/doclet');
var Syntax = require('jsdoc/src/syntax').Syntax;

/**
 * Check whether an AST node creates a new scope.
 *
 * @private
 * @param {Object} node - The AST node to check.
 * @return {Boolean} Set to `true` if the node creates a new scope, or `false` in all other cases.
 */
function isScopeNode(node) {
    // TODO: handle blocks with "let" declarations
    return node && typeof node === 'object' && (node.type === Syntax.CatchClause ||
        node.type === Syntax.FunctionDeclaration || node.type === Syntax.FunctionExpression);
}

// TODO: docs
function getCurrentScope(scopes) {
    return scopes[scopes.length - 1] || null;
}

// TODO: docs
function moveComments(source, target) {
    if (source.leadingComments) {
        target.leadingComments = source.leadingComments.slice(0);
        source.leadingComments = [];
    }
}

function leafNode(node, parent, state, cb) {}

// TODO: docs
var walkers = exports.walkers = {};

walkers[Syntax.ArrayExpression] = function arrayExpression(node, parent, state, cb) {
    for (var i = 0, l = node.elements.length; i < l; i++) {
        var e = node.elements[i];
        if (e) {
            cb(e, node, state);
        }
    }
};

// TODO: verify correctness
walkers[Syntax.ArrayPattern] = function arrayPattern(node, parent, state, cb) {
    for (var i = 0, l = node.elements.length; i < l; i++) {
        var e = node.elements[i];
        // must be an identifier or an expression
        if (e && e.type !== Syntax.Identifier) {
            cb(e, node, state);
        }
    }
};

walkers[Syntax.ArrowFunctionExpression] =
    function arrowFunctionExpression(node, parent, state, cb) {
    var i;
    var l;

    // used for function declarations, so we include it here
    if (node.id) {
        cb(node.id, node, state);
    }

    for (i = 0, l = node.params.length; i < l; i++) {
        cb(node.params[i], node, state);
    }

    for (i = 0, l = node.defaults.length; i < l; i++) {
        cb(node.defaults[i], node, state);
    }

    cb(node.body, node, state);

    if (node.rest) {
        cb(node.rest, node, state);
    }
};

walkers[Syntax.AssignmentExpression] = function assignmentExpression(node, parent, state, cb) {
    cb(node.left, node, state);
    cb(node.right, node, state);
};

walkers[Syntax.BinaryExpression] = function binaryExpression(node, parent, state, cb) {
    cb(node.left, node, state);
    cb(node.right, node, state);
};

walkers[Syntax.BlockStatement] = function blockStatement(node, parent, state, cb) {
    for (var i = 0, l = node.body.length; i < l; i++) {
        cb(node.body[i], node, state);
    }
};

walkers[Syntax.BreakStatement] = leafNode;

walkers[Syntax.CallExpression] = function callExpression(node, parent, state, cb) {
    var i;
    var l;

    cb(node.callee, node, state);
    if (node.arguments) {
        for (i = 0, l = node.arguments.length; i < l; i++) {
            cb(node.arguments[i], node, state);
        }
    }
};

walkers[Syntax.CatchClause] = leafNode;

walkers[Syntax.ClassBody] = walkers[Syntax.BlockStatement];

walkers[Syntax.ClassDeclaration] = function classDeclaration(node, parent, state, cb) {
    if (node.id) {
        cb(node.id, node, state);
    }

    if (node.superClass) {
        cb(node.superClass, node, state);
    }

    if (node.body) {
        cb(node.body, node, state);
    }
};

walkers[Syntax.ClassExpression] = walkers[Syntax.ClassDeclaration];

// TODO: verify correctness
walkers[Syntax.ComprehensionBlock] = walkers[Syntax.AssignmentExpression];

// TODO: verify correctness
walkers[Syntax.ComprehensionExpression] =
    function comprehensionExpression(node, parent, state, cb) {
    cb(node.body, node, state);

    if (node.filter) {
        cb(node.filter, node, state);
    }

    for (var i = 0, l = node.blocks.length; i < l; i++) {
        cb(node.blocks[i], node, state);
    }
};

walkers[Syntax.ConditionalExpression] = function conditionalExpression(node, parent, state, cb) {
    cb(node.test, node, state);
    cb(node.consequent, node, state);
    cb(node.alternate, node, state);
};

walkers[Syntax.ContinueStatement] = leafNode;

walkers[Syntax.DebuggerStatement] = leafNode;

walkers[Syntax.DoWhileStatement] = function doWhileStatement(node, parent, state, cb) {
    cb(node.test, node, state);
    cb(node.body, node, state);
};

walkers[Syntax.EmptyStatement] = leafNode;

walkers[Syntax.ExportBatchSpecifier] = leafNode;

walkers[Syntax.ExportDeclaration] = function exportDeclaration(node, parent, state, cb) {
    var i;
    var l;

    if (node.declaration) {
        for (i = 0, l = node.declaration.length; i < l; i++) {
            cb(node.declaration[i], node, state);
        }
    }

    if (node.specifiers) {
        for (i = 0, l = node.specifiers.length; i < l; i++) {
            cb(node.specifiers[i], node, state);
        }
    }

    if (node.source) {
        cb(node.source, node, state);
    }
};

walkers[Syntax.ExportSpecifier] = function exportSpecifier(node, parent, state, cb) {
    if (node.id) {
        cb(node.id, node, state);
    }

    if (node.name) {
        cb(node.name, node, state);
    }
};

walkers[Syntax.ExpressionStatement] = function expressionStatement(node, parent, state, cb) {
    cb(node.expression, node, state);
};

walkers[Syntax.ForInStatement] = function forInStatement(node, parent, state, cb) {
    cb(node.left, node, state);
    cb(node.right, node, state);
    cb(node.body, node, state);
};

walkers[Syntax.ForOfStatement] = walkers[Syntax.ForInStatement];

walkers[Syntax.ForStatement] = function forStatement(node, parent, state, cb) {
    if (node.init) {
        cb(node.init, node, state);
    }

    if (node.test) {
        cb(node.test, node, state);
    }

    if (node.update) {
        cb(node.update, node, state);
    }

    cb(node.body, node, state);
};

walkers[Syntax.FunctionDeclaration] = walkers[Syntax.ArrowFunctionExpression];

walkers[Syntax.FunctionExpression] = walkers[Syntax.ArrowFunctionExpression];

walkers[Syntax.Identifier] = leafNode;

walkers[Syntax.IfStatement] = function ifStatement(node, parent, state, cb) {
    cb(node.test, node, state);
    cb(node.consequent, node, state);
    if (node.alternate) {
        cb(node.alternate, node, state);
    }
};

walkers[Syntax.ImportDeclaration] = function importDeclaration(node, parent, state, cb) {
    var i;
    var l;

    if (node.specifiers) {
        for (i = 0, l = node.specifiers.length; i < l; i++) {
            cb(node.specifiers[i], node, state);
        }
    }

    if (node.source) {
        cb(node.source, node, state);
    }
};

walkers[Syntax.ImportSpecifier] = walkers[Syntax.ExportSpecifier];

walkers[Syntax.LabeledStatement] = function labeledStatement(node, parent, state, cb) {
    cb(node.body, node, state);
};

// TODO: add scope info??
walkers[Syntax.LetStatement] = function letStatement(node, parent, state, cb) {
    for (var i = 0, l = node.head.length; i < l; i++) {
        var head = node.head[i];
        cb(head.id, node, state);
        if (head.init) {
            cb(head.init, node, state);
        }
    }

    cb(node.body, node, state);
};

walkers[Syntax.Literal] = leafNode;

walkers[Syntax.LogicalExpression] = walkers[Syntax.BinaryExpression];

walkers[Syntax.MemberExpression] = function memberExpression(node, parent, state, cb) {
    cb(node.object, node, state);
    if (node.property) {
        cb(node.property, node, state);
    }
};

walkers[Syntax.MethodDefinition] = function methodDefinition(node, parent, state, cb) {
    if (node.key) {
        cb(node.key, node, state);
    }

    if (node.value) {
        cb(node.value, node, state);
    }
};

walkers[Syntax.ModuleDeclaration] = function moduleDeclaration(node, parent, state, cb) {
    if (node.id) {
        cb(node.id, node, state);
    }

    if (node.source) {
        cb(node.source, node, state);
    }

    if (node.body) {
        cb(node.body, node, state);
    }
};

walkers[Syntax.NewExpression] = walkers[Syntax.CallExpression];

walkers[Syntax.ObjectExpression] = function objectExpression(node, parent, state, cb) {
    for (var i = 0, l = node.properties.length; i < l; i++) {
        cb(node.properties[i], node, state);
    }
};

walkers[Syntax.ObjectPattern] = walkers[Syntax.ObjectExpression];

walkers[Syntax.Program] = walkers[Syntax.BlockStatement];

walkers[Syntax.Property] = function property(node, parent, state, cb) {
    // move leading comments from key to property node
    moveComments(node.key, node);

    cb(node.value, node, state);
};

walkers[Syntax.ReturnStatement] = function returnStatement(node, parent, state, cb) {
    if (node.argument) {
        cb(node.argument, node, state);
    }
};

walkers[Syntax.SequenceExpression] = function sequenceExpression(node, parent, state, cb) {
    for (var i = 0, l = node.expressions.length; i < l; i++) {
        cb(node.expressions[i], node, state);
    }
};

walkers[Syntax.SpreadElement] = function spreadElement(node, parent, state, cb) {
    if (node.argument) {
        cb(node.argument, node, state);
    }
};

walkers[Syntax.SwitchCase] = function switchCase(node, parent, state, cb) {
    if (node.test) {
        cb(node.test, node, state);
    }

    for (var i = 0, l = node.consequent.length; i < l; i++) {
        cb(node.consequent[i], node, state);
    }
};

walkers[Syntax.SwitchStatement] = function switchStatement(node, parent, state, cb) {
    cb(node.discriminant, node, state);

    for (var i = 0, l = node.cases.length; i < l; i++) {
        cb(node.cases[i], node, state);
    }
};

walkers[Syntax.TaggedTemplateExpression] =
    function taggedTemplateExpression(node, parent, state, cb) {
    if (node.tag) {
        cb(node.tag, node, state);
    }
    if (node.quasi) {
        cb(node.quasi, node, state);
    }
};

walkers[Syntax.TemplateElement] = leafNode;

walkers[Syntax.TemplateLiteral] = function templateLiteral(node, parent, state, cb) {
    var i;
    var l;

    if (node.quasis && node.quasis.length) {
        for (i = 0, l = node.quasis.length; i < l; i++) {
            cb(node.quasis[i], node, state);
        }
    }

    if (node.expressions && node.expressions.length) {
        for (i = 0, l = node.expressions.length; i < l; i++) {
            cb(node.expressions[i], node, state);
        }
    }
};

walkers[Syntax.ThisExpression] = leafNode;

walkers[Syntax.ThrowStatement] = function throwStatement(node, parent, state, cb) {
    cb(node.argument, node, state);
};

walkers[Syntax.TryStatement] = function tryStatement(node, parent, state, cb) {
    var i;
    var l;

    cb(node.block, node, state);

    // handle Esprima ASTs, which deviate from the spec a bit
    if ( node.handlers && Array.isArray(node.handlers) && node.handlers[0] ) {
        cb(node.handlers[0].body, node, state);
    }
    else if (node.handler) {
        cb(node.handler.body, node, state);
    }

    if (node.guardedHandlers) {
        for (i = 0, l = node.guardedHandlers.length; i < l; i++) {
            cb(node.guardedHandlers[i].body, node, state);
        }
    }

    if (node.finalizer) {
        cb(node.finalizer, node, state);
    }
};

walkers[Syntax.UnaryExpression] = function unaryExpression(node, parent, state, cb) {
    cb(node.argument, node, state);
};

walkers[Syntax.UpdateExpression] = walkers[Syntax.UnaryExpression];

walkers[Syntax.VariableDeclaration] = function variableDeclaration(node, parent, state, cb) {
    // move leading comments to first declarator
    moveComments(node, node.declarations[0]);

    for (var i = 0, l = node.declarations.length; i < l; i++) {
        cb(node.declarations[i], node, state);
    }
};

walkers[Syntax.VariableDeclarator] = function variableDeclarator(node, parent, state, cb) {
    cb(node.id, node, state);

    if (node.init) {
        cb(node.init, node, state);
    }
};

walkers[Syntax.WhileStatement] = walkers[Syntax.DoWhileStatement];

walkers[Syntax.WithStatement] = function withStatement(node, parent, state, cb) {
    cb(node.object, node, state);
    cb(node.body, node, state);
};

walkers[Syntax.YieldExpression] = function(node, parent, state, cb) {
    if (node.argument) {
        cb(node.argument, node, state);
    }
};

/**
 * Create a walker that can traverse an AST that is consistent with the Mozilla Parser API.
 *
 * @todo docs
 * @memberof module:jsdoc/src/walker
 */
var Walker = exports.Walker = function(walkerFuncs) {
    this._walkers = walkerFuncs || walkers;
};

// TODO: docs
Walker.prototype._recurse = function(filename, ast) {
    // TODO: track variables/aliases during the walk
    var state = {
        filename: filename,
        nodes: [],
        scopes: []
    };
    var walkers = this._walkers;

    function cb(node, parent, state) {
        var currentScope;

        var isScope = astnode.isScope(node);

        // for efficiency, if the node has a knownVariables property, assume that we've already
        // added the required properties
        if (!node.knownVariables) {
            astnode.addNodeProperties(node);
        }

        node.parent = parent || null;

        currentScope = getCurrentScope(state.scopes);
        if (currentScope) {
            node.enclosingScope = currentScope;
        }

        if (isScope) {
            state.scopes.push(node);
        }
        state.nodes.push(node);

        walkers[node.type](node, parent, state, cb);

        if (isScope) {
            state.scopes.pop();
        }
    }

    cb(ast, null, state);

    return state;
};

// TODO: docs
// TODO: allow visitor.visit to prevent traversal of child nodes
// TODO: skip the AST root node to be consistent with Rhino?
Walker.prototype.recurse = function(filename, ast, visitor) {
    var state = this._recurse(filename, ast);

    if (visitor) {
        for (var i = 0, l = state.nodes.length; i < l; i++) {
            visitor.visit.call(visitor, state.nodes[i], filename);
        }
    }

    return ast;
};
