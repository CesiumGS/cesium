/*global importClass,project,attributes,elements,java,Packages*/
importClass(Packages.org.mozilla.javascript.tools.shell.Main); /*global Main*/
Main.exec(['-e', '{}']);
var load = Main.global.load;

load(project.getProperty('tasksDirectory') + '/shared.js'); /*global forEachFile,readFileContents,writeFileContents,File,FileReader,FileWriter,FileUtils*/

var glslDocComments = [];
forEachFile('glslfiles', function(relativePath, file) {
    "use strict";

    var contents = readFileContents(file);
    contents = contents.replace(/\r\n/gm, '\n');

    var docComments = contents.match(/\/\*\*[\s\S]*?\*\//gm);
    if (docComments) {
        glslDocComments.push(docComments.join('\n'));
    }
});

writeFileContents(attributes.get('output'), glslDocComments.join('\n'));
