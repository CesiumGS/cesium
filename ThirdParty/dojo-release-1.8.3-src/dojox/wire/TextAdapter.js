dojo.provide("dojox.wire.TextAdapter");

dojo.require("dojox.wire.CompositeWire");

dojo.declare("dojox.wire.TextAdapter", dojox.wire.CompositeWire, {
	// summary:
	//		A composite Wire for a concatenated text
	// description:
	//		This class has multiple child Wires for text segment values.
	//		Wires in 'segments' property are used to get text segments and
	//		values are concatenated with an optional delimiter string specified
	//		to 'delimiter' property.
	
	_wireClass: "dojox.wire.TextAdapter",
	
	constructor: function(/*Object*/ args){
		// summary:
		//		Initialize properties
		// description:
		//		If array elements specified in 'segments' are not Wires, Wires
		//		are created from them as arguments, with 'parent' property set
		//		to this Wire instance.
		// args:
		//		Arguments to initialize properties:
		//
		//		- segments: An array containing child Wires for text segment values
		//		- delimiter: A delimiter string
		this._initializeChildren(this.segments);
		if(!this.delimiter){
			this.delimiter = "";
		}
	},

	_getValue: function(/*Object||Array*/object){
		// summary:
		//		Return a concatenated text
		// description:
		//		This method calls getValue() method of the child Wires wuth
		//		'object' argument and concatenate the values with 'delimiter'
		//		property to return.
		// arg:
		//		A root object
		// returns:
		//		A concatinated text
		if(!object || !this.segments){
			return object; //Object||Array
		}

		var text = "";
		for(var i in this.segments){
			var segment = this.segments[i].getValue(object);
			text = this._addSegment(text, segment);
		}
		return text; //String
	},

	_setValue: function(/*Object||Array*/object, /*String*/value){
		// summary:
		//		Not supported
		throw new Error("Unsupported API: " + this._wireClass + "._setValue");
	},

	_addSegment: function(/*String*/text, /*String*/segment){
		// summary:
		//		Return a concatenated text
		// description:
		//		This method add a text segment specified to 'segment' argument
		//		to a base text specified to 'text', with 'delimiter' property.
		// text:
		//		A base text
		// segment:
		//		A text segment to add
		// returns:
		//		A concatinated text
		if(!segment){
			return text; //String
		}else if(!text){
			return segment; //String
		}else{
			return text + this.delimiter + segment; //String
		}
	}
});
