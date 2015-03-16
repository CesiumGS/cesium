# Catharsis #

A JavaScript parser for
[Google Closure Compiler](https://developers.google.com/closure/compiler/docs/js-for-compiler#types)
and [JSDoc](https://github.com/jsdoc3/jsdoc) type expressions.

Catharsis is designed to be:

+ **Accurate**. Catharsis is based on a [PEG.js](http://pegjs.majda.cz/) grammar that's designed to
handle any valid type expression. It uses a [Mocha](http://visionmedia.github.com/mocha/) test suite
to verify the parser's accuracy.
+ **Fast**. Parse results are cached, so the parser is invoked only when necessary.
+ **Flexible**. Catharsis can convert a parse result back into a type expression, or into a
description of the type expression. In addition, Catharsis can parse
[JSDoc](https://github.com/jsdoc3/jsdoc)-style type expressions.


## Example ##

```js
var catharsis = require('catharsis');

// Google Closure Compiler parsing
var type = '!Object';
var parsedType;
try {
    parsedType = catharsis.parse(type); // {"type":"NameExpression,"name":"Object","nullable":false}
} catch(e) {
    console.error('unable to parse %s: %s', type, e);
}

// JSDoc-style type expressions enabled
var jsdocType = 'string[]';  // Closure Compiler expects Array.<string>
var parsedJsdocType;
try {
    parsedJsdocType = catharsis.parse(jsdocType, {jsdoc: true});
} catch (e) {
    console.error('unable to parse %s: %s', jsdocType, e);
}

// Converting parse results back to type expressions
catharsis.stringify(parsedType);                              // !Object
catharsis.stringify(parsedJsdocType);                         // string[]
catharsis.stringify(parsedJsdocType, {restringify: true});    // Array.<string>

// Converting parse results to descriptions of the type expression
catharsis.describe(parsedType).simple;                        // non-null Object
catharsis.describe(parsedJsdocType).simple;                   // Array of string
```

See the [test/specs directory](test/specs) for more examples of Catharsis' parse results.


## Methods ##

### parse(typeExpression, options) ###
Parse a type expression, and return the parse results. Throws an error if the type expression cannot
be parsed.

When called without options, Catharsis attempts to parse type expressions in the same way as
Closure Compiler. When the `jsdoc` option is enabled, Catharsis can also parse several kinds of
type expressions that are permitted in [JSDoc](https://github.com/jsdoc3/jsdoc):

+ The string `function` is treated as a function type with no parameters.
+ In a function type with repeatable parameters, the names of repeatable parameters are not required
to be enclosed in square brackets (for example, `function(...foo)` is allowed).
+ The period may be omitted from type applications. For example, `Array.<string>` and
`Array<string>` will be parsed in the same way.
+ You may append `[]` to a name expression (for example, `string[]`) to interpret it as a type
application with the expression `Array` (for example, `Array.<string>`).
+ Name expressions may contain the characters `#`, `~`, `:`, and `/`.
+ Name expressions may contain a suffix that is similar to a function signature (for example,
`MyClass(foo, bar)`).
+ Name expressions may contain a reserved word.
+ Record types may use types other than name expressions for keys.

#### Parameters ####
+ `type`: A string containing a Closure Compiler type expression.
+ `options`: Options for parsing the type expression.
    + `options.jsdoc`: Specifies whether to enable parsing of JSDoc-style type expressions. Defaults
    to `false`.
    + `options.useCache`: Specifies whether to use the cache of parsed types. Defaults to `true`.

#### Returns ####
An object containing the parse results. See the [test/specs directory](test/specs) for examples of
the parse results for different type expressions.

The object also includes two non-enumerable properties:

+ `jsdoc`: A boolean indicating whether the type expression was parsed with JSDoc support enabled.
+ `typeExpression`: A string containing the type expression that was parsed.

### stringify(parsedType, options) ###
Stringify `parsedType`, and return the type expression. If validation is enabled, throws an error if
the stringified type expression cannot be parsed.

#### Parameters ####
+ `parsedType`: An object containing a parsed Closure Compiler type expression.
+ `options`: Options for stringifying the parse results.
    + `options.cssClass`: Synonym for `options.linkClass`. Deprecated in version 0.8.0; will be
    removed in a future version.
    + `options.htmlSafe`: Specifies whether to return an HTML-safe string that replaces left angle
    brackets (`<`) with the corresponding entity (`&lt;`). **Note**: Characters in name expressions
    are not escaped.
    + `options.linkClass`: A CSS class to add to HTML links. Used only if `options.links` is
    provided. By default, no CSS class is added.
    + `options.links`: An object whose keys are name expressions and whose values are URIs. If a
    name expression matches a key in `options.links`, the name expression will be wrapped in an
    HTML `<a>` tag that links to the URI. If `options.linkClass` is specified, the `<a>` tag will
    include a `class` attribute. **Note**: When using this option, parsed types are always
    restringified, and the resulting string is not cached.
    + `options.restringify`: Forces Catharsis to restringify the parsed type. If this option is not
    specified, and the parsed type object includes a `typeExpression` property, Catharsis will
    return the `typeExpression` property without modification when possible. Defaults to `false`.
    + `options.useCache`: Specifies whether to use the cache of stringified type expressions.
    Defaults to `true`.
    + `options.validate`: Specifies whether to validate the stringified parse results by attempting
    to parse them as a type expression. If the stringified results are not parsable by default, you
    must also provide the appropriate options to pass to the `parse()` method. Defaults to `false`.

#### Returns ####
A string containing the type expression.

### describe(parsedType, options) ###
Convert a parsed type to a description of the type expression. This method is especially useful if
your users are not familiar with the syntax for type expressions.

The `describe()` method returns the description in two formats:

+ **Simple format**. A string that provides a complete description of the type expression.
+ **Extended format**. An object that separates out some of the details about the outermost type
expression, such as whether the type is optional, nullable, or repeatable.

For example, if you call `describe('?function(new:MyObject, string)=')`, it returns the following
object:

```js
{
  simple: 'optional nullable function(constructs MyObject, string)',
  extended: {
    description: 'function(string)',
    modifiers: {
      functionNew: 'Returns MyObject when called with new.',
      functionThis: '',
      optional: 'Optional.',
      nullable: 'May be null.',
      repeatable: ''
    },
    returns: ''
  }
}
```

#### Parameters ####
+ `parsedType`: An object containing a parsed Closure Compiler type expression.
+ `options`: Options for creating the description.
    + `options.codeClass`: A CSS class to add to the tag that is wrapped around type names. Used
    only if `options.codeTag` is provided. By default, no CSS class is added.
    + `options.codeTag`: The name of an HTML tag (for example, `code`) to wrap around type names.
    For example, if this option is set to `code`, the type expression `Array.<string>` would have
    the simple description `<code>Array</code> of <code>string</code>`.
    + `options.language`: A string identifying the language in which to generate the description.
    The identifier should be an
    [ISO 639-1 language code](http://en.wikipedia.org/wiki/List_of_ISO_639-1_codes) (for example,
    `en`). It can optionally be followed by a hyphen and an
    [ISO 3166-1 alpha-2 country code](http://en.wikipedia.org/wiki/ISO_3166-1_alpha-2) (for example,
    `en-US`). If you use values other than `en`, you must provide translation resources in
    `options.resources`. Defaults to `en`.
    + `options.linkClass`: A CSS class to add to HTML links. Used only if `options.links` is
    provided. By default, no CSS class is added.
    + `options.links`: An object whose keys are name expressions and whose values are URIs. If a
    name expression matches a key in `options.links`, the name expression will be wrapped in an
    HTML `<a>` tag that links to the URI. If `options.linkClass` is specified, the `<a>` tag will
    include a `class` attribute. **Note**: When using this option, the description is not cached.
    + `options.resources`: An object that specifies how to describe type expressions for a given
    language. The object's property names should use the same format as `options.language`. Each
    property should contain an object in the same format as the translation resources in
    [res/en.json](res/en.json). If you specify a value for `options.resources.en`, it will override
    the defaults in [res/en.json](res/en.json).
    + `options.useCache`: Specifies whether to use the cache of descriptions. Defaults to `true`.

### Returns ###
An object with the following properties:

+ `simple`: A string that provides a complete description of the type expression.
+ `extended`: An object containing details about the outermost type expression.
    + `extended.description`: A string that provides a basic description of the type expression,
    excluding the information contained in other properties.
    + `extended.modifiers`: Information about modifiers that apply to the type expression.
        + `extended.modifiers.functionNew`: A string describing what a function returns when called
        with `new`. Used only for function types.
        + `extended.modifiers.functionThis`: A string describing what the keyword `this` refers to
        within a function. Used only for function types.
        + `extended.modifiers.nullable`: A string indicating whether the type is nullable or
        non-nullable.
        + `extended.modifiers.optional`: A string indicating whether the type is optional.
        + `extended.modifiers.repeatable`: A string indicating whether the type can be provided
    + `extended.returns`: A string describing the function's return value. Used only for function
    types.


## Installation ##

With [npm](http://npmjs.org):

    npm install catharsis

Or without:

    git clone git://github.com/hegemonic/catharsis.git
    cd catharsis
    npm install


## Roadmap and known issues ##

Take a look at the [issue tracker](https://github.com/hegemonic/catharsis/issues) to see what's in
store for Catharsis.

Bug reports, feature requests, and pull requests are always welcome! If you're working on a large
pull request, please contact me in advance so I can help things go smoothly.

**Note**: The parse tree's format should not be considered final until Catharsis reaches version
1.0. I'll do my best to provide release notes for any changes.


## Changelog ##

+ 0.8.6 (December 2014): Improved the description of the unknown type.
+ 0.8.5 (December 2014): Added support for postfix nullable/non-nullable operators combined with the
optional operator (for example, `foo?=`).
+ 0.8.4 (December 2014): JSDoc-style nested arrays (for example, `number[][]`) are now parsed
correctly when JSDoc-style type expressions are enabled.
+ 0.8.3 (October 2014):
    + Type applications are no longer required to include a period (`.`) as a separator, regardless
    of whether JSDoc-style type expressions are enabled.
    + Type unions that are not enclosed in parentheses can now include the repeatable (`...`)
    modifier when JSDoc-style type expressions are enabled.
    + Name expressions may now be enclosed in single or double quotation marks when JSDoc-style
    type expressions are enabled.
+ 0.8.2 (June 2014): Fixed a compatibility issue with the JSDoc fork of Mozilla Rhino.
+ 0.8.1 (June 2014): Added support for type unions that are not enclosed in parentheses, and that
contain nullable or non-nullable modifiers (for example, `!string|!number`).
+ 0.8.0 (May 2014):
    + Added a `describe()` method, which converts a parsed type to a description of the type.
    + Added a `linkClass` option to the `stringify()` method, and deprecated the existing `cssClass`
    option. The `cssClass` option will be removed in a future release.
    + Clarified and corrected several sections in the `README`.
+ 0.7.1 (April 2014): In record types, property names that begin with a keyword (for example,
`undefinedHTML`) are now parsed correctly when JSDoc-style type expressions are enabled.
+ 0.7.0 (October 2013):
    + Repeatable type expressions other than name expressions (for example, `...function()`) are now
    parsed and stringified correctly.
    + Type expressions that are both repeatable and either nullable or non-nullable (for example,
    `...!number`) are now parsed and stringified correctly.
    + Name expressions are now parsed correctly when they match a property name in an object
    instance (for example, `constructor`).
+ 0.6.0 (September 2013): Added support for the type expression `function[]` when JSDoc-style type
expressions are enabled.
+ 0.5.6 (April 2013):
    + For consistency with Google Closure Library, parentheses are no longer required around type
    unions. (In previous versions, the parentheses could be omitted when JSDoc support was enabled.)
    + For consistency with Google Closure Library, you can now use postfix notation for the `?`
    (nullable) and `!` (non-nullable) modifiers. For example, `?string` and `string?` are now
    treated as equivalent.
    + String literals and numeric literals are now allowed as property names within name
    expressions. For example, the name expression `Foo."bar"` is now parsed correctly.
+ 0.5.5 (April 2013): Corrected a parsing issue with name expressions that end with a value enclosed
in parentheses.
+ 0.5.4 (April 2013):
    + Repeatable literals (for example, `...*`) are now parsed correctly.
    + When JSDoc-style type expressions are enabled, a name expression can now contain a value
    enclosed in parentheses at the end of the name expression (for example, `MyClass(2)`).
+ 0.5.3 (March 2013): The `parse()` method now correctly parses name expressions that contain
hyphens.
+ 0.5.2 (March 2013): The `parse()` method now correctly parses function types when JSDoc-style type
expressions are enabled.
+ 0.5.1 (March 2013): Newlines and extra spaces are now removed from type expressions before they
are parsed.
+ 0.5.0 (March 2013):
    + The `parse()` method's `lenient` option has been renamed to `jsdoc`. **Note**: This change is
    not backwards-compatible with previous versions.
    + The `stringify()` method now accepts `cssClass` and `links` options, which you can use to
    add HTML links to a type expression.
+ 0.4.3 (March 2013):
    + The `stringify()` method no longer caches HTML-safe type expressions as if they were normal
    type expressions.
    + The `stringify()` method's options parameter may now include an `options.restringify`
    property, and the behavior of the `options.useCache` property has changed.
+ 0.4.2 (March 2013):
    + When lenient parsing is enabled, name expressions can now contain the characters `:` and `/`.
    + When lenient parsing is enabled, a name expression followed by `[]` (for example, `string[]`)
    will be interpreted as a type application with the expression `Array` (for example,
    `Array.<string>`).
+ 0.4.1 (March 2013):
    + The `parse()` and `stringify()` methods now honor all of the specified options.
    + When lenient parsing is enabled, name expressions can now contain a reserved word.
+ 0.4.0 (March 2013):
    + Catharsis now supports a lenient parsing option that can parse several kinds of malformed type
    expressions. See the documentation for details.
    + The objects containing parse results are now frozen.
    + The objects containing parse results now have two non-enumerable properties:
        + `lenient`: A boolean indicating whether the type expression was parsed in lenient mode.
        + `typeExpression`: A string containing the original type expression.
    + The `stringify()` method now honors the `useCache` option. If a parsed type includes a
    `typeExpression` property, and `useCache` is not set to `false`, the stringified type will be
    identical to the original type expression.
+ 0.3.1 (March 2013): Type expressions that begin with a reserved word, such as `integer`, are now
parsed correctly.
+ 0.3.0 (March 2013):
    + The `parse()` and `stringify()` methods are now synchronous, and the `parseSync()` and
    `stringifySync()` methods have been removed. **Note**: This change is not backwards-compatible
    with previous versions.
    + The parse results now use a significantly different format from previous versions. The new
    format is more expressive and is similar, but not identical, to the format used by the
    [doctrine](https://github.com/Constellation/doctrine) parser. **Note**: This change is not
    backwards-compatible with previous versions.
    + Name expressions that contain a reserved word now include a `reservedWord: true` property.
    + Union types that are optional or nullable, or that can be passed a variable number of times,
    are now parsed and stringified correctly.
    + Optional function types and record types are now parsed and stringified correctly.
    + Function types now longer include `new` or `this` properties unless the properties are defined
    in the type expression. In addition, the `new` and `this` properties can now use any type
    expression.
    + In record types, the key for a field type can now use any type expression.
    + Standalone single-character literals, such as ALL (`*`), are now parsed and stringified
    correctly.
    + `null` and `undefined` literals with additional properties, such as `repeatable`, are now
    stringified correctly.
+ 0.2.0 (November 2012):
    + Added `stringify()` and `stringifySync()` methods, which convert a parsed type to a type
    expression.
    + Simplified the parse results for function signatures. **Note**: This change is not
    backwards-compatible with previous versions.
    + Corrected minor errors in README.md.
+ 0.1.1 (November 2012): Added `opts` argument to `parse()` and `parseSync()` methods. **Note**: The
change to `parse()` is not backwards-compatible with previous versions.
+ 0.1.0 (November 2012): Initial release.

## License ##

[MIT license](https://github.com/hegemonic/catharsis/blob/master/LICENSE).
