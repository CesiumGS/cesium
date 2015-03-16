/*global java */
/*eslint no-process-exit:0 */
/**
 * Helper methods for running JSDoc on the command line.
 *
 * A few critical notes for anyone who works on this module:
 *
 * + The module should really export an instance of `cli`, and `props` should be properties of a
 * `cli` instance. However, Rhino interpreted `this` as a reference to `global` within the
 * prototype's methods, so we couldn't do that.
 * + On Rhino, for unknown reasons, the `jsdoc/fs` and `jsdoc/path` modules can fail in some cases
 * when they are required by this module. You may need to use `fs` and `path` instead.
 *
 * @private
 */
module.exports = (function() {
'use strict';

var logger = require('jsdoc/util/logger');
var stripJsonComments = require('strip-json-comments');

var hasOwnProp = Object.prototype.hasOwnProperty;

var props = {
    docs: [],
    packageJson: null,
    shouldExitWithError: false,
    tmpdir: null
};

var app = global.app;
var env = global.env;

var FATAL_ERROR_MESSAGE = 'Exiting JSDoc because an error occurred. See the previous log ' +
    'messages for details.';
var cli = {};

// TODO: docs
cli.setVersionInfo = function() {
    var fs = require('fs');
    var path = require('path');

    // allow this to throw--something is really wrong if we can't read our own package file
    var info = JSON.parse( fs.readFileSync(path.join(env.dirname, 'package.json'), 'utf8') );

    env.version = {
        number: info.version,
        revision: new Date( parseInt(info.revision, 10) ).toUTCString()
    };

    return cli;
};

// TODO: docs
cli.loadConfig = function() {
    var _ = require('underscore');
    var args = require('jsdoc/opts/args');
    var Config = require('jsdoc/config');
    var fs = require('jsdoc/fs');
    var path = require('jsdoc/path');

    var confPath;
    var isFile;

    var defaultOpts = {
        destination: './out/',
        encoding: 'utf8'
    };

    try {
        env.opts = args.parse(env.args);
    }
    catch (e) {
        cli.exit(1, e.message + '\n' + FATAL_ERROR_MESSAGE);
    }

    confPath = env.opts.configure || path.join(env.dirname, 'conf.json');
    try {
        isFile = fs.statSync(confPath).isFile();
    }
    catch(e) {
        isFile = false;
    }

    if ( !isFile && !env.opts.configure ) {
        confPath = path.join(env.dirname, 'conf.json.EXAMPLE');
    }

    try {
        env.conf = new Config( stripJsonComments(fs.readFileSync(confPath, 'utf8')) )
            .get();
    }
    catch (e) {
        cli.exit(1, 'Cannot parse the config file ' + confPath + ': ' + e + '\n' +
            FATAL_ERROR_MESSAGE);
    }

    // look for options on the command line, in the config file, and in the defaults, in that order
    env.opts = _.defaults(env.opts, env.conf.opts, defaultOpts);

    return cli;
};

// TODO: docs
cli.configureLogger = function() {
    function recoverableError() {
        props.shouldExitWithError = true;
    }

    function fatalError() {
        cli.exit(1);
    }

    if (env.opts.debug) {
        logger.setLevel(logger.LEVELS.DEBUG);
    }
    else if (env.opts.verbose) {
        logger.setLevel(logger.LEVELS.INFO);
    }

    if (env.opts.pedantic) {
        logger.once('logger:warn', recoverableError);
        logger.once('logger:error', fatalError);
    }
    else {
        logger.once('logger:error', recoverableError);
    }

    logger.once('logger:fatal', fatalError);

    return cli;
};

// TODO: docs
cli.logStart = function() {
    logger.debug( cli.getVersion() );

    logger.debug('Environment info: %j', {
        env: {
            conf: env.conf,
            opts: env.opts
        }
    });
};

// TODO: docs
cli.logFinish = function() {
    var delta;
    var deltaSeconds;

    if (env.run.finish && env.run.start) {
        delta = env.run.finish.getTime() - env.run.start.getTime();
    }

    if (delta !== undefined) {
        deltaSeconds = (delta / 1000).toFixed(2);
        logger.info('Finished running in %s seconds.', deltaSeconds);
    }
};

// TODO: docs
cli.runCommand = function(cb) {
    var cmd;

    var opts = env.opts;

    function done(errorCode) {
        if (!errorCode && props.shouldExitWithError) {
            cb(1);
        }
        else {
            cb(errorCode);
        }
    }

    if (opts.help) {
        cmd = cli.printHelp;
    }
    else if (opts.test) {
        cmd = cli.runTests;
    }
    else if (opts.version) {
        cmd = cli.printVersion;
    }
    else {
        cmd = cli.main;
    }

    cmd(done);
};

// TODO: docs
cli.printHelp = function(cb) {
    cli.printVersion();
    console.log( '\n' + require('jsdoc/opts/args').help() + '\n' );
    console.log('Visit http://usejsdoc.org for more information.');
    cb(0);
};

// TODO: docs
cli.runTests = function(cb) {
    var path = require('jsdoc/path');

    var runner = require( path.join(env.dirname, 'test/runner') );

    console.log('Running tests...');
    runner(function(failCount) {
        cb(failCount);
    });
};

// TODO: docs
cli.getVersion = function() {
    return 'JSDoc ' + env.version.number + ' (' + env.version.revision + ')';
};

// TODO: docs
cli.printVersion = function(cb) {
    console.log( cli.getVersion() );

    if (cb) {
        cb(0);
    }
};

// TODO: docs
cli.main = function(cb) {
    cli.scanFiles();

    if (env.sourceFiles.length) {
        cli.createParser()
            .parseFiles()
            .processParseResults();
    }
    else {
        console.log('There are no input files to process.\n');
        cli.printHelp(cb);
    }

    env.run.finish = new Date();
    cb(0);
};

function getRandomId() {
    var MIN = 100000;
    var MAX = 999999;

    return Math.floor(Math.random() * (MAX - MIN + 1) + MIN);
}

// TODO: docs
cli.scanFiles = function() {
    var Filter = require('jsdoc/src/filter').Filter;
    var fs = require('jsdoc/fs');
    var Readme = require('jsdoc/readme');

    var filter;
    var opt;

    if (env.conf.source && env.conf.source.include) {
        env.opts._ = (env.opts._ || []).concat(env.conf.source.include);
    }

    // source files named `package.json` or `README.md` get special treatment
    for (var i = 0, l = env.opts._.length; i < l; i++) {
        opt = env.opts._[i];

        if ( /\bpackage\.json$/i.test(opt) ) {
            props.packageJson = fs.readFileSync(opt, 'utf8');
            env.opts._.splice(i--, 1);
        }

        if ( /(\bREADME|\.md)$/i.test(opt) ) {
            env.opts.readme = new Readme(opt).html;
            env.opts._.splice(i--, 1);
        }
    }

    // are there any files to scan and parse?
    if (env.conf.source && env.opts._.length) {
        filter = new Filter(env.conf.source);

        env.sourceFiles = app.jsdoc.scanner.scan(env.opts._, (env.opts.recurse ? 10 : undefined),
            filter);
    }

    return cli;
};

function resolvePluginPaths(paths) {
    var path = require('jsdoc/path');

    var isNode = require('jsdoc/util/runtime').isNode();
    var pluginPaths = [];

    paths.forEach(function(plugin) {
        var basename = path.basename(plugin);
        var dirname = path.dirname(plugin);
        var pluginPath = path.getResourcePath(dirname);

        if (!pluginPath) {
            logger.error('Unable to find the plugin "%s"', plugin);
            return;
        }

        pluginPaths.push( path.join(pluginPath, basename) );
    });

    return pluginPaths;
}

cli.createParser = function() {
    var handlers = require('jsdoc/src/handlers');
    var parser = require('jsdoc/src/parser');
    var path = require('jsdoc/path');
    var plugins = require('jsdoc/plugins');

    app.jsdoc.parser = parser.createParser(env.conf.parser);

    if (env.conf.plugins) {
        env.conf.plugins = resolvePluginPaths(env.conf.plugins);
        plugins.installPlugins(env.conf.plugins, app.jsdoc.parser);
    }

    handlers.attachTo(app.jsdoc.parser);

    return cli;
};

cli.parseFiles = function() {
    var augment = require('jsdoc/augment');
    var borrow = require('jsdoc/borrow');
    var Package = require('jsdoc/package').Package;

    var docs;
    var packageDocs;

    props.docs = docs = app.jsdoc.parser.parse(env.sourceFiles, env.opts.encoding);

    // If there is no package.json, just create an empty package
    packageDocs = new Package(props.packageJson);
    packageDocs.files = env.sourceFiles || [];
    docs.push(packageDocs);

    logger.debug('Adding inherited symbols...');
    borrow.indexAll(docs);
    augment.addInherited(docs);
    borrow.resolveBorrows(docs);

    app.jsdoc.parser.fireProcessingComplete(docs);

    return cli;
};

cli.processParseResults = function() {
    if (env.opts.explain) {
        cli.dumpParseResults();
    }
    else {
        cli.resolveTutorials();
        cli.generateDocs();
    }

    return cli;
};

cli.dumpParseResults = function() {
    global.dump(props.docs);

    return cli;
};

cli.resolveTutorials = function() {
    var resolver = require('jsdoc/tutorial/resolver');

    if (env.opts.tutorials) {
        resolver.load(env.opts.tutorials);
        resolver.resolve();
    }

    return cli;
};

cli.generateDocs = function() {
    var path = require('jsdoc/path');
    var resolver = require('jsdoc/tutorial/resolver');
    var taffy = require('taffydb').taffy;

    var template;

    env.opts.template = (function() {
        var isNode = require('jsdoc/util/runtime').isNode();
        var publish = env.opts.template || 'templates/default';
        var templatePath = path.getResourcePath(publish);

        // if we didn't find the template, keep the user-specified value so the error message is
        // useful
        return templatePath || env.opts.template;
    })();

    try {
        template = require(env.opts.template + '/publish');
    }
    catch(e) {
        logger.fatal('Unable to load template: ' + e.message || e);
    }

    // templates should include a publish.js file that exports a "publish" function
    if (template.publish && typeof template.publish === 'function') {
        logger.printInfo('Generating output files...');
        template.publish(
            taffy(props.docs),
            env.opts,
            resolver.root
        );
        logger.info('complete.');
    }
    else {
        logger.fatal(env.opts.template + ' does not export a "publish" function. Global ' +
            '"publish" functions are no longer supported.');
    }

    return cli;
};

// TODO: docs
cli.exit = function(exitCode, message) {
    if (message && exitCode > 0) {
        console.error(message);
    }

    process.exit(exitCode || 0);
};

return cli;

})();
