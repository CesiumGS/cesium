define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/Stateful"
], function(lang, array, declare, Stateful){
	/*=====
		declare = dojo.declare;
		Stateful = dojo.Stateful;
	=====*/

	var StatefulModel = declare("dojox.mvc.StatefulModel", [Stateful], {
		// summary:
		//		The first-class native JavaScript data model based on dojo.Stateful
		//		that wraps any data structure(s) that may be relevant for a view,
		//		a view portion, a dijit or any custom view layer component.
		//
		//  description:
		//		A data model is effectively instantiated with a plain JavaScript
		//		object which specifies the initial data structure for the model.
		//
		//		|	var struct = {
		//		|		order	: "abc123",
		//		|		shipto	: {
		//		|			address	: "123 Example St, New York, NY",
		//		|			phone	: "212-000-0000"
		//		|		},
		//		|		items : [
		//		|			{ part : "x12345", num : 1 },
		//		|			{ part : "n09876", num : 3 }
		//		|		]
		//		|	};
		//		|
		//		|	var model = dojox.mvc.newStatefulModel({ data : struct });
		//
		//		The simple example above shows an inline plain JavaScript object
		//		illustrating the data structure to prime the model with, however
		//		the underlying data may be made available by other means, such as
		//		from the results of a dojo.store or dojo.data query.
		//
		//		To deal with stores providing immediate values or Promises, a
		//		factory method for model instantiation is provided. This method
		//		will either return an immediate model or a model Promise depending
		//		on the nature of the store.
		//
		//		|	var model = dojox.mvc.newStatefulModel({ store: someStore });
		//
		//		The created data model has the following properties:
		//
		//		- It enables dijits or custom components in the view to "bind" to
		//		  data within the model. A bind creates a bi-directional update
		//		  mechanism between the bound view and the underlying data:
		//			- The data model is "live" data i.e. it maintains any updates
		//			  driven by the view on the underlying data.
		//			- The data model issues updates to portions of the view if the
		//			  data they bind to is updated in the model. For example, if two
		//			  dijits are bound to the same part of a data model, updating the
		//			  value of one in the view will cause the data model to issue an
		//			  update to the other containing the new value.
		//
		//		- The data model internally creates a tree of dojo.Stateful
		//		  objects that matches the input, which is effectively a plain
		//		  JavaScript object i.e. "pure data". This tree allows dijits or
		//		  other view components to bind to any node within the data model.
		//		  Typically, dijits with simple values bind to leaf nodes of the
		//		  datamodel, whereas containers bind to internal nodes of the
		//		  datamodel. For example, a datamodel created using the object below
		//		  will generate the dojo.Stateful tree as shown:
		//
		//		|	var model = dojox.mvc.newStatefulModel({ data : {
		//		|		prop1	: "foo",
		//		|		prop2	: {
		//		|			leaf1	: "bar",
		//		|			leaf2	: "baz"
		//		|		}
		//		|	}});
		//		|
		//		|	// The created dojo.Stateful tree is illustrated below (all nodes are dojo.Stateful objects)
		//		|	//
		//		|	//	                o  (root node)
		//		|	//	               / \
		//		|	//	 (prop1 node) o   o (prop2 node)
		//		|	//	                 / \
		//		|	//	   (leaf1 node)	o   o (leaf2 node)
		//		|	//
		//		|	// The root node is accessed using the expression "model" (the var name above). The prop1
		//		|	// node is accessed using the expression "model.prop1", the leaf2 node is accessed using
		//		|	// the expression "model.prop2.leaf2" and so on.
		//
		//		- Each of the dojo.Stateful nodes in the model may store data as well
		//		  as associated "meta-data", which includes things such as whether
		//		  the data is required or readOnly etc. This meta-data differs from
		//		  that maintained by, for example, an individual dijit in that this
		//		  is maintained by the datamodel and may therefore be affected by
		//		  datamodel-level constraints that span multiple dijits or even
		//		  additional criteria such as server-side computations.
		//
		//		- When the model is backed by a dojo.store or dojo.data query, the
		//		  client-side updates can be persisted once the client is ready to
		//		  "submit" the changes (which may include both value changes or
		//		  structural changes - adds/deletes). The datamodel allows control
		//		  over when the underlying data is persisted i.e. this can be more
		//		  incremental or batched per application needs.
		//
		//		There need not be a one-to-one association between a datamodel and
		//		a view or portion thereof. For example, multiple datamodels may
		//		back the dijits in a view. Indeed, this may be useful where the
		//		binding data comes from a number of data sources or queries, for
		//		example. Just as well, dijits from multiple portions of the view
		//		may be bound to a single datamodel.
		//
		//		Finally, requiring this class also enables all dijits to become data
		//		binding aware. The data binding is commonly specified declaratively
		//		via the "ref" property in the "data-dojo-props" attribute value.
		//
		//		To illustrate, the following is the "Hello World" of such data-bound
		//		widget examples:
		//
		//		|	<script>
		//		|		dojo.require("dojox.mvc");
		//		|		dojo.require("dojo.parser");
		//		|		var model;
		//		|		dojo.addOnLoad(function(){
		//		|			model = dojox.mvc.newStatefulModel({ data : {
		//		|				hello : "Hello World"
		//		|			}});
		//		|			dojo.parser.parse();
		//		|		}
		//		|	</script>
		//		|
		//		|	<input id="helloInput" dojoType="dijit.form.TextBox"
		//		|		ref="model.hello">
		//
		//		or
		//
		//		|	<script>
		//		|		var model;
		//		|		require(["dojox/mvc", "dojo/parser"], function(dxmvc, parser){
		//		|			model = dojox.mvc.newStatefulModel({ data : {
		//		|				hello : "Hello World"
		//		|			}});
		//		|			parser.parse();
		//		|		});
		//		|	</script>
		//		|
		//		|	<input id="helloInput" data-dojo-type="dijit.form.TextBox"
		//		|		data-dojo-props="ref: 'model.hello'">
		//
		//		Such data binding awareness for dijits is added by extending the
		//		dijit._WidgetBase class to include data binding capabilities
		//		provided by dojox.mvc._DataBindingMixin, and this class declares a
		//		dependency on dojox.mvc._DataBindingMixin.
		//
		//		The presence of a data model and the data-binding capabilities
		//		outlined above support the flexible development of a number of MVC
		//		patterns on the client. As an example, CRUD operations can be
		//		supported with minimal application code.
	
		// data: Object
		//		The plain JavaScript object / data structure used to initialize
		//		this model. At any point in time, it holds the lasted saved model
		//		state.
		//		Either data or store property must be provided.
		data: null,

		// store: dojo.store.DataStore
		//		The data store from where to retrieve initial data for this model.
		//		An optional query may also be provided along with this store.
		//		Either data or store property must be provided.
		store: null,
	
		// valid: boolean
		//		Whether this model deems the associated data to be valid.
		valid: true,

		// value: Object
		//		The associated value (if this is a leaf node). The value of
		//		intermediate nodes in the model is not defined.
		value: "",

		//////////////////////// PUBLIC METHODS / API ////////////////////////

		reset: function(){
			// summary:
			//		Resets this data model values to its original state.
			//		Structural changes to the data model (such as adds or removes)
			//		are not restored.
			if(lang.isObject(this.data) && !(this.data instanceof Date) && !(this.data instanceof RegExp)){	
				for(var x in this){
					if(this[x] && lang.isFunction(this[x].reset)){
						this[x].reset();
					}
				}
			}else{
				this.set("value", this.data);
			}
		},

		commit: function(/*"dojo.store.DataStore?"*/ store){
			// summary:
			//		Commits this data model:
			//		- Saves the current state such that a subsequent reset will not
			//		  undo any prior changes.
			//		- Persists client-side changes to the data store, if a store
			//		  has been supplied as a parameter or at instantiation.
			//	store:
			//		dojo.store.DataStore
			//		Optional dojo.store.DataStore to use for this commit, if none
			//		provided but one was provided at instantiation time, that store
			//		will be used instead.
			this._commit();
			var ds = store || this.store;
			if(ds){
				this._saveToStore(ds);
			}
		},

		toPlainObject: function(){
			// summary:
			//		Produces a plain JavaScript object representation of the data
			//		currently within this data model.
			// returns:
			//		Object
			//		The plain JavaScript object representation of the data in this
			//		model.
			var ret = {};
			var nested = false;
			for(var p in this){
				if(this[p] && lang.isFunction(this[p].toPlainObject)){
					if(!nested && typeof this.get("length") === "number"){
						ret = [];
					}
					nested = true;
					ret[p] = this[p].toPlainObject();
				}
			}
			if(!nested){
				if(this.get("length") === 0){
					ret = [];
				}else{				
					ret = this.value;
				}
			}
			return ret;
		},

		add: function(/*String*/ name, /*dojo.Stateful*/ stateful){
			// summary:
			//		Adds a dojo.Stateful tree represented by the given
			//		dojox.mvc.StatefulModel at the given property name.
			//	name:
			//		The property name to use whose value will become the given
			//		dijit.Stateful tree.
			//	stateful:
			//		The dojox.mvc.StatefulModel to insert.
			// description:
			//		In case of arrays, the property names are indices passed
			//		as Strings. An addition of such a dojo.Stateful node
			//		results in right-shifting any trailing sibling nodes.
			var n, n1, elem, elem1, save = new StatefulModel({ data : "" });
			if(typeof this.get("length") === "number" && /^[0-9]+$/.test(name.toString())){
				n = name;
				if(!this.get(n)){
					if(this.get("length") == 0 && n == 0){ // handle the empty array case
						this.set(n, stateful);
					} else {
						n1 = n-1;
						if(!this.get(n1)){
							throw new Error("Out of bounds insert attempted, must be contiguous.");
						}
						this.set(n, stateful);
					}
				}else{
					n1 = n-0+1;
					elem = stateful;
					elem1 = this.get(n1);
					if(!elem1){
						this.set(n1, elem);
					}else{
						do{
							this._copyStatefulProperties(elem1, save);
							this._copyStatefulProperties(elem, elem1);
							this._copyStatefulProperties(save, elem);
							this.set(n1, elem1); // for watchers
							elem1 = this.get(++n1);
						}while(elem1);
						this.set(n1, elem);
					}
				}
				this.set("length", this.get("length") + 1);
			}else{
				this.set(name, stateful);
			}
		},

		remove: function(/*String*/ name){
			// summary:
			//		Removes the dojo.Stateful tree at the given property name.
			//	name:
			//		The property name from where the tree will be removed.
			// description:
			//		In case of arrays, the property names are indices passed
			//		as Strings. A removal of such a dojo.Stateful node
			//		results in left-shifting any trailing sibling nodes.
			var n, elem, elem1;
			if(typeof this.get("length") === "number" && /^[0-9]+$/.test(name.toString())){
				n = name;
				elem = this.get(n);
				if(!elem){
					throw new Error("Out of bounds delete attempted - no such index: " + n);
				}else{
					this._removals = this._removals || [];
					this._removals.push(elem.toPlainObject());
					n1 = n-0+1;
					elem1 = this.get(n1);
					if(!elem1){
						this.set(n, undefined);
						delete this[n];
					}else{
						while(elem1){
							this._copyStatefulProperties(elem1, elem);
							elem = this.get(n1++);
							elem1 = this.get(n1);
						}
						this.set(n1-1, undefined);
						delete this[n1-1];
					}
					this.set("length", this.get("length") - 1);
				}
			}else{
				elem = this.get(name);
				if(!elem){
					throw new Error("Illegal delete attempted - no such property: " + name);
				}else{
					this._removals = this._removals || [];
					this._removals.push(elem.toPlainObject());
					this.set(name, undefined);
					delete this[name];
				}
			}
		},

		valueOf: function(){
			// summary:
			//		Returns the value representation of the data currently within this data model.
			// returns:
			//		Object
			//		The object representation of the data in this model.
			return this.toPlainObject();
		},

		toString: function(){
			// summary:
			//		Returns the string representation of the data currently within this data model.
			// returns:
			//		String
			//		The object representation of the data in this model.
			return this.value === "" && this.data ? this.data.toString() : this.value.toString();
		},

		//////////////////////// PRIVATE INITIALIZATION METHOD ////////////////////////

		constructor: function(/*Object*/ args){
			// summary:
			//		Instantiates a new data model that view components may bind to.
			//		This is a private constructor, use the factory method
			//		instead: dojox.mvc.newStatefulModel(args)
			//	args:
			//		The mixin properties.
			// description:
			//		Creates a tree of dojo.Stateful objects matching the initial
			//		data structure passed as input. The mixin property "data" is
			//		used to provide a plain JavaScript object directly representing
			//		the data structure.
			// tags:
			//		private
			var data = (args && "data" in args) ? args.data : this.data; 
			this._createModel(data);
		},

		//////////////////////// PRIVATE METHODS ////////////////////////

		_createModel: function(/*Object*/ obj){
			// summary:
			//		Create this data model from provided input data.
			//	obj:
			//		The input for the model, as a plain JavaScript object.
			// tags:
			//		private
			if(lang.isObject(obj) && !(obj instanceof Date) && !(obj instanceof RegExp) && obj !== null){
				for(var x in obj){
					var newProp = new StatefulModel({ data : obj[x] });
					this.set(x, newProp);
				}
				if(lang.isArray(obj)){
					this.set("length", obj.length);
				}
			}else{
				this.set("value", obj);
			}
		},

		_commit: function(){
			// summary:
			//		Commits this data model, saves the current state into data to become the saved state, 
			//		so a reset will not undo any prior changes.  
			// tags:
			//		private
			for(var x in this){
				if(this[x] && lang.isFunction(this[x]._commit)){
					this[x]._commit();
				}
			}
			this.data = this.toPlainObject();
		},

		_saveToStore: function(/*"dojo.store.DataStore"*/ store){
			// summary:
			//		Commit the current values to the data store:
			//		- remove() any deleted entries
			//		- put() any new or updated entries
			//	store:
			//		dojo.store.DataStore to use for this commit.
			// tags:
			//		private
			if(this._removals){
				array.forEach(this._removals, function(d){
					store.remove(store.getIdentity(d));
				}, this);
				delete this._removals;
			}
			var dataToCommit = this.toPlainObject();
			if(lang.isArray(dataToCommit)){
				array.forEach(dataToCommit, function(d){
					store.put(d);
				}, this);
			}else{
				store.put(dataToCommit);
			}
		},

		_copyStatefulProperties: function(/*dojo.Stateful*/ src, /*dojo.Stateful*/ dest){
			// summary:
			//		Copy only the dojo.Stateful properties from src to dest (uses
			//		duck typing).
			//	src:
			//		The source object for the copy.
			//	dest:
			//		The target object of the copy.
			// tags:
			//		private
			for(var x in src){
				var o = src.get(x);
				if(o && lang.isObject(o) && lang.isFunction(o.get)){
					dest.set(x, o);
				}
			}
		}
	});

	return StatefulModel;
});
