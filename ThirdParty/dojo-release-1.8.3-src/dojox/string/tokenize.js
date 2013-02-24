define([
	"dojo/_base/lang",
	"dojo/_base/sniff"	
], function(lang, has){
	var tokenize = lang.getObject("dojox.string", true).tokenize;

	tokenize = function(/*String*/ str, /*RegExp*/ re, /*Function?*/ parseDelim, /*Object?*/ instance){
		// summary:
		//		Split a string by a regular expression with the ability to capture the delimeters
		// parseDelim:
		//		Each group (excluding the 0 group) is passed as a parameter. If the function returns
		//		a value, it's added to the list of tokens.
		// instance:
		//		Used as the "this" instance when calling parseDelim
		var tokens = [];
		var match, content, lastIndex = 0;
		while(match = re.exec(str)){
			content = str.slice(lastIndex, re.lastIndex - match[0].length);
			if(content.length){
				tokens.push(content);
			}
			if(parseDelim){
				if(has("opera")){
					var copy = match.slice(0);
					while(copy.length < match.length){
						copy.push(null);
					}
					match = copy;
				}
				var parsed = parseDelim.apply(instance, match.slice(1).concat(tokens.length));
				if(typeof parsed != "undefined"){
					tokens.push(parsed);
				}
			}
			lastIndex = re.lastIndex;
		}
		content = str.slice(lastIndex);
		if(content.length){
			tokens.push(content);
		}
		return tokens;
	};
	return tokenize;
});
