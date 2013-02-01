define([
	"dojo/_base/declare",
	"dojo/_base/sniff",
	"dojo/dom-class",
	"dojo/dom-construct",
	"dojo/dom-style",
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_WidgetBase",
	"./IconMenuItem"
], function(declare, has, domClass, domConstruct, domStyle, Contained, Container, WidgetBase){
	// module:
	//		dojox/mobile/IconMenu

	return declare("dojox.mobile.IconMenu", [WidgetBase, Container, Contained], {
		// summary:
		//		A pop-up menu.
		// description:
		//		The dojox/mobile/IconMenu widget displays a pop-up menu just
		//		like iPhone's call options menu that is shown while you are on a
		//		call. Each menu item must be dojox/mobile/IconMenuItem.

		// transition: String
		//		The default animated transition effect for child items.
		transition: "slide",

		// iconBase: String
		//		The default icon path for child items.
		iconBase: "",

		// iconPos: String
		//		The default icon position for child items.
		iconPos: "",

		// cols: Number
		//		The number of child items in a row.
		cols: 3,

		// tag: String
		//		A name of html tag to create as domNode.
		tag: "ul",

		/* internal properties */
		selectOne: false,
		
		// baseClass: String
		//		The name of the CSS class of this widget.
		baseClass: "mblIconMenu",
		
		// childItemClass: String
		//		The name of the CSS class of menu items.
		childItemClass: "mblIconMenuItem",

		// _createTerminator: [private] Boolean
		_createTerminator: false,

		buildRendering: function(){
			this.domNode = this.containerNode = this.srcNodeRef || domConstruct.create(this.tag);
			this.inherited(arguments);

			if(this._createTerminator){
				var t = this._terminator = domConstruct.create("br");
				t.className = this.childItemClass + "Terminator";
				this.domNode.appendChild(t);
			}
		},

		startup: function(){
			if(this._started){ return; }
			this.refresh();
			this.inherited(arguments);
		},

		refresh: function(){
			var p = this.getParent();
			if(p){
				domClass.remove(p.domNode, "mblSimpleDialogDecoration");
			}
			var children = this.getChildren();
			if(this.cols){
				var nRows = Math.ceil(children.length / this.cols);
				var w = Math.floor(100/this.cols);
				var _w = 100 - w*this.cols;
				var h = Math.floor(100 / nRows);
				var _h = 100 - h*nRows;
				if(has("ie")){
					_w--;
					_h--;
				}
			}
			for(var i = 0; i < children.length; i++){
				var item = children[i];
				if(this.cols){
					var first = ((i % this.cols) === 0); // first column
					var last = (((i + 1) % this.cols) === 0); // last column
					var rowIdx = Math.floor(i / this.cols);
					domStyle.set(item.domNode, {
						width: w + (last ? _w : 0) + "%",
						height: h + ((rowIdx + 1 === nRows) ? _h : 0) + "%"
					});
					domClass.toggle(item.domNode, this.childItemClass + "FirstColumn", first);
					domClass.toggle(item.domNode, this.childItemClass + "LastColumn", last);
					domClass.toggle(item.domNode, this.childItemClass + "FirstRow", rowIdx === 0);
					domClass.toggle(item.domNode, this.childItemClass + "LastRow", rowIdx + 1 === nRows);
				}
			};
		},

		addChild: function(widget, /*Number?*/insertIndex){
			this.inherited(arguments);
			this.refresh();
		},

		hide: function(){
			var p = this.getParent();
			if(p && p.hide){
				p.hide();
			}
		}
	});
});
