define([
	"dojo/_base/array",
	"dojo/_base/lang", // lang.setObject
	"dojo/sniff" // has("ie")
], function(array, lang, has){

	// module:
	//		dijit/_editor/html

	var exports = {
		// summary:
		//		HTML serialization utility functions used by editor
	};
	lang.setObject("dijit._editor.html", exports);

	var escape = exports.escapeXml = function(/*String*/ str, /*Boolean?*/ noSingleQuotes){
		// summary:
		//		Adds escape sequences for special characters in XML: `&<>"'`.
		//		Optionally skips escapes for single quotes.
		str = str.replace(/&/gm, "&amp;").replace(/</gm, "&lt;").replace(/>/gm, "&gt;").replace(/"/gm, "&quot;");
		if(!noSingleQuotes){
			str = str.replace(/'/gm, "&#39;");
		}
		return str; // string
	};

	exports.getNodeHtml = function(/*DomNode*/ node){
		// summary:
		//		Return string representing HTML for node and it's children
		var output = [];
		exports.getNodeHtmlHelper(node, output);
		return output.join("");
	};

	exports.getNodeHtmlHelper = function(/*DomNode*/ node, /*String[]*/ output){
		// summary:
		//		Pushes array of strings into output[] which represent HTML for node and it's children
		switch(node.nodeType){
			case 1: // element node
				var lName = node.nodeName.toLowerCase();
				if(!lName || lName.charAt(0) == "/"){
					// IE does some strange things with malformed HTML input, like
					// treating a close tag </span> without an open tag <span>, as
					// a new tag with tagName of /span.  Corrupts output HTML, remove
					// them.  Other browsers don't prefix tags that way, so will
					// never show up.
					return "";
				}
				output.push('<', lName);

				// store the list of attributes and sort it to have the
				// attributes appear in the dictionary order
				var attrarray = [], attrhash = {};
				var attr;
				if(has("dom-attributes-explicit") || has("dom-attributes-specified-flag")){
					// IE8+ and all other browsers.
					var i = 0;
					while((attr = node.attributes[i++])){
						// ignore all attributes starting with _dj which are
						// internal temporary attributes used by the editor
						var n = attr.name;
						if(n.substr(0, 3) !== '_dj' &&
							(!has("dom-attributes-specified-flag") || attr.specified) && !(n in attrhash)){    // workaround repeated attributes bug in IE8 (LinkDialog test)
							var v = attr.value;
							if(n == 'src' || n == 'href'){
								if(node.getAttribute('_djrealurl')){
									v = node.getAttribute('_djrealurl');
								}
							}
							if(has("ie") === 8 && n === "style"){
								v = v.replace("HEIGHT:", "height:").replace("WIDTH:", "width:");
							}
							attrarray.push([n, v]);
							attrhash[n] = v;
						}
					}
				}else{
					// IE6-7 code path
					var clone = /^input$|^img$/i.test(node.nodeName) ? node : node.cloneNode(false);
					var s = clone.outerHTML;
					// Split up and manage the attrs via regexp
					// similar to prettyPrint attr logic.
					var rgxp_attrsMatch = /[\w-]+=("[^"]*"|'[^']*'|\S*)/gi
					var attrSplit = s.match(rgxp_attrsMatch);
					s = s.substr(0, s.indexOf('>'));
					array.forEach(attrSplit, function(attr){
						if(attr){
							var idx = attr.indexOf("=");
							if(idx > 0){
								var key = attr.substring(0, idx);
								if(key.substr(0, 3) != '_dj'){
									if(key == 'src' || key == 'href'){
										if(node.getAttribute('_djrealurl')){
											attrarray.push([key, node.getAttribute('_djrealurl')]);
											return;
										}
									}
									var val, match;
									switch(key){
										case 'style':
											val = node.style.cssText.toLowerCase();
											break;
										case 'class':
											val = node.className;
											break;
										case 'width':
											if(lName === "img"){
												// This somehow gets lost on IE for IMG tags and the like
												// and we have to find it in outerHTML, known IE oddity.
												match = /width=(\S+)/i.exec(s);
												if(match){
													val = match[1];
												}
												break;
											}
										case 'height':
											if(lName === "img"){
												// This somehow gets lost on IE for IMG tags and the like
												// and we have to find it in outerHTML, known IE oddity.
												match = /height=(\S+)/i.exec(s);
												if(match){
													val = match[1];
												}
												break;
											}
										default:
											val = node.getAttribute(key);
									}
									if(val != null){
										attrarray.push([key, val.toString()]);
									}
								}
							}
						}
					}, this);
				}
				attrarray.sort(function(a, b){
					return a[0] < b[0] ? -1 : (a[0] == b[0] ? 0 : 1);
				});
				var j = 0;
				while((attr = attrarray[j++])){
					output.push(' ', attr[0], '="',
						(typeof attr[1] === "string" ? escape(attr[1], true) : attr[1]), '"');
				}
				switch(lName){
					case 'br':
					case 'hr':
					case 'img':
					case 'input':
					case 'base':
					case 'meta':
					case 'area':
					case 'basefont':
						// These should all be singly closed
						output.push(' />');
						break;
					case 'script':
						// Browsers handle script tags differently in how you get content,
						// but innerHTML always seems to work, so insert its content that way
						// Yes, it's bad to allow script tags in the editor code, but some people
						// seem to want to do it, so we need to at least return them right.
						// other plugins/filters can strip them.
						output.push('>', node.innerHTML, '</', lName, '>');
						break;
					default:
						output.push('>');
						if(node.hasChildNodes()){
							exports.getChildrenHtmlHelper(node, output);
						}
						output.push('</', lName, '>');
				}
				break;
			case 4: // cdata
			case 3: // text
				// FIXME:
				output.push(escape(node.nodeValue, true));
				break;
			case 8: // comment
				// FIXME:
				output.push('<!--', escape(node.nodeValue, true), '-->');
				break;
			default:
				output.push("<!-- Element not recognized - Type: ", node.nodeType, " Name: ", node.nodeName, "-->");
		}
	};

	exports.getChildrenHtml = function(/*DomNode*/ node){
		// summary:
		//		Returns the html content of a DomNode's children
		var output = [];
		exports.getChildrenHtmlHelper(node, output);
		return output.join("");
	};

	exports.getChildrenHtmlHelper = function(/*DomNode*/ dom, /*String[]*/ output){
		// summary:
		//		Pushes the html content of a DomNode's children into out[]

		if(!dom){
			return;
		}
		var nodes = dom["childNodes"] || dom;

		// IE issue.
		// If we have an actual node we can check parent relationships on for IE,
		// We should check, as IE sometimes builds invalid DOMS.  If no parent, we can't check
		// And should just process it and hope for the best.
		var checkParent = !has("ie") || nodes !== dom;

		var node, i = 0;
		while((node = nodes[i++])){
			// IE is broken.  DOMs are supposed to be a tree.  But in the case of malformed HTML, IE generates a graph
			// meaning one node ends up with multiple references (multiple parents).  This is totally wrong and invalid, but
			// such is what it is.  We have to keep track and check for this because otherwise the source output HTML will have dups.
			// No other browser generates a graph.  Leave it to IE to break a fundamental DOM rule.  So, we check the parent if we can
			// If we can't, nothing more we can do other than walk it.
			if(!checkParent || node.parentNode == dom){
				exports.getNodeHtmlHelper(node, output);
			}
		}
	};

	return exports;
});
