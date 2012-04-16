/**
    @overview
    @author Michael Mathews <micmath@gmail.com>
	@license Apache License 2.0 - See file 'LICENSE.md' in this project.
 */

/**
	@module jsdoc/doclet
	@requires jsdoc/tag
	@requires jsdoc/name
	@requires jsdoc/tag/dictionary
 */

var jsdoc = {
    tag: {
        Tag: require('jsdoc/tag').Tag,
        dictionary: require('jsdoc/tag/dictionary')
    },
    name: require('jsdoc/name')
};
	
/**
    @class
    @classdesc Represents a single JSDoc comment.
    @param {string} docletSrc - The raw source code of the jsdoc comment.
    @param {object=} meta - Properties describing the code related to this comment.
 */
exports.Doclet = function(docletSrc, meta) {
    var newTags = [];
    
    /** The original text of the comment from the source code. */
    this.comment = docletSrc;
    this.setMeta(meta);
    
    docletSrc = unwrap(docletSrc);
    docletSrc = fixDescription(docletSrc);

    newTags = toTags.call(this, docletSrc);

    for (var i = 0, leni = newTags.length; i < leni; i++) {
        this.addTag(newTags[i].title, newTags[i].text);
    }
    
    this.postProcess();
}

/** Called once after all tags have been added. */
exports.Doclet.prototype.postProcess = function() {
    if (!this.preserveName) { jsdoc.name.resolve(this); }
    if (this.name && !this.longname) {
        this.setLongname(this.name);  
    }
    if (this.memberof === '') {
        delete(this.memberof);
    }
    
    if (!this.kind && this.meta && this.meta.code) {
        this.addTag( 'kind', codetypeToKind(this.meta.code.type) );
    }
    
    if (this.variation && this.longname && !/\)$/.test(this.longname) ) {
        this.longname += '('+this.variation+')';
    }
    
    // add in any missing param names
    if (this.params && this.meta && this.meta.code && this.meta.code.paramnames) {
        for (var i = 0, len = this.params.length; i < len; i++) {
            if (!this.params[i].name) {
                this.params[i].name = this.meta.code.paramnames[i] || '';
            }
        }
    }
}

/** Add a tag to this doclet.
    @param {string} title - The title of the tag being added.
    @param {string} [text] - The text of the tag being added.
*/
exports.Doclet.prototype.addTag = function(title, text) {
    var tagDef = jsdoc.tag.dictionary.lookUp(title),
        newTag = new jsdoc.tag.Tag(title, text, this.meta);

    if (tagDef && tagDef.onTagged) {
       tagDef.onTagged(this, newTag)
    }
    
    if (!tagDef) {
        this.tags = this.tags || [];
        this.tags.push(newTag);
    }
    
    applyTag.call(this, newTag);
}

/** Set the `memberof` property of this doclet.
    @param {string} sid - The longname of the symbol that this doclet is a member of.
*/
exports.Doclet.prototype.setMemberof = function(sid) {
    if (/^<global>\.?/.test(sid)) { sid = sid.replace(/^<global>.?/, ''); }
    /**
        The longname of the symbol that contains this one, if any.
        @type string
     */
    this.memberof = sid.replace(/\.prototype/g, '#');
}

/** Set the `longname` property of this doclet.
    @param {string} name
*/
exports.Doclet.prototype.setLongname = function(name) {
    if (/^<global>\.?/.test(name)) { name = name.replace(/^<global>\.?/, ''); }
    
    /**
        The fully resolved symbol name.
        @type string
     */
    this.longname = name;
    if (jsdoc.tag.dictionary.isNamespace(this.kind)) {
        this.longname = jsdoc.name.applyNamespace(this.longname, this.kind);
    }
}

/** Add a symbol to this doclet's `borrowed` array.
    @param {string} source - The longname of the symbol that is the source.
    @param {string} target - The name the symbol is being assigned to.
*/
exports.Doclet.prototype.borrow = function(source, target) {
    var about = {from: source};
    if (target) about.as = target;
    
    if (!this.borrowed) {
        /**
            A list of symbols that are borrowed by this one, if any.
            @type Array.<string>
         */
        this.borrowed = [];
    }
    this.borrowed.push(about);
}

exports.Doclet.prototype.mix = function(source) {
    if (!this.mixes) {
        /**
            A list of symbols that are mixed into this one, if any.
            @type Array.<string>
         */
        this.mixes = [];
    }
    this.mixes.push(source);
}

/** Add a symbol to this doclet's `augments` array.
    @param {string} base - The longname of the base symbol.
*/
exports.Doclet.prototype.augment = function(base) {
    if (!this.augments) {
        /**
            A list of symbols that are augmented by this one, if any.
            @type Array.<string>
         */
        this.augments = [];
    }
    this.augments.push(base);
}

/**
    Set the `meta` property of this doclet.
    @param {object} meta
*/
exports.Doclet.prototype.setMeta = function(meta) {
    if (!this.meta) {
        /**
            Information about the source code associated with this doclet.
            @namespace
         */
        this.meta = {};
    }
    
    if (meta.lineno) {
        /**
            The line number of the code associated with this doclet.
            @type number
         */
        this.meta.lineno = meta.lineno;
    }
    
    if (meta.lineno) {
        /**
            The name of the file containing the code associated with this doclet.
            @type string
         */
        var idx = meta.filename.lastIndexOf(String(java.lang.System.getProperty("file.separator")));
        if (idx != -1) {
            this.meta.path = meta.filename.substring(0, idx);
            this.meta.filename = meta.filename.substring(idx + 1);
        } else {
            this.meta.filename = meta.filename;
        }
    }
    
    /**
        Information about the code symbol.
        @namespace
     */
    this.meta.code = (this.meta.code || {});
    if (meta.id) this.meta.code.id = meta.id;
    if (meta.code) {
        if (meta.code.name) {
            /** The name of the symbol in the source code. */
            this.meta.code.name = meta.code.name;
        }
        if (meta.code.type) {
            /** The type of the symbol in the source code. */
            this.meta.code.type = meta.code.type;
        }
        if (meta.code.node) {
            this.meta.code.node = meta.code.node;
        }
        if (meta.code.funcscope) {
            this.meta.code.funcscope = meta.code.funcscope;
        }
        if (meta.code.value) {
            /** The value of the symbol in the source code. */
            this.meta.code.value = meta.code.value;
        }
        if (meta.code.paramnames) {
            this.meta.code.paramnames = meta.code.paramnames.concat([]);
        }
    }
}

function applyTag(tag) {
    if (tag.title === 'name') {
        this.name = tag.value;
    }
    
    if (tag.title === 'kind') {
        this.kind = tag.value;
    }
    
    if (tag.title === 'description') {
        this.description = tag.value;
    }
    
    if (tag.title === 'scope') {
        this.scope = tag.value;
    }
}

// use the meta info about the source code to guess what the doclet kind should be
function codetypeToKind(type) {
    var kind = (type || '').toLowerCase();
    
    if (kind !== 'function') {
        return 'member';
    }
    
    return kind;
}

/**
    Convert the raw source of the doclet comment into an array of Tag objects.
    @private
 */
function toTags(docletSrc) {
    var tagSrcs,
        tags = [];
    
    docletSrc = unwrap(docletSrc);
    tagSrcs = split(docletSrc);
    
    for each(tagSrc in tagSrcs) {
        tags.push( {title: tagSrc.title, text: tagSrc.text} );
    }
    
    return tags;
}

function unwrap(docletSrc) {
    if (!docletSrc) { return ''; }

	// note: keep trailing whitespace for @examples
	// extra opening/closing stars are ignored
	// left margin is considered a star and a space
	// use the /m flag on regex to avoid having to guess what this platform's newline is
	docletSrc =
		docletSrc.replace(/^\/\*\*+/, '') // remove opening slash+stars
		.replace(/\**\*\/$/, "\\Z")       // replace closing star slash with end-marker
		.replace(/^\s*(\* ?|\\Z)/gm, '')  // remove left margin like: spaces+star or spaces+end-marker
		.replace(/\s*\\Z$/g, '');         // remove end-marker

	return docletSrc;
}

function fixDescription(docletSrc) {
    if (!/^\s*@/.test(docletSrc)) {
		docletSrc = '@description ' + docletSrc;
	}
	return docletSrc;
}

function split(docletSrc) {
	var tagSrcs = [];
          
	// split out the basic tags, keep surrounding whitespace
	// like: @tagTitle tagBody
	docletSrc
	.replace(/^(\s*)@(\S)/gm, '$1\\@$2') // replace splitter ats with an arbitrary sequence
	.split('\\@')                        // then split on that arbitrary sequence
	.forEach(function($) {
	    if ($) {
	        var parsedTag = $.match(/^(\S+)(:?\s+(\S[\s\S]*))?/);
            
            if (parsedTag) {
                var [, tagTitle, tagText] = parsedTag;

                if (tagTitle) {
                    tagSrcs.push({
                        title: tagTitle,
                        text: tagText
                    });
                }
            }
        }
	});
	
	return tagSrcs;
}
