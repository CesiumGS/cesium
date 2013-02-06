define([
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/_base/declare",
	"./ModelRefController"
], function(array, lang, declare, ModelRefController){
	function unwatchHandles(/*dojox/mvc/ListController*/ c){
		// summary:
		//		Unwatch model watch handles.

		for(var s in {"_listModelWatchHandle": 1, "_tableModelWatchHandle": 1}){
			if(c[s]){
				c[s].unwatch();
				c[s] = null;
			}
		}
	}

	function setRefInModel(/*dojox/mvc/ListController*/ ctrl, /*dojo/Stateful*/ old, /*dojo/Stateful*/ current){
		// summary:
		//		A function called when this controller gets newer value as the list data.

		unwatchHandles(ctrl);
		if(current && old !== current){
			if(current.watchElements){
				ctrl._listModelWatchHandle = current.watchElements(function(idx, removals, adds){
					if(removals && adds){
						var curIdx = ctrl.get("cursorIndex");
						// If selected element is removed, make "no selection" state
						if(removals && curIdx >= idx && curIdx < idx + removals.length){
							ctrl.set("cursorIndex", -1);
							return;
						}
						// If selected element is equal to or larger than the removals/adds point, update the selected index
						if((removals.length || adds.length) && curIdx >= idx){
							ctrl.set(ctrl._refCursorProp, ctrl.get("cursor"));
						}
					}else{
						// If there is a update to the whole array, update the selected index 
						ctrl.set(ctrl._refCursorProp, ctrl.get(ctrl._refCursorProp));
					}
				});
			}else if(current.set && current.watch){
				if(ctrl.get("cursorIndex") < 0){ ctrl._set("cursorIndex", ""); }
				ctrl._tableModelWatchHandle = current.watch(function(name, old, current){
					if(old !== current && name == ctrl.get("cursorIndex")){
						ctrl.set(ctrl._refCursorProp, current);
					}
				});
			}
		}
		ctrl._setCursorIndexAttr(ctrl.cursorIndex);
	}

	function setRefCursor(/*dojox/mvc/ListController*/ ctrl, /*dojo/Stateful*/ old, /*dojo/Stateful*/ current){
		// summary:
		//		A function called when this controller gets newer value as the data of current selection.
		// description:
		//		Finds the index associated with the given element, and updates cursorIndex property.

		var model = ctrl[ctrl._refInModelProp];
		if(!model){ return; }
		if(old !== current){
			if(lang.isArray(model)){
				var foundIdx = array.indexOf(model, current);
				if(foundIdx < 0){
					var targetIdx = ctrl.get("cursorIndex");
					if(targetIdx >= 0 && targetIdx < model.length){
						model.set(targetIdx, current);
					}
				}else{
					ctrl.set("cursorIndex", foundIdx);
				}
			}else{
				for(var s in model){
					if(model[s] == current){
						ctrl.set("cursorIndex", s);
						return;
					}
				}
				var targetIdx = ctrl.get("cursorIndex");
				if(targetIdx){
					model.set(targetIdx, current);
				}
			}
		}
	}

	return declare("dojox.mvc.ListController", ModelRefController, {
		// summary:
		//		A controller working with array model, managing its cursor.
		//		NOTE - If this class is used with a widget by data-dojo-mixins, make sure putting the widget in data-dojo-type and putting this class to data-dojo-mixins.
		// example:
		//		The text box changes its value every two seconds.
		// |		<html>
		// |			<head>
		// |				<script src="/path/to/dojo-toolkit/dojo/dojo.js" type="text/javascript" data-dojo-config="parseOnLoad: 0"></script>
		// |				<script type="text/javascript">
		// |					require([
		// |						"dojo/parser", "dijit/registry", "dojox/mvc/StatefulArray",
		// |						"dijit/form/TextBox", "dojox/mvc/ListController", "dojo/domReady!"
		// |					], function(parser, registry, StatefulArray){
		// |						var count = 0;
		// |						model = new StatefulArray([{value: "First"}, {value: "Second"}, {value: "Third"}, {value: "Fourth"}, {value: "Fifth"}]);
		// |						setInterval(function(){ registry.byId("ctrl").set("cursorIndex", ++count % 5); }, 2000);
		// |						parser.parse();
		// |					});
		// |				</script>
		// |			</head>
		// |			<body>
		// |				<script type="dojo/require">at: "dojox/mvc/at"</script>
		// |				<span id="ctrl" data-dojo-type="dojox/mvc/ListController" data-dojo-props="model: model"></span>
		// |				<input type="text" data-dojo-type="dijit/form/TextBox" data-dojo-props="value: at('widget:ctrl', 'value')">
		// |			</body>
		// |		</html>

		// idProperty: String
		//		The property name in element in the model array, that works as its identifier.
		idProperty: "uniqueId",

		// cursorId: String
		//		The ID of the selected element in the model array.
		cursorId: null,

		// cursorIndex: Number|String
		//		The index of the selected element in the model.
		cursorIndex: -1,

		// cursor: dojo/Stateful
		//		The selected element in the model array.
		cursor: null,

		// model: dojox/mvc/StatefulArray
		//		The data model working as an array.
		model: null,

		// _listModelWatchHandle: Object
		//		The watch handle of model, watching for array elements.
		_listModelWatchHandle: null,

		// _tableModelWatchHandle: Object
		//		The watch handle of model.
		_tableModelWatchHandle: null,

		// _refCursorProp: String
		//		The property name for the data model of the current selection.
		_refCursorProp: "cursor",

		// _refModelProp: String
		//		The property name for the data model.
		_refModelProp: "cursor",

		destroy: function(){
			unwatchHandles(this);
			this.inherited(arguments);
		},

		set: function(/*String*/ name, /*Anything*/ value){
			// summary:
			//		Set a property to this.
			// name: String
			//		The property to set.
			// value: Anything
			//		The value to set in the property.

			var oldRefInCursor = this[this._refCursorProp];
			var oldRefInModel = this[this._refInModelProp];
			this.inherited(arguments);
			if(name == this._refCursorProp){
				setRefCursor(this, oldRefInCursor, value);
			}
			if(name == this._refInModelProp){
				setRefInModel(this, oldRefInModel, value);
			}
		},

		_setCursorIdAttr: function(/*String*/ value){
			// summary:
			//		Handler for calls to set("cursorId", val).
			// description:
			//		Finds the index associated with the given cursor ID, and updates cursorIndex property.

			var old = this.cursorId;
			this._set("cursorId", value);
			var model = this[this._refInModelProp];
			if(!model){ return; }
			if(old !== value){
				if(lang.isArray(model)){
					for(var i = 0; i < model.length; i++){
						if(model[i][this.idProperty] == value){
							this.set("cursorIndex", i);
							return;
						}
					}
					this._set("cursorIndex", -1);
				}else{
					for(var s in model){
						if(model[s][this.idProperty] == value){
							this.set("cursorIndex", s);
							return;
						}
					}
					this._set("cursorIndex", "");
				}
			}
		},

		_setCursorIndexAttr: function(/*Number*/ value){
			// summary:
			//		Handler for calls to set("cursorIndex", val).
			// description:
			//		Updates cursor, cursorId, cursorIndex properties internally and call watch callbacks for them.

			this._set("cursorIndex", value);
			if(!this[this._refInModelProp]){ return; }
			this.set(this._refCursorProp, this[this._refInModelProp][value]);
			this.set("cursorId", this[this._refInModelProp][value] && this[this._refInModelProp][value][this.idProperty]);
		},

		hasControllerProperty: function(/*String*/ name){
			// summary:
			//		Returns true if this controller itself owns the given property.
			// name: String
			//		The property name.

			return this.inherited(arguments) || name == this._refCursorProp;
		}
	});
});
