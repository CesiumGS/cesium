define([
	"doh",
	"dojo/_base/declare",
	"dijit/registry",
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"../_Controller",
	"dojo/text!./templates/_ControllerInTemplate.html"
], function(doh, declare, registry, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, _Controller, template){
	doh.register("dojox.mvc.tests._Controller", [
		function destroyFromWidgetsInTemplate(){
			var w = new (declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
				templateString: template
			}))({}, document.createElement("div"));
			w.startup();
			var ctrl = w.controllerNode,
			 id = ctrl.id;
			w.destroy();
			doh.f(registry.byId(id), "The controller should have been removed from registry along with the template widget");
			doh.t(ctrl._destroyed, "The controller should have been marked as destroyed along with the template widget");
		}
	]);
});