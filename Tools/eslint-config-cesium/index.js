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
        curly: ['error'],
        eqeqeq: ['error'],
        'guard-for-in': ['error'],
        'new-cap': ['error', {properties: false}],
        'no-caller': ['error'],
        'no-console': 'off',
        'no-empty': ['error'],
        'no-extend-native': ['error'],
        'no-extra-boolean-cast': 'off',
        'no-irregular-whitespace': ['error'],
        'no-new': ['error'],
        'no-undef': ['error'],
        'no-unused-vars': ['error', {vars: 'all', args: 'all'}],
        'no-useless-escape': 'off',
        semi: ['error'],
        strict: ['error'],
        'wrap-iife': ['error', 'any']
    }
};
