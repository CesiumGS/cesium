/*global self,importClass,project,attributes,elements,java,Packages*/
importClass(Packages.org.mozilla.javascript.tools.shell.Main); /*global Main*/
Main.exec(['-e', '{}']);
var load = Main.global.load;

load(project.getProperty('tasksDirectory') + '/shared.js'); /*global forEachFile,readFileContents,writeFileContents,loadJsHintOptionsFile,File,FileReader,FileWriter,FileUtils*/

/*global window:true*/
var window = window || {};

load(attributes.get('jshintpath')); /*global JSHINT*/

var jsHintOptions = loadJsHintOptionsFile(attributes.get('jshintoptionspath'));

load(attributes.get('sandcastlejshintoptionspath')); /*global sandcastleJsHintOptions*/

var errors = [];

var jsFileRegex = /\.js$/i;
var htmlFileRegex = /\.html$/i;

var filesChecked = 0;
forEachFile('sourcefiles', function(relativePath, file) {
    "use strict";

    if (filesChecked > 0 && filesChecked % 50 === 0) {
        self.log('Checked ' + filesChecked + ' files');
    }
    ++filesChecked;

    var contents = readFileContents(file);

    var source;
    var options;
    if (jsFileRegex.test(relativePath)) {
        source = contents;
        options = jsHintOptions;
    } else if (htmlFileRegex.test(relativePath)) {
        var sandcastleScriptRegex = /<script id="cesium_sandcastle_script">([\S\s]*?)<\/script>/img;
        var result = sandcastleScriptRegex.exec(contents);
        if (result === null) {
            return;
        }
        source = result[1];
        options = sandcastleJsHintOptions;
    } else {
        self.log('Unhandled file type: ' + relativePath);
        return;
    }

    // make a copy of the options, JSHint modifies the object it's given
    options = JSON.parse(JSON.stringify(options));

    if (!JSHINT(source, options)) {
        JSHINT.errors.forEach(function(error) {
            if (error) {
                errors.push(relativePath + ': line ' + error.line + ', col ' + error.character + ', ' + error.reason);
            }
        });
    }
});

if (errors.length > 0) {
    self.log('Errors:\n' + errors.join('\n'));
    project.setProperty(attributes.get("failureproperty"), "true");
} else {
    self.log('No errors!');
}