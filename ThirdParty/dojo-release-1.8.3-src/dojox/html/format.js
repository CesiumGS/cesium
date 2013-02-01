define(["dojo/_base/kernel", "./entities", "dojo/_base/array", "dojo/_base/window", "dojo/_base/sniff"], 
	function(lang, Entities, ArrayUtil, Window, has) {
	var dhf = lang.getObject("dojox.html.format",true);
	
	dhf.prettyPrint = function(html/*String*/, indentBy /*Integer?*/, maxLineLength /*Integer?*/, map/*Array?*/, /*boolean*/ xhtml){
		// summary:
		//		Function for providing a 'pretty print' version of HTML content from
		//		the provided string.  It's nor perfect by any means, but it does
		//		a 'reasonable job'.
		// html: String
		//		The string of HTML to try and generate a 'pretty' formatting.
		// indentBy:  Integer
		//		Optional input for the number of spaces to use when indenting.
		//		If not defined, zero, negative, or greater than 10, will just use tab
		//		as the indent.
		// maxLineLength: Integer
		//		Optional input for the number of characters a text line should use in
		//		the document, including the indent if possible.
		// map:	Array
		//		Optional array of entity mapping characters to use when processing the
		//		HTML Text content.  By default it uses the default set used by the
		//		dojox.html.entities.encode function.
		// xhtml: boolean
		//		Optional parameter that declares that the returned HTML should try to be 'xhtml' compatible.
		//		This means normally unclosed tags are terminated with /> instead of >.  Example: `<hr>` -> `<hr />`
		var content = [];
		var indentDepth = 0;
		var closeTags = [];
		var iTxt = "\t";
		var textContent = "";
		var inlineStyle = [];
		var i;
	
		// Compile regexps once for this call.
		var rgxp_fixIEAttrs = /[=]([^"']+?)(\s|>)/g;
		var rgxp_styleMatch = /style=("[^"]*"|'[^']*'|\S*)/gi;
		var rgxp_attrsMatch = /[\w-]+=("[^"]*"|'[^']*'|\S*)/gi;
	
		// Check to see if we want to use spaces for indent instead
		// of tab.
		if(indentBy && indentBy > 0 && indentBy < 10){
			iTxt = "";
			for(i = 0; i < indentBy; i++){
				iTxt += " ";
			}
		}
	
		//Build the content outside of the editor so we can walk
		//via DOM and build a 'pretty' output.
		var contentDiv = Window.doc.createElement("div");
		contentDiv.innerHTML = html;
	
		// Use the entity encode/decode functions, they cache on the map,
		// so it won't multiprocess a map.
		var encode = Entities.encode;
		var decode = Entities.decode;
	
		/** Define a bunch of formatters to format the output. **/
		var isInlineFormat = function(tag){
			// summary:
			//		Function to determine if the current tag is an inline
			//		element that does formatting, as we don't want to
			//		break/indent around it, as it can screw up text.
			// tag:
			//		The tag to examine
			switch(tag){
				case "a":
				case "b":
				case "strong":
				case "s":
				case "strike":
				case "i":
				case "u":
				case "em":
				case "sup":
				case "sub":
				case "span":
				case "font":
				case "big":
				case "cite":
				case "q":
				case "small":
					return true;
				default:
					return false;
			}
		};
	
		//Create less divs.
		var div = contentDiv.ownerDocument.createElement("div");
		var outerHTML =  function(node){
			// summary:
			//		Function to return the outer HTML of a node.
			//		Yes, IE has a function like this, but using cloneNode
			//		allows avoiding looking at any child nodes, because in this
			//		case, we don't want them.
			var clone = node.cloneNode(false);
			div.appendChild(clone);
			var html = div.innerHTML;
			div.innerHTML = "";
			return html;
		};
	
		var sizeIndent = function(){
			var i, txt = "";
			for(i = 0; i < indentDepth; i++){
				txt += iTxt;
			}
			return txt.length;
		}
	
		var indent = function(){
			// summary:
			//		Function to handle indent depth.
			var i;
			for(i = 0; i < indentDepth; i++){
				content.push(iTxt);
			}
		};
		var newline = function(){
			// summary:
			//		Function to handle newlining.
			content.push("\n");
		};
	
		var processTextNode = function(n){
			// summary:
			//		Function to process the text content for doc
			//		insertion
			// n:
			//		The text node to process.
			textContent += encode(n.nodeValue, map);
		};
	
		var formatText = function(txt){
			// summary:
			//		Function for processing the text content encountered up to a
			//		point and inserting it into the formatted document output.
			// txt:
			//		The text to format.
			var i;
			var _iTxt;
	
			// Clean up any indention organization since we're going to rework it
			// anyway.
			var _lines = txt.split("\n");
			for(i = 0; i < _lines.length; i++){
				_lines[i] = lang.trim(_lines[i]);
			}
			txt = _lines.join(" ");
			txt = lang.trim(txt);
			if(txt !== ""){
				var lines = [];
				if(maxLineLength && maxLineLength > 0){
					var indentSize = sizeIndent();
					var maxLine = maxLineLength;
					if(maxLineLength > indentSize){
						maxLine -= indentSize;
					}
					while(txt){
						if(txt.length > maxLineLength){
							for(i = maxLine; (i > 0 && txt.charAt(i) !== " "); i--){
								// Do nothing, we're just looking for a space to split at.
							}
							if(!i){
								// Couldn't find a split going back, so go forward.
								for(i = maxLine; (i < txt.length && txt.charAt(i) !== " "); i++){
									// Do nothing, we're just looking for a space to split at.
								}
							}
							var line = txt.substring(0, i);
							line = lang.trim(line);
							// Shift up the text string to the next chunk.
							txt = lang.trim(txt.substring((i == txt.length)?txt.length:i + 1, txt.length));
							if(line){
								_iTxt = "";
								for(i = 0; i < indentDepth; i++){
									_iTxt += iTxt;
								}
								line = _iTxt + line + "\n";
							}
							lines.push(line);
						}else{
							// Line is shorter than out desired length, so use it.
							// as/is
							_iTxt = "";
							for(i = 0; i < indentDepth; i++){
								_iTxt += iTxt;
							}
							txt = _iTxt + txt + "\n";
							lines.push(txt);
							txt = null;
						}
					}
					return lines.join("");
				}else{
					_iTxt = "";
					for(i = 0; i < indentDepth; i++){
						_iTxt += iTxt;
					}
					txt = _iTxt + txt + "\n";
					return txt;
				}
			}else{
				return "";
			}
		};
	
		var processScriptText = function(txt){
			// summary:
			//		Function to clean up potential escapes in the script code.
			if(txt){
				txt = txt.replace(/&quot;/gi, "\"");
				txt = txt.replace(/&gt;/gi, ">");
				txt = txt.replace(/&lt;/gi, "<");
				txt = txt.replace(/&amp;/gi, "&");
			}
			return txt;
		};
	
		var formatScript = function(txt){
			// summary:
			//		Function to rudimentary formatting of script text.
			//		Not perfect, but it helps get some level of organization
			//		in there.
			// txt:
			//		The script text to try to format a bit.
			if(txt){
				txt = processScriptText(txt);
				var i, t, c, _iTxt;
				var indent = 0;
				var scriptLines = txt.split("\n");
				var newLines = [];
				for (i = 0; i < scriptLines.length; i++){
					var line = scriptLines[i];
					var hasNewlines = (line.indexOf("\n") > -1);
					line = lang.trim(line);
					if(line){
						var iLevel = indent;
						// Not all blank, so we need to process.
						for(c = 0; c < line.length; c++){
							var ch = line.charAt(c);
							if(ch === "{"){
								indent++;
							}else if(ch === "}"){
								indent--;
								// We want to back up a bit before the
								// line is written.
								iLevel = indent;
							}
						}
						_iTxt = "";
						for(t = 0; t < indentDepth + iLevel; t++){
							_iTxt += iTxt;
						}
						newLines.push(_iTxt + line + "\n");
					}else if(hasNewlines && i === 0){
						// Just insert a newline for blank lines as
						// long as it's not the first newline (we
						// already inserted that in the openTag handler)
						newLines.push("\n");
					}
	
				}
				// Okay, create the script text, hopefully reasonably
				// formatted.
				txt = newLines.join("");
			}
			return txt;
		};
	
		var openTag = function(node){
			// summary:
			//		Function to open a new tag for writing content.
			var name = node.nodeName.toLowerCase();
			// Generate the outer node content (tag with attrs)
			var nText = lang.trim(outerHTML(node));
			var tag = nText.substring(0, nText.indexOf(">") + 1);
	
			// Also thanks to IE, we need to check for quotes around
			// attributes and insert if missing.
			tag = tag.replace(rgxp_fixIEAttrs,'="$1"$2');
	
			// And lastly, thanks IE for changing style casing and end
			// semi-colon and webkit adds spaces, so lets clean it up by
			// sorting, etc, while we're at it.
			tag = tag.replace(rgxp_styleMatch, function(match){
				var sL = match.substring(0,6);
				var style = match.substring(6, match.length);
				var closure = style.charAt(0);
				style = lang.trim(style.substring(1,style.length -1));
				style = style.split(";");
				var trimmedStyles = [];
				ArrayUtil.forEach(style, function(s){
					s = lang.trim(s);
					if(s){
						// Lower case the style name, leave the value alone.  Mainly a fixup for IE.
						s = s.substring(0, s.indexOf(":")).toLowerCase() + s.substring(s.indexOf(":"), s.length);
						trimmedStyles.push(s);
					}
				});
				trimmedStyles = trimmedStyles.sort();
				
				// Reassemble and return the styles in sorted order.
				style = trimmedStyles.join("; ");
				var ts = lang.trim(style);
				if(!ts || ts === ";"){
					// Just remove any style attrs that are empty.
					return "";
				}else{
					style += ";";
					return sL + closure + style + closure;
				}
			});
	
			// Try and sort the attributes while we're at it.
			var attrs = [];
			tag = tag.replace(rgxp_attrsMatch, function(attr){
				attrs.push(lang.trim(attr));
				return "";
			});
			attrs = attrs.sort();
	
			// Reassemble the tag with sorted attributes!
			tag = "<" + name;
			if(attrs.length){
				 tag += " " + attrs.join(" ");
			}
	
			// Determine closure status.  If xhtml,
			// then close the tag properly as needed.
			if(nText.indexOf("</") != -1){
				closeTags.push(name);
				tag += ">";
			}else{
				if(xhtml){
					tag += " />";
				}else{
					tag += ">";
				}
				closeTags.push(false);
			}
	
			var inline = isInlineFormat(name);
			inlineStyle.push(inline);
			if(textContent && !inline){
				// Process any text content we have that occurred
				// before the open tag of a non-inline.
				content.push(formatText(textContent));
				textContent = "";
			}
	
			// Determine if this has a closing tag or not!
			if(!inline){
				indent();
				content.push(tag);
				newline();
				indentDepth++;
			}else{
				textContent += tag;
			}
			
		};
		
		var closeTag = function(){
			// summary:
			//		Function to close out a tag if necessary.
			var inline = inlineStyle.pop();
			if(textContent && !inline){
				// Process any text content we have that occurred
				// before the close tag.
				content.push(formatText(textContent));
				textContent = "";
			}
			var ct = closeTags.pop();
			if(ct){
				ct = "</" + ct + ">";
				if(!inline){
					indentDepth--;
					indent();
					content.push(ct);
					newline();
				}else{
					textContent += ct;
				}
			}else{
				indentDepth--;
			}
		};
	
		var processCommentNode = function(n){
			// summary:
			//		Function to handle processing a comment node.
			// n:
			//		The comment node to process.
	
			//Make sure contents aren't double-encoded.
			var commentText = decode(n.nodeValue, map);
			indent();
			content.push("<!--");
			newline();
			indentDepth++;
			content.push(formatText(commentText));
			indentDepth--;
			indent();
			content.push("-->");
			newline();
		};
	
		var processNode = function(node) {
			// summary:
			//		Entrypoint for processing all the text!
			var children = node.childNodes;
			if(children){
				var i;
				for(i = 0; i < children.length; i++){
					var n = children[i];
					if(n.nodeType === 1){
						var tg = lang.trim(n.tagName.toLowerCase());
						if(has("ie") && n.parentNode != node){
							// IE is broken.  DOMs are supposed to be a tree.
							// But in the case of malformed HTML, IE generates a graph
							// meaning one node ends up with multiple references
							// (multiple parents).  This is totally wrong and invalid, but
							// such is what it is.  We have to keep track and check for
							// this because otherwise the source output HTML will have dups.
							continue;
						}
						if(tg && tg.charAt(0) === "/"){
							// IE oddity.  Malformed HTML can put in odd tags like:
							// </ >, </span>.  It treats a mismatched closure as a new
							// start tag.  So, remove them.
							continue;
						}else{
							//Process non-dup, seemingly wellformed elements!
							openTag(n);
							if(tg === "script"){
								content.push(formatScript(n.innerHTML));
							}else if(tg === "pre"){
								var preTxt = n.innerHTML;
								if(has("mozilla")){
									//Mozilla screws this up, so fix it up.
									preTxt = preTxt.replace("<br>", "\n");
									preTxt = preTxt.replace("<pre>", "");
									preTxt = preTxt.replace("</pre>", "");
								}
								// Add ending newline, if needed.
								if(preTxt.charAt(preTxt.length - 1) !== "\n"){
									preTxt += "\n";
								}
								content.push(preTxt);
							}else{
								processNode(n);
							}
							closeTag();
						}
					}else if(n.nodeType === 3 || n.nodeType === 4){
						processTextNode(n);
					}else if(n.nodeType === 8){
						processCommentNode(n);
					}
				}
			}
		};
	
		//Okay, finally process the input string.
		processNode(contentDiv);
		if(textContent){
			// Insert any trailing text.  See: #10854
			content.push(formatText(textContent));
			textContent = "";
		}
		return content.join(""); //String
	};
	return dhf;
});

