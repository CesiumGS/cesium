define(["dojo/_base/kernel", "dojo/_base/lang", "dojox/xml/parser"], 
  function(kernel, lang, xmlParser) {

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

//This file contains internal/helper APIs as holders for people who used them.  They have been migrated to
//a better project, dojox.xml and experimental has been removed there.  Please update usage to the new package.
dojo.deprecated("dojox.data.dom", "Use dojox.xml.parser instead.", "2.0");

var dataDom = lang.getObject("dojox.data.dom",true);

dataDom.createDocument = function(/*string?*/ str, /*string?*/ mimetype){
	// summary:
	//		cross-browser implementation of creating an XML document object.
	// str:
	//		Optional text to create the document from.  If not provided, an empty XML document will be created.
	//		If str is empty string "", then a new empty document will be created.
	// mimetype:
	//		Optional mimetype of the text.  Typically, this is text/xml.  Will be defaulted to text/xml if not provided.
	dojo.deprecated("dojox.data.dom.createDocument()", "Use dojox.xml.parser.parse() instead.", "2.0");
	try{
		return xmlParser.parse(str,mimetype); //DOMDocument.
	}catch(e){
		/*Squeltch errors like the old parser did.*/
		return null;
	}
};

dataDom.textContent = function(/*Node*/node, /*string?*/text){
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
	dojo.deprecated("dojox.data.dom.textContent()", "Use dojox.xml.parser.textContent() instead.", "2.0");
	if(arguments.length> 1){
		return xmlParser.textContent(node, text); //string
	}else{
		return xmlParser.textContent(node); //string
	}
};

dataDom.replaceChildren = function(/*Element*/node, /*Node|Array*/ newChildren){
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
	dojo.deprecated("dojox.data.dom.replaceChildren()", "Use dojox.xml.parser.replaceChildren() instead.", "2.0");
	xmlParser.replaceChildren(node, newChildren);
};

dataDom.removeChildren = function(/*Element*/node){
	// summary:
	//		removes all children from node and returns the count of children removed.
	//		The children nodes are not destroyed. Be sure to call dojo._destroyElement on them
	//		after they are not used anymore.
	// node:
	//		The node to remove all the children from.
	dojo.deprecated("dojox.data.dom.removeChildren()", "Use dojox.xml.parser.removeChildren() instead.", "2.0");
	return dojox.xml.parser.removeChildren(node); //int
};

dataDom.innerXML = function(/*Node*/node){
	// summary:
	//		Implementation of MS's innerXML function.
	// node:
	//		The node from which to generate the XML text representation.
	dojo.deprecated("dojox.data.dom.innerXML()", "Use dojox.xml.parser.innerXML() instead.", "2.0");
	return xmlParser.innerXML(node); //string||null
};

return dataDom;

});

