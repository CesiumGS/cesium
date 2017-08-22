'use strict';

module.exports = {
    extends: './index.js',
    env: {
        amd: true,
        browser: true
    },
    rules: {
        'no-implicit-globals': 'error'
    }
};
