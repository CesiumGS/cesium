define([
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-geometry",
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_WidgetBase",
	"./FixedSplitterPane"
], function(array, declare, win, domClass, domGeometry, Contained, Container, WidgetBase, FixedSplitterPane){

/*=====
	var Contained = dijit._Contained;
	var Container = dijit._Container;
	var WidgetBase = dijit._WidgetBase;
=====*/

	// module:
	//		dojox/mobile/FixedSplitter
	// summary:
	//		A layout container that splits the window horizontally or vertically.

	return declare("dojox.mobile.FixedSplitter", [WidgetBase, Container, Contained], {
		// summary:
		//		A layout container that splits the window horizontally or
		//		vertically.
		// description:
		//		FixedSplitter is a very simple container widget that layouts its
		//		child dom nodes side by side either horizontally or
		//		vertically. An example usage of this widget would be to realize
		//		the split view on iPad. There is no visual splitter between the
		//		children, and there is no function to resize the child panes
		//		with drag-and-drop. If you need a visual splitter, you can
		//		specify a border of a child dom node with CSS.
		//		A child of the widget should be FixedSplitterPane.
		//
		// example:
		// |	<div dojoType="dojox.mobile.FixedSplitter" orientation="H">
		// |		<div dojoType="dojox.mobile.FixedSplitterPane"
		// |			style="width:200px;border-right:1px solid black;">
		// |			pane #1 (width=200px)
		// |		</div>
		// |		<div dojoType="dojox.mobile.FixedSplitterPane">
		// |			pane #2
		// |		</div>
		// |	</div>

		// orientation: String
		//		The direction of split. If "H" is specified, panes are split
		//		horizontally. If "V" is specified, panes are split vertically.
		orientation: "H",


		buildRendering: function(){
			this.domNode = this.containerNode = this.srcNodeRef ? this.srcNodeRef : win.doc.createElement("DIV");
			domClass.add(this.domNode, "mblFixedSpliter");
		},

		startup: function(){
			if(this._started){ return; }
			var children = array.filter(this.domNode.childNodes, function(node){ return node.nodeType == 1; });
			array.forEach(children, function(node){
				domClass.add(node, "mblFixedSplitterPane"+this.orientation);
			}, this);
			this.inherited(arguments);
	
			var _this = this;
			setTimeout(function(){
				var parent = _this.getParent && _this.getParent();
				if(!parent || !parent.resize){ // top level widget
					_this.resize();
				}
			}, 0);
		},
	
		resize: function(){
			this.layout();
		},

		layout: function(){
			var sz = this.orientation == "H" ? "w" : "h";
			var children = array.filter(this.domNode.childNodes, function(node){ return node.nodeType == 1; });
			var offset = 0;
			for(var i = 0; i < children.length; i++){
				domGeometry.setMarginBox(children[i], this.orientation == "H" ? {l:offset} : {t:offset});
				if(i < children.length - 1){
					offset += domGeometry.getMarginBox(children[i])[sz];
				}
			}
	
			var h;
			if(this.orientation == "V"){
				if(this.domNode.parentNode.tagName == "BODY"){
					if(array.filter(win.body().childNodes, function(node){ return node.nodeType == 1; }).length == 1){
						h = (win.global.innerHeight||win.doc.documentElement.clientHeight);
					}
				}
			}
			var l = (h || domGeometry.getMarginBox(this.domNode)[sz]) - offset;
			var props = {};
			props[sz] = l;
			domGeometry.setMarginBox(children[children.length - 1], props);
	
			array.forEach(this.getChildren(), function(child){
				if(child.resize){ child.resize(); }
			});
		},

		addChild: function(widget, /*Number?*/insertIndex){
			domClass.add(widget.domNode, "mblFixedSplitterPane"+this.orientation);
			this.inherited(arguments);
		}
	});
});
