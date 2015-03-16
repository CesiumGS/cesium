// TODO: docs
'use strict';

var doop = require('jsdoc/util/doop');
var Syntax = require('jsdoc/src/syntax').Syntax;
var util = require('util');

// Counter for generating unique node IDs.
var uid = 100000000;

// TODO: docs
// TODO: currently unused
var GLOBAL_NODE_ID = exports.GLOBAL_NODE_ID = require('jsdoc/name').GLOBAL_LONGNAME;

/**
 * Check whether an AST node represents a function.
 *
 * @param {Object} node - The AST node to check.
 * @return {boolean} Set to `true` if the node is a function or `false` in all other cases.
 */
var isFunction = exports.isFunction = function(node) {
    return node.type === Syntax.FunctionDeclaration || node.type === Syntax.FunctionExpression;
};

/**
 * Check whether an AST node creates a new scope.
 *
 * @param {Object} node - The AST node to check.
 * @return {Boolean} Set to `true` if the node creates a new scope, or `false` in all other cases.
 */
var isScope = exports.isScope = function(node) {
    // TODO: handle blocks with "let" declarations
    return !!node && typeof node === 'object' && ( node.type === Syntax.CatchClause ||
        isFunction(node) );
};

// TODO: docs
var addNodeProperties = exports.addNodeProperties = function(node) {
    var debugEnabled = !!global.env.opts.debug;
    var newProperties = {};

    if (!node || typeof node !== 'object') {
        return null;
    }

    if (!node.nodeId) {
        newProperties.nodeId = {
            value: 'astnode' + uid++,
            enumerable: debugEnabled
        };
    }

    if (!node.parent && node.parent !== null) {
        newProperties.parent = {
            // `null` means 'no parent', so use `undefined` for now
            value: undefined,
            writable: true
        };
    }

    if (!node.enclosingScope && node.enclosingScope !== null) {
        newProperties.enclosingScope = {
            // `null` means 'no enclosing scope', so use `undefined` for now
            value: undefined,
            writable: true
        };
    }

    if (!node.knownVariables) {
        newProperties.knownVariables = {
            value: node.enclosingScope ? doop(node.enclosingScope.knownVariables) : {}
        };
    }

    if (!node.ownedVariables) {
        newProperties.ownedVariables = {
            value: {}
        };
    }

    if (!node.knownAliases) {
        newProperties.knownAliases = {
            value: node.enclosingScope ? doop(node.enclosingScope.knownAliases) : {}
        };
    }

    if (!node.ownedAliases) {
        newProperties.ownedAliases = {
            value: {}
        };
    }

    if (debugEnabled && !node.parentId) {
        newProperties.parentId = {
            enumerable: true,
            get: function() {
                return this.parent ? this.parent.nodeId : null;
            }
        };
    }

    if (debugEnabled && !node.enclosingScopeId) {
        newProperties.enclosingScopeId = {
            enumerable: true,
            get: function() {
                return this.enclosingScope ? this.enclosingScope.nodeId : null;
            }
        };
    }

    Object.defineProperties(node, newProperties);

    return node;
};

// TODO: docs
// TODO: currently unused
exports.makeGlobalNode = function() {
    var node = {
        name: GLOBAL_NODE_ID,
        type: GLOBAL_NODE_ID
    };

    Object.defineProperty(node, 'nodeId', {
        value: GLOBAL_NODE_ID
    });

    return addNodeProperties(node);
};

// TODO: docs
var nodeToString = exports.nodeToString = function(node) {
    var tempObject;

    var str = '';

    switch (node.type) {
        case Syntax.ArrayExpression:
            tempObject = [];
            node.elements.forEach(function(el, i) {
                // preserve literal values so that the JSON form shows the correct type
                if (el.type === Syntax.Literal) {
                    tempObject[i] = el.value;
                }
                else {
                    tempObject[i] = nodeToString(el);
                }
            });

            str = JSON.stringify(tempObject);
            break;

        case Syntax.AssignmentExpression:
            str = nodeToString(node.left);
            break;

        case Syntax.FunctionDeclaration:
            // falls through

        case Syntax.FunctionExpression:
            str = 'function';
            break;

        case Syntax.Identifier:
            str = node.name;
            break;

        case Syntax.Literal:
            str = String(node.value);
            break;

        case Syntax.MemberExpression:
            // could be computed (like foo['bar']) or not (like foo.bar)
            str = nodeToString(node.object);
            if (node.computed) {
                str += util.format('[%s]', node.property.raw);
            }
            else {
                str += '.' + nodeToString(node.property);
            }
            break;

        case Syntax.ObjectExpression:
            tempObject = {};
            node.properties.forEach(function(prop) {
                var key = prop.key.name;
                // preserve literal values so that the JSON form shows the correct type
                if (prop.value.type === Syntax.Literal) {
                    tempObject[key] = prop.value.value;
                }
                else {
                    tempObject[key] = nodeToString(prop);
                }
            });

            str = JSON.stringify(tempObject);
            break;

        case Syntax.ThisExpression:
            str = 'this';
            break;

        case Syntax.UnaryExpression:
            // like -1. in theory, operator can be prefix or postfix. in practice, any value with a
            // valid postfix operator (such as -- or ++) is not a UnaryExpression.
            str = nodeToString(node.argument);

            // workaround for https://code.google.com/p/esprima/issues/detail?id=526
            if (node.prefix === true || node.prefix === undefined) {
                str = node.operator + str;
            }
            else {
                // this shouldn't happen
                throw new Error( util.format('Found a UnaryExpression with a postfix operator: %j',
                    node) );
            }
            break;

        case Syntax.VariableDeclarator:
            str = nodeToString(node.id);
            break;

        default:
            str = '';
    }

    return str;
};

// TODO: docs
var getParamNames = exports.getParamNames = function(node) {
    if (!node || !node.params) {
        return [];
    }

    return node.params.map(function(param) {
        return nodeToString(param);
    });
};

// TODO: docs
var isAccessor = exports.isAccessor = function(node) {
    return !!node && typeof node === 'object' && node.type === Syntax.Property &&
        (node.kind === 'get' || node.kind === 'set');
};

// TODO: docs
var isAssignment = exports.isAssignment = function(node) {
    return !!node && typeof node === 'object' && (node.type === Syntax.AssignmentExpression ||
        node.type === Syntax.VariableDeclarator);
};

// TODO: docs
/**
 * Retrieve information about the node, including its name and type.
 */
var getInfo = exports.getInfo = function(node) {
    var info = {};

    switch (node.type) {
        // like: "foo = 'bar'" (after declaring foo)
        // like: "MyClass.prototype.myMethod = function() {}" (after declaring MyClass)
        case Syntax.AssignmentExpression:
            info.node = node.right;
            info.name = nodeToString(node.left);
            info.type = info.node.type;
            info.value = nodeToString(info.node);
            // if the assigned value is a function, we need to capture the parameter names here
            info.paramnames = getParamNames(node.right);
            break;

        // like: "function foo() {}"
        case Syntax.FunctionDeclaration:
            info.node = node;
            info.name = nodeToString(node.id);
            info.type = info.node.type;
            info.paramnames = getParamNames(node);
            break;

        // like the function in: "var foo = function() {}"
        case Syntax.FunctionExpression:
            info.node = node;
            // TODO: should we add a name for, e.g., "var foo = function bar() {}"?
            info.name = '';
            info.type = info.node.type;
            info.paramnames = getParamNames(node);
            break;

        // like the param "bar" in: "function foo(bar) {}"
        case Syntax.Identifier:
            info.node = node;
            info.name = nodeToString(info.node);
            info.type = info.node.type;
            break;

        // like "a.b.c"
        case Syntax.MemberExpression:
            info.node = node;
            info.name = nodeToString(info.node);
            info.type = info.node.type;
            break;

        // like "a: 0" in "var foo = {a: 0}"
        case Syntax.Property:
            info.node = node.value;
            info.name = nodeToString(node.key);
            info.value = nodeToString(info.node);

            if ( isAccessor(node) ) {
                info.type = nodeToString(info.node);
                info.paramnames = getParamNames(info.node);
            }
            else {
                info.type = info.node.type;
            }

            break;

        // like: "var i = 0" (has init property)
        // like: "var i" (no init property)
        case Syntax.VariableDeclarator:
            info.node = node.init || node.id;
            info.name = node.id.name;

            if (node.init) {
                info.type = info.node.type;
                info.value = nodeToString(info.node);
            }

            break;

        default:
            info.node = node;
            info.type = info.node.type;
    }

    return info;
};

// TODO: may want to use separate methods for known and owned variables/functions/aliases

// TODO: docs
function _addVariable(node, name, value) {
    node.knownVariables[name] = node.ownedVariables[name] = value;
}

// TODO: docs
var addVariable = exports.addVariable = function(node, declarator) {
    var name = declarator.id.name;
    var value = (declarator.init || null);
    _addVariable(node, name, value);

    return node;
};

// TODO: docs
var addAllVariables = exports.addAllVariables = function(node, declaration) {
    for (var i = 0, l = declaration.declarations.length; i < l; i++) {
        addVariable(node, declaration.declarations[i]);
    }

    return node;
};

// TODO: docs
var addFunction = exports.addFunction = function(node, declaration) {
    // TODO: should we store these separately, since they're hoisted above variable declarations?
    // right now we appear to give functions and variables equal precedence, which is wrong

    // don't add anonymous functions
    if (declaration.id) {
        _addVariable(node, declaration.id.name, null);
    }

    return node;
};

// TODO: docs
var addAlias = exports.addAlias = function(node, variableName, aliasName) {
    [node.knownAliases, node.ownedAliases].forEach(function(target) {
        if ( !Array.isArray(target[aliasName]) ) {
            target[aliasName] = [];
        }

        if (target[aliasName].indexOf(variableName) === -1) {
            target[aliasName].push(variableName);
        }
    });

    return node;
};
