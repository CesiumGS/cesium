define(["../library/greek"], function(greeks){
// summary:
//		Singleton used for converting characters and typsetting.  Required by _base.
// description:
//		Eventually, this is supposed to turn input strings of mathematical
//		expressions into typeset expressions that can be displayed on the
//		canvas.  For now, we just generate Greek letters based on LaTeX style
//		entity codes.

	
	//dojox.drawing.util.typeset = 
	return {

		convertHTML: function(inText){
			if(inText){
				return inText.replace(/&([^;]+);/g,function(match,code){
					if(code.charAt(0)=='#'){
						//coerce remainder of string to int
						var number=+code.substr(1);
						if(!isNaN(number)){
							return String.fromCharCode(number);
						}
					}else if(greeks[code]){
						return String.fromCharCode(greeks[code]);
					}
					// This is generally for server code, so there
					// is no point bothering the user in the case of an error.
					console.warn("no HTML conversion for ",match);
					return match;
				});
			}
			return inText;
		},

		convertLaTeX: function(inText){
			// console.log("***** convertLaTeX for ",inText);
			if(inText){
				return inText.replace(/\\([a-zA-Z]+)/g,function(match,word){
					if(greeks[word]){
						return String.fromCharCode(greeks[word]);
					}else if(word.substr(0,2)=="mu"){
						// special handling for \mu since it is
						// a unit prefix for micro.
						return String.fromCharCode(greeks["mu"])+word.substr(2);
					}else if(word.substr(0,5)=="theta"){
						// special handling for \theta since it is
						// a standard prefix for angle associated with a vector.
						return String.fromCharCode(greeks["theta"])+word.substr(5);
					}else if(word.substr(0,3)=="phi"){
						// special handling for \phi since it is
						// a standard prefix for angle associated with a z-axis vector.
						return String.fromCharCode(greeks["phi"])+word.substr(3);
					}
					console.log("no match for ",match," in ",inText);
					console.log("Need user-friendly error handling here!");
				}).replace(/\\\\/g,'\\');
			}
			return inText;
		}

	};

});
