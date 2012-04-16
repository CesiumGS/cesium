/**
 * @project jsdoc
 * @author Michael Mathews <micmath@gmail.com>
 * @license See LICENSE.md file included in this distribution.
 */

// try: $ java -classpath build-files/java/classes/js.jar org.mozilla.javascript.tools.shell.Main main.js `pwd` script/to/parse.js

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

/** The absolute path to the base directory of the jsdoc application.
    @type string
    @global
 */
__dirname = '.',
args = Array.prototype.slice.call(arguments, 0);

// rhino has no native way to get the base dirname of the currently running script
// so this information must be manually passed in from the command line
for (var i = 0; i < args.length; i++) {
    if ( /^--dirname(?:=(.+?)(\/|\/\.)?)?$/i.test(args[i]) ) {
        if (RegExp.$1) {
            __dirname = RegExp.$1; // last wins
            args.splice(i--, 1); // remove --dirname opt from arguments
        }
        else {
            __dirname = args[i + 1];
            args.splice(i--, 2);
        }
    }
}

load(__dirname + '/lib/rhino-shim.js');

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//

	
/** Data representing the environment in which this app is running.
    @namespace
*/
env = {
    /** Running start and finish times. */
    run: {
        start: new Date(),
        finish: null
    },
    
    /**
        The command line arguments passed into jsdoc.
        @type Array
    */
    args: Array.prototype.slice.call(args, 0),
    
    
    /**
        The parsed JSON data from the configuration file.
        @type Object
    */
    conf: {},
    
    /**
        The command line arguments, parsed into a key/value hash.
        @type Object
        @example if (env.opts.help) { print 'Helpful message.'; }
    */
    opts: {}
};

/**
    Data that must be shared across the entire application.
    @namespace
*/
app = {
    jsdoc: {
        scanner: new (require('jsdoc/src/scanner').Scanner)(),
        parser: new (require('jsdoc/src/parser').Parser)(),
        name: require('jsdoc/name')
    }
}

try { main(); }
catch(e) { 
     if (e.rhinoException != null) { 
         e.rhinoException.printStackTrace();
     }
     else throw e;
} 
finally { env.run.finish = new Date(); }

/** Print string/s out to the console.
    @param {string} ... String/s to print out to console.
 */
function print() {
    for (var i = 0, leni = arguments.length; i < leni; i++) {
        java.lang.System.out.println('' + arguments[i]);
    }
}

/**
    Try to recursively print out all key/values in an object.
    @global
    @param {Object} ... Object/s to dump out to console.
 */
function dump() {
    for (var i = 0, leni = arguments.length; i < leni; i++) {
        print( require('jsdoc/util/dumper').dump(arguments[i]) );
    }
}

/** @global
    @param {string} filepath The path to the script file to include (read and execute).
*/
function include(filepath) {
    try {
        load(__dirname + '/' + filepath);
    }
    catch (e) {
        console.log('Cannot include "' + __dirname + '/' + filepath + '": '+e);
    }
}

/** 
    Cause the VM running jsdoc to exit running.
    @param {number} [n = 0] The exit status.
 */
function exit(n) {
    n = n || 0;
    java.lang.System.exit(n);
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//


/**
    Run the jsoc application.
 */
function main() {
    var sourceFiles,
        packageJson,
        docs,
        jsdoc = {
            opts: {
                parser: require('jsdoc/opts/parser'),
            }
        },
        resolver,
        dictionary = require('jsdoc/tag/dictionary'),
        fs = require('fs');
    
    env.opts = jsdoc.opts.parser.parse(env.args);
    
    try {
        env.conf = JSON.parse(
            fs.readFileSync( env.opts.configure || __dirname + '/conf.json' )
        );
    }
    catch (e) {
        try {
            //Try to copy over the example conf
            var example = fs.readFileSync(__dirname + '/conf.json.EXAMPLE', 'utf8');
            fs.writeFileSync(__dirname + '/conf.json', example, 'utf8');
            env.conf = JSON.parse(example);
        }
        catch(e) {
            throw('Configuration file cannot be evaluated. ' + e);    
        }
    }
    
    // allow to pass arguments from configuration file
    if (env.conf.opts) {
        for (var opt in env.conf.opts) {
            // arguments passed in command are more important
            if (!(opt in env.opts)) {
                env.opts[opt] = env.conf.opts[opt];
            }
        }
        // command file list is concatenated after conf list
        if( env.conf.opts._ ){
            env.opts._ = env.conf.opts._.concat( env.opts._ );
        }
    }
    
    if (env.opts.query) {
        env.opts.query = require('common/query').toObject(env.opts.query);
    }
    
    // which version of javascript will be supported? (rhino only)
    if (typeof version === 'function') {
        version(env.conf.jsVersion || 180);
    }
    
    if (env.opts.help) {
        console.log( jsdoc.opts.parser.help() );
        exit(0);
    }
    else if (env.opts.test) {
        include('test/runner.js');
        exit(0);
    }
    
    // allow user-defined plugins to...
    if (env.conf.plugins) {
        for (var i = 0, leni = env.conf.plugins.length; i < leni; i++) {
            var plugin = require(env.conf.plugins[i]);

            //...register event handlers
            if (plugin.handlers) {
                for (var eventName in plugin.handlers) {
                    app.jsdoc.parser.on(eventName, plugin.handlers[eventName]);
                }
            }

            //...define tags
            if (plugin.defineTags) {
                plugin.defineTags(dictionary);
            }

            //...add a node visitor
            if (plugin.nodeVisitor) {
                app.jsdoc.parser.addNodeVisitor(plugin.nodeVisitor);
            }
        }
    }

    // any source file named package.json is treated special
    for (var i = 0, l = env.opts._.length; i < l; i++ ) {
        if (/\bpackage\.json$/i.test(env.opts._[i])) {
            packageJson = require('fs').readFileSync( env.opts._[i] );
            env.opts._.splice(i--, 1);
        }
    }

    if (env.opts._.length > 0) { // are there any files to scan and parse?
        
        var includeMatch = (env.conf.source && env.conf.source.includePattern)? new RegExp(env.conf.source.includePattern) : null,
            excludeMatch = (env.conf.source && env.conf.source.excludePattern)? new RegExp(env.conf.source.excludePattern) : null;
        
        sourceFiles = app.jsdoc.scanner.scan(env.opts._, (env.opts.recurse? 10 : undefined), includeMatch, excludeMatch);

        require('jsdoc/src/handlers').attachTo(app.jsdoc.parser);
        
        docs = app.jsdoc.parser.parse(sourceFiles, env.opts.encoding);
        
        //The files are ALWAYS useful for the templates to have
        //If there is no package.json, just create an empty package
        var packageDocs = new (require('jsdoc/package').Package)(packageJson);
        packageDocs.files = sourceFiles || [];
        docs.push(packageDocs);
        
        function indexAll(docs) {
            var lookupTable = {};
            
            docs.forEach(function(doc) {
                if ( !lookupTable.hasOwnProperty(doc.longname) ) {
                    lookupTable[doc.longname] = [];
                }
                lookupTable[doc.longname].push(doc);
            });
            docs.index = lookupTable;
        }
        
        indexAll(docs);
        
        require('jsdoc/augment').addInherited(docs);
        require('jsdoc/borrow').resolveBorrows(docs);
        
        if (env.opts.explain) {
            console.log(docs);
            exit(0);
        }

        // load this module anyway to ensure root instance exists
        // it's not a problem since without tutorials root node will have empty children list
        resolver = require('jsdoc/tutorial/resolver');

        if (env.opts.tutorials) {
            resolver.load(env.opts.tutorials);
            resolver.resolve();
        }

        env.opts.template = env.opts.template || 'templates/default';
        
        // should define a global "publish" function
        include(env.opts.template + '/publish.js');

        if (typeof publish === 'function') {
            publish(
                new (require('typicaljoe/taffy'))(docs),
                env.opts,
                resolver.root
            );
        }
        else { // TODO throw no publish warning?
        }
    }
}
