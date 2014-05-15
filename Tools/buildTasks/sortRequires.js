/*global self,importClass,project,attributes,elements,java,Packages*/
importClass(Packages.org.mozilla.javascript.tools.shell.Main); /*global Main*/
Main.exec(['-e', '{}']);
var load = Main.global.load;

load(project.getProperty('tasksDirectory') + '/shared.js'); /*global forEachFile,readFileContents,writeFileContents,loadJsHintOptionsFile,File,FileReader,FileWriter,FileUtils*/

/*global window:true*/
var window = window || {};

var jsFileRegex = /\.js$/i;
var noModulesRegex = /[\s\S]*?define\(function\(\)/;
var requiresRegex = /([\s\S]*?(define|defineSuite|require)\((?:{[\s\S]*}, )?\[)([\S\s]*?)\]([\s\S]*?function\s*)\(([\S\s]*?)\) {([\s\S]*)/;
var splitRegex = /,\s*/;

var filesChecked = 0;
forEachFile('sourcefiles', function(relativePath, file) {
    "use strict";

    if (!jsFileRegex.test(relativePath)) {
        return;
    }

    if (filesChecked > 0 && filesChecked % 50 === 0) {
        self.log('Sorted requires in ' + filesChecked + ' files');
    }
    ++filesChecked;

    var contents = readFileContents(file);
    var result = requiresRegex.exec(contents);
    if (result === null) {
        if(!noModulesRegex.test(contents)){
            self.log(relativePath + ' does not have the expected syntax.');
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
            self.log(relativePath + ' contains comments in the require list.  Skipping so nothing gets broken.');
            return;
        }
    }

    var identifiers = result[5].split(splitRegex);
    if (identifiers.length === 1 && identifiers[0].trim() === '') {
        identifiers.length = 0;
    }

    for (i = 0; i < identifiers.length; ++i) {
        if (identifiers[i].indexOf('//') >= 0 || identifiers[i].indexOf('/*') >= 0) {
            self.log(relativePath + ' contains comments in the require list.  Skipping so nothing gets broken.');
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
    var sortedNames = requires.map(function(item) { return item.name; });
    for (i = sortedNames.length; i < names.length; ++i) {
        sortedNames.push(names[i].trim());
    }

    var sortedIdentifiers = requires.map(function(item) { return item.identifier; });
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

    writeFileContents(file, contents);
});
