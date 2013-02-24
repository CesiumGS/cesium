define([
"dojo/_base/declare", 
"dojo/_base/lang", 
"dojo/_base/array", 
"dojo/_base/window", 
"dojo/_base/event",
"dojo/_base/html", 
"dojo/_base/sniff", 
"dojo/query", 
"dojo/dom", 
"dojo/dom-style",
"dojo/dom-construct", 
"dojo/dom-geometry",
"dojo/on", 
"dojo/date", 
"dojo/date/locale", 
"dijit/_WidgetBase",  
"dojox/widget/_Invalidating", 
"dojox/widget/Selection", 
"dojox/calendar/time",
"./StoreMixin"],

function(
	declare, 
	lang, 
	arr, 
	win, 
	event, 
	html, 
	has, 
	query, 
	dom, 
	domStyle,
	domConstruct,
	domGeometry,
	on, 
	date, 
	locale, 
	_WidgetBase, 
	_Invalidating, 
	Selection, 
	timeUtil, 
	StoreMixin){
	
	/*=====
	var __GridClickEventArgs = {
		// summary:
		//		The event dispatched when the grid is clicked or double-clicked.
		// date: Date
		//		The start of the previously displayed time interval, if any. 
		// triggerEvent: Event
		//		The event at the origin of this event.
	};
	=====*/
	
	/*=====
	var __ItemMouseEventArgs = {
		// summary:
		//		The event dispatched when an item is clicked, double-clicked or context-clicked.
		// item: Object
		//		The item clicked.
		// renderer: dojox/calendar/_RendererMixin
		//		The item renderer clicked.
		// triggerEvent: Event
		//		The event at the origin of this event.
	};
	=====*/
	
	/*=====
	var __itemEditingEventArgs = {
		// summary:
		//		An item editing event.
		// item: Object
		//		The date item that is being edited.
		// editKind: String
		//		Kind of edit: "resizeBoth", "resizeStart", "resizeEnd" or "move".
		// dates: Date[]
		//		The computed date/time of the during the event editing. One entry per edited date (touch use case).
		// startTime: Date?
		//		The start time of data item.
		// endTime: Date?
		//		The end time of data item.
		// sheet: String
		//		For views with several sheets (columns view for example), the sheet when the event occurred.
		// source: dojox/calendar/ViewBase
		//		The view where the event occurred.
		// eventSource: String
		//		The device that triggered the event. This property can take the following values:
		//
		//		- "mouse", 
		//		- "keyboard", 
		//		- "touch"		
		// triggerEvent: Event
		//		The event at the origin of this event.
	};
	=====*/
	

	return declare("dojox.calendar.ViewBase", [_WidgetBase, StoreMixin, _Invalidating, Selection], {
		
		// summary:
		//		The dojox.calendar.ViewBase widget is the base of calendar view widgets
		
		// datePackage: Object
		//		JavaScript namespace to find Calendar routines. Uses Gregorian Calendar routines at dojo.date by default.
		datePackage: date,
		
		_calendar: "gregorian",
		
		// viewKind: String
		//		Kind of the view. Used by the calendar widget to determine how to configure the view.
		viewKind: null,
		
		// _layoutStep: [protected] Integer
		//		The number of units displayed by a visual layout unit (i.e. a column or a row)
		_layoutStep: 1,
		
		// _layoutStep: [protected] Integer
		//		The unit displayed by a visual layout unit (i.e. a column or a row)
		_layoutUnit: "day",
		
		// resizeCursor: String
		//		CSS value to apply to the cursor while resizing an item renderer. 
		resizeCursor: "n-resize",
		
		// formatItemTimeFunc: Function
		//		Optional function to format the time of day of the item renderers.
		//		The function takes the date and render data object as arguments and returns a String.
		formatItemTimeFunc: null,
				
		_getFormatItemTimeFuncAttr: function(){
			if(this.owner != null){
				return this.owner.get("formatItemTimeFunc");
			}else{
				return this.formatItemTimeFunc;
			}
		},
		
		// The listeners added by the view itself.
		_viewHandles: null,
		
		// doubleTapDelay: Integer
		//		The maximum time amount in milliseconds between to touchstart events that trigger a double-tap event.  
		doubleTapDelay: 300,
		
		constructor: function(/*Object*/ args){
			args = args || {};
			
			this._calendar = args.datePackage ? args.datePackage.substr(args.datePackage.lastIndexOf(".")+1) : this._calendar; 
			this.dateModule = args.datePackage ? lang.getObject(args.datePackage, false) : date; 
			this.dateClassObj = this.dateModule.Date || Date; 
			this.dateLocaleModule = args.datePackage ? lang.getObject(args.datePackage+".locale", false) : locale; 
			
			this.rendererPool = [];
			this.rendererList = [];
			this.itemToRenderer = {};
			this._viewHandles = [];
		},
		
		destroy: function(preserveDom){
			// renderers
			while(this.rendererList.length > 0){
				this._destroyRenderer(this.rendererList.pop());
			}			
			for(kind in this._rendererPool){				
				var pool = this._rendererPool[kind];
				if(pool){
					while(pool.length > 0){
						this._destroyRenderer(pool.pop());
					}
				}
			}
			
			while(this._viewHandles.length > 0){
				this._viewHandles.pop().remove();
			}
		
			this.inherited(arguments);
		},
		
		_createRenderData: function(){
			// summary:
			//		Creates the object that contains all the data needed to render this widget.
			// tags:
			//		protected
		},
		
		_validateProperties: function(){
			// summary:
			//		Validates the widget properties before the rendering pass.
			// tags:
			//		protected
		},

		_setText: function(node, text, allowHTML){
			// summary:
			//		Creates a text node under the parent node after having removed children nodes if any.
			// node: Node
			//		The node that will contain the text node.
			// text: String
			//		The text to set to the text node.
			if(text != null){			
				if(!allowHTML && node.hasChildNodes()){
					// span > textNode
					node.childNodes[0].childNodes[0].nodeValue = text;
				}else{												
			
					while(node.hasChildNodes()){
						node.removeChild(node.lastChild);
					}				
			
					var tNode = win.doc.createElement("span");
					this.applyTextDir(tNode, text);					
					
					if(allowHTML){
						tNode.innerHTML = text;
					}else{
						tNode.appendChild(win.doc.createTextNode(text));
					}
					node.appendChild(tNode);
				}
			}
		},
		
		isAscendantHasClass: function(node, ancestor, className){
			// summary:
			//		Determines if a node has an ascendant node that has the css class specified.
			// node: Node
			//		The DOM node.
			// ancestor: Node
			//		The ancestor node used to limit the search in hierarchy.
			// className: String
			//		The css class name.
			// returns: Boolean
			
			while(node != ancestor && node != document){
				
				if(dojo.hasClass(node, className)){
					return true;
				}
				
				node = node.parentNode;
			}
			return false;
		},
		
		isWeekEnd: function(date){
			// summary:
			//		Determines whether the specified date is a week-end.
			//		This method is using dojo.date.locale.isWeekend() method as
			//		dojox.date.XXXX calendars are not supporting this method.
			// date: Date
			//		The date to test.  
			return locale.isWeekend(date);
		},
		
		getWeekNumberLabel: function(date){
			// summary:
			//		Returns the week number string from dojo.date.locale.format() method as
			//		dojox.date.XXXX calendar are not supporting the "w" pattern.
			// date: Date
			//		The date to format.
			if(date.toGregorian){
				date = date.toGregorian();
			}
			return locale.format(date, {
				selector: "date", 
				datePattern: "w"});
		},
		
		floorToDay: function(date, reuse){
			// summary:
			//		Floors the specified date to the start of day.
			// date: Date
			//		The date to floor.
			// reuse: Boolean
			//		Whether use the specified instance or create a new one. Default is false.
			// returns: Date
			return timeUtil.floorToDay(date, reuse, this.dateClassObj);
		},
		
		floorToMonth: function(date, reuse){
			// summary:
			//		Floors the specified date to the start of the date's month.
			// date: Date
			//		The date to floor.
			// reuse: Boolean
			//		Whether use the specified instance or create a new one. Default is false.
			// returns: Date
			return timeUtil.floorToMonth(date, reuse, this.dateClassObj);
		},
		
				
		floorDate: function(date, unit, steps, reuse){
			// summary:
			//		floors the date to the unit.
			// date: Date
			//		The date/time to floor.
			// unit: String
			//		The unit. Valid values are "minute", "hour", "day".
			// steps: Integer
			//		For "day" only 1 is valid.
			// reuse: Boolean
			//		Whether use the specified instance or create a new one. Default is false.			
			// returns: Date
			return timeUtil.floor(date, unit, steps, reuse, this.dateClassObj);
		},

		isToday: function(date){
			// summary:
			//		Returns whether the specified date is in the current day.
			// date: Date
			//		The date to test.
			// renderData: Object
			//		The current renderData
			// returns: Boolean
			return timeUtil.isToday(date, this.dateClassObj);
		},
		
		isStartOfDay: function(d){
			// summary:
			//		Tests if the specified date represents the starts of day. 
			// d:Date
			//		The date to test.
			// returns: Boolean
			return timeUtil.isStartOfDay(d, this.dateClassObj, this.dateModule);
		},
		
		isOverlapping: function(renderData, start1, end1, start2, end2, includeLimits){
			// summary:
			//		Computes if the first time range defined by the start1 and end1 parameters 
			//		is overlapping the second time range defined by the start2 and end2 parameters.
			// renderData: Object
			//		The render data.
			// start1: Date
			//		The start time of the first time range.
			// end1: Date
			//		The end time of the first time range.
			// start2: Date
			//		The start time of the second time range.
			// end2: Date
			//		The end time of the second time range.
			// includeLimits: Boolean
			//		Whether include the end time or not.
			// returns: Boolean
			if(start1 == null || start2 == null || end1 == null || end2 == null){
				return false;
			}
			
			var cal = renderData.dateModule;
			
			if(includeLimits){
				if(cal.compare(start1, end2) == 1 || cal.compare(start2, end1) == 1){
					return false;
				}					
			}else if(cal.compare(start1, end2) != -1 || cal.compare(start2, end1) != -1){
				return false;
			}
			return true; 
		},			 
			 
		computeRangeOverlap: function(renderData, start1, end1, start2, end2, includeLimits){
			// summary:
			//		Computes the overlap time range of the time ranges.
			//		Returns a vector of Date with at index 0 the start time and at index 1 the end time.
			// renderData: Object.
			//		The render data.
			// start1: Date
			//		The start time of the first time range.
			// end1: Date
			//		The end time of the first time range.
			// start2: Date
			//		The start time of the second time range.
			// end2: Date
			//		The end time of the second time range.
			// includeLimits: Boolean
			//		Whether include the end time or not.
			// returns: Date[]
			var cal = renderData.dateModule;
			
			if(start1 == null || start2 == null || end1 == null || end2 == null){
				return null;
			}
			
			var comp1 = cal.compare(start1, end2);
			var comp2 = cal.compare(start2, end1);
			
			if(includeLimits){
				
				if(comp1 == 0 || comp1 == 1 || comp2 == 0 || comp2 == 1){
					return null;
				}
			} else if(comp1 == 1 || comp2 == 1){
				return null;
			}
			
			return [
				this.newDate(cal.compare(start1, start2)>0 ? start1: start2, renderData),
				this.newDate(cal.compare(end1, end2)>0 ? end2: end1, renderData)
			];
		},
		
		isSameDay : function(date1, date2){
			// summary:
			//		Tests if the specified dates are in the same day.
			// date1: Date
			//		The first date.
			// date2: Date
			//		The second date.
			// returns: Boolean
			if(date1 == null || date2 == null){
				return false; 
			}
		
			return date1.getFullYear() == date2.getFullYear() &&
						 date1.getMonth() == date2.getMonth() &&
						 date1.getDate() == date2.getDate();
			 
		},
		
		computeProjectionOnDate: function(renderData, refDate, date, max){
			// summary:
			//		Computes the time to pixel projection in a day.
			// renderData: Object
			//		The render data.
			// refDate: Date
			//		The reference date that defines the destination date.
			// date: Date
			//		The date to project.
			// max: Integer
			//		The size in pixels of the representation of a day.
			// tags:
			//		protected
			// returns: Number

			var cal = renderData.dateModule;
			
			if(max <= 0 || cal.compare(date, refDate) == -1){
				return 0;
			}
			
			var referenceDate = this.floorToDay(refDate, false, renderData);

			if(date.getDate() != referenceDate.getDate()){
				if(date.getMonth() == referenceDate.getMonth()){
					if(date.getDate() < referenceDate.getDate()){
						return 0;
					} else if(date.getDate() > referenceDate.getDate()){
						return max;
					}
				}else{
					if(date.getFullYear() == referenceDate.getFullYear()){
						if(date.getMonth() < referenceDate.getMonth()){
							return 0;
						} else if(date.getMonth() > referenceDate.getMonth()){
							return max;
						}						 
					}else{
						if(date.getFullYear() < referenceDate.getFullYear()){
							return 0;
						} else if(date.getFullYear() > referenceDate.getFullYear()){
							return max;
						}
					}
				}
			}

			var res;

			if(this.isSameDay(refDate, date)){
				
				var d = lang.clone(refDate);
				var minTime = 0;
				
				if(renderData.minHours != null && renderData.minHours != 0){
					d.setHours(renderData.minHours);
					minTime = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
				}
				
				d = lang.clone(refDate);
				
				var maxTime;
				if(renderData.maxHours == null || renderData.maxHours == 24){
					maxTime = 86400; // 24h x 60m x 60s
				}else{
					d.setHours(renderData.maxHours);
					maxTime = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds();
				}
				
				//precision is the second
				//use this API for daylight time issues.
				var delta = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds() - minTime;
				
				if(delta < 0){
					return 0;
				}
				if(delta > maxTime){
					return max;
				}

				res = (max * delta)/(maxTime - minTime);
				
			}else{
				
				if(date.getDate() < refDate.getDate() && 
						date.getMonth() == refDate.getMonth()){
					return 0;
				}
				
				var d2 = this.floorToDay(date);
				var dp1 = renderData.dateModule.add(refDate, "day", 1);
				dp1 = this.floorToDay(dp1, false, renderData);
				
				if(cal.compare(d2, refDate) == 1 && cal.compare(d2, dp1) == 0 || cal.compare(d2, dp1) == 1){
					res =	max;
				}else{
					res = 0;
				}
			}
				
			return res;
		},	
		
		getTime: function(e, x, y, touchIndex){
			// summary:
			//		Returns the time displayed at the specified point by this component.
			// e: Event
			//		Optional mouse event.
			// x: Number
			//		Position along the x-axis with respect to the sheet container used if event is not defined.
			// y: Number
			//		Position along the y-axis with respect to the sheet container (scroll included) used if event is not defined.
			// touchIndex: Integer
			//		If parameter 'e' is not null and a touch event, the index of the touch to use.
			// returns: Date
			return null;
		},
		
		newDate: function(obj){
			// summary:
			//		Creates a new Date object.
			// obj: Object
			//		This object can have several values:
			//
			//		- the time in milliseconds since gregorian epoch.
			//		- a Date instance
			// returns: Date
			return timeUtil.newDate(obj, this.dateClassObj);			
		},
		
		_isItemInView: function(item){
			// summary:
			//		Computes whether the specified item is entirely in the view or not.
			// item: Object
			//		The item to test
			// returns: Boolean	
			var rd = this.renderData;
			var cal = rd.dateModule;
			
			if(cal.compare(item.startTime, rd.startTime) == -1){
				return false;
			} 			
			
			if(cal.compare(item.endTime, rd.endTime) == 1){
				return false;
			}
			
			return true;
		},
		
		_ensureItemInView: function(item){
			// summary:
			//		If needed, moves the item to be entirely in view.
			// item: Object
			//		The item to test
			// returns: Boolean
			//		Whether the item has been moved to be in view or not.
			// tags:
			//		protected

			var rd = this.renderData;
			var cal = rd.dateModule;
			
			var duration = Math.abs(cal.difference(item.startTime, item.endTime, "millisecond"));
			var fixed = false;
			
			if(cal.compare(item.startTime, rd.startTime) == -1){
				item.startTime = rd.startTime;
				item.endTime = cal.add(item.startTime, "millisecond", duration);
				fixed = true;
			}else if(cal.compare(item.endTime, rd.endTime) == 1){
				item.endTime = rd.endTime;
				item.startTime = cal.add(item.endTime, "millisecond", -duration);
				fixed = true;
			}			
			return fixed;
		},
		
		/////////////////////////////////////////////////////////
		//
		// Scrollable
		//
		/////////////////////////////////////////////////////////
				
		// scrollable: Boolean
		//		Indicates whether the view can be scrolled or not.
		scrollable: true,
		
		// autoScroll: Boolean
		//		Indicates whether the view can be scrolled automatically. 
		//		Auto scrolling is used when moving focus to a non visible renderer using keyboard 
		//		and while editing an item. 
		autoScroll: true,				
		
		_autoScroll: function(gx, gy, orientation){
			// summary:
			//		Starts or stops the auto scroll according to the mouse cursor position during an item editing.
			// gx: Integer
			//		The position of the mouse cursor along the x-axis.
			// gy: Integer
			//		The position of the mouse cursor along the y-axis.			
			// tags:
			//		extension

			return false;
		},
			
		// scrollMethod: String
		//		Method used to scroll the view, for example the scroll of column view.
		//		Valid value are:
		//
		//		- "auto": let the view decide (default),
		//		- "css": use css 3d transform,
		//		- "dom": use the scrollTop property.
		scrollMethod: "auto",
		
		_setScrollMethodAttr: function(value){
			if(this.scrollMethod != value){
				this.scrollMethod = value;
				
				// reset
				if(this._domScroll !== undefined){
					if(this._domScroll){
						domStyle.set(this.sheetContainer, this._cssPrefix+"transform", "translateY(0px)");
					}else{
						this.scrollContainer.scrollTop = 0;
					}
				}
				
				delete this._domScroll;
				var pos = this._getScrollPosition();
				delete this._scrollPos;
				
				this._setScrollPosition(pos);
			}
			
		},
		
		_startAutoScroll: function(step){
			// summary:
			//		Starts the auto scroll of the view (if it's scrollable). Used only during editing.
			// tags:
			//		protected
			var sp = this._scrollProps;
			if(!sp){
				sp = this._scrollProps = {};
			}
				
			sp.scrollStep = step;
			
			if (!sp.isScrolling){
				sp.isScrolling = true;
				sp.scrollTimer = setInterval(lang.hitch(this, this._onScrollTimer_tick), 10);
			}		
		},
				
		_stopAutoScroll: function(){
			// summary:
			//		Stops the auto scroll of the view (if it's scrollable). Used only during editing.
			// tags:
			//		protected
			var sp = this._scrollProps;
			
			if (sp && sp.isScrolling) {
				clearInterval(sp.scrollTimer);
				sp.scrollTimer = null;
			}
			this._scrollProps = null;
		},
		
		_onScrollTimer_tick: function(pos){
		},
		
		_scrollPos: 0,
		
		getCSSPrefix: function(){
			// summary:
			//		Utility method that return the specific CSS prefix
			//		for non standard CSS properties. Ex: -moz-border-radius.
			if(has("ie")){
				return "-ms-";
			}
			if(has("webkit")){
				return "-webkit-";
			}
			if(has("mozilla")){
				return "-moz-";
			}
			if(has("opera")){
				return "-o-";
			}			
		},				
		
		_setScrollPosition: function(pos){
			// summary:
			//		Sets the scroll position (if the view is scrollable), using the scroll method defined.
			// tags:
			//		protected

			if(this._scrollPos == pos){
				return;
			}
			
			// determine scroll method once.
			if(this._domScroll === undefined){
			
				var sm = this.get("scrollMethod");
				if(sm === "auto"){					
					this._domScroll = !has("ios") && !has("android") && !has("webkit");
				}else{
					this._domScroll = sm === "dom";
				}
			}
			
			var containerSize = domGeometry.getMarginBox(this.scrollContainer);
			var sheetSize = domGeometry.getMarginBox(this.sheetContainer);
			var max = sheetSize.h - containerSize.h;
			
			if(pos < 0){
				pos = 0;
			}else if(pos > max){
				pos = max;
			}
			
			this._scrollPos = pos;
												
			if(this._domScroll){				
				this.scrollContainer.scrollTop = pos;				
			}else{			
				if(!this._cssPrefix){
					this._cssPrefix =  this.getCSSPrefix();
				}
				domStyle.set(this.sheetContainer, this._cssPrefix+"transform", "translateY(-"+pos+"px)");
			}
		},
		
		_getScrollPosition: function(){
			// summary:
			//		Returns the scroll position (if the view is scrollable), using the scroll method defined.
			// tags:
			//		protected

			return this._scrollPos; 
		},
		
		scrollView: function(dir){
			// summary:
			//		If the view is scrollable, scrolls it to the specified direction.
			// dir: Integer
			//		Direction of the scroll. Valid values are -1 and 1.
			// tags:
			//		extension
		},
		
		ensureVisibility: function(start, end, margin, visibilityTarget, duration){
			// summary:
			//		Scrolls the view if the [start, end] time range is not visible or only partially visible.
			// start: Date
			//		Start time of the range of interest.
			// end: Date
			//		End time of the range of interest.
			// margin: int
			//		Margin in minutes around the time range.
			// visibilityTarget: String
			//		The end(s) of the time range to make visible.
			//		Valid values are: "start", "end", "both".	
			// duration: Number
			//		Optional, the maximum duration of the scroll animation.
			// tags:
			//		extension

		},

	  	////////////////////////////////////////////////////////
		//
		// Store & Items
		//
		////////////////////////////////////////////////////////
		
		_getStoreAttr: function(){
			if(this.owner){
				return this.owner.get("store");
			}
			return this.store;
		},

		_setItemsAttr: function(value){
			this._set("items", value);
			this.displayedItemsInvalidated = true;
		},

		_refreshItemsRendering: function(){
			var rd = this.renderData;
			this._computeVisibleItems(rd);
			this._layoutRenderers(rd);
		},
		
		invalidateLayout: function(){
			// summary:
			//		Triggers a re-layout of the renderers.
			this._layoutRenderers(this.renderData);
		},
		
		resize: function(){
			//this.invalidateRendering();
		},

		////////////////////////////////////////////////////////
		//
		// Layout
		//
		////////////////////////////////////////////////////////
				
		computeOverlapping: function(layoutItems, func){
			// summary:
			//		Computes the overlap layout of a list of items. A lane and extent properties are added to each layout item.
			// layoutItems: Object[]
			//		List of layout items, each item must have a start and end properties.
			// addedPass: Function
			//		Whether computes the extent of each item renderer on free sibling lanes.
			// returns: Object
			// tags:
			//		protected

			
			if(layoutItems.length == 0){
				return {
					numLanes: 0,
					addedPassRes: [1]
				};
			}
			
			var lanes = [];

			for(var i=0; i<layoutItems.length; i++){
				var layoutItem = layoutItems[i];
				this._layoutPass1(layoutItem, lanes);
			}

			var addedPassRes = null;
			if(func){
				addedPassRes = lang.hitch(this, func)(lanes);
			}
			
			return {
				numLanes: lanes.length,
				addedPassRes: addedPassRes
			};
		},

		_layoutPass1: function (layoutItem, lanes){
			// summary:
			//		First pass of the overlap layout. Find a lane where the item can be placed or create a new one.
			// layoutItem: Object
			//		An object that contains a start and end properties at least.
			// lanes:
			//		The array of lanes.
			// tags:
			//		protected
			var stop = true;
			
			for(var i=0; i<lanes.length; i++){
				var lane = lanes[i]; 
				stop = false;
				for(var j=0; j<lane.length && !stop; j++){
					if(lane[j].start < layoutItem.end && layoutItem.start < lane[j].end){
						// one already placed item is overlapping
						stop = true;
						lane[j].extent = 1;
					} 
				}
				if(!stop){
					//we have found a place
					layoutItem.lane = i;
					layoutItem.extent = -1;
					lane.push(layoutItem);
					return;
				}
			}
			
			//no place found -> add a lane
			lanes.push([layoutItem]);
			layoutItem.lane = lanes.length-1;			 
			layoutItem.extent = -1;
		},
			
		
		
		_layoutInterval: function(renderData, index, start, end, items){
			// summary:
			//		For each item in the items list: retrieve a renderer, compute its location and size and add it to the DOM.
			// renderData: Object
			//		The render data.
			// index: Integer
			//		The index of the interval.
			// start: Date
			//		The start time of the displayed date interval.
			// end: Date
			//		The end time of the displayed date interval.
			// items: Object[]
			//		The list of the items to represent.
			// tags:
			//		extension
		},
		
		// layoutPriorityFunction: Function
		//		An optional comparison function use to determine the order the item will be laid out
		//		The function is used to sort an array and must, as any sorting function, take two items 
		//		as argument and must return an integer whose sign define order between arguments.
		//		By default, a comparison by start time then end time is used.
		layoutPriorityFunction: null,
		
		_sortItemsFunction: function(a, b){
			var res = this.dateModule.compare(a.startTime, b.startTime);
			if(res == 0){
				res = -1 * this.dateModule.compare(a.endTime, b.endTime);
			}
			return res;
		},
		
		_layoutRenderers: function(renderData){
			// summary:
			//		Renders the data items. This method will call the _layoutInterval() method.
			// renderData: Object
			//		The render data.
			// tags:
			//		protected
			if(!renderData.items){
				return;
			}
						
			// recycle renderers first
			this._recycleItemRenderers();
			
			var cal = renderData.dateModule; 
			
			// Date
			var startDate = this.newDate(renderData.startTime);
			
			// Date and time
			var startTime = lang.clone(startDate);
			
			var endDate;
			
			var items = renderData.items.concat();

			var itemsTemp = [], events;
			
			var index = 0;
			
			while(cal.compare(startDate, renderData.endTime) == -1 && items.length > 0){
			
				endDate = cal.add(startDate, this._layoutUnit, this._layoutStep);
				endDate = this.floorToDay(endDate, true, renderData);
				
				var endTime = lang.clone(endDate);
				
				if(renderData.minHours){
					startTime.setHours(renderData.minHours);
				}
				
				if(renderData.maxHours && renderData.maxHours != 24){
					endTime = cal.add(endDate, "day", -1);
					endTime = this.floorToDay(endTime, true, renderData);
					endTime.setHours(renderData.maxHours);
				}
				
				// look for events that overlap the current sub interval
				events = arr.filter(items, function(item){
					var r = this.isOverlapping(renderData, item.startTime, item.endTime, startTime, endTime);
					if(r){
						// item was not fully processed as it overlaps another sub interval
						if(cal.compare(item.endTime, endTime) == 1){
							itemsTemp.push(item);
						}	
					}else{
						itemsTemp.push(item);
					}
					return r;
				}, this);

				items = itemsTemp;
				itemsTemp = [];
				
				// if event are in the current sub interval, layout them
				if(events.length > 0){
					// Sort the item according a sorting function, by default start time then end time comparison are used.
					events.sort(lang.hitch(this, this.layoutPriorityFunction ? this.layoutPriorityFunction : this._sortItemsFunction));
					this._layoutInterval(renderData, index, startTime, endTime, events);
				}

				startDate = endDate;
				startTime = lang.clone(startDate);

				index++;
			}			
			
			this._onRenderersLayoutDone(this);
		},
	
		/////////////////////////////////////////////////////////////////
		//
		//	Renderers management
		//
		////////////////////////////////////////////////////////////////
		
		_recycleItemRenderers: function(remove){
			// summary:
			//		Recycles all the item renderers.
			// remove: Boolean
			//		Whether remove the DOM node from it parent.
			// tags:
			//		protected
			while(this.rendererList.length>0){
				this._recycleRenderer(this.rendererList.pop(), remove);
			}
			this.itemToRenderer = {};
		},
				
		// rendererPool: [protected] Array
		//		The stack of recycled renderers available.
		rendererPool: null,
		
		// rendererList: [protected] Array
		//		The list of used renderers
		rendererList: null,
		
		// itemToRenderer: [protected] Object
		//		The associated array item to renderer list.
		itemToRenderer: null,
		
		getRenderers: function(item){
			// summary:
			//		Returns the renderers that are currently used to displayed the speficied item.
			//		Returns an array of objects that contains two properties:
			//		- container: The DOM node that contains the renderer.
			//		- renderer: The dojox.calendar._RendererMixin instance.
			//		Do not keep references on the renderers are they are recycled and reused for other items.
			// item: Object
			//		The data or render item.
			// returns: Object[]
			if(item == null || item.id == null){
				return null;
			}
			var list = this.itemToRenderer[item.id];
			return list == null ? null : list.concat();
		},
		
		_rendererHandles: {},
		
		// itemToRendererKindFunc: Function
		//		An optional function to associate a kind of renderer ("horizontal", "label" or null) with the specified item.
		//		By default, if an item is lasting more that 24 hours an horizontal item is used, otherwise a label is used.
		itemToRendererKindFunc: null,
		
		_itemToRendererKind: function(item){
			// summary: 
			//		Associates a kind of renderer with a data item.
			// item: Object
			//		The data item.
			// returns: String
			// tags:
			//		protected			
			if(this.itemToRendererKindFunc){
				return this.itemToRendererKindFunc(item);
			}
			return this._defaultItemToRendererKindFunc(item); // String
		},
		
		_defaultItemToRendererKindFunc:function(item){
			// tags:
			//		private
			return null;
		},

		_createRenderer: function(item, kind, rendererClass, cssClass){			
			// summary: 
			//		Creates an item renderer of the specified kind. A renderer is an object with the "container" and "instance" properties.
			// item: Object
			//		The data item.
			// kind: String
			//		The kind of renderer.
			// rendererClass: Object
			//		The class to instantiate to create the renderer.
			// returns: Object
			// tags:
			//		protected				
						
			if(item != null && kind != null && rendererClass != null){
				
				var res, renderer;
				
				var pool = this.rendererPool[kind];
				
				if(pool != null){
					res = pool.shift();
				}

				if (res == null){

					renderer = new rendererClass;

					// the container allow to lay out the renderer
					// this is important for styling (in box model 
					// content size does take into account border)
					var container = domConstruct.create("div");

					// The DOM object that will contain the event renderer
					container.className = "dojoxCalendarEventContainer "+ cssClass ;
					container.appendChild(renderer.domNode);
					
					res = {
						renderer: renderer,
						container: renderer.domNode,
						kind: kind
					};

					this._onRendererCreated(res);
					
				} else {
					renderer = res.renderer; 
					
					this._onRendererReused(renderer);
				}
				
				renderer.owner = this;
				renderer.set("rendererKind", kind);
				renderer.set("item", item);
				
				var list = this.itemToRenderer[item.id];
				if (list == null) {
					this.itemToRenderer[item.id] = list = [];
				}
				list.push(res);
				
				this.rendererList.push(res);
				return res;	
			}
			return null;
		},	
		
		_onRendererCreated: function(renderer){
			this.onRendererCreated(renderer);
			// workaround for a bubble up issue, properly fixed in master with a change of API.
			// currently we only have a simple view or a view in a view, so testing owner.owner is enough.
			var calendar = this.owner && this.owner.owner ? this.owner.owner : this.owner;
			if(calendar){
				calendar.onRendererCreated(renderer);
			}
		},
		
		onRendererCreated: function(renderer){
			// summary:
			//		Event dispatched when an item renderer has been created.
			// renderer: dojox/calendar/_RendererMixin
			//		The renderer created.
			// tags:
			//		callback
		},	
		
		_onRendererRecycled: function(renderer){
			this.onRendererRecycled(renderer);
			var calendar = this.owner && this.owner.owner ? this.owner.owner : this.owner;
			if(calendar){
				calendar.onRendererRecycled(renderer);
			}
		},
		
		onRendererRecycled: function(renderer){
			// summary:
			//		Event dispatched when an item renderer has been recycled.
			// renderer: dojox/calendar/_RendererMixin
			//		The renderer recycled.
			// tags:
			//		callback

		},
		
		_onRendererReused: function(renderer){
			this.onRendererReused(renderer);
			var calendar = this.owner && this.owner.owner ? this.owner.owner : this.owner;
			if(calendar){
				calendar.onRendererReused(renderer);
			}
		},
		
		onRendererReused: function(renderer){
			// summary:
			//		Event dispatched when an item renderer that was recycled is reused.
			// renderer: dojox/calendar/_RendererMixin
			//		The renderer reused.
			// tags:
			//		callback
		},
		
		_onRendererDestroyed: function(renderer){
			this.onRendererDestroyed(renderer);
			var calendar = this.owner && this.owner.owner ? this.owner.owner : this.owner;
			if(calendar){
				calendar.onRendererDestroyed(renderer);
			}
		},
		
		onRendererDestroyed: function(renderer){
			// summary:
			//		Event dispatched when an item renderer is destroyed.
			// renderer: dojox/calendar/_RendererMixin
			//		The renderer destroyed.
			// tags:
			//		callback
		},
				
		_onRenderersLayoutDone: function(view){
			// tags:
			//		private

			this.onRenderersLayoutDone(view);
			if(this.owner != null){
				this.owner.onRenderersLayoutDone(view);
			}				
		},
									
		onRenderersLayoutDone: function(view){
			// summary:
			//		Event triggered when item renderers layout has been done.
			// tags:
			//		callback
		},

		_recycleRenderer: function(renderer, remove){
			// summary: 
			//		Recycles the item renderer to be reused in the future.
			// renderer: dojox/calendar/_RendererMixin
			//		The item renderer to recycle.
			// tags:
			//		protected			
								
			this._onRendererRecycled(renderer);
			
			var pool = this.rendererPool[renderer.kind];
			
			if(pool == null){
				this.rendererPool[renderer.kind] = [renderer];
			}else{
				pool.push(renderer);
			}
								
			if(remove){
				renderer.container.parentNode.removeChild(renderer.container);
			}

			domStyle.set(renderer.container, "display", "none");

			renderer.renderer.owner = null;
			renderer.renderer.set("item", null);
		},
							
		_destroyRenderer: function(renderer){
			// summary: 
			//		Destroys the item renderer.
			// renderer: dojox/calendar/_RendererMixin
			//		The item renderer to destroy.
			// tags:
			//		protected
			this._onRendererDestroyed(renderer);
			
			var ir = renderer.renderer;
			
			arr.forEach(ir.__handles, function(handle){
				handle.remove();
			});				
			
			if(ir["destroy"]){
				ir.destroy();
			}
			
			html.destroy(renderer.container);	
		},
		
		_destroyRenderersByKind: function(kind){
			// tags:
			//		private

			var list = [];
			for(var i=0;i<this.rendererList.length;i++){
				var ir = this.rendererList[i];
				if(ir.kind == kind){
					this._destroyRenderer(ir);
				}else{
					list.push(ir);
				}
			}
			
			this.rendererList = list;
			
			var pool = this.rendererPool[kind];
			if(pool){
				while(pool.length > 0){
					this._destroyRenderer(pool.pop());
				}
			}
			
		},
				
					
		_updateEditingCapabilities: function(item, renderer){
			// summary:
			//		Update the moveEnabled and resizeEnabled properties of a renderer according to its event current editing state.
			// item: Object
			//		The event data item.
			// renderer: dojox/calendar/_RendererMixin
			//		The item renderer.
			// tags:
			//		protected

			var moveEnabled = this.isItemMoveEnabled(item, renderer.rendererKind);
			var resizeEnabled = this.isItemResizeEnabled(item, renderer.rendererKind);
			var changed = false;
			
			if(moveEnabled != renderer.get("moveEnabled")){
				renderer.set("moveEnabled", moveEnabled);
				changed = true;
			}
			if(resizeEnabled != renderer.get("resizeEnabled")){
				renderer.set("resizeEnabled", resizeEnabled);
				changed = true;
			}
			
			if(changed){
				renderer.updateRendering();
			}
		},
	
		updateRenderers: function(obj, stateOnly){
			// summary:
			//		Updates all the renderers that represents the specified item(s).
			// obj: Object
			//		A render item or an array of render items.
			// stateOnly: Boolean
			//		Whether only the state of the item has changed (selected, edited, edited, focused) or a more global change has occured.
			// tags:
			//		protected

			if(obj == null){
				return;
			}
			
			var items = lang.isArray(obj) ? obj : [obj];
			
			for(var i=0; i<items.length; i++){
				
				var item = items[i];
				
				if(item == null || item.id == null){
					continue;
				}
						
				var list = this.itemToRenderer[item.id];
				
				if(list == null){
					continue;
				}
				
				var selected = this.isItemSelected(item);
				var hovered = this.isItemHovered(item);
				var edited = this.isItemBeingEdited(item);
				var focused = this.showFocus ? this.isItemFocused(item) : false;
				
				for(var j = 0; j < list.length; j++){
					
					var renderer = list[j].renderer;
					renderer.set("hovered", hovered);
					renderer.set("selected", selected);
					renderer.set("edited", edited);
					renderer.set("focused", focused);
					
					this.applyRendererZIndex(item, list[j], hovered, selected, edited, focused);
					
					if(!stateOnly){
						renderer.set("item", item); // force content refresh
						if(renderer.updateRendering){
							renderer.updateRendering(); // reuse previously set dimensions	
						}
					}
				}
				
			}
		},
		
		applyRendererZIndex: function(item, renderer, hovered, selected, edited, focused){
			// summary:
			//		Applies the z-index to the renderer based on the state of the item.
			//		This methods is setting a z-index of 20 is the item is selected or edited 
			//		and the current lane value computed by the overlap layout (i.e. the renderers 
			//		are stacked according to their lane).
			// item: Object
			//		The render item.
			// renderer: Object
			//		A renderer associated with the render item.
			// hovered: Boolean
			//		Whether the item is hovered or not.
			// selected: Boolean
			//		Whether the item is selected or not.
			// edited: Boolean
			//		Whether the item is being edited not not.
			// focused: Boolean
			//		Whether the item is focused not not.
			// tags:
			//		protected
						
			domStyle.set(renderer.container, {"zIndex": edited || selected ? 20: item.lane == undefined ? 0 : item.lane});
		},
		
		getIdentity: function(item){
			return this.owner ? this.owner.getIdentity(item) : item.id; 
		},		
		
		/////////////////////////////////////////////////////
		//
		// Hovered item
		//
		////////////////////////////////////////////////////

		_setHoveredItem: function(item, renderer){
			// summary:
			//		Sets the current hovered item.
			// item: Object
			//		The data item.
			// renderer: dojox/calendar/_RendererMixin
			//		The item renderer.
			// tags:
			//		protected

			if(this.owner){
				this.owner._setHoveredItem(item, renderer);
				return;
			}
			
			if(this.hoveredItem && item && this.hoveredItem.id != item.id || 
				item == null || this.hoveredItem == null){
				var old = this.hoveredItem;
				this.hoveredItem = item;
				
				this.updateRenderers([old, this.hoveredItem], true);
				
				if(item && renderer){
					this._updateEditingCapabilities(item, renderer);
				}
			}
		},
		
		// hoveredItem: Object
		//		The currently hovered data item.
		hoveredItem: null,
		
		isItemHovered: function(item){
			// summary:
			//		Returns whether the specified item is hovered or not.
			// item: Object
			//		The item.
			// returns: Boolean
			if (this._isEditing && this._edProps){
				return item.id == this._edProps.editedItem.id;
			}else{
				return this.owner ?  
					this.owner.isItemHovered(item) : 
					this.hoveredItem != null && this.hoveredItem.id == item.id;
			}
		},
		
		isItemFocused: function(item){
			// summary:
			//		Returns whether the specified item is focused or not.
			// item: Object
			//		The item.
			// returns: Boolean
			return this._isItemFocused ? this._isItemFocused(item) : false;
		},
		
		////////////////////////////////////////////////////////////////////
		//
		// Selection delegation
		//
		///////////////////////////////////////////////////////////////////
		
		_setSelectionModeAttr: function(value){
			if(this.owner){
				this.owner.set("selectionMode", value);
			}else{
				this.inherited(arguments);
			}			
		},					
		
		_getSelectionModeAttr: function(value){			
			if(this.owner){
				return this.owner.get("selectionMode");
			}else{
				return this.inherited(arguments);
			}
		},
		
		_setSelectedItemAttr: function(value){			
			if(this.owner){
				this.owner.set("selectedItem", value);
			}else{
				this.inherited(arguments);
			}
		},
		
		_getSelectedItemAttr: function(value){			
			if(this.owner){
				return this.owner.get("selectedItem");
			}else{
				return this.selectedItem; // no getter on super class (dojox.widget.Selection)
			}
		},
		
		_setSelectedItemsAttr: function(value){			
			if(this.owner){
				this.owner.set("selectedItems", value);
			}else{
				this.inherited(arguments);
			}
		},
		
		_getSelectedItemsAttr: function(){			
			if(this.owner){
				return this.owner.get("selectedItems");
			}else{
				return this.inherited(arguments);
			}
		},
		
		isItemSelected: function(item){			
			if(this.owner){
				return this.owner.isItemSelected(item);
			}else{
				return this.inherited(arguments);
			}
		},
		
		selectFromEvent: function(e, item, renderer, dispatch){			
			if(this.owner){
				this.owner.selectFromEvent(e, item, renderer, dispatch);
			}else{
				this.inherited(arguments);
			}
		},
		
		setItemSelected: function(item, value){
			if(this.owner){
				this.owner.setItemSelected(item, value);
			}else{
				this.inherited(arguments);
			}
		},
		
		////////////////////////////////////////////////////////////////////
		//
		// Event creation
		//
		///////////////////////////////////////////////////////////////////
		
		createItemFunc: null,
		/*=====
		createItemFunc: function(view, d, e){
		 	// summary:
			//		A user supplied function that creates a new event.
			// view:
			//		the current view,
			// d:
			//		the date at the clicked location.
			// e:
			//		the mouse event (can be used to return null for example)
		},
		=====*/

				
		_getCreateItemFuncAttr: function(){			
			if(this.owner){
				return this.owner.get("createItemFunc");
			}else{
				return this.createItemFunc;
			}
		},
		
		// createOnGridClick: Boolean
		//		Indicates whether the user can create new event by clicking and dragging the grid.
		//		A createItem function must be defined on the view or the calendar object.
		createOnGridClick: false,
		
		_getCreateOnGridClickAttr: function(){
			if(this.owner){
				return this.owner.get("createOnGridClick");
			}else{
				return this.createOnGridClick;
			}
		},
		
		////////////////////////////////////////////////////////////////////
		//
		// Event creation
		//
		///////////////////////////////////////////////////////////////////	
		
		_gridMouseDown: false,
				
		_onGridMouseDown: function(e){
			// tags:
			//		private
			this._gridMouseDown = true;
								
			this.showFocus = false;
								
			if(this._isEditing){	
				this._endItemEditing("mouse", false);
			}
			
			this._doEndItemEditing(this.owner, "mouse");			
			
			this.set("focusedItem", null);
			this.selectFromEvent(e, null, null, true);
			
			if(this._setTabIndexAttr){
				this[this._setTabIndexAttr].focus();
			}
								
			if(this._onRendererHandleMouseDown){
				
				var f = this.get("createItemFunc");
				
				if(!f){
					return;
				}
				
				var newItem = f(this, this.getTime(e), e);
								
				var store = this.get("store");
											
				if(!newItem || store == null){
					return;
				}
				
				store.put(newItem);
				
				var renderers = this.getRenderers(newItem);
				// renderer created when item put in store
				if(renderers && renderers.length>0){
					var renderer = renderers[0];					
					if(renderer){
						this._onRendererHandleMouseDown(e, renderer.renderer, "resizeEnd");
					}					
				}
			}
		},
		
		_onGridMouseMove: function(e){
			// tags:
			//		private
		},
		
		_onGridMouseUp: function(e){
			// tags:
			//		private
		},
		
		_onGridTouchStart: function(e){
			// tags:
			//		private

			var p = this._edProps;

			this._gridProps = {
				event: e,				
				fromItem: this.isAscendantHasClass(e.target, this.eventContainer, "dojoxCalendarEventContainer")
			};			
	
			if(this._isEditing){
				
				if(this._gridProps){
					this._gridProps.editingOnStart = true;
				}

				lang.mixin(p, this._getTouchesOnRenderers(e, p.editedItem));
				
				if(p.touchesLen == 0){
					
					if(p && p.endEditingTimer){
						clearTimeout(p.endEditingTimer);
						p.endEditingTimer = null;
					}
					this._endItemEditing("touch", false);
				}
			}
			
			this._doEndItemEditing(this.owner, "touch");		

			event.stop(e);
			
		},
		
		_doEndItemEditing: function(obj, eventSource){
			// tags:
			//		private

			if(obj && obj._isEditing){
				p = obj._edProps;
				if(p && p.endEditingTimer){
					clearTimeout(p.endEditingTimer);
					p.endEditingTimer = null;
				}
				obj._endItemEditing(eventSource, false);
			}	
		},
					
		_onGridTouchEnd: function(e){
			// tags:
			//		private
		},
		
		_onGridTouchMove: function(e){
			// tags:
			//		private
		},
		
		__fixEvt: function(e){
			// summary:
			//		Extension point for a view to add some event properties to a calendar event.
			// tags:
			//		callback
			return e;
		},
		
		_dispatchCalendarEvt: function(e, name){
			// summary:
			//		Adds view properties to event and enable bubbling at owner level.
			// e: Event
			//		The dispatched event.
			// name: String
			//		The event name.
			// tags:
			//		protected
			
			e = this.__fixEvt(e);
			this[name](e);
			if(this.owner){
				this.owner[name](e);
			}
			return e;
		},

		_onGridClick: function(e){
			// tags:
			//		private
			if(!e.triggerEvent){
				e = {
					date: this.getTime(e),
					triggerEvent: e
				};
			}	
			
			this._dispatchCalendarEvt(e, "onGridClick");
		},
		
		onGridClick: function(e){
			// summary:
			//		Event dispatched when the grid has been clicked.
			// e: __GridClickEventArgs
			//		The event dispatched when the grid is clicked.
			// tags:
			//		callback
		},
		
		_onGridDoubleClick: function(e){
			// tags:
			//		private

			if(!e.triggerEvent){
				e = {
					date: this.getTime(e),
					triggerEvent: e
				};
			}
						
			this._dispatchCalendarEvt(e, "onGridDoubleClick");
		},
				
		onGridDoubleClick: function(e){
			// summary:
			//		Event dispatched when the grid has been double-clicked.
			// e: __GridClickEventArgs
			//		The event dispatched when the grid is double-clicked.
			// tags:
			//		protected

		},
		
		_onItemClick: function(e){
			// tags:
			//		private

			this._dispatchCalendarEvt(e, "onItemClick");
		},
		
		onItemClick: function(e){
			// summary:
			//		Event dispatched when an item renderer has been clicked.
			// e: __ItemMouseEventArgs
			//		The event dispatched when an item is clicked.
			// tags:
			//		callback

		},
		
		_onItemDoubleClick: function(e){
			// tags:
			//		private

			this._dispatchCalendarEvt(e, "onItemDoubleClick");	
		},
		
		onItemDoubleClick: function(e){
			// summary:
			//		Event dispatched when an item renderer has been double-clicked.
			// e: __ItemMouseEventArgs
			//		The event dispatched when an item is double-clicked.
			// tags:
			//		callback

		},

		_onItemContextMenu: function(e){
			this._dispatchCalendarEvt(e, "onItemContextMenu");
			// tags:
			//		private

		},
		
		onItemContextMenu: function(e){
			// summary:
			//		Event dispatched when an item renderer has been context-clicked.
			// e: __ItemMouseEventArgs
			//		The event dispatched when an item is context-clicked.
			// tags:
			//		callback

		},
		
		//////////////////////////////////////////////////////////
		//
		//	Editing
		//
		//////////////////////////////////////////////////////////

		_getStartEndRenderers: function(item){
			// summary:
			//		Returns an array that contains the first and last renderers of an item 			
			//		that are currently displayed. They could be the same renderer if only one renderer is used.
			// item: Object
			//		The render item.
			// returns: Object[]
			// tags:
			//		protected


			var list = this.itemToRenderer[item.id];

			if(list == null){
				return;
			}

			// trivial and most common use case.
			if(list.length == 1){
				var node = list[0].renderer;
				return [node, node];
			}

			var rd = this.renderData;
			var resizeStartFound = false;
			var resizeEndFound = false;

			var res = [];

			for(var i=0; i<list.length; i++){

				var ir = list[i].renderer;

				if (!resizeStartFound){
					resizeStartFound = rd.dateModule.compare(ir.item.range[0], ir.item.startTime) == 0;
					res[0] = ir;
				}

				if (!resizeEndFound){
					resizeEndFound =  rd.dateModule.compare(ir.item.range[1], ir.item.endTime) == 0;
					res[1] = ir;
				}

				if (resizeStartFound && resizeEndFound){
					break;	
				}
			}

			return res;			
		},
								
		// editable: Boolean
		//		A flag that indicates whether or not the user can edit
		//		items in the data provider.
		//		If <code>true</code>, the item renderers in the control are editable.
		//		The user can click on an item renderer, or use the keyboard or touch devices, to move or resize the associated event.
		editable: true,

		// moveEnabled: Boolean
		//		A flag that indicates whether the user can move items displayed.
		//		If <code>true</code>, the user can move the items.
		moveEnabled: true,

		// resizeEnabled: Boolean
		//		A flag that indicates whether the items can be resized.
		//		If `true`, the control supports resizing of items.
		resizeEnabled: true,
		
		isItemEditable: function(item, rendererKind){
			// summary:
			//		Computes whether particular item renderer can be edited or not.
			//		By default it is using the editable property value.
			// item: Object
			//		The item represented by the renderer.
			// rendererKind: String
			//		The kind of renderer.
			// returns: Boolean
			return this.editable && (this.owner ? this.owner.isItemEditable() : true);
		},

		isItemMoveEnabled: function(item, rendererKind){
			// summary:
			//		Computes whether particular item renderer can be moved.
			//		By default it is using the moveEnabled property value.
			// item: Object
			//		The item represented by the renderer.
			// rendererKind: String
			//		The kind of renderer.
			// returns: Boolean
			return this.isItemEditable(item, rendererKind) && this.moveEnabled && 
				(this.owner ? this.owner.isItemMoveEnabled(item, rendererKind): true);
		},
		
		isItemResizeEnabled: function(item, rendererKind){
			// summary:
			//		Computes whether particular item renderer can be resized.
			//		By default it is using the resizedEnabled property value.
			// item: Object
			//		The item represented by the renderer.
			// rendererKind: String
			//		The kind of renderer.
			// returns: Boolean
			
			return this.isItemEditable(item, rendererKind) && this.resizeEnabled && 
				(this.owner ? this.owner.isItemResizeEnabled(item, rendererKind): true);
		},

		// _isEditing: Boolean
		//		Whether an item is being edited or not.
		_isEditing: false,
		
		isItemBeingEdited: function(item){
			// summary:
			//		Returns whether an item is being edited or not.
			// item: Object
			//		The item to test.
			// returns: Boolean
			return this._isEditing && this._edProps && this._edProps.editedItem && this._edProps.editedItem.id == item.id;
		},
		
		_setEditingProperties: function(props){
			// summary:
			//		Registers the editing properties used by the editing functions.
			//		This method should only be called by editing interaction mixins like Mouse, Keyboard and Touch.
			// tags:
			//		protected

			this._edProps = props;
		},
		
		_startItemEditing: function(item, eventSource){
			// summary:
			//		Configures the component, renderers to start one (mouse) of several (touch, keyboard) editing gestures.
			// item: Object
			//		The item that will be edited.
			// eventSource: String
			//		"mouse", "keyboard", "touch"
			// tags:
			//		protected

			this._isEditing = true;			
			var p = this._edProps;
			
			p.editedItem = item;
			p.eventSource = eventSource;
			
			p.secItem = this._secondarySheet ? this._findRenderItem(item.id, this._secondarySheet.renderData.items) : null;
			p.ownerItem = this.owner ? this._findRenderItem(item.id, this.items) : null;
						
			if (!p.liveLayout){
				p.editSaveStartTime = item.startTime;
				p.editSaveEndTime = item.endTime;
				
				p.editItemToRenderer = this.itemToRenderer;
				p.editItems = this.renderData.items;
				p.editRendererList = this.rendererList;
				
				this.renderData.items = [p.editedItem];
				var id = p.editedItem.id;
			
				this.itemToRenderer = {};
				this.rendererList = [];
				var list = p.editItemToRenderer[id];
				
				p.editRendererIndices = [];
				
				arr.forEach(list, lang.hitch(this, function(ir, i){
					if(this.itemToRenderer[id] == null){
						this.itemToRenderer[id] = [ir];
					}else{
						this.itemToRenderer[id].push(ir);
					}
					this.rendererList.push(ir);
				}));
				
				// remove in old map & list the occurrence used by the edited item
				p.editRendererList = arr.filter(p.editRendererList, function(ir){
					return ir != null && ir.renderer.item.id != id;
				});
				delete p.editItemToRenderer[id];
			}
			
			// graphic feedback refresh
			this._layoutRenderers(this.renderData);
			
			this._onItemEditBegin({
				item: item,
				eventSource: eventSource
			});
		},
		
		_onItemEditBegin: function(e){
			// tags:
			//		private

			this._editStartTimeSave = this.newDate(e.item.startTime);
			this._editEndTimeSave = this.newDate(e.item.endTime);
			
			this._dispatchCalendarEvt(e, "onItemEditBegin");
		},
		
		onItemEditBegin: function(e){
			// summary:
			//		Event dispatched when the item is entering the editing mode.
			// tags:
			//		callback

		},
		
		_endItemEditing: function(/*String*/eventSource, /*Boolean*/canceled){
			// summary:
			//		Leaves the item editing mode.
			// item: Object
			//		The item that was edited.
			// eventSource: String
			//		"mouse", "keyboard", "touch"
			// tags:
			//		protected

			this._isEditing = false;					
			
			var p = this._edProps;
			
			arr.forEach(p.handles, function(handle){
				handle.remove();
			});					
						
			if (!p.liveLayout){
				this.renderData.items = p.editItems;
				this.rendererList = p.editRendererList.concat(this.rendererList);
				lang.mixin(this.itemToRenderer, p.editItemToRenderer);
			}
			
			var store = this.get("store");
						
			this._onItemEditEnd(lang.mixin(this._createItemEditEvent(), {
				item: this.renderItemToItem(p.editedItem, store),
				eventSource: eventSource,
				completed: !canceled
			}));
			
			this._layoutRenderers(this.renderData);				
			
			this._edProps = null;
		},
		
		_onItemEditEnd: function(e){
			// tags:
			//		private
								
			this._dispatchCalendarEvt(e, "onItemEditEnd");
			
			if(!e.isDefaultPrevented()){
				if(e.completed){
					// Inject new properties in data store item				
					// and apply data changes
					var store = this.get("store");
					store.put(e.item);
				}else{			
					e.item.startTime = this._editStartTimeSave; 
					e.item.endTime = this._editEndTimeSave;
				}
			}
		},
		
		onItemEditEnd: function(e){
			// summary:
			//		Event dispatched when the item is leaving the editing mode.
			// tags:
			//		protected

		},
		
		_createItemEditEvent: function(){
			// tags:
			//		private

			var e = {
				cancelable: true,
				bubbles: false,
				__defaultPrevent: false
			};
			
			e.preventDefault = function(){
				this.__defaultPrevented = true;
			};
			
			e.isDefaultPrevented = function(){
				return this.__defaultPrevented;
			};
			
			return e;
		},

		
		_startItemEditingGesture: function(dates, editKind, eventSource, e){
			// summary:
			//		Starts the editing gesture.
			// date: Date[]
			//		The reference dates (at least one). 
			// editKind: String
			//		Kind of edit: "resizeBoth", "resizeStart", "resizeEnd" or "move".
			// eventSource: String
			//		"mouse", "keyboard", "touch"
			// e: Event
			//		The event at the origin of the editing gesture.
			// tags:
			//		protected
			
			var p = this._edProps;
			
			if(!p || p.editedItem == null){
				return;
			}
			
			this._editingGesture = true;
			
			var item = p.editedItem;
			
			p.editKind = editKind; 
			
			this._onItemEditBeginGesture(this.__fixEvt(lang.mixin(this._createItemEditEvent(), {
				item: item,
				startTime: item.startTime,
				endTime: item.endTime,
				editKind: editKind,
				rendererKind: p.rendererKind,
				triggerEvent: e,
				dates: dates,
				eventSource: eventSource
			})));
			
			p.itemBeginDispatched = true;

		},
		
		
		_onItemEditBeginGesture: function(e){
			// tags:
			//		private
			var p = this._edProps;
			
			var item = p.editedItem;
			var dates = e.dates;
			
			p.editingTimeFrom = [];			
			p.editingTimeFrom[0] = dates[0];			
			
			p.editingItemRefTime = [];
			p.editingItemRefTime[0] = this.newDate(p.editKind == "resizeEnd" ? item.endTime : item.startTime);
			
			if (p.editKind == "resizeBoth"){
				p.editingTimeFrom[1] = dates[1];
				p.editingItemRefTime[1] = this.newDate(item.endTime);				
			}		
			
			var cal = this.renderData.dateModule;
			
			p.inViewOnce = this._isItemInView(item);
			
			if(p.rendererKind == "label" || this.roundToDay){
				p._itemEditBeginSave = this.newDate(item.startTime);
				p._itemEditEndSave = this.newDate(item.endTime);
			}
			
			p._initDuration = cal.difference(item.startTime, item.endTime, item.allDay?"day":"millisecond");	
			
			this._dispatchCalendarEvt(e, "onItemEditBeginGesture");

			if (!e.isDefaultPrevented()){
				
				if (e.eventSource == "mouse"){
					var cursor = e.editKind=="move"?"move":this.resizeCursor;
					p.editLayer = domConstruct.create("div", {
						style: "position: absolute; left:0; right:0; bottom:0; top:0; z-index:30; tabIndex:-1; background-image:url('"+this._blankGif+"'); cursor: "+cursor,
						onresizestart: function(e){return false;},
						onselectstart: function(e){return false;}
					}, this.domNode);
					p.editLayer.focus();
				}
			}
		},
		
		onItemEditBeginGesture: function(e){
			// summary:
			//		Event dispatched when an editing gesture is beginning.
			// e: __itemEditingEventArgs
			//		The editing event.
			// tags:
			//		callback

		},
		
		_waDojoxAddIssue: function(d, unit, steps){
			// summary:
			//		Workaround an issue of dojox.date.XXXXX.date.add() function 
			//		that does not support the subtraction of time correctly (normalization issues). 
			// d: Date
			//		Reference date.
			// unit: String
			//		Unit to add.
			// steps: Integer
			//		Number of units to add.
			// tags:
			//		protected

			var cal = this.renderData.dateModule;
			if(this._calendar != "gregorian" && steps < 0){
				var gd = d.toGregorian();
				gd = date.add(gd, unit, steps);
				return new this.renderData.dateClassObj(gd);
			}else{
				return cal.add(d, unit, steps);
			}
		},
						
		_computeItemEditingTimes: function(item, editKind, rendererKind, times, eventSource){
			// tags:
			//		private

			var cal = this.renderData.dateModule;
			var p = this._edProps;
			var diff = cal.difference(p.editingTimeFrom[0], times[0], "millisecond");
			times[0] = this._waDojoxAddIssue(p.editingItemRefTime[0], "millisecond", diff);
			
			if(editKind == "resizeBoth"){
				diff = cal.difference(p.editingTimeFrom[1], times[1], "millisecond");
				times[1] = this._waDojoxAddIssue(p.editingItemRefTime[1], "millisecond", diff); 
			}
			return times;
		},
		
		_moveOrResizeItemGesture: function(dates, eventSource, e){
			// summary:
			//		Moves or resizes an item.
			// dates: Date[]
			//		The reference dates.
			// editKind: String
			//		Kind of edit: "resizeStart", "resizeEnd", "resizeBoth" or "move".
			// eventSource: String
			//		"mouse", "keyboard", "touch"
			// e: Event
			//		The event at the origin of the editing gesture.
			// tags:
			//		private

			if(!this._isEditing || dates[0] == null){
				return;
			}
			
			var p = this._edProps;
			var item = p.editedItem;
			var rd = this.renderData;
			var cal = rd.dateModule;
			var editKind = p.editKind;
					
			var newTimes = [dates[0]];
			
			if(editKind == "resizeBoth"){
				newTimes[1] = dates[1];
			}
			
			newTimes = this._computeItemEditingTimes(item, p.editKind, p.rendererKind, newTimes, eventSource);
							
			var newTime = newTimes[0]; // usual use case
					
			var moveOrResizeDone = false;
			
			var oldStart = lang.clone(item.startTime);
			var oldEnd = lang.clone(item.endTime);
			
			// swap cannot used using keyboard as a gesture is made of one single change (loss of start/end context).
			var allowSwap = p.eventSource == "keyboard" ? false : this.allowStartEndSwap;

			// Update the Calendar with the edited value.
			if(editKind == "move"){
					
				if(cal.compare(item.startTime, newTime) != 0){
					var duration = cal.difference(item.startTime, item.endTime, "millisecond");
					item.startTime = this.newDate(newTime);
					item.endTime = cal.add(item.startTime, "millisecond", duration);
					moveOrResizeDone = true;
				}
				
			}else if(editKind == "resizeStart"){
				
				if(cal.compare(item.startTime, newTime) != 0){	
					if(cal.compare(item.endTime, newTime) != -1){				
						item.startTime = this.newDate(newTime);
					}else{ // swap detected
						if(allowSwap){
							item.startTime = this.newDate(item.endTime);
							item.endTime = this.newDate(newTime);	
							p.editKind = editKind = "resizeEnd";
							if(eventSource == "touch"){ // invert touches as well!
								p.resizeEndTouchIndex = p.resizeStartTouchIndex;
								p.resizeStartTouchIndex = -1;
							}	
						}else{ // block the swap but keep the time of day
							item.startTime = this.newDate(item.endTime);
							item.startTime.setHours(newTime.getHours());
							item.startTime.setMinutes(newTime.getMinutes());
							item.startTime.setSeconds(newTime.getSeconds());
						}
					}
					moveOrResizeDone = true;
				}
				
			}else if(editKind == "resizeEnd"){
				
				if(cal.compare(item.endTime, newTime) != 0){
					if(cal.compare(item.startTime, newTime) != 1){
						item.endTime = this.newDate(newTime);	
					}else{ // swap detected

						if(allowSwap){
							item.endTime = this.newDate(item.startTime);
							item.startTime = this.newDate(newTime);	
							p.editKind = editKind = "resizeStart";
							if(eventSource == "touch"){ // invert touches as well!
								p.resizeStartTouchIndex = p.resizeEndTouchIndex;
								p.resizeEndTouchIndex = -1;
							}
						}else{ // block the swap but keep the time of day
							item.endTime = this.newDate(item.startTime);
							item.endTime.setHours(newTime.getHours());
							item.endTime.setMinutes(newTime.getMinutes());
							item.endTime.setSeconds(newTime.getSeconds());	
						}
					}

					moveOrResizeDone = true;
				}
			}else if(editKind == "resizeBoth"){
				
					moveOrResizeDone = true;

					var start =  this.newDate(newTime);
					var end = this.newDate(newTimes[1]);		

					if(cal.compare(start, end) != -1){ // swap detected
						if(allowSwap){
							var t = start;
							start = end;
							end = t;
						}else{ // as both ends are moved, the simple way is to forbid the move gesture.
							moveOrResizeDone = false;
						}
					}

					if(moveOrResizeDone){
						item.startTime = start;
						item.endTime = end; 
					}

			}else{	
				return false;
			}

			if(!moveOrResizeDone){
				return false;
			}

			var evt = lang.mixin(this._createItemEditEvent(), {
				item: item,
				startTime: item.startTime,
				endTime: item.endTime,
				editKind: editKind,
				rendererKind: p.rendererKind,
				triggerEvent: e,
				eventSource: eventSource
			}); 
			
			// trigger snapping, rounding, minimal duration, boundaries checks etc.
			if(editKind == "move"){
				this._onItemEditMoveGesture(evt);
			}else{
				this._onItemEditResizeGesture(evt);
			}
			
			// prevent invalid range
			if(cal.compare(item.startTime, item.endTime) == 1){
				var tmp = item.startTime;
				item.startTime = item.startTime;
				item.endTime = tmp;
			}
			
			moveOrResizeDone = 
				cal.compare(oldStart, item.startTime) != 0 || 
				cal.compare(oldEnd, item.endTime) != 0;
			
			if(!moveOrResizeDone){
				return false;
			}

			this._layoutRenderers(this.renderData);	

			if(p.liveLayout && p.secItem != null){
				p.secItem.startTime = item.startTime;
				p.secItem.endTime = item.endTime;
				this._secondarySheet._layoutRenderers(this._secondarySheet.renderData);
			}else if(p.ownerItem != null && this.owner.liveLayout){
				p.ownerItem.startTime = item.startTime;
				p.ownerItem.endTime = item.endTime;
				this.owner._layoutRenderers(this.owner.renderData);
			}
												
			return true;
		},
		
		_findRenderItem: function(id, list){
			// tags:
			//		private

			list = list || this.renderData.items;
			for(var i=0; i<list.length; i++){
				if(list[i].id == id){
					return list[i];
				}
			}
			return null;
		},

		_onItemEditMoveGesture: function(e){	
			// tags:
			//		private

			this._dispatchCalendarEvt(e, "onItemEditMoveGesture");

			if(!e.isDefaultPrevented()){
				
				var p = e.source._edProps;
				var rd = this.renderData;
				var cal = rd.dateModule;
				var newStartTime, newEndTime;
				
				if(p.rendererKind == "label" || (this.roundToDay && !e.item.allDay)){
					
					newStartTime = this.floorToDay(e.item.startTime, false, rd);
					newStartTime.setHours(p._itemEditBeginSave.getHours());
					newStartTime.setMinutes(p._itemEditBeginSave.getMinutes());
					
					newEndTime = cal.add(newStartTime, "millisecond", p._initDuration);
					
				}else if(e.item.allDay){
					newStartTime = this.floorToDay(e.item.startTime, true);
					newEndTime = cal.add(newStartTime, "day", p._initDuration);
				}else{
					newStartTime = this.floorDate(e.item.startTime, this.snapUnit, this.snapSteps);
					newEndTime = cal.add(newStartTime, "millisecond", p._initDuration);
				} 

				e.item.startTime = newStartTime;
				e.item.endTime = newEndTime;
				
				if(!p.inViewOnce){
					p.inViewOnce = this._isItemInView(e.item);
				}

				// to prevent strange behaviors use constraint in items already fully in view.
				if(p.inViewOnce && this.stayInView){
					this._ensureItemInView(e.item);
				}
			}
		},
		
		_DAY_IN_MILLISECONDS: 24 * 60 * 60 * 1000,
		
		onItemEditMoveGesture: function(e){
			// summary:
			//		Event dispatched during a move editing gesture.
			// e: __itemEditingEventArgs
			//		The editing event.
			// tags:
			//		callback

		},
				
		_onItemEditResizeGesture: function(e){
			// tags:
			//		private

			this._dispatchCalendarEvt(e, "onItemEditResizeGesture");
			
			if(!e.isDefaultPrevented()){				
							
				var p = e.source._edProps;
				var rd = this.renderData;
				var cal = rd.dateModule;
				
				var newStartTime = e.item.startTime;
				var newEndTime = e.item.endTime;
				
				if(e.editKind == "resizeStart"){
					if(e.item.allDay){
						newStartTime = this.floorToDay(e.item.startTime, false, this.renderData);
					}else if(this.roundToDay){
						newStartTime = this.floorToDay(e.item.startTime, false, rd);
						newStartTime.setHours(p._itemEditBeginSave.getHours());
						newStartTime.setMinutes(p._itemEditBeginSave.getMinutes());
					}else{
						newStartTime = this.floorDate(e.item.startTime, this.snapUnit, this.snapSteps);
					}
				}else if(e.editKind == "resizeEnd"){
					if(e.item.allDay){
						if(!this.isStartOfDay(e.item.endTime)){
							newEndTime = this.floorToDay(e.item.endTime, false, this.renderData);
							newEndTime = cal.add(newEndTime, "day", 1);
						}
					}else if(this.roundToDay){
						newEndTime = this.floorToDay(e.item.endTime, false, rd);
						newEndTime.setHours(p._itemEditEndSave.getHours());
						newEndTime.setMinutes(p._itemEditEndSave.getMinutes());
					}else{
						newEndTime = this.floorDate(e.item.endTime, this.snapUnit, this.snapSteps);
					
						if(e.eventSource == "mouse"){
							newEndTime = cal.add(newEndTime, this.snapUnit, this.snapSteps);
						}
					}
				}else{ // Resize both
					newStartTime = this.floorDate(e.item.startTime, this.snapUnit, this.snapSteps);
					newEndTime = this.floorDate(e.item.endTime, this.snapUnit, this.snapSteps);
					newEndTime = cal.add(newEndTime, this.snapUnit, this.snapSteps);
				}
				
				e.item.startTime = newStartTime;
				e.item.endTime = newEndTime;
				
				var minimalDay = e.item.allDay || p._initDuration >= this._DAY_IN_MILLISECONDS && !this.allowResizeLessThan24H;
				
				this.ensureMinimalDuration(this.renderData, e.item, 
					minimalDay ? "day" : this.minDurationUnit, 
					minimalDay ? 1 : this.minDurationSteps, 
					e.editKind);
					
				if(!p.inViewOnce){
					p.inViewOnce = this._isItemInView(e.item);
				}

				// to prevent strange behaviors use constraint in items already fully in view.
				if(p.inViewOnce && this.stayInView){
					this._ensureItemInView(e.item);
				}
			}
		},
		
		onItemEditResizeGesture: function(e){
			// summary:
			//		Event dispatched during a resize editing gesture.
			// e: __itemEditingEventArgs
			//		The editing event.
			// tags:
			//		callback

		},
		
		_endItemEditingGesture: function(/*String*/eventSource,	/*Event*/e){
			// tags:
			//		protected

			if(!this._isEditing){
				return;
			}					
			
			this._editingGesture = false;
			
			var p = this._edProps;
			var item = p.editedItem;
			
			p.itemBeginDispatched = false;							
			
			this._onItemEditEndGesture(lang.mixin(this._createItemEditEvent(), {
				item: item,
				startTime: item.startTime,
				endTime: item.endTime,
				editKind: p.editKind,
				rendererKind: p.rendererKind,
				triggerEvent: e,
				eventSource: eventSource
			}));

		},
		
		_onItemEditEndGesture: function(e){
			// tags:
			//		private

			var p = this._edProps;
			
			delete p._itemEditBeginSave;
			delete p._itemEditEndSave;
					
			this._dispatchCalendarEvt(e, "onItemEditEndGesture");
			
			if (!e.isDefaultPrevented()){
				if(p.editLayer){
					if(has("ie")){
						p.editLayer.style.cursor = "default";
					}
					setTimeout(lang.hitch(this, function(){
						if(this.domNode){ // for unit tests					
							this.domNode.focus();
							p.editLayer.parentNode.removeChild(p.editLayer);
							p.editLayer = null;
						}		
					}), 10);
								
				}
			}
		},
		
		onItemEditEndGesture: function(e){
			// summary:
			//		Event dispatched at the end of an editing gesture.
			// e: __itemEditingEventArgs
			//		The editing event.
			// tags:
			//		callback

		},
		
		ensureMinimalDuration: function(renderData, item, unit, steps, editKind){
			// summary:
			//		During the resize editing gesture, ensures that the item has the specified minimal duration.
			// renderData: Object
			//		The render data.
			// item: Object
			//		The edited item.
			// unit: String
			//		The unit used to define the minimal duration.
			// steps: Integer
			//		The number of time units.
			// editKind: String
			//		The edit kind: "resizeStart" or "resizeEnd".
			var minTime;
			var cal = renderData.dateModule;
			
			if(editKind == "resizeStart"){
				minTime = cal.add(item.endTime, unit, -steps);
				if(cal.compare(item.startTime, minTime) == 1){
					item.startTime = minTime;
				}
			} else {
				minTime = cal.add(item.startTime, unit, steps);
				if(cal.compare(item.endTime, minTime) == -1){
					item.endTime = minTime;
				}
			}
		},
		
		// doubleTapDelay: Integer
		//		The maximum delay between two taps needed to trigger an "itemDoubleClick" event, in touch context.		
		doubleTapDelay: 300,
		
		// snapUnit: String
		//		The unit of the snapping to apply during the editing of an event.
		//		"day", "hour" and "minute" are valid values. 
		snapUnit: "minute",
		
		// snapSteps: Integer
		//		The number of units used to compute the snapping of the edited item.
		snapSteps: 15,
		
		// minDurationUnit: "String"
		//		The unit used to define the minimal duration of the edited item.
		//		"day", "hour" and "minute" are valid values.
		minDurationUnit: "hour",
		
		// minDurationSteps: Integer
		//		The number of units used to define the minimal duration of the edited item.
		minDurationSteps: 1,
		
		// liveLayout: Boolean
		//		If true, all the events are laid out during the editing gesture. If false, only the edited event is laid out.
		liveLayout: false,			
		
		// stayInView: Boolean
		//		Specifies during editing, if the item is already in view, if the item must stay in the time range defined by the view or not.		
		stayInView: true,
		
		// allowStartEndSwap: Boolean
		//		Specifies if the start and end time of an item can be swapped during an editing gesture. Note that using the keyboard this property is ignored.	
		allowStartEndSwap: true,			
		
		// allowResizeLessThan24H: Boolean
		//		If an event has a duration greater than 24 hours, indicates if using a resize gesture, it can be resized to last less than 24 hours.
		//		This flag is usually used when two different kind of renderers are used (MatrixView) to prevent changing the kind of renderer during an editing gesture.
		allowResizeLessThan24H: false
		
	});
});
