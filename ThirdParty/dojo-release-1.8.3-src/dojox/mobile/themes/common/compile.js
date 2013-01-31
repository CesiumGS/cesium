// load libraries
var fs = require("fs");
var path = require("path");
var less = require("less");

// collect files
var folders = ["../android", "../android/dijit",
               "../blackberry", "../blackberry/dijit",
			   "../custom", "../custom/dijit",
               "../iphone", "../iphone/dijit"];
var files = [];
folders.forEach(function(folder){
	files = files.concat(fs.readdirSync(folder).map(function(file){
		return folder + "/" + file;
	}));
});
files = files.filter(function(file){
	return file && /\.less$/.test(file) && !/variables\.less$/.test(file);
});

// compile files
files.forEach(function(file){
	console.log("compiling " + file);
	fs.readFile(file, "utf-8", function(error, data){
		if(error){
			console.error(error.message);
			process.exit(1);
		}
		var parser = new(less.Parser)({paths: [path.dirname(file)], filename: file, optimization: 1});
		parser.parse(data, function(error, tree){
			if(error){
				less.writeError(error);
				process.exit(1);
			}
			try{
				var css = tree.toCSS({compress: false});
				var fd = fs.openSync(file.replace(".less", ".css"), "w");
				fs.writeSync(fd, css.replace(/\n/g, "\r\n"), 0, "utf-8");
			}catch(error){
				less.writeError(error);
				process.exit(2);
			}
		});
	});
});
