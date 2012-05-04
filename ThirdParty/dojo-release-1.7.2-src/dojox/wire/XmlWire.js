dojo.provide("dojox.wire.XmlWire");

dojo.require("dojox.xml.parser");
dojo.require("dojox.wire.Wire");

dojo.declare("dojox.wire.XmlWire", dojox.wire.Wire, {
	//	summary:
	//		A Wire for XML nodes or values (element, attribute and text)
	//	description:
	//		This class accesses XML nodes or value with a simplified XPath
	//		specified to 'path' property.
	//		The root object for this class must be an DOM document or element
	//		node.
	//		"@name" accesses to an attribute value of an element and "text()"
	//		accesses to a text value of an element.
	//		The hierarchy of the elements from the root node can be specified
	//		with slash-separated list, such as "a/b/@c", which specifies
	//		the value of an attribute named "c" of an element named "b" as
	//		a child of another element named "a" of a child of the root node.
	
	_wireClass: "dojox.wire.XmlWire",
	
	constructor: function(/*Object*/args){
		//	summary:
		//		Initialize properties
		//	description:
		//		'args' is just mixed in with no further processing.
		//	args:
		//		Arguments to initialize properties
		//		path:
		//			A simplified XPath to an attribute, a text or elements
	},
	_getValue: function(/*Node*/object){
		//	summary:
		//		Return an attribute value, a text value or an array of elements
		//	description:
		//		This method first uses a root node passed in 'object' argument
		//		and 'path' property to identify an attribute, a text or
		//		elements.
		//		If 'path' starts with a slash (absolute), the first path
		//		segment is ignored assuming it point to the root node.
		//		(That is, "/a/b/@c" and "b/@c" against a root node access
		//		the same attribute value, assuming the root node is an element
		//		with a tag name, "a".)
		//	object:
		//		A root node
		//	returns:
		//		A value found, otherwise 'undefined'
		if(!object || !this.path){
			return object; //Node
		}

		var node = object;
		var path = this.path;
		var i;
		if(path.charAt(0) == '/'){ // absolute
			// skip the first expression (supposed to select the top node)
			i = path.indexOf('/', 1);
			path = path.substring(i + 1);
		}
		var list = path.split('/');
		var last = list.length - 1;
		for(i = 0; i < last; i++){
			node = this._getChildNode(node, list[i]);
			if(!node){
				return undefined; //undefined
			}
		}
		var value = this._getNodeValue(node, list[last]);
		return value; //String||Array
	},

	_setValue: function(/*Node*/object, /*String*/value){
		//	summary:
		//		Set an attribute value or a child text value to an element
		//	description:
		//		This method first uses a root node passed in 'object' argument
		//		and 'path' property to identify an attribute, a text or
		//		elements.
		//		If an intermediate element does not exist, it creates
		//		an element of the tag name in the 'path' segment as a child
		//		node of the current node.
		//		Finally, 'value' argument is set to an attribute or a text
		//		(a child node) of the leaf element.
		//	object:
		//		A root node
		//	value:
		//		A value to set
		if(!this.path){
			return object; //Node
		}

		var node = object;
		var doc = this._getDocument(node);
		var path = this.path;
		var i;
		if(path.charAt(0) == '/'){ // absolute
			i = path.indexOf('/', 1);
			if(!node){
				var name = path.substring(1, i);
				node = doc.createElement(name);
				object = node; // to be returned as a new object
			}
			// skip the first expression (supposed to select the top node)
			path = path.substring(i + 1);
		}else{
			if(!node){
				return undefined; //undefined
			}
		}

		var list = path.split('/');
		var last = list.length - 1;
		for(i = 0; i < last; i++){
			var child = this._getChildNode(node, list[i]);
			if(!child){
				child = doc.createElement(list[i]);
				node.appendChild(child);
			}
			node = child;
		}
		this._setNodeValue(node, list[last], value);
		return object; //Node
	},

	_getNodeValue: function(/*Node*/node, /*String*/exp){
		//	summary:
		//		Return an attribute value, a text value or an array of elements
		//	description:
		//		If 'exp' starts with '@', an attribute value of the specified
		//		attribute is returned.
		//		If 'exp' is "text()", a child text value is returned.
		//		Otherwise, an array of child elements, the tag name of which
		//		match 'exp', is returned.
		//	node:
		//		A node
		//	exp:
		//		An expression for attribute, text or elements
		//	returns:
		//		A value found, otherwise 'undefined'
		var value = undefined;
		if(exp.charAt(0) == '@'){
			var attribute = exp.substring(1);
			value = node.getAttribute(attribute);
		}else if(exp == "text()"){
			var text = node.firstChild;
			if(text){
				value = text.nodeValue;
			}
		}else{ // assume elements
			value = [];
			for(var i = 0; i < node.childNodes.length; i++){
				var child = node.childNodes[i];
				if(child.nodeType === 1 /* ELEMENT_NODE */ && child.nodeName == exp){
					value.push(child);
				}
			}
		}
		return value; //String||Array
	},

	_setNodeValue: function(/*Node*/node, /*String*/exp, /*String*/value){
		//	summary:
		//		Set an attribute value or a child text value to an element
		//	description:
		//		If 'exp' starts with '@', 'value' is set to the specified
		//		attribute.
		//		If 'exp' is "text()", 'value' is set to a child text.
		//	node:
		//		A node
		//	exp:
		//		An expression for attribute or text
		//	value:
		//		A value to set
		if(exp.charAt(0) == '@'){
			var attribute = exp.substring(1);
			if(value){
				node.setAttribute(attribute, value);
			}else{
				node.removeAttribute(attribute);
			}
		}else if(exp == "text()"){
			while(node.firstChild){
				node.removeChild(node.firstChild);
			}
			if(value){
				var text = this._getDocument(node).createTextNode(value);
				node.appendChild(text);
			}
		}
		// else not supported
	},

	_getChildNode: function(/*Node*/node, /*String*/name){
		//	summary:
		//		Return a child node
		//	description:
		//		A child element of the tag name specified with 'name' is
		//		returned.
		//		If 'name' ends with an array index, it is used to pick up
		//		the corresponding element from multiple child elements.
		//	node:
		//		A parent node
		//	name:
		//		A tag name
		//	returns:
		//		A child node
		var index = 1;
		var i1 = name.indexOf('[');
		if(i1 >= 0){
			var i2 = name.indexOf(']');
			index = name.substring(i1 + 1, i2);
			name = name.substring(0, i1);
		}
		var count = 1;
		for(var i = 0; i < node.childNodes.length; i++){
			var child = node.childNodes[i];
			if(child.nodeType === 1 /* ELEMENT_NODE */ && child.nodeName == name){
				if(count == index){
					return child; //Node
				}
				count++;
			}
		}
		return null; //null
	},

	_getDocument: function(/*Node*/node){
		//	summary:
		//		Return a DOM document
		//	description:
		//		If 'node' is specified, a DOM document of the node is returned.
		//		Otherwise, a DOM document is created.
		//	returns:
		//		A DOM document
		if(node){
			return (node.nodeType == 9 /* DOCUMENT_NODE */ ? node : node.ownerDocument); //Document
		}else{
			return dojox.xml.parser.parse(); //Document
		}
	}
});
