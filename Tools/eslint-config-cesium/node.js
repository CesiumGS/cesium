'use strict';

module.exports = {
    extends: './index.js',
    env: {
        node: true
    },
    rules: {
        'global-require' : 'error',
        'no-buffer-constructor' : 'error',
        'no-new-require' : 'error'
    }
};
