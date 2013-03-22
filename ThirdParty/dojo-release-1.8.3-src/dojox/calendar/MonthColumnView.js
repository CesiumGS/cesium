define([
"./ViewBase", 
"dijit/_TemplatedMixin", 
"./_VerticalScrollBarBase", 
"dojo/text!./templates/MonthColumnView.html",
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
"dojo/i18n",
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
	i18n,
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
				
	return declare("dojox.calendar.MonthColumnView", [ViewBase, _TemplatedMixin], {

		// summary:
		//		The month column view is a calendar view used to display a month per column where each cell of the column is a day.

		baseClass: "dojoxCalendarMonthColumnView",
		
		templateString: template,
		
		// viewKind: String
		//		Type of the view. Used by the calendar widget to determine how to configure the view.
		//		This view kind is "columns".
		viewKind: "monthColumns",
		
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
		columnCount: 6,
		
		// daySize: Integer
		//		The desired size in pixels of an hour on the screen.
		//		Note that the effective size may be different as the time slot size must be an integer.
		daySize: 30,
		
		// showCellLabel: Boolean
		//		Whether display or not the grid cells label (usually the day of month).
		showCellLabel: true,
		
		// showHiddenItems: Boolean
		//		Whether show or not the hidden items.
		//		By default the events that are shorter than a day are not displayed using vertical renderers by this widget.
		//		But the grid cells that contains one or several hidden items display a decoration.
		showHiddenItems: true,
			
		// verticalRenderer: Class
		//		The class use to create vertical renderers.
		verticalRenderer: null,
		
		// percentOverlap: Integer
		//		The percentage of the renderer width used to superimpose one item renderer on another 
		//		when two events are overlapping.
		percentOverlap: 0,
				
		// horizontalGap: Integer
		//		The number of pixels between two item renderers.
		horizontalGap: 4,
		
		// columnHeaderFormatLength: String
		//		Length of the column labels. Valid values are "wide" or "abbr".
		columnHeaderFormatLength: null,
		
		// gridCellDatePattern: String
		//		The date pattern of the cell labels. By default a custom function is used to compute the label.
		gridCellDatePattern: null,
		
		// roundToDay: [private] Boolean
		roundToDay: true,
		
		// _layoutUnit: String
		//		Unit of layout: each column is displaying a month. 
		_layoutUnit: "month",
		
		_columnHeaderHandlers: null,
		
		constructor: function(){
			this.invalidatingProperties = ["columnCount", "startDate", "daySize", "percentOverlap", "verticalRenderer",
				"columnHeaderDatePattern", "horizontalGap", "scrollBarRTLPosition", "itemToRendererKindFunc", 
				"layoutPriorityFunction", "textDir", "items", "showCellLabel", "showHiddenItems"];
			this._columnHeaderHandlers = [];
		},
		
		postCreate: function(){
			this.inherited(arguments);
			this.keyboardUpDownUnit = "day";	
			this.keyboardUpDownSteps =  1;			
			this.keyboardLeftRightUnit = "month";			
			this.keyboardLeftRightSteps = 1;
			this.allDayKeyboardUpDownUnit = "day";			
			this.allDayKeyboardUpDownSteps = 1;	
			this.allDayKeyboardLeftRightUnit = "month";			
			this.allDayKeyboardLeftRightSteps = 1;
		},
		
		destroy: function(preserveDom){
			this._cleanupColumnHeader();
			if(this.scrollBar){
				this.scrollBar.destroy(preserveDom);
			}
			this.inherited(arguments);
		},
		
		_scrollBar_onScroll: function(value){
			// tags:
			//		private
			this.scrollContainer.scrollTop = value;
		},
		
		buildRendering: function(){
			// tags:
			//		private
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
			
			var rd = {};
						
			rd.daySize = this.get("daySize");				
			rd.scrollbarWidth = metrics.getScrollbar().w + 1;
					
			rd.dateLocaleModule = this.dateLocaleModule;
			rd.dateClassObj = this.dateClassObj;
			rd.dateModule = this.dateModule; // arithmetics on Dates
			
			rd.dates = [];
						
			rd.columnCount = this.get("columnCount");

			var d = this.get("startDate");
		
			if (d == null){
				d = new rd.dateClassObj();
			}

			d = this.floorToMonth(d, false, rd);
			
			this.startDate = d;
			var currentMonth = d.getMonth();
			var maxDayCount = 0;			
			
			for(var col = 0; col < rd.columnCount ; col++){
				
				var dates = [];
				rd.dates.push(dates);
				
				while(d.getMonth() == currentMonth){							
					dates.push(d);
					d = rd.dateModule.add(d, "day", 1);
					d = this.floorToDay(d, false, rd);					
				}
				
				currentMonth = d.getMonth();
				
				if(maxDayCount < dates.length){
					maxDayCount = dates.length;
				}						
			}
						
			rd.startTime = new rd.dateClassObj(rd.dates[0][0]);			
			rd.endTime = new rd.dateClassObj(dates[dates.length-1]);
			rd.endTime = rd.dateModule.add(rd.endTime, "day", 1);
						
			rd.maxDayCount = maxDayCount;
			rd.sheetHeight = rd.daySize * maxDayCount;
			
			if(this.displayedItemsInvalidated){
				this.displayedItemsInvalidated = false;
				this._computeVisibleItems(rd);
				
				if(this._isEditing){					
					this._endItemEditing(null, false);
				}
				
			}else if (this.renderData){
				rd.items = this.renderData.items;
			}
			
			return rd;
		},
		
		_validateProperties: function() {
			
			this.inherited(arguments);
						
			if (this.columnCount<1 || isNaN(this.columnCount)){
				this.columnCount = 1;				
			}
			
			if(this.daySize<5 || isNaN(this.daySize)){
				this.daySize = 5;
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
			e.sheet = "primary";
			e.source = this;
			return e;
		},
		
		//////////////////////////////////////////
		//
		// Formatting functions
		//
		//////////////////////////////////////////
		
		_formatColumnHeaderLabel: function(/*Date*/d){			
			// summary:
			//		Computes the column header label for the specified date.
			// d: Date
			//		The date to format
			// tags:
			//		protected
			
			var len = "wide";
			
			if(this.columnHeaderFormatLength){
				len = this.columnHeaderFormatLength
			}
			
			var months = this.renderData.dateLocaleModule.getNames("months", len, "standAlone");
			
			return months[d.getMonth()];
		},
		
		_formatGridCellLabel: function(d, row, col){
			// summary:
			//		Computes the column header label for the specified date.
			//		By default a formatter is used, optionally the <code>gridCellDatePattern</code> 
			//		property can be used to set a custom date pattern to the formatter.
			// d: Date
			//		The date to format.
			// row: Integer
			//		The row that displays the current date.
			// col: Integer
			//		The column that displays the current date.
			// tags:
			//		protected

			var format, rb;
			
			if(d == null){
				return "";
			}
			
			if(this.gridCellPattern){
				return this.renderData.dateLocaleModule.format(d, {
					selector: 'date',
					datePattern: this.gridCellDatePattern
				});
			}else{
				rb = i18n.getLocalization("dojo.cldr", this._calendar);
				format = rb["dateFormatItem-d"];
			
				var days = this.renderData.dateLocaleModule.getNames("days", "abbr", "standAlone");
					
				return days[d.getDay()].substring(0, 1) + " " + this.renderData.dateLocaleModule.format(d, {
					selector: 'date',
					datePattern: format
				});
			}
		},
		
		//////////////////////////////////////////
		//
		// Time of day management
		//
		//////////////////////////////////////////
		
		// scrollPosition: Integer
		//		The scroll position of the view. 
		scrollPosition: null,
				
		// scrollBarRTLPosition: String
		//		Position of the scroll bar in right-to-left display.
		//		Valid values are "left" and "right", default value is "left".
		scrollBarRTLPosition: "left",
					
		_setScrollPositionAttr: function(value){
			this._setScrollPosition(value.date, value.duration, value.easing);
		},
		
		_getScrollPositionAttr: function(){
			return {date: (this.scrollContainer.scrollTop / this.daySize) + 1};
		},
		
		_setScrollPosition: function(date, maxDuration, easing){
			// tags:
			//		private
			
			if(date < 1){
				date = 1
			}else if(date>31){
				date = 31;
			}
			
			var position = (date-1) * this.daySize;
			
			if(maxDuration) {
				
				if(this._scrollAnimation){
					this._scrollAnimation.stop();
				}
				
				var duration = Math.abs(((position - this.scrollContainer.scrollTop) * maxDuration) / this.renderData.sheetHeight);
				
				this._scrollAnimation = new fx.Animation({
					curve: [this.scrollContainer.scrollTop, position],
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
			// tags:
			//		private
			
			this.scrollContainer.scrollTop = v;
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
			
			margin = margin == undefined ? 1 : margin;
			
			if(this.scrollable && this.autoScroll){
							
				var s = start.getDate() - margin; // -1 because day of months starts at 1 and not 0
				if(this.isStartOfDay(end)){
					end = this._waDojoxAddIssue(end, "day", -1);
				}
				var e = end.getDate() + margin;
				
				var viewStart = this.get("scrollPosition").date;
				var r = domGeometry.getContentBox(this.scrollContainer);
				var viewEnd = (this.get("scrollPosition").date + (r.h/this.daySize)); 
				
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
					this._setScrollPosition(target, duration);
				}
			}
		},
		
		scrollView: function(dir){
			// summary:
			//		Scrolls the view to the specified direction of one time slot duration.
			// dir: Integer
			//		Direction of the scroll. Valid values are -1 and 1.
			//
			var pos = this.get("scrollPosition").date + dir;
			this._setScrollPosition(pos);
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
			this._buildGrid(renderData, oldRenderData);
			this._buildItemContainer(renderData, oldRenderData);
		},
		
		_configureScrollBar: function(renderData){
			if(has("ie") && this.scrollBar){
				domStyle.set(this.scrollBar.domNode, "width", (renderData.scrollbarWidth + 1) + "px");
			}
						
			var atRight = this.isLeftToRight() ? true : this.scrollBarRTLPosition == "right";
			var rPos = atRight ? "right" : "left";
			var lPos = atRight? "left" : "right";
			
			if(this.scrollBar){
				this.scrollBar.set("maximum", renderData.sheetHeight);			
				domStyle.set(this.scrollBar.domNode, rPos, 0);
				domStyle.set(this.scrollBar.domNode, lPos, "auto");
			}
			domStyle.set(this.scrollContainer, rPos, renderData.scrollbarWidth + "px");
			domStyle.set(this.scrollContainer, lPos, "0");
			domStyle.set(this.columnHeader, rPos, renderData.scrollbarWidth + "px");
			domStyle.set(this.columnHeader, lPos, "0");
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
				date: this.renderData.dates[index][0],
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
				var d = renderData.dates[i][0];
				this._setText(td, this._formatColumnHeaderLabel(d));
				this.styleColumnHeaderCell(td, d, renderData);						
			}, this);
						
		},
		
		_cleanupColumnHeader: function(){
			// tags:
			//		private

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
			//		By default this method is does nothing and is designed to be overridden.
			// node: Node
			//		The DOM node that displays the column in the grid.
			// date: Date
			//		The date displayed by this column
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
			
			if(!table){
				return;
			}
			
			domStyle.set(table, "height", renderData.sheetHeight + "px");				

			var rowDiff = renderData.maxDayCount - (oldRenderData ? oldRenderData.maxDayCount : 0);
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
					rowDiff = renderData.maxDayCount;
					addRows = true;
				}				
			}
			
			var tbodies = query("tbody", table);
			var tbody;

			if(tbodies.length == 1){
				tbody = tbodies[0];
			}else{ 
				tbody = domConstruct.create("tbody", null, table);
			}

			// Build rows HTML structure (incremental)
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

			var rowIndex = renderData.maxDayCount - rowDiff;
			
			var addCols = addRows || colDiff >0; 
			colDiff = addCols ? colDiff : -colDiff;
			
			query("tr", table).forEach(function(tr, i){
				
				if(addCols){ // creation
					var len = i >= rowIndex ? renderData.columnCount : colDiff;
					for(var i=0; i<len; i++){
						var td = domConstruct.create("td", null, tr);
						domConstruct.create("span", null, td);
					}
				}else{ // deletion
					for(var i=0; i<colDiff; i++){
						tr.removeChild(tr.lastChild);
					}
				}
			});

			// Set the CSS classes

			query("tr", table).forEach(function (tr, row){
				
				//domStyle.set(tr, "height", this._getRowHeight(row) + "px");
				
				tr.className = "";
				// compatibility layer for IE7 & 8 that does not support :first-child and :last-child pseudo selectors
				if(row == 0){
					domClass.add(tr, "first-child");
				}
				if(row == renderData.maxDayCount-1){
					domClass.add(tr, "last-child");
				}

				query("td", tr).forEach(function (td, col){
					
					td.className = "";
					
					if(col == 0){
						domClass.add(td, "first-child");
					}
					
					if(col == renderData.columnCount-1){
						domClass.add(td, "last-child");
					}
					
					var d = null;
					if(row < renderData.dates[col].length) {
						d = renderData.dates[col][row];
					}
					
					var span = query("span", td)[0];
					this._setText(span, this.showCellLabel ? this._formatGridCellLabel(d, row, col): null);
					
					this.styleGridCell(td, d, col, row, renderData);
					
				}, this);
			}, this); 

		},
		
		styleGridCell: function(node, date, col, row, renderData){
			// summary:
			//		Styles the CSS classes to the node that displays a column.
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

			var cal = renderData.dateModule;
			if(date == null){
				return;
			}
			if(this.isToday(date)){				
				domClass.add(node, "dojoxCalendarToday");
			}else if(this.isWeekEnd(date)){
				domClass.add(node, "dojoxCalendarWeekend");
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

			if(item.allDay){
				return "vertical";
			}
			var dur = Math.abs(this.renderData.dateModule.difference(item.startTime, item.endTime, "minute"));
			return dur >= 1440 ? "vertical" : null;
		},
		
		_layoutRenderers: function(renderData){
			this.hiddenEvents = {};
			this.inherited(arguments);
		},
		
		_layoutInterval: function(/*Object*/renderData, /*Integer*/index, /*Date*/start, /*Date*/end, /*Object[]*/items){
			// tags:
			//		private

			var verticalItems = [];
			var hiddenItems = [];
			renderData.colW = this.itemContainer.offsetWidth / renderData.columnCount;
			
			for(var i=0; i<items.length; i++){
				var item = items[i];
				if(this._itemToRendererKind(item) == "vertical"){
					verticalItems.push(item);
				}else if(this.showHiddenItems){	
					hiddenItems.push(item);					
				}
			}
			
			if(verticalItems.length > 0){
				this._layoutVerticalItems(renderData, index, start, end, verticalItems);
			}
			if(hiddenItems.length > 0){
				this._layoutBgItems(renderData, index, start, end, hiddenItems);
			}
		},
		
		_dateToYCoordinate: function(renderData, d, start){
			// tags:
			//		private

			var pos = 0;
			if(start){
				pos = (d.getDate()-1) * this.renderData.daySize;
			}else{
				var d2 = this._waDojoxAddIssue(d, "day", -1);
				pos = this.renderData.daySize + ((d2.getDate()-1) * this.renderData.daySize);
			}			 
			pos += (d.getHours()*60+d.getMinutes())*this.renderData.daySize/1440;
			
			return pos;
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
				
				var top = this._dateToYCoordinate(renderData, overlap[0], true);
				var bottom = this._dateToYCoordinate(renderData, overlap[1], false);
				
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
		
		_getCellAt: function(rowIndex, columnIndex, rtl){
			// tags:
			//		private

			if((rtl == undefined || rtl == true) && !this.isLeftToRight()){
				columnIndex = this.renderData.columnCount -1 - columnIndex;
			}
			return this.gridTable.childNodes[0].childNodes[rowIndex].childNodes[columnIndex];
		},
		
		invalidateLayout: function(){
			//make sure to clear hiddens object state
			query("td", this.gridTable).forEach(function(td){
				domClass.remove(td, "dojoxCalendarHiddenEvents");
			});
			this.inherited(arguments);			
		},
		
		_layoutBgItems: function(/*Object*/renderData, /*Integer*/col, /*Date*/startTime, /*Date*/endTime, /*Object[]*/items){
			// tags:
			//		private

			var bgItems = {};
			for(var i = 0; i < items.length; i++){
				
				var item = items[i];
				var overlap = this.computeRangeOverlap(renderData, item.startTime, item.endTime, startTime, endTime);
				var start = overlap[0].getDate()-1;
				// handle use case where end time is first day of next month.
				var end;
				if(this.isStartOfDay(overlap[1])){
					end = this._waDojoxAddIssue(overlap[1], "day", -1);
					end = end.getDate()-1;
				}else{
					end = overlap[1].getDate()-1;
				}
				
				for (var d=start; d<=end; d++){
					bgItems[d] = true;
				}
			}					
	
			for(var row in bgItems) {
				if(bgItems[row]){
					var node = this._getCellAt(row, col, false);
					domClass.add(node, "dojoxCalendarHiddenEvents");
				}
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
			
			var col = Math.floor(x / (r.w / this.renderData.columnCount));
			var row = Math.floor(y / (r.h / this.renderData.maxDayCount));
			
			var date = null;
			if(col < this.renderData.dates.length && 
				 row < this.renderData.dates[col].length){			
				date = this.newDate(this.renderData.dates[col][row]); 			
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
			g.scrollTop= this.scrollContainer.scrollTop;
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
			// tags:
			//		callback

		},
		

		///////////////////////////////////////////////////////////////
		//
		// View limits
		//
		///////////////////////////////////////////////////////////////
						
		_onScrollTimer_tick: function(){
			// tags:
			//		private

			this._setScrollImpl(this.scrollContainer.scrollTop + this._scrollProps.scrollStep);
		},
		
		////////////////////////////////////////////
		//
		// Editing
		//
		///////////////////////////////////////////						
		
		snapUnit: "day",
		snapSteps: 1,
		minDurationUnit: "day",
		minDurationSteps: 1,
		liveLayout: false,
		stayInView: true,
		allowStartEndSwap: true,
		allowResizeLessThan24H: false
		
	});
});
