'use strict';

module.exports = {
    extends: './index.js',
    env: {
        amd: true,
        browser: true
    },
    plugins: [
        'html'
    ],
    rules: {
        'no-implicit-globals': 'error'
    }
};
