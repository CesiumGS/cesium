define([
	"dojo/_base/array", // array.forEach array.indexOf array.some
	"dojo/cookie", // cookie
	"dojo/_base/declare", // declare
	"dojo/dom", // dom.setSelectable
	"dojo/dom-class", // domClass.add
	"dojo/dom-construct", // domConstruct.create domConstruct.destroy
	"dojo/dom-geometry", // domGeometry.marginBox domGeometry.position
	"dojo/dom-style", // domStyle.style
	"dojo/_base/event", // event.stop
	"dojo/_base/kernel", // kernel.deprecated
	"dojo/_base/lang", // lang.extend lang.hitch
	"dojo/on",
	"dojo/sniff", // has("mozilla")
	"../registry",	// registry.getUniqueId()
	"../_WidgetBase",
	"./_LayoutWidget"
], function(array, cookie, declare, dom, domClass, domConstruct, domGeometry, domStyle,
			event, kernel, lang, on, has, registry, _WidgetBase, _LayoutWidget){

// module:
//		dijit/layout/SplitContainer

//
// FIXME: make it prettier
// FIXME: active dragging upwards doesn't always shift other bars (direction calculation is wrong in this case)
// FIXME: sizeWidth should be a CSS attribute (at 7 because css wants it to be 7 until we fix to css)
//

var SplitContainer = declare("dijit.layout.SplitContainer", _LayoutWidget, {
	// summary:
	//		Deprecated.  Use `dijit/layout/BorderContainer` instead.
	// description:
	//		A Container widget with sizing handles in-between each child.
	//		Contains multiple children widgets, all of which are displayed side by side
	//		(either horizontally or vertically); there's a bar between each of the children,
	//		and you can adjust the relative size of each child by dragging the bars.
	//
	//		You must specify a size (width and height) for the SplitContainer.
	//
	//		See `SplitContainer.ChildWidgetProperties` for details on the properties that can be set on
	//		children of a `SplitContainer`.
	// tags:
	//		deprecated

	constructor: function(){
		kernel.deprecated("dijit.layout.SplitContainer is deprecated", "use BorderContainer with splitter instead", 2.0);
	},

	// activeSizing: Boolean
	//		If true, the children's size changes as you drag the bar;
	//		otherwise, the sizes don't change until you drop the bar (by mouse-up)
	activeSizing: false,

	// sizerWidth: Integer
	//		Size in pixels of the bar between each child
	sizerWidth: 7,

	// orientation: String
	//		either 'horizontal' or vertical; indicates whether the children are
	//		arranged side-by-side or up/down.
	orientation: 'horizontal',

	// persist: Boolean
	//		Save splitter positions in a cookie
	persist: true,

	baseClass: "dijitSplitContainer",

	postMixInProperties: function(){
		this.inherited("postMixInProperties",arguments);
		this.isHorizontal = (this.orientation == 'horizontal');
	},

	postCreate: function(){
		this.inherited(arguments);
		this.sizers = [];

		// overflow has to be explicitly hidden for splitContainers using gekko (trac #1435)
		// to keep other combined css classes from inadvertantly making the overflow visible
		if(has("mozilla")){
			this.domNode.style.overflow = '-moz-scrollbars-none'; // hidden doesn't work
		}

		// create the fake dragger
		if(typeof this.sizerWidth == "object"){
			try{ //FIXME: do this without a try/catch
				this.sizerWidth = parseInt(this.sizerWidth.toString());
			}catch(e){ this.sizerWidth = 7; }
		}
		var sizer = this.ownerDocument.createElement('div');
		this.virtualSizer = sizer;
		sizer.style.position = 'relative';

		// #1681: work around the dreaded 'quirky percentages in IE' layout bug
		// If the splitcontainer's dimensions are specified in percentages, it
		// will be resized when the virtualsizer is displayed in _showSizingLine
		// (typically expanding its bounds unnecessarily). This happens because
		// we use position: relative for .dijitSplitContainer.
		// The workaround: instead of changing the display style attribute,
		// switch to changing the zIndex (bring to front/move to back)

		sizer.style.zIndex = 10;
		sizer.className = this.isHorizontal ? 'dijitSplitContainerVirtualSizerH' : 'dijitSplitContainerVirtualSizerV';
		this.domNode.appendChild(sizer);
		dom.setSelectable(sizer, false);
	},

	destroy: function(){
		delete this.virtualSizer;
		if(this._ownconnects){
			var h;
			while(h = this._ownconnects.pop()){ h.remove(); }
		}
		this.inherited(arguments);
	},
	startup: function(){
		if(this._started){ return; }

		array.forEach(this.getChildren(), function(child, i, children){
			// attach the children and create the draggers
			this._setupChild(child);

			if(i < children.length-1){
				this._addSizer();
			}
		}, this);

		if(this.persist){
			this._restoreState();
		}

		this.inherited(arguments);
	},

	_setupChild: function(/*dijit/_WidgetBase*/ child){
		this.inherited(arguments);
		child.domNode.style.position = "absolute";
		domClass.add(child.domNode, "dijitSplitPane");
	},

	_onSizerMouseDown: function(e){
		if(e.target.id){
			for(var i=0;i<this.sizers.length;i++){
				if(this.sizers[i].id == e.target.id){
					break;
				}
			}
			if(i<this.sizers.length){
				this.beginSizing(e,i);
			}
		}
	},
	_addSizer: function(index){
		index = index === undefined ? this.sizers.length : index;

		// TODO: use a template for this!!!
		var sizer = this.ownerDocument.createElement('div');
		sizer.id=registry.getUniqueId('dijit_layout_SplitterContainer_Splitter');
		this.sizers.splice(index,0,sizer);
		this.domNode.appendChild(sizer);

		sizer.className = this.isHorizontal ? 'dijitSplitContainerSizerH' : 'dijitSplitContainerSizerV';

		// add the thumb div
		var thumb = this.ownerDocument.createElement('div');
		thumb.className = 'thumb';
		sizer.appendChild(thumb);

		// FIXME: are you serious? why aren't we using mover start/stop combo?
		this.connect(sizer, "onmousedown", '_onSizerMouseDown');

		dom.setSelectable(sizer, false);
	},

	removeChild: function(widget){
		// summary:
		//		Remove sizer, but only if widget is really our child and
		//		we have at least one sizer to throw away
		if(this.sizers.length){
			var i = array.indexOf(this.getChildren(), widget);
			if(i != -1){
				if(i == this.sizers.length){
					i--;
				}
				domConstruct.destroy(this.sizers[i]);
				this.sizers.splice(i,1);
			}
		}

		// Remove widget and repaint
		this.inherited(arguments);
		if(this._started){
			this.layout();
		}
	},

	addChild: function(/*dijit/_WidgetBase*/ child, /*Integer?*/ insertIndex){
		// summary:
		//		Add a child widget to the container
		// child:
		//		a widget to add
		// insertIndex:
		//		position in the "stack" to add the child widget

		// SplitContainer puts all the child widgets first, and all the splitters at the end.
		// (This is not ideal for accessibility but not going to fix because the widget is deprecated.)
		// So, just need to maintain that order so that _Container.addChild() puts the widgets where expected.
		if(typeof insertIndex == "undefined" || insertIndex == "last"){
			insertIndex = this.getChildren().length;
		}

		this.inherited(arguments, [child, insertIndex]);

		if(this._started){
			// Do the stuff that startup() does for each widget
			var children = this.getChildren();
			if(children.length > 1){
				this._addSizer(insertIndex);
			}

			// and then reposition (ie, shrink) every pane to make room for the new guy
			this.layout();
		}
	},

	layout: function(){
		// summary:
		//		Do layout of panels

		// base class defines this._contentBox on initial creation and also
		// on resize
		this.paneWidth = this._contentBox.w;
		this.paneHeight = this._contentBox.h;

		var children = this.getChildren();
		if(!children.length){ return; }

		//
		// calculate space
		//

		var space = this.isHorizontal ? this.paneWidth : this.paneHeight;
		if(children.length > 1){
			space -= this.sizerWidth * (children.length - 1);
		}

		//
		// calculate total of SizeShare values
		//
		var outOf = 0;
		array.forEach(children, function(child){
			outOf += child.sizeShare;
		});

		//
		// work out actual pixels per sizeshare unit
		//
		var pixPerUnit = space / outOf;

		//
		// set the SizeActual member of each pane
		//
		var totalSize = 0;
		array.forEach(children.slice(0, children.length - 1), function(child){
			var size = Math.round(pixPerUnit * child.sizeShare);
			child.sizeActual = size;
			totalSize += size;
		});

		children[children.length-1].sizeActual = space - totalSize;

		//
		// make sure the sizes are ok
		//
		this._checkSizes();

		//
		// now loop, positioning each pane and letting children resize themselves
		//

		var pos = 0;
		var size = children[0].sizeActual;
		this._movePanel(children[0], pos, size);
		children[0].position = pos;
		pos += size;

		// if we don't have any sizers, our layout method hasn't been called yet
		// so bail until we are called..TODO: REVISIT: need to change the startup
		// algorithm to guaranteed the ordering of calls to layout method
		if(!this.sizers){
			return;
		}

		array.some(children.slice(1), function(child, i){
			// error-checking
			if(!this.sizers[i]){
				return true;
			}
			// first we position the sizing handle before this pane
			this._moveSlider(this.sizers[i], pos, this.sizerWidth);
			this.sizers[i].position = pos;
			pos += this.sizerWidth;

			size = child.sizeActual;
			this._movePanel(child, pos, size);
			child.position = pos;
			pos += size;
		}, this);
	},

	_movePanel: function(panel, pos, size){
		var box;
		if(this.isHorizontal){
			panel.domNode.style.left = pos + 'px';	// TODO: resize() takes l and t parameters too, don't need to set manually
			panel.domNode.style.top = 0;
			box = {w: size, h: this.paneHeight};
			if(panel.resize){
				panel.resize(box);
			}else{
				domGeometry.setMarginBox(panel.domNode, box);
			}
		}else{
			panel.domNode.style.left = 0;	// TODO: resize() takes l and t parameters too, don't need to set manually
			panel.domNode.style.top = pos + 'px';
			box = {w: this.paneWidth, h: size};
			if(panel.resize){
				panel.resize(box);
			}else{
				domGeometry.setMarginBox(panel.domNode, box);
			}
		}
	},

	_moveSlider: function(slider, pos, size){
		if(this.isHorizontal){
			slider.style.left = pos + 'px';
			slider.style.top = 0;
			domGeometry.setMarginBox(slider, { w: size, h: this.paneHeight });
		}else{
			slider.style.left = 0;
			slider.style.top = pos + 'px';
			domGeometry.setMarginBox(slider, { w: this.paneWidth, h: size });
		}
	},

	_growPane: function(growth, pane){
		if(growth > 0){
			if(pane.sizeActual > pane.sizeMin){
				if((pane.sizeActual - pane.sizeMin) > growth){

					// stick all the growth in this pane
					pane.sizeActual = pane.sizeActual - growth;
					growth = 0;
				}else{
					// put as much growth in here as we can
					growth -= pane.sizeActual - pane.sizeMin;
					pane.sizeActual = pane.sizeMin;
				}
			}
		}
		return growth;
	},

	_checkSizes: function(){

		var totalMinSize = 0;
		var totalSize = 0;
		var children = this.getChildren();

		array.forEach(children, function(child){
			totalSize += child.sizeActual;
			totalMinSize += child.sizeMin;
		});

		// only make adjustments if we have enough space for all the minimums

		if(totalMinSize <= totalSize){

			var growth = 0;

			array.forEach(children, function(child){
				if(child.sizeActual < child.sizeMin){
					growth += child.sizeMin - child.sizeActual;
					child.sizeActual = child.sizeMin;
				}
			});

			if(growth > 0){
				var list = this.isDraggingLeft ? children.reverse() : children;
				array.forEach(list, function(child){
					growth = this._growPane(growth, child);
				}, this);
			}
		}else{
			array.forEach(children, function(child){
				child.sizeActual = Math.round(totalSize * (child.sizeMin / totalMinSize));
			});
		}
	},

	beginSizing: function(e, i){
		// summary:
		//		Begin dragging the splitter between child[i] and child[i+1]

		var children = this.getChildren();

		this.paneBefore = children[i];
		this.paneAfter = children[i+1];

		this.paneBefore.sizeBeforeDrag = this.paneBefore.sizeActual;
		this.paneAfter.sizeBeforeDrag = this.paneAfter.sizeActual;
		this.paneAfter.positionBeforeDrag = this.paneAfter.position;

		this.isSizing = true;
		this.sizingSplitter = this.sizers[i];
		this.sizingSplitter.positionBeforeDrag = domStyle.get(this.sizingSplitter,(this.isHorizontal ? "left" : "top"));

		if(!this.cover){
			this.cover = domConstruct.create('div', {
				style: {
					position:'absolute',
					zIndex:5,
					top: 0,
					left: 0,
					width: "100%",
					height: "100%"
				}
			}, this.domNode);
		}else{
			this.cover.style.zIndex = 5;
		}
		this.sizingSplitter.style.zIndex = 6;

		// startPoint is the e.pageX or e.pageY at start of drag
		this.startPoint = this.lastPoint = (this.isHorizontal ? e.pageX : e.pageY);

		// Calculate maximum to the left or right that splitter is allowed to be dragged
		// minDelta is negative to indicate left/upward drag where end.pageX < start.pageX.
		this.maxDelta = this.paneAfter.sizeActual - this.paneAfter.sizeMin;
		this.minDelta = -1 * (this.paneBefore.sizeActual - this.paneBefore.sizeMin);

		if(!this.activeSizing){
			this._showSizingLine();
		}

		// attach mouse events
		this._ownconnects = [
			on(this.ownerDocument.documentElement, "mousemove", lang.hitch(this, "changeSizing")),
			on(this.ownerDocument.documentElement, "mouseup", lang.hitch(this, "endSizing"))
		];

		event.stop(e);
	},

	changeSizing: function(e){
		// summary:
		//		Called on mousemove while dragging the splitter

		if(!this.isSizing){ return; }

		// lastPoint is the most recent e.pageX or e.pageY during the drag
		this.lastPoint = this.isHorizontal ? e.pageX : e.pageY;
		var delta = Math.max(Math.min(this.lastPoint - this.startPoint, this.maxDelta), this.minDelta);

		if(this.activeSizing){
			this._updateSize(delta);
		}else{
			this._moveSizingLine(delta);
		}
		event.stop(e);
	},

	endSizing: function(){
		if(!this.isSizing){ return; }
		if(this.cover){
			this.cover.style.zIndex = -1;
		}
		if(!this.activeSizing){
			this._hideSizingLine();
		}

		var delta = Math.max(Math.min(this.lastPoint - this.startPoint, this.maxDelta), this.minDelta);
		this._updateSize(delta);

		this.isSizing = false;

		if(this.persist){
			this._saveState(this);
		}

		var h;
		while(h = this._ownconnects.pop()){ h.remove(); }
	},

	_updateSize: function(/*Number*/ delta){
		// summary:
		//		Resets sizes of panes before and after splitter being dragged.
		//		Called during a drag, for active sizing, or at the end of a drag otherwise.
		// delta: Number
		//		Change in slider position compared to start of drag.   But note that
		//		this function may be called multiple times during drag.

		this.paneBefore.sizeActual = this.paneBefore.sizeBeforeDrag + delta;
		this.paneAfter.position	= this.paneAfter.positionBeforeDrag + delta;
		this.paneAfter.sizeActual = this.paneAfter.sizeBeforeDrag - delta;

		array.forEach(this.getChildren(), function(child){
			child.sizeShare = child.sizeActual;
		});

		if(this._started){
			this.layout();
		}
	},

	_showSizingLine: function(){
		// summary:
		//		Show virtual splitter, for non-active resizing

		this._moveSizingLine(0);

		domGeometry.setMarginBox(this.virtualSizer,
			this.isHorizontal ? { w: this.sizerWidth, h: this.paneHeight } : { w: this.paneWidth, h: this.sizerWidth });

		this.virtualSizer.style.display = 'block';
	},

	_hideSizingLine: function(){
		this.virtualSizer.style.display = 'none';
	},

	_moveSizingLine: function(/*Number*/ delta){
		// summary:
		//		Called for non-active resizing, to move the virtual splitter without adjusting the size of the panes
		var pos = delta + this.sizingSplitter.positionBeforeDrag;
		domStyle.set(this.virtualSizer,(this.isHorizontal ? "left" : "top"),pos+"px");
	},

	_getCookieName: function(i){
		return this.id + "_" + i;
	},

	_restoreState: function(){
		array.forEach(this.getChildren(), function(child, i){
			var cookieName = this._getCookieName(i);
			var cookieValue = cookie(cookieName);
			if(cookieValue){
				var pos = parseInt(cookieValue);
				if(typeof pos == "number"){
					child.sizeShare = pos;
				}
			}
		}, this);
	},

	_saveState: function(){
		if(!this.persist){
			return;
		}
		array.forEach(this.getChildren(), function(child, i){
			cookie(this._getCookieName(i), child.sizeShare, {expires:365});
		}, this);
	}
});

SplitContainer.ChildWidgetProperties = {
	// summary:
	//		These properties can be specified for the children of a SplitContainer.

	// sizeMin: [deprecated] Integer
	//		Minimum size (width or height) of a child of a SplitContainer.
	//		The value is relative to other children's sizeShare properties.
	sizeMin: 10,

	// sizeShare: [deprecated] Integer
	//		Size (width or height) of a child of a SplitContainer.
	//		The value is relative to other children's sizeShare properties.
	//		For example, if there are two children and each has sizeShare=10, then
	//		each takes up 50% of the available space.
	sizeShare: 10
};

// Since any widget can be specified as a SplitContainer child, mix them
// into the base widget class.  (This is a hack, but it's effective.)
// This is for the benefit of the parser.   Remove for 2.0.  Also, hide from doc viewer.
lang.extend(_WidgetBase, /*===== {} || =====*/ SplitContainer.ChildWidgetProperties);

return SplitContainer;

});
