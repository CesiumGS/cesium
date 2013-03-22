// summary:
//		BiDiComplex module handles complex expression issues known when using BiDi characters
//		in File Paths, URLs, E-mail Address, XPATH, etc.
//		this module adds property listeners to the text fields to correct the text representation
//		in both static text and dynamic text during user input.

define(["dojo/_base/kernel", "dojo/_base/lang", "dojo/_base/array", "dojo/_base/connect", "dojo/_base/sniff",
		"dojo/keys"], 
  function(dojo, lang, arr, hub, has, keys){
	dojo.experimental("dojox.string.BidiComplex");
	var bdc = lang.getObject("string.BidiComplex", true, dojox);

	var _str0 = []; //FIXME: shared reference here among various functions means the functions can't be reused

	bdc.attachInput = function(/*DOMNode*/field, /*String*/pattern){
		// summary:
		//		Attach key listeners to the INPUT field to accomodate dynamic complex BiDi expressions
		// field: INPUT DOM node
		// pattern: Complex Expression Pattern type. One of "FILE_PATH", "URL", "EMAIL", "XPATH"

		field.alt = pattern;

		hub.connect(field, "onkeydown",  this, "_ceKeyDown");
		hub.connect(field, "onkeyup", this, "_ceKeyUp");

		hub.connect(field, "oncut", this, "_ceCutText");
		hub.connect(field, "oncopy", this, "_ceCopyText");

		field.value = bdc.createDisplayString(field.value, field.alt);
	};
		
	bdc.createDisplayString = function(/*String*/str, /*String*/pattern){
		// summary:
		//		Create the display string by adding the Unicode direction Markers
		// pattern: Complex Expression Pattern type. One of "FILE_PATH", "URL", "EMAIL", "XPATH"

		str = bdc.stripSpecialCharacters(str);
		var segmentsPointers = bdc._parse(str, pattern);
		
		var buf = '\u202A'/*LRE*/ + str;
		var shift = 1;
		arr.forEach(segmentsPointers, function(n){
			if(n != null){
				var preStr = buf.substring(0, n + shift);
				var postStr = buf.substring(n + shift, buf.length);
				buf = preStr + '\u200E'/*LRM*/ + postStr;
				shift++;
			}
		});
		return buf;
	};

	bdc.stripSpecialCharacters = function(str){
		// summary:
		//		removes all Unicode directional markers from the string

		return str.replace(/[\u200E\u200F\u202A-\u202E]/g, ""); // String
	};

	bdc._ceKeyDown = function(event){
		var elem = has("ie") ? event.srcElement : event.target;
		_str0 = elem.value;
	};
				
	bdc._ceKeyUp = function(event){
		var LRM = '\u200E';
		var elem = has("ie") ? event.srcElement : event.target;

		var str1 = elem.value;
		var ieKey = event.keyCode;
		
		if((ieKey == keys.HOME)
			|| (ieKey == keys.END)
			|| (ieKey == keys.SHIFT)){
			return;
		}

		var cursorStart, cursorEnd;
		var selection = bdc._getCaretPos(event, elem);
		if(selection){
			cursorStart = selection[0];
			cursorEnd = selection[1];
		}

	//Jump over a cursor processing
		if(has("ie")){
			var cursorStart1 = cursorStart, cursorEnd1 = cursorEnd;

			if(ieKey == keys.LEFT_ARROW){
				if((str1.charAt(cursorEnd-1) == LRM)
						&& (cursorStart == cursorEnd)){
					bdc._setSelectedRange(elem,cursorStart - 1, cursorEnd - 1);
				}
				return;
			}

			if(ieKey == keys.RIGHT_ARROW){
				if(str1.charAt(cursorEnd-1) == LRM){
					cursorEnd1 = cursorEnd + 1;
					if(cursorStart == cursorEnd){
						cursorStart1 = cursorStart + 1;
					}
				}

				bdc._setSelectedRange(elem, cursorStart1, cursorEnd1);
				return;
			}
		}else{ //Firefox
			if(ieKey == keys.LEFT_ARROW){
				if(str1.charAt(cursorEnd-1) == LRM){
					bdc._setSelectedRange(elem, cursorStart - 1, cursorEnd - 1);
				}
				return;
			}
			if(ieKey == keys.RIGHT_ARROW){
				if(str1.charAt(cursorEnd-1) == LRM){
					bdc._setSelectedRange(elem, cursorStart + 1, cursorEnd + 1);
				}
				return;
			}
		}
		
		var str2 = bdc.createDisplayString(str1, elem.alt);

		if(str1 != str2)
		{
			window.status = str1 + " c=" + cursorEnd;
			elem.value = str2;

			if((ieKey == keys.DELETE) && (str2.charAt(cursorEnd)==LRM)){
				elem.value = str2.substring(0, cursorEnd) + str2.substring(cursorEnd+2, str2.length);
			}

			if(ieKey == keys.DELETE){
				bdc._setSelectedRange(elem,cursorStart,cursorEnd);
			}else if(ieKey == keys.BACKSPACE){
				if((_str0.length >= cursorEnd) && (_str0.charAt(cursorEnd-1)==LRM)){
					bdc._setSelectedRange(elem, cursorStart - 1, cursorEnd - 1);
				}else{
					bdc._setSelectedRange(elem, cursorStart, cursorEnd);
				}
			}else if(elem.value.charAt(cursorEnd) != LRM){
				bdc._setSelectedRange(elem, cursorStart + 1, cursorEnd + 1);
			}
		}
	};

	bdc._processCopy = function(elem, text, isReverse){
		// summary:
		//		This function strips the unicode directional controls when the text copied to the Clipboard

		if(text == null){
			if(has("ie")){
				var range = document.selection.createRange();
				text = range.text;
			}else{
				text = elem.value.substring(elem.selectionStart, elem.selectionEnd);
			}
		}

		var textToClipboard = bdc.stripSpecialCharacters(text);
	
		if(has("ie")){
			window.clipboardData.setData("Text", textToClipboard);
		}
		return true;
	};

	bdc._ceCopyText = function(elem){
		if(has("ie")){
			elem.returnValue = false;
		}
		return bdc._processCopy(elem, null, false);
	};

	bdc._ceCutText = function(elem){

		var ret = bdc._processCopy(elem, null, false);
		if(!ret){
			return false;
		}

		if(has("ie")){
	//		curPos = elem.selectionStart;
			document.selection.clear();
		}else{
			var curPos = elem.selectionStart;
			elem.value = elem.value.substring(0, curPos) + elem.value.substring(elem.selectionEnd);
			elem.setSelectionRange(curPos, curPos);
		}

		return true;
	};

	// is there dijit code to do this?
	bdc._getCaretPos = function(event, elem){
		if(has("ie")){
			var position = 0,
			range = document.selection.createRange().duplicate(),
			range2 = range.duplicate(),
			rangeLength = range.text.length;

			if(elem.type == "textarea"){
				range2.moveToElementText(elem);
			}else{
				range2.expand('textedit');
			}
			while(range.compareEndPoints('StartToStart', range2) > 0){
				range.moveStart('character', -1);
				++position;
			}

			return [position, position + rangeLength];
		}

		return [event.target.selectionStart, event.target.selectionEnd];
	};

	// is there dijit code to do this?
	bdc._setSelectedRange = function(elem,selectionStart,selectionEnd){
		if(has("ie")){
			var range = elem.createTextRange();
			if(range){
				if(elem.type == "textarea"){
					range.moveToElementText(elem);
				}else{
					range.expand('textedit');
				}

				range.collapse();
				range.moveEnd('character', selectionEnd);
				range.moveStart('character', selectionStart);
				range.select();
			}
		}else{
			elem.selectionStart = selectionStart;
			elem.selectionEnd = selectionEnd;
		}
	};

	var _isBidiChar = function(c){
		return (c >= '\u0030' && c <= '\u0039') || (c > '\u00ff');
	};

	var _isLatinChar = function(c){
		return (c >= '\u0041' && c <= '\u005A') || (c >= '\u0061' && c <= '\u007A');
	};

	var _isCharBeforeBiDiChar = function(buffer, i, previous){
		while(i > 0){
			if(i == previous){
				return false;
			}
			i--;
			if(_isBidiChar(buffer.charAt(i))){
				return true;
			}
			if(_isLatinChar(buffer.charAt(i))){
				return false;
			}
		}
		return false;
	};


	bdc._parse = function(/*String*/str, /*String*/pattern){
		var previous = -1, segmentsPointers = [];
		var delimiters = {
			FILE_PATH: "/\\:.",
			URL: "/:.?=&#",
			XPATH: "/\\:.<>=[]",
			EMAIL: "<>@.,;"
		}[pattern];

		switch(pattern){
			case "FILE_PATH":
			case "URL":
			case "XPATH":
				arr.forEach(str, function(ch, i){
					if(delimiters.indexOf(ch) >= 0 && _isCharBeforeBiDiChar(str, i, previous)){
						previous = i;
						segmentsPointers.push(i);
					}
				});
				break;
			case "EMAIL":
				var inQuotes = false; // FIXME: unused?
	
				arr.forEach(str, function(ch, i){
					if(ch== '\"'){
						if(_isCharBeforeBiDiChar(str, i, previous)){
							previous = i;
							segmentsPointers.push(i);
						}
						i++;
						var i1 = str.indexOf('\"', i);
						if(i1 >= i){
							i = i1;
						}
						if(_isCharBeforeBiDiChar(str, i, previous)){
							previous = i;
							segmentsPointers.push(i);
						}
					}
	
					if(delimiters.indexOf(ch) >= 0 && _isCharBeforeBiDiChar(str, i, previous)){
								previous = i;
								segmentsPointers.push(i);
					}
				});
		}
		return segmentsPointers;
	};
	return dojox.string.BidiComplex;
});
