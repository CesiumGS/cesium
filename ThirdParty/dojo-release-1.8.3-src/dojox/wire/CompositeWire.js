dojo.provide("dojox.wire.CompositeWire");

dojo.require("dojox.wire._base");
dojo.require("dojox.wire.Wire");

dojo.declare("dojox.wire.CompositeWire", dojox.wire.Wire, {
	// summary:
	//		A Wire for composite values in object or array
	// description:
	//		This class has multiple child Wires for object properties or array
	//		elements.
	//		When an object with Wires is specified to 'children' property, they
	//		are used to get or set an object with property values.
	//		When an array of Wiares is specified to 'children' property, they
	//		are used to get or set an array with element values.
	
	_wireClass: "dojox.wire.CompositeWire",

	constructor: function(/*Object*/args){
		// summary:
		//		Initialize properties
		// description:
		//		If object properties or array elements specified in 'children'
		//		property are not Wires, Wires are created from them as
		//		arguments, with 'parent' property set to this Wire instance.
		// args:
		//		Arguments to initialize properties.
		//
		//		- children: An object or array containing child Wires
		this._initializeChildren(this.children);
	},
	_getValue: function(/*Object||Array*/object){
		// summary:
		//		Return an object with property values or an array with element
		//		values
		// description:
		//		This method calls getValue() method of the child Wires with
		//		'object' argument and returns an object with the values as
		//		properties or an arary of the values as elements.
		// object:
		//		A root object
		// returns:
		//		An object or array with values
		if(!object || !this.children){
			return object; //Object||Array
		}

		var value = (dojo.isArray(this.children) ? [] : {}); // array or object
		for(var c in this.children){
			value[c] = this.children[c].getValue(object);
		}
		return value;//Object||Array
	},

	_setValue: function(/*Object||Array*/object, /*Object||Array*/value){
		// summary:
		//		Set an object properties or an array elements to an object
		// description:
		//		This method calls setValues() method of the child Wires with
		//		a corresponding property or element in 'value' argument and
		//		'object' argument.
		// object:
		//		A root object
		// value:
		//		An object or array with values to set
		// returns:
		//		'object'
		if(!object || !this.children){
			return object; //Object||Array
		}

		for(var c in this.children){
			this.children[c].setValue(value[c], object);
		}
		return object; //Object||Array
	},

	_initializeChildren: function(/*Object||Array*/children){
		// summary:
		//		Initialize child Wires
		// description:
		//		If object properties or array elements specified in 'children'
		//		argument are not Wires, Wires are created from them as
		//		arguments, with 'parent' property set to this Wire instance.
		// children:
		//		An object or array containing child Wires
		if(!children){
			return; //undefined
		}

		for(var c in children){
			var child = children[c];
			child.parent = this;
			if(!dojox.wire.isWire(child)){
				children[c] = dojox.wire.create(child);
			}
		}
	}
});
