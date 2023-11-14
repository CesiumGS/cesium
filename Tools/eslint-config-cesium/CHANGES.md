# Change Log

### 8.0.1 - 2019-10-23

- [no-prototype-builtins](https://eslint.org/docs/rules/no-prototype-builtins) should be disabled for both Node and Browser.

### 8.0.0 - 2019-10-23

- Update Browser ecmaVersion to '2015'.
- Update Browser to use ES6 modules by default.
- Disable default rule [no-prototype-builtins](https://eslint.org/docs/rules/no-prototype-builtins) because it's not useful.
- Disable default rule [require-atomic-updates](https://eslint.org/docs/rules/require-atomic-updates) because it generates false positives.

### 7.0.0 - 2019-05-03

- Update Node ecmaVersion to '2019'.
- Enable [no-tabs](https://eslint.org/docs/rules/no-tabs).
- Enabled [no-restricted-globals](https://eslint.org/docs/rules/no-restricted-globals) for jasmine `fit` and `fdescribe`.

### 6.0.1 - 2019-01-23

- Allow ES6 global variables in Node.js code.

### 6.0.0 - 2018-05-01

- Upgrade to eslint 5.x and it's new default rules.
- Set ecmaVersion to 2017 for Node.js code.
- Enable [no-var](https://eslint.org/docs/rules/no-var) in Node.js code.
- Enable [prefer-const](https://eslint.org/docs/rules/prefer-const) in Node.js code.

### 5.0.0 - 2018-05-01

- Enable [eol-last](https://eslint.org/docs/rules/eol-last).

### 4.0.0 - 2018-03-05

- Enable [no-multiple-empty-lines](https://eslint.org/docs/rules/no-multiple-empty-lines).

### 3.0.0 - 2017-11-12

- Set default `ecmaVersion` to 6 for Node.js.
- Enable [comma-dangle](https://eslint.org/docs/rules/comma-dangle).

### 2.0.1 - 2017-06-28

- Remove [eslint-plugin-html](https://www.npmjs.com/package/eslint-plugin-html) peerDependency from `browser` config.

### 2.0.0 - 2017-06-27

- Enable [no-floating-decimal](http://eslint.org/docs/rules/no-floating-decimal).
- Enable [no-use-before-define](http://eslint.org/docs/rules/no-use-before-define).
- Enable [no-else-return](http://eslint.org/docs/rules/no-else-return).
- Enable [no-alert](http://eslint.org/docs/rules/no-alert).
- Enable [no-loop-func](http://eslint.org/docs/rules/no-loop-func).
- Enable [no-undef-init](http://eslint.org/docs/rules/no-undef-init).
- Enable [no-implicit-globals](http://eslint.org/docs/rules/no-implicit-globals).
- Enable [quotes](http://eslint.org/docs/rules/quotes) to enforce use of single quotes.
- Enable [no-trailing-spaces](http://eslint.org/docs/rules/no-trailing-spaces).
- Enable [no-lonely-if](http://eslint.org/docs/rules/no-lonely-if).
- Enable [no-unused-expressions](http://eslint.org/docs/rules/no-unused-expressions).
- Enable [no-sequences](http://eslint.org/docs/rules/no-lonely-if).
- Enable [block-scoped-var](http://eslint.org/docs/rules/block-scoped-var).
- Enable Node-specific rules:
  - [global-require](http://eslint.org/docs/rules/global-require)
  - [no-buffer-constructor](http://eslint.org/docs/rules/no-buffer-constructor)
  - [no-new-require](http://eslint.org/docs/rules/no-new-require)

### 1.0.0 - 2017-06-12

- Initial release.
