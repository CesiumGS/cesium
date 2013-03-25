/*global self,importClass,project,attributes,elements,java,Packages*/
importClass(Packages.org.mozilla.javascript.tools.shell.Main); /*global Main*/
Main.exec(['-e', '{}']);
var load = Main.global.load;

load(project.getProperty('tasksDirectory') + '/shared.js'); /*global forEachFile,readFileContents,writeFileContents,File,FileReader,FileWriter,FileUtils*/

var jsHintPath = attributes.get('jshintpath');
load(jsHintPath); /*global JSHINT*/

function loadJsHintOptions() {
    "use strict";
    /*jshint evil:true*/
    return eval('({' + attributes.get('jshintoptions') + '})');
}

var jsHintOptions = loadJsHintOptions();

var sandcastleJsHintOptionsPath = attributes.get('sandcastlejshintoptionspath');
load(sandcastleJsHintOptionsPath);/*global sandcastleJsHintOptions*/

var errors = [];

var jsFileRegex = /\.js$/i;
var htmlFileRegex = /\.html$/i;
var sandcastleScriptRegex = /<script id="cesium_sandcastle_script">([\S\s]*?)<\/script>/img;

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