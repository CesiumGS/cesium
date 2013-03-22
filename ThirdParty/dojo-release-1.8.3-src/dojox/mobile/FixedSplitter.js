define([
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/window",
	"dojo/dom-class",
	"dojo/dom-geometry",
	"dijit/_Contained",
	"dijit/_Container",
	"dijit/_WidgetBase"
], function(array, declare, win, domClass, domGeometry, Contained, Container, WidgetBase){

	// module:
	//		dojox/mobile/FixedSplitter

	return declare("dojox.mobile.FixedSplitter", [WidgetBase, Container, Contained], {
		// summary:
		//		A layout container that splits the window horizontally or
		//		vertically.
		// description:
		//		FixedSplitter is a very simple container widget that layouts its
		//		child DOM nodes side by side either horizontally or
		//		vertically. An example usage of this widget would be to realize
		//		the split view on iPad. There is no visual splitter between the
		//		children, and there is no function to resize the child panes
		//		with drag-and-drop. If you need a visual splitter, you can
		//		specify a border of a child DOM node with CSS.
		//
		//		FixedSplitter has no knowledge of its child widgets.
		//		dojox/mobile/Container (formerly known as FixedSplitterPane),
		//		dojox/mobile/Pane, or dojox/mobile/ContentPane can be used as a
		//		child widget of FixedSplitter.
		//
		//		- Use dojox/mobile/Container if your content consists of ONLY
		//		  Dojo widgets.
		//		- Use dojox/mobile/Pane if your content is an inline HTML
		//		  fragment (may or may not include Dojo widgets).
		//		- Use dojox/mobile/ContentPane if your content is an external
		//		  HTML fragment (may or may not include Dojo widgets).
		//
		// example:
		//	|	<div data-dojo-type="dojox.mobile.FixedSplitter" orientation="H">
		//	|		<div data-dojo-type="dojox.mobile.Pane"
		//	|			style="width:200px;border-right:1px solid black;">
		//	|			pane #1 (width=200px)
		//	|		</div>
		//	|		<div data-dojo-type="dojox.mobile.Pane">
		//	|			pane #2
		//	|		</div>
		//	|	</div>

		// orientation: String
		//		The direction of split. If "H" is specified, panes are split
		//		horizontally. If "V" is specified, panes are split vertically.
		orientation: "H",

		// variablePane: Number
		//		The index of a pane that fills the remainig space.
		//		If -1, the last child pane fills the remaining space.
		variablePane: -1,

		// screenSizeAware: Boolean
		//		If true, dynamically load a screen-size-aware module.
		screenSizeAware: false,

		// screenSizeAwareClass: String
		//		A screen-size-aware module to load.
		screenSizeAwareClass: "dojox/mobile/ScreenSizeAware",

		/* internal properties */
		
		// baseClass: String
		//		The name of the CSS class of this widget.
		baseClass: "mblFixedSplitter",

		startup: function(){
			if(this._started){ return; }
			domClass.add(this.domNode, this.baseClass + this.orientation);

			var parent = this.getParent(), f;
			if(!parent || !parent.resize){ // top level widget
				var _this = this;
				f = function(){
					setTimeout(function(){
						_this.resize();
					}, 0);
				};
			}

			if(this.screenSizeAware){
				require([this.screenSizeAwareClass], function(module){
					module.getInstance();
					f && f();
				});
			}else{
				f && f();
			}

			this.inherited(arguments);
		},

		resize: function(){
			var wh = this.orientation === "H" ? "w" : "h", // width/height
				tl = this.orientation === "H" ? "l" : "t", // top/left
				props1 = {}, props2 = {},
				i, c, h,
				a = [], offset = 0, total = 0,
				children = array.filter(this.domNode.childNodes, function(node){ return node.nodeType == 1; }),
				idx = this.variablePane == -1 ? children.length - 1 : this.variablePane;
			for(i = 0; i < children.length; i++){
				if(i != idx){
					a[i] = domGeometry.getMarginBox(children[i])[wh];
					total += a[i];
				}
			}

			if(this.orientation == "V"){
				if(this.domNode.parentNode.tagName == "BODY"){
					if(array.filter(win.body().childNodes, function(node){ return node.nodeType == 1; }).length == 1){
						h = (win.global.innerHeight||win.doc.documentElement.clientHeight);
					}
				}
			}
			var l = (h || domGeometry.getMarginBox(this.domNode)[wh]) - total;
			props2[wh] = a[idx] = l;
			c = children[idx];
			domGeometry.setMarginBox(c, props2);
			c.style[this.orientation === "H" ? "height" : "width"] = "";

			for(i = 0; i < children.length; i++){
				c = children[i];
				props1[tl] = offset;
				domGeometry.setMarginBox(c, props1);
				c.style[this.orientation === "H" ? "top" : "left"] = "";
				offset += a[i];
			}

			array.forEach(this.getChildren(), function(child){
				if(child.resize){ child.resize(); }
			});
		},

		_setOrientationAttr: function(/*String*/orientation){
			// summary:
			//		Sets the direction of split.
			// description:
			//		The value must be either "H" or "V".
			//		If "H" is specified, panes are split horizontally.
			//		If "V" is specified, panes are split vertically.
			// tags:
			//		private
			var s = this.baseClass;
			domClass.replace(this.domNode, s + orientation, s + this.orientation);
			this.orientation = orientation;
			if(this._started){
				this.resize();
			}
		}
	});
});
