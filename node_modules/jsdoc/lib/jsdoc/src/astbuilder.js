'use strict';

var Syntax = require('jsdoc/src/syntax').Syntax;

// TODO: should set e.stopPropagation == true for consistency with Rhino, right?
var VISITOR_CONTINUE = true;
var VISITOR_STOP = false;

// TODO: docs; empty array means any node type, otherwise only the node types in the array
var acceptsLeadingComments = (function() {
    var accepts = {};

    // these nodes always accept leading comments
    var commentable = [
        Syntax.AssignmentExpression,
        Syntax.CallExpression,
        Syntax.FunctionDeclaration,
        Syntax.FunctionExpression,
        Syntax.MemberExpression,
        Syntax.Property,
        Syntax.TryStatement,
        Syntax.VariableDeclaration,
        Syntax.VariableDeclarator,
        Syntax.WithStatement
    ];
    for (var i = 0, l = commentable.length; i < l; i++) {
        accepts[commentable[i]] = [];
    }

    // these nodes accept leading comments if they have specific types of parent nodes
    // like: function foo(/** @type {string} */ bar) {}
    accepts[Syntax.Identifier] = [
        Syntax.CatchClause,
        Syntax.FunctionDeclaration,
        Syntax.FunctionExpression
    ];
    // like: var Foo = Class.create(/** @lends Foo */{ // ... })
    accepts[Syntax.ObjectExpression] = [
        Syntax.CallExpression,
        Syntax.Property,
        Syntax.ReturnStatement
    ];

    return accepts;
})();

// TODO: docs
function canAcceptComment(node) {
    var canAccept = false;
    var spec = acceptsLeadingComments[node.type];

    if (spec) {
        // empty array means we don't care about the parent type
        if (spec.length === 0) {
            canAccept = true;
        }
        // we can accept the comment if the spec contains the type of the node's parent
        else if (node.parent) {
            canAccept = spec.indexOf(node.parent.type) !== -1;
        }
    }

    return canAccept;
}

// TODO: docs
// check whether node1 is before node2
function isBefore(beforeRange, afterRange) {
    return beforeRange[1] <= afterRange[0];
}

// TODO: docs
function isWithin(innerRange, outerRange) {
    return innerRange[0] >= outerRange[0] && innerRange[1] <= outerRange[1];
}

// TODO: docs
function isJsdocComment(comment) {
    return comment && (comment.type === 'Block') && (comment.value[0] === '*');
}

/**
 * Add the raw comment string to a block comment node.
 *
 * @private
 * @param {!Object} comment - A comment node with `type` and `value` properties.
 */
function addRawComment(comment) {
    comment.raw = comment.raw || ('/*' + comment.value + '*/');
    return comment;
}

// TODO: docs
function scrubComments(comments) {
    var comment;

    var scrubbed = [];

    for (var i = 0, l = comments.length; i < l; i++) {
        comment = comments[i];
        if ( isJsdocComment(comment) ) {
            scrubbed.push( addRawComment(comment) );
        }
    }

    return scrubbed;
}

// TODO: docs
var AstBuilder = exports.AstBuilder = function() {};

function parse(source, filename, esprimaOpts) {
    var esprima = require('esprima');
    var logger = require('jsdoc/util/logger');

    var ast;

    try {
        ast = esprima.parse(source, esprimaOpts);
    }
    catch (e) {
        logger.error('Unable to parse %s: %s', filename, e.message);
    }

    return ast;
}

// TODO: docs
AstBuilder.prototype.build = function(source, filename) {
    var ast;

    var esprimaOpts = {
        comment: true,
        loc: true,
        range: true,
        tokens: true
    };

    ast = parse(source, filename, esprimaOpts);

    if (ast) {
        this._postProcess(filename, ast);
    }

    return ast;
};

// TODO: docs
function atomSorter(a, b) {
    var aRange = a.range;
    var bRange = b.range;
    var result = 0;

    // does a end before b starts?
    if ( isBefore(aRange, bRange) ) {
        result = -1;
    }
    // does a enclose b?
    else if ( isWithin(bRange, aRange) ) {
        result = -1;
    }
    // does a start before b?
    else if (aRange[0] < bRange[0]) {
        result = -1;
    }
    // are the ranges non-identical? if so, b must be first
    else if ( aRange[0] !== bRange[0] || aRange[1] !== bRange[1] ) {
        result = 1;
    }

    return result;
}

// TODO: docs
// TODO: export?
function CommentAttacher(comments, tokens) {
    this._comments = comments || [];
    this._tokens = tokens || [];

    this._tokenIndex = 0;
    this._previousNodeEnd = 0;
    this._astRoot = null;
    this._strayComments = [];

    this._resetPendingComment()
        ._resetCandidates();
}

// TODO: docs
CommentAttacher.prototype._resetPendingComment = function() {
    this._pendingComment = null;
    this._pendingCommentRange = null;

    return this;
};

// TODO: docs
CommentAttacher.prototype._resetCandidates = function() {
    this._candidates = [];

    return this;
};

// TODO: docs
CommentAttacher.prototype._nextComment = function() {
    return this._comments[0] || null;
};

// TODO: docs
CommentAttacher.prototype._nextToken = function() {
    return this._tokens[this._tokenIndex] || null;
};

// TODO: docs
// find the index of the atom whose end position is closest to (but not after) the specified
// position
CommentAttacher.prototype._nextIndexBefore = function(startIndex, atoms, position) {
    var atom;

    var newIndex = startIndex;

    for (var i = newIndex, l = atoms.length; i < l; i++) {
        atom = atoms[i];

        if (atom.range[1] > position) {
            break;
        }
        else {
            newIndex = i;
        }
    }

    return newIndex;
};

// TODO: docs
CommentAttacher.prototype._advanceTokenIndex = function(node) {
    var position = node.range[0];

    this._tokenIndex = this._nextIndexBefore(this._tokenIndex, this._tokens, position);

    return this;
};

// TODO: docs
CommentAttacher.prototype._fastForwardComments = function(node) {
    var position = node.range[0];
    var commentIndex = this._nextIndexBefore(0, this._comments, position);

    // all comments before the node (except the last one) are considered stray comments
    if (commentIndex > 0) {
        this._strayComments = this._strayComments.concat( this._comments.splice(0,
            commentIndex) );
    }
};

// TODO: docs
CommentAttacher.prototype._attachPendingComment = function() {
    var target;

    if (!this._pendingComment) {
        return this;
    }

    if (this._candidates.length > 0) {
        target = this._candidates[this._candidates.length - 1];
        target.leadingComments = target.leadingComments || [];
        target.leadingComments.push(this._pendingComment);
    }
    else {
        this._strayComments.push(this._pendingComment);
    }

    this._resetPendingComment()
        ._resetCandidates();

    return this;
};

// TODO: docs
CommentAttacher.prototype._isEligible = function(node) {
    var atoms;
    var token;

    var isEligible = false;

    var comment = this._nextComment();
    if (comment) {
        atoms = [node, comment];
        token = this._nextToken();
        if (token) {
            atoms.push(token);
        }

        atoms.sort(atomSorter);

        // a candidate node must immediately follow the comment
        if (atoms.indexOf(node) === atoms.indexOf(comment) + 1) {
            isEligible = true;
        }
    }

    return isEligible;
};

// TODO: docs
// TODO: do we ever get multiple candidate nodes?
CommentAttacher.prototype.visit = function(node) {
    var isEligible;

    // bail if we're out of comments
    if ( !this._nextComment() ) {
        return VISITOR_STOP;
    }

    // set the AST root if necessary
    this._astRoot = this._astRoot || node;

    // move to the next token, and fast-forward past comments that can no longer be attached
    this._advanceTokenIndex(node);
    this._fastForwardComments(node);
    // now we can check whether the current node is in the right position to accept the next comment
    isEligible = this._isEligible(node);

    // attach the pending comment, if there is one
    this._attachPendingComment();

    // okay, now that we've done all that bookkeeping, we can check whether the current node accepts
    // leading comments and add it to the candidate list if needed
    if ( isEligible && canAcceptComment(node) ) {
        // make sure we don't go past the end of the outermost target node
        if (!this._pendingCommentRange) {
            this._pendingCommentRange = node.range.slice(0);
        }
        this._candidates.push(node);

        // we have a candidate node, so pend the current comment if necessary
        this._pendingComment = this._pendingComment || this._comments.splice(0, 1)[0];
    }

    return VISITOR_CONTINUE;
};

// TODO: docs
CommentAttacher.prototype.finish = function() {
    // any remaining comments are stray comments
    this._strayComments = this._strayComments.concat(this._comments);

    // deal with the pending comment, if there is one
    this._attachPendingComment();

    // attach stray comments to the AST root
    if (this._strayComments.length) {
        this._astRoot.trailingComments = this._strayComments.slice(0);
    }
};

// TODO: docs
// TODO: refactor to make this extensible
/**
 * @param {string} filename - The full path to the source file.
 * @param {Object} ast - An abstract syntax tree that conforms to the Mozilla Parser API.
 */
AstBuilder.prototype._postProcess = function(filename, ast) {
    var astnode = require('jsdoc/src/astnode');
    var Walker = require('jsdoc/src/walker').Walker;

    var attachComments = !!ast.comments && !!ast.comments.length;
    var commentAttacher = new CommentAttacher( scrubComments(ast.comments.slice(0)), ast.tokens );
    var visitor = {
        visit: function(node) {
            if (attachComments) {
                attachComments = commentAttacher.visit(node);
            }
        }
    };

    var walker = new Walker();
    walker.recurse(filename, ast, visitor);

    commentAttacher.finish();

    // remove the comment/token arrays; we no longer need then
    ast.comments = [];
    ast.tokens = [];
};
