/*
 * This template is used to show how to use exprchar to avoid instance of _TemplatedMixin error in dojo.mvc data binding.
 * If the templateString contains ${xxx}, it will throw an template error, use #{xxx} with exprchar :"#" instead.
 * See how it works in test_mvc_widget.html and test_mvc_widget_template.html
 */
define(["dojo", "dijit", "dojox", "dijit/_Widget", "dijit/_TemplatedMixin", "dojo/text!./test_mvc_widget_template.html"], 
		function(dojo, dijit, dojox, Widget, TemplatedMixin, template){
    return dojo.declare("dojox.mvc.tests.test_templatedWidget.myMvcTemplated", [Widget, TemplatedMixin], {
    	templateString: template,
    	widgetsInTemplate: true,
    	
        buildRendering: function(){
			console.log("call myMvcTemplated buildRendering");
			this.inherited(arguments);
		},
		
        getParent: function(){
            console.log("Call myMvcTemplated getParent");
            return null;
        }
    });
});
