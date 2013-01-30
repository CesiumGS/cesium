dojo.provide("dojox.wire.DataWire");

dojo.require("dojox.wire.Wire");

dojo.declare("dojox.wire.DataWire", dojox.wire.Wire, {
	// summary:
	//		A Wire for item attributes of data stores
	// description:
	//		This class accesses item attributes of data stores with a dotted
	//		notation of attribute names specified to 'attribute' property,
	//		using data APIs of a data store specified to 'dataStore' property.
	//		The root object for this class must be an item of the data store.
	//		Intermediate attribute names in the dotted notation specify
	//		attributes for child items, which are used for repeated calls to
	//		data APIs until reached to a descendant attribute.
	//		Attribute names may have an array index, such as "a[0]", to
	//		identify an array element of the attribute value.
	
	_wireClass: "dojox.wire.DataWire",

	constructor: function(/*Object*/ args){
		// summary:
		//		Initialize properties
		// description:
		//		If 'dataStore' property is not specified, but 'parent' property
		//		is specified, 'dataStore' property is copied from the parent.
		// args:
		//		Arguments to initialize properties:
		//
		//		- dataStore: A data store
		//		- attribute: A dotted notation to a descendant attribute
		if(!this.dataStore && this.parent){
			this.dataStore = this.parent.dataStore;
		}
	},
	_getValue: function(/*Object*/object){
		// summary:
		//		Return an attribute value of an item
		// description:
		//		This method uses a root item passed in 'object' argument and
		//		'attribute' property to call getValue() method of
		//		'dataStore'.
		//		If an attribute name have an array suffix ("[]"), getValues()
		//		method is called, instead.
		//		If an index is specified in the array suffix, an array element
		//		for the index is returned, instead of the array itself.
		// object:
		//		A root item
		// returns:
		//		A value found, otherwise 'undefined'
		if(!object || !this.attribute || !this.dataStore){
			return object; //Object
		}

		var value = object;
		var list = this.attribute.split('.');
		for(var i in list){
			value = this._getAttributeValue(value, list[i]);
			if(!value){
				return undefined; //undefined
			}
		}
		return value; //anything
	},

	_setValue: function(/*Object*/object, /*anything*/value){
		// summary:
		//		Set an attribute value to an item
		// description:
		//		This method uses a root item passed in 'object' argument and
		//		'attribute' property to identify an item.
		//		Then, setValue() method of 'dataStore' is called with a leaf
		//		attribute name and 'value' argument.
		//		If an attribute name have an array suffix ("[]"), setValues()
		//		method is called, instead.
		//		If an index is specified in the array suffix, an array element
		//		for the index is set to 'value', instead of the array itself.
		// object:
		//		A root item
		// value:
		//		A value to set
		// returns:
		//		'object', or 'undefined' for invalid attribute
		if(!object || !this.attribute || !this.dataStore){
			return object; //Object
		}

		var item = object;
		var list = this.attribute.split('.');
		var last = list.length - 1;
		for(var i = 0; i < last; i++){
			item = this._getAttributeValue(item, list[i]);
			if(!item){
				return undefined; //undefined
			}
		}
		this._setAttributeValue(item, list[last], value);
		return object; //Object
	},

	_getAttributeValue: function(/*Object*/item, /*String*/attribute){
		// summary:
		//		Return an attribute value of an item
		// description:
		//		This method uses an item passed in 'item' argument and
		//		'attribute' argument to call getValue() method of 'dataStore'.
		//		If an attribute name have an array suffix ("[]"), getValues()
		//		method is called, instead.
		//		If an index is specified in the array suffix, an array element
		//		for the index is returned, instead of the array itself.
		// item:
		//		An item
		// attribute:
		//		An attribute name
		// returns:
		//		A value found, otherwise 'undefined'
		var value = undefined;
		var i1 = attribute.indexOf('[');
		if(i1 >= 0){
			var i2 = attribute.indexOf(']');
			var index = attribute.substring(i1 + 1, i2);
			attribute = attribute.substring(0, i1);
			var array = this.dataStore.getValues(item, attribute);
			if(array){
				if(!index){ // return array for "attribute[]"
					value = array;
				}else{
					value = array[index];
				}
			}
		}else{
			value = this.dataStore.getValue(item, attribute);
		}
		return value; //anything
	},

	_setAttributeValue: function(/*Object*/item, /*String*/attribute, /*anything*/value){
		// summary:
		//		Set an attribute value to an item
		// description:
		//		This method uses an item passed in 'item' argument and
		//		'attribute' argument to call setValue() method of 'dataStore'
		//		with 'value' argument.
		//		If an attribute name have an array suffix ("[]"), setValues()
		//		method is called, instead.
		//		If an index is specified in the array suffix, an array element
		//		for the index is set to 'value', instead of the array itself.
		// item:
		//		An item
		// attribute:
		//		An attribute name
		// value:
		//		A value to set
		var i1 = attribute.indexOf('[');
		if(i1 >= 0){
			var i2 = attribute.indexOf(']');
			var index = attribute.substring(i1 + 1, i2);
			attribute = attribute.substring(0, i1);
			var array = null;
			if(!index){ // replace whole array for "attribute[]"
				array = value;
			}else{
				array = this.dataStore.getValues(item, attribute);
				if(!array){
					array = [];
				}
				array[index] = value;
			}
			this.dataStore.setValues(item, attribute, array);
		}else{
			this.dataStore.setValue(item, attribute, value);
		}
	}
});
