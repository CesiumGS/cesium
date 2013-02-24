define([
	"../buildControl",
	"../fileUtils",	
	"../fs",
	"../replace"
], function(bc, fileUtils, fs, replace){
	var
		getFiletype = fileUtils.getFiletype,

		encodingMap=
			// map from file type to encoding
			(bc.transformConfig.read && bc.transformConfig.read.encoding) || {
				css:"utf8",
				html:"utf8",
				htm:"utf8",
				js:"utf8",
				json:"utf8",
				asc:"utf8",
				c:"utf8",
				cpp:"utf8",
				log:"utf8",
				conf:"utf8",
				text:"utf8",
				txt:"utf8",
				dtd:"utf8",
				xml:"utf8",
				png:undefined,
				jpg:undefined,
				jpeg:undefined,
				gif:undefined
			};

	return function(resource, callback){
		resource.getText = function(){
			if(!this.replacementsApplied){
				this.replacementsApplied = true;
				if(bc.replacements[this.src]){
					this.text = replace(this.text, bc.replacements[this.src]);
				}
			}
			return this.text;
		};

		resource.setText = function(text){
			resource.text = text;
			resource.getText = function(){ return this.text; };
			return text;
		};

		var filetype = getFiletype(resource.src, 1);
		// the expression is a little odd since undefined is a legitimate encodingMap value
		resource.encoding = resource.encoding ||(!(filetype in encodingMap) && "utf8") || encodingMap[filetype];
		fs.readFile(resource.src, resource.encoding, function(err, data){
			if(!err){
				resource.text = data;
			}
			callback(resource, err);
		});
		return callback;
	};
});
