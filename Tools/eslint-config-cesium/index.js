'use strict';

module.exports = {
    extends: 'eslint:recommended',
    globals: {
        DataView: false,
        ArrayBuffer: false,
        Float32Array: false,
        Float64Array: false,
        Int16Array: false,
        Int32Array: false,
        Int8Array: false,
        Uint16Array: false,
        Uint32Array: false,
        Uint8Array: false,
        Uint8ClampedArray: false
    },
    rules: {
        curly: 'error',
        eqeqeq: 'error',
        'guard-for-in': 'error',
        'new-cap': ['error', {properties: false}],
        'no-alert': 'error',
        'no-caller': 'error',
        'no-console': 'off',
        'no-else-return': 'error',
        'no-empty': 'error',
        'no-extend-native': 'error',
        'no-extra-boolean-cast': 'off',
        'no-floating-decimal': 'error',
        'no-irregular-whitespace': 'error',
        'no-loop-func': 'error',
        'no-new': 'error',
        'no-undef': 'error',
        'no-undef-init': 'error',
        'no-unused-vars': ['error', {vars: 'all', args: 'all'}],
        'no-useless-escape': 'off',
        'no-use-before-define': ['error', 'nofunc'],
        semi: 'error',
        strict: 'error',
        'wrap-iife': ['error', 'any']
    }
};
