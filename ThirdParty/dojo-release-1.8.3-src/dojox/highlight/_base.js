define([
	"dojo/_base/lang", 
	"dojo/_base/array", 
	"dojo/dom", 
	"dojo/dom-class"
], function(lang, array, dom, domClass){


	var dh = lang.getObject("dojox.highlight", true),
		C_NUMBER_RE = '\\b(0x[A-Za-z0-9]+|\\d+(\\.\\d+)?)'
	;
	/*=====
	 dh = {
		 // summary:
		 //		Syntax highlighting with language auto-detection package
		 // description:
		 //		Syntax highlighting with language auto-detection package.
		 //		Released under CLA by the Dojo Toolkit, original BSD release
		 //		available from: http://softwaremaniacs.org/soft/highlight/
	 };
	 =====*/

	dh.languages = dh.languages || {};
	// constants

	dh.constants = {
		IDENT_RE: '[a-zA-Z][a-zA-Z0-9_]*',
		UNDERSCORE_IDENT_RE: '[a-zA-Z_][a-zA-Z0-9_]*',
		NUMBER_RE: '\\b\\d+(\\.\\d+)?',
		C_NUMBER_RE: C_NUMBER_RE,
		// Common modes
		APOS_STRING_MODE: {
			className: 'string',
			begin: '\'', end: '\'',
			illegal: '\\n',
			contains: ['escape'],
			relevance: 0
		},
		QUOTE_STRING_MODE: {
			className: 'string',
			begin: '"',
			end: '"',
			illegal: '\\n',
			contains: ['escape'],
			relevance: 0
		},
		BACKSLASH_ESCAPE: {
			className: 'escape',
			begin: '\\\\.', end: '^',
			relevance: 0
		},
		C_LINE_COMMENT_MODE: {
			className: 'comment',
			begin: '//', end: '$',
			relevance: 0
		},
		C_BLOCK_COMMENT_MODE: {
			className: 'comment',
			begin: '/\\*', end: '\\*/'
		},
		HASH_COMMENT_MODE: {
			className: 'comment',
			begin: '#', end: '$'
		},
		C_NUMBER_MODE: {
			className: 'number',
			begin: C_NUMBER_RE, end: '^',
			relevance: 0
		}
	};

	// utilities
	
	function esc(value){
		return value.replace(/&/gm, '&amp;').replace(/</gm, '&lt;').replace(/>/gm, '&gt;');
	}
	
	function verifyText(block){
		return array.every(block.childNodes, function(node){
			return node.nodeType == 3 || String(node.nodeName).toLowerCase() == 'br';
		});
	}

	function blockText(block){
		var result = [];
		array.forEach(block.childNodes, function(node){
			if(node.nodeType == 3){
				result.push(node.nodeValue);
			}else if(String(node.nodeName).toLowerCase() == 'br'){
				result.push("\n");
			}else{
				throw 'Complex markup';
			}
		});
		return result.join("");
	}

	function buildKeywordGroups(mode){
		if(!mode.keywordGroups){
			for(var key in mode.keywords){
				var kw = mode.keywords[key];
    			if(kw instanceof Object){  // dojo.isObject?
					mode.keywordGroups = mode.keywords;
				}else{
					mode.keywordGroups = {keyword: mode.keywords};
				}
				break;
			}
		}
	}
	
	function buildKeywords(language){
		if(language.defaultMode && language.modes){
			buildKeywordGroups(language.defaultMode);
			array.forEach(language.modes, buildKeywordGroups);
		}
	}
	
	// main object

	var Highlighter = function(langName, textBlock){
		// initialize the state
		this.langName = langName;
		this.lang = dh.languages[langName];
		this.modes = [this.lang.defaultMode];
		this.relevance = 0;
		this.keywordCount = 0;
		this.result = [];
		
		// build resources lazily
		if(!this.lang.defaultMode.illegalRe){
			this.buildRes();
			buildKeywords(this.lang);
		}
		
		// run the algorithm
		try{
			this.highlight(textBlock);
			this.result = this.result.join("");
		}catch(e){
			if(e == 'Illegal'){
				this.relevance = 0;
				this.keywordCount = 0;
				this.partialResult = this.result.join("");
				this.result = esc(textBlock);
			}else{
				throw e;
			}
		}
	};

	lang.extend(Highlighter, {
		buildRes: function(){
			array.forEach(this.lang.modes, function(mode){
				if(mode.begin){
					mode.beginRe = this.langRe('^' + mode.begin);
				}
				if(mode.end){
					mode.endRe = this.langRe('^' + mode.end);
				}
				if(mode.illegal){
					mode.illegalRe = this.langRe('^(?:' + mode.illegal + ')');
				}
			}, this);
			this.lang.defaultMode.illegalRe = this.langRe('^(?:' + this.lang.defaultMode.illegal + ')');
		},
		
		subMode: function(lexeme){
			var classes = this.modes[this.modes.length - 1].contains;
			if(classes){
				var modes = this.lang.modes;
				for(var i = 0; i < classes.length; ++i){
					var className = classes[i];
					for(var j = 0; j < modes.length; ++j){
						var mode = modes[j];
						if(mode.className == className && mode.beginRe.test(lexeme)){ return mode; }
					}
				}
			}
			return null;
		},

		endOfMode: function(lexeme){
			for(var i = this.modes.length - 1; i >= 0; --i){
				var mode = this.modes[i];
				if(mode.end && mode.endRe.test(lexeme)){ return this.modes.length - i; }
				if(!mode.endsWithParent){ break; }
			}
			return 0;
		},

		isIllegal: function(lexeme){
			var illegalRe = this.modes[this.modes.length - 1].illegalRe;
			return illegalRe && illegalRe.test(lexeme);
		},


		langRe: function(value, global){
			var mode =  'm' + (this.lang.case_insensitive ? 'i' : '') + (global ? 'g' : '');
			return new RegExp(value, mode);
		},
	
		buildTerminators: function(){
			var mode = this.modes[this.modes.length - 1],
				terminators = {};
			if(mode.contains){
				array.forEach(this.lang.modes, function(lmode){
					if(array.indexOf(mode.contains, lmode.className) >= 0){
						terminators[lmode.begin] = 1;
					}
				});
			}
			for(var i = this.modes.length - 1; i >= 0; --i){
				var m = this.modes[i];
				if(m.end){ terminators[m.end] = 1; }
				if(!m.endsWithParent){ break; }
			}
			if(mode.illegal){ terminators[mode.illegal] = 1; }
			var t = [];
			for(i in terminators){ t.push(i); }
			mode.terminatorsRe = this.langRe("(" + t.join("|") + ")");
		},

		eatModeChunk: function(value, index){
			var mode = this.modes[this.modes.length - 1];
			
			// create terminators lazily
			if(!mode.terminatorsRe){
				this.buildTerminators();
			}
	
			value = value.substr(index);
			var match = mode.terminatorsRe.exec(value);
			if(!match){
				return {
					buffer: value,
					lexeme: "",
					end:    true
				};
			}
			return {
				buffer: match.index ? value.substr(0, match.index) : "",
				lexeme: match[0],
				end:    false
			};
		},
	
		keywordMatch: function(mode, match){
			var matchStr = match[0];
			if(this.lang.case_insensitive){ matchStr = matchStr.toLowerCase(); }
			for(var className in mode.keywordGroups){
				if(matchStr in mode.keywordGroups[className]){ return className; }
			}
			return "";
		},
		
		buildLexemes: function(mode){
			var lexemes = {};
			array.forEach(mode.lexems, function(lexeme){
				lexemes[lexeme] = 1;
			});
			var t = [];
			for(var i in lexemes){ t.push(i); }
			mode.lexemsRe = this.langRe("(" + t.join("|") + ")", true);
		},
	
		processKeywords: function(buffer){
			var mode = this.modes[this.modes.length - 1];
			if(!mode.keywords || !mode.lexems){
				return esc(buffer);
			}
			
			// create lexemes lazily
			if(!mode.lexemsRe){
				this.buildLexemes(mode);
			}
			
			mode.lexemsRe.lastIndex = 0;
			var result = [], lastIndex = 0,
				match = mode.lexemsRe.exec(buffer);
			while(match){
				result.push(esc(buffer.substr(lastIndex, match.index - lastIndex)));
				var keywordM = this.keywordMatch(mode, match);
				if(keywordM){
					++this.keywordCount;
					result.push('<span class="'+ keywordM +'">' + esc(match[0]) + '</span>');
				}else{
					result.push(esc(match[0]));
				}
				lastIndex = mode.lexemsRe.lastIndex;
				match = mode.lexemsRe.exec(buffer);
			}
			result.push(esc(buffer.substr(lastIndex, buffer.length - lastIndex)));
			return result.join("");
		},
	
		processModeInfo: function(buffer, lexeme, end) {
			var mode = this.modes[this.modes.length - 1];
			if(end){
				this.result.push(this.processKeywords(mode.buffer + buffer));
				return;
			}
			if(this.isIllegal(lexeme)){ throw 'Illegal'; }
			var newMode = this.subMode(lexeme);
			if(newMode){
				mode.buffer += buffer;
				this.result.push(this.processKeywords(mode.buffer));
				if(newMode.excludeBegin){
					this.result.push(lexeme + '<span class="' + newMode.className + '">');
					newMode.buffer = '';
				}else{
					this.result.push('<span class="' + newMode.className + '">');
					newMode.buffer = lexeme;
				}
				this.modes.push(newMode);
				this.relevance += typeof newMode.relevance == "number" ? newMode.relevance : 1;
				return;
			}
			var endLevel = this.endOfMode(lexeme);
			if(endLevel){
				mode.buffer += buffer;
				if(mode.excludeEnd){
					this.result.push(this.processKeywords(mode.buffer) + '</span>' + lexeme);
				}else{
					this.result.push(this.processKeywords(mode.buffer + lexeme) + '</span>');
				}
				while(endLevel > 1){
					this.result.push('</span>');
					--endLevel;
					this.modes.pop();
				}
				this.modes.pop();
				this.modes[this.modes.length - 1].buffer = '';
				return;
			}
		},
	
		highlight: function(value){
			var index = 0;
			this.lang.defaultMode.buffer = '';
			do{
				var modeInfo = this.eatModeChunk(value, index);
				this.processModeInfo(modeInfo.buffer, modeInfo.lexeme, modeInfo.end);
				index += modeInfo.buffer.length + modeInfo.lexeme.length;
			}while(!modeInfo.end);
			if(this.modes.length > 1){
				throw 'Illegal';
			}
		}
	});
	
	// more utilities
	
	function replaceText(node, className, text){
		if(String(node.tagName).toLowerCase() == "code" && String(node.parentNode.tagName).toLowerCase() == "pre"){
			// See these 4 lines? This is IE's notion of "node.innerHTML = text". Love this browser :-/
			var container = document.createElement('div'),
				environment = node.parentNode.parentNode;
			container.innerHTML = '<pre><code class="' + className + '">' + text + '</code></pre>';
			environment.replaceChild(container.firstChild, node.parentNode);
		}else{
			node.className = className;
			node.innerHTML = text;
		}
	}
	function highlightStringLanguage(language, str){
		var highlight = new Highlighter(language, str);
		return {result:highlight.result, langName:language, partialResult:highlight.partialResult};
	}

	function highlightLanguage(block, language){
		var result = highlightStringLanguage(language, blockText(block));
		replaceText(block, block.className, result.result);
	}

	function highlightStringAuto(str){
		var result = "", langName = "", bestRelevance = 2,
			textBlock = str;
		for(var key in dh.languages){
			if(!dh.languages[key].defaultMode){ continue; }	// skip internal members
			var highlight = new Highlighter(key, textBlock),
				relevance = highlight.keywordCount + highlight.relevance, relevanceMax = 0;
			if(!result || relevance > relevanceMax){
				relevanceMax = relevance;
				result = highlight.result;
				langName = highlight.langName;
			}
		}
		return {result:result, langName:langName};
	}
	
	function highlightAuto(block){
		var result = highlightStringAuto(blockText(block));
		if(result.result){
			replaceText(block, result.langName, result.result);
		}
	}
	
	// the public API

	dojox.highlight.processString = function(/* String */ str, /* String? */lang){
		// summary:
		//		highlight a string of text
		// returns: Object
		//		Object containing:
		//
		//		- result - string of html with spans to apply formatting
		//		- partialResult - if the formatting failed: string of html
		//		  up to the point of the failure, otherwise: undefined
		//		- langName - the language used to do the formatting
		return lang ? highlightStringLanguage(lang, str) : highlightStringAuto(str);
	};

	dojox.highlight.init = function(/* String|DomNode */ node){
		// summary:
		//		Highlight a passed node
		// description:
		//		Syntax highlight a passed DomNode or String ID of a DomNode
		// example:
		//	|	dojox.highlight.init("someId");
		//
		node = dom.byId(node);
		if(domClass.contains(node, "no-highlight")){ return; }
		if(!verifyText(node)){ return; }
	
		var classes = node.className.split(/\s+/),
			flag = array.some(classes, function(className){
				if(className.charAt(0) != "_" && dh.languages[className]){
					highlightLanguage(node, className);
					return true;	// stop iterations
				}
				return false;	// continue iterations
			});
		if(!flag){
			highlightAuto(node);
		}
	};

	dh.Code = function(props, node){
		// summary:
		//		A class object to allow for dojoType usage with the highlight engine. This is
		//		NOT a Widget in the conventional sense, and does not have any member functions for
		//		the instance. This is provided as a convenience. You likely should be calling
		//		`dojox.highlight.init` directly.
		// props: Object?
		//		Unused. Pass 'null' or {}. Positional usage to allow `dojo.parser` to instantiate
		//		this class as other Widgets would be.
		// node: String|DomNode
		//		A String ID or DomNode reference to use as the root node of this instance.
		// example:
		//	|	<pre><code dojoType="dojox.highlight.Code">for(var i in obj){ ... }</code></pre>
		//
		// example:
		//	|	var inst = new dojox.highlight.Code({}, "someId");
		//
		dh.init(node);
	};

	return dh;

});
