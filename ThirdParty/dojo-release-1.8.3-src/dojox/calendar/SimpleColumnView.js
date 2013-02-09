define([
"./ViewBase", 
"dijit/_TemplatedMixin", 
"./_VerticalScrollBarBase", 
"dojo/text!./templates/SimpleColumnView.html",
"dojo/_base/declare", 
"dojo/_base/event", 
"dojo/_base/lang", 
"dojo/_base/array",
"dojo/_base/sniff",
"dojo/_base/fx", 
"dojo/_base/html",
"dojo/on",
"dojo/dom", 
"dojo/dom-class", 
"dojo/dom-style", 
"dojo/dom-geometry", 
"dojo/dom-construct",
"dojo/mouse", 
"dojo/query", 
"dojox/html/metrics"],

function(
	ViewBase, 
	_TemplatedMixin, 
	_VerticalScrollBarBase, 
	template, 
	declare, 
	event, 
	lang, 
	arr, 
	has,
	fx, 
	html,
	on,
	dom, 
	domClass, 
	domStyle,
	domGeometry, 
	domConstruct,
	mouse,
	query, 
	metrics){
	
	/*=====
	var __ColumnClickEventArgs = {
		// summary:
		//		A column click event.
		// index: Integer
		//		The column index. 
		// date: Date
		//		The date displayed by the column.
		// triggerEvent: Event
		//		The origin event.
	};
	=====*/
				
	return declare("dojox.calendar.SimpleColumnView", [ViewBase, _TemplatedMixin], {
		
		// summary:
		//		The simple column view is displaying a day per column. Each cell of a column is a time slot.

		baseClass: "dojoxCalendarSimpleColumnView",
		
		templateString: template,
		
		// viewKind: String
		//		Type of the view. Used by the calendar widget to determine how to configure the view.
		//		This view kind is "columns".
		viewKind: "columns",
		
		// scroll container is the focusable item to enable scrolling using up and down arrows
		_setTabIndexAttr: "domNode",
		
		// renderData: Object
		//		The render data is the object that contains all the properties needed to render the component.
		renderData: null,		
				
		// startDate: Date
		//		The start date of the time interval displayed.
		//		If not set at initialization time, will be set to current day.
		startDate: null,
			
		// columnCount: Integer
		//		The number of column to display (from the startDate).
		columnCount: 7,
	
		// minHours: Integer
		//		The minimum hour to be displayed. It must be in the [0,24] interval.
		minHours: 8,
		
		// maxHours: Integer
		//		The maximum hour to be displayed. It must be in the [0,24] interval.	
		maxHours: 18,
		
		// hourSize: Integer
		//		The desired size in pixels of an hour on the screen.
		//		Note that the effective size may be different as the time slot size must be an integer.
		hourSize: 100,
		
		// timeSlotDuration: Integer
		//		Duration of the time slot in minutes. Must be a divisor of 60.
		timeSlotDuration: 15,
		
		// verticalRenderer: Class
		//		The class use to create vertical renderers.
		verticalRenderer: null,
		
		// percentOverlap: Integer
		//		The percentage of the renderer width used to superimpose one item renderer on another 
		//		when two events are overlapping.
		percentOverlap: 70,
		
		// horizontalGap: Integer
		//		The number of pixels between two item renderers that are overlapping each other if the percentOverlap property is 0.
		horizontalGap: 4,
		
		_columnHeaderHandlers: null,
		
		constructor: function(){
			this.invalidatingProperties = ["columnCount", "startDate", "minHours", "maxHours", "hourSize", "verticalRenderer",
				"rowHeaderTimePattern", "columnHeaderDatePattern", "timeSlotDuration", "percentOverlap", "horizontalGap", 
				"scrollBarRTLPosition","itemToRendererKindFunc", "layoutPriorityFunction", "formatItemTimeFunc", "textDir", "items"];
			this._columnHeaderHandlers = [];
		},
		
		destroy: function(preserveDom){
			this._cleanupColumnHeader();
			if(this.scrollBar){
				this.scrollBar.destroy(preserveDom);
			}
			this.inherited(arguments);
		},
		
		_scrollBar_onScroll: function(value){
			this._setScrollPosition(value);
		},
		
		buildRendering: function(){
			this.inherited(arguments);
			if(this.vScrollBar){
				this.scrollBar = new _VerticalScrollBarBase(
					{content: this.vScrollBarContent}, 
					this.vScrollBar);
					
				this.scrollBar.on("scroll", lang.hitch(this, this._scrollBar_onScroll));
				this._viewHandles.push(
						on(this.scrollContainer, mouse.wheel,  
							dojo.hitch(this, this._mouseWheelScrollHander)));
			}
		},
		
		postscript: function(){
			this.inherited(arguments);
			this._initialized = true;
			if(!this.invalidRendering){
				this.refreshRendering();
			}
		},
		
		_setVerticalRendererAttr: function(value){
			this._destroyRenderersByKind("vertical");
			this._set("verticalRenderer", value);	
		},
				
		_createRenderData: function(){
			
			var renderData = {};

			renderData.minHours = this.get("minHours");		
			renderData.maxHours = this.get("maxHours");
			renderData.hourSize = this.get("hourSize");
			renderData.hourCount = renderData.maxHours - renderData.minHours;		
			renderData.slotDuration = this.get("timeSlotDuration"); // must be consistent with previous statement
			renderData.slotSize = Math.ceil(renderData.hourSize / (60 / renderData.slotDuration));
			renderData.hourSize = renderData.slotSize * (60 / renderData.slotDuration);
			renderData.sheetHeight = renderData.hourSize * renderData.hourCount;		
			renderData.scrollbarWidth = metrics.getScrollbar().w + 1;
			
			renderData.dateLocaleModule = this.dateLocaleModule;
			renderData.dateClassObj = this.dateClassObj;
			renderData.dateModule = this.dateModule; // arithmetics on Dates
			
			renderData.dates = [];
						
			renderData.columnCount = this.get("columnCount");

			var d = this.get("startDate");
		
			if (d == null){
				d = new renderData.dateClassObj();
			}

			d = this.floorToDay(d, false, renderData);
			
			this.startDate = d;
			
			for(var col = 0; col < renderData.columnCount ; col++){
				renderData.dates.push(d);
				d = renderData.dateModule.add(d, "day", 1);
				d = this.floorToDay(d, false, renderData);
			}

			renderData.startTime = new renderData.dateClassObj(renderData.dates[0]);
			renderData.startTime.setHours(renderData.minHours);
			renderData.endTime = new renderData.dateClassObj(renderData.dates[renderData.columnCount-1]);
			renderData.endTime.setHours(renderData.maxHours);
			
			if(this.displayedItemsInvalidated){
				this.displayedItemsInvalidated = false;
				this._computeVisibleItems(renderData);
				
				if(this._isEditing){					
					this._endItemEditing(null, false);
				}
				
			}else if (this.renderData){
				renderData.items = this.renderData.items;
			}
			
			return renderData;
		},
		
		_validateProperties: function() {
			
			this.inherited(arguments);
			
			var v = this.minHours;
			if(v < 0 || v>24 || isNaN(v)){
				this.minHours = 0;
			}
			v = this.maxHours;
			if (v < 0 || v>24 || isNaN(v)){
				this.minHours = 24;
			}
			
			if(this.minHours > this.maxHours){
				var t = this.maxHours;
				this.maxHours = this.minHours;
				this.maxHours = t;
			}
			if (v-this.minHours < 1){
				this.minHours = 0;
				this.maxHours = 24;				
			}
			if (this.columnCount<1 || isNaN(this.columnCount)){
				this.columnCount = 1;				
			}
			
			v = this.percentOverlap;
			if(this.percentOverlap<0 ||this.percentOverlap>100 || isNaN(this.percentOverlap)){
				this.percentOverlap = 70;
			}
			if(this.hourSize<5 || isNaN(this.hourSize)){
				this.hourSize = 10;
			}
			v = this.timeSlotDuration;
			if(v<1 || v>60 || isNaN(v)){
				v = 15;
			}
		},
		
		_setStartDateAttr: function(value){
			this.displayedItemsInvalidated = true;			
			this._set("startDate", value);
		},
		
		_setColumnCountAttr: function(value){			
			this.displayedItemsInvalidated = true;
			this._set("columnCount", value);
		},
		
		__fixEvt:function(e){
			// tags:
			//		private
			e.sheet = "primary";
			e.source = this;
			return e;
		},
		
		//////////////////////////////////////////
		//
		// Formatting functions
		//
		//////////////////////////////////////////
		
		_formatRowHeaderLabel: function(/*Date*/d){
			// summary:
			//		Computes the row header label for the specified time of day.
			//		By default a formatter is used, optionally the <code>rowHeaderTimePattern</code> property can be used to set a custom time pattern to the formatter.
			// d: Date
			//		The date to format
			// tags:
			//		protected

			return this.renderData.dateLocaleModule.format(d, {
				selector: "time", 
				timePattern: this.rowHeaderTimePattern
			});
		},
	
		_formatColumnHeaderLabel: function(/*Date*/d){			
			// summary:
			//		Computes the column header label for the specified date.
			//		By default a formatter is used, optionally the <code>columnHeaderDatePattern</code> property can be used to set a custom date pattern to the formatter.
			// d: Date
			//		The date to format 
			// tags:
			//		protected

			return this.renderData.dateLocaleModule.format(d, {
				selector: "date", 
				datePattern: this.columnHeaderDatePattern, 
				formatLength: "medium"
			});
		},
		
		//////////////////////////////////////////
		//
		// Time of day management
		//
		//////////////////////////////////////////
		
		// startTimeOfDay: Object
		//		The scroll position of the view. The value is an object made of "hours" and "minutes" properties.
		startTimeOfDay: null,
				
		// scrollBarRTLPosition: String
		//		Position of the scroll bar in right-to-left display.
		//		Valid values are "left" and "right", default value is "left".
		scrollBarRTLPosition: "left",
		
		_getStartTimeOfDay: function(){
			// summary:
			//		Returns the visible first time of day.
			// tags:
			//		protected
			// returns: Integer[]

			var v = (this.get("maxHours") - this.get("minHours")) * 
				this._getScrollPosition() / this.renderData.sheetHeight;
			
			return {
				hours: this.renderData.minHours + Math.floor(v),
				minutes: (v - Math.floor(v)) * 60
			};
		},
		
		_getEndTimeOfDay: function(){
			// summary:
			//		Returns the visible last time of day.
			// tags:
			//		protected
			// returns: Integer[]

			var v = (this.get("maxHours") - this.get("minHours")) * 
				(this._getScrollPosition() + this.scrollContainer.offsetHeight) / this.renderData.sheetHeight;
			
			return {
				hours: this.renderData.minHours + Math.floor(v),
				minutes: (v - Math.floor(v)) * 60
			};
		},
		
		_setStartTimeOfDayAttr: function(value){
			this._setStartTimeOfDay(value.hours, value.minutes, value.duration, value.easing)
		},
		
		_getStartTimeOfDayAttr: function(){
			return this._getStartTimeOfDay();
		},
		
		_setStartTimeOfDay: function(hour, minutes, maxDuration, easing){
			// summary:
			//		Scrolls the view to show the specified first time of day.
			// hour: Integer
			//		The hour of the start time of day.
			// minutes: Integer
			//		The minutes part of the start time of day.
			// maxDuration: Integer
			//		The max duration of the scroll animation.
			// tags:
			//		protected

			var rd = this.renderData;
			
			hour = hour || rd.minHours;
			minutes = minutes || 0;
			maxDuration = maxDuration || 0;
			
			if (minutes < 0){
				minutes = 0;
			}else if (minutes > 59){
				minutes = 59;
			}
			
			if (hour < 0){
				hour = 0;
			}else if (hour > 24){
				hour = 24;
			}
			
			var timeInMinutes = hour * 60 + minutes;
			
			var minH = rd.minHours*60;
			var maxH = rd.maxHours*60;
			
			if (timeInMinutes < minH){
				timeInMinutes = minH;
			}else if(timeInMinutes > maxH){
				timeInMinutes = maxH;
			}
					
			var pos = (timeInMinutes - minH) * rd.sheetHeight / (maxH - minH);
			pos = Math.min(rd.sheetHeight - this.scrollContainer.offsetHeight, pos);
			
			this._scrollToPosition(pos, maxDuration, easing);
		},
		
		_scrollToPosition: function(position, maxDuration, easing){
			// summary:
			//		Scrolls the view to show the specified first time of day.
			// position: Integer
			//		The position in pixels.
			// maxDuration: Integer
			//		The max duration of the scroll animation.
			// tags:
			//		protected
			
			if (maxDuration) {
				
				if(this._scrollAnimation){
					this._scrollAnimation.stop();
				}
				
				var scrollPos = this._getScrollPosition();
				
				var duration = Math.abs(((position - scrollPos) * maxDuration) / this.renderData.sheetHeight);
				
				this._scrollAnimation = new fx.Animation({
					curve: [scrollPos, position],
					duration: duration,
					easing: easing,
					onAnimate: lang.hitch(this, function(position) {
						this._setScrollImpl(position);
					})
				});
								
				this._scrollAnimation.play();

			}else{
				this._setScrollImpl(position);
			}
		},
		
		_setScrollImpl: function(v){
			this._setScrollPosition(v);
			if(this.scrollBar){
				this.scrollBar.set("value", v);
			}
		},
		
		ensureVisibility: function(start, end, visibilityTarget, margin, duration){
			
			// summary:
			//		Scrolls the view if the [start, end] time range is not visible or only partially visible.
			// start: Date
			//		Start time of the range of interest.
			// end: Date
			//		End time of the range of interest.
			// margin: Integer
			//		Margin in minutes around the time range.
			// visibilityTarget: String
			//		The end(s) of the time range to make visible.
			//		Valid values are: "start", "end", "both".	
			// duration: Number
			//		Optional, the maximum duration of the scroll animation.
			
			margin = margin == undefined ? this.renderData.slotDuration : margin;
			
			if(this.scrollable && this.autoScroll){
				
				var s = start.getHours() * 60 + start.getMinutes() - margin;
				var e = end.getHours() * 60 + end.getMinutes() + margin;
				
				var vs = this._getStartTimeOfDay();
				var ve = this._getEndTimeOfDay();
				
				var viewStart = vs.hours * 60 + vs.minutes; 
				var viewEnd = ve.hours * 60 + ve.minutes;
				
				var visible = false;
				var target = null;
				
				switch(visibilityTarget){
					case "start":
						visible = s >= viewStart && s <= viewEnd;
						target = s ;
						break;
					case "end":
						visible = e >= viewStart && e <= viewEnd;
						target = e - (viewEnd - viewStart);
						break;
					case "both":
						visible = s >= viewStart && e <= viewEnd;
						target = s;
						break;
				}

				if(!visible){
					this._setStartTimeOfDay(Math.floor(target/60), target%60, duration);
				}
			}
		},
		
		scrollView: function(dir){
			// summary:
			//		Scrolls the view to the specified direction of one time slot duration.
			// dir: Integer
			//		Direction of the scroll. Valid values are -1 and 1.
			//
			var t = this._getStartTimeOfDay();
			t = t.hours*60 + t.minutes + (dir * this.timeSlotDuration);
			this._setStartTimeOfDay(Math.floor(t/60), t%60);
		},
		
		_mouseWheelScrollHander: function(e){
			// summary:
			//		Mouse wheel handler.
			// tags:
			//		protected
			this.scrollView(e.wheelDelta > 0 ? -1 : 1);
		},		
		
		//////////////////////////////////////////
		//
		// HTML structure management
		//
		//////////////////////////////////////////		
	
		refreshRendering: function(){
			if(!this._initialized){
				return;
			}
						
			this._validateProperties();

			var oldRd = this.renderData;
			var rd = this._createRenderData();
			this.renderData = rd;
			this._createRendering(rd, oldRd);
			this._layoutRenderers(rd);
		},
		
		_createRendering: function(/*Object*/renderData, /*Object*/oldRenderData){
			// tags:
			//		private
			domStyle.set(this.sheetContainer, "height", renderData.sheetHeight + "px");
			// padding for the scroll bar.
			this._configureScrollBar(renderData);
			this._buildColumnHeader(renderData, oldRenderData);
			this._buildRowHeader(renderData, oldRenderData);
			this._buildGrid(renderData, oldRenderData);
			this._buildItemContainer(renderData, oldRenderData);
		},
		
		_configureScrollBar: function(renderData){
			// summary:
			//		Sets the scroll bar size and position.
			// renderData: Object
			//		The render data.
			// tags:
			//		protected

			if(has("ie") && this.scrollBar){
				domStyle.set(this.scrollBar.domNode, "width", (renderData.scrollbarWidth + 1) + "px");
			}
						
			var atRight = this.isLeftToRight() ? true : this.scrollBarRTLPosition == "right";
			var rPos = atRight ? "right" : "left";
			var lPos = atRight? "left" : "right";
			
			if(this.scrollBar){
				this.scrollBar.set("maximum", renderData.sheetHeight);			
				domStyle.set(this.scrollBar.domNode, rPos, 0);
				domStyle.set(this.scrollBar.domNode, atRight? "left" : "right", "auto");
			}
			domStyle.set(this.scrollContainer, rPos, renderData.scrollbarWidth + "px");
			domStyle.set(this.scrollContainer, lPos, "0");
			domStyle.set(this.header, rPos, renderData.scrollbarWidth + "px");
			domStyle.set(this.header, lPos, "0");
			if(this.buttonContainer && this.owner != null && this.owner.currentView == this){
				domStyle.set(this.buttonContainer, rPos, renderData.scrollbarWidth + "px");
				domStyle.set(this.buttonContainer, lPos, "0");
			}
		},
		
		_columnHeaderClick: function(e){
			// tags:
			//		private

			event.stop(e);
			var index = query("td", this.columnHeaderTable).indexOf(e.currentTarget);
			this._onColumnHeaderClick({
				index: index,
				date: this.renderData.dates[index],
				triggerEvent: e
			});						
		},
		
		_buildColumnHeader: function(renderData, oldRenderData){				
			// summary:
			//		Creates incrementally the HTML structure of the column header and configures its content.
			//
			// renderData:
			//		The render data to display.
			//
			// oldRenderData:
			//		The previously render data displayed, if any.
			// tags:
			//		private

			var table = this.columnHeaderTable;
			
			if (!table){
				return;
			}
					
			var count = renderData.columnCount - (oldRenderData ? oldRenderData.columnCount : 0);
			
			if(has("ie") == 8){
				// workaround Internet Explorer 8 bug.
				// if on the table, width: 100% and table-layout: fixed are set
				// and columns are removed, width of remaining columns is not 
				// recomputed: must rebuild all. 
				if(this._colTableSave == null){
					this._colTableSave = lang.clone(table);
				}else if(count < 0){
					this._cleanupColumnHeader();
					this.columnHeader.removeChild(table);
					domConstruct.destroy(table);
					table = lang.clone(this._colTableSave);
					this.columnHeaderTable = table;
					this.columnHeader.appendChild(table);
					count = renderData.columnCount;
				}
				
			} // else incremental dom add/remove for real browsers.
					
			var tbodies = query("tbody", table);
			
			var trs = query("tr", table);
			var tbody, tr, td;
			
			if (tbodies.length == 1){
				tbody = tbodies[0];
			}else{ 
				tbody = html.create("tbody", null, table);
			}
			
			if (trs.length == 1){
				tr = trs[0];
			}else{ 
				tr = domConstruct.create("tr", null, tbody);
			}
						 
			// Build HTML structure (incremental)
			if(count > 0){ // creation				
				for(var i=0; i < count; i++){
														
					td = domConstruct.create("td", null, tr);
					
					var h = [];
					h.push(on(td, "click", lang.hitch(this, this._columnHeaderClick)));
										
					if(has("touch")){					
						h.push(on(td, "touchstart", function(e){
							event.stop(e);
							domClass.add(e.currentTarget, "Active");
						}));
						
						h.push(on(td, "touchend", function(e){			
							event.stop(e);			
							domClass.remove(e.currentTarget, "Active");			
						}));
					}else{
						h.push(on(td, "mousedown", function(e){
							event.stop(e);
							domClass.add(e.currentTarget, "Active");
						}));
												
						h.push(on(td, "mouseup", function(e){
							event.stop(e);
							domClass.remove(e.currentTarget, "Active");
						}));					
						
						h.push(on(td, "mouseover", function(e){
							event.stop(e);
							domClass.add(e.currentTarget, "Hover");
						}));
											
						h.push(on(td, "mouseout", function(e){
							event.stop(e);
							domClass.remove(e.currentTarget, "Hover");
						}));
					
					}
					
					this._columnHeaderHandlers.push(h);
					 
				}
			}else{ // deletion
				count = -count;
				for(var i=0; i < count; i++){
					td = tr.lastChild;
					tr.removeChild(td);
					domConstruct.destroy(td);
					var list = this._columnHeaderHandlers.pop();
					while(list.length>0){
						list.pop().remove();
					}
				}
			}
			
			// fill & configure		
			query("td", table).forEach(function(td, i){
				td.className = "";											
				if(i == 0){
					domClass.add(td, "first-child");
				}else if(i == this.renderData.columnCount-1){
					domClass.add(td, "last-child");
				}
				var d = renderData.dates[i];
				this._setText(td, this._formatColumnHeaderLabel(d));
				this.styleColumnHeaderCell(td, d, renderData);						
			}, this);
			
			if(this.yearColumnHeaderContent){
				var d = renderData.dates[0];
					this._setText(this.yearColumnHeaderContent, renderData.dateLocaleModule.format(d,
						{selector: "date", datePattern:"yyyy"}));
			}
		},
		
		_cleanupColumnHeader: function(){
			while(this._columnHeaderHandlers.length > 0){
				var list = this._columnHeaderHandlers.pop();
				while(list.length > 0){
					list.pop().remove();
				}
			}
		},
		
		styleColumnHeaderCell: function(node, date, renderData){
			// summary:
			//		Styles the CSS classes to the node that displays a column header cell.
			//		By default this method is setting the "dojoxCalendarToday" class name if the 
			//		date displayed is the current date or "dojoxCalendarWeekend" if the date represents a weekend.
			// node: Node
			//		The DOM node that displays the column in the grid.
			// date: Date
			//		The date displayed by this column
			// renderData: Object			
			//		The render data.
			// tags:
			//		protected

			if(this.isToday(date)){				
				return domClass.add(node, "dojoxCalendarToday");
			} else if(this.isWeekEnd(date)){
				return domClass.add(node, "dojoxCalendarWeekend");
			}	
		},
		
		_buildRowHeader: function(renderData, oldRenderData){

			// summary:
			//		Creates incrementally the HTML structure of the row header and configures its content.			
			//
			// renderData:
			//		The render data to display.
			//
			// oldRenderData:
			//		The previously render data displayed, if any.
			// tags:
			//		private

			
			var rowHeaderTable = this.rowHeaderTable;
			
			if (!rowHeaderTable){
				return;
			}
						
			domStyle.set(rowHeaderTable, "height", renderData.sheetHeight + "px");
			
			var tbodies = query("tbody", rowHeaderTable);			
			var tbody, tr, td;
			
			if (tbodies.length == 1){
				tbody = tbodies[0];
			}else{ 
				tbody = domConstruct.create("tbody", null, rowHeaderTable);
			}
									
			var count = renderData.hourCount - (oldRenderData ? oldRenderData.hourCount : 0);
		
			// Build HTML structure
			if(count>0){ // creation
				for(var i=0; i < count; i++){
					tr = domConstruct.create("tr", null, tbody);
					td = domConstruct.create("td", null, tr);						
				}					 
			}else{
				count = -count;
				// deletion of existing nodes
				for(var i=0; i < count; i++){
					tbody.removeChild(tbody.lastChild);
				}
			}		
								
			// fill labels
			var d = new Date(2000, 0, 1, 0, 0, 0);
			
			query("tr", rowHeaderTable).forEach(function(tr, i){
				var td = query("td", tr)[0];				
				td.className = "";				
				
				var size = renderData.hourSize;
				if (has("ie") == 7) {
					// ie7 workaournd: do not take border into account.
					size -= 2;					
				}

				domStyle.set(tr, "height", size + "px");
				
				d.setHours(this.renderData.minHours + (i));
				this.styleRowHeaderCell(td, d.getHours(), renderData);					
				this._setText(td, this._formatRowHeaderLabel(d));

			}, this);
						
		},		
		
		styleRowHeaderCell: function(node, h, renderData){
			// summary:
			//		Styles the CSS classes to the node that displays a row header cell.
			//		By default this method is doing nothing.
			// node: Node
			//		The DOM node that displays the column in the grid.
			// h: Integer
			//		The time of day displayed by this row header cell.
			// renderData: Object
			//		The render data.
			// tags:
			//		protected
		},
	
		_buildGrid: function (renderData, oldRenderData){
			// summary:
			//		Creates incrementally the HTML structure of the grid and configures its content.
			//
			// renderData:
			//		The render data to display.
			//
			// oldRenderData:
			//		The previously render data displayed, if any.	
			// tags:
			//		private

									
			var table = this.gridTable;
			
			if (!table){
				return;
			}
			
			domStyle.set(table, "height", renderData.sheetHeight + "px");											
			
			var nbRows = Math.floor(60 / renderData.slotDuration) * renderData.hourCount;
			
			var rowDiff = nbRows - 
				(oldRenderData ? Math.floor(60 / oldRenderData.slotDuration) * oldRenderData.hourCount : 0);
				
			var addRows = rowDiff > 0;
			
			var colDiff  = renderData.columnCount - (oldRenderData ? oldRenderData.columnCount : 0);
			
			if(has("ie") == 8){
				// workaround Internet Explorer 8 bug.
				// if on the table, width: 100% and table-layout: fixed are set
				// and columns are removed, width of remaining columns is not 
				// recomputed: must rebuild all. 
				if(this._gridTableSave == null){
					this._gridTableSave = lang.clone(table);
				}else if(colDiff < 0){										
					this.grid.removeChild(table);
					domConstruct.destroy(table);
					table = lang.clone(this._gridTableSave);
					this.gridTable = table;
					this.grid.appendChild(table);
					colDiff = renderData.columnCount;
					rowDiff = nbRows;
					addRows = true;
				}				
			}
			
			var tbodies = query("tbody", table);			
			var tbody;
			
			if (tbodies.length == 1){
				tbody = tbodies[0];
			}else{ 
				tbody = domConstruct.create("tbody", null, table);
			}
			
			// Build time slots (lines) HTML structure (incremental)
			if(addRows){ // creation
				for(var i=0; i<rowDiff; i++){
					domConstruct.create("tr", null, tbody);
				}		 
			}else{ // deletion		 
				rowDiff = -rowDiff;
				for(var i=0; i<rowDiff; i++){
					tbody.removeChild(tbody.lastChild);
				}
			}
			
			var rowIndex = Math.floor(60 / renderData.slotDuration) * renderData.hourCount - rowDiff;
			
			var addCols = addRows || colDiff >0; 
			colDiff = addCols ? colDiff : -colDiff;
			
			query("tr", table).forEach(function(tr, i){
				
				if(addCols){ // creation				
					var len = i >= rowIndex ? renderData.columnCount : colDiff;							
					for(var i=0; i<len; i++){
						domConstruct.create("td", null, tr);
					}
				}else{ // deletion								
					for(var i=0; i<colDiff; i++){
						tr.removeChild(tr.lastChild);
					}
				}
			});
			
			// Set the CSS classes
			
			query("tr", table).forEach(function (tr, i){
				
				domStyle.set(tr, "height", renderData.slotSize + "px");
				
				if(i == 0){
					domClass.add(tr, "first-child");
				}else if(i == nbRows-1){
					domClass.add(tr, "last-child");
				}
				
				// the minutes part of the time of day displayed by the current tr
				var m = (i * this.renderData.slotDuration) % 60;
				
				query("td", tr).forEach(function (td, col){
					
					td.className = "";
					
					if(col == 0){
						domClass.add(td, "first-child");
					}else if(col == this.renderData.columnCount-1){
						domClass.add(td, "last-child");
					}
					
					var d = renderData.dates[col];
					
					this.styleGridColumn(td, d, renderData);
					
					switch(m){
						case 0:
							domClass.add(td, "hour");
							break;
						case 30:
							domClass.add(td, "halfhour");
							break;
						case 15:
						case 45:
							domClass.add(td, "quarterhour");
							break;
					}
				}, this);				
			}, this); 
												 
		},
				
		styleGridColumn: function(node, date, renderData){
			// summary:
			//		Styles the CSS classes to the node that displays a column.
			//		By default this method is setting the "dojoxCalendarToday" class name if the 
			//		date displayed is the current date or "dojoxCalendarWeekend" if the date represents a weekend.
			// node: Node
			//		The DOM node that displays the column in the grid.
			// date: Date
			//		The date displayed by this column
			// renderData: Object
			//		The render data object.
			// tags:
			//		protected

			if(this.isToday(date)){				
				return domClass.add(node, "dojoxCalendarToday");
			} else if(this.isWeekEnd(date)){
				return domClass.add(node, "dojoxCalendarWeekend");
			}	
		},
							
		_buildItemContainer: function(renderData, oldRenderData){
			// summary:
			//		Creates the HTML structure of the item container and configures its content.
			// renderData:
			//		The render data to display.
			// oldRenderData:
			//		The previously render data displayed, if any.
			// tags:
			//		private

			var table = this.itemContainerTable;
			
			if (!table){
				return;
			}
			
			var bgCols = [];
	
			domStyle.set(table, "height", renderData.sheetHeight + "px");			
			
			var count = renderData.columnCount - (oldRenderData ? oldRenderData.columnCount : 0);
			
			if(has("ie") == 8){
				// workaround Internet Explorer 8 bug.
				// if on the table, width: 100% and table-layout: fixed are set
				// and columns are removed, width of remaining columns is not 
				// recomputed: must rebuild all. 
				if(this._itemTableSave == null){
					this._itemTableSave = lang.clone(table);
				}else if(count < 0){
					this.itemContainer.removeChild(table);
					this._recycleItemRenderers(true);
					domConstruct.destroy(table);
					table = lang.clone(this._itemTableSave);
					this.itemContainerTable = table;
					this.itemContainer.appendChild(table);
					count = renderData.columnCount;
				}
				
			} // else incremental dom add/remove for real browsers.
			
			var tbodies = query("tbody", table);
			var trs = query("tr", table);
			var tbody, tr, td;
			
			if (tbodies.length == 1){
				tbody = tbodies[0];
			}else{ 
				tbody = domConstruct.create("tbody", null, table);
			}
			
			if (trs.length == 1){
				tr = trs[0];
			}else{ 
				tr = domConstruct.create("tr", null, tbody);
			}					
								
			// Build HTML structure (incremental)
			if(count>0){ // creation
				for(var i=0; i < count; i++){
					td = domConstruct.create("td", null, tr);	
					domConstruct.create("div", {"className": "dojoxCalendarContainerColumn"}, td);
				}
			}else{ // deletion		 
				count = -count;
				for(var i=0; i < count; i++){
					tr.removeChild(tr.lastChild);
				}
			}	
			
			query("td>div", table).forEach(function(div, i){

				domStyle.set(div, {
					"height": renderData.sheetHeight + "px"
				});
				bgCols.push(div);		
			}, this);
			
			renderData.cells = bgCols;
		},			
		
		///////////////////////////////////////////////////////////////
		//
		// Layout
		//
		///////////////////////////////////////////////////////////////
		
		_overlapLayoutPass2: function(lanes){
			// summary:
			//		Second pass of the overlap layout (optional). Compute the extent of each layout item.
			// lanes:
			//		The array of lanes.
			// tags:
			//		private
			var i,j,lane, layoutItem;
			// last lane, no extent possible
			lane = lanes[lanes.length-1];
			
			for(j = 0; j < lane.length; j++){
				lane[j].extent = 1;
			}
						
			for(i=0; i<lanes.length-1; i++){
				lane = lanes[i];
				
				for(var j=0; j<lane.length; j++){	 
					layoutItem = lane[j];
					
					// if item was already overlapping another one there is no extent possible.
					if(layoutItem.extent == -1){
						layoutItem.extent = 1;
						var space = 0;
						
						var stop = false;
						
						for(var k = i + 1; k < lanes.length && !stop; k++){
							var ccol = lanes[k];
							for(var l = 0; l < ccol.length && !stop; l++){
								var layoutItem2 = ccol[l];
								
								if(layoutItem.start < layoutItem2.end && layoutItem2.start < layoutItem.end){
									stop = true;
								}
							}
							if(!stop){
								//no hit in the entire lane
								space++;
							}
						}
						layoutItem.extent += space;
					}
				}
			}
		},
		
		_defaultItemToRendererKindFunc: function(item){
			// tags:
			//		private
			return "vertical"; // String
		},
		
		_layoutInterval: function(/*Object*/renderData, /*Integer*/index, /*Date*/start, /*Date*/end, /*Object[]*/items){
			// tags:
			//		private

			var verticalItems = [];
			renderData.colW = this.itemContainer.offsetWidth / renderData.columnCount;
			
			for(var i=0; i<items.length; i++){
				var item = items[i];
				if(this._itemToRendererKind(item) == "vertical"){
					verticalItems.push(item);
				}
			}
			
			if(verticalItems.length > 0){
				this._layoutVerticalItems(renderData, index, start, end, verticalItems);
			}
		},

		_layoutVerticalItems: function(/*Object*/renderData, /*Integer*/index, /*Date*/startTime, /*Date*/endTime, /*Object[]*/items){
			// tags:
			//		private

			if(this.verticalRenderer == null){
				return;
			}
			
			var cell = renderData.cells[index];
			var layoutItems = [];			
			
			// step 1 compute projected position and size
			for(var i = 0; i < items.length; i++){
				
				var item = items[i];
				var overlap = this.computeRangeOverlap(renderData, item.startTime, item.endTime, startTime, endTime);
				
				var top = this.computeProjectionOnDate(renderData, startTime, overlap[0], renderData.sheetHeight);
				var bottom = this.computeProjectionOnDate(renderData, startTime, overlap[1], renderData.sheetHeight);
				
				if (bottom > top){
					var litem = lang.mixin({
						start: top,
						end: bottom,
						range: overlap,
						item: item
					}, item);
					layoutItems.push(litem);
				}
			}
			
			// step 2: compute overlapping layout
			var numLanes = this.computeOverlapping(layoutItems, this._overlapLayoutPass2).numLanes;

			var hOverlap = this.percentOverlap / 100;

			// step 3: create renderers and apply layout
			for(i=0; i<layoutItems.length; i++){

				item = layoutItems[i];					
				var lane = item.lane;
				var extent = item.extent;

				var w;
				var posX;				

				if(hOverlap == 0) {
					//no overlap and a padding between each event
					w = numLanes == 1 ? renderData.colW : ((renderData.colW - (numLanes - 1) * this.horizontalGap)/ numLanes);
					posX = lane * (w + this.horizontalGap);
					w = extent == 1 ? w : w * extent + (extent-1) * this.horizontalGap;
					w = 100 * w / renderData.colW;
					posX = 100 * posX / renderData.colW; 
				} else {
					// an overlap
					w = numLanes == 1 ? 100 : (100 / (numLanes - (numLanes - 1) * hOverlap));
					posX = lane * (w - hOverlap*w);
					w = extent == 1 ? w : w * ( extent - (extent-1) * hOverlap);
				}

				var ir = this._createRenderer(item, "vertical", this.verticalRenderer, "dojoxCalendarVertical");

				domStyle.set(ir.container, {
					"top": item.start + "px",
					"left": posX + "%",
					"width": w + "%",
					"height": (item.end-item.start+1) + "px"
				});

				var edited = this.isItemBeingEdited(item);
				var selected = this.isItemSelected(item);
				var hovered = this.isItemHovered(item);
				var focused = this.isItemFocused(item);

				var renderer = ir.renderer;

				renderer.set("hovered", hovered);
				renderer.set("selected", selected);
				renderer.set("edited", edited);
				renderer.set("focused", this.showFocus ? focused : false);
				renderer.set("moveEnabled", this.isItemMoveEnabled(item, "vertical"));
				renderer.set("resizeEnabled", this.isItemResizeEnabled(item, "vertical"));

				this.applyRendererZIndex(item, ir, hovered, selected, edited, focused);

				if(renderer.updateRendering){
					renderer.updateRendering(w, item.end-item.start+1);
				}

				domConstruct.place(ir.container, cell);
				domStyle.set(ir.container, "display", "block");
			}
		},
		
		_sortItemsFunction: function(a, b){
			// tags:
			//		private

			var res = this.dateModule.compare(a.startTime, b.startTime);
			if(res == 0){
				res = -1 * this.dateModule.compare(a.endTime, b.endTime);
			}
			return this.isLeftToRight() ? res : -res;
		},
		
		///////////////////////////////////////////////////////////////
		//
		// View to time projection
		//
		///////////////////////////////////////////////////////////////
		
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
			
			if (e != null){				
				var refPos = domGeometry.position(this.itemContainer, true);
				
				if(e.touches){									
					
					touchIndex = touchIndex==undefined ? 0 : touchIndex;
									
					x = e.touches[touchIndex].pageX - refPos.x;
					y = e.touches[touchIndex].pageY - refPos.y;									
					
				}else{
					
					x = e.pageX - refPos.x;					
					y = e.pageY - refPos.y;					
				}
			}
			
			var r = domGeometry.getContentBox(this.itemContainer);
			
			if(!this.isLeftToRight()){
				x = r.w - x;
			}
			
			if (x < 0){
				x = 0;
			}else if(x > r.w){
				x = r.w-1;
			}
			
			if (y < 0){
				y = 0;
			}else if(y > r.h){
				y = r.h-1;
			}
			
			var col = Math.floor(x / (domGeometry.getMarginBox(this.itemContainer).w / this.renderData.columnCount));
			var t = this.getTimeOfDay(y, this.renderData);
			
			var date = null;
			if(col < this.renderData.dates.length){			
				date = this.newDate(this.renderData.dates[col]); 
				date = this.floorToDay(date, true);
				date.setHours(t.hours);
				date.setMinutes(t.minutes);
			}
	
			return date;
		},
		
		///////////////////////////////////////////////////////////////
		//
		// Events
		//
		///////////////////////////////////////////////////////////////
		
		_onGridMouseUp: function(e){
			// tags:
			//		private

			this.inherited(arguments);
			
			if (this._gridMouseDown) {
				this._gridMouseDown = false;
				
				this._onGridClick({
					date: this.getTime(e),
					triggerEvent: e
				});
			}			
		},			
			
		_onGridTouchStart: function(e){
			// tags:
			//		private

			this.inherited(arguments);
			
			var g = this._gridProps;

			g.moved= false;
			g.start= e.touches[0].screenY;
			g.scrollTop= this._getScrollPosition();
		},
		
		_onGridTouchMove: function(e){
			// tags:
			//		private

			this.inherited(arguments);						
			
			if (e.touches.length > 1 && !this._isEditing){
				event.stop(e);				
				return;
			}			
			
			if(this._gridProps && !this._isEditing){
				
				var touch = {x: e.touches[0].screenX, y: e.touches[0].screenY};
				
				var p = this._edProps;
				
				if (!p || p && 
					(Math.abs(touch.x - p.start.x) > 25 || 
					 Math.abs(touch.y - p.start.y) > 25)) {
																		
					this._gridProps.moved = true;
					var d = e.touches[0].screenY - this._gridProps.start; 
					var value = this._gridProps.scrollTop - d;
					var max = this.itemContainer.offsetHeight - this.scrollContainer.offsetHeight;
					if (value < 0){
						this._gridProps.start = e.touches[0].screenY;
						this._setScrollImpl(0);
						this._gridProps.scrollTop = 0;
					}else if(value > max){
						this._gridProps.start = e.touches[0].screenY;
						this._setScrollImpl(max);
						this._gridProps.scrollTop = max;
					}else{
						this._setScrollImpl(value);
					}
				}
			}
		},
		
		_onGridTouchEnd: function(e){
			// tags:
			//		private

			//event.stop(e);
								
			this.inherited(arguments);
									
			var g = this._gridProps;					
			
			if(g){
				if(!this._isEditing){
					if(!g.moved){
						
						// touched on grid and on touch start editing was ongoing.
						if(!g.fromItem && !g.editingOnStart){								
							this.selectFromEvent(e, null, null, true);
						}			
						
						if(!g.fromItem){
						
							if(this._pendingDoubleTap && this._pendingDoubleTap.grid){
															
								this._onGridDoubleClick({
									date: this.getTime(this._gridProps.event),
									triggerEvent: this._gridProps.event
								});
								
								clearTimeout(this._pendingDoubleTap.timer);
						
								delete this._pendingDoubleTap;
								
							}else{
															
								this._onGridClick({
									date: this.getTime(this._gridProps.event),
									triggerEvent: this._gridProps.event
								});
								
								this._pendingDoubleTap = {
									grid: true,
									timer: setTimeout(lang.hitch(this, function(){
											delete this._pendingDoubleTap;
									}), this.doubleTapDelay)
								};
							}
						}	
					}
				}
				
				this._gridProps = null;
			}
		},
		
		_onColumnHeaderClick: function(e){
			// tags:
			//		private

			this._dispatchCalendarEvt(e, "onColumnHeaderClick");
		},
		
		
		
		onColumnHeaderClick: function(e){
			// summary:
			//		Event dispatched when a column header cell is dispatched.
			// e: __ColumnClickEventArgs
			//		The event has the following properties
			// tags:
			//		callback					
		},
		

		getTimeOfDay: function (pos, rd) {
			// summary:
			//		Return the time of day associated to the specified position.
			// pos: Integer
			//		The position in pixels.
			// rd: Object
			//		The render data.
			var minH = rd.minHours*60;
			var maxH = rd.maxHours*60;
			var minutes = minH + (pos * (maxH - minH) / rd.sheetHeight);
			var d = {
				hours: Math.floor(minutes / 60),
				minutes: Math.floor(minutes % 60)
			};
			return d;
		},
		
		///////////////////////////////////////////////////////////////
		//
		// View limits
		//
		///////////////////////////////////////////////////////////////
		
		_isItemInView: function(item){
			
			// subclassed to add some tests
									
			var res = this.inherited(arguments);
			
			if(res){
				
				// test if time range is overlapping [maxHours, next day min hours]
				var rd = this.renderData;
				
				var len = rd.dateModule.difference(item.startTime, item.endTime, "millisecond"); 
				var vLen = (24 - rd.maxHours + rd.minHours) * 3600000; // 60 * 60 * 1000, number of milliseconds in 1 minute
				
				if(len > vLen){ // longer events are always visible
					return true;
				}						
				
				var sMin = item.startTime.getHours()*60 + item.startTime.getMinutes();
				var eMin = item.endTime.getHours()*60 + item.endTime.getMinutes(); 
				var sV = rd.minHours * 60;
				var eV = rd.maxHours * 60;
				
				if(sMin > 0 && sMin < sV || sMin > eV && sMin <= 1440){
					return false;
				}
				
				if(eMin > 0 && eMin < sV || eMin > eV && eMin <= 1440){
					return false;
				}							
			}
			return res;
		},
				
		_ensureItemInView: function(item){
											
			var fixed;
			
			var startTime = item.startTime;
			var endTime = item.endTime;
									
			// test if time range is overlapping [maxHours, next day min hours]
			var rd = this.renderData;
			var cal = rd.dateModule;
			
			var len = Math.abs(cal.difference(item.startTime, item.endTime, "millisecond")); 
			var vLen = (24 - rd.maxHours + rd.minHours) * 3600000;
			
			if(len > vLen){ // longer events are always visible
				return false;
			}						
			
			var sMin = startTime.getHours()*60 + startTime.getMinutes();
			var eMin = endTime.getHours()*60 + endTime.getMinutes(); 
			var sV = rd.minHours * 60;
			var eV = rd.maxHours * 60;
			
			if(sMin > 0 && sMin < sV){
				this.floorToDay(item.startTime, true, rd);
				item.startTime.setHours(rd.minHours);
				item.endTime = cal.add(item.startTime, "millisecond", len);
				fixed = true;
			}else if(sMin > eV && sMin <= 1440){
				// go on next visible time
				this.floorToDay(item.startTime, true, rd);
				item.startTime = cal.add(item.startTime, "day", 1);
				// if we are going out of the view, the super() will fix it
				item.startTime.setHours(rd.minHours);
				item.endTime = cal.add(item.startTime, "millisecond", len);
				fixed = true;
			}
			
			if(eMin > 0 && eMin < sV){
				// go on previous day
				this.floorToDay(item.endTime, true, rd);
				item.endTime = cal.add(item.endTime, "day", -1);
				item.endTime.setHours(rd.maxHours);
				item.startTime = cal.add(item.endTime, "millisecond", -len);
				fixed = true;
			}else if(eMin > eV && eMin <= 1440){
				this.floorToDay(item.endTime, true, rd);
				item.endTime.setHours(rd.maxHours);
				item.startTime = cal.add(item.endTime, "millisecond", -len);
				fixed = true;
			}							
			
			fixed = fixed || this.inherited(arguments);
			
			return fixed;
		},
				
		_onScrollTimer_tick: function(){
			// tags:
			//		private

			this._scrollToPosition(this._getScrollPosition() + this._scrollProps.scrollStep);
		},
		
		////////////////////////////////////////////
		//
		// Editing
		//
		///////////////////////////////////////////						
		
		snapUnit: "minute",
		snapSteps: 15,
		minDurationUnit: "minute",
		minDurationSteps: 15,
		liveLayout: false,
		stayInView: true,
		allowStartEndSwap: true,
		allowResizeLessThan24H: true
		
	});
});
