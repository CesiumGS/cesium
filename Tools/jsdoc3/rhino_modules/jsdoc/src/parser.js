/**
 * @module jsdoc/src/parser
 * @requires common/util
 * @requires common/fs
 * @requires common/events
 */

var Token = Packages.org.mozilla.javascript.Token,
    currentParser = null,
    currentSourceName = '';

/**
 * @class
 * @mixes module:common/events
 *
 * @example <caption>Create a new parser.</caption>
 * var jsdocParser = new (require('jsdoc/src/parser').Parser)();
 */
exports.Parser = function() {
    this._resultBuffer = [];
    //Initialize a global ref to store global members
    this.refs = {
        __global__: {
            meta: {}
        }
    };
    this._visitors = [];
};
require('common/util').mixin(exports.Parser.prototype, require('common/events'));

/**
 * Parse the given source files for JSDoc comments.
 * @param {Array.<string>} sourceFiles An array of filepaths to the JavaScript sources.
 * @param {string} [encoding=utf8]
 *
 * @fires jsdocCommentFound
 * @fires symbolFound
 * @fires newDoclet
 * @fires fileBegin
 * @fires fileComplete
 *
 * @example <caption>Parse two source files.</caption>
 * var myFiles = ['file1.js', 'file2.js'];
 * var docs = jsdocParser.parse(myFiles);
 */
exports.Parser.prototype.parse = function(sourceFiles, encoding) {
    const SCHEMA = 'javascript:';
    var sourceCode = '',
        filename = '';

    if (typeof sourceFiles === 'string') { sourceFiles = [sourceFiles]; }

    for (i = 0, leni = sourceFiles.length; i < leni; i++) {
        if (sourceFiles[i].indexOf(SCHEMA) === 0) {
            sourceCode = sourceFiles[i].substr(SCHEMA.length);
            filename = '[[string' + i + ']]';
        }
        else {
            filename = sourceFiles[i];
            try {
                sourceCode = require('fs').readFileSync(filename, encoding);
            }
            catch(e) {
                console.log('FILE READ ERROR: in module:jsdoc/parser.parseFiles: "' + filename + '" ' + e);
                continue;
            }
        }

        currentParser = this;
        this._parseSourceCode(sourceCode, filename);
        currentParser = null;
    }

    return this._resultBuffer;
};

/**
 * @returns {Array<Doclet>} The accumulated results of any calls to parse.
 */
exports.Parser.prototype.results = function() {
    return this._resultBuffer;
}

/**
 * @param {Object} o The parse result to add to the result buffer.
 */
exports.Parser.prototype.addResult = function(o) {
    this._resultBuffer.push(o);
}

/**
 * Empty any accumulated results of calls to parse.
 */
exports.Parser.prototype.clear = function() {
    currentParser = null;
    currentSourceName = '';
    this._resultBuffer = [];
}

/**
 * Adds a node visitor to use in parsing
 */
exports.Parser.prototype.addNodeVisitor = function(visitor) {
    this._visitors.push(visitor);
}

/**
 * Get the node visitors used in parsing
 */
exports.Parser.prototype.getVisitors = function() {
    return this._visitors;
}

/** @private */
exports.Parser.prototype._parseSourceCode = function(sourceCode, sourceName) {
    var e = {filename: sourceName};
    this.fire('fileBegin', e);

    if (!e.defaultPrevented) {
        e = {filename: sourceName, source: sourceCode};
        this.fire('beforeParse', e);
        sourceCode = e.source;
        currentSourceName = sourceName = e.filename;

        sourceCode = pretreat(e.source);

        var ast = parserFactory().parse(sourceCode, sourceName, 1);
        ast.visit(
            new Packages.org.mozilla.javascript.ast.NodeVisitor({
                visit: visitNode
            })
        );
    }

    this.fire('fileComplete', e);

    currentSourceName = '';
}

function pretreat(code) {
    return code
        // make starbangstar comments look like real jsdoc comments
        .replace(/\/\*\!\*/g, '/**')

        // make matching comment endings easier
        .replace(/\*\//g, '»')

        // merge adjacent doclets
        .replace(/»\/\*\*+/g, '@also')
        // make lent objectliterals documentable by giving them a dummy name
        .replace(/(\/\*\*[^»]*?@lends\b[^»]*?»\s*)\{/g, '$1 ____ = {') // like return @lends {
        .replace(/(\/\*\*[^»]*?@lends\b[^»]*?»)(\s*)return(\s*)\{/g, '$2$3 return $1 ____ = {') // like @lends return {

        // make matching comment endings harder
        .replace(/»/g, '*/');
}

var tkn = { NAMEDFUNCTIONSTATEMENT: -1001 };
exports.Parser.tkn = tkn;

/**
 * Given a node, determine what the node is a member of.
 * @param {astnode} node
 * @returns {string} The long name of the node that this is a member of.
 */
exports.Parser.prototype.astnodeToMemberof = function(node) {
    var id,
        doclet;

    if (node.type === Token.VAR || node.type === Token.FUNCTION || node.type == tkn.NAMEDFUNCTIONSTATEMENT) {
        if (node.enclosingFunction) { // an inner var or func
            id = 'astnode'+node.enclosingFunction.hashCode();
            doclet = this.refs[id];
            if (!doclet) {
                return '<anonymous>~';
            }
            return (doclet.longname||doclet.name) +  '~';
        }
    }
    else {
        //check local references for aliases
        var scope = node,
            basename = getBasename(nodeToString(node.left));
        while(scope.enclosingFunction) {
            id = 'astnode'+scope.enclosingFunction.hashCode();
            doclet = this.refs[id];
            if (doclet && doclet.meta.vars && basename in doclet.meta.vars) {
                var alias = doclet.meta.vars.hasOwnProperty(basename)? doclet.meta.vars[basename] : false;
                if (alias !== false) {
                    return [alias, basename];
                }
            }
            // move up
            scope = scope.enclosingFunction;
        }
        //First check to see if we have a global scope alias
        doclet = this.refs["__global__"];
        if (doclet && doclet.meta.vars && doclet.meta.vars.hasOwnProperty(basename)) {
            var alias = doclet.meta.vars[basename];
            if (alias !== false) {
                return [alias, basename];
            }
        }

        id = 'astnode'+node.parent.hashCode();
        doclet = this.refs[id];
        if (!doclet) return ''; // global?
        return doclet.longname||doclet.name;
    }
}

/**
 * Resolve what "this" refers too, relative to a node.
 * @param {astnode} node - The "this" node
 * @returns {string} The longname of the enclosing node.
 */
exports.Parser.prototype.resolveThis = function(node) {
    var memberof = {};

    if (node.type !== Token.COLON && node.enclosingFunction) {
        // get documentation for the enclosing function
        memberof.id = 'astnode'+node.enclosingFunction.hashCode();
        memberof.doclet = this.refs[memberof.id];

        if (!memberof.doclet) {
            return '<anonymous>'; // TODO handle global this?
        }

        if (memberof.doclet['this']) {
            return memberof.doclet['this'];
        }
        // like: Foo.constructor = function(n) { /** blah */ this.name = n; }
        else if (memberof.doclet.kind === 'function' && memberof.doclet.memberof) {
            return memberof.doclet.memberof;
        }
        // walk up to the closest class we can find
        else if (memberof.doclet.kind === 'class' || memberof.doclet.kind === 'module') {
            return memberof.doclet.longname||memberof.doclet.name;
        }
        else {
            if (node.enclosingFunction){
                return this.resolveThis(node.enclosingFunction/*memberof.doclet.meta.code.val*/);
            }
            else return ''; // TODO handle global this?
        }
    }
    else if (node.parent) {
        var parent = node.parent;
        if (parent.type === Token.COLON) parent = parent.parent; // go up one more

        memberof.id = 'astnode'+parent.hashCode();
        memberof.doclet = this.refs[memberof.id];
        if (!memberof.doclet) return ''; // global?

        return memberof.doclet.longname||memberof.doclet.name;
    }
    else {
        return ''; // global?
    }
}

/**
    Given: foo = { x:1 }, find foo from x.
 */
exports.Parser.prototype.resolvePropertyParent = function(node) {
    var memberof = {};

    if (node.parent) {
        var parent = node.parent;
        if (parent.type === Token.COLON) parent = parent.parent; // go up one more

        memberof.id = 'astnode'+parent.hashCode();
        memberof.doclet = this.refs[memberof.id];

        if (memberof.doclet) { return memberof; }
    }
}

/**
 * Resolve what function a var is limited to.
 * @param {astnode} node
 * @param {string} basename The leftmost name in the long name: in foo.bar.zip the basename is foo.
 */
exports.Parser.prototype.resolveVar = function(node, basename) {
    var doclet,
        enclosingFunction = node.enclosingFunction;

    if (!enclosingFunction) { return ''; } // global
    doclet = this.refs['astnode'+enclosingFunction.hashCode()];

    if ( doclet && doclet.meta.vars && basename in doclet.meta.vars ) {
        return doclet.longname;
    }

    return this.resolveVar(enclosingFunction, basename);
}

exports.Parser.prototype.addDocletRef = function(e) {
    var node = e.code.node;
    if (e.doclet) {
        currentParser.refs['astnode'+node.hashCode()] = e.doclet; // allow lookup from value => doclet
    }
    else if ((node.type == Token.FUNCTION || node.type == tkn.NAMEDFUNCTIONSTATEMENT) && !currentParser.refs['astnode'+node.hashCode()]) { // keep references to undocumented anonymous functions too as they might have scoped vars
        currentParser.refs['astnode'+node.hashCode()] = {
            longname: '<anonymous>',
            meta: { code: e.code }
        };
    }
}

exports.Parser.prototype.resolveEnum = function(e) {
    var parent = currentParser.resolvePropertyParent(e.code.node);
    if (parent && parent.doclet.isEnum) {
        if (!parent.doclet.properties) { parent.doclet.properties = []; }
        // members of an enum inherit the enum's type
        if (parent.doclet.type && !e.doclet.type) { e.doclet.type = parent.doclet.type; }
        delete e.doclet.undocumented;
        e.doclet.defaultvalue = e.doclet.meta.code.value;
        parent.doclet.properties.push(e.doclet);
    }
}

/** @private */
function visitNode(node) {
    var e,
        commentSrc;

    // look for stand-alone doc comments
    if (node.type === Token.SCRIPT && node.comments) {
        // note: ALL comments are seen in this block...
        for each(var comment in node.comments.toArray()) {
            if (comment.commentType !== Token.CommentType.JSDOC) {
                continue;
            }

            if (commentSrc = ''+comment.toSource()) {

                e = {
                    comment: commentSrc,
                    lineno: comment.getLineno(),
                    filename: currentSourceName
                };

                if ( isValidJsdoc(commentSrc) ) {
                    currentParser.fire('jsdocCommentFound', e, currentParser);
                }
            }
        }
        e = null;
    }
    else if (node.type === Token.ASSIGN) {
        e = {
            id: 'astnode'+node.hashCode(), // the id of the ASSIGN node
            comment: String(node.jsDoc||'@undocumented'),
            lineno: node.left.getLineno(),
            filename: currentSourceName,
            astnode: node,
            code: aboutNode(node),
            event: "symbolFound",
            finishers: [currentParser.addDocletRef]
        };

        var basename = getBasename(e.code.name);

        if (basename !== 'this') e.code.funcscope = currentParser.resolveVar(node, basename);
    }
    else if (node.type === Token.COLON) { // assignment within an object literal
        e = {
            id: 'astnode'+node.hashCode(), // the id of the COLON node
            comment: String(node.left.jsDoc||'@undocumented'),
            lineno: node.left.getLineno(),
            filename: currentSourceName,
            astnode: node,
            code: aboutNode(node),
            event: "symbolFound",
            finishers: [currentParser.addDocletRef, currentParser.resolveEnum]
        };
    }
    else if (node.type == Token.VAR || node.type == Token.LET || node.type == Token.CONST) {

        if (node.variables) {
            return true; // we'll get each var separately on future visits
        }

        if (node.parent.variables.toArray()[0] === node) { // like /** blah */ var a=1, b=2, c=3;
            // the first var assignment gets any jsDoc before the whole var series
            node.jsDoc = node.parent.jsDoc;
        }

        e = {
            id: 'astnode'+node.hashCode(), // the id of the VARIABLE node
            comment: String(node.jsDoc||'@undocumented'),
            lineno: node.getLineno(),
            filename: currentSourceName,
            astnode: node,
            code: aboutNode(node),
            event: "symbolFound",
            finishers: [currentParser.addDocletRef]
        };

        // keep track of vars in a function or global scope
        var func = "__global__",
            funcDoc = null;
        if (node.enclosingFunction) {
            func = 'astnode'+node.enclosingFunction.hashCode();
        }
        funcDoc = currentParser.refs[func];
        if (funcDoc) {
            funcDoc.meta.vars = funcDoc.meta.vars || {};
            funcDoc.meta.vars[e.code.name] = false;
            e.finishers.push(makeVarsFinisher(funcDoc));
        }
    }
    else if (node.type == Token.FUNCTION || node.type == tkn.NAMEDFUNCTIONSTATEMENT) {
        e = {
            id: 'astnode'+node.hashCode(), // the id of the COLON node
            comment: String(node.jsDoc||'@undocumented'),
            lineno: node.getLineno(),
            filename: currentSourceName,
            astnode: node,
            code: aboutNode(node),
            event: "symbolFound",
            finishers: [currentParser.addDocletRef]
        };

        e.code.name = (node.type == tkn.NAMEDFUNCTIONSTATEMENT)? '' : String(node.name) || '';
        //console.log(':: e.code.name is', e.code.name);

        // keep track of vars in a function or global scope
        var func = "__global__",
            funcDoc = null;
        if (node.enclosingFunction) {
            func = 'astnode'+node.enclosingFunction.hashCode();
        }
        funcDoc = currentParser.refs[func];
        if (funcDoc) {
            funcDoc.meta.vars = funcDoc.meta.vars || {};
            funcDoc.meta.vars[e.code.name] = false;
            e.finishers.push(makeVarsFinisher(funcDoc));
        }

        var basename = getBasename(e.code.name)
        e.code.funcscope = currentParser.resolveVar(node, basename);
    }

    if (!e) { e = {finishers: []}; }
    for(var i = 0, l = currentParser._visitors.length; i < l; i++) {
        currentParser._visitors[i].visitNode(node, e, currentParser, currentSourceName);
        if (e.stopPropagation) { break; }
    }

    if (!e.preventDefault && isValidJsdoc(e.comment)) {
        currentParser.fire(e.event, e, currentParser);
    }

    for (var i = 0, l = e.finishers.length; i < l; i++) {
        e.finishers[i].call(currentParser, e);
    }

    return true;
}

/** @private */
function parserFactory() {
    var cx = Packages.org.mozilla.javascript.Context.getCurrentContext();

    var ce = new Packages.org.mozilla.javascript.CompilerEnvirons();
    ce.setRecordingComments(true);
    ce.setRecordingLocalJsDocComments(true);
    ce.setLanguageVersion(180);

    ce.initFromContext(cx);
    return new Packages.org.mozilla.javascript.Parser(ce, ce.getErrorReporter());
}

/**
 * Attempts to find the name and type of the given node.
 * @private
 * @memberof module:src/parser.Parser
 */
function aboutNode(node) {
    about = {};

    if (node.type == Token.FUNCTION || node.type == tkn.NAMEDFUNCTIONSTATEMENT) {
        about.name = node.type == tkn.NAMEDFUNCTIONSTATEMENT? '' : '' + node.name;
        about.type = 'function';
        about.node = node;
    }
    else if (node.type == Token.VAR || node.type == Token.LET || node.type == Token.CONST) {
        about.name = nodeToString(node.target);
        if (node.initializer) {  // like var i = 0;
            about.node = node.initializer;
            about.value = nodeToString(about.node);
            about.type = getTypeName(node.initializer);
            if (about.type === 'FUNCTION' && about.node.name) {
                about.node.type = tkn.NAMEDFUNCTIONSTATEMENT;
            }
        }
        else { // like var i;
            about.node = node.target;
            about.value = nodeToString(about.node);
            about.type = 'undefined';
        }
    }
    else if (node.type === Token.ASSIGN || node.type === Token.COLON) {
        about.name = nodeToString(node.left);
        if (node.type === Token.COLON) {

             // objlit keys with unsafe variable-name characters must be quoted
            if (!/^[$_a-z][$_a-z0-9]*$/i.test(about.name) ) {
                about.name = '"'+about.name.replace(/"/g, '\\"')+'"';
            }
        }
        about.node = node.right;
        about.value = nodeToString(about.node);
        about.type = getTypeName(node.right);

        if (about.type === 'FUNCTION' && about.node.name) {
            about.node.type = tkn.NAMEDFUNCTIONSTATEMENT;
        }
    }
    else {
        // type 39 (NAME)
        var string = nodeToString(node);
        if (string) {
            about.name = string;
        }
    }

    // get names of the formal parameters declared for this function
    if (about.node && about.node.getParamCount) {
        var paramCount = about.node.getParamCount();
        if (typeof paramCount === 'number') {
            about.node.flattenSymbolTable(true);
            var paramNames = [];
            for (var i = 0, len = paramCount; i < len; i++) {
                paramNames.push(''+about.node.getParamOrVarName(i));
            }
            about.paramnames = paramNames;
        }
    }

    return about;
}

/** @private
    @memberof module:src/parser.Parser
*/
function nodeToString(node) {
    var str;

    if (!node) return;

    if (node.type === Token.GETPROP) {
        str = [nodeToString(node.target), node.property.string].join('.');
    }
    else if (node.type === Token.VAR) {
        str = nodeToString(node.target)
    }
    else if (node.type === Token.NAME) {
        str = node.string;
    }
    else if (node.type === Token.STRING) {
        str = node.value;
    }
    else if (node.type === Token.NUMBER) {
        str = node.value;
    }
    else if (node.type === Token.THIS) {
        str = 'this';
    }
    else if (node.type === Token.GETELEM) {
        str = node.toSource(); // like: Foo['Bar']
    }
    else if (node.type === Token.NEG || node.type === Token.TRUE || node.type === Token.FALSE) {
        str = node.toSource(); // like -1
    }
    else {
        str = getTypeName(node);
    }

    return '' + str;
};

/** @private
    @memberof module:src/parser.Parser
*/
function getTypeName(node) {
    var type = '';

    if (node) {
        type = ''+ Packages.org.mozilla.javascript.Token.typeToName(node.getType());
    }

    return type;
}

/** @private
    @memberof module:src/parser.Parser
*/
function isValidJsdoc(commentSrc) {
    return commentSrc && commentSrc.indexOf('/***') !== 0; /*** ignore comments that start with many stars ***/
}

/** @private
 * @memberof module:src/parser.Parser
 */
function makeVarsFinisher(funcDoc) {
    var func = function(e) {
        //no need to evaluate all things related to funcDoc again, just use it
        if (funcDoc && e.doclet && e.doclet.alias) {
            funcDoc.meta.vars[e.code.name] = e.doclet.longname;
        }
    }
    return func;
}

/** @private
 * @memberof module:src/parser.Parser
 * @param {string} name Full symbol name.
 * @return {string} Basename.
 */
function getBasename(name) {
    if (name !== undefined) {
        return name.replace(/^([$a-z_][$a-z_0-9]*).*?$/i, '$1');
    }
    return name;
}

/**
    Fired whenever the parser encounters a JSDoc comment in the current source code.
    @event jsdocCommentFound
    @memberof module:jsdoc/src/parser.Parser
    @param {event} e
    @param {string} e.comment The text content of the JSDoc comment
    @param {number} e.lineno The line number associated with the found comment.
    @param {string} e.filename The file name associated with the found comment.
*/