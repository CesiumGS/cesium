define([
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/_base/declare", // declare
	"dojo/_base/array", // array.indexOf
	"dojo/_base/lang", // lang.isArray, lang.isString
	"dojo/_base/event", // event.stop
	"dojo/query", // query()
	"dojo/dom-attr", // domAttr.set
	"dojo/text!./resources/TriStateCheckBox.html",
	"dijit/form/Button",
	"dijit/form/_ToggleButtonMixin",
	"dojo/NodeList-dom" // NodeList.addClass/removeClass
], function(kernel, declare, array, lang, event, query, domAttr, template, Button, _ToggleButtonMixin){

return declare("dojox.form.TriStateCheckBox", [Button, _ToggleButtonMixin], {
	// summary:
	//		Checkbox with three states
	
		templateString: template,

		baseClass: "dojoxTriStateCheckBox",

		// type: [private] String
		//		type attribute on `<input>` node.
		//		Overrides `dijit/form/Button.type`.  Users should not change this value.
		type: "checkbox",

		// states: Array
		//		States of TriStateCheckBox.
		//		The value of This.checked should be one of these three states:
		//		[false, true, "mixed"]
		states: "",

		// _stateLabels: Object
		//		These characters are used to replace the image to show
		//		current state of TriStateCheckBox in high contrast mode. This is an associate array of
		//      states with their corresponding replacing characters. State can either be "False", "True" or "Mixed".
		 _stateLabels: null,

		// stateValues: Object
		//		The values of the TriStateCheckBox in corresponding states. This is an associate array of
		//      states with their corresponding values. State can either be "False", "True" or "Mixed".
		stateValue: null,

		// _currentState: Integer
		//		The current state of the TriStateCheckBox
		_currentState: 0,

		// _stateType: String
		//		The current state type of the TriStateCheckBox
		//		Could be "False", "True" or "Mixed"
		_stateType: "False",

		// readOnly: Boolean
		//		Should this widget respond to user input?
		//		In markup, this is specified as "readOnly".
		//		Similar to disabled except readOnly form values are submitted.
		readOnly: false,

		// checked: Boolean|String
		//		Current check state of the check box.
		checked: "",
		
		// aria-pressed for toggle buttons, and aria-checked for checkboxes
		_aria_attr: "aria-checked",

		constructor: function(){
			// summary:
			//		Runs on widget initialization to setup arrays etc.
			// tags:
			//		private
			this.states = [false, "mixed", true];
			this.checked = false;
			this._stateLabels = {
				"False": '&#9633;',
				"True": '&#8730;',
				"Mixed": '&#9632;'
			};
			this.stateValues = {
				"False": false,
				"True": "on",
				"Mixed": "mixed"
			};
		},
		
		_fillContent: function(/*DomNode*/ source){
			// Override Button::_fillContent() since it doesn't make sense for CheckBox,
			// since CheckBox doesn't even have a container
		},
		
		postCreate: function(){
			domAttr.set(this.stateLabelNode, 'innerHTML', this._stateLabels[this._stateType]);
			this.inherited(arguments);
		},
		
		startup: function(){
			this.set("checked", this.params.checked || this.states[this._currentState]);
			domAttr.set(this.stateLabelNode, 'innerHTML', this._stateLabels[this._stateType]);
			this.inherited(arguments);
		},
		
		// Override behavior from Button, since we don't have an iconNode
		_setIconClassAttr: null,
		
		_setCheckedAttr: function(/*String|Boolean*/ checked, /*Boolean?*/ priorityChange){
			// summary:
			//		Handler for checked = attribute to constructor, and also calls to
			//		set('checked', val).
			// checked:
			//		true, false or 'mixed'
			// description:
			//		Controls the state of the TriStateCheckBox. Set this.checked,
			//		this._currentState, value attribute of the `<input type=checkbox>`
			//		according to the value of 'checked'.			
			var stateIndex = array.indexOf(this.states, checked), changed = false;
			if(stateIndex >= 0){
				this._currentState = stateIndex;
				this._stateType = this._getStateType(checked);
				domAttr.set(this.focusNode, "value", this.stateValues[this._stateType]);
				domAttr.set(this.stateLabelNode, 'innerHTML', this._stateLabels[this._stateType]);
				this.inherited(arguments);
			}else{
				console.warn("Invalid state!");
			}
		},

		setChecked: function(/*String|Boolean*/ checked){
			// summary:
			//		Deprecated.  Use set('checked', true/false) instead.
			kernel.deprecated("setChecked("+checked+") is deprecated. Use set('checked',"+checked+") instead.", "", "2.0");
			this.set('checked', checked);
		},

		_setStatesAttr: function(/*Array|String*/ states){
			if(lang.isArray(states)){
				this._set("states", states);
			}else if(lang.isString(states)){
				var map = {
					"true": true,
					"false": false,
					"mixed": "mixed"
				};
				states = states.split(/\s*,\s*/);
				for(var i = 0; i < states.length; i++){
					states[i] = map[states[i]] !== undefined ? map[states[i]] : false;
				}
				this._set("states", states);
			}
		},
		
		_setReadOnlyAttr: function(/*Boolean*/ value){
			this._set("readOnly", value);
			domAttr.set(this.focusNode, "readOnly", value);
		},

		_setValueAttr: function(/*String|Boolean*/ newValue, /*Boolean*/ priorityChange){
			// summary:
			//		Handler for value = attribute to constructor, and also calls to
			//		set('value', val).
			// description:
			//		During initialization, just saves as attribute to the `<input type=checkbox>`.
			//
			//		After initialization,
			//		when passed a boolean or the string 'mixed', controls the state of the
			//		TriStateCheckBox.
			//		If passed a string except 'mixed', changes the value attribute of the
			//		TriStateCheckBox. Sets the state of the TriStateCheckBox to checked.
			if(typeof newValue == "string" && (array.indexOf(this.states, newValue) < 0)){
				if(newValue == ""){
					newValue = "on";
				}
				this.stateValues["True"] = newValue;
				newValue = true;
			}
			if(this._created){
				this._currentState = array.indexOf(this.states, newValue);
				this.set('checked', newValue, priorityChange);
				domAttr.set(this.focusNode, "value", this.stateValues[this._stateType]);
			}
		},

		_setValuesAttr: function(/*Array*/ newValues){
			// summary:
			//		Handler for values = attribute to constructor, and also calls to
			//		set('values', val).
			// newValues:
			//		If the length of newValues is 1, it will replace the value of
			//		the TriStateCheckBox in true state. Otherwise, the values of
			//		the TriStateCheckBox in true state and 'mixed' state will be
			//		replaced by the first two values in newValues.
			// description:
			//		Change the value of the TriStateCheckBox in 'mixed' and true states.
			this.stateValues["True"] = newValues[0] ? newValues[0] : this.stateValues["True"];
			this.stateValues["Mixed"] = newValues[1] ? newValues[1] : this.stateValues["Mixed"];
		},

		_getValueAttr: function(){
			// summary:
			//		Hook so get('value') works.
			// description:
			//		Returns value according to current state of the TriStateCheckBox.
			return this.stateValues[this._stateType];
		},

		reset: function(){
			this._hasBeenBlurred = false;
			this.set("states", this.params.states || [false, "mixed", true]);
			this.stateValues = this.params.stateValues || {
				"False" : false,
				"True" : "on",
				"Mixed" : "mixed"
			};
			this.set("values", this.params.values || []);
			this.set('checked', this.params.checked || this.states[0]);
		},

		_onFocus: function(){
			if(this.id){
				query("label[for='"+this.id+"']").addClass("dijitFocusedLabel");
			}
			this.inherited(arguments);
		},

		_onBlur: function(){
			if(this.id){
				query("label[for='"+this.id+"']").removeClass("dijitFocusedLabel");
			}
			this.mouseFocus = false;
			this.inherited(arguments);
		},

		_onClick: function(/*Event*/ e){
			// summary:
			//		Internal function to handle click actions - need to check
			//		readOnly and disabled
			if(this.readOnly || this.disabled){
				event.stop(e);
				return false;
			}
			this.click();
			return this.onClick(e); // user click actions
		},

		click: function(){
			// summary:
			//		Emulate a click on the check box, but will not trigger the
			//		onClick method.
			if(this._currentState >= this.states.length - 1){
				this._currentState = 0;
			}else{
				if(this._currentState == -1){
					this.fixState();
				}else{
					this._currentState++;
				}
			}
			var oldState = this._currentState;
			this.set("checked", this.states[this._currentState]);
			this._currentState = oldState;
			domAttr.set(this.stateLabelNode, 'innerHTML', this._stateLabels[this._stateType]);
		},
		
		fixState: function(){
			// summary:
			//		Fix _currentState property if it's out of bound.
			this._currentState = this.states.length - 1;
		},
		
		_getStateType: function(/*String|Boolean*/ state){
			// summary:
			//		Internal function to return the type of a certain state:
			//
			//		- false: False
			//		- true: True
			//		- "mixed": Mixed
			return state ? (state == "mixed" ? "Mixed" : "True") : "False";
		},
		
		_onMouseDown: function(){
			this.mouseFocus = true;
		}
	});

});
