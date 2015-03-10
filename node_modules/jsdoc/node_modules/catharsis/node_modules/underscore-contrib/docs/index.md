# Underscore-contrib (0.3.0)

> The brass buckles on Underscore's utility belt - a contributors' library for [Underscore](http://underscorejs.org/).

## Introduction

### Places

  * [Documentation](http://documentcloud.github.io/underscore-contrib/)
  * [Source repository](https://github.com/documentcloud/underscore-contrib)
  * [Tickets and bug reports](https://github.com/documentcloud/underscore-contrib/issues?state=open)
  * [Maintainer's website](http://www.fogus.me)

### Why underscore-contrib?

While Underscore provides a bevy of useful tools to support functional programming in JavaScript, it can't
(and shouldn't) be everything to everyone. Underscore-contrib is intended as a home for functions that, for
various reasons, don't belong in Underscore proper. In particular, it aims to be:

  * a home for functions that are limited in scope, but solve certain point problems, and
  * a proving ground for features that belong in Underscore proper, but need some advocacy and/or evolution
(or devolution) to get them there.

### Use

#### In the Browser

First, you'll need Underscore **version 1.6.0 or higher**. Then you can grab the relevant underscore-contrib sub-libraries and simply add something like
the following to your pages:

```html
<script type="text/javascript" src="underscore.js"></script>
<script type="text/javascript" src="underscore.object.builders.js"></script>
```

At the moment there are no cross-contrib dependencies (i.e. each sub-library
can stand by itself), but that may change in the future.

#### In Node.js

Using contrib in Node is very simple. Just install it with npm:

```
npm install underscore-contrib --save
```

Then require it within your project like so:

```javascript
var _ = require('underscore-contrib');
```

The `_` variable will be a copy of Underscore with contrib's methods already
mixed in.

### License

_.contrib is open sourced under the [MIT license](https://github.com/documentcloud/underscore-contrib/blob/master/LICENSE).

## Sub-libraries

The _.contrib library currently contains a number of related capabilities, aggregated into the following files.

  - [underscore.array.builders](#array.builders) - functions to build arrays
  - [underscore.array.selectors](#array.selectors) - functions to take things from arrays
  - [underscore.collections.walk](#collections.walk) - functions to walk and transform nested JavaScript objects
  - [underscore.function.arity](#function.arity) - functions to manipulate and fix function argument arity
  - [underscore.function.combinators](#function.combinators) - functions to combine functions to make new functions
  - [underscore.function.iterators](#function.iterators) - functions to lazily produce, manipulate and consume sequence iterators
  - [underscore.function.predicates](#function.predicates) - functions that return `true` or `false` based on some criteria
  - [underscore.object.builders](#object.builders) - functions to build JavaScript objects
  - [underscore.object.selectors](#object.selectors) - functions to pick things from JavaScript objects
  - [underscore.util.existential](#util.existential) - functions that check for the existence or truthiness of JavaScript data types
  - [underscore.util.operators](#util.operators) - functions that wrap common (or missing) JavaScript operators
  - [underscore.util.strings](#util.strings) - functions to work with strings
  - [underscore.util.trampolines](#util.trampolines) - functions to facilitate calling functions recursively without blowing the stack

The links above are to the annotated source code.  Full-blown _.contrib documentation is in the works.  Contributors welcomed.

