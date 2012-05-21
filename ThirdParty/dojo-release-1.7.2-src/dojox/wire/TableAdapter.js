dojo.provide("dojox.wire.TableAdapter");

dojo.require("dojox.wire.CompositeWire");

dojo.declare("dojox.wire.TableAdapter", dojox.wire.CompositeWire, {
	//	summary:
	//		A composite Wire for table rows
	//	description:
	//		This class has multiple child Wires for object properties or array
	//		elements of a table row.
	//		The root object for this class must be an array.
	//		When an object with Wires is specified to 'columns' property, they
	//		are used to get a row object with property values.
	//		When an array of Wires is specified to 'columns' property, they
	//		are used to get a row array with element values.
	//		The row values are returned in an array.
	//		This class only supports getValue(), but not setValue().
	
	_wireClass: "dojox.wire.TableAdapter",
	
	constructor: function(/*Object*/args){
		//	summary:
		//		Initialize properties
		//	description:
		//		If object properties or array elements specified in 'columns'
		//		property are not Wires, Wires are created from them as
		//		arguments, with 'parent' property set to this Wire instance.
		//	args:
		//		Arguments to initialize properties
		//		columns:
		//			An object or array containing child Wires for column values
		this._initializeChildren(this.columns);
	},

	_getValue: function(/*Array*/object){
		//	summary:
		//		Return an array of table row value (object or array)
		//	description:
		//		This method iterates over an array specified to 'object'
		//		argument and calls getValue() method of the child Wires with
		//		each element of the array to get a row object or array.
		//		Finally, an array with the row objects or arrays are retuned.
		//	object:
		//		A root array
		//	returns:
		//		An array of table row value
		if(!object || !this.columns){
			return object; //Array
		}

		var array = object;
		if(!dojo.isArray(array)){
			array = [array];
		}

		var rows = [];
		for(var i in array){
			var row = this._getRow(array[i]);
			rows.push(row);
		}
		return rows; //Array
	},

	_setValue: function(/*Array*/object, /*Array*/value){
		//	summary:
		//		Not supported
		throw new Error("Unsupported API: " + this._wireClass + "._setValue");
	},

	_getRow: function(/*Object||Array*/object){
		//	summary:
		//		Return an array or object for a table row
		//	description:
		//		This method calls getValue() method of the child Wires to
		//		create a row object or array.
		//	returns:
		//		An array or object for a table row
		var row = (dojo.isArray(this.columns) ? [] : {}); // array or object
		for(var c in this.columns){
			row[c] = this.columns[c].getValue(object);
		}
		return row; //Array||Object
	}
});
