/*global env: true */
/**
    @module jsdoc/tag/validator
    @requires jsdoc/tag/dictionary

    @author Michael Mathews <micmath@gmail.com>
    @license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */
'use strict';

var dictionary = require('jsdoc/tag/dictionary');
var format = require('util').format;
var logger = require('jsdoc/util/logger');

function buildMessage(tagName, meta, desc) {
    var result = format('The @%s tag %s. File: %s, line: %s', tagName, desc, meta.filename,
        meta.lineno);
    if (meta.comment) {
        result += '\n' + meta.comment;
    }
    return result;
}

/**
 * Validate the given tag.
 */
exports.validate = function(tag, tagDef, meta) {
    // check for errors that make the tag useless
    if (!tagDef && !env.conf.tags.allowUnknownTags) {
        logger.error( buildMessage(tag.title, meta, 'is not a known tag') );
    }
    else if (!tag.text && tagDef.mustHaveValue) {
        logger.error( buildMessage(tag.title, meta, 'requires a value') );
    }

    // check for minor issues that are usually harmless
    else if (tag.text && tagDef.mustNotHaveValue) {
        logger.warn( buildMessage(tag.title, meta,
            'does not permit a value; the value will be ignored') );
    }
    else if (tag.value && tag.value.description && tagDef.mustNotHaveDescription) {
        logger.warn( buildMessage(tag.title, meta,
            'does not permit a description; the description will be ignored') );
    }
};
