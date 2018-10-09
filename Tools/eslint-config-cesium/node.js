'use strict';

module.exports = {
    extends: './index.js',
    env: {
        node: true
    },
    parserOptions: {
        ecmaVersion: 2017
    },
    rules: {
        'global-require': 'error',
        'no-buffer-constructor': 'error',
        'no-new-require': 'error',
        'no-var': 'error',
        'prefer-const': 'error'
    }
};
