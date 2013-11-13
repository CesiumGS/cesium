/*global importClass,project,attributes,elements,java,Packages*/
importClass(Packages.org.mozilla.javascript.tools.shell.Main); /*global Main*/
Main.exec(['-e', '{}']);
var load = Main.global.load;

load(project.getProperty('tasksDirectory') + '/shared.js'); /*global forEachFile,readFileContents,writeFileContents,File,FileReader,FileWriter,FileUtils*/

var search = attributes.get('search');
var modifiers = attributes.get('modifiers');
var replace = attributes.get('replace');

var regex = new RegExp(search, modifiers);

forEachFile('sourcefiles', function(relativePath, file) {
    "use strict";

    var contents = readFileContents(file);
    var newContents = contents.replace(regex, replace);

    if (contents !== newContents) {
        writeFileContents(file.getAbsolutePath(), newContents, true);
    }
});