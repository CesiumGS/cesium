/*global importClass,project,attributes,elements,java,Packages*/
importClass(Packages.org.mozilla.javascript.tools.shell.Main); /*global Main*/
Main.exec(['-e', '{}']);
var load = Main.global.load;

load(project.getProperty('tasksDirectory') + '/shared.js'); /*global forEachFile,readFileContents,writeFileContents,File,FileReader,FileWriter,FileUtils*/

var specs = [];

forEachFile('specs', function(relativePath, file) {
    "use strict";

    var spec = relativePath.substring(0, relativePath.lastIndexOf('.')).replace('\\', '/');
    specs.push("'Specs/" + spec + "'");
});

var contents = 'var specs = [' + specs.join(',') + '];';

writeFileContents(attributes.get('output'), contents);
