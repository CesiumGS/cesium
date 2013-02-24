dojo.provide("dojox.wire.ml.Transfer");

dojo.require("dijit._Widget");
dojo.require("dijit._Container");
dojo.require("dojox.wire._base");
dojo.require("dojox.wire.ml.Action");

dojo.declare("dojox.wire.ml.Transfer", dojox.wire.ml.Action, {
	// summary:
	//		A widget to transfer values through source and target Wires
	// description:
	//		This widget represents a controller task to transfer a value from
	//		a source to a target, through a source and a target Wires, when
	//		an event (a function) or a topic is issued.
	//		If this widget has child ChildWire widgets, their _addWire()
	//		methods are called to add Wire arguments to a source or a target
	//		Wire.

	// source:
	//		A source object and/or property
	source: "",

	// sourceStore:
	//		A data store for a source data item
	sourceStore: "",

	// sourceAttribute:
	//		An attribute of a source data item
	sourceAttribute: "",

	// sourcePath:
	//		A simplified XPath to a source property of an XML element
	sourcePath: "",

	// type:
	//		A type of the value to be transferred
	type: "",

	// converter:
	//		A class name of a converter for the value to be transferred
	converter: "",

	// target:
	//		A target object and/or property
	target: "",

	// targetStore:
	//		A data store for a target data item
	targetStore: "",

	// targetAttribute:
	//		An attribute of a target data item
	targetAttribute: "",

	// targetPath:
	//		A simplified XPath to a target property of an XML element
	targetPath: "",

	delimiter: "",

	_run: function(){
		// summary:
		//		Transfer a value from a source to a target
		// description:
		//		First, Wires for a source and a target are created from attributes.
		//		Then, a value is obtained by getValue() of the source Wire is set
		//		by setValue() of the target Wire.
		//		The arguments to this method is passed to getValue() and setValue()
		//		of Wires, so that they can be used to identify the root objects off
		//		the arguments.
		var sourceWire = this._getWire("source");
		var targetWire = this._getWire("target");
		dojox.wire.transfer(sourceWire, targetWire, arguments);
	},

	_getWire: function(/*String*/which){
		// summary:
		//		Build Wire arguments from attributes
		// description:
		//		Arguments object for a source or a target Wire, specified by
		//		'which' argument, are build from corresponding attributes,
		//		including '*Store' (for 'dataStore'), '*Attribute'
		//		(for 'attribute), '*Path' (for 'path'), 'type' and 'converter'.
		//		'source' or 'target' attribute is parsed as:
		// |		"object_id.property_name[.sub_property_name...]"
		//		If 'source' or 'target' starts with "arguments", 'object'
		//		argument for a Wire is set to null, so that the root object is
		//		given as an event or topic arguments.
		//		If this widget has child ChildWire widgets with a corresponding
		//		'which' attribute, their _addWire() methods are called to add
		//		additional Wire arguments and nested Wire is created,
		//		specifying the Wire defined by this widget to 'object' argument.
		// which:
		//		Which Wire arguments to build, "source" or "target"
		// returns:
		//		Wire arguments object
		var args = undefined;
		if(which == "source"){
			args = {
				object: this.source,
				dataStore: this.sourceStore,
				attribute: this.sourceAttribute,
				path: this.sourcePath,
				type: this.type,
				converter: this.converter
			};
		}else{ // "target"
			args = {
				object: this.target,
				dataStore: this.targetStore,
				attribute: this.targetAttribute,
				path: this.targetPath
			};
		}
		if(args.object){
			if(args.object.length >= 9 && args.object.substring(0, 9) == "arguments"){
				args.property = args.object.substring(9);
				args.object = null;
			}else{
				var i = args.object.indexOf('.');
				if(i < 0){
					args.object = dojox.wire.ml._getValue(args.object);
				}else{
					args.property = args.object.substring(i + 1);
					args.object = dojox.wire.ml._getValue(args.object.substring(0, i));
				}
			}
		}
		if(args.dataStore){
			args.dataStore = dojox.wire.ml._getValue(args.dataStore);
		}
		var childArgs = undefined;
		var children = this.getChildren();
		for(var i in children){
			var child = children[i];
			if(child instanceof dojox.wire.ml.ChildWire && child.which == which){
				if(!childArgs){
					childArgs = {};
				}
				child._addWire(this, childArgs);
			}
		}
		if(childArgs){ // make nested Wires
			childArgs.object = dojox.wire.create(args);
			childArgs.dataStore = args.dataStore;
			args = childArgs;
		}
		return args; //Object
	}
});

dojo.declare("dojox.wire.ml.ChildWire", dijit._Widget, {
	// summary:
	//		A widget to add a child wire
	// description:
	//		Attributes of this widget are used to add a child Wire to
	//		a composite Wire of the parent Transfer widget.
	// which:
	//		Which Wire to add a child Wire, "source" or "target", default to
	//		"source"
	// object:
	//		A root object for the value
	// property:
	//		A property for the value
	// type:
	//		A type of the value
	// converter:
	//		A class name of a converter for the value
	// attribute:
	//		A data item attribute for the value
	// path:
	//		A simplified XPath for the value
	// name:
	//		A composite property name
	which: "source",
	object: "",
	property: "",
	type: "",
	converter: "",
	attribute: "",
	path: "",
	name: "",

	_addWire: function(/*Transfer*/parent, /*Object*/args){
		// summary:
		//		Add a child Wire to Wire arguments
		// description:
		//		If 'name' attribute is specified, a child Wire is added as
		//		the named property of 'children' object of 'args'.
		//		Otherwise, a child Wire is added to 'children' array of 'args'.
		// parent:
		//		A parent Transfer widget
		// args:
		//		Wire arguments
		if(this.name){ // object
			if(!args.children){
				args.children = {};
			}
			args.children[this.name] = this._getWire(parent);
		}else{ // array
			if(!args.children){
				args.children = [];
			}
			args.children.push(this._getWire(parent));
		}
	},

	_getWire: function(/*Transfer*/parent){
		// summary:
		//		Build child Wire arguments from attributes
		// description:
		//		Arguments object for a child Wire are build from attributes,
		//		including 'object', 'property', 'type', 'converter',
		//		'attribute' and 'path'.
		// parent:
		//		A parent Transfer widget
		// returns:
		//		Wire arguments object
		return {
			object: (this.object ? dojox.wire.ml._getValue(this.object) : undefined),
			property: this.property,
			type: this.type,
			converter: this.converter,
			attribute: this.attribute,
			path: this.path
		}; //Object
	}
});

dojo.declare("dojox.wire.ml.ColumnWire", dojox.wire.ml.ChildWire, {
	// summary:
	//		A widget to add a column wire
	// description:
	//		Attributes of this widget are used to add a column Wire to
	//		a TableAdapter of the parent Transfer widget.
	// column:
	//		A column name
	column: "",

	_addWire: function(/*Transfer*/parent, /*Object*/args){
		// summary:
		//		Add a column Wire to Wire arguments
		// description:
		//		If 'column' attribute is specified, a column Wire is added as
		//		the named property of 'columns' object of 'args'.
		//		Otherwise, a column Wire is added to 'columns' array of 'args'.
		// parent:
		//		A parent Transfer widget
		// args:
		//		Wire arguments
		if(this.column){ // object
			if(!args.columns){
				args.columns = {};
			}
			args.columns[this.column] = this._getWire(parent);
		}else{ // array
			if(!args.columns){
				args.columns = [];
			}
			args.columns.push(this._getWire(parent));
		}
	}
});

dojo.declare("dojox.wire.ml.NodeWire", [dojox.wire.ml.ChildWire, dijit._Container], {
	// summary:
	//		A widget to add node wires
	// description:
	//		Attributes of this widget are used to add node Wires to
	//		a TreeAdapter of the parent Transfer widget.
	// titleProperty:
	//		A property for the node title
	// titleAttribute:
	//		A data item attribute for the node title
	// titlePath:
	//		A simplified XPath for the node title
	titleProperty: "",
	titleAttribute: "",
	titlePath: "",

	_addWire: function(/*Transfer*/parent, /*Object*/args){
		// summary:
		//		Add node Wires to Wire arguments
		// description:
		//		Node Wires are added to 'nodes' array of 'args'.
		// parent:
		//		A parent Transfer widget
		// args:
		//		Wire arguments
		if(!args.nodes){
			args.nodes = [];
		}
		args.nodes.push(this._getWires(parent));
	},

	_getWires: function(/*Transfer*/parent){
		// summary:
		//		Build node Wires arguments from attributes
		// description:
		//		Arguments object for 'node' Wire are build from attributes,
		//		including 'object', 'property', 'type', 'converter',
		//		'attribute' and 'path'.
		//		Arguments object for 'title' Wire are build from another set of
		//		attributes, 'titleProperty', 'titleAttribute' and 'titlePath'.
		//		If this widget has child NodeWire widgets, their _getWires()
		//		methods are called recursively to build 'children' array of
		//		'args'.
		// parent:
		//		A parent Transfer widget
		// returns:
		//		Wire arguments object
		var args = {
			node: this._getWire(parent),
			title: {
				type: "string",
				property: this.titleProperty,
				attribute: this.titleAttribute,
				path: this.titlePath
			}
		};
		var childArgs = [];
		var children = this.getChildren();
		for(var i in children){
			var child = children[i];
			if(child instanceof dojox.wire.ml.NodeWire){
				childArgs.push(child._getWires(parent));
			}
		}
		if(childArgs.length > 0){
			args.children = childArgs;
		}
		return args; //Object
	}
});

dojo.declare("dojox.wire.ml.SegmentWire", dojox.wire.ml.ChildWire, {
	// summary:
	//		A widget to add a segment wire
	// description:
	//		Attributes of this widget are used to add a segment Wire to
	//		a TextAdapter of the parent Transfer widget.

	_addWire: function(/*Transfer*/parent, /*Object*/args){
		// summary:
		//		Add a segment Wire to Wire arguments
		// description:
		//		A segment Wire is added to 'segments' array of 'args'.
		//		If 'parent' has 'delimiter' attribute, it is used for
		//		'delimiter' property of 'args'.
		// parent:
		//		A parent Transfer widget
		// args:
		//		Wire arguments
		if(!args.segments){
			args.segments = [];
		}
		args.segments.push(this._getWire(parent));
		if(parent.delimiter && !args.delimiter){
			args.delimiter = parent.delimiter;
		}
	}
});
