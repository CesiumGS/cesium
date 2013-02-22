/*global importClass,project,attributes,elements,java,Packages*/
/*jshint multistr:true,evil:true*/
importClass(java.io.File); /*global File*/
importClass(java.io.FileReader); /*global FileReader*/
importClass(java.io.FileWriter); /*global FileWriter*/
importClass(Packages.org.apache.tools.ant.util.FileUtils); /*global FileUtils*/

var jsHintOptions = eval('({' + attributes.get('jshintoptions') + '})');
jsHintOptions.predef = ['require', 'console', 'Sandcastle', 'Cesium'];

var output = attributes.get("output");
if (new File(output).exists()) {
    var reader = new FileReader(output);
    var oldContents = String(FileUtils.readFully(reader));
    reader.close();
}

var contents = '\
// This file is automatically rebuilt by the Cesium build process.\n\
var sandcastleJsHintOptions = ' + JSON.stringify(jsHintOptions, null, 2) + ';';

if (oldContents !== contents) {
    var writer = new FileWriter(output);
    writer.write(contents);
    writer.close();
}