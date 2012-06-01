exports.readFileSync = function(filename, encoding) {
    encoding = encoding || 'utf-8';

    return readFile(filename, encoding);
};

var readdirSync = exports.readdirSync = function(path) {
    var dir,
        files;

    dir = new java.io.File(path);
    if (!dir.directory) { return [String(dir)]; }

    files = dir.list();

    //Convert files to Javascript strings so they play nice with node modules
    files = files.map(function(fileName) {
        return String(fileName);
    });

    return files;
};

var ls = exports.ls = function(dir, recurse, _allFiles, _path) {
    var files,
        file;

    if (typeof _path === 'undefined') { // initially
        _allFiles = [];
        _path = [dir];
    }

    if (_path.length === 0) { return _allFiles; }
    if (typeof recurse === 'undefined') { recurse = 1; }

    if ( stat(dir).isFile(dir) ) {
        files = [dir];
    }
    else {
        files = readdirSync(dir);
    }

    for (var f = 0, lenf = files.length; f < lenf; f++) {
        file = String(files[f]);

        if (file.match(/^\.[^\.\/\\]/)) { continue; } // skip dot files

        if ((new java.io.File(_path.join('/') + '/' + file)).list()) { // it's a directory
            _path.push(file);

            if (_path.length - 1 < recurse) {
                ls(_path.join('/'), recurse, _allFiles, _path);
            }
            _path.pop();
        }
        else { // it's a file
            _allFiles.push(
                (_path.join('/') + '/' + file).replace(/[\/\\]+/g, '/')
            );
        }
    }

    return _allFiles;
};

var stat = exports.stat = exports.statSync = function(path, encoding) {
    var f = new java.io.File(path);
    return {
        isFile: function() {
            return f.isFile();
        },
        isDirectory: function() {
            return f.isDirectory();
        }
    };

};

exports.mkPath = function(/**Array*/ path) {
    if (path.constructor != Array){path = path.split(/[\\\/]/);}
    var make = "";
    for (var i = 0, l = path.length; i < l; i++) {
        make += path[i] + '/';
        if (! exists(make)) {
            makeDir(make);
        }
    }
};

function makeDir(/**string*/ path) {
    var dirPath = toDir(path);
    (new java.io.File(dirPath)).mkdir();
}

function exists(path) {
    var f = new java.io.File(path);

    if (f.isDirectory()){
        return true;
    }
    if (!f.exists()){
        return false;
    }
    if (!f.canRead()){
        return false;
    }
    return true;
}

var toDir = exports.toDir = function(path) {
    var f = new java.io.File(path);

    if (f.isDirectory()){
       return path;
    }

    var parts = path.split(/[\\\/]/);
    parts.pop();

    return parts.join('/');
};

exports.copyFile = function(inFile, outDir, fileName) {
    if (fileName == null){fileName = toFile(inFile);}

    outDir = toDir(outDir);

    var inFile = new java.io.File(inFile);
    var outFile = new java.io.File(outDir+'/'+fileName);

    var bis = new Packages.java.io.BufferedInputStream(new Packages.java.io.FileInputStream(inFile), 4096);
    var bos = new Packages.java.io.BufferedOutputStream(new Packages.java.io.FileOutputStream(outFile), 4096);
    var theChar;
    while ((theChar = bis.read()) != -1) {
        bos.write(theChar);
    }
    bos.close();
    bis.close();
};

var toFile = exports.toFile = function(path) {
    var parts = path.split(/[\\\/]/);
    return parts.pop();
};

exports.writeFileSync = function(filename, data, encoding) {
    encoding = encoding || 'utf-8';

    var out = new Packages.java.io.PrintWriter(
        new Packages.java.io.OutputStreamWriter(
            new Packages.java.io.FileOutputStream(filename),
            encoding
        )
    );

    try {
        out.write(data);
    }
    finally {
        out.flush();
        out.close();
    }
};
