checkstyleUtil = {
	errors: [],
	
	commentNames: ["summary", "description", "example", "tags", "this"]
};

checkstyleUtil.applyRules = function(fileName, contents){
	// Do not process JSON files
	if(contents.charAt(0) == "{"){
		return;
	}
	
	// Mark all the characters that are in comments.
	var comments = checkstyleUtil.getComments(contents);
	
	// Apply all the rules to the file
	for(var ruleName in checkstyleUtil.rules){
		checkstyleUtil.rules[ruleName](fileName, contents, comments);
	}
};

// Calculate the characters in a file that are in comment fields
// These will be ignored by the checkstyle rules.
checkstyleUtil.getComments = function(contents){
	var comments = [];
	
	var i;
	
	// Initialize the array to false values.
	for(i = 0; i < contents.length; i++){
		comments[i] = 0;
	}
	
	var sep = "\n";
	
	function markRange(start, stop){
		for(var i = start; i < stop; i++){
			comments[i] = 1;
		}
	}


	function markRegexs() {
		var idx = contents.indexOf("/g");
		var i;
		while(idx > -1) {
			if(!comments[idx] && contents.charAt(idx - 1) != "*"){
				// Look back until either a forward slash
				// or a new line is found
				var prevChar = contents.charAt(idx - 1);
				i = idx;
				while(prevChar != "\n" && prevChar != "/" && i > 0){
					prevChar = contents.charAt(--i);
				}
				if(prevChar == "/" && i < idx - 1){
					markRange(i, idx);
				}
			}
			idx = contents.indexOf("/g", idx + 2)
		}
		
		// Now mark all .match and .replace function calls
		// They generally contain regular expressions, and are just too bloody difficult.
		var fnNames = ["match", "replace"];
		var name;
		
		for (i = 0; i < fnNames.length; i++){
			name = fnNames[i];
			
			idx = contents.indexOf(name + "(");
			
			while(idx > -1){
				// Find the end parenthesis
				if(comments[idx]){
					idx = contents.indexOf(name + "(", idx + name.length);
				} else {
					var fnEnd = contents.indexOf(")", idx);
					markRange(idx, fnEnd + 1);
				}
			}
		}
		
		// Now look for all the lines that declare a regex variable, e.g.
		// var begRegExp = /^,|^NOT |^AND |^OR |^\(|^\)|^!|^&&|^\|\|/i;
		
		idx = contents.indexOf(" = /");
		
		while(idx > -1){
			if(!comments[idx] && contents.charAt(idx + 4) != "*"){
				var eol = contents.indexOf("\n", idx + 1);
				markRange(idx + 3, Math.max(eol, idx + 4));
			}
		
			idx = contents.indexOf(" = /", idx + 3);
		}
	}

	markRegexs();
	
	
	var marker = null;
	var ch;
	
	var DOUBLE_QUOTE = 1;
	var SINGLE_QUOTE = 2;
	var LINE_COMMENT = 3;
	var MULTI_COMMENT = 4;
	var UNMARK = 5;
	
	var pos;
	
	for (i = 0; i < contents.length; i++) {
		var skip = false;
		
		if(comments[i]){
			continue;
		}
		
		ch = contents[i];
		
		switch(ch){
			case "\"":
				if(marker == DOUBLE_QUOTE) {
					marker = UNMARK;
				} else if (marker == null) {
					marker = DOUBLE_QUOTE;
					pos = i;
				}
				
				break;
			case "'":
				if(marker == SINGLE_QUOTE) {
					marker = UNMARK;
				} else if (marker == null) {
					marker = SINGLE_QUOTE;
					pos = i;
				}
			
				break;
			case "/":
				if(marker == null){
					if(contents[i + 1] == "/"){
						marker = LINE_COMMENT;
						pos = i;
						skip = true;
					} else if(contents[i + 1] == "*"){
						marker = MULTI_COMMENT;
						pos = i;
						skip = true;
					}
				}
				
				break;
			case "*":
				if (marker == MULTI_COMMENT){
					if(contents[i + 1] == "/"){
						marker = UNMARK;
						skip = true;
					}
				}
			
				break;
			case "\n":
				if(marker == LINE_COMMENT){
					marker = UNMARK;
				}
				break;
		
		}
		if (marker != null) {
			comments[i] = 1;
		}
		if (marker == UNMARK){
			marker = null;
		}
		if  (skip) {
			i++;
			comments[i] = 1;
		}
	}
	
	
	return comments;
}

// Calculate the line number of the character at index 'pos'
checkstyleUtil.getLineNumber = function(contents, pos){
	var counter = 0;
	var sep = "\n";
		
	for(var i = pos; i > -1; i--){
		if(contents.charAt(i) == "\n"){
			counter ++;
		}
	}
	return counter + 1;
};

// Store the information for a single error.
checkstyleUtil.addError = function(msg, fileName, contents, pos){
	while(fileName.indexOf("../") == 0){
		fileName = fileName.substring(3);
	}
	checkstyleUtil.errors.push({
		file: fileName,
		line: checkstyleUtil.getLineNumber(contents, pos),
		message: msg
	});
};

// Find the next character in 'contents' after the index 'start'
// Spaces and tabs are ignored.
checkstyleUtil.getNextChar = function(contents, start, comments, ignoreNewLine){
	for(var i = start; i < contents.length; i++){
		if(comments && comments[i]){
			continue;
		}
		if(contents.charAt(i) != " "
			&& contents.charAt(i) != "\t"
			&& (!ignoreNewLine || contents.charCodeAt(i) != 13)){
			return {
				value: contents[i],
				pos: i
			};
		}
	}
	return null;
};

// Find the next occurrence of the character in the
// 'contents' array after the index 'start'
checkstyleUtil.findNextCharPos = function(contents, start, character){
	for(var i = start; i < contents.length; i++){
		if(contents.charAt(i) == character){
			return i;
		}
	}
	return -1;
};

// Creates a simple function that searches for the token, and
// adds an error if it is found
checkstyleUtil.createSimpleSearch = function(token, message){
	return function(fileName, contents, comments){
		var idx = contents.indexOf(token);
		
		while(idx > -1){
			
			if(!comments[idx]){
				checkstyleUtil.addError(message, fileName, contents, idx);
			}
			idx = contents.indexOf(token, idx + 1);
		}
	};
};

// Creates a function that fails a test if the given token
// does not have a space to the left and right.
checkstyleUtil.createSpaceWrappedSearch = function(token, message){
	return function(fileName, contents, comments){
		
		var idx = contents.indexOf(token);
		var before, after;
		var tokenLength = token.length;

		while(idx > -1){
			before = contents.charAt(idx - 1);
			after = contents.charAt(idx + tokenLength);
			if(!comments[idx] &&
				((before != " " && before != "\t"
					&& (token != "==" || before != "!")
					&& (token != "=" ||
						(before != "<" &&
						 before != ">" &&
						 before != "=" &&
						 before != "!" &&
						 before != "+" &&
						 before != "-" &&
						 before != "*" &&
						 before != "/" &&
						 before != "&" &&
						 before != "|" ))) ||
				(
					(after != " " && contents.charCodeAt(idx + tokenLength) != 13
						&& contents.charCodeAt(idx + tokenLength) != 10)
					&& (token != "==" || after != "=")
					&& (token != "!=" || after != "=")
					&& (token != "<" || after != "=")
					&& (token != ">" || after != "=")
					&& (token != "=" || after != "=")
					&& (token != "&" || after != "=")
					&& (token != "|" || after != "=")
					&& (token != "+" || after != "=")
					&& (token != "-" || after != "=")
					&& (token != "*" || after != "=")
					&& (token != "/" || after != "=")
				))){
				checkstyleUtil.addError(message, fileName, contents, idx);
			}
			idx = contents.indexOf(token, idx + token.length);
		}
	};
};



checkstyleUtil.isEOL = function(contents, pos){
	var c = contents.charCodeAt(pos);
	return c == 10 || c == 13 || contents.charAt(pos) == "\n";
};

// All the rules that will be applied to each file.
checkstyleUtil.rules = {

	"elseFollowedBySpace": function(fileName, contents, comments){
		var idx = contents.indexOf("else ");
		while(idx > -1){

			if(!comments[idx] && contents.substring(idx + 5, idx + 7) != "if"){
				checkstyleUtil.addError("\" else \" cannot be followed by a space", fileName, contents, idx);
			}
			idx = contents.indexOf("else {", idx + 1);
		}
	},
	
	"trailingComma" : function(fileName, contents, comments){
		
		var s = ",";
		var idx = contents.indexOf(s);
		var nextChar;
		
		while(idx > -1){
			if(!comments[idx]){
				nextChar = checkstyleUtil.getNextChar(contents, idx + 1, comments, true);
				if(nextChar && nextChar.value == "}"){
					checkstyleUtil.addError("Trailing commas are not permitted", fileName, contents, idx);
				}
			}
			idx = contents.indexOf(s, idx + 1);
		}
	},
	
	"switchCaseNewLine" : function(fileName, contents, comments){
		var s = "\tcase ";
		var idx = contents.indexOf(s);
		var nextColonIdx;
		var eolIdx;
		
		while(idx > -1){
			
			if(!comments[idx]){
				eolIdx = contents.indexOf("\n", idx + 4);
				
				if(eolIdx > idx){
					// Count backwards from the end of the line.
					// The first character, that is not a comment,
					// Should be a ':'
					
					for(var i = eolIdx; i > idx + 4; i--){
						var c = contents.charAt(i);
						if(!comments[i]
							&& c != ' '
							&& c != '\t'
							&& c != ':'
							&& !checkstyleUtil.isEOL(contents, i)){
							checkstyleUtil.addError(
								"A CASE statement should be followed by a new line",
								fileName, contents, idx);
							break;
						}
						if(c == ':'){
							break;
						}
					}
				}
			}
			idx = contents.indexOf(s, idx + 4);
		}
	},
	
	"curlyBraceAtStartOfLine": function(fileName, contents, comments){
		
		var idx = contents.indexOf("\n");
		
		while(idx > -1){
			var nextChar = checkstyleUtil.getNextChar(contents, idx + 1);
			
			if(nextChar && !comments[nextChar.pos] && nextChar.value == "{"){
				// Go back three lines, and look for "dojo.declare".  If it exists in the last three lines,
				// then it is ok to have  { at the start of this line.
				
				var nlCount = 0;
				var i;
				for(i = idx - 1; i > -1 && nlCount < 3; i--){
					if(contents[i] == "\n"){
						nlCount++;
					}
				}
				var declarePos = contents.indexOf("dojo.declare", Math.max(0, i));
				if(declarePos < 0 || declarePos > idx){
					checkstyleUtil.addError("An opening curly brace should not be the first on a line", fileName, contents, idx);
				}
			}
			idx = contents.indexOf("\n", idx + 1);
		}
	},
	
	"parenthesisSpaceCurlyBrace": checkstyleUtil.createSimpleSearch(") {", "A space is not permitted between a closing parenthesis and a curly brace"),
	
	"useTabs": function(fileName, contents, comments){
		
		var idx = contents.indexOf("  ");
		
		while(idx > -1){
			var nextChar = checkstyleUtil.getNextChar(contents, idx + 1);
			if(!comments[idx] && nextChar && nextChar.value.charCodeAt(0) != 13){
				checkstyleUtil.addError("Tabs should be used instead of spaces", fileName, contents, idx);
				var nextLine = checkstyleUtil.findNextCharPos(contents, idx + 1, "\n");
				if(nextLine < 0){
					break;
				}
				idx = contents.indexOf("  ", nextLine + 1);
			} else{
				idx = contents.indexOf("  ", idx + 2);
			}
		}
	},
	
	"commentFormatting": function(fileName, contents, comments){
		
		var commentNames = checkstyleUtil.commentNames;
		var invalidPrefixes = ["//", "//\t"];
		var idx;
		
		for(var i = 0; i < commentNames.length; i++){
			var comment = commentNames[i];

			for(var j = 0; j < invalidPrefixes.length; j++){
				idx = contents.indexOf(invalidPrefixes[j] + comment + ":");

				// Make sure that there is a space before the comment.
				while(idx > -1){
					checkstyleUtil.addError("Must be just a space in a comment before \"" + comment + "\"" , fileName, contents, idx);
					var nextLine = checkstyleUtil.findNextCharPos(contents, idx + 1, "\n");
					if(nextLine < 0){
						break;
					}
					idx = contents.indexOf(invalidPrefixes[j] + comment + ":", nextLine);
				}
			}
			
			idx = contents.indexOf(comment + ":");
			
			// Make sure that the comment name is on a line by itself. The body of the comment
			// must be on the next line.
			while(idx > -1){
				if(comments[idx]){
					var search = idx + comment.length + 1;
				
					// Make sure that there is nothing after the comment name on the same line.
					while(!checkstyleUtil.isEOL(contents, search)){
						if(contents[search] != " " && contents[search] != "\t"){
							checkstyleUtil.addError("The comment \"" + comment + "\" must be followed by a new line" ,
										fileName, contents, idx);
							break;
						}
						search++;
					}
				}
				idx = contents.indexOf(comment + ":", idx + comment.length + 2);
			}
		}
	},
	
	"spacesAroundEquals": checkstyleUtil.createSpaceWrappedSearch("==", "The equals sign should be preceded and followed by a space"),
	"spacesAroundNotEquals": checkstyleUtil.createSpaceWrappedSearch("!=", "The != sign should be preceded and followed by a space"),
	"spacesAroundAssignment": checkstyleUtil.createSpaceWrappedSearch("=", "The = sign should be preceded and followed by a space"),
	"spacesAroundOr": checkstyleUtil.createSpaceWrappedSearch("||", "The || sign should be preceded and followed by a space"),
	"spacesAroundLessThan": checkstyleUtil.createSpaceWrappedSearch("<", "The < sign should be preceded and followed by a space"),
	"spacesAroundGreaterThan": checkstyleUtil.createSpaceWrappedSearch(">", "The > sign should be preceded and followed by a space"),
	"spacesAroundAnd": checkstyleUtil.createSpaceWrappedSearch("&&", "The && sign should be preceded and followed by a space")
};

var noSpaceAfter = ["catch","do","finally","for","if","switch","try","while","with"];

// Add checks for all the elements that are not allowed to have a space after them.
checkstyleUtil.createNoSpaceAfterFunction = function(name){
	checkstyleUtil.rules["noSpaceAfter" + noSpaceAfter[i] + "1"] =
		checkstyleUtil.createSimpleSearch(" " + name +" ", "\" " + name + " \" cannot be followed by a space");
	checkstyleUtil.rules["noSpaceAfter" + noSpaceAfter[i] + "2"] =
		checkstyleUtil.createSimpleSearch("\t" + name +" ", "\" " + name + " \" cannot be followed by a space");
}

for(var i = 0; i < noSpaceAfter.length; i++){
	checkstyleUtil.createNoSpaceAfterFunction(noSpaceAfter[i]);
}

checkstyleUtil.clear = function(){
	checkstyleUtil.errors = [];
}

checkstyleUtil.serializeErrors = function(){
	var buf = [];
	var errs = checkstyleUtil.errors;
	for(var i = 0; i < errs.length; i++){
		buf.push(errs[i].file + ":" + errs[i].line + " - " + errs[i].message);
	}
	return buf.join("\n");
}

checkstyleUtil.makeSimpleFixes = function(contents){
	
	var comments = checkstyleUtil.getComments(contents);
	for(var i = 0; i < noSpaceAfter.length; i++){
		contents = checkstyleUtil.fixSpaceAfter(contents, noSpaceAfter[i], comments);
	}
	/*
	contents = contents.split("    ").join("\t")
				.split("  ").join("\t")
				.split(") {").join("){")
				.split("\tif (").join("\tif(")
				.split("} else").join("}else")
				.split("}\telse").join("}else")
				.split("}else {").join("}else{")
				.split("\twhile (").join("\twhile(")
				.split("\tfor (").join("\tfor(")
				.split("\tswitch (").join("\tswitch(");
	*/
	
	contents = checkstyleUtil.replaceAllExceptComments(contents, "=  ", "= ", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.replaceAllExceptComments(contents, "    ", "\t", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.replaceAllExceptComments(contents, "  ", "\t", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.replaceAllExceptComments(contents, "\tif (", "\tif(", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.replaceAllExceptComments(contents, "} else", "}else", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.replaceAllExceptComments(contents, "}\telse", "}else", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.replaceAllExceptComments(contents, "}else {", "}else{", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.replaceAllExceptComments(contents, "\twhile (", "\twhile(", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.replaceAllExceptComments(contents, "\tfor (", "\tfor(", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.replaceAllExceptComments(contents, "\tswitch (", "\tswitch(", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.replaceAllExceptComments(contents, ") {", "){", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.replaceAllExceptComments(contents, "//summary:", "// summary:", {});
	contents = checkstyleUtil.replaceAllExceptComments(contents, "//description:", "// description:", {});
	comments = checkstyleUtil.getComments(contents);
	
	contents = checkstyleUtil.fixTrailingWhitespace(contents);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.fixSpaceBeforeAndAfter(contents, "===", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.fixSpaceBeforeAndAfter(contents, "!==", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.fixSpaceBeforeAndAfter(contents, "<=", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.fixSpaceBeforeAndAfter(contents, "<", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.fixSpaceBeforeAndAfter(contents, ">=", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.fixSpaceBeforeAndAfter(contents, ">", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.fixSpaceBeforeAndAfter(contents, "!=", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.fixSpaceBeforeAndAfter(contents, "==", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.fixSpaceBeforeAndAfter(contents, "=", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.fixSpaceBeforeAndAfter(contents, "||", comments);
	comments = checkstyleUtil.getComments(contents);
	contents = checkstyleUtil.fixSpaceBeforeAndAfter(contents, "&&", comments);
	comments = checkstyleUtil.getComments(contents);
	
	contents = checkstyleUtil.fixCommentNames(contents);
	
	
	
	return contents;
}

checkstyleUtil.fixCommentNames = function(contents){
	var commentNames = checkstyleUtil.commentNames;
	var i;
	
	for(i = 0; i < commentNames.length; i++){
		contents = checkstyleUtil.replaceAllExceptComments(contents, "//\t" + commentNames[i] + ":", "// " + commentNames[i] + ":", {});
	}
	
	for(i = 0; i < commentNames.length; i++){
		var commentName = commentNames[i];
		var searchToken = "// " + commentName + ":";
		var idx = contents.indexOf(searchToken);
		
		
		while(idx > -1){
			// If the comment name is not followed immediately by a new line, then insert a new line,
			// two forward slashes and two tabs.
			if(!checkstyleUtil.isEOL(contents, idx + commentName.length + 4)){
				// Calculate how many tabs to put before the "//"
				
				var tabs = "";
				var search = idx - 1;
				while(!checkstyleUtil.isEOL(contents, search)){
					tabs += contents.charAt(search);
					search--;
				}
				var insertPos = idx + commentName.length + 4;
				if(contents.charAt(insertPos) == " " || contents.charAt(insertPos) == "\t"){
					contents = checkstyleUtil.deleteChar(contents, insertPos);
				}
				
				contents = checkstyleUtil.insertChar(contents, "\n" + tabs + "//\t\t", idx + commentName.length + 4);
			
			}
			idx = contents.indexOf(searchToken, idx + commentName.length);
		}
	}
	return contents;
}


checkstyleUtil.replaceAllExceptComments = function(contents, old, newStr, comments){
	var idx = contents.indexOf(old);
	var toRemove = [];
	
	while(idx > -1){
		if(!comments[idx]){
			toRemove.push(idx);
		}

		idx = contents.indexOf(old, idx + old.length);
	}
	
	// Process the string backwards so we don't have to recompute the comments each time.
	for(var i = toRemove.length - 1; i > -1; i--){
		idx = toRemove[i];
		if(!comments[idx]){
			contents = contents.substring(0, idx)
					+ newStr
					+ contents.substring(idx + old.length, contents.length);
		}
	}
	return contents;
}

checkstyleUtil.insertChar = function(contents, ch, pos){
	return contents.substring(0, pos) + ch + contents.substring(pos);
}
checkstyleUtil.deleteChar = function(contents, pos){
	return contents.substring(0, pos) + contents.substring(pos + 1);
}

checkstyleUtil.fixTrailingWhitespace = function(contents) {
	var idx = contents.indexOf("\n");
	
	// Find each new line character, then iterate backwards until a non-whitespace character is found
	// then remove the whitespace.
	while(idx > -1){
		var search = idx - 1;
		
		while(search > -1 && (contents.charAt(search) == " " || contents.charAt(search) == "\t")){
			search--;
		}
		
		if(search < idx -1){
			contents = contents.substring(0, search + 1)
					+ contents.substring(idx, contents.length);
			
			idx = contents.indexOf("\n", search + 2);
		}else{
			idx = contents.indexOf("\n", idx + 1);
		}
	}

	return contents;
}

checkstyleUtil.fixSpaceAfter = function(contents, token, comments){
	var idx = contents.indexOf(token + " ");
	
	while(idx > -1){
		if(!comments[idx]){
			contents = checkstyleUtil.deleteChar(contents, idx + token.length);
		}
		
		idx = contents.indexOf(token + " ", idx + token.length);
	}
	return contents;
}

checkstyleUtil.fixSpaceBeforeAndAfter = function(contents, token, comments){
	var idx = contents.indexOf(token);
	var before, after;
	var len = token.length;

	while(idx > -1){
		before = contents.charAt(idx - 1);
		after = contents.charAt(idx + len);
		if(!comments[idx]){
			// Only insert a space before the token if:
			// - char before is not a space or a tab
			// - token is "==" and the char before is neither "!" or "="
		
			if(before != " " && before != "\t"
				&& (token != "==" || (before != "!" && before != "="))
				&& (token != "=" ||
						(before != "<" &&
						 before != ">" &&
						 before != "=" &&
						 before != "!" &&
						 before != "+" &&
						 before != "-" &&
						 before != "*" &&
						 before != "/" &&
						 before != "&" &&
						 before != "|" ))
				){
				
				contents = checkstyleUtil.insertChar(contents, " ", idx);
				idx ++;
			}
			
			// Only insert a space after the token if:
			// - char after is not a space
			// - char after is not a new line
			// - char after is not "="
			if((after != " " && contents.charCodeAt(idx + len) != 13
					&& contents.charCodeAt(idx + len) != 10)
					&& (token != "==" || after != "=")
					&& (token != "!=" || after != "=")
					&& (token != "=" || after != "=")
					&& (token != "<" || after != "=")
					&& (token != ">" || after != "=")
					&& (token != "&" || after != "=")
					&& (token != "|" || after != "=")
					&& (token != "+" || after != "=")
					&& (token != "-" || after != "=")
					&& (token != "*" || after != "=")
					&& (token != "/" || after != "=")
					
					){
				contents = contents = checkstyleUtil.insertChar(contents, " ", idx + token.length);
				idx++;
			}
		}
		idx = contents.indexOf(token, idx + token.length);
	}
	return contents;
}

// Creates the data file suitable to be loaded into a dojo.data.ItemFileReadStore
checkstyleUtil.generateReport = function(skipPrint){
	
	var ids = 1;
	var json = ["{id:'" +(ids++) + "', file: 'All', isFolder:true}"];

	// A map of folders that have already been found.
	var allFolders = {};
	
	var messageIds = {};
	var messageCounter = 1;
	var i, err;
	
	function getFolderName(fileName){
		// Extract the folder name from a file name
		var idx = fileName.lastIndexOf("/");
		return fileName.substring(0, idx);
	}
	
	// Add a folder to the list of folders.
	function pushFolder(folderName){
		if(!allFolders[folderName]){
			allFolders[folderName] = true;
			json.push("{id: '" +(ids++) + "', file: '" + folderName + "', folder: 1}");
		}
	}
	
	for(i = 0; i < checkstyleUtil.errors.length; i++){
		err = checkstyleUtil.errors[i];
		var message = err.message;
		var messageId = messageIds[message];
		if(!messageId){
			messageId = "m" + messageCounter++;
			messageIds[message] = messageId;
			
			json.push("{id:'" + messageId +
					"',msg:'" + message +
					"'}");
		}
	}
	
	pushFolder("All");
	
	// Create the JSON records for each error.
	for(i = 0; i < checkstyleUtil.errors.length; i++){
		err = checkstyleUtil.errors[i];
		var folderName = getFolderName(err.file);
		pushFolder(folderName);
		
		json.push("{id:'" +(ids++) +
					"', file:'" + err.file +
					"',line:" + err.line +
					",msg:{'_reference':'" + messageIds[err.message] +
					//"'},folder:'" + folderName +
					"'},folder: 0" +
					"}");
		
	}

	// Add the date that the check was run to the store.
	json.push("{id:'" +(ids++) + "', date: " +(new Date()).getTime() + "}");
	
	// Save the file.

	if(!skipPrint){
		print("Found " + checkstyleUtil.errors.length + " checkstyle errors. " +
		"Open the file checkstyleReport.html to view the results.");
	}
					
	return "{ identifier: 'id', label:'file', items: [" + json.join(",\n") + "]}";
};