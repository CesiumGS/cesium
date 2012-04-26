/**
    @overview A minimal emulation of the standard features of nodejs necessary
    to get jsdoc to run.
 */

/**
    Emulate nodejs console functions.
    @see http://nodejs.org/docs/v0.4.8/api/stdio.html
 */
console = {
    log: function(/*...*/) {
        var args = Array.prototype.slice.call(arguments, 0),
            dumper = dumper || require('jsdoc/util/dumper');
        
        for (var i = 0, len = args.length; i < len; i++) {
            if (typeof args[i] !== 'string') {
                args[i] = dumper.dump(args[i]);
            }
        }
        
        print( args.join(' ') );
    }
};

/**
    Emulate nodejs process functions.
    @see http://nodejs.org/docs/v0.4.8/api/process.html
 */
process = {
    exit: function(n) {
        n = n || 0;
        java.lang.System.exit(n);
    },
    argv: [__dirname + '/jsdoc.js'].concat(Array.prototype.slice.call(arguments, 0))
};
 