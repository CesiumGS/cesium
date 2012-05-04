dojo.provide("dojox.wire.ml.util");

dojo.require("dojox.xml.parser");
dojo.require("dojox.wire.Wire");

dojox.wire.ml._getValue = function(/*String*/source, /*Array*/args){
	//	summary:
	//		Return a value
	//	description:
	//		This method obtains an object by an ID of a widget or an DOM
	//		element.
	//		If 'source' specifies a dotted notation to its property, a Wire is
	//		used to get the object property.
	//		If 'source' starts with "arguments", 'args' is used as a root
	//		object for the Wire.
	//	source:
	//		A string to specify an object and its property
	//	args:
	//		An optional arguments array
	//	returns:
	//		A value
	if(!source){
		return undefined; //undefined
	}
	var property = undefined;
	if(args && source.length >= 9 && source.substring(0, 9) == "arguments"){
		property = source.substring(9);
		return new dojox.wire.Wire({property: property}).getValue(args);
	}
	var i = source.indexOf('.');
	if(i >= 0){
		property = source.substring(i + 1);
		source = source.substring(0, i);
	}
	var object = (dijit.byId(source) || dojo.byId(source) || dojo.getObject(source));
	if(!object){
		return undefined; //undefined
	}
	if(!property){
		return object; //Object
	}else{
		return new dojox.wire.Wire({object: object, property: property}).getValue(); //anything
	}
};

dojox.wire.ml._setValue = function(/*String*/target, /*anything*/value){
	//	summary:
	//		Store a value
	//	description:
	//		This method stores a value by an ID of a widget or an DOM
	//		element with a dotted notation to its property, using a Wire.
	//	target:
	//		A string to specify an object and its property
	//	value:
	//		A value
	if(!target){
		return; //undefined
	}
	var i = target.indexOf('.');
	if(i < 0){
		return; //undefined
	}
	var object = this._getValue(target.substring(0, i));
	if(!object){
		return; //undefined
	}
	var property = target.substring(i + 1);
	var wire = new dojox.wire.Wire({object: object, property: property}).setValue(value);
};

dojo.declare("dojox.wire.ml.XmlElement", null, {
	//	summary:
	//		An object wrapping an XML element
	//	description:
	//		This class represents an XML element.

	constructor: function(/*Element||String*/element){
		//	summary:
		//		Initialize with an XML element or a tag name
		//	element:
		//		An XML element or a tag name
		if(dojo.isString(element)){
			element = this._getDocument().createElement(element);
		}
		this.element = element;
	},
	getPropertyValue: function(/*String*/property){
		//	summary:
		//		Return a property value
		//	description:
		//		If 'property' starts with '@', the attribute value is returned.
		//		If 'property' specifies "text()", the value of the first child
		//		text is returned.
		//		Otherwise, child elements of the tag name specified with
		//		'property' are returned.
		//	property:
		//		A property name
		//	returns:
		//		A property value
		var value = undefined;
		if(!this.element){
			return value; //undefined
		}
		if(!property){
			return value; //undefined
		}

		if(property.charAt(0) == '@'){
			var attribute = property.substring(1);
			value = this.element.getAttribute(attribute);
		}else if(property == "text()"){
			var text = this.element.firstChild;
			if(text){
				value = text.nodeValue;
			}
		}else{ // child elements
			var elements = [];
			for(var i = 0; i < this.element.childNodes.length; i++){
				var child = this.element.childNodes[i];
				if(child.nodeType === 1 /* ELEMENT_NODE */ && child.nodeName == property){
					elements.push(new dojox.wire.ml.XmlElement(child));
				}
			}
			if(elements.length > 0){
				if(elements.length === 1){
					value = elements[0];
				}else{
					value = elements;
				}
			}
		}
		return value; //String||Array||XmlElement
	},

	setPropertyValue: function(/*String*/property, /*String||Array||XmlElement*/value){
		//	summary:
		//		Store a property value
		//	description:
		//		If 'property' starts with '@', 'value' is set to the attribute.
		//		If 'property' specifies "text()", 'value' is set as the first
		//		child text.
		//		If 'value' is a string, a child element of the tag name
		//		specified with 'property' is created and 'value' is set as
		//		the first child text of the child element.
		//		Otherwise, 'value' is set to as child elements.
		//	property:
		//		A property name
		//	value:
		//		A property value
		var i;
		var text;
		if(!this.element){
			return; //undefined
		}
		if(!property){
			return; //undefined
		}

		if(property.charAt(0) == '@'){
			var attribute = property.substring(1);
			if(value){
				this.element.setAttribute(attribute, value);
			}else{
				this.element.removeAttribute(attribute);
			}
		}else if(property == "text()"){
			while(this.element.firstChild){
				this.element.removeChild(this.element.firstChild);
			}
			if(value){
				text = this._getDocument().createTextNode(value);
				this.element.appendChild(text);
			}
		}else{ // child elements
			var nextChild = null;
			var child;
			for(i = this.element.childNodes.length - 1; i >= 0; i--){
				child = this.element.childNodes[i];
				if(child.nodeType === 1 /* ELEMENT_NODE */ && child.nodeName == property){
					if(!nextChild){
						nextChild = child.nextSibling;
					}
					this.element.removeChild(child);
				}
			}
			if(value){
				if(dojo.isArray(value)){
					for(i in value){
						var e = value[i];
						if(e.element){
							this.element.insertBefore(e.element, nextChild);
						}
					}
				}else if(value instanceof dojox.wire.ml.XmlElement){
					if(value.element){
						this.element.insertBefore(value.element, nextChild);
					}
				}else{ // assume string
					child = this._getDocument().createElement(property);
					text = this._getDocument().createTextNode(value);
					child.appendChild(text);
					this.element.insertBefore(child, nextChild);
				}
			}
		}
	},

	toString: function(){
		//	summary:
		//		Return a value of the first text child of the element
		//	description:
		//		A value of the first text child of the element is returned.
		//	returns:
		//		A value of the first text child of the element
		var s = "";
		if(this.element){
			var text = this.element.firstChild;
			if(text){
				s = text.nodeValue;
			}
		}
		return s; //String
	},

	toObject: function(){
		//	summary:
		//		Return an object representation of the element
		//	description:
		//		An object with properties for child elements, attributes and
		//		text is returned.
		//	returns:
		//		An object representation of the element
		if(!this.element){
			return null; //null
		}
		var text = "";
		var obj = {};
		var elements = 0;
		var i;
		for(i = 0; i < this.element.childNodes.length; i++){
			var child = this.element.childNodes[i];
			if(child.nodeType === 1 /* ELEMENT_NODE */){
				elements++;
				var o = new dojox.wire.ml.XmlElement(child).toObject();
				var name = child.nodeName;
				var p = obj[name];
				if(!p){
					obj[name] = o;
				}else if(dojo.isArray(p)){
					p.push(o);
				}else{
					obj[name] = [p, o]; // make them array
				}
			}else if(child.nodeType === 3 /* TEXT_NODE */ ||
					 child.nodeType === 4 /* CDATA_SECTION_NODE */){
				text += child.nodeValue;
			}
		}
		var attributes = 0;
		if(this.element.nodeType === 1 /* ELEMENT_NODE */){
			attributes = this.element.attributes.length;
			for(i = 0; i < attributes; i++){
				var attr = this.element.attributes[i];
				obj["@" + attr.nodeName] = attr.nodeValue;
			}
		}
		if(elements === 0){
			if(attributes === 0){
				// text only
				return text; //String
			}
			// text with attributes
			obj["text()"] = text;
		}
		// else ignore text
		return obj; //Object
	},

	_getDocument: function(){
		//	summary:
		//		Return a DOM document
		//	description:
		//		If 'element' is specified, a DOM document of the element is
		//		returned.
		//		Otherwise, a DOM document is created.
		//	returns:
		//		A DOM document
		if(this.element){
			return (this.element.nodeType == 9 /* DOCUMENT_NODE */ ?
				this.element : this.element.ownerDocument); //Document
		}else{
			return dojox.xml.parser.parse(); //Document
		}
	}
});
