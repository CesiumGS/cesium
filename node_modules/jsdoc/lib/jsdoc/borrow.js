/**
    A collection of functions relating to resolving @borrows tags in JSDoc symbols.
    @module jsdoc/borrow
    @author Michael Mathews <micmath@gmail.com>
    @license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */
'use strict';

var doop = require('jsdoc/util/doop');
var logger = require('jsdoc/util/logger');

var hasOwnProp = Object.prototype.hasOwnProperty;

exports.indexAll = function(docs) {
    var lookupTable = {};

    docs.forEach(function(doc) {
        if ( !hasOwnProp.call(lookupTable, doc.longname) ) {
            lookupTable[doc.longname] = [];
        }
        lookupTable[doc.longname].push(doc);
    });
    docs.index = lookupTable;
};

// requires docs to have been indexed: docs.index must be defined here
/**
    Take a copy of the docs for borrowed symbols and attach them to the
    docs for the borrowing symbol. This process changes the symbols involved,
    moving docs from the "borrowed" array and into the general docs, then
    deleting the "borrowed" array.
 */
exports.resolveBorrows = function(docs) {
    /*eslint max-nested-callbacks:[2, 3] */
    if (!docs.index) {
        logger.error('Unable to resolve borrowed symbols, because the docs have not been indexed.');
        return;
    }

    docs.forEach(function(doc) {
        if (doc.borrowed) {
            doc.borrowed.forEach(function(b, i) {
                var lent = docs.index[b.from], // lent is an array
                    asName = b.as || b.from;

                if (lent) {
                    var cloned = doop(lent);

                    cloned.forEach(function(clone) {
                        asName = asName.replace(/^prototype\./, '#');
                        var parts = asName.split('#');

                        if (parts.length === 2) { clone.scope = 'instance'; }
                        else { clone.scope = 'static'; }

                        asName = parts.pop();
                        clone.name = asName;
                        clone.memberof = doc.longname;
                        clone.longname = clone.memberof + (clone.scope === 'instance' ? '#' : '.') +
                            clone.name;
                        docs.push(clone);
                    });

                }
            });

            delete doc.borrowed;
        }
    });
};
