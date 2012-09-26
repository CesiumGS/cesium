/*global importClass,project,attributes,elements,java,Packages*/
/*jshint multistr:true*/
importClass(java.io.File); /*global File*/
importClass(java.io.FileReader); /*global FileReader*/
importClass(java.io.FileWriter); /*global FileWriter*/
importClass(Packages.org.apache.tools.ant.util.FileUtils); /*global FileUtils*/

var demos = [];

var demoFilesets = elements.get('demos');
for ( var i = 0, len = demoFilesets.size(); i < len; ++i) {
    var demoFileset = demoFilesets.get(i);
    var basedir = demoFileset.getDir(project);
    var demoFilenames = demoFileset.getDirectoryScanner(project).getIncludedFiles();

    for ( var j = 0, len2 = demoFilenames.length; j < len2; ++j) {
        var relativePath = demoFilenames[j];
        var demo = relativePath.substring(0, relativePath.lastIndexOf('.')).replace('\\', '/');
        var thumbnail = '';
        if (new File(basedir, demo + '.jpg').exists()) {
            thumbnail = "'img' : '" + demo + ".jpg',";
        }
        var fileDate = new File(basedir, demo + '.html').lastModified().toString();
        var demoContent = "\
  {\n\
    'name' : '" + demo + "',\n\
    " + thumbnail + "\n\
    'date' : " + fileDate + '\n\
  }';
        demos.push(demoContent);
    }
}

var output = attributes.get("output");
if (new File(output).exists()) {
    var reader = new FileReader(output);
    var oldContents = String(FileUtils.readFully(reader));
    reader.close();
}

var contents = '\
// This file is automatically rebuilt by the Cesium build process.\n\
var gallery_demos = [\n\
' + demos.join(',\n') + '\n\
];';

if (oldContents !== contents) {
    var writer = new FileWriter(output);
    writer.write(contents);
    writer.close();
}