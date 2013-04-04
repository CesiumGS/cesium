/*global importClass,project,attributes,elements,java,Packages*/
importClass(Packages.org.mozilla.javascript.tools.shell.Main); /*global Main*/
Main.exec(['-e', '{}']);
var load = Main.global.load;

load(project.getProperty('tasksDirectory') + '/shared.js'); /*global forEachFile,readFileContents,writeFileContents,File,FileReader,FileWriter,FileUtils*/

var demos = [];

forEachFile('demos', function(relativePath, file) {
    "use strict";

    var demo = relativePath.substring(0, relativePath.lastIndexOf('.')).replace('\\', '/');
    var demoObject = {
        name : String(demo),
        date : file.lastModified()
    };

    if (new File(file.getParent(), demo + '.jpg').exists()) {
        demoObject.img = demo + '.jpg';
    }

    demos.push(JSON.stringify(demoObject, null, 2));
});

var contents = '\
// This file is automatically rebuilt by the Cesium build process.\n\
var gallery_demos = [' + demos.join(', ') + '];';

writeFileContents(attributes.get('output'), contents);
