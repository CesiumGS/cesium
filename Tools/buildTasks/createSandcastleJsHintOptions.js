/*global importClass,project,attributes,elements,java,Packages*/
/*jshint strict:false,multistr:true,evil:true*/

importClass(Packages.org.mozilla.javascript.tools.shell.Main); /*global Main*/
Main.exec(['-e', '{}']);
var load = Main.global.load;

load(project.getProperty('tasksDirectory') + '/shared.js'); /*global forEachFile,readFileContents,writeFileContents,File,FileReader,FileWriter,FileUtils*/

var jsHintOptions = eval('({' + attributes.get('jshintoptions') + '})');
jsHintOptions.predef = ['require', 'console', 'Sandcastle', 'Cesium'];

var contents = '\
// This file is automatically rebuilt by the Cesium build process.\n\
var sandcastleJsHintOptions = ' + JSON.stringify(jsHintOptions, null, 2) + ';';

writeFileContents(attributes.get('output'), contents);
