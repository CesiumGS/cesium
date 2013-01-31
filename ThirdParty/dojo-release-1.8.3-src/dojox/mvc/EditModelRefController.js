define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"./getPlainValue",
	"./getStateful",
	"./ModelRefController"
], function(declare, lang, getPlainValue, getStateful, ModelRefController){
	// module:
	//		dojox/mvc/EditModelRefController

	function setRefSourceModel(/*dojox/mvc/EditModelRefController*/ ctrl, /*Anything*/ old, /*Anything*/ current){
		// summary:
		//		A function called when this controller gets newer value as the data source.
		// ctrl: dojox/mvc/EditModelRefController
		//		The controller.
		// old: Anything
		//		The older value.
		// current: Anything
		//		The newer value.

		if(old !== current){
			ctrl.set(ctrl._refOriginalModelProp, ctrl.holdModelUntilCommit ? current : ctrl.cloneModel(current));
			ctrl.set(ctrl._refEditModelProp, ctrl.holdModelUntilCommit ? ctrl.cloneModel(current) : current);
		}
	}

	return declare("dojox.mvc.EditModelRefController", ModelRefController, {
		// summary:
		//		A child class of dojox/mvc/ModelRefController.
		//		Keeps a copy (originalModel) of given data model (sourceModel) so that it can manage the data model of before/after the edit.
		// description:
		//		Has two modes:
		//
		//		- Directly reflect the edits to sourceModel (holdModelUntilCommit=false)
		//		- Don't reflect the edits to sourceModel, until commit() is called (holdModelUntilCommit=true)
		//
		//		For the 1st case, dojo/Stateful get()/set()/watch() interfaces will work with sourceModel.
		//		For the 2nd case, dojo/Stateful get()/set()/watch() interfaces will work with a copy of sourceModel, and sourceModel will be replaced with such copy when commit() is called.
		//
		//		NOTE - If this class is used with a widget by data-dojo-mixins, make sure putting the widget in data-dojo-type and putting this class to data-dojo-mixins.
		// example:
		//		The check box refers to "value" property in the controller (with "ctrl" ID).
		//		The controller provides the "value" property on behalf of the model ("model" property in the controller, which comes from "sourceModel" property).
		//		Two seconds later, the check box changes from unchecked to checked, and the controller saves the state.
		//		Two seconds later then, the check box changes from checked to unchecked.
		//		Two seconds later then, the controller goes back to the last saved state, and the check box changes from unchecked to checked as the result.
		// |		<html>
		// |			<head>
		// |				<script src="/path/to/dojo-toolkit/dojo/dojo.js" type="text/javascript" data-dojo-config="parseOnLoad: 0"></script>
		// |				<script type="text/javascript">
		// |					require([
		// |						"dojo/dom", "dojo/parser", "dojo/Stateful", "dijit/registry", "dijit/form/CheckBox", "dojox/mvc/EditModelRefController", "dojo/domReady!"
		// |					], function(ddom, parser, Stateful, registry){
		// |						model = new Stateful({value: false});
		// |						setTimeout(function(){
		// |							ddom.byId("check").click();
		// |							registry.byId("ctrl").commit();
		// |							setTimeout(function(){
		// |								ddom.byId("check").click();
		// |								setTimeout(function(){
		// |									registry.byId("ctrl").reset();
		// |								}, 2000);
		// |							}, 2000);
		// |						}, 2000);
		// |						parser.parse();
		// |					});
		// |				</script>
		// |			</head>
		// |			<body>
		// |				<script type="dojo/require">at: "dojox/mvc/at"</script>
		// |				<span id="ctrl" data-dojo-type="dojox/mvc/EditModelRefController" data-dojo-props="sourceModel: model"></span>
		// |				<input id="check" type="checkbox" data-dojo-type="dijit/form/CheckBox" data-dojo-props="checked: at('widget:ctrl', 'value')">
		// |			</body>
		// |		</html>
		// example:
		//		The controller with "ctrlSource" ID specifies holding changes until commit() is called (by setting true to holdModelUntilCommit).
		//		As the change in the second check box is committed two seconds later from the change, the first check box is checked at then (when the change is committed).
		// |		<html>
		// |			<head>
		// |				<script src="/path/to/dojo-toolkit/dojo/dojo.js" type="text/javascript" data-dojo-config="parseOnLoad: 0"></script>
		// |				<script type="text/javascript">
		// |					require([
		// |						"dojo/dom", "dojo/parser", "dojo/Stateful", "dijit/registry",
		// |						"dijit/form/CheckBox", "dojox/mvc/ModelRefController", "dojox/mvc/EditModelRefController", "dojo/domReady!"
		// |					], function(ddom, parser, Stateful, registry){
		// |						model = new Stateful({value: false});
		// |						setTimeout(function(){
		// |							ddom.byId("checkEdit").click();
		// |							setTimeout(function(){
		// |								registry.byId("ctrlEdit").commit();
		// |							}, 2000);
		// |						}, 2000);
		// |						parser.parse();
		// |					});
		// |				</script>
		// |			</head>
		// |			<body>
		// |				<script type="dojo/require">at: "dojox/mvc/at"</script>
		// |				<span id="ctrlSource" data-dojo-type="dojox/mvc/ModelRefController" data-dojo-props="model: model"></span>
		// |				<span id="ctrlEdit" data-dojo-type="dojox/mvc/EditModelRefController"
		// |				 data-dojo-props="sourceModel: at('widget:ctrlSource', 'model'), holdModelUntilCommit: true"></span>
		// |				Source:
		// |				<input id="checkSource" type="checkbox" data-dojo-type="dijit/form/CheckBox"
		// |				 data-dojo-props="checked: at('widget:ctrlSource', 'value')">
		// |				Edit:
		// |				<input id="checkEdit" type="checkbox" data-dojo-type="dijit/form/CheckBox"
		// |				 data-dojo-props="checked: at('widget:ctrlEdit', 'value')">
		// |			</body>
		// |		</html>

		// getStatefulOptions: dojox/mvc/getStatefulOptions
		//		The options to get stateful object from plain value.
		getStatefulOptions: null,

		// getPlainValueOptions: dojox/mvc/getPlainValueOptions
		//		The options to get plain value from stateful object.
		getPlainValueOptions: null,

		// holdModelUntilCommit: Boolean
		//		True not to send the change in model back to sourceModel until commit() is called.
		holdModelUntilCommit: false,

		// originalModel: dojo/Stateful
		//		The data model, that serves as the original data.
		originalModel: null,

		// originalModel: dojo/Stateful
		//		The data model, that serves as the data source.
		sourceModel: null,

		// _refOriginalModelProp: String
		//		The property name for the data model, that serves as the original data.
		_refOriginalModelProp: "originalModel",

		// _refSourceModelProp: String
		//		The property name for the data model, that serves as the data source.
		_refSourceModelProp: "sourceModel",

		// _refEditModelProp: String
		//		The property name for the data model, that is being edited.
		_refEditModelProp: "model",

		postscript: function(/*Object?*/ params, /*DomNode|String?*/ srcNodeRef){
			// summary:
			//		Sets certain properties before setting models.

			for(var s in {getStatefulOptions: 1, getPlainValueOptions: 1, holdModelUntilCommit: 1}){
				var value = (params || {})[s];
				if(typeof value != "undefined"){
					this[s] = value;
				}
			}
			this.inherited(arguments);
		},

		set: function(/*String*/ name, /*Anything*/ value){
			// summary:
			//		Set a property to this.
			// name: String
			//		The property to set.
			// value: Anything
			//		The value to set in the property.

			if(name == this._refSourceModelProp){
				setRefSourceModel(this, this[this._refSourceModelProp], value);
			}
			this.inherited(arguments);
		},

		cloneModel: function(/*Anything*/ value){
			// summary:
			//		Create a clone object of the data source.
			//		Child classes of this controller can override it to achieve its specific needs.
			// value: Anything
			//		The data serving as the data source.

			var plain = lang.isFunction((value || {}).set) && lang.isFunction((value || {}).watch) ? getPlainValue(value, this.getPlainValueOptions) : value;
			return getStateful(plain, this.getStatefulOptions);
		},

		commit: function(){
			// summary:
			//		Send the change back to the data source.

			this.set(this.holdModelUntilCommit ? this._refSourceModelProp : this._refOriginalModelProp, this.cloneModel(this.get(this._refEditModelProp)));
		},

		reset: function(){
			// summary:
			//		Change the model back to its original state.

			this.set(this.holdModelUntilCommit ? this._refEditModelProp : this._refSourceModelProp, this.cloneModel(this.get(this._refOriginalModelProp)));
		},

		hasControllerProperty: function(/*String*/ name){
			// summary:
			//		Returns true if this controller itself owns the given property.
			// name: String
			//		The property name.

			return this.inherited(arguments) || name == this._refOriginalModelProp || name == this._refSourceModelProp;
		}
	});
});
