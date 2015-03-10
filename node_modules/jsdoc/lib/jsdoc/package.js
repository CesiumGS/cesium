/**
    @overview
    @author Michael Mathews <micmath@gmail.com>
    @license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */
'use strict';

/**
    @module jsdoc/package
    @see http://wiki.commonjs.org/wiki/Packages/1.0
 */

/**
    @class
    @classdesc Represents a JavaScript package.
    @param {string} json - The contents of package.json.
 */
exports.Package = function(json) {
    json = json || '{}';

    /** The source files associated with this package.
        @type {Array<String>}
     */
    this.files = [];

    /** The kind of this package.
        @readonly
        @default
        @type {string}
    */
    this.kind = 'package';

    json = JSON.parse(json);

    /** The name of this package.
        This value is found in the package.json file passed in as a command line option.
        @type {string}
    */
    this.name = json.name;

    /** The longname of this package.
        @type {string}
    */
    this.longname = this.kind + ':' + this.name;

    /** The description of this package.
        @type {string}
    */
    this.description = json.description;

    /**
        The hash summary of the source file.
        @type {string}
        @since 3.2.0
    */
    this.version = json.version;

    /**
     * The licenses of this package.
     * @type {Array<Object>}
     * @example
     * "licenses": [
     *     {
     *        "type": "GPLv2",
     *        "url": "http://www.example.com/licenses/gpl.html"
     *     }
     * ]
     */
    this.licenses = json.licenses;
};
