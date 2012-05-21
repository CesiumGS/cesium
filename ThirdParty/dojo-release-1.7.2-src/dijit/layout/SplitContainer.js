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
	"dojo/_base/sniff", // has("mozilla")
	"dojo/_base/window", // win.doc.createElement win.doc.documentElement
	"../registry",	// registry.getUniqueId()
	"../_WidgetBase",
	"./_LayoutWidget"
], function(array, cookie, declare, dom, domClass, domConstruct, domGeometry, domStyle,
			event, kernel, lang, on, has, win, registry, _WidgetBase, _LayoutWidget){

/*=====
var _WidgetBase = dijit._WidgetBase;
var _LayoutWidget = dijit.layout._LayoutWidget;
=====*/

// module:
//		dijit/layout/SplitContainer
// summary:
//		Deprecated.  Use `dijit.layout.BorderContainer` instead.

//
// FIXME: make it prettier
// FIXME: active dragging upwards doesn't always shift other bars (direction calculation is wrong in this case)
// FIXME: sizeWidth should be a CSS attribute (at 7 because css wants it to be 7 until we fix to css)
//

// These arguments can be specified for the children of a SplitContainer.
// Since any widget can be specified as a SplitContainer child, mix them
// into the base widget class.  (This is a hack, but it's effective.)
lang.extend(_WidgetBase, {
	// sizeMin: [deprecated] Integer
	//		Deprecated.  Parameter for children of `dijit.layout.SplitContainer`.
	//		Minimum size (width or height) of a child of a SplitContainer.
	//		The value is relative to other children's sizeShare properties.
	sizeMin: 10,

	// sizeShare: [deprecated] Integer
	//		Deprecated.  Parameter for children of `dijit.layout.SplitContainer`.
	//		Size (width or height) of a child of a SplitContainer.
	//		The value is relative to other children's sizeShare properties.
	//		For example, if there are two children and each has sizeShare=10, then
	//		each takes up 50% of the available space.
	sizeShare: 10
});

return declare("dijit.layout.SplitContainer", _LayoutWidget, {
	// summary:
	//		Deprecated.  Use `dijit.layout.BorderContainer` instead.
	// description:
	//		A Container widget with sizing handles in-between each child.
	//		Contains multiple children widgets, all of which are displayed side by side
	//		(either horizontally or vertically); there's a bar between each of the children,
	//		and you can adjust the relative size of each child by dragging the bars.
	//
	//		You must specify a size (width and height) for the SplitContainer.
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
		var sizer = win.doc.createElement('div');
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

	_setupChild: function(/*dijit._Widget*/ child){
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
		var sizer = win.doc.createElement('div');
		sizer.id=registry.getUniqueId('dijit_layout_SplitterContainer_Splitter');
		this.sizers.splice(index,0,sizer);
		this.domNode.appendChild(sizer);

		sizer.className = this.isHorizontal ? 'dijitSplitContainerSizerH' : 'dijitSplitContainerSizerV';

		// add the thumb div
		var thumb = win.doc.createElement('div');
		thumb.className = 'thumb';
		sizer.appendChild(thumb);

		// FIXME: are you serious? why aren't we using mover start/stop combo?
		this.connect(sizer, "onmousedown", '_onSizerMouseDown');

		dom.setSelectable(sizer, false);
	},

	removeChild: function(widget){
		// summary:
		//		Remove sizer, but only if widget is really our child and
		// we have at least one sizer to throw away
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

	addChild: function(/*dijit._Widget*/ child, /*Integer?*/ insertIndex){
		// summary:
		//		Add a child widget to the container
		// child:
		//		a widget to add
		// insertIndex:
		//		postion in the "stack" to add the child widget

		this.inherited(arguments);

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
		var children = this.getChildren();
		this.paneBefore = children[i];
		this.paneAfter = children[i+1];

		this.isSizing = true;
		this.sizingSplitter = this.sizers[i];

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

		// TODO: REVISIT - we want MARGIN_BOX and core hasn't exposed that yet (but can't we use it anyway if we pay attention? we do elsewhere.)
		this.originPos = domGeometry.position(children[0].domNode, true);
		var client, screen;
		if(this.isHorizontal){
			client = e.layerX || e.offsetX || 0;
			screen = e.pageX;
			this.originPos = this.originPos.x;
		}else{
			client = e.layerY || e.offsetY || 0;
			screen = e.pageY;
			this.originPos = this.originPos.y;
		}
		this.startPoint = this.lastPoint = screen;
		this.screenToClientOffset = screen - client;
		this.dragOffset = this.lastPoint - this.paneBefore.sizeActual - this.originPos - this.paneBefore.position;

		if(!this.activeSizing){
			this._showSizingLine();
		}

		//
		// attach mouse events
		//
		this._ownconnects = [
			on(win.doc.documentElement, "mousemove", lang.hitch(this, "changeSizing")),
			on(win.doc.documentElement, "mouseup", lang.hitch(this, "endSizing"))
		];

		event.stop(e);
	},

	changeSizing: function(e){
		if(!this.isSizing){ return; }
		this.lastPoint = this.isHorizontal ? e.pageX : e.pageY;
		this.movePoint();
		if(this.activeSizing){
			this._updateSize();
		}else{
			this._moveSizingLine();
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

		this._updateSize();

		this.isSizing = false;

		if(this.persist){
			this._saveState(this);
		}

		var h;
		while(h = this._ownconnects.pop()){ h.remove(); }
	},

	movePoint: function(){

		// make sure lastPoint is a legal point to drag to
		var p = this.lastPoint - this.screenToClientOffset;

		var a = p - this.dragOffset;
		a = this.legaliseSplitPoint(a);
		p = a + this.dragOffset;

		this.lastPoint = p + this.screenToClientOffset;
	},

	legaliseSplitPoint: function(a){

		a += this.sizingSplitter.position;

		this.isDraggingLeft = !!(a > 0);

		if(!this.activeSizing){
			var min = this.paneBefore.position + this.paneBefore.sizeMin;
			if(a < min){
				a = min;
			}

			var max = this.paneAfter.position + (this.paneAfter.sizeActual - (this.sizerWidth + this.paneAfter.sizeMin));
			if(a > max){
				a = max;
			}
		}

		a -= this.sizingSplitter.position;

		this._checkSizes();

		return a;
	},

	_updateSize: function(){
	//FIXME: sometimes this.lastPoint is NaN
		var pos = this.lastPoint - this.dragOffset - this.originPos;

		var start_region = this.paneBefore.position;
		var end_region = this.paneAfter.position + this.paneAfter.sizeActual;

		this.paneBefore.sizeActual = pos - start_region;
		this.paneAfter.position	= pos + this.sizerWidth;
		this.paneAfter.sizeActual = end_region - this.paneAfter.position;

		array.forEach(this.getChildren(), function(child){
			child.sizeShare = child.sizeActual;
		});

		if(this._started){
			this.layout();
		}
	},

	_showSizingLine: function(){

		this._moveSizingLine();

		domGeometry.setMarginBox(this.virtualSizer,
			this.isHorizontal ? { w: this.sizerWidth, h: this.paneHeight } : { w: this.paneWidth, h: this.sizerWidth });

		this.virtualSizer.style.display = 'block';
	},

	_hideSizingLine: function(){
		this.virtualSizer.style.display = 'none';
	},

	_moveSizingLine: function(){
		var pos = (this.lastPoint - this.startPoint) + this.sizingSplitter.position;
		domStyle.set(this.virtualSizer,(this.isHorizontal ? "left" : "top"),pos+"px");
		// this.virtualSizer.style[ this.isHorizontal ? "left" : "top" ] = pos + 'px'; // FIXME: remove this line if the previous is better
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

});
