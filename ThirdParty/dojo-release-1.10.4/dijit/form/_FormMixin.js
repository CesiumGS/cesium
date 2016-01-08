define([
	"dojo/_base/array", // array.every array.filter array.forEach array.indexOf array.map
	"dojo/_base/declare", // declare
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/_base/lang", // lang.hitch lang.isArray
	"dojo/on",
	"dojo/window" // winUtils.scrollIntoView
], function(array, declare, kernel, lang, on, winUtils){

	// module:
	//		dijit/form/_FormMixin

	return declare("dijit.form._FormMixin", null, {
		// summary:
		//		Mixin for containers of form widgets (i.e. widgets that represent a single value
		//		and can be children of a `<form>` node or `dijit/form/Form` widget)
		// description:
		//		Can extract all the form widgets
		//		values and combine them into a single javascript object, or alternately
		//		take such an object and set the values for all the contained
		//		form widgets

	/*=====
		// value: Object
		//		Name/value hash for each child widget with a name and value.
		//		Child widgets without names are not part of the hash.
		//
		//		If there are multiple child widgets w/the same name, value is an array,
		//		unless they are radio buttons in which case value is a scalar (since only
		//		one radio button can be checked at a time).
		//
		//		If a child widget's name is a dot separated list (like a.b.c.d), it's a nested structure.
		//
		//		Example:
		//	|	{ name: "John Smith", interests: ["sports", "movies"] }
	=====*/

		// state: [readonly] String
		//		Will be "Error" if one or more of the child widgets has an invalid value,
		//		"Incomplete" if not all of the required child widgets are filled in.  Otherwise, "",
		//		which indicates that the form is ready to be submitted.
		state: "",

		// TODO:
		//	* Repeater
		//	* better handling for arrays.  Often form elements have names with [] like
		//	* people[3].sex (for a list of people [{name: Bill, sex: M}, ...])


		_getDescendantFormWidgets: function(/*dijit/_WidgetBase[]?*/ children){
			// summary:
			//		Returns all form widget descendants, searching through non-form child widgets like BorderContainer
			var res = [];
			array.forEach(children || this.getChildren(), function(child){
				if("value" in child){
					res.push(child);
				}else{
					res = res.concat(this._getDescendantFormWidgets(child.getChildren()));
				}
			}, this);
			return res;
		},

		reset: function(){
			array.forEach(this._getDescendantFormWidgets(), function(widget){
				if(widget.reset){
					widget.reset();
				}
			});
		},

		validate: function(){
			// summary:
			//		returns if the form is valid - same as isValid - but
			//		provides a few additional (ui-specific) features:
			//
			//		1. it will highlight any sub-widgets that are not valid
			//		2. it will call focus() on the first invalid sub-widget
			var didFocus = false;
			return array.every(array.map(this._getDescendantFormWidgets(), function(widget){
				// Need to set this so that "required" widgets get their
				// state set.
				widget._hasBeenBlurred = true;
				var valid = widget.disabled || !widget.validate || widget.validate();
				if(!valid && !didFocus){
					// Set focus of the first non-valid widget
					winUtils.scrollIntoView(widget.containerNode || widget.domNode);
					widget.focus();
					didFocus = true;
				}
				return valid;
			}), function(item){ return item; });
		},

		setValues: function(val){
			kernel.deprecated(this.declaredClass+"::setValues() is deprecated. Use set('value', val) instead.", "", "2.0");
			return this.set('value', val);
		},
		_setValueAttr: function(/*Object*/ obj){
			// summary:
			//		Fill in form values from according to an Object (in the format returned by get('value'))

			// generate map from name --> [list of widgets with that name]
			var map = { };
			array.forEach(this._getDescendantFormWidgets(), function(widget){
				if(!widget.name){ return; }
				var entry = map[widget.name] || (map[widget.name] = [] );
				entry.push(widget);
			});

			for(var name in map){
				if(!map.hasOwnProperty(name)){
					continue;
				}
				var widgets = map[name],						// array of widgets w/this name
					values = lang.getObject(name, false, obj);	// list of values for those widgets

				if(values === undefined){
					continue;
				}
				values = [].concat(values);
				if(typeof widgets[0].checked == 'boolean'){
					// for checkbox/radio, values is a list of which widgets should be checked
					array.forEach(widgets, function(w){
						w.set('value', array.indexOf(values, w._get('value')) != -1);
					});
				}else if(widgets[0].multiple){
					// it takes an array (e.g. multi-select)
					widgets[0].set('value', values);
				}else{
					// otherwise, values is a list of values to be assigned sequentially to each widget
					array.forEach(widgets, function(w, i){
						w.set('value', values[i]);
					});
				}
			}

			/***
			 *	TODO: code for plain input boxes (this shouldn't run for inputs that are part of widgets)

			array.forEach(this.containerNode.elements, function(element){
				if(element.name == ''){return};	// like "continue"
				var namePath = element.name.split(".");
				var myObj=obj;
				var name=namePath[namePath.length-1];
				for(var j=1,len2=namePath.length;j<len2;++j){
					var p=namePath[j - 1];
					// repeater support block
					var nameA=p.split("[");
					if(nameA.length > 1){
						if(typeof(myObj[nameA[0]]) == "undefined"){
							myObj[nameA[0]]=[ ];
						} // if

						nameIndex=parseInt(nameA[1]);
						if(typeof(myObj[nameA[0]][nameIndex]) == "undefined"){
							myObj[nameA[0]][nameIndex] = { };
						}
						myObj=myObj[nameA[0]][nameIndex];
						continue;
					} // repeater support ends

					if(typeof(myObj[p]) == "undefined"){
						myObj=undefined;
						break;
					};
					myObj=myObj[p];
				}

				if(typeof(myObj) == "undefined"){
					return;		// like "continue"
				}
				if(typeof(myObj[name]) == "undefined" && this.ignoreNullValues){
					return;		// like "continue"
				}

				// TODO: widget values (just call set('value', ...) on the widget)

				// TODO: maybe should call dojo.getNodeProp() instead
				switch(element.type){
					case "checkbox":
						element.checked = (name in myObj) &&
							array.some(myObj[name], function(val){ return val == element.value; });
						break;
					case "radio":
						element.checked = (name in myObj) && myObj[name] == element.value;
						break;
					case "select-multiple":
						element.selectedIndex=-1;
						array.forEach(element.options, function(option){
							option.selected = array.some(myObj[name], function(val){ return option.value == val; });
						});
						break;
					case "select-one":
						element.selectedIndex="0";
						array.forEach(element.options, function(option){
							option.selected = option.value == myObj[name];
						});
						break;
					case "hidden":
					case "text":
					case "textarea":
					case "password":
						element.value = myObj[name] || "";
						break;
				}
			});
			*/

			// Note: no need to call this._set("value", ...) as the child updates will trigger onChange events
			// which I am monitoring.
		},

		getValues: function(){
			kernel.deprecated(this.declaredClass+"::getValues() is deprecated. Use get('value') instead.", "", "2.0");
			return this.get('value');
		},
		_getValueAttr: function(){
			// summary:
			//		Returns Object representing form values.   See description of `value` for details.
			// description:

			// The value is updated into this.value every time a child has an onChange event,
			// so in the common case this function could just return this.value.   However,
			// that wouldn't work when:
			//
			// 1. User presses return key to submit a form.  That doesn't fire an onchange event,
			// and even if it did it would come too late due to the defer(...) in _handleOnChange()
			//
			// 2. app for some reason calls this.get("value") while the user is typing into a
			// form field.   Not sure if that case needs to be supported or not.

			// get widget values
			var obj = { };
			array.forEach(this._getDescendantFormWidgets(), function(widget){
				var name = widget.name;
				if(!name || widget.disabled){ return; }

				// Single value widget (checkbox, radio, or plain <input> type widget)
				var value = widget.get('value');

				// Store widget's value(s) as a scalar, except for checkboxes which are automatically arrays
				if(typeof widget.checked == 'boolean'){
					if(/Radio/.test(widget.declaredClass)){
						// radio button
						if(value !== false){
							lang.setObject(name, value, obj);
						}else{
							// give radio widgets a default of null
							value = lang.getObject(name, false, obj);
							if(value === undefined){
								lang.setObject(name, null, obj);
							}
						}
					}else{
						// checkbox/toggle button
						var ary=lang.getObject(name, false, obj);
						if(!ary){
							ary=[];
							lang.setObject(name, ary, obj);
						}
						if(value !== false){
							ary.push(value);
						}
					}
				}else{
					var prev=lang.getObject(name, false, obj);
					if(typeof prev != "undefined"){
						if(lang.isArray(prev)){
							prev.push(value);
						}else{
							lang.setObject(name, [prev, value], obj);
						}
					}else{
						// unique name
						lang.setObject(name, value, obj);
					}
				}
			});

			/***
			 * code for plain input boxes (see also domForm.formToObject, can we use that instead of this code?
			 * but it doesn't understand [] notation, presumably)
			var obj = { };
			array.forEach(this.containerNode.elements, function(elm){
				if(!elm.name)	{
					return;		// like "continue"
				}
				var namePath = elm.name.split(".");
				var myObj=obj;
				var name=namePath[namePath.length-1];
				for(var j=1,len2=namePath.length;j<len2;++j){
					var nameIndex = null;
					var p=namePath[j - 1];
					var nameA=p.split("[");
					if(nameA.length > 1){
						if(typeof(myObj[nameA[0]]) == "undefined"){
							myObj[nameA[0]]=[ ];
						} // if
						nameIndex=parseInt(nameA[1]);
						if(typeof(myObj[nameA[0]][nameIndex]) == "undefined"){
							myObj[nameA[0]][nameIndex] = { };
						}
					}else if(typeof(myObj[nameA[0]]) == "undefined"){
						myObj[nameA[0]] = { }
					} // if

					if(nameA.length == 1){
						myObj=myObj[nameA[0]];
					}else{
						myObj=myObj[nameA[0]][nameIndex];
					} // if
				} // for

				if((elm.type != "select-multiple" && elm.type != "checkbox" && elm.type != "radio") || (elm.type == "radio" && elm.checked)){
					if(name == name.split("[")[0]){
						myObj[name]=elm.value;
					}else{
						// can not set value when there is no name
					}
				}else if(elm.type == "checkbox" && elm.checked){
					if(typeof(myObj[name]) == 'undefined'){
						myObj[name]=[ ];
					}
					myObj[name].push(elm.value);
				}else if(elm.type == "select-multiple"){
					if(typeof(myObj[name]) == 'undefined'){
						myObj[name]=[ ];
					}
					for(var jdx=0,len3=elm.options.length; jdx<len3; ++jdx){
						if(elm.options[jdx].selected){
							myObj[name].push(elm.options[jdx].value);
						}
					}
				} // if
				name=undefined;
			}); // forEach
			***/
			return obj;
		},

		isValid: function(){
			// summary:
			//		Returns true if all of the widgets are valid.
			//		Deprecated, will be removed in 2.0.  Use get("state") instead.

			return this.state == "";
		},

		onValidStateChange: function(/*Boolean*/ /*===== isValid =====*/){
			// summary:
			//		Stub function to connect to if you want to do something
			//		(like disable/enable a submit button) when the valid
			//		state changes on the form as a whole.
			//
			//		Deprecated.  Will be removed in 2.0.  Use watch("state", ...) instead.
		},

		_getState: function(){
			// summary:
			//		Compute what this.state should be based on state of children
			var states = array.map(this._descendants, function(w){
				return w.get("state") || "";
			});

			return array.indexOf(states, "Error") >= 0 ? "Error" :
				array.indexOf(states, "Incomplete") >= 0 ? "Incomplete" : "";
		},

		disconnectChildren: function(){
			// summary:
			//		Deprecated method.   Applications no longer need to call this.   Remove for 2.0.
		},

		connectChildren: function(/*Boolean*/ inStartup){
			// summary:
			//		You can call this function directly, ex. in the event that you
			//		programmatically add a widget to the form *after* the form has been
			//		initialized.

			// TODO: rename for 2.0

			this._descendants = this._getDescendantFormWidgets();

			// To get notifications from children they need to be started.   Children didn't used to need to be started,
			// so for back-compat, start them here
			array.forEach(this._descendants, function(child){
				if(!child._started){ child.startup(); }
			});

			if(!inStartup){
				this._onChildChange();
			}
		},

		_onChildChange: function(/*String*/ attr){
			// summary:
			//		Called when child's value or disabled state changes

			// The unit tests expect state update to be synchronous, so update it immediately.
			if(!attr || attr == "state" || attr == "disabled"){
				this._set("state", this._getState());
			}

			// Use defer() to collapse value changes in multiple children into a single
			// update to my value.   Multiple updates will occur on:
			//	1. Form.set()
			//	2. Form.reset()
			//	3. user selecting a radio button (which will de-select another radio button,
			//		 causing two onChange events)
			if(!attr || attr == "value" || attr == "disabled" || attr == "checked"){
				if(this._onChangeDelayTimer){
					this._onChangeDelayTimer.remove();
				}
				this._onChangeDelayTimer = this.defer(function(){
					delete this._onChangeDelayTimer;
					this._set("value", this.get("value"));
				}, 10);
			}
		},

		startup: function(){
			this.inherited(arguments);

			// Set initial this.value and this.state.   Don't emit watch() notifications.
			this._descendants = this._getDescendantFormWidgets();
			this.value = this.get("value");
			this.state = this._getState();

			// Initialize value and valid/invalid state tracking.
			var self = this;
			this.own(
				on(
					this.containerNode,
					"attrmodified-state, attrmodified-disabled, attrmodified-value, attrmodified-checked",
					function(evt){
						if(evt.target == self.domNode){
							return;	// ignore events that I fire on myself because my children changed
						}
						self._onChildChange(evt.type.replace("attrmodified-", ""));
					}
				)
			);

			// Make state change call onValidStateChange(), will be removed in 2.0
			this.watch("state", function(attr, oldVal, newVal){ this.onValidStateChange(newVal == ""); });
		},

		destroy: function(){
			this.inherited(arguments);
		}

	});
});
