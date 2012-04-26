/**
    A collection of functions relating to resolving @borrows tags in JSDoc symbols.
    @module jsdoc/borrow
    @author Michael Mathews <micmath@gmail.com>
	@license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */

// requires docs to have been indexed: docs.index must be defined here
/**
    Take a copy of the docs for borrowed symbols and attach them to the
    docs for the borrowing symbol. This process changes the symbols involved,
    moving docs from the "borrowed" array and into the general docs, then
    deleting the "borrowed" array.
 */
exports.resolveBorrows = function(docs) {
    if (!docs.index) {
        throw 'Docs has not been indexed: docs.index must be defined here.';
    }
    
    docs.forEach(function(doc) {
        if (doc.borrowed) {
            doc.borrowed.forEach(function(b, i) {
                var lent = docs.index[b.from], // lent is an array
                    asName = b['as'] || b.from;
                    
                if (lent) {
                    var cloned = doop(lent);

                    cloned.forEach(function(clone) {
                        asName = asName.replace(/^prototype\./, '#');
                        var parts = asName.split('#');
                        
                        if (parts.length === 2) clone.scope = 'instance';
                        else clone.scope = 'static';

                        asName = parts.pop();
                        clone.name = asName;
                        clone.memberof = doc.longname;
                        clone.longname = clone.memberof + (clone.scope === 'instance'? '#': '.') + clone.name;
                        docs.push(clone);
                    });
                    
                }
            });
            
            delete doc.borrowed;
        }
    });
}

/**
    Deep clone a simple object.
    @private
 */
function doop(o) {
    if (o instanceof Object && o.constructor != Function) {
        var clone = o instanceof Array ? [] : {}, prop;
        
        for (prop in o){
            if ( o.hasOwnProperty(prop) ) { 
                clone[prop] = (o[prop] instanceof Object)? doop(o[prop]) : o[prop]; 
            }
        }
        return clone;
    }
    return o;
};
