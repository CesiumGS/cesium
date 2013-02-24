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
  
var Wizard = declare("dojox.widget.Wizard", [StackContainer, _TemplatedMixin, _WidgetsInTemplateMixin], {
	// summary:
	//		A set of panels that display sequentially, typically notating a step-by-step
	//		procedure like an install
	
	templateString: template,
	
	// nextButtonLabel: String
	//		Label override for the "Next" button.
	nextButtonLabel: "",

	// previousButtonLabel: String
	//		Label override for the "Previous" button.
	previousButtonLabel: "",

	// cancelButtonLabel: String
	//		Label override for the "Cancel" button.
	cancelButtonLabel: "",

	// doneButtonLabel: String
	//		Label override for the "Done" button.
	doneButtonLabel: "",

	// cancelFunction: Function|String
	//		Name of function to call if user presses cancel button.
	//		Cancel button is not displayed if function is not specified.
	cancelFunction: null,

	// hideDisabled: Boolean
	//		If true, disabled buttons are hidden; otherwise, they are assigned the
	//		"WizardButtonDisabled" CSS class
	hideDisabled: false,

	postMixInProperties: function(){
		this.inherited(arguments);
		var labels = lang.mixin({cancel: i18n.getLocalization("dijit", "common", this.lang).buttonCancel},
			i18n.getLocalization("dojox.widget", "Wizard", this.lang));
		var prop;
		for(prop in labels){
			if(!this[prop + "ButtonLabel"]){
				this[prop + "ButtonLabel"] = labels[prop];
			}
		}
	},

	startup: function(){
		if(this._started){
			//console.log('started');
			return;
		}
		this.inherited(arguments);
		
		this.connect(this.nextButton, "onClick", "_forward");
		this.connect(this.previousButton, "onClick", "back");

		if(this.cancelFunction){
			if(lang.isString(this.cancelFunction)){
				this.cancelFunction = lang.getObject(this.cancelFunction);
			}
			this.connect(this.cancelButton, "onClick", this.cancelFunction);
		}else{
			this.cancelButton.domNode.style.display = "none";
		}
		this.connect(this.doneButton, "onClick", "done");

		this._subscription = connect.subscribe(this.id + "-selectChild", lang.hitch(this,"_checkButtons"));
		this._started = true;
		
	},
	
	resize: function(){
		this.inherited(arguments);
		this._checkButtons();
	},

	_checkButtons: function(){
		
		var sw = this.selectedChildWidget;
		
		var lastStep = sw.isLastChild;
		this.nextButton.set("disabled", lastStep);
		this._setButtonClass(this.nextButton);
		if(sw.doneFunction){
			//console.log(sw.doneFunction);
			this.doneButton.domNode.style.display = "";
			if(lastStep){
				this.nextButton.domNode.style.display = "none";
			}
		}else{
			// #1438 issue here.
			this.doneButton.domNode.style.display = "none";
		}
		this.previousButton.set("disabled", !this.selectedChildWidget.canGoBack);
		this._setButtonClass(this.previousButton);
	},

	_setButtonClass: function(button){
		button.domNode.style.display = (this.hideDisabled && button.disabled) ? "none" : "";
	},

	_forward: function(){
		// summary:
		//		callback when next button is clicked
		if(this.selectedChildWidget._checkPass()){
			this.forward();
		}
	},
	
	done: function(){
		// summary:
		//		Finish the wizard's operation
		this.selectedChildWidget.done();
	},
	
	destroy: function(){
		connect.unsubscribe(this._subscription);
		this.inherited(arguments);
	}
	
});

return Wizard;
});
