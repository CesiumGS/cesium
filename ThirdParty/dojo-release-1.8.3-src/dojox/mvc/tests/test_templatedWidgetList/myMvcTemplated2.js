define([
	"dojo/_base/declare",
	"dojox/mvc/Templated",
	"dijit/registry",
	"dojo/text!./test_mvc_widget_template2.html",
	"dojox/mvc/at",
	"dijit/form/TextBox",
	"dijit/form/Button",
	"dojox/mvc/Group",
	"dojox/mvc/Output",
	"dojox/mvc/Repeat"
], function(declare, Templated, registry, template, at){
	return dojo.declare("dojox.mvc.tests.test_templatedWidgetList.myMvcTemplated", [Templated], {
		// summary:
		//		A sample templated widget for dojox.mvc
		// description:
		//		This template is used to show how to use exprchar to avoid instance of _TemplatedMixin error in dojo.mvc data binding.
		//		If the templateString contains ${xxx}, it will throw an template error, use #{xxx} with exprchar :"#" instead.
		//		See how it works in test_mvc_widget.html and test_mvc_widget_template.html

		// ctrl: dojox.mvc.ModelRefController
		//		The controller that the form widgets in the template refer to.
		ctrl: null,

		templateString: template,

		startup: function(){
			console.log("startup called  in myMvcTemplated2!!! ");
			this.labelNode.set("value", at("rel:", "Serial"));
			this.inputNode.set("value", at("rel:", "First"));
//			this.nameInputNode.set("value", at("rel:", "First"));
			this.inherited("startup", arguments);
		},

		buildRendering: function(){
			console.log("call myMvcTemplated2 buildRendering");
			window.at = at;			
			this.inherited(arguments);
		},

		showDetails: function(){
			// this works, but we can use this.indexAtStartup since it will be set.
			//var index = this.parent.children.indexOf(this.target);
			var index = this.indexAtStartup;
			console.log("Called myMvcTemplated2 showDetails selected index="+index);
			this.ctrl.set("cursorIndex", index);
		},

		getParent: function(){
			console.log("Call myMvcTemplated2 getParent");
			return null;
		}
	});
});
