define(["dojo/_base/declare", "dijit/_WidgetBase", "dijit/_Container", "dijit/_Contained","dijit/_TemplatedMixin","dijit/_WidgetsInTemplateMixin"],function(declare,Widget,Container,Contained,TemplatedMixin,WidgetsInTemplateMixin){
	return declare("dojox.app.view", [Widget,TemplatedMixin,Container,Contained, WidgetsInTemplateMixin], {
		selected: false,
		keepScrollPosition: true,
		baseClass: "applicationView mblView",
		config:null,
		widgetsInTemplate: true,
		templateString: '<div></div>',
		toString: function(){return this.id},
		activate:function(){},
		deactivate: function(){},
		//Temporary work around for getting a null when calling getParent
		getParent: function(){return null;}
	});
});
