/*global importClass,project,attributes,elements,java,Packages*/
importClass(Packages.org.mozilla.javascript.tools.shell.Main); /*global Main*/
Main.exec(['-e', '{}']);
var load = Main.global.load;

load(project.getProperty('tasksDirectory') + '/shared.js'); /*global forEachFile,readFileContents,writeFileContents,loadJsHintOptionsFile,File,FileReader,FileWriter,FileUtils*/

var jsHintOptions = loadJsHintOptionsFile(attributes.get('jshintoptionspath'));

jsHintOptions.predef = ['require', 'console', 'Sandcastle', 'Cesium'];

var contents = '\
// This file is automatically rebuilt by the Cesium build process.\n\
var sandcastleJsHintOptions = ' + JSON.stringify(jsHintOptions, null, 2) + ';';

writeFileContents(attributes.get('output'), contents);
