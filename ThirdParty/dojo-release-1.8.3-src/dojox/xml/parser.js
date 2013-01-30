define(['dojo/_base/kernel', 'dojo/_base/lang', 'dojo/_base/array', 'dojo/_base/window', 'dojo/_base/sniff'], function(dojo){

dojo.getObject("xml.parser", true, dojox);

//DOM type to int value for reference.
//Ints make for more compact code than full constant names.
//ELEMENT_NODE                  = 1;
//ATTRIBUTE_NODE                = 2;
//TEXT_NODE                     = 3;
//CDATA_SECTION_NODE            = 4;
//ENTITY_REFERENCE_NODE         = 5;
//ENTITY_NODE                   = 6;
//PROCESSING_INSTRUCTION_NODE   = 7;
//COMMENT_NODE                  = 8;
//DOCUMENT_NODE                 = 9;
//DOCUMENT_TYPE_NODE            = 10;
//DOCUMENT_FRAGMENT_NODE        = 11;
//NOTATION_NODE                 = 12;

dojox.xml.parser.parse = function(/*String?*/ str, /*String?*/ mimetype){
	// summary:
	//		cross-browser implementation of creating an XML document object from null, empty string, and XML text..
	//
	// str:
	//		Optional text to create the document from.  If not provided, an empty XML document will be created.
	//		If str is empty string "", then a new empty document will be created.
	// mimetype:
	//		Optional mimetype of the text.  Typically, this is text/xml.  Will be defaulted to text/xml if not provided.
	var _document = dojo.doc;
	var doc;

	mimetype = mimetype || "text/xml";
	if(str && dojo.trim(str) && "DOMParser" in dojo.global){
		//Handle parsing the text on Mozilla based browsers etc..
		var parser = new DOMParser();
		doc = parser.parseFromString(str, mimetype);
		var de = doc.documentElement;
		var errorNS = "http://www.mozilla.org/newlayout/xml/parsererror.xml";
		if(de.nodeName == "parsererror" && de.namespaceURI == errorNS){
			var sourceText = de.getElementsByTagNameNS(errorNS, 'sourcetext')[0];
			if(sourceText){
				sourceText = sourceText.firstChild.data;
			}
        	throw new Error("Error parsing text " + de.firstChild.data + " \n" + sourceText);
		}
		return doc;

	}else if("ActiveXObject" in dojo.global){
		//Handle IE.
		var ms = function(n){ return "MSXML" + n + ".DOMDocument"; };
		var dp = ["Microsoft.XMLDOM", ms(6), ms(4), ms(3), ms(2)];
		dojo.some(dp, function(p){
			try{
				doc = new ActiveXObject(p);
			}catch(e){ return false; }
			return true;
		});
		if(str && doc){
			doc.async = false;
			doc.loadXML(str);
			var pe = doc.parseError;
			if(pe.errorCode !== 0){
				throw new Error("Line: " + pe.line + "\n" +
					"Col: " + pe.linepos + "\n" +
					"Reason: " + pe.reason + "\n" +
					"Error Code: " + pe.errorCode + "\n" +
					"Source: " + pe.srcText);
			}
		}
		if(doc){
			return doc; //DOMDocument
		}
	}else if(_document.implementation && _document.implementation.createDocument){
		if(str && dojo.trim(str) && _document.createElement){
			//Everyone else that we couldn't get to work.  Fallback case.
			// FIXME: this may change all tags to uppercase!
			var tmp = _document.createElement("xml");
			tmp.innerHTML = str;
			var xmlDoc = _document.implementation.createDocument("foo", "", null);
			dojo.forEach(tmp.childNodes, function(child){
				xmlDoc.importNode(child, true);
			});
			return xmlDoc;	//	DOMDocument
		}else{
			return _document.implementation.createDocument("", "", null); // DOMDocument
		}
	}
	return null;	//	null
};

dojox.xml.parser.textContent = function(/*Node*/node, /*String?*/text){
	// summary:
	//		Implementation of the DOM Level 3 attribute; scan node for text
	// description:
	//		Implementation of the DOM Level 3 attribute; scan node for text
	//		This function can also update the text of a node by replacing all child
	//		content of the node.
	// node:
	//		The node to get the text off of or set the text on.
	// text:
	//		Optional argument of the text to apply to the node.
	if(arguments.length>1){
		var _document = node.ownerDocument || dojo.doc;  //Preference is to get the node owning doc first or it may fail
		dojox.xml.parser.replaceChildren(node, _document.createTextNode(text));
		return text;	//	String
	}else{
		if(node.textContent !== undefined){ //FF 1.5 -- remove?
			return node.textContent;	//	String
		}
		var _result = "";
		if(node){
			dojo.forEach(node.childNodes, function(child){
				switch(child.nodeType){
					case 1: // ELEMENT_NODE
					case 5: // ENTITY_REFERENCE_NODE
						_result += dojox.xml.parser.textContent(child);
						break;
					case 3: // TEXT_NODE
					case 2: // ATTRIBUTE_NODE
					case 4: // CDATA_SECTION_NODE
						_result += child.nodeValue;
				}
			});
		}
		return _result;	//	String
	}
};

dojox.xml.parser.replaceChildren = function(/*Element*/node, /*Node|Array*/ newChildren){
	// summary:
	//		Removes all children of node and appends newChild. All the existing
	//		children will be destroyed.
	// description:
	//		Removes all children of node and appends newChild. All the existing
	//		children will be destroyed.
	// node:
	//		The node to modify the children on
	// newChildren:
	//		The children to add to the node.  It can either be a single Node or an
	//		array of Nodes.
	var nodes = [];

	if(dojo.isIE){
		dojo.forEach(node.childNodes, function(child){
			nodes.push(child);
		});
	}

	dojox.xml.parser.removeChildren(node);
	dojo.forEach(nodes, dojo.destroy);

	if(!dojo.isArray(newChildren)){
		node.appendChild(newChildren);
	}else{
		dojo.forEach(newChildren, function(child){
			node.appendChild(child);
		});
	}
};

dojox.xml.parser.removeChildren = function(/*Element*/node){
	// summary:
	//		removes all children from node and returns the count of children removed.
	//		The children nodes are not destroyed. Be sure to call dojo.destroy on them
	//		after they are not used anymore.
	// node:
	//		The node to remove all the children from.
	var count = node.childNodes.length;
	while(node.hasChildNodes()){
		node.removeChild(node.firstChild);
	}
	return count; // int
};


dojox.xml.parser.innerXML = function(/*Node*/node){
	// summary:
	//		Implementation of MS's innerXML function.
	// node:
	//		The node from which to generate the XML text representation.
	if(node.innerXML){
		return node.innerXML;	//	String
	}else if(node.xml){
		return node.xml;		//	String
	}else if(typeof XMLSerializer != "undefined"){
		return (new XMLSerializer()).serializeToString(node);	//	String
	}
	return null;
};

return dojox.xml.parser;

});
