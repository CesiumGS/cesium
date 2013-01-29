define([
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/dom-attr",
	"dojo/i18n",
	"dojo/query",
	"dojo/keys",
	"dijit/form/_FormValueWidget",
	"dijit/form/ValidationTextBox",
	"dojo/text!./resources/PasswordValidator.html",
	"dojo/i18n!./nls/PasswordValidator",
	"dojo/_base/declare"
], function(array, lang, domAttr, i18n, query, keys, FormValueWidget, ValidationTextBox, template, formNlsPasswordValidator, declare){

var _ChildTextBox = declare("dojox.form._ChildTextBox", ValidationTextBox, {
	// summary:
	//		A class that is shared between all our children - extends
	//		ValidationTextBox and provides some shared functionality

	// containerWidget: widget
	//		Our parent (the PasswordValidator)
	containerWidget: null,

	// type: string
	//		Don't override this - we are all "password" types
	type: "password",

	reset: function(){
		// summary:
		//		Force-set to empty string (we don't save passwords EVER)...and
		//		since _OldPWBox overrides _setValueAttr to check for empty string,
		//		call our parent class directly (not this.inherited())
		ValidationTextBox.prototype._setValueAttr.call(this, "", true);
		this._hasBeenBlurred = false;
	},

	postCreate: function(){
		// summary:
		//		We want to remove the "name" attribute from our focus node if
		//		we don't have one set - this prevents all our extra values
		//		from being posted on submit
		this.inherited(arguments);
		if(!this.name){
			domAttr.remove(this.focusNode, "name");
		}
		this.connect(this.focusNode, "onkeypress", "_onChildKeyPress");
	},

	_onChildKeyPress: function(e){
		// Check if we pressed <enter> - if so, set our blur value so that
		// the parent widget will be updated correctly.
		if(e && e.keyCode == keys.ENTER){
			this._setBlurValue();
		}
	}
});



var _OldPWBox = declare("dojox.form._OldPWBox", _ChildTextBox, {
	// summary:
	//		A class representing our "old password" box.
	//
	// _isPWValid: boolean
	//		Whether or not the password is valid
	_isPWValid: false,

	_setValueAttr: function(/*anything*/ newVal, /*Boolean?*/ priority){
		// summary:
		//		Updates _isPWValid if this isn't our initial update by calling
		//		our PasswordValidator's pwCheck function
		if(newVal === ""){
			newVal = _OldPWBox.superclass.attr.call(this, "value");
		}
		if(priority !== null){
			// Priority is passed in as null, explicitly when this is an
			// update (not initially set).  We want to check our password now.
			this._isPWValid = this.containerWidget.pwCheck(newVal);
		}
		this.inherited(arguments);
		// Trigger the containerWidget to recheck its value, if needed
		this.containerWidget._childValueAttr(this.containerWidget._inputWidgets[1].get("value"));
	},

	isValid: function(/*Boolean*/ isFocused){
		// Take into account the isPWValid setting
		return this.inherited("isValid", arguments) && this._isPWValid;
	},

	_update: function(/*Event*/ e){
		// Only call validate() if we've been blurred or else we get popups
		// too early.
		if(this._hasBeenBlurred){ this.validate(true); }
		this._onMouse(e);
	},

	_getValueAttr: function(){
		if(this.containerWidget._started && this.containerWidget.isValid()){
			return this.inherited(arguments);
		}
		return "";
	},

	_setBlurValue: function(){
		// TextBox._setBlurValue calls this._setValueAttr(this.get('value'), ...)
		// Because we are overridding _getValueAttr to return "" when the containerWidget
		// is not valid, TextBox._setBlurValue will cause OldPWBox's value to be set to ""
		//
		// So, we directly call ValidationTextBox._getValueAttr to bypass our _getValueAttr
		var value = ValidationTextBox.prototype._getValueAttr.call(this);
		this._setValueAttr(value, (this.isValid ? this.isValid() : true));
	}
});


var _NewPWBox = declare("dojox.form._NewPWBox", _ChildTextBox, {
	// summary:
	//		A class representing our new password textbox

	// required: boolean
	//		Whether or not this widget is required (default: true)
	required: true,

	onChange: function(){
		// summary:
		//		Validates our verify box - to make sure that a change to me is
		//		reflected there
		this.containerWidget._inputWidgets[2].validate(false);
		this.inherited(arguments);
	}
});

var _VerifyPWBox = declare("dojox.form._VerifyPWBox", _ChildTextBox, {
	// summary:
	//		A class representing our verify textbox

	isValid: function(isFocused){
		// summary:
		//		Validates that we match the "real" password
		return this.inherited("isValid", arguments) &&
			(this.get("value") == this.containerWidget._inputWidgets[1].get("value"));
	}
});

return declare("dojox.form.PasswordValidator", FormValueWidget, {
	// summary:
	//		A password validation widget that simplifies the "old/new/verify"
	//		style of requesting passwords.  You will probably want to override
	//		this class and implement your own pwCheck function.

	// required: boolean
	//		Whether or not it is required for form submission
	required: true,

	// inputWidgets: TextBox[]
	//		An array of text boxes that are our components
	_inputWidgets: null,

	// oldName: string?
	//		The name to send our old password as (when form is posted)
	oldName: "",

	templateString: template,

	_hasBeenBlurred: false,

	isValid: function(/*Boolean*/ isFocused){
		// summary:
		//		we are valid if ALL our children are valid
		return array.every(this._inputWidgets, function(i){
			if(i && i._setStateClass){ i._setStateClass(); }
			return (!i || i.isValid());
		});
	},

	validate: function(/*Boolean*/ isFocused){
		// summary:
		//		Validating this widget validates all our children
		return array.every(array.map(this._inputWidgets, function(i){
			if(i && i.validate){
				i._hasBeenBlurred = (i._hasBeenBlurred || this._hasBeenBlurred);
				return i.validate();
			}
			return true;
		}, this), function(item){ return item; });
	},

	reset: function(){
		// summary:
		//		Resetting this widget resets all our children
		this._hasBeenBlurred = false;
		array.forEach(this._inputWidgets, function(i){
			if(i && i.reset){ i.reset(); }
		}, this);
	},

	_createSubWidgets: function(){
		// summary:
		//		Turns the inputs inside this widget into "real" validation
		//		widgets - and sets up the needed connections.
		var widgets = this._inputWidgets,
			msg = i18n.getLocalization("dojox.form", "PasswordValidator", this.lang);
		array.forEach(widgets, function(i, idx){
			if(i){
				var p = {containerWidget: this}, c;
				if(idx === 0){
					p.name = this.oldName;
					p.invalidMessage = msg.badPasswordMessage;
					c = _OldPWBox;
				}else if(idx === 1){
					p.required = this.required;
					c = _NewPWBox;
				}else if(idx === 2){
					p.invalidMessage = msg.nomatchMessage;
					c = _VerifyPWBox;
				}
				widgets[idx] = new c(p, i);
			}
		}, this);
	},

	pwCheck: function(/*String*/ password){
		// summary:
		//		Overridable function for validation of the old password box.
		//
		//		This function is called and passed the old password.  Return
		//		true if it's OK to continue, and false if it is not.
		//
		//		IMPORTANT SECURITY NOTE:  Do NOT EVER EVER EVER check this in
		//		HTML or JavaScript!!!
		//
		//		You will probably want to override this function to callback
		//		to a server to verify the password (the callback will need to
		//		be synchronous) - and it's probably a good idea to validate
		//		it again on form submission before actually doing
		//		anything destructive - that's why the "oldName" value
		//		is available.
		//
		//		And don't just fetch the password from the server
		//		either :)  Send the test password (probably hashed, for
		//		security) and return from the server a status instead.
		//
		//		Again - DON'T BE INSECURE!!!  Security is left as an exercise
		//		for the reader :)
		return false;
	},

	postCreate: function(){
		// summary:
		//		Sets up the correct widgets.  You *MUST* specify one child
		//		text box (a simple HTML `<input>` element) with pwType="new"
		//		*and* one child text box with pwType="verify".  You *MAY*
		//		specify a third child text box with pwType="old" in order to
		//		prompt the user to enter in their old password before the
		//		widget returns that it is valid.

		this.inherited(arguments);

		// Turn my inputs into the correct stuff....
		var widgets = this._inputWidgets = [];
		array.forEach(["old","new","verify"], function(i){
			widgets.push(query("input[pwType=" + i + "]", this.containerNode)[0]);
		}, this);
		if(!widgets[1] || !widgets[2]){
			throw new Error("Need at least pwType=\"new\" and pwType=\"verify\"");
		}
		if(this.oldName && !widgets[0]){
			throw new Error("Need to specify pwType=\"old\" if using oldName");
		}
		this.containerNode = this.domNode;
		this._createSubWidgets();
		this.connect(this._inputWidgets[1], "_setValueAttr", "_childValueAttr");
		this.connect(this._inputWidgets[2], "_setValueAttr", "_childValueAttr");
	},

	_childValueAttr: function(v){
		this.set("value", this.isValid() ? v : "");
	},

	_setDisabledAttr: function(value){
		this.inherited(arguments);
		array.forEach(this._inputWidgets, function(i){
			if(i && i.set){ i.set("disabled", value);}
		});
	},

	_setRequiredAttribute: function(value){
		this.required = value;
		domAttr.set(this.focusNode, "required", value);
		this.focusNode.setAttribute("aria-required", value);
		this._refreshState();
		array.forEach(this._inputWidgets, function(i){
			if(i && i.set){ i.set("required", value);}
		});
	},

	_setValueAttr: function(v){
		this.inherited(arguments);
		domAttr.set(this.focusNode, "value", v);
	},

	_getValueAttr: function(){
		// Make sure we don't return undefined.... maybe should do conversion in _setValueAttr() instead?
		return this.value||"";
	},

	focus: function(){
		// summary:
		//		places focus on the first invalid input widget - if all
		//		input widgets are valid, the first widget is focused.
		var f = false;
		array.forEach(this._inputWidgets, function(i){
			if(i && !i.isValid() && !f){
				i.focus();
				f = true;
			}
		});
		if(!f){ this._inputWidgets[1].focus(); }
	}
});
});
