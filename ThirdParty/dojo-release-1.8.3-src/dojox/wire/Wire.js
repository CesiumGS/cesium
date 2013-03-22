dojo.provide("dojox.wire.Wire");

dojo.require("dojox.wire._base");

dojo.declare("dojox.wire.Wire", null, {
	// summary:
	//		A default and base Wire to access an object property
	// description:
	//		This class accesses a property of an object with a dotted notation
	//		specified to 'property' property, such as "a.b.c", which identifies
	//		a descendant property, "object.a.b.c".
	//		Property names in the dotted notation may have an array index, such
	//		as "a[0]", to identify an array element, literally, "object.a[0]".
	//		When a notation start with an array index, such as "[0].a", it
	//		specifies an array element of the root object (array),
	//		"object[0].a".
	//		This class also serves as a base class for other Wire classes,
	//		preparing a root object and converting a return value, so that
	//		sub-classes just can implement _getValue() and _setValue() called
	//		from getValue() and setValue() implemented by this calss.
	
	_wireClass: "dojox.wire.Wire",
	
	constructor: function(/*Object*/args){
		// summary:
		//		Initialize properties
		// description:
		//		If 'converter' property is specified and is a string for
		//		a converter class, an instanceof the converter class is
		//		created.
		// args:
		//		Arguments to initialize properties:
		//
		//		- object: A root object (or another Wire to access a root object)
		//		- property: A dotted notation to a descendant property
		//		- type: A type of the return value (for the source Wire)
		//		- converter: A converter object (or class name) to convert the return
		//			value (for the source Wire)
		dojo.mixin(this, args);

		if(this.converter){
			if(dojo.isString(this.converter)){
				//First check the object tree for it.  Might be defined variable
				//name/global function (like a jsId, or just a function name).
				var convertObject = dojo.getObject(this.converter);
				if(dojo.isFunction(convertObject)){
					//We need to see if this is a pure function or an object constructor...
					try{
						var testObj = new convertObject();
						if(testObj && !dojo.isFunction(testObj["convert"])){
							//Looks like a 'pure' function...
							this.converter = {convert: convertObject};
						}else{
							this.converter = testObj;
						}
					}catch(e){
						//Do if this fails.
					}
				}else if(dojo.isObject(convertObject)){
					//It's an object, like a jsId ... see if it has a convert function
					if(dojo.isFunction(convertObject["convert"])){
						this.converter = convertObject;
					}
				}

				//No object with that name (Converter is still a string),
				//then look for a class that needs to be dynamically loaded...
				if(dojo.isString(this.converter)){
					var converterClass = dojox.wire._getClass(this.converter);
					if(converterClass){
						this.converter = new converterClass();
					}else{
						this.converter = undefined;
					}
				}
			}else if(dojo.isFunction(this.converter)){
				this.converter = {convert: this.converter};
			}
		}
	},

	getValue: function(/*Object||Array*/defaultObject){
		// summary:
		//		Return a value of an object
		// description:
		//		This method first determines a root object as follows:
		//
		//			1. If 'object' property specified,
		//			1.1 If 'object' is a Wire, its getValue() method is called to
		//			obtain a root object.
		//			1.2 Otherwise, use 'object' as a root object.
		//			2. Otherwise, use 'defaultObject' argument.
		//			3. If 'property' is specified, it is used to get a property
		//				value.
		//
		//		Then, if a sub-class implements _getValue() method, it is
		//		called with the root object to get the return value.
		//		Otherwise, the root object (typically, a property valye) is
		//		used for the return value.
		//		Finally, if 'type' property is specified, the return value is
		//		converted to the specified primitive type ("string", "number",
		//		"boolean" and "array").
		//		If 'converter' property is specified, its convert() method is
		//		called to convert the value.
		// defaultObject:
		//		A default root object
		// returns:
		//		A value found
		var object = undefined;
		if(dojox.wire.isWire(this.object)){
			object = this.object.getValue(defaultObject);
		}else{
			object = (this.object || defaultObject);
		}

		if(this.property){
			var list = this.property.split('.');
			for(var i in list){
				if(!object){
					return object; //anything (null, undefined, etc)
				}
				object = this._getPropertyValue(object, list[i]);
			}
		}

		var value = undefined;
		if(this._getValue){
			value = this._getValue(object);
		}else{
			value = object;
		}

		if(value){
			if(this.type){
				if(this.type == "string"){
					value = value.toString();
				}else if(this.type == "number"){
					value = parseInt(value, 10);
				}else if(this.type == "boolean"){
					value = (value != "false");
				}else if(this.type == "array"){
					if(!dojo.isArray(value)){
						value = [value];
					}
				}
			}
			if(this.converter && this.converter.convert){
				value = this.converter.convert(value, this); // optional "this" context
			}
		}
		return value; //anything
	},

	setValue: function(/*anything*/value, /*Object||Array*/defaultObject){
		// summary:
		//		Set a value to an object
		// description:
		//		This method first determines a root object as follows:
		//
		//			1. If 'object' property specified,
		//			1.1 If 'object' is a Wire, its getValue() method is called to
		//				obtain a root object.
		//			1.2 Otherwise, use 'object' as a root object.
		//			2. Otherwise, use 'defaultObject' argument.
		//			3. If 'property' is specified, it is used to get a property
		//				value.
		//
		//		Then, if a sub-class implements _setValue() method, it is
		//		called with the root object and 'value' argument to set
		//		the value.
		//		Otherwise, 'value' is set to a property specified with
		//		'property' property.
		//		If the root object is undefined and 'object' property is a Wire
		//		and a new object is created and returned by _setValue() it is
		//		set through 'object' (setValue() method).
		// value:
		//		A value to set
		// defaultObject:
		//		A default root object
		var object = undefined;
		if(dojox.wire.isWire(this.object)){
			object = this.object.getValue(defaultObject);
		}else{
			object = (this.object || defaultObject);
		}

		var property = undefined;
		var o;
		if(this.property){
			if(!object){
				if(dojox.wire.isWire(this.object)){
					object = {};
					this.object.setValue(object, defaultObject);
				}else{
					throw new Error(this._wireClass + ".setValue(): invalid object");
				}
			}
			var list = this.property.split('.');
			var last = list.length - 1;
			for(var i = 0; i < last; i++){
				var p = list[i];
				o = this._getPropertyValue(object, p);
				if(!o){
					o = {};
					this._setPropertyValue(object, p, o);
				}
				object = o;
			}
			property = list[last];
		}

		if(this._setValue){
			if(property){
				o = this._getPropertyValue(object, property);
				if(!o){
					o = {};
					this._setPropertyValue(object, property, o);
				}
				object = o;
			}
			var newObject = this._setValue(object, value);
			if(!object && newObject){
				if(dojox.wire.isWire(this.object)){
					this.object.setValue(newObject, defaultObject);
				}else{
					throw new Error(this._wireClass + ".setValue(): invalid object");
				}
			}
		}else{
			if(property){
				this._setPropertyValue(object, property, value);
			}else{
				if(dojox.wire.isWire(this.object)){
					this.object.setValue(value, defaultObject);
				}else{
					throw new Error(this._wireClass + ".setValue(): invalid property");
				}
			}
		}
	},

	_getPropertyValue: function(/*Object||Array*/object, /*String*/property){
		// summary:
		//		Return a property value of an object
		// description:
		//		A value for 'property' of 'object' is returned.
		//		If 'property' ends with an array index, it is used to indentify
		//		an element of an array property.
		//		If 'object' implements getPropertyValue(), it is called with
		//		'property' to obtain the property value.
		//		If 'object' implements a getter for the property, it is called
		//		to obtain the property value.
		// object:
		//		A default root object
		// property:
		//		A property name
		// returns:
		//		A value found, otherwise 'undefined'
		var value = undefined;
		var i1 = property.indexOf('[');
		if(i1 >= 0){
			var i2 = property.indexOf(']');
			var index = property.substring(i1 + 1, i2);
			var array = null;
			if(i1 === 0){ // object is array
				array = object;
			}else{
				property = property.substring(0, i1);
				array = this._getPropertyValue(object, property);
				if(array && !dojo.isArray(array)){
					array = [array];
				}
			}
			if(array){
				value = array[index];
			}
		}else if(object.getPropertyValue){
			value = object.getPropertyValue(property);
		}else{
			var getter = "get" + property.charAt(0).toUpperCase() + property.substring(1);
			if(this._useGet(object)){
				value = object.get(property);
			}else if(this._useAttr(object)){
				value = object.attr(property);
			} else if(object[getter]){
				value = object[getter]();
			}else{
				value = object[property];
			}
		}
		return value; //anything
	},

	_setPropertyValue: function(/*Object||Array*/object, /*String*/property, /*anything*/value){
		// summary:
		//		Set a property value to an object
		// description:
		//		'value' is set to 'property' of 'object'.
		//		If 'property' ends with an array index, it is used to indentify
		//		an element of an array property to set the value.
		//		If 'object' implements setPropertyValue(), it is called with
		//		'property' and 'value' to set the property value.
		//		If 'object' implements a setter for the property, it is called
		//		with 'value' to set the property value.
		// object:
		//		An object
		// property:
		//		A property name
		// value:
		//		A value to set
		var i1 = property.indexOf('[');
		if(i1 >= 0){
			var i2 = property.indexOf(']');
			var index = property.substring(i1 + 1, i2);
			var array = null;
			if(i1 === 0){ // object is array
				array = object;
			}else{
				property = property.substring(0, i1);
				array = this._getPropertyValue(object, property);
				if(!array){
					array = [];
					this._setPropertyValue(object, property, array);
				}
			}
			array[index] = value;
		}else if(object.setPropertyValue){
			object.setPropertyValue(property, value);
		}else{
			var setter = "set" + property.charAt(0).toUpperCase() + property.substring(1);
			if(this._useSet(object)){
				object.set(property, value);
			}else if(this._useAttr(object)){
				object.attr(property, value);
			}else if(object[setter]){
				object[setter](value);
			}else{
				object[property] = value;
			}
		}
	},

	_useGet: function(object){
		// summary:
		//		Function to detect if dijit.get support exists on the target
		// object:
		//		The target object to set the property of.
		var useGet = false;
		if(dojo.isFunction(object.get)){
			useGet = true;
		}
		return useGet;
	},

	_useSet: function(object){
		// summary:
		//		Function to detect if dijit.set support exists on the target
		// object:
		//		The target object to set the property of.
		var useSet = false;
		if(dojo.isFunction(object.set)){
			useSet = true;
		}
		return useSet;
	},

	_useAttr: function(object){
		// summary:
		//		Function to detect if dijit.attr support exists on the target
		// object:
		//		The target object to set the property of.
		var useAttr = false;
		if(dojo.isFunction(object.attr)){
			useAttr = true;
		}
		return useAttr;
	}
});
