/*jslint node: true, latedef: nofunc*/
"use strict";

var fs = require('fs');
var path = require('path');
var os = require('os');
var child_process = require('child_process');

var globby = require('globby');
var jshint = require('gulp-jshint');
var async = require('async');
var rimraf = require('rimraf');
var stripComments = require('strip-comments');
var mkdirp = require('mkdirp');
var eventStream = require('event-stream');
var gulp = require('gulp');
var gulpInsert = require('gulp-insert');
var gulpZip = require('gulp-zip');
var gulpRename = require('gulp-rename');
var gulpReplace = require('gulp-replace');

var packageJson = require('./package.json');

//Gulp doesn't seem to have a way to get the currently running tasks for setting
//per-task variables.  We use the command line argument here to detect which task is being run.
var noDevelopmentGallery = process.argv[2] === 'release' || process.argv[2] === 'makeZipFile';

var sourceFiles = ['Source/**/*.js',
                   '!Source/*.js',
                   '!Source/Workers/**',
                   '!Source/ThirdParty/Workers/**',
                   'Source/Workers/createTaskProcessorWorker.js'];

var jsHintFiles = ['Source/**/*.js',
                   '!Source/Shaders/**',
                   '!Source/ThirdParty/**',
                   '!Source/Workers/cesiumWorkerBootstrapper.js',
                   'Apps/**/*.js',
                   'Apps/Sandcastle/gallery/*.html',
                   '!Apps/Sandcastle/ThirdParty/**',
                   'Specs/**/*.js',
                   'Tools/buildTasks/**/*.js'];

var filesToClean = ['Source/Cesium.js',
                    'Build',
                    'Instrumented',
                    'Source/Shaders/**.js',
                    'Specs/SpecList.js',
                    'Apps/Sandcastle/.jshintrc',
                    'Apps/Sandcastle/jsHintOptions.js',
                    'Apps/Sandcastle/gallery/gallery-index.js',
                    'Cesium-*.zip'];

var filesToSortRequires = ['Source/**/*.js',
                           '!Source/Shaders/**',
                           '!Source/ThirdParty/**',
                           '!Source/Workers/cesiumWorkerBootstrapper.js',
                           '!Source/copyrightHeader.js',
                           '!Source/Workers/transferTypedArrayTest.js',
                           'Apps/**/*.js',
                           '!Apps/Sandcastle/ThirdParty/**',
                           '!Apps/Sandcastle/jsHintOptions.js',
                           'Specs/**/*.js',
                           '!Specs/spec-main.js',
                           '!Specs/SpecRunner.js',
                           '!Specs/SpecList.js',
                           '!Apps/Sandcastle/Sandcastle-client.js',
                           '!Apps/Sandcastle/Sandcastle-header.js',
                           '!Apps/Sandcastle/Sandcastle-warn.js',
                           '!Apps/Sandcastle/gallery/gallery-index.js'];

gulp.task('default', ['combine']);

gulp.task('build', function(done) {
    mkdirp.sync('Build');
    glslToJavaScript(false, 'Build/minifyShaders.state');
    createCesiumJs();
    createSpecList();
    createGalleryList();
    createSandcastleJsHintOptions();
    done();
});

gulp.task('buildApps', ['combine', 'minifyRelease'], function() {
    return buildCesiumViewer();
});

gulp.task('clean', function(done) {
    async.forEach(filesToClean, rimraf, done);
});

gulp.task('cloc', ['build'], function(done) {
    var glsl = globby.sync(['Source/Shaders/*.glsl', 'Source/Shaders/**/*.glsl', 'Source/main.js']);
    glsl = glsl.join(' ');

    var clockPath = path.join('Tools', 'cloc-1.60', 'cloc-1.60.pl');
    var cloc_definitions = path.join('Tools', 'cloc-1.60', 'cloc_definitions');

    console.log('Source:');
    child_process.execSync('perl ' + clockPath + ' --quiet --progress-rate=0 --read-lang-def=' + cloc_definitions +
                           ' Source/Core/ Source/DataSources/ Source/Renderer/ Source/Scene/ Source/Widgets/ Source/Workers/ ' +
                           glsl, {
        stdio : [process.stdin, process.stdout, process.stderr]
    });

    console.log('Specs:');
    child_process.execSync('perl ' + clockPath + ' --quiet --progress-rate=0 --read-lang-def=' + cloc_definitions + ' Specs/', {
        stdio : [process.stdin, process.stdout, process.stderr]
    });

    done();
});

gulp.task('combine', ['generateStubs'], function() {
    return combineJavaScript({
        removePragmas : false,
        minify : false,
        outputDirectory : path.join('Build', 'CesiumUnminified')
    });
});

gulp.task('combineRelease', ['generateStubs'], function() {
    return combineJavaScript({
        removePragmas : true,
        minify : false,
        outputDirectory : path.join('Build', 'CesiumUnminified')
    });
});

//Builds the documentation
gulp.task('generateDocumentation', function() {
    var envPathSeperator = os.platform() === 'win32' ? ';' : ':';

    child_process.execSync('jsdoc --configure Tools/jsdoc/conf.json', {
        stdio : [process.stdin, process.stdout, process.stderr],
        env : {
            PATH : process.env.PATH + envPathSeperator + 'node_modules/.bin',
            CESIUM_VERSION : packageJson.version
        }
    });

    return gulp.src('Documentation/Images/**').pipe(gulp.dest('Build/Documentation/Images'));
});

gulp.task('instrumentForCoverage', ['build'], function(done) {
    var exe = path.join('Tools', 'jscoverage-0.5.1', 'jscoverage.exe');
    child_process.execSync(exe + ' Source Instrumented --no-instrument=./ThirdParty', {
        stdio : [process.stdin, process.stdout, process.stderr]
    });
    done();
});

//Runs jsHint
gulp.task('jsHint', ['build'], function() {
    return gulp.src(jsHintFiles)
        .pipe(jshint.extract('auto'))
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});

//Runs jsHint automatically on file change.
gulp.task('jsHint-watch', function() {
    gulp.watch(jsHintFiles).on('change', function(event) {
        gulp.src(event.path)
            .pipe(jshint.extract('auto'))
            .pipe(jshint())
            .pipe(jshint.reporter('jshint-stylish'));
    });
});

gulp.task('makeZipFile', ['release'], function() {
    var builtSrc = gulp.src([
        'Build/Apps/**',
        'Build/Cesium/**',
        'Build/CesiumUnminified/**',
        'Build/Documentation/**'
    ], {
        root : 'Build',
        base : '.'
    });

    var staticSrc = gulp.src([
        'Apps/**',
        '!Apps/Sandcastle/gallery/development/**',
        'Source/**',
        'Specs/**',
        'ThirdParty/**',
        'logo.png',
        'favicon.ico',
        'gulpfile.js',
        'server.js',
        'package.json',
        'LICENSE.md',
        'CHANGES.md',
        'README.md',
        'web.config'
    ], {
        base : '.'
    });

    var indexSrc = gulp.src('index.release.html').pipe(gulpRename("index.html"));

    var version = packageJson.version;
    if (/\.0$/.test(version)) {
        version = version.substring(0, version.length - 2);
    }

    return eventStream.merge(builtSrc, staticSrc, indexSrc)
        .pipe(gulpZip('Cesium-' + version + '.zip'))
        .pipe(gulp.dest('.'));
});

gulp.task('minify', ['generateStubs'], function() {
    return combineJavaScript({
        removePragmas : false,
        minify : true,
        outputDirectory : path.join('Build', 'Cesium')
    });
});

gulp.task('minifyRelease', ['generateStubs'], function() {
    return combineJavaScript({
        removePragmas : true,
        minify : true,
        outputDirectory : path.join('Build', 'Cesium')
    });
});

gulp.task('release', ['buildApps', 'generateDocumentation']);

gulp.task('generateStubs', ['build'], function() {
    mkdirp.sync(path.join('Build', 'Stubs'));

    var contents = '\
/*global define,Cesium*/\n\
(function() {\n\
"use strict";\n\
/*jshint sub:true*/\n';
    var modulePathMappings = [];

    globby.sync(sourceFiles).forEach(function(file) {
        file = path.relative('Source', file);
        var moduleId = file.replace(/\\/, '/');
        moduleId = moduleId.substring(0, moduleId.lastIndexOf('.'));

        var baseName = path.basename(file);
        var propertyName = baseName.substring(0, baseName.lastIndexOf('.'));
        propertyName = "['" + String(propertyName) + "']";

        contents += '\
define(\'' + moduleId + '\', function() {\n\
    return Cesium' + propertyName + ';\n\
});\n\n';

        modulePathMappings.push('        \'' + moduleId + '\' : \'../Stubs/Cesium\'');
    });

    contents += '})();';

    var paths = '\
/*global define*/\n\
define(function() {\n\
    "use strict";\n\
    return {\n' + modulePathMappings.join(',\n') + '\n\
    };\n\
});';

    fs.writeFileSync(path.join('Build', 'Stubs', 'Cesium.js'), contents);
    fs.writeFileSync(path.join('Build', 'Stubs', 'paths.js'), paths);
});

//Alphabetizes and formats require statement at top of each file.
gulp.task('sortRequires', function(done) {
    var noModulesRegex = /[\s\S]*?define\(function\(\)/;
    var requiresRegex = /([\s\S]*?(define|defineSuite|require)\((?:{[\s\S]*}, )?\[)([\S\s]*?)]([\s\S]*?function\s*)\(([\S\s]*?)\) {([\s\S]*)/;
    var splitRegex = /,\s*/;
    var filesChecked = 0;

    var files = globby.sync(filesToSortRequires);
    async.forEach(files, function(file, callback) {
        if (filesChecked > 0 && filesChecked % 50 === 0) {
            console.log('Sorted requires in ' + filesChecked + ' files');
        }
        ++filesChecked;

        fs.readFile(file, function(err, contents) {
            if (err) {
                return callback(err);
            }

            var result = requiresRegex.exec(contents);

            if (result === null) {
                if (!noModulesRegex.test(contents)) {
                    console.log(file + ' does not have the expected syntax.');
                }
                return;
            }

            // In specs, the first require is significant,
            // unless the spec is given an explicit name.
            var preserveFirst = false;
            if (result[2] === 'defineSuite' && result[4] === ', function') {
                preserveFirst = true;
            }

            var names = result[3].split(splitRegex);
            if (names.length === 1 && names[0].trim() === '') {
                names.length = 0;
            }

            var i;
            for (i = 0; i < names.length; ++i) {
                if (names[i].indexOf('//') >= 0 || names[i].indexOf('/*') >= 0) {
                    console.log(file + ' contains comments in the require list.  Skipping so nothing gets broken.');
                    return;
                }
            }

            var identifiers = result[5].split(splitRegex);
            if (identifiers.length === 1 && identifiers[0].trim() === '') {
                identifiers.length = 0;
            }

            for (i = 0; i < identifiers.length; ++i) {
                if (identifiers[i].indexOf('//') >= 0 || identifiers[i].indexOf('/*') >= 0) {
                    console.log(file + ' contains comments in the require list.  Skipping so nothing gets broken.');
                    return;
                }
            }

            var requires = [];

            for (i = preserveFirst ? 1 : 0; i < names.length && i < identifiers.length; ++i) {
                requires.push({
                    name : names[i].trim(),
                    identifier : identifiers[i].trim()
                });
            }

            requires.sort(function(a, b) {
                var aName = a.name.toLowerCase();
                var bName = b.name.toLowerCase();
                if (aName < bName) {
                    return -1;
                } else if (aName > bName) {
                    return 1;
                } else {
                    return 0;
                }
            });

            if (preserveFirst) {
                requires.splice(0, 0, {
                    name : names[0].trim(),
                    identifier : identifiers[0].trim()
                });
            }

            // Convert back to separate lists for the names and identifiers, and add
            // any additional names or identifiers that don't have a corresponding pair.
            var sortedNames = requires.map(function(item) {
                return item.name;
            });
            for (i = sortedNames.length; i < names.length; ++i) {
                sortedNames.push(names[i].trim());
            }

            var sortedIdentifiers = requires.map(function(item) {
                return item.identifier;
            });
            for (i = sortedIdentifiers.length; i < identifiers.length; ++i) {
                sortedIdentifiers.push(identifiers[i].trim());
            }

            var outputNames = ']';
            if (sortedNames.length > 0) {
                outputNames = '\r\n        ' +
                              sortedNames.join(',\r\n        ') +
                              '\r\n    ]';
            }

            var outputIdentifiers = '(';
            if (sortedIdentifiers.length > 0) {
                outputIdentifiers = '(\r\n        ' +
                                    sortedIdentifiers.join(',\r\n        ');
            }

            contents = result[1] +
                       outputNames +
                       result[4].replace(/^[,\s]+/, ', ').trim() +
                       outputIdentifiers +
                       ') {' +
                       result[6];

            fs.writeFile(file, contents, callback);
        });
    }, done);
});

function combineJavaScriptCombineCesium(debug, minify, combineOutput) {
    var rjsPath = path.join('..', 'ThirdParty', 'requirejs-2.1.9', 'r.js');
    var rjsOptions = path.join('..', 'Tools', 'build.js');
    var relativeAlmondPath = path.join('..', 'ThirdParty', 'almond-0.2.6', 'almond.js');
    var relativeCombineOutputDirectory = path.join('..', combineOutput);
    debug = debug ? 'true' : 'false';
    child_process.execSync('node ' + rjsPath + ' -o ' + rjsOptions + ' pragmas.debug=' + debug +
                           ' optimize=' + minify + ' baseUrl=. skipModuleInsertion=true name=' + relativeAlmondPath +
                           ' include=main out=' + relativeCombineOutputDirectory + '/Cesium.js', {
        stdio : [process.stdin, process.stdout, process.stderr],
        cwd : 'Source'
    });
}

function combineJavaScriptCombineCesiumWorkers(debug, minify, combineOutput) {
    var rjsPath = path.join('ThirdParty', 'requirejs-2.1.9', 'r.js');
    var rjsOptions = path.join('Tools', 'build.js');
    debug = debug ? 'true' : 'false';

    var files = globby.sync(['Source/Workers/cesiumWorkerBootstrapper.js',
                             'Source/Workers/transferTypedArrayTest.js',
                             'Source/ThirdParty/Workers/*.js']);

    files.forEach(function(file) {
        var cmdLine = 'node ' + rjsPath + ' -o ' + rjsOptions + ' pragmas.debug=' + debug +
                      ' optimize=' + minify + ' baseUrl=. skipModuleInsertion=true wrap=false' +
                      ' include=' + file.slice(0, -3) + ' out=' + path.join(combineOutput, path.relative('Source', file));
        child_process.execSync(cmdLine, {
            stdio : [process.stdin, process.stdout, process.stderr]
        });
    });

    files = globby.sync(['Source/Workers/*.js',
                         '!Source/Workers/cesiumWorkerBootstrapper.js',
                         '!Source/Workers/transferTypedArrayTest.js',
                         '!Source/ThirdParty/Workers/*.js']);

    files.forEach(function(file) {
        var cmdLine = 'node ' + rjsPath + ' -o ' + rjsOptions + ' pragmas.debug=' + debug +
                      ' optimize=' + minify + ' baseUrl=.' +
                      ' include=' + file.slice(0, -3) + ' out=' + path.join(combineOutput, path.relative('Source', file));
        child_process.execSync(cmdLine, {
            stdio : [process.stdin, process.stdout, process.stderr]
        });
    });
}

function minifyCSS(outputDirectory) {
    var rjsPath = path.join('ThirdParty', 'requirejs-2.1.9', 'r.js');
    var rjsOptions = path.join('Tools', 'build.js');

    return gulp.src('Source/**/*.css',
        {
            base : 'Source',
            noDir : true
        })
        .pipe(gulp.dest(outputDirectory))
        .on('finish', function(err) {
                if (err) {
                    throw err;
                }

                var files = globby.sync(outputDirectory + '/**/*.css');
                files.forEach(function(file) {
                    var cmdLine = 'node ' + rjsPath + ' -o ' + rjsOptions + ' cssIn=' + file + ' out=' + file;
                    child_process.execSync(cmdLine, {
                        stdio : [process.stdin, process.stdout, process.stderr]
                    });
                });
            });
}

function combineJavaScript(options) {
    var optimizer = options.minify ? 'uglify2' : 'none';
    var outputDirectory = options.outputDirectory;
    var removePragmas = options.removePragmas;

    var combineOutput = path.join('Build', 'combineOutput', optimizer);
    var copyrightHeader = fs.readFileSync(path.join('Source', 'copyrightHeader.js'));
    combineJavaScriptCombineCesium(!removePragmas, optimizer, combineOutput);
    combineJavaScriptCombineCesiumWorkers(!removePragmas, optimizer, combineOutput);

    var streams = [];

    //copy to build folder with copyright header added at the top
    streams.push(gulp.src([combineOutput + '/**'])
                     .pipe(gulpInsert.prepend(copyrightHeader))
                     .pipe(gulp.dest(outputDirectory))
                     .on('finish', function(err) {
                             if (err) {
                                 throw err;
                             }
                             rimraf.sync(combineOutput);
                         }));

    var everythingElse = ['Source/**', '!**/*.js', '!**/*.glsl'];
    if (options.minify) {
        streams.push(minifyCSS(path.join('Build', 'Cesium')));
        everythingElse.push('!**/*.css');
    }

    streams.push(gulp.src(everythingElse, {nodir : true})
                     .pipe(gulp.dest(outputDirectory)));

    return eventStream.merge(streams);
}

function glslToJavaScript(minify, minifyStateFilePath) {
    fs.writeFileSync(minifyStateFilePath, minify);
    var minifyStateFileLastModified = fs.existsSync(minifyStateFilePath) ? fs.statSync(minifyStateFilePath).mtime.getTime() : 0;

// collect all currently existing JS files into a set, later we will remove the ones
// we still are using from the set, then delete any files remaining in the set.
    var leftOverJsFiles = {};

    globby.sync(['Source/Shaders/**/*.js']).forEach(function(file) {
        leftOverJsFiles[path.normalize(file)] = true;
    });

    var builtinFunctions = [];
    var builtinConstants = [];
    var builtinStructs = [];

    var glslFiles = globby.sync(['Source/Shaders/**/*.glsl']);
    glslFiles.forEach(function(glslFile) {
        glslFile = path.normalize(glslFile);
        var baseName = path.basename(glslFile, '.glsl');
        var jsFile = path.join(path.dirname(glslFile), baseName) + '.js';

        // identify built in functions, structs, and constants
        if (glslFile.indexOf(path.normalize(path.join('Source', 'Shaders', 'Builtin', 'Functions'))) === 0) {
            builtinFunctions.push(baseName);
        }
        else if (glslFile.indexOf(path.normalize(path.join('Source', 'Shaders', 'Builtin', 'Constants'))) === 0) {
            builtinConstants.push(baseName);
        }
        else if (glslFile.indexOf(path.normalize(path.join('Source', 'Shaders', 'Builtin', 'Structs'))) === 0) {
            builtinStructs.push(baseName);
        }

        delete leftOverJsFiles[jsFile];

        var jsFileExists = fs.existsSync(jsFile);
        var jsFileModified = jsFileExists ? fs.statSync(jsFile).mtime.getTime() : 0;
        var glslFileModified = fs.statSync(glslFile).mtime.getTime();

        if (jsFileExists && jsFileModified > glslFileModified && jsFileModified > minifyStateFileLastModified) {
            return;
        }

        var contents = fs.readFileSync(glslFile, 'utf8');
        contents = contents.replace(/\r\n/gm, '\n');

        var copyrightComments = '';
        var extractedCopyrightComments = contents.match(/\/\*\*(?:[^*\/]|\*(?!\/)|\n)*?@license(?:.|\n)*?\*\//gm);
        if (extractedCopyrightComments) {
            copyrightComments = extractedCopyrightComments.join('\n') + '\n';
        }

        if (minify) {
            contents = stripComments(contents);
            contents = contents.replace(/\s+$/gm, '').replace(/^\s+/gm, '').replace(/\n+/gm, '\n');
            contents += '\n';
        }

        contents = contents.split('"').join('\\"').replace(/\n/gm, '\\n\\\n');
        contents = copyrightComments + '\
    //This file is automatically rebuilt by the Cesium build process.\n\
    /*global define*/\n\
    define(function() {\n\
    "use strict";\n\
    return "' + contents + '";\n\
});';

        fs.writeFileSync(jsFile, contents);
    });

    // delete any left over JS files from old shaders
    Object.keys(leftOverJsFiles).forEach(rimraf.sync);

    var generateBuiltinContents = function(contents, builtins, path) {
        var amdPath = contents.amdPath;
        var amdClassName = contents.amdClassName;
        var builtinLookup = contents.builtinLookup;
        for (var i = 0; i < builtins.length; i++) {
            var builtin = builtins[i];
            amdPath = amdPath + ',\n        \'./' + path + '/' + builtin + '\'';
            amdClassName = amdClassName + ',\n        ' + 'czm_' + builtin;
            builtinLookup = builtinLookup + ',\n        ' + 'czm_' + builtin + ' : ' + 'czm_' + builtin;
        }
        contents.amdPath = amdPath;
        contents.amdClassName = amdClassName;
        contents.builtinLookup = builtinLookup;
    };

//generate the JS file for Built-in GLSL Functions, Structs, and Constants
    var contents = {amdPath : '', amdClassName : '', builtinLookup : ''};
    generateBuiltinContents(contents, builtinConstants, 'Constants');
    generateBuiltinContents(contents, builtinStructs, 'Structs');
    generateBuiltinContents(contents, builtinFunctions, 'Functions');

    contents.amdPath = contents.amdPath.replace(',\n', '');
    contents.amdClassName = contents.amdClassName.replace(',\n', '');
    contents.builtinLookup = contents.builtinLookup.replace(',\n', '');

    var fileContents = '\
//This file is automatically rebuilt by the Cesium build process.\n\
/*global define*/\n\
define([\n' +
                       contents.amdPath +
                       '\n    ], function(\n' +
                       contents.amdClassName +
                       ') {\n\
                           "use strict";\n\
                           return {\n' + contents.builtinLookup + '};\n\
});';

    fs.writeFileSync(path.join('Source', 'Shaders', 'Builtin', 'CzmBuiltins.js'), fileContents);
}

function createCesiumJs() {
    var moduleIds = [];
    var parameters = [];
    var assignments = [];

    var nonIdentifierRegexp = /[^0-9a-zA-Z_$]/g;

    globby.sync(sourceFiles).forEach(function(file) {
        file = path.relative('Source', file);
        var moduleId = path.normalize(file);
        moduleId = moduleId.substring(0, moduleId.lastIndexOf('.'));

        var baseName = path.basename(file);
        var assignmentName = baseName.substring(0, baseName.lastIndexOf('.'));
        assignmentName = "['" + assignmentName + "']";
        if (moduleId.indexOf(path.normalize('Source\\Shaders\\')) === 0) {
            assignmentName = '._shaders' + assignmentName;
        }

        var parameterName = moduleId.replace(nonIdentifierRegexp, '_');

        moduleIds.push("'./" + moduleId.replace(/\\/g, '/') + "'");
        parameters.push(parameterName);
        assignments.push('Cesium' + assignmentName + ' = ' + parameterName + ';');
    });

    var version = packageJson.version;

    var contents = '\
/*global define*/\n\
define([' + moduleIds.join(', ') + '], function(' + parameters.join(', ') + ') {\n\
  "use strict";\n\
  /*jshint sub:true*/\n\
  var Cesium = {\n\
    VERSION : "' + version + '",\n\
    _shaders : {}\n\
  };\n\
  ' + assignments.join('\n  ') + '\n\
  return Cesium;\n\
});';

    fs.writeFileSync('Source/Cesium.js', contents);
}

function createSpecList() {
    var specFiles = globby.sync(['Specs/**/*.js', '!Specs/*.js']);
    var specs = [];

    specFiles.forEach(function(file) {
        var spec = file.substring(0, file.lastIndexOf('.')).replace('\\', '/');
        specs.push("'" + spec + "'");
    });

    var contents = 'var specs = [' + specs.join(',') + '];';
    fs.writeFileSync(path.join('Specs', 'SpecList.js'), contents);
}

function createGalleryList() {
    var demos = [];
    var output = path.join('Apps', 'Sandcastle', 'gallery', 'gallery-index.js');

    var fileList = ['Apps/Sandcastle/gallery/**/*.html'];
    if (noDevelopmentGallery) {
        fileList.push('!Apps/Sandcastle/gallery/development/**/*.html');
    }

    globby.sync(fileList).forEach(function(file) {
        var demo = file.substring(24, file.lastIndexOf('.')).replace('\\', '/');
        var demoObject = {
            name : String(demo),
            date : fs.statSync(file).mtime.getTime()
        };

        if (fs.existsSync(file.replace('.html', '') + '.jpg')) {
            demoObject.img = demo + '.jpg';
        }

        demos.push(JSON.stringify(demoObject, null, 2));
    });

    var contents = '\
// This file is automatically rebuilt by the Cesium build process.\n\
var gallery_demos = [' + demos.join(', ') + '];';

    fs.writeFileSync(output, contents);
}

function createSandcastleJsHintOptions() {
    var jsHintOptions = JSON.parse(fs.readFileSync('.jshintrc', 'utf8'));
    jsHintOptions.predef = ['JSON', 'require', 'console', 'Sandcastle', 'Cesium'];

    var contents = JSON.stringify(jsHintOptions, null, 2);
    fs.writeFile(path.join('Apps', 'Sandcastle', '.jshintrc'), contents);

    contents = '\
// This file is automatically rebuilt by the Cesium build process.\n\
var sandcastleJsHintOptions = ' + contents + ';';
    fs.writeFile(path.join('Apps', 'Sandcastle', 'jsHintOptions.js'), contents);
}

function buildCesiumViewer() {
    var cesiumViewerOutputDirectory = 'Build/Apps/CesiumViewer';
    var cesiumViewerStartup = path.join(cesiumViewerOutputDirectory, 'CesiumViewerStartup.js');
    mkdirp.sync(cesiumViewerOutputDirectory);

    var rjsPath = path.join('ThirdParty', 'requirejs-2.1.9', 'r.js');
    var rjsOptions = path.join('Tools', 'build.js');

    //mainConfigFile must be relative to the build.js file
    var cmdLine = 'node ' + rjsPath + ' -o ' + rjsOptions + ' pragmas.debug=false' +
                  ' optimize=uglify2 mainConfigFile=../Apps/CesiumViewer/CesiumViewerStartup.js' +
                  ' name=CesiumViewerStartup out=' + cesiumViewerStartup;
    child_process.execSync(cmdLine, {
        stdio : [process.stdin, process.stdout, process.stderr]
    });

    var cesiumViewerCss = path.join(cesiumViewerOutputDirectory, 'CesiumViewer.css');
    cmdLine = 'node ' + rjsPath + ' -o ' + rjsOptions + ' cssIn=Apps/CesiumViewer/CesiumViewer.css out=' + cesiumViewerCss;
    child_process.execSync(cmdLine, {
        stdio : [process.stdin, process.stdout, process.stderr]
    });

    //add copyright header
    var copyrightHeader = fs.readFileSync(path.join('Source', 'copyrightHeader.js'));

    return eventStream.merge(
        gulp.src(cesiumViewerStartup)
            .pipe(gulpInsert.prepend(copyrightHeader))
            .pipe(gulpReplace('../../Source', '.'))
            .pipe(gulpReplace('../../ThirdParty/requirejs-2.1.9', '.'))
            .pipe(gulp.dest(cesiumViewerOutputDirectory)),

        gulp.src(['Apps/CesiumViewer/**',
                  '!Apps/CesiumViewer/**/*.js',
                  '!Apps/CesiumViewer/**/*.css'])
            .pipe(gulpReplace('../../Source', '.'))
            .pipe(gulpReplace('../../ThirdParty/requirejs-2.1.9', '.'))
            .pipe(gulp.dest(cesiumViewerOutputDirectory)),

        gulp.src(['ThirdParty/requirejs-2.1.9/require.min.js'])
            .pipe(gulpRename('require.js'))
            .pipe(gulp.dest(cesiumViewerOutputDirectory)),

        gulp.src(['Build/Cesium/Assets/**',
                  'Build/Cesium/Workers/**',
                  'Build/Cesium/ThirdParty/Workers/**',
                  'Build/Cesium/Widgets/**',
                  '!Build/Cesium/Widgets/**/*.css'],
            {
                base : 'Build/Cesium',
                nodir : true
            })
            .pipe(gulpReplace('../../Source', '.'))
            .pipe(gulpReplace('../../ThirdParty/requirejs-2.1.9', '.'))
            .pipe(gulp.dest(cesiumViewerOutputDirectory)),

        gulp.src(['Build/Cesium/Widgets/InfoBox/InfoBoxDescription.css'],
            {
                base : 'Build/Cesium'
            })
            .pipe(gulpReplace('../../Source', '.'))
            .pipe(gulpReplace('../../ThirdParty/requirejs-2.1.9', '.'))
            .pipe(gulp.dest(cesiumViewerOutputDirectory)),

        gulp.src(['web.config'])
            .pipe(gulp.dest(cesiumViewerOutputDirectory))
    );
}