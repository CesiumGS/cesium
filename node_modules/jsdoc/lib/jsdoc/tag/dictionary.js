/**
    @overview
    @author Michael Mathews <micmath@gmail.com>
    @license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */
'use strict';

var hasOwnProp = Object.prototype.hasOwnProperty;

var _tags = {};
var _tagSynonyms = {};
var _namespaces = [];
var dictionary;

/** @private */
function TagDefinition(title, etc) {
    var self = this;
    etc = etc || {};

    this.title = dictionary.normalise(title);

    Object.keys(etc).forEach(function(p) {
        self[p] = etc[p];
    });
}

/** @private */
TagDefinition.prototype.synonym = function(synonymName) {
    _tagSynonyms[synonymName.toLowerCase()] = this.title;
    return this; // chainable
};

/** @exports jsdoc/tag/dictionary */
dictionary = {
    /** @function */
    defineTag: function(title, opts) {
        var def = new TagDefinition(title, opts);
        // all the other dictionary functions use normalised names; we should too.
        _tags[def.title] = def;

        if (opts && opts.isNamespace) {
            _namespaces.push(def.title);
        }

        return _tags[def.title];
    },

    /** @function */
    lookUp: function(title) {
        title = dictionary.normalise(title);

        if ( hasOwnProp.call(_tags, title) ) {
           return _tags[title];
        }

        return false;
    },

    /** @function */
    isNamespace: function(kind) {
        if (kind) {
            kind = dictionary.normalise(kind);
            if ( _namespaces.indexOf(kind) !== -1) {
                return true;
            }
        }

        return false;
    },

    /** @function */
    normalise: function(title) {
        var canonicalName = title.toLowerCase();

        if ( hasOwnProp.call(_tagSynonyms, canonicalName) ) {
            return _tagSynonyms[canonicalName];
        }

        return canonicalName;
    }
};

require('jsdoc/tag/dictionary/definitions').defineTags(dictionary);

module.exports = dictionary;
