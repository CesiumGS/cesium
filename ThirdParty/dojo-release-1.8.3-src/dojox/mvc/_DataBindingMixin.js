define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/Stateful",
	"dijit/registry"
], function(kernel, lang, array, declare, Stateful, registry){

	kernel.deprecated("dojox.mvc._DataBindingMixin", "Use dojox/mvc/at for data binding.");

	// Note: This should be a plain Object, not a Class.
	// But no need to change it since it's deprecated.
	return declare("dojox.mvc._DataBindingMixin", null, {
		// summary:
		//		Deprecated.  Use dojox/mvc/at for data binding.
		//		Provides the ability for dijits or custom view components to become
		//		data binding aware.
		//
		// description:
		//		Data binding awareness enables dijits or other view layer
		//		components to bind to locations within a client-side data model,
		//		which is commonly an instance of the dojox/mvc/StatefulModel class. A
		//		bind is a bi-directional update mechanism which is capable of
		//		synchronizing value changes between the bound dijit or other view
		//		component and the specified location within the data model, as well
		//		as changes to other properties such as "valid", "required",
		//		"readOnly" etc.
		//
		//		The data binding is commonly specified declaratively via the "ref"
		//		property in the "data-dojo-props" attribute value.
		//
		//		Consider the following simple example:
		//
		//		|	<script>
		//		|		var model;
		//		|		require(["dijit/StatefulModel", "dojo/parser"], function(StatefulModel, parser){
		//		|			model = new StatefulModel({ data : {
		//		|				hello : "Hello World"
		//		|			}});
		//		|			parser.parse();
		//		|		});
		//		|	</script>
		//		|
		//		|	<input id="hello1" data-dojo-type="dijit/form/TextBox"
		//		|		data-dojo-props="ref: model.hello"></input>
		//		|
		//		|	<input id="hello2" data-dojo-type="dijit/form/TextBox"
		//		|		data-dojo-props="ref: model.hello"></input>
		//
		//		In the above example, both dijit/form/TextBox instances (with IDs
		//		"hello1" and "hello2" respectively) are bound to the same reference
		//		location in the data model i.e. "hello" via the "ref" expression
		//		"model.hello". Both will have an initial value of "Hello World".
		//		Thereafter, a change in the value of either of the two textboxes
		//		will cause an update of the value in the data model at location
		//		"hello" which will in turn cause a matching update of the value in
		//		the other textbox.
		// tags:
		//		deprecated
	
		// ref: [deprecated] String||dojox/mvc/StatefulModel
		//		The value of the data binding expression passed declaratively by
		//		the developer. This usually references a location within an
		//		existing datamodel and may be a relative reference based on the
		//		parent / container data binding (dot-separated string).
		ref: null,

/*=====
		// binding: [readOnly] dojox/mvc/StatefulModel
		//		The read only value of the resolved data binding for this widget.
		//		This may be a result of resolving various relative refs along
		//		the parent axis.
		binding: null,
=====*/

		//////////////////////// PUBLIC METHODS ////////////////////////
	
		isValid: function(){
			// summary:
			//		Returns the validity of the data binding.
			// returns:
			//		Boolean
			//		The validity associated with the data binding.
			// description:
			//		This function is meant to provide an API bridge to the dijit API.
			//		Validity of data-bound dijits is a function of multiple concerns:
			//
			//		- The validity of the value as ascertained by the data binding
			//		  and constraints specified in the data model (usually semantic).
			//		- The validity of the value as ascertained by the widget itself
			//		  based on widget constraints (usually syntactic).
			//
			//		In order for dijits to function correctly in data-bound
			//		environments, it is imperative that their isValid() functions
			//		assess the model validity of the data binding via the
			//		this.inherited(arguments) hierarchy and declare any values
			//		failing the test as invalid.
			var valid = this.get("valid");
			return typeof valid != "undefined" ? valid : this.get("binding") ? this.get("binding").get("valid") : true;
		},

		//////////////////////// LIFECYCLE METHODS ////////////////////////

		_dbstartup: function(){
			// summary:
			//		Tie data binding initialization into the widget lifecycle, at
			//		widget startup.
			// tags:
			//		private
			if(this._databound){
				return;
			}
			this._unwatchArray(this._viewWatchHandles);
			// add 2 new view watches, active only after widget has started up
			this._viewWatchHandles = [
				// 1. data binding refs
				this.watch("ref", function(name, old, current){
					if(this._databound && old !== current){
						this._setupBinding();
					}
				}),
				// 2. widget values
				this.watch("value", function(name, old, current){
					if(this._databound){
						var binding = this.get("binding");
						if(binding){
							// dont set value if the valueOf current and old match.
							if(!((current && old) && (old.valueOf() === current.valueOf()))){
								binding.set("value", current);
							}
						}
					}
				})
			];
			this._beingBound = true;
			this._setupBinding();
			delete this._beingBound;
			this._databound = true;
		},

		//////////////////////// PRIVATE METHODS ////////////////////////

		_setupBinding: function(parentBinding){
			// summary:
			//		Calculate and set the dojo/Stateful data binding for the
			//		associated dijit or custom view component.
			// parentBinding:
			//		The binding of this widget/view component's data-bound parent,
			//		if available.
			// description:
			//		The declarative data binding reference may be specified in two
			//		ways via markup:
			//
			//		- For older style documents (non validating), controls may use
			//		  the "ref" attribute to specify the data binding reference
			//		  (String).
			//		- For validating documents using the new Dojo parser, controls
			//		  may specify the data binding reference (String) as the "ref"
			//		  property specified in the data-dojo-props attribute.
			//
			//		Once the ref value is obtained using either of the above means,
			//		the binding is set up for this control and its required, readOnly
			//		etc. properties are refreshed.
			//		The data binding may be specified as a direct reference to the
			//		dojo/Stateful model node or as a string relative to its DOM
			//		parent or another widget.
			//		There are three ways in which the data binding node reference is
			//		calculated when specified as a string:
			//
			//		- If an explicit parent widget is specified, the binding is
			//		  calculated relative to the parent widget's data binding.
			//		- For any dijits that specify a data binding reference,
			//		  we walk up their DOM hierarchy to obtain the first container
			//		  dijit that has a data binding set up and use the reference String
			//		  as a property name relative to the parent's data binding context.
			//		- If no such parent is found i.e. for the outermost container
			//		  dijits that specify a data binding reference, the binding is
			//		  calculated by treating the reference String as an expression and
			//		  evaluating it to obtain the dojo/Stateful node in the datamodel.
			//
			//		This method calls console.warn in these two conditions:
			//
			//		- The ref is an expression i.e. outermost bound dijit, but the
			//		  expression evaluation fails.
			//		- The calculated binding turns out to not be an instance of a
			//		  dojo/Stateful node.
			// tags:
			//		private

			if(!this.ref){
				return; // nothing to do here
			}
			var ref = this.ref, pw, pb, binding;
			// Now compute the model node to bind to
			if(ref && lang.isFunction(ref.toPlainObject)){ // programmatic instantiation or direct ref
				binding = ref;
			}else if(/^\s*expr\s*:\s*/.test(ref)){ // declarative: refs as dot-separated expressions
				ref = ref.replace(/^\s*expr\s*:\s*/, "");
				binding = lang.getObject(ref);
			}else if(/^\s*rel\s*:\s*/.test(ref)){ // declarative: refs relative to parent binding, dot-separated 
				ref = ref.replace(/^\s*rel\s*:\s*/, "");
				parentBinding = parentBinding || this._getParentBindingFromDOM();
				if(parentBinding){
					binding = lang.getObject("" + ref, false, parentBinding);
				}
			}else if(/^\s*widget\s*:\s*/.test(ref)){ // declarative: refs relative to another dijits binding, dot-separated
				ref = ref.replace(/^\s*widget\s*:\s*/, "");
				var tokens = ref.split(".");
				if(tokens.length == 1){
					binding = registry.byId(ref).get("binding");
				}else{
					pb = registry.byId(tokens.shift()).get("binding");
					binding = lang.getObject(tokens.join("."), false, pb);
				}
			}else{ // defaults: outermost refs are expressions, nested are relative to parents
				parentBinding = parentBinding || this._getParentBindingFromDOM();
				if(parentBinding){
					binding = lang.getObject("" + ref, false, parentBinding);
				}else{
					try{
						var b = lang.getObject("" + ref) || {};
						if(lang.isFunction(b.set) && lang.isFunction(b.watch)){
							binding = b;
						}						
					}catch(err){
						if(ref.indexOf("${") == -1){ // Ignore templated refs such as in repeat body
							console.warn("dojox/mvc/_DataBindingMixin: '" + this.domNode +
								"' widget with illegal ref not evaluating to a dojo/Stateful node: '" + ref + "'");
						}
					}
				}
			}
			if(binding){
				if(lang.isFunction(binding.toPlainObject)){
					this.binding = binding;
					if(this[this._relTargetProp || "target"] !== binding){
						this.set(this._relTargetProp || "target", binding);
					}
					this._updateBinding("binding", null, binding);
				}else{
					console.warn("dojox/mvc/_DataBindingMixin: '" + this.domNode +
						"' widget with illegal ref not evaluating to a dojo/Stateful node: '" + ref + "'");
				}
			}
		},

		_isEqual: function(one, other){
			// test for equality
			return one === other ||
				// test for NaN === NaN
				isNaN(one) && typeof one === 'number' &&
				isNaN(other) && typeof other === 'number';
		},

		_updateBinding: function(name, old, current){
			// summary:
			//		Set the data binding to the supplied value, which must be a
			//		dojo/Stateful node of a data model.
			// name:
			//		The name of the binding property (always "binding").
			// old:
			//		The old dojo/Stateful binding node of the data model.
			// current:
			//		The new dojo/Stateful binding node of the data model.
			// description:
			//		Applies the specified data binding to the attached widget.
			//		Loses any prior watch registrations on the previously active
			//		bind, registers the new one, updates data binds of any contained
			//		widgets and also refreshes all associated properties (valid,
			//		required etc.)
			// tags:
			//		private
	
			// remove all existing watches (if there are any, there will be 5)
			this._unwatchArray(this._modelWatchHandles);
			// add 5 new model watches
			var binding = this.get("binding");
			if(binding && lang.isFunction(binding.watch)){
				var pThis = this;
				this._modelWatchHandles = [
					// 1. value - no default
					binding.watch("value", function (name, old, current){
						if(pThis._isEqual(old, current)){return;}
						if(pThis._isEqual(pThis.get('value'), current)){return;}
						pThis.set("value", current);
					}),
					// 2. valid - default "true"
					binding.watch("valid", function (name, old, current){
						pThis._updateProperty(name, old, current, true);
						if(current !== pThis.get(name)){
							if(pThis.validate && lang.isFunction(pThis.validate)){
								pThis.validate();
							}
						}
					}),
					// 3. required - default "false"
					binding.watch("required", function (name, old, current){
						pThis._updateProperty(name, old, current, false, name, current);
					}),
					// 4. readOnly - default "false"
					binding.watch("readOnly", function (name, old, current){
						pThis._updateProperty(name, old, current, false, name, current);
					}),
					// 5. relevant - default "true"
					binding.watch("relevant", function (name, old, current){
						pThis._updateProperty(name, old, current, false, "disabled", !current);
					})
				];
				var val = binding.get("value");
				if(val != null){
					this.set("value", val);
				}
			}
			this._updateChildBindings();
		},
	
		_updateProperty: function(name, old, current, defaultValue, setPropName, setPropValue){
			// summary:
			//		Update a binding property of the bound widget.
			// name:
			//		The binding property name.
			// old:
			//		The old value of the binding property.
			// current:
			//		The new or current value of the binding property.
			// defaultValue:
			//		The optional value to be applied as the current value of the
			//		binding property if the current value is null.
			// setPropName:
			//		The optional name of a stateful property to set on the bound
			//		widget.
			// setPropValue:
			//		The value, if an optional name is provided, for the stateful
			//		property of the bound widget.
			// tags:
			//		private
			if(old === current){
				return;
			}
			if(current === null && defaultValue !== undefined){
				current = defaultValue;
			}
			if(current !== this.get("binding").get(name)){
				this.get("binding").set(name, current);
			}
			if(setPropName){
				this.set(setPropName, setPropValue);
			}
		},

		_updateChildBindings: function(parentBind){
			// summary:
			//		Update this widget's value based on the current binding and
			//		set up the bindings of all contained widgets so as to refresh
			//		any relative binding references. 
			//		findWidgets does not return children of widgets so need to also
			//		update children of widgets which are not bound but may hold widgets which are.
			// parentBind:
			//		The binding on the parent of a widget whose children may have bindings 
			//		which need to be updated.
			// tags:
			//		private
			var binding = this.get("binding") || parentBind;
			if(binding && !this._beingBound){
				array.forEach(registry.findWidgets(this.domNode), function(widget){
					if(widget.ref && widget._setupBinding){
						widget._setupBinding(binding);
					}else{	
						widget._updateChildBindings(binding);
					}
				});
			}
		},

		_getParentBindingFromDOM: function(){
			// summary:
			//		Get the parent binding by traversing the DOM ancestors to find
			//		the first enclosing data-bound widget.
			// returns:
			//		The parent binding, if one exists along the DOM parent axis.
			// tags:
			//		private
			var pn = this.domNode.parentNode, pw, pb;
			while(pn){
				pw = registry.getEnclosingWidget(pn);
				if(pw){
					pb = pw.get("binding");
					if(pb && lang.isFunction(pb.toPlainObject)){
						break;
					}
				}
				pn = pw ? pw.domNode.parentNode : null;
			}
			return pb;
		},

		_unwatchArray: function(watchHandles){
			// summary:
			//		Given an array of watch handles, unwatch all.
			// watchHandles:
			//		The array of watch handles.
			// tags:
			//		private
			array.forEach(watchHandles, function(h){ h.unwatch(); });
		}
	});
});
