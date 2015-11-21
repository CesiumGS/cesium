define([
	"dojo/_base/array", // array.filter array.forEach array.map
	"dojo/cookie", // cookie
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.add domClass.remove domClass.toggle
	"dojo/dom-construct", // domConstruct.destroy domConstruct.place
	"dojo/dom-geometry", // domGeometry.marginBox
	"dojo/dom-style", // domStyle.style
	"dojo/keys",
	"dojo/_base/lang", // getObject() hitch() delegate()
	"dojo/on",
	"dojo/touch",
	"../_WidgetBase",
	"../_Widget",
	"../_TemplatedMixin",
	"./LayoutContainer",
	"./utils"        // layoutUtils.layoutChildren
], function(array, cookie, declare, domClass, domConstruct, domGeometry, domStyle, keys, lang, on, touch,
			_WidgetBase, _Widget, _TemplatedMixin, LayoutContainer, layoutUtils){

	// module:
	//		dijit/layout/BorderContainer

	var _Splitter = declare("dijit.layout._Splitter", [_Widget, _TemplatedMixin ], {
		// summary:
		//		A draggable spacer between two items in a `dijit/layout/BorderContainer`.
		// description:
		//		This is instantiated by `dijit/layout/BorderContainer`.  Users should not
		//		create it directly.
		// tags:
		//		private

		/*=====
		 // container: [const] dijit/layout/BorderContainer
		 //		Pointer to the parent BorderContainer
		 container: null,

		 // child: [const] dijit/layout/_LayoutWidget
		 //		Pointer to the pane associated with this splitter
		 child: null,

		 // region: [const] String
		 //		Region of pane associated with this splitter.
		 //		"top", "bottom", "left", "right".
		 region: null,
		 =====*/

		// live: [const] Boolean
		//		If true, the child's size changes and the child widget is redrawn as you drag the splitter;
		//		otherwise, the size doesn't change until you drop the splitter (by mouse-up)
		live: true,

		templateString: '<div class="dijitSplitter" data-dojo-attach-event="onkeydown:_onKeyDown,press:_startDrag,onmouseenter:_onMouse,onmouseleave:_onMouse" tabIndex="0" role="separator"><div class="dijitSplitterThumb"></div></div>',

		constructor: function(){
			this._handlers = [];
		},

		postMixInProperties: function(){
			this.inherited(arguments);

			this.horizontal = /top|bottom/.test(this.region);
			this._factor = /top|left/.test(this.region) ? 1 : -1;
			this._cookieName = this.container.id + "_" + this.region;
		},

		buildRendering: function(){
			this.inherited(arguments);

			domClass.add(this.domNode, "dijitSplitter" + (this.horizontal ? "H" : "V"));

			if(this.container.persist){
				// restore old size
				var persistSize = cookie(this._cookieName);
				if(persistSize){
					this.child.domNode.style[this.horizontal ? "height" : "width"] = persistSize;
				}
			}
		},

		_computeMaxSize: function(){
			// summary:
			//		Return the maximum size that my corresponding pane can be set to

			var dim = this.horizontal ? 'h' : 'w',
				childSize = domGeometry.getMarginBox(this.child.domNode)[dim],
				center = array.filter(this.container.getChildren(), function(child){
					return child.region == "center";
				})[0];

			// Can expand until center is crushed.  But always leave room for center's padding + border,
			//  otherwise on the next call domGeometry methods start to lie about size.
			var spaceAvailable = domGeometry.getContentBox(center.domNode)[dim] - 10;

			return Math.min(this.child.maxSize, childSize + spaceAvailable);
		},

		_startDrag: function(e){
			if(!this.cover){
				this.cover = domConstruct.place("<div class=dijitSplitterCover></div>", this.child.domNode, "after");
			}
			domClass.add(this.cover, "dijitSplitterCoverActive");

			// Safeguard in case the stop event was missed.  Shouldn't be necessary if we always get the mouse up.
			if(this.fake){
				domConstruct.destroy(this.fake);
			}
			if(!(this._resize = this.live)){ //TODO: disable live for IE6?
				// create fake splitter to display at old position while we drag
				(this.fake = this.domNode.cloneNode(true)).removeAttribute("id");
				domClass.add(this.domNode, "dijitSplitterShadow");
				domConstruct.place(this.fake, this.domNode, "after");
			}
			domClass.add(this.domNode, "dijitSplitterActive dijitSplitter" + (this.horizontal ? "H" : "V") + "Active");
			if(this.fake){
				domClass.remove(this.fake, "dijitSplitterHover dijitSplitter" + (this.horizontal ? "H" : "V") + "Hover");
			}

			//Performance: load data info local vars for onmousevent function closure
			var factor = this._factor,
				isHorizontal = this.horizontal,
				axis = isHorizontal ? "pageY" : "pageX",
				pageStart = e[axis],
				splitterStyle = this.domNode.style,
				dim = isHorizontal ? 'h' : 'w',
				childCS = domStyle.getComputedStyle(this.child.domNode),
				childStart = domGeometry.getMarginBox(this.child.domNode, childCS)[dim],
				max = this._computeMaxSize(),
				min = Math.max(this.child.minSize, domGeometry.getPadBorderExtents(this.child.domNode, childCS)[dim] + 10),
				region = this.region,
				splitterAttr = region == "top" || region == "bottom" ? "top" : "left", // style attribute of splitter to adjust
				splitterStart = parseInt(splitterStyle[splitterAttr], 10),
				resize = this._resize,
				layoutFunc = lang.hitch(this.container, "_layoutChildren", this.child.id),
				de = this.ownerDocument;

			this._handlers = this._handlers.concat([
				on(de, touch.move, this._drag = function(e, forceResize){
					var delta = e[axis] - pageStart,
						childSize = factor * delta + childStart,
						boundChildSize = Math.max(Math.min(childSize, max), min);

					if(resize || forceResize){
						layoutFunc(boundChildSize);
					}
					// TODO: setting style directly (usually) sets content box size, need to set margin box size
					splitterStyle[splitterAttr] = delta + splitterStart + factor * (boundChildSize - childSize) + "px";
				}),
				on(de, "dragstart", function(e){
					e.stopPropagation();
					e.preventDefault();
				}),
				on(this.ownerDocumentBody, "selectstart", function(e){
					e.stopPropagation();
					e.preventDefault();
				}),
				on(de, touch.release, lang.hitch(this, "_stopDrag"))
			]);
			e.stopPropagation();
			e.preventDefault();
		},

		_onMouse: function(e){
			// summary:
			//		Handler for onmouseenter / onmouseleave events
			var o = (e.type == "mouseover" || e.type == "mouseenter");
			domClass.toggle(this.domNode, "dijitSplitterHover", o);
			domClass.toggle(this.domNode, "dijitSplitter" + (this.horizontal ? "H" : "V") + "Hover", o);
		},

		_stopDrag: function(e){
			try{
				if(this.cover){
					domClass.remove(this.cover, "dijitSplitterCoverActive");
				}
				if(this.fake){
					domConstruct.destroy(this.fake);
				}
				domClass.remove(this.domNode, "dijitSplitterActive dijitSplitter"
					+ (this.horizontal ? "H" : "V") + "Active dijitSplitterShadow");
				this._drag(e); //TODO: redundant with onmousemove?
				this._drag(e, true);
			}finally{
				this._cleanupHandlers();
				delete this._drag;
			}

			if(this.container.persist){
				cookie(this._cookieName, this.child.domNode.style[this.horizontal ? "height" : "width"], {expires: 365});
			}
		},

		_cleanupHandlers: function(){
			var h;
			while(h = this._handlers.pop()){
				h.remove();
			}
		},

		_onKeyDown: function(/*Event*/ e){
			// should we apply typematic to this?
			this._resize = true;
			var horizontal = this.horizontal;
			var tick = 1;
			switch(e.keyCode){
				case horizontal ? keys.UP_ARROW : keys.LEFT_ARROW:
					tick *= -1;
//				break;
				case horizontal ? keys.DOWN_ARROW : keys.RIGHT_ARROW:
					break;
				default:
//				this.inherited(arguments);
					return;
			}
			var childSize = domGeometry.getMarginSize(this.child.domNode)[ horizontal ? 'h' : 'w' ] + this._factor * tick;
			this.container._layoutChildren(this.child.id, Math.max(Math.min(childSize, this._computeMaxSize()), this.child.minSize));
			e.stopPropagation();
			e.preventDefault();
		},

		destroy: function(){
			this._cleanupHandlers();
			delete this.child;
			delete this.container;
			delete this.cover;
			delete this.fake;
			this.inherited(arguments);
		}
	});

	var _Gutter = declare("dijit.layout._Gutter", [_Widget, _TemplatedMixin], {
		// summary:
		//		Just a spacer div to separate side pane from center pane.
		//		Basically a trick to lookup the gutter/splitter width from the theme.
		// description:
		//		Instantiated by `dijit/layout/BorderContainer`.  Users should not
		//		create directly.
		// tags:
		//		private

		templateString: '<div class="dijitGutter" role="presentation"></div>',

		postMixInProperties: function(){
			this.inherited(arguments);
			this.horizontal = /top|bottom/.test(this.region);
		},

		buildRendering: function(){
			this.inherited(arguments);
			domClass.add(this.domNode, "dijitGutter" + (this.horizontal ? "H" : "V"));
		}
	});

	var BorderContainer = declare("dijit.layout.BorderContainer", LayoutContainer, {
		// summary:
		//		A BorderContainer is a `dijit/LayoutContainer` that can have draggable splitters between the children,
		//		in order to adjust their sizes.
		//
		//		In addition, it automatically adds some space between the children even
		//		if they don't have a draggable splitter between them, and space between the edge of the BorderContainer
		//		and the children that are adjacent to the edge.  Note that the intended style is that all the children
		//		have borders, but (despite the name) the BorderContainer itself does not.
		//
		//		See `BorderContainer.ChildWidgetProperties` for details on the properties that can be set on
		//		children of a `BorderContainer`.

		// gutters: [const] Boolean
		//		Give each pane a border and margin.
		//		Margin determined by domNode.paddingLeft.
		//		When false, only resizable panes have a gutter (i.e. draggable splitter) for resizing.
		gutters: true,

		// liveSplitters: [const] Boolean
		//		Specifies whether splitters resize as you drag (true) or only upon mouseup (false)
		liveSplitters: true,

		// persist: Boolean
		//		Save splitter positions in a cookie.
		persist: false,

		baseClass: "dijitBorderContainer",

		// _splitterClass: Function||String
		//		Optional hook to override the default Splitter widget used by BorderContainer
		_splitterClass: _Splitter,

		postMixInProperties: function(){
			// change class name to indicate that BorderContainer is being used purely for
			// layout (like LayoutContainer) rather than for pretty formatting.
			if(!this.gutters){
				this.baseClass += "NoGutter";
			}
			this.inherited(arguments);
		},

		_setupChild: function(/*dijit/_WidgetBase*/ child){
			// Override LayoutContainer._setupChild().

			this.inherited(arguments);

			var region = child.region, ltr = child.isLeftToRight();
			if(region == "leading"){
				region = ltr ? "left" : "right";
			}
			if(region == "trailing"){
				region = ltr ? "right" : "left";
			}

			if(region){
				// Create draggable splitter for resizing pane,
				// or alternately if splitter=false but BorderContainer.gutters=true then
				// insert dummy div just for spacing
				if(region != "center" && (child.splitter || this.gutters) && !child._splitterWidget){
					var _Splitter = child.splitter ? this._splitterClass : _Gutter;
					if(lang.isString(_Splitter)){
						_Splitter = lang.getObject(_Splitter);	// for back-compat, remove in 2.0
					}
					var splitter = new _Splitter({
						id: child.id + "_splitter",
						container: this,
						child: child,
						region: region,
						live: this.liveSplitters
					});
					splitter.isSplitter = true;
					child._splitterWidget = splitter;

					// Make the tab order match the visual layout by placing the splitter before or after the pane,
					// depending on where the splitter is visually compared to the pane.
					var before = region == "bottom" || region == (this.isLeftToRight() ? "right" : "left");
					domConstruct.place(splitter.domNode, child.domNode, before ? "before" : "after");

					// Splitters aren't added as Contained children, so we need to call startup explicitly
					splitter.startup();
				}
			}
		},

		layout: function(){
			// Implement _LayoutWidget.layout() virtual method.
			this._layoutChildren();
		},

		removeChild: function(/*dijit/_WidgetBase*/ child){
			// Override _LayoutWidget.removeChild().

			var splitter = child._splitterWidget;
			if(splitter){
				splitter.destroy();
				delete child._splitterWidget;
			}

			this.inherited(arguments);
		},

		getChildren: function(){
			// Override _LayoutWidget.getChildren() to only return real children, not the splitters.
			return array.filter(this.inherited(arguments), function(widget){
				return !widget.isSplitter;
			});
		},

		// TODO: remove in 2.0
		getSplitter: function(/*String*/region){
			// summary:
			//		Returns the widget responsible for rendering the splitter associated with region
			// tags:
			//		deprecated
			return array.filter(this.getChildren(), function(child){
				return child.region == region;
			})[0]._splitterWidget;
		},

		resize: function(newSize, currentSize){
			// Overrides _LayoutWidget.resize().

			// resetting potential padding to 0px to provide support for 100% width/height + padding
			// TODO: this hack doesn't respect the box model and is a temporary fix
			if(!this.cs || !this.pe){
				var node = this.domNode;
				this.cs = domStyle.getComputedStyle(node);
				this.pe = domGeometry.getPadExtents(node, this.cs);
				this.pe.r = domStyle.toPixelValue(node, this.cs.paddingRight);
				this.pe.b = domStyle.toPixelValue(node, this.cs.paddingBottom);

				domStyle.set(node, "padding", "0px");
			}

			this.inherited(arguments);
		},

		_layoutChildren: function(/*String?*/ changedChildId, /*Number?*/ changedChildSize){
			// summary:
			//		This is the main routine for setting size/position of each child.
			// description:
			//		With no arguments, measures the height of top/bottom panes, the width
			//		of left/right panes, and then sizes all panes accordingly.
			//
			//		With changedRegion specified (as "left", "top", "bottom", or "right"),
			//		it changes that region's width/height to changedRegionSize and
			//		then resizes other regions that were affected.
			// changedChildId:
			//		Id of the child which should be resized because splitter was dragged.
			// changedChildSize:
			//		The new width/height (in pixels) to make specified child

			if(!this._borderBox || !this._borderBox.h){
				// We are currently hidden, or we haven't been sized by our parent yet.
				// Abort.   Someone will resize us later.
				return;
			}

			// Combining the externally specified children with splitters and gutters
			var childrenAndSplitters = [];
			array.forEach(this._getOrderedChildren(), function(pane){
				childrenAndSplitters.push(pane);
				if(pane._splitterWidget){
					childrenAndSplitters.push(pane._splitterWidget);
				}
			});

			// Compute the box in which to lay out my children
			var dim = {
				l: this.pe.l,
				t: this.pe.t,
				w: this._borderBox.w - this.pe.w,
				h: this._borderBox.h - this.pe.h
			};

			// Layout the children, possibly changing size due to a splitter drag
			layoutUtils.layoutChildren(this.domNode, dim, childrenAndSplitters,
				changedChildId, changedChildSize);
		},

		destroyRecursive: function(){
			// Destroy splitters first, while getChildren() still works
			array.forEach(this.getChildren(), function(child){
				var splitter = child._splitterWidget;
				if(splitter){
					splitter.destroy();
				}
				delete child._splitterWidget;
			});

			// Then destroy the real children, and myself
			this.inherited(arguments);
		}
	});

	BorderContainer.ChildWidgetProperties = {
		// summary:
		//		These properties can be specified for the children of a BorderContainer.

		// splitter: [const] Boolean
		//		Parameter for children where region != "center".
		//		If true, enables user to resize the widget by putting a draggable splitter between
		//		this widget and the region=center widget.
		splitter: false,

		// minSize: [const] Number
		//		Specifies a minimum size (in pixels) for this widget when resized by a splitter.
		minSize: 0,

		// maxSize: [const] Number
		//		Specifies a maximum size (in pixels) for this widget when resized by a splitter.
		maxSize: Infinity
	};
	lang.mixin(BorderContainer.ChildWidgetProperties, LayoutContainer.ChildWidgetProperties);

	// Since any widget can be specified as a BorderContainer child, mix it
	// into the base widget class.  (This is a hack, but it's effective.)
	// This is for the benefit of the parser.   Remove for 2.0.  Also, hide from doc viewer.
	lang.extend(_WidgetBase, /*===== {} || =====*/ BorderContainer.ChildWidgetProperties);

	// For monkey patching
	BorderContainer._Splitter = _Splitter;
	BorderContainer._Gutter = _Gutter;

	return BorderContainer;
});
