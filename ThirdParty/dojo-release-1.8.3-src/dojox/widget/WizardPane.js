define([
	"dojo/_base/lang",
	"dojo/_base/declare",
	"dojo/_base/connect",
	"dijit/layout/StackContainer",
	"dijit/layout/ContentPane",
	"dijit/form/Button",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dojo/i18n",
	"dojo/text!./Wizard/Wizard.html",
	"dojo/i18n!dijit/nls/common",
	"dojo/i18n!./nls/Wizard",
	"dojox/widget/WizardPane"
], function (lang, declare, connect, StackContainer, ContentPane, Button, _TemplatedMixin, _WidgetsInTemplateMixin, i18n, template, wizardPane) {
  
var WizardPane = declare("dojox.widget.WizardPane", ContentPane, {
	// summary:
	//		A panel in a `dojox.widget.Wizard`
	// description:
	//		An extended ContentPane with additional hooks for passing named
	//		functions to prevent the pane from going either forward or
	//		backwards.

	// canGoBack: Boolean
	//		If true, then can move back to a previous panel (by clicking the "Previous" button)
	canGoBack: true,

	// passFunction: String
	//		Name of function that checks if it's OK to advance to the next panel.
	//		If it's not OK (for example, mandatory field hasn't been entered), then
	//		returns an error message (String) explaining the reason. Can return null (pass)
	//		or a Boolean (true == pass)
	passFunction: null,
	
	// doneFunction: String
	//		Name of function that is run if you press the "Done" button from this panel
	doneFunction: null,

	startup: function(){
		this.inherited(arguments);
		if(this.isFirstChild){ this.canGoBack = false; }
		if(lang.isString(this.passFunction)){
			this.passFunction = lang.getObject(this.passFunction);
		}
		if(lang.isString(this.doneFunction) && this.doneFunction){
			this.doneFunction = lang.getObject(this.doneFunction);
		}
	},

	_onShow: function(){
		if(this.isFirstChild){ this.canGoBack = false; }
		this.inherited(arguments);
	},

	_checkPass: function(){
		// summary:
		//		Called when the user presses the "next" button.
		//		Calls passFunction to see if it's OK to advance to next panel, and
		//		if it isn't, then display error.
		//		Returns true to advance, false to not advance. If passFunction
		//		returns a string, it is assumed to be a custom error message, and
		//		is alert()'ed
		var r = true;
		if(this.passFunction && lang.isFunction(this.passFunction)){
			var failMessage = this.passFunction();
			switch(typeof failMessage){
				case "boolean":
					r = failMessage;
					break;
				case "string":
					alert(failMessage);
					r = false;
					break;
			}
		}
		return r; // Boolean
	},

	done: function(){
		if(this.doneFunction && lang.isFunction(this.doneFunction)){ this.doneFunction(); }
	}
});
	return WizardPane;
});

