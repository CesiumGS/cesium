define([
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/dom-class",
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_WidgetBase"
], function(array, declare, domClass, Contained, Container, WidgetBase){

/*=====
	var Contained = dijit._Contained;
	var Container = dijit._Container;
	var WidgetBase = dijit._WidgetBase;
=====*/

	// module:
	//		dojox/mobile/FixedSplitterPane
	// summary:
	//		A pane widget that is used in a dojox.mobile.FixedSplitter.

	return declare("dojox.mobile.FixedSplitterPane",[WidgetBase, Container, Contained],{
		// summary:
		//		A pane widget that is used in a dojox.mobile.FixedSplitter.
		// description:
		//		FixedSplitterPane is a pane widget that is used in a
		//		dojox.mobile.FixedSplitter. It is a widget, but can be regarded
		//		as a simple <div> element.

		buildRendering: function(){
			this.inherited(arguments);
			domClass.add(this.domNode, "mblFixedSplitterPane");
		},

		resize: function(){
			array.forEach(this.getChildren(), function(child){
				if(child.resize){ child.resize(); }
			});
		}
	});
});
