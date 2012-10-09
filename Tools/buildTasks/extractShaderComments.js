/*global importClass,project,attributes,elements,java,Packages*/
/*jshint multistr:true*/
importClass(java.io.File); /*global File*/
importClass(java.io.FileReader); /*global FileReader*/
importClass(java.io.FileWriter); /*global FileWriter*/
importClass(Packages.org.apache.tools.ant.util.FileUtils); /*global FileUtils*/

var glslFilesets = elements.get('glslfiles');
for ( var i = 0, len = glslFilesets.size(); i < len; ++i) {
    var glslFileset = glslFilesets.get(i);
    var basedir = glslFileset.getDir(project);
    var glslFilenames = glslFileset.getDirectoryScanner(project).getIncludedFiles();

    var glslDocComments = '';

    for ( var j = 0; j < glslFilenames.length; j++) {
        var glslFilename = glslFilenames[j];

        var glslFile = new File(basedir, glslFilename);
        var reader = new FileReader(glslFile);
        var contents = String(FileUtils.readFully(reader));
        reader.close();

        contents = contents.replace(/\r\n/gm, '\n');

        var docComments = contents.match(/\/\*\*[\s\S]*?\*\//gm);
        if (docComments) {
            glslDocComments += docComments.join('\n') + '\n';
        }
    }

    var glslDocFile = new File(basedir, 'glslComments.js');
    var glslDocWriter = new FileWriter(glslDocFile);
    glslDocWriter.write(glslDocComments);
    glslDocWriter.close();
}