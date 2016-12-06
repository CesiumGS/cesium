/*global define*/
define([
    './defined',
    './DeveloperError',
    './isArray'
], function(defined,
            DeveloperError,
            isArray) {
    'use strict';

    var Where = function(condition) {
        this.condition = condition;
    };

    var Match = {
        Where: function(condition) {
            return new Where(condition);
        }
    };

    function throwUnless(passed, message) {
        if (!passed) {
            throw new DeveloperError(message);
        }
    }

    function makeErrorMessage(expectedType, seenType, optionalMessage) {
        if (defined(optionalMessage)) {
            return optionalMessage;
        }
        return 'Expected ' + expectedType + ', got ' + seenType;
    }

    var typeChecks = [
        [String, 'string'],
        [Number, 'number'],
        [Boolean, 'boolean'],
        [Function, 'function'],
    ];

    function check(arg, pattern, optionalMessage) {
        var typeCheck;
        var patternValid = false;
        for (var i = 0; i < typeChecks.length; i++) {
            typeCheck = typeChecks[i];
            if (typeCheck[0] === pattern) {
                patternValid = true;
                throwUnless(typeof arg === typeCheck[1], makeErrorMessage(typeCheck[1], typeof arg, optionalMessage));
            }
        }

        if (pattern === null) {
            throwUnless(arg === null, makeErrorMessage('null', arg, optionalMessage));
            return true;
        }
        if (pattern instanceof Where) {
            throwUnless(pattern.condition(arg), 'Failed Match.Where condition for arg: ' + JSON.stringify(arg));
            return true;
        }
        if (pattern === Object) {
            throwUnless(typeof arg === 'object' && !isArray(arg), makeErrorMessage('object', JSON.stringify(arg), optionalMessage));
            return true;
        }
        if (isArray(pattern)) {
            if (pattern.length !== 1 && pattern.length !== 0) {
                throw new DeveloperError('invalid pattern: array pattern must contain 0 or 1 element');
            }
            if (pattern.length === 1) {
                for (var j = 0; j < arg.length; j++) {
                    check(arg[j], pattern[1], optionalMessage ? '(checking array elements) ' + optionalMessage : undefined);
                }
            }
            throwUnless(isArray(arg), makeErrorMessage('array', JSON.stringify(arg)), optionalMessage);
            return true;
        }
        if (!patternValid) {
            throw new DeveloperError('unsupported pattern');
        }
    }

    return {
        Match: Match,
        check: check
    };
});
