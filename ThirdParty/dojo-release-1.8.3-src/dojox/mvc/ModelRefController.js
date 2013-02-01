define([
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/Stateful",
	"./_Controller"
], function(array, declare, lang, Stateful, _Controller){
	return declare("dojox.mvc.ModelRefController", _Controller, {
		// summary:
		//		A controller that keeps a reference to dojo/Stateful-based data model.
		// description:
		//		Does the following on behalf of such model:
		//
		//		- Provides data from model via dojo/Stateful get() interface
		//		- Stores data to model via dojo/Stateful set() interface
		//		- Watches for change in model via dojo/Stateful watch() interface (The callback is called when there is a change in data model, as well as when the data model itself is replaced with different one)
		//
		//		Can also be used to do some application-specific stuffs upon change in properties in model, by defining setter functions. 
		//		Doing so will help keep models and widgets free from application-specific logic, and will help keep application logic free from specifics of models and widgets.
		//		Such kind of setter functions can be defined in the same manner as widgets (_setXXXAttr()).
		//
		//		NOTE - If this class is used with a widget by data-dojo-mixins, make sure putting the widget in data-dojo-type and putting this class to data-dojo-mixins.
		// example:
		//		The text box refers to "value" property in the controller (with "ctrl" ID).
		//		The controller provides the "value" property on behalf of the model ("model" property in the controller).
		//		Two seconds later, the text box changes from "Foo" to "Bar" as the controller changes the data model it refers to.
		// |		<html>
		// |			<head>
		// |				<script src="/path/to/dojo-toolkit/dojo/dojo.js" type="text/javascript" data-dojo-config="parseOnLoad: 0"></script>
		// |				<script type="text/javascript">
		// |					require([
		// |						"dojo/parser", "dojo/Stateful", "dijit/registry",
		// |						"dijit/form/TextBox", "dojox/mvc/ModelRefController", "dojo/domReady!"
		// |					], function(parser, Stateful, registry){
		// |						modelFoo = new Stateful({value: "Foo"});
		// |						modelBar = new Stateful({value: "Bar"});
		// |						setTimeout(function(){ registry.byId("ctrl").set("model", modelBar); }, 2000);
		// |						parser.parse();
		// |					});
		// |				</script>
		// |			</head>
		// |			<body>
		// |				<script type="dojo/require">at: "dojox/mvc/at"</script>
		// |				<span id="ctrl" data-dojo-type="dojox/mvc/ModelRefController" data-dojo-props="model: modelFoo"></span>
		// |				<input type="text" data-dojo-type="dijit/form/TextBox" data-dojo-props="value: at('widget:ctrl', 'value')">
		// |			</body>
		// |		</html>

		// ownProps: Object
		//		List of property names owned by this controller, instead of the data model.
		ownProps: null,

		// _refModelProp: String
		//		The property name for the data model.
		_refModelProp: "model",

		// _refInModelProp: String
		//		The property name for the data model, used as the input.
		//		Used when this controller needs data model (as input) that is different from the data model this controller provides.
		_refInModelProp: "model",

		// model: dojo/Stateful
		//		The data model.
		model: null,

		postscript: function(/*Object?*/ params, /*DomNode|String?*/ srcNodeRef){
			// summary:
			//		Sets _relTargetProp so that the property specified by _refModelProp is used for relative data binding.

			this._relTargetProp = (params || {})._refModelProp || this._refModelProp;
			this.inherited(arguments);
		},

		get: function(/*String*/ name){
			// summary:
			//		If getter function is there, use it. Otherwise, get the data from data model of this object.
			// name: String
			//		The property name.

			if(!this.hasControllerProperty(name)){
				var model = this[this._refModelProp];
				return !model ? void 0 : model.get ? model.get(name) : model[name];
			}
			return this.inherited(arguments);
		},

		_set: function(/*String*/ name, /*Anything*/ value){
			// summary:
			//		Set the value to the data model or to this object.
			// name: String
			//		The property name.
			// value: Anything
			//		The property value.

			if(!this.hasControllerProperty(name)){
				var model = this[this._refModelProp];
				model && (model.set ? model.set(name, value) : (model[name] = value));
				return this;
			}
			return this.inherited(arguments);
		},

		watch: function(/*String?*/ name, /*Function*/ callback){
			// summary:
			//		Watch a property in the data model or in this object.
			// name: String?
			//		The property name.
			// callback: Function
			//		The callback function.

			if(this.hasControllerProperty(name)){
				return this.inherited(arguments);
			}

			if(!callback){
				callback = name;
				name = null;
			}

			var hm = null, hp = null, _self = this;

			function watchPropertiesInModel(/*dojo/Stateful*/ model){
				// summary:
				//		Watch properties in referred model.
				// model: dojo/Stateful
				//		The model to watch for.

				// Unwatch properties of older model.
				if(hp){ hp.unwatch(); }
				// Watch properties of newer model.
				if(model && lang.isFunction(model.set) && lang.isFunction(model.watch)){
					hp = model.watch.apply(model, (name ? [name] : []).concat([function(name, old, current){ callback.call(_self, name, old, current); }]));
				}
			}

			function reflectChangeInModel(/*dojo/Stateful*/ old, /*dojo/Stateful*/ current){
				// summary:
				//		Upon change in model, detect change in properties, and call watch callbacks.
				// old: dojo/Stateful
				//		The older model.
				// current: dojo/Stateful
				//		The newer model.

				// Gather list of properties to notify change in value as model changes.
				var props = {};
				if(!name){
					// If all properties are being watched, find out all properties from older model as well as from newer model.
					array.forEach([old, current], function(model){
						var list = model && model.get("properties");
						if(list){
							// If the model explicitly specifies the list of properties, use it.
							array.forEach(list, function(item){
								if(!_self.hasControllerProperty(item)){ props[item] = 1; }
							});
						}else{
							// Otherwise, iterate through own properties.
							for(var s in model){
								if(model.hasOwnProperty(s) && !_self.hasControllerProperty(s)){ props[s] = 1; }
							}
						}
					});
				}else{
					props[name] = 1;
				}

				// Call watch callbacks for properties.
				for(var s in props){
					callback.call(_self, s, !old ? void 0 : old.get ? old.get(s) : old[s], !current ? void 0 : current.get ? current.get(s) : current[s]);
				}
			}

			// Watch for change in model.
			hm = Stateful.prototype.watch.call(this, this._refModelProp, function(name, old, current){
				if(old === current){ return; }
				reflectChangeInModel(old, current);
				watchPropertiesInModel(current);
			});

			// Watch for properties in model.
			watchPropertiesInModel(this.get(this._refModelProp));

			var h = {};
			h.unwatch = h.remove = function(){
				if(hp){ hp.unwatch(); hp = null; } if(hm){ hm.unwatch(); hm = null; }
			};
			return h; // dojo/handle
		},

		hasControllerProperty: function(/*String*/ name){
			// summary:
			//		Returns true if this controller itself owns the given property.
			// name: String
			//		The property name.

			return name == "_watchCallbacks" || name == this._refModelProp || name == this._refInModelProp || (name in (this.ownProps || {})) || (name in this.constructor.prototype) || /^dojoAttach(Point|Event)$/i.test(name); // Let dojoAttachPoint/dojoAttachEvent be this controller's property to support <span data-dojo-type="dojox/mvc/ModelRefController" data-dojo-attach-point="controllerNode"> in widgets-in-template
		}
	});
});
