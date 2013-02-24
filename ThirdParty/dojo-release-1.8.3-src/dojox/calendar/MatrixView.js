define([
"dojo/_base/declare", 
"dojo/_base/array", 
"dojo/_base/event", 
"dojo/_base/lang", 
"dojo/_base/sniff", 
"dojo/_base/fx", 
"dojo/_base/html",
"dojo/on", 
"dojo/dom", 
"dojo/dom-class", 
"dojo/dom-style",
"dojo/dom-geometry", 
"dojo/dom-construct", 
"dojo/query", 
"dojox/html/metrics", 
"dojo/i18n",
"./ViewBase", 
"dojo/text!./templates/MatrixView.html", 
"dijit/_TemplatedMixin"],
	
function(
	declare, 
	arr, 
	event, 
	lang, 
	has, 
	fx, 
	html,
	on, 
	dom, 
	domClass, 
	domStyle,
	domGeometry,
	domConstruct, 
	query, 
	metrics, 
	i18n,
	ViewBase, 
	template, 
	_TemplatedMixin){
	
	/*=====
	var __HeaderClickEventArgs = {
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
	
	/*=====
	var __ExpandRendererClickEventArgs = {
		// summary:
		//		A expand renderer click event.
		// columnIndex: Integer
		//		The column index of the cell. 
		// rowIndex: Integer
		//		The row index of the cell.
		// date: Date
		//		The date displayed by the cell.
		// triggerEvent: Event
		//		The origin event.
	};
	=====*/
	
	return declare("dojox.calendar.MatrixView", [ViewBase, _TemplatedMixin], {
		
		// summary:
		//		The matrix view is a calendar view that displaying a matrix where each cell is a day.

		templateString: template,
	
		baseClass: "dojoxCalendarMatrixView",
		
		_setTabIndexAttr: "domNode",
		
		// viewKind: String
		//		Type of the view. Used by the calendar widget to determine how to configure the view.
		//		This view kind is "matrix".
		viewKind: "matrix",

		// renderData: Object
		//		The render data object contains all the data needed to render the widget.
		renderData: null,
		
		// startDate: Date
		//		The start date of the time interval displayed.
		//		If not set at initialization time, will be set to current day.
		startDate: null,
		
		// refStartTime: Date?
		//		(Optional) Start of the time interval of interest. 
		//		It is used to style differently the displayed rows out of the 
		//		time interval of interest.  		
		refStartTime: null,
		
		// refStartTime: Date?
		//		(Optional) End of the time interval of interest. 
		//		It is used to style differently the displayed rows out of the 
		//		time interval of interest.  
		refEndTime: null,
				
		// columnCount: Integer
		//		The number of column to display (from the startDate).
		columnCount: 7,
		
		// rowCount: Integer
		//		The number of rows to display (from the startDate).
		rowCount: 5,
			
		// horizontalRenderer: Class
		//		The class use to create horizontal renderers.
		horizontalRenderer: null,
		
		// labelRenderer: Class
		//		The class use to create label renderers.
		labelRenderer: null,

		// expandRenderer: Class
		//		The class use to create drill down renderers.		
		expandRenderer: null,
		
		// percentOverlap: Integer
		//		The percentage of the renderer width used to superimpose one item renderers on another 
		//		when two events are overlapping. By default 0.
		percentOverlap: 0,
		
		// verticalGap: Integer
		//		The number of pixels between two item renderers that are overlapping each other if the percentOverlap property is 0.
		verticalGap: 2,
		
		// horizontalRendererHeight: Integer
		//		The height in pixels of the horizontal and label renderers that is applied by the layout.
		horizontalRendererHeight: 17,
		
		// horizontalRendererHeight: Integer
		//		The height in pixels of the horizontal and label renderers that is applied by the layout.
		labelRendererHeight: 14,
		
		// expandRendererHeight: Integer
		//		The height in pixels of the expand/collapse renderers that is applied by the layout.
		expandRendererHeight: 15,
		
		// cellPaddingTop: Integer
		//		The top offset in pixels of each cell applied by the layout.
		cellPaddingTop: 16,
		
		// expandDuration: Integer
		//		Duration of the animation when expanding or collapsing a row.
		expandDuration: 300,
		
		// expandEasing: Function
		//		Easing function of the animation when expanding or collapsing a row (null by default).
		expandEasing: null,
		
		// layoutDuringResize: Boolean
		//		Indicates if the item renderers' position and size is updated or if they are hidden during a resize of the widget. 
		layoutDuringResize: false,
		
		// roundToDay: Boolean
		//		For horizontal renderers that are not filling entire days, whether fill the day or not.
		roundToDay: true,
		
		// showCellLabel: Boolean
		//		Whether display or not the grid cells label (usually the day of month).
		showCellLabel: true,
		
		// scrollable: [private] Boolean
		scrollable: false,

		// resizeCursor: [private] Boolean
		resizeCursor: "e-resize",
		
		constructor: function(){
			this.invalidatingProperties = ["columnCount", "rowCount", "startDate", "horizontalRenderer", "labelRenderer", "expandRenderer",
			"rowHeaderDatePattern", "columnHeaderLabelLength", "cellHeaderShortPattern", "cellHeaderLongPattern", "percentOverlap", 
			"verticalGap", "horizontalRendererHeight", "labelRendererHeight", "expandRendererHeight", "cellPaddingTop", 
			"roundToDay", "itemToRendererKindFunc", "layoutPriorityFunction", "formatItemTimeFunc", "textDir", "items"];
			
			this._ddRendererList = [];
			this._ddRendererPool = [];
			this._rowHeaderHandles = [];
			
			// For Dojo 1.8
			//	this._viewHandles.push(
			//		ViewPort.on("resize", lang.hitch(this, this._resizeHandler)));
			
			// pre 1.8 compat code
			this._viewHandles.push(on(window, "resize", lang.hitch(this, this._resizeHandler)));
			
		},
		
		destroy: function(preserveDom){
			this._cleanupRowHeader();
			this.inherited(arguments);
		},
			
		postCreate: function(){
			this.inherited(arguments);
			this._initialized = true;
			if(!this.invalidRendering){
				this.refreshRendering();
			}			
		},
						
		_createRenderData: function(){
			
			var rd = {};
			
			rd.dateLocaleModule = this.dateLocaleModule;
			rd.dateClassObj = this.dateClassObj;
			rd.dateModule = this.dateModule; // arithmetics on Dates
			
			rd.dates = [];
			
			rd.columnCount = this.get("columnCount");
			rd.rowCount = this.get("rowCount");
			
			rd.sheetHeight = this.itemContainer.offsetHeight;
			
			this._computeRowsHeight(rd);
			
			var d = this.get("startDate");
		
			if(d == null){
				d = new rd.dateClassObj();				
			}

			d = this.floorToDay(d, false, rd);
			
			this.startDate = d;					
			
			for(var row = 0; row < rd.rowCount ; row++){
				rd.dates.push([]);
				for(var col = 0; col < rd.columnCount ; col++){
					rd.dates[row].push(d);
					d = rd.dateModule.add(d, "day", 1);
					d = this.floorToDay(d, false, rd);					
				}
			}

			rd.startTime = this.newDate(rd.dates[0][0], rd);
			rd.endTime = this.newDate(rd.dates[rd.rowCount-1][rd.columnCount-1], rd);
			rd.endTime = rd.dateModule.add(rd.endTime, "day", 1);
			rd.endTime = this.floorToDay(rd.endTime, true);
			
			if(this.displayedItemsInvalidated){
				this.displayedItemsInvalidated = false;
				this._computeVisibleItems(rd);
				
				if(this._isEditing){
					this._endItemEditing(null, false);
				}
				
			}else if(this.renderData){
				rd.items = this.renderData.items;
			}
			
			rd.rtl = !this.isLeftToRight();
			
			return rd;
		},
				
		_validateProperties: function(){
			
			this.inherited(arguments);
						
			if(this.columnCount<1 || isNaN(this.columnCount)){
				this.columnCount = 1;
			}
			
			if(this.rowCount<1 || isNaN(this.rowCount)){
				this.rowCount = 1;
			}
			
			if(isNaN(this.percentOverlap) || this.percentOverlap < 0 || this.percentOverlap > 100){
				this.percentOverlap = 0;
			}
			
			if(isNaN(this.verticalGap) || this.verticalGap < 0){
				this.verticalGap = 2;
			}
			
			if(isNaN(this.horizontalRendererHeight) || this.horizontalRendererHeight < 1){
				this.horizontalRendererHeight = 17;
			}
			
			if(isNaN(this.labelRendererHeight) || this.labelRendererHeight < 1){
				this.labelRendererHeight = 14;
			}
			
			if(isNaN(this.expandRendererHeight) || this.expandRendererHeight < 1){
				this.expandRendererHeight = 15;
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
		
		_setRowCountAttr: function(value){
			this.displayedItemsInvalidated = true;
			this._set("rowCount", value);
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

		_formatRowHeaderLabel: function(/*Date*/d){
			// summary:
			//		Computes the row header label for the specified time of day.
			//		By default the getWeekNumberLabel() function is called. 
			//		The rowHeaderDatePattern property can be used to set a 
			//		custom date pattern to the formatter.
			// d: Date
			//		The date to format	
			// tags:
			//		protected

			if(this.rowHeaderDatePattern){
				return this.renderData.dateLocaleModule.format(d, {
					selector: 'date',
					datePattern: this.rowHeaderDatePattern
				});
			}else{
				return this.getWeekNumberLabel(d);
			}

		},
	
		_formatColumnHeaderLabel: function(d){
			// summary:
			//		Computes the column header label for the specified date.
			//		By default a formatter is used, optionally the <code>columnHeaderLabelLength</code> 
			//		property can be used to specify the length of the string.
			// d: Date
			//		The date to format 
			// tags:
			//		protected

			return this.renderData.dateLocaleModule.getNames('days', this.columnHeaderLabelLength ? this.columnHeaderLabelLength : 'wide', 'standAlone')[d.getDay()];
		},
		
		_formatGridCellLabel: function(d, row, col){
			// summary:
			//		Computes the column header label for the specified date.
			//		By default a formatter is used, optionally the <code>cellHeaderLongPattern</code> and <code>cellHeaderShortPattern</code> 
			//		properties can be used to set a custom date pattern to the formatter.
			// d: Date
			//		The date to format.
			// row: Integer
			//		The row that displays the current date.
			// col: Integer
			//		The column that displays the current date.
			// tags:
			//		protected


			var isFirstDayOfMonth = row == 0 && col == 0 || d.getDate() == 1;
			var format, rb;
			if(isFirstDayOfMonth){
				if(this.cellHeaderLongPattern){
					format = this.cellHeaderLongPattern;
				}else{
					rb = i18n.getLocalization("dojo.cldr", this._calendar);
					format = rb["dateFormatItem-MMMd"];
				}
			}else{
				if(this.cellHeaderShortPattern){
					format = this.cellHeaderShortPattern;
				}else{
					rb = i18n.getLocalization("dojo.cldr", this._calendar);
					format = rb["dateFormatItem-d"];
				}
			}
			return this.renderData.dateLocaleModule.format(d, {
				selector: 'date',
				datePattern: format
			});
		},
		
		////////////////////////////////////////////
		//
		// HTML structure management
		//
		///////////////////////////////////////////
	
		refreshRendering: function(){
			this.inherited(arguments);
			
			if(!this.domNode){
				return;
			}
						
			this._validateProperties();

			var oldRd = this.renderData;
			this.renderData = this._createRenderData();

			this._createRendering(this.renderData, oldRd);
			
			this._layoutRenderers(this.renderData);						
		},
		
		_createRendering: function(renderData, oldRenderData){
			// summary:
			//		Creates the HTML structure (grid, place holders, headers, etc)
			// renderData: Object
			//		The new render data
			// oldRenderData: Object
			//		The previous render data
			// tags:
			//		private
			
			if(renderData.rowHeight <= 0){
				renderData.columnCount = 0;
				renderData.rowCount = 0;
				return;
			}
			
			this._buildColumnHeader(renderData, oldRenderData);
			this._buildRowHeader(renderData, oldRenderData);
			this._buildGrid(renderData, oldRenderData);
			this._buildItemContainer(renderData, oldRenderData);
			
			if(this.buttonContainer && this.owner != null && this.owner.currentView == this){
				domStyle.set(this.buttonContainer, {"right":0, "left":0});
			}
		},	
		
		_buildColumnHeader: function(/*Object*/ renderData, /*Object*/oldRenderData){
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
			
			if(!table){
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
			
			if(tbodies.length == 1){
				tbody = tbodies[0];
			}else{ 
				tbody = html.create("tbody", null, table);
			}
			
			if(trs.length == 1){
				tr = trs[0];
			}else{ 
				tr = domConstruct.create("tr", null, tbody);
			}			
						 
			// Build HTML structure (incremental)
			if(count > 0){ // creation				
				for(var i=0; i < count; i++){
					td = domConstruct.create("td", null, tr);
				}
			}else{ // deletion
				count = -count;
				for(var i=0; i < count; i++){
					tr.removeChild(tr.lastChild);
				}
			}
			
			// fill & configure		
			query("td", table).forEach(function(td, i){
				td.className = "";
				var d = renderData.dates[0][i];
				this._setText(td, this._formatColumnHeaderLabel(d));
				if(i == 0){
					domClass.add(td, "first-child");
				}else if(i == this.renderData.columnCount-1){
					domClass.add(td, "last-child");
				}
				this.styleColumnHeaderCell(td, d, renderData);
			}, this);
			
			if(this.yearColumnHeaderContent){
				var d = renderData.dates[0][0];
					this._setText(this.yearColumnHeaderContent, renderData.dateLocaleModule.format(d,
						{selector: "date", datePattern:"yyyy"}));
			}
		},
		
		styleColumnHeaderCell: function(node, date, renderData){
			// summary:
			//		Styles the CSS classes to the node that displays a column header cell.
			//		By default this method is setting the "dojoxCalendarWeekend" if the day of week represents a weekend.
			// node: Node
			//		The DOM node that displays the column in the grid.
			// date: Date
			//		The date displayed by this column
			// renderData: Object			
			//		The render data.
			// tags:
			//		protected

			if(this.isWeekEnd(date)){
				return domClass.add(node, "dojoxCalendarWeekend");
			}	
		},		
		
		_rowHeaderHandles: null,
		
		_cleanupRowHeader: function(){
			// tags:
			//		private

			while(this._rowHeaderHandles.length > 0){
				var list = this._rowHeaderHandles.pop();
				while(list.length>0){
					list.pop().remove();
				}
			}
		},

		
		_rowHeaderClick: function(e){
			// tags:
			//		private

			var index = query("td", this.rowHeaderTable).indexOf(e.currentTarget);
			this._onRowHeaderClick({
				index: index,
				date: this.renderData.dates[index][0],
				triggerEvent: e
			});
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
			
			if(!rowHeaderTable){
				return;
			}

			var tbodies = query("tbody", rowHeaderTable);			
			var tbody, tr, td;
			
			if(tbodies.length == 1){
				tbody = tbodies[0];
			}else{ 
				tbody = domConstruct.create("tbody", null, rowHeaderTable);
			}				
						
			var count = renderData.rowCount - (oldRenderData ? oldRenderData.rowCount : 0);
			
			// Build HTML structure
			if(count>0){ // creation
				for(var i=0; i < count; i++){
					tr = domConstruct.create("tr", null, tbody);
					td = domConstruct.create("td", null, tr);
					
					var h = [];
						
					h.push(on(td, "click", lang.hitch(this, this._rowHeaderClick)));
					
					if(!has("touch")){
						h.push(on(td, "mousedown", function(e){
							domClass.add(e.currentTarget, "Active");
						}));
						
						h.push(on(td, "mouseup", function(e){
							domClass.remove(e.currentTarget, "Active");
						}));
						
						h.push(on(td, "mouseover", function(e){
							domClass.add(e.currentTarget, "Hover");
						}));
						
						h.push(on(td, "mouseout", function(e){
							domClass.remove(e.currentTarget, "Hover");
						}));
					}
					this._rowHeaderHandles.push(h);
				}
			}else{
				count = -count;
				// deletion of existing nodes
				for(var i=0; i < count; i++){
					tbody.removeChild(tbody.lastChild);
					var list = this._rowHeaderHandles.pop();
					while(list.length>0){
						list.pop().remove();
					}
				}
			}

			// fill labels

			query("tr", rowHeaderTable).forEach(function(tr, i){

				domStyle.set(tr, "height", this._getRowHeight(i) + "px");
				
				var d = renderData.dates[i][0];
				
				var td = query("td", tr)[0];
				td.className = "";
				if(i == 0){
					domClass.add(td, "first-child");
				}	
				if(i == this.renderData.rowCount-1){
					domClass.add(td, "last-child");
				}
								
				this.styleRowHeaderCell(td, d, renderData);

				this._setText(td, this._formatRowHeaderLabel(d));
			}, this);

		},		
		
		styleRowHeaderCell: function(node, date, renderData){
			// summary:
			//		Styles the CSS classes to the node that displays a row header cell.
			//		By default this method is doing nothing.
			// node: Node
			//		The DOM node that displays the column in the grid.
			// date: Date
			//		The date in the week.
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

			var rowDiff = renderData.rowCount - (oldRenderData ? oldRenderData.rowCount : 0);
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
					rowDiff = renderData.rowCount;
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

			var rowIndex = renderData.rowCount - rowDiff;
			
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
				
				domStyle.set(tr, "height", this._getRowHeight(row) + "px");
				
				tr.className = "";
				// compatibility layer for IE7 & 8 that does not support :first-child and :last-child pseudo selectors
				if(row == 0){
					domClass.add(tr, "first-child");
				}
				if(row == renderData.rowCount-1){
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
					
					var d = renderData.dates[row][col];
					
					var span = query("span", td)[0];
					this._setText(span, this.showCellLabel ? this._formatGridCellLabel(d, row, col): null);
					
					this.styleGridCell(td, d, renderData);
				}, this);
			}, this); 

		},
		
		styleGridCell: function(node, date, renderData){
			// summary:
			//		Styles the CSS classes to the node that displays a column.
			//		By default this method is setting the following CSS classes:
			//		- "dojoxCalendarToday" class name if the date displayed is the current date, 
			//		- "dojoxCalendarWeekend" if the date represents a weekend or
			//		- "dojoxCalendarDayDisabled" if the date is out of the [refStartTime, refEndTime] interval.
			// node: Node
			//		The DOM node that displays the column in the grid.
			// date: Date
			//		The date displayed by this column
			// renderData: Object
			//		The render data.
			// tags:
			//		protected

			var cal = renderData.dateModule;
			if(this.isToday(date)){				
				domClass.add(node, "dojoxCalendarToday");
			}else if(this.refStartTime != null && this.refEndTime != null && 
								(cal.compare(date, this.refEndTime) >= 0 || 
				 				 cal.compare(cal.add(date, "day", 1), this.refStartTime) <= 0)){
				domClass.add(node, "dojoxCalendarDayDisabled");
			}else if(this.isWeekEnd(date)){
				domClass.add(node, "dojoxCalendarWeekend");
			}	
		},

		_buildItemContainer: function(renderData, oldRenderData){
			// summary:
			//		Creates the HTML structure of the item container and configures its content.
			//
			// renderData:
			//		The render data to display.
			//
			// oldRenderData:
			//		The previously render data displayed, if any.
			// tags:
			//		private
			
			var table = this.itemContainerTable;
			
			if(!table){
				return;
			}
			
			var rows = [];
	
			var count = renderData.rowCount - (oldRenderData ? oldRenderData.rowCount : 0);
			
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
					this._recycleExpandRenderers(true);
					domConstruct.destroy(table);
					table = lang.clone(this._itemTableSave);
					this.itemContainerTable = table;
					this.itemContainer.appendChild(table);
					count = renderData.columnCount;
				}
				
			} // else incremental dom add/remove for real browsers.
			
			var tbodies = query("tbody", table);
			var tbody, tr, td, div;
			
			if(tbodies.length == 1){
				tbody = tbodies[0];
			}else{ 
				tbody = domConstruct.create("tbody", null, table);
			}
			
			// Build HTML structure (incremental)
			if(count>0){ // creation
				for(var i=0; i < count; i++){
					tr = domConstruct.create("tr", null, tbody);
					domClass.add(tr, "dojoxCalendarItemContainerRow");
					td = domConstruct.create("td", null, tr);	
					div = domConstruct.create("div", null, td);
					domClass.add(div, "dojoxCalendarContainerRow");
				}
			}else{ // deletion		 
				count = -count;
				for(var i=0; i < count; i++){
					tbody.removeChild(tbody.lastChild);
				}
			}

			query(".dojoxCalendarItemContainerRow", table).forEach(function(tr, i){
				domStyle.set(tr, "height", this._getRowHeight(i) + "px");
				rows.push(tr.childNodes[0].childNodes[0]);
			}, this); 

			renderData.cells = rows;
		},

		_resizeHandler: function(e, apply){
			// summary:
			//		Refreshes and apply the row height according to the widget height.
			// e: Event
			//		The resize event (optional)
			// apply: Boolean
			//		Whether take into account the layoutDuringResize flag to relayout item while resizing or not.
			// tags:
			//		private

			var rd = this.renderData;
			
			if(rd == null){
				this.refreshRendering();
				return;
			}

			if(rd.sheetHeight != this.itemContainer.offsetHeight){
				// refresh values
				rd.sheetHeight = this.itemContainer.offsetHeight;
				var expRow = this.getExpandedRowIndex();
				if(expRow == -1){
					this._computeRowsHeight();
					this._resizeRows();
				}else{
					this.expandRow(rd.expandedRow, rd.expandedRowCol, 0, null, true);
				}
			}
			
			if(this.layoutDuringResize || apply){
				// Use a time for FF (at least). In FF the cell size and position info are not ready yet. 
				setTimeout(lang.hitch(this, function(){
					this._layoutRenderers(this.renderData);
				  }), 20);
								
			}else{
				domStyle.set(this.itemContainer, "opacity", 0);
				this._recycleItemRenderers();
				this._recycleExpandRenderers();
				if(this._resizeTimer != undefined){
					clearTimeout(this._resizeTimer);
				}
				this._resizeTimer = setTimeout(lang.hitch(this, function(){
					delete this._resizeTimer;
					this._resizeRowsImpl(this.itemContainer, "tr");
					this._layoutRenderers(this.renderData);
					if(this.resizeAnimationDuration == 0){
						domStyle.set(this.itemContainer, "opacity", 1);
					}else{
						fx.fadeIn({node:this.itemContainer, curve:[0, 1]}).play(this.resizeAnimationDuration);
					}					
				}), 200);
			}

		},
		
		// resizeAnimationDuration: Integer
		//		Duration, in milliseconds, of the fade animation showing the item renderers after a widget resize.
		resizeAnimationDuration: 0,
		
		/////////////////////////////////////////////
		//
		// Row height management
		//
		//////////////////////////////////////////////
		
		getExpandedRowIndex: function(){
			// summary:
			//		Returns the index of the expanded row or -1 if there's no row expanded.
			return this.renderData.expandedRow == null ? -1 : this.renderData.expandedRow;
		},
		
		collapseRow: function(duration, easing, apply){
			// summary:
			//		Collapses the expanded row, if any.
			// duration: Integer
			//		Duration in milliseconds of the optional animation.
			// easing: Function
			//		Easing function of the optional animation.
			
			var rd = this.renderData;
			
			if(apply == undefined){
				apply = true;
			}
			if(duration == undefined){
				duration = this.expandDuration;
			}
			
			if(rd && rd.expandedRow != null && rd.expandedRow != -1){
				if(apply && duration){
					var index = rd.expandedRow;
					var oldSize = rd.expandedRowHeight;
					delete rd.expandedRow;
					this._computeRowsHeight(rd);
					var size = this._getRowHeight(index);
					rd.expandedRow = index;
					
					this._recycleExpandRenderers();
					this._recycleItemRenderers();
					domStyle.set(this.itemContainer, "display", "none");
					
					this._expandAnimation = new fx.Animation({
						curve: [oldSize, size],
						duration: duration,
						easing: easing,
						onAnimate: lang.hitch(this, function(size) {
							this._expandRowImpl(Math.floor(size));
						}),
						onEnd: lang.hitch(this, function(size) {
							this._expandAnimation = null;
							this._collapseRowImpl(false);
							this._resizeRows();
							domStyle.set(this.itemContainer, "display", "block");
							setTimeout(lang.hitch(this, function(){								
								this._layoutRenderers(rd);								
							}), 100);
							this.onExpandAnimationEnd(false);
						}) 
					});
									
					this._expandAnimation.play();
				}else{
					this._collapseRowImpl(apply);
				}				
			}
		},
		
		_collapseRowImpl: function(apply){
			// tags:
			//		private

			var rd = this.renderData;
			delete rd.expandedRow;
			delete rd.expandedRowHeight;
			this._computeRowsHeight(rd);
			if(apply == undefined || apply){
				this._resizeRows();
				this._layoutRenderers(rd);
			}
		},
		
		expandRow: function(rowIndex, colIndex, duration, easing, apply){
			// summary:
			//		Expands the specified row.
			// rowIndex: Integer
			//		The index of the row to expand.
			// colIndex: Integer?
			//		The column index of the expand renderer that triggers the action, optional. 
			// duration: Integer?
			//		Duration in milliseconds of the optional animation.
			// easing: Function?
			//		Easing function of the optional animation.
			
			var rd = this.renderData;
			if(!rd || rowIndex < 0 || rowIndex >= rd.rowCount){
				return -1;
			}
			if(colIndex == undefined || colIndex < 0 || colIndex >= rd.columnCount){
				colIndex = -1; // ignore invalid values
			}
			if(apply == undefined){
				apply = true;
			}
			if(duration == undefined){
				duration = this.expandDuration;
			}
			if(easing == undefined){
				easing = this.expandEasing;
			}
			
			var oldSize = this._getRowHeight(rowIndex);
			var size = rd.sheetHeight - Math.ceil(this.cellPaddingTop * (rd.rowCount-1));

			rd.expandedRow = rowIndex;
			rd.expandedRowCol = colIndex;
			rd.expandedRowHeight = size;

			if(apply){
				if(duration){
					//debugger;
					this._recycleExpandRenderers();
					this._recycleItemRenderers();
					domStyle.set(this.itemContainer, "display", "none");
					
					this._expandAnimation = new fx.Animation({
						curve: [oldSize, size],
						duration: duration,
						delay:50,
						easing: easing,
						onAnimate: lang.hitch(this, function(size) {
							this._expandRowImpl(Math.floor(size));
						}),
						onEnd: lang.hitch(this, function(){
							this._expandAnimation = null;
							domStyle.set(this.itemContainer, "display", "block");
							setTimeout(lang.hitch(this, function(){
								this._expandRowImpl(size, true);
							}), 100);
							this.onExpandAnimationEnd(true);
						})
					});
					this._expandAnimation.play();
				}else{
					this._expandRowImpl(size)
				}
			}			
		},
		
		_expandRowImpl: function(size, layout){
			// tags:
			//		private

			var rd = this.renderData;
			rd.expandedRowHeight = size;
			this._computeRowsHeight(rd, rd.sheetHeight-size);
			this._resizeRows();
			if(layout){
				this._layoutRenderers(rd);
			}
		},
		
		onExpandAnimationEnd: function(expand){
			// summary:
			//		Event dispatched at the end of an expand or collapse animation.
			// expand: Boolean
			//		Whether the finished animation was an expand or a collapse animation.
			// tags:
			//		callback

		},
		
		_resizeRows: function(){
			// summary:
			//		Refreshes the height of the underlying HTML objects.
			// tags:
			//		private
			
			if(this._getRowHeight(0) <= 0){
				return;
			}
			
			if(this.rowHeaderTable){
				this._resizeRowsImpl(this.rowHeaderTable, "tr");
			}
			if(this.gridTable){
				this._resizeRowsImpl(this.gridTable, "tr");
			}
			if(this.itemContainerTable){
				this._resizeRowsImpl(this.itemContainerTable, "tr");
			}
		},
		
		_computeRowsHeight:function(renderData, max){
			// summary:
			//		1. Determine if it's better to add or remove pixels
			//		2. distribute added/removed pixels on first and last rows.
			//		if rows are not too small, it is not noticeable.
			// tags:
			//		private

			var rd = renderData == null ? this.renderData : renderData;
			
			max = max || rd.sheetHeight;
			
			max--;
			
			if(has("ie") == 7){
				max -= rd.rowCount;
			}
			
			if(rd.rowCount == 1){
				rd.rowHeight = max;
				rd.rowHeightFirst = max;
				rd.rowHeightLast = max;
				return;
			}
								
			var count = rd.expandedRow == null ? rd.rowCount : rd.rowCount-1;
			var rhx = max / count;
			var rhf, rhl, rh;
			
			var diffMin = max - (Math.floor(rhx) * count);
			var diffMax = Math.abs(max - (Math.ceil(rhx) * count));
			var diff;
			
			var sign = 1;
			if(diffMin < diffMax){
				rh = Math.floor(rhx);
				diff = diffMin;
			}else{
				sign = -1;
				rh = Math.ceil(rhx);
				diff = diffMax;
			}
			rhf = rh + sign * Math.floor(diff/2);
			rhl = rhf + sign * (diff%2);

			rd.rowHeight = rh;
			rd.rowHeightFirst = rhf;
			rd.rowHeightLast = rhl;
		},

		_getRowHeight: function(index){
			// tags:
			//		private

			var rd = this.renderData;
			if(index == rd.expandedRow){
				return rd.expandedRowHeight;
			} else if(rd.expandedRow == 0 && index == 1 || index == 0){
				return rd.rowHeightFirst;
			} else if(rd.expandedRow == this.renderData.rowCount-1 && 
								index == this.renderData.rowCount-2 || 
								index == this.renderData.rowCount-1){
				return rd.rowHeightLast;
			}else{
				return rd.rowHeight;
			}
		},

		_resizeRowsImpl: function(tableNode, query){
			// tags:
			//		private
			var rd = this.renderData;
			dojo.query(query, tableNode).forEach(function(tr, i){
				domStyle.set(tr, "height", this._getRowHeight(i)+"px");
			}, this);
		},

		////////////////////////////////////////////
		//
		// Item renderers
		//
		///////////////////////////////////////////
				
		_setHorizontalRendererAttr: function(value){
			this._destroyRenderersByKind("horizontal");
			this._set("horizontalRenderer", value);			
		},
		
		_setLabelRendererAttr: function(value){
			this._destroyRenderersByKind("label");			
			this._set("labelRenderer", value);
		},
		
		_destroyExpandRenderer: function(renderer){
			// summary: 
			//		Destroys the expand renderer.
			// renderer: dojox/calendar/_RendererMixin
			//		The item renderer to destroy.
			// tags:
			//		protected
			
			arr.forEach(renderer.__handles, function(handle){
				handle.remove();
			});				
			
			if(renderer["destroy"]){
				renderer.destroy();
			}
			
			html.destroy(renderer.domNode);	
		},
		
		_setExpandRendererAttr: function(value){
			while(this._ddRendererList.length>0){
				this._destroyExpandRenderer(this._ddRendererList.pop());
			}			
						
			var pool = this._ddRendererPool;
			if(pool){
				while(pool.length > 0){
					this._destroyExpandRenderer(pool.pop());
				}
			}							
			this._set("expandRenderer", value);
		},				
		
		_ddRendererList: null,
		_ddRendererPool: null,

		_getExpandRenderer: function(date, items, rowIndex, colIndex, expanded){
			// tags:
			//		private
			
			if(this.expandRenderer == null){
				return null;
			}
			
			var ir = this._ddRendererPool.pop();
			if(ir == null){
				ir = new this.expandRenderer();
			}
			
			this._ddRendererList.push(ir);
			
			ir.set("owner", this);
			ir.set("date", date);
			ir.set("items", items);
			ir.set("rowIndex", rowIndex);
			ir.set("columnIndex", colIndex);
			ir.set("expanded", expanded);
			return ir;
		},
		
		_recycleExpandRenderers: function(remove){
			// tags:
			//		private
			
			for(var i=0; i<this._ddRendererList.length; i++){
				var ir = this._ddRendererList[i];
				ir.set("Up", false);
				ir.set("Down", false);
				if(remove){
					ir.domNode.parentNode.removeChild(ir.domNode);
				}
				domStyle.set(ir.domNode, "display", "none");
			}
			this._ddRendererPool = this._ddRendererPool.concat(this._ddRendererList);
			this._ddRendererList = [];
		},

		_defaultItemToRendererKindFunc:function(item){
			// tags:
			//		private
			var dur = Math.abs(this.renderData.dateModule.difference(item.startTime, item.endTime, "minute"));
			return dur >= 1440 ? "horizontal" : "label";
		}, 
		
		////////////////////////////////////////////
		//
		// Layout
		//
		///////////////////////////////////////////
		
		// naturalRowHeight: Integer[]
		//		After an item layout has been done, contains for each row the natural height of the row. 
		//		Ie. the height, in pixels, needed to display all the item renderers. 
		naturalRowsHeight: null,
		
		_roundItemToDay: function(item){
			// tags:
			//		private
			
			var s = item.startTime, e = item.endTime;
			
			if(!this.isStartOfDay(s)){
				s = this.floorToDay(s, false, this.renderData);
			}
			if(!this.isStartOfDay(e)){
				e = this.renderData.dateModule.add(e, "day", 1);
				e = this.floorToDay(e, true);
			}
			return {startTime:s, endTime:e};
		},
		
		_sortItemsFunction: function(a, b){
			// tags:
			//		private
			
			if(this.roundToDay){
				a = this._roundItemToDay(a);
				b = this._roundItemToDay(b);
			}
			var res = this.dateModule.compare(a.startTime, b.startTime);
			if(res == 0){
				res = -1 * this.dateModule.compare(a.endTime, b.endTime);
			}
			return res;
		},
		
		_overlapLayoutPass3: function(lanes){
			// summary:
			//		Third pass of the overlap layout (optional). Compute the number of lanes used by sub interval.
			// lanes: Object[]
			//		The array of lanes.
			// tags:
			//		private

			var pos=0, posEnd=0;
			var res = [];
			
			var refPos = domGeometry.position(this.gridTable).x;
			
			for(var col=0; col<this.renderData.columnCount; col++){
				
				var stop = false;
				var colPos = domGeometry.position(this._getCellAt(0, col));
				pos = colPos.x - refPos;
				posEnd = pos + colPos.w;
				
				for(var lane=lanes.length-1; lane>=0 && !stop; lane--){
					for (var i=0; i<lanes[lane].length; i++){
						var item = lanes[lane][i];
						stop = item.start < posEnd && pos < item.end;
						if(stop){
							res[col] = lane + 1;
							break;
						}
					}
				}
				
				if(!stop){
					res[col] = 0;
				}
			}
			
			return res;
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
			//		private
						
			domStyle.set(renderer.container, {"zIndex": edited || selected ? renderer.renderer.mobile ? 100 : 0: item.lane == undefined ? 1 : item.lane+1});
		},

		_layoutRenderers: function(renderData){
			// tags:
			//		private
			if(renderData == null || renderData.items == null || renderData.rowHeight <= 0){
				return;
			}					
			
			if(!this.gridTable || this._expandAnimation != null || 
				(this.horizontalRenderer == null && this.labelRenderer == null)){
				this._recycleItemRenderers();
				return;
			}
			
			this.renderData.gridTablePosX = domGeometry.position(this.gridTable).x;		
			this._layoutStep = renderData.columnCount;
			this._recycleExpandRenderers();
			this._hiddenItems = [];
			this._offsets = [];
			this.naturalRowsHeight = [];
			
			this.inherited(arguments);
		},

		_offsets: null,

		_layoutInterval: function(/*Object*/renderData, /*Integer*/index, /*Date*/start, /*Date*/end, /*Object[]*/items){
			// tags:
			//		private
			
			if(this.renderData.cells == null){
				return;
			}
			var horizontalItems = [];
			var labelItems = [];

			for(var i=0; i<items.length; i++){
				var item = items[i];
				var kind = this._itemToRendererKind(item);
				if(kind == "horizontal"){
					horizontalItems.push(item);
				}else if(kind == "label"){
					labelItems.push(item);
				}
			}
			
			var expIndex = this.getExpandedRowIndex();
			
			if(expIndex != -1 && expIndex != index){
				return; // when row is expanded, layout only expanded row
			}
			
			var offsets;
			
			var hiddenItems = [];
			
			var hItems;
			var hOffsets = [];
			if(horizontalItems.length > 0 && this.horizontalRenderer){
				var hItems = this._createHorizontalLayoutItems(index, start, end, horizontalItems);
				var hOverlapLayout = this._computeHorizontalOverlapLayout(hItems, hOffsets);
			}
			
			var lItems;
			var lOffsets = [];
			if(labelItems.length > 0 && this.labelRenderer){
				lItems = this._createLabelLayoutItems(index, start, end, labelItems);
				this._computeLabelOffsets(lItems, lOffsets);
			}
			
			var hasHiddenItems = this._computeColHasHiddenItems(index, hOffsets, lOffsets);
			
			if(hItems != null){
				this._layoutHorizontalItemsImpl(index, hItems, hOverlapLayout, hasHiddenItems, hiddenItems);
			}
			
			if(lItems != null){
				this._layoutLabelItemsImpl(index, lItems, hasHiddenItems, hiddenItems, hOffsets);
			}
			
			this._layoutExpandRenderers(index, hasHiddenItems, hiddenItems);
			
			this._hiddenItems[index] = hiddenItems;
		},

		_createHorizontalLayoutItems: function(/*Integer*/index, /*Date*/startTime, /*Date*/endTime, /*Object[]*/items){
			// tags:
			//		private
			
			if(this.horizontalRenderer == null){
				return;
			}

			var rd = this.renderData;
			var cal = rd.dateModule;
			var cell = rd.cells[index];
			var irHeight = this.horizontalRendererHeight;
			var vOverlap = this.percentOverlap / 100;
			var maxW = domGeometry.getMarginBox(this.itemContainer).w;
			var sign = rd.rtl ? -1 : 1;
			var layoutItems = [];

			// step 1: compute projected position and size
			for(var i = 0; i < items.length; i++){
				
				var item = items[i];
				var overlap = this.computeRangeOverlap(rd, item.startTime, item.endTime, startTime, endTime);
				
				var startOffset = cal.difference(startTime, this.floorToDay(overlap[0], false, rd), "day");
				var dayStart = rd.dates[index][startOffset];
				
				var celPos = domGeometry.position(this._getCellAt(index, startOffset, false));
				var start = celPos.x - rd.gridTablePosX;
				if(rd.rtl){
					start += celPos.w;
				}
				
				if(!this.roundToDay && !item.allDay){
					start += sign * this.computeProjectionOnDate(rd, dayStart, overlap[0], celPos.w);
				}
				
				start = Math.ceil(start);
				
				var endOffset = cal.difference(startTime, this.floorToDay(overlap[1], false, rd), "day");
				
				var end;
				if(endOffset > rd.columnCount-1){
					celPos = domGeometry.position(this._getCellAt(index, rd.columnCount-1, false));
					if(rd.rtl){
						end = celPos.x - rd.gridTablePosX;						
					}else{
						end = celPos.x - rd.gridTablePosX + celPos.w;
					}				
				}else{ 
					dayStart = rd.dates[index][endOffset];
					celPos = domGeometry.position(this._getCellAt(index, endOffset, false));
					end = celPos.x - rd.gridTablePosX;
					
					if(rd.rtl){
						end += celPos.w;
					}
					
					if(this.roundToDay){
						if(!this.isStartOfDay(overlap[1])){
							end += sign * celPos.w;
						}
					}else{
						end += sign * this.computeProjectionOnDate(rd, dayStart, overlap[1], celPos.w);
					}
				}
				
				end = Math.floor(end);
				
				if(rd.rtl){
					var t = end;
					end = start;
					start = t; 
				}
				
				if(end > start){ // invalid items are not displayed
					var litem = lang.mixin({
						start: start,
						end: end,
						range: overlap,
						item: item,
						startOffset: startOffset,
						endOffset: endOffset
					}, item);
					layoutItems.push(litem);
				}
			}
			return layoutItems;
		},
		
		_computeHorizontalOverlapLayout: function(layoutItems, offsets){
			// tags:
			//		private
			
			var rd = this.renderData;
			var irHeight = this.horizontalRendererHeight;
			var overlapLayoutRes = this.computeOverlapping(layoutItems, this._overlapLayoutPass3);
			var vOverlap = this.percentOverlap / 100;
		
			for(i=0; i<rd.columnCount; i++){
				var numLanes = overlapLayoutRes.addedPassRes[i];
				var index = rd.rtl ? rd.columnCount - i - 1 : i;				
				if(vOverlap == 0){
					offsets[index] = numLanes == 0 ? 0 : numLanes == 1 ? irHeight : irHeight + (numLanes-1) * (irHeight + this.verticalGap);
				}else{
					offsets[index] = numLanes == 0 ? 0 : numLanes * irHeight - (numLanes-1) * (vOverlap * irHeight) + this.verticalGap;
				}
				offsets[index] += this.cellPaddingTop;
			}
			return overlapLayoutRes;
		},
		
		_createLabelLayoutItems: function(/*Integer*/index, /*Date*/startTime, /*Date*/endTime, /*Object[]*/items){
			// tags:
			//		private
			
			if(this.labelRenderer == null){
				return;
			}
			
			var d;
			var rd = this.renderData;
			var cal = rd.dateModule;
			
			var layoutItems = [];
			
			for(var i = 0; i < items.length; i++){
				var item = items[i];
				
				d = this.floorToDay(item.startTime, false, rd);
								
				var comp = this.dateModule.compare;
				
				// iterate on columns overlapped by this item to create one item per column
				//while(d < item.endTime && d < rd.endTime){
				while(comp(d, item.endTime) == -1 && comp(d, endTime) == -1){
					
					var dayEnd = cal.add(d, "day", 1);
					dayEnd = this.floorToDay(dayEnd, true);
					
					var overlap = this.computeRangeOverlap(rd, item.startTime, item.endTime, d, dayEnd);
					var startOffset = cal.difference(startTime, this.floorToDay(overlap[0], false, rd), "day");
										
					if(startOffset >= this.columnCount){
						// If the offset is greater than the column count
						// the item will be processed in another row.
						break;
					}
					
					if(startOffset >= 0){					
						var list = layoutItems[startOffset];
						if(list == null){
							list = [];
							layoutItems[startOffset] = list;
						}
						
						list.push(lang.mixin(
							{	startOffset: startOffset,
								range: overlap,
								item: item
							}, item));
					}
					
					d = cal.add(d, "day", 1);
					this.floorToDay(d, true);
				}
			}
			return layoutItems;
		},

		_computeLabelOffsets: function(layoutItems, offsets){
			// tags:
			//		private
			
			for(var i=0; i<this.renderData.columnCount; i++){
				offsets[i] = layoutItems[i] == null ? 0 : layoutItems[i].length * (this.labelRendererHeight + this.verticalGap);
			}
		},			

		_computeColHasHiddenItems: function(index, hOffsets, lOffsets){
			// tags:
			//		private
			
			var res = [];
			var cellH = this._getRowHeight(index);
			var h;
			var maxH = 0;
			for(var i=0; i<this.renderData.columnCount; i++){
				h = hOffsets == null || hOffsets[i] == null ? this.cellPaddingTop : hOffsets[i];
				h += lOffsets == null || lOffsets[i] == null ? 0 : lOffsets[i];
				if(h > maxH){
					maxH = h;
				}
				res[i] = h > cellH;
			}
			
			this.naturalRowsHeight[index] = maxH;
			return res;
		},

		_layoutHorizontalItemsImpl: function(index, layoutItems, hOverlapLayout, hasHiddenItems, hiddenItems){
			
			// tags:
			//		private
			
			var rd = this.renderData;
			var cal = rd.dateModule;
			var cell = rd.cells[index];
			var cellH = this._getRowHeight(index);
			var irHeight = this.horizontalRendererHeight;
			var vOverlap = this.percentOverlap / 100;

			for(var i=0; i<layoutItems.length; i++){

				var item = layoutItems[i];
				var lane = item.lane;

				var posY = this.cellPaddingTop;

				if(vOverlap == 0) {
					//no overlap and a padding between each event
					posY += lane * (irHeight + this.verticalGap);
				} else {
					// an overlap	
					posY += lane * (irHeight - vOverlap * irHeight);
				}
				
				var exp = false;
				var maxH = cellH;
				if(this.expandRenderer){				
					for(var off=item.startOffset; off<=item.endOffset; off++){
						if(hasHiddenItems[off]){
							exp = true;
							break;
						}
					}
					maxH = exp ? cellH - this.expandRendererHeight : cellH;
				}
				
				if(posY + irHeight <= maxH){

					var ir = this._createRenderer(item, "horizontal", this.horizontalRenderer, "dojoxCalendarHorizontal");
	
					var fullHeight = this.isItemBeingEdited(item) && !this.liveLayout && this._isEditing;
					var h = fullHeight ? cellH - this.cellPaddingTop : irHeight;
					var w = item.end - item.start;
					if (has("ie") >= 9 && item.start + w < this.itemContainer.offsetWidth) {
						w++;
					};

					domStyle.set(ir.container, {
						"top": (fullHeight ? this.cellPaddingTop : posY) + "px",
						"left": item.start + "px",
						"width": w + "px",
						"height": h + "px"
					});

					this._applyRendererLayout(item, ir, cell, w, h, "horizontal");

				}else{
					// The items does not fit in view, fill hidden items per column
					for(var d=item.startOffset;d<item.endOffset;d++){
						if(hiddenItems[d] == null){
							hiddenItems[d] = [item.item];
						}else{
							hiddenItems[d].push(item.item);
						}
					}
				}
			}
		},
		
		_layoutLabelItemsImpl: function(index, layoutItems, hasHiddenItems, hiddenItems, hOffsets){
			// tags:
			//		private
			var d, list, posY;
			var rd = this.renderData;
			var cal = rd.dateModule;
			var cell = rd.cells[index];
			var cellH = this._getRowHeight(index);
			var irHeight = this.labelRendererHeight;
			var maxW = domGeometry.getMarginBox(this.itemContainer).w;

			for(var i=0; i<layoutItems.length; i++){
				list = layoutItems[i];
				
				if(list != null){
					
					var maxH = this.expandRenderer ? (hasHiddenItems[i] ? cellH - this.expandRendererHeight: cellH) : cellH;
					posY = hOffsets == null || hOffsets[i] == null ? this.cellPaddingTop : hOffsets[i] + this.verticalGap;
					var celPos = domGeometry.position(this._getCellAt(index, i));
					var dayStart = rd.dates[index][i];
					var left = celPos.x - rd.gridTablePosX;
					
					for(var j=0; j<list.length; j++){
						
						if(posY + irHeight + this.verticalGap <= maxH){
							var item = list[j];
							
							lang.mixin(item, {
								start: left,
								end: left + celPos.w
							});
							
							var ir = this._createRenderer(item, "label", this.labelRenderer, "dojoxCalendarLabel");
								
							var fullHeight = this.isItemBeingEdited(item) && !this.liveLayout && this._isEditing;
							var h = fullHeight ? this._getRowHeight(index) - this.cellPaddingTop : irHeight;
							
							if(rd.rtl){
								item.start = maxW - item.end;
								item.end = item.start + celPos.w;
							}
								 
							domStyle.set(ir.container, {
								"top": (fullHeight ? this.cellPaddingTop : posY) + "px",
								"left": item.start + "px",
								"width": celPos.w + "px",
								"height": h + "px"
							});
							
							this._applyRendererLayout(item, ir, cell, celPos.w, h, "label");
						
						}else{
							break;
						}
						posY += irHeight + this.verticalGap;
					}
					
					for(var j; j<list.length; j++){
						if(hiddenItems[i] == null){
							hiddenItems[i] = [list[j]];
						}else{
							hiddenItems[i].push(list[j]);
						}
					}
				}
			}
		},
		
		_applyRendererLayout: function(item, ir, cell, w, h, kind){
			// tags:
			//		private
			
			var edited = this.isItemBeingEdited(item);
			var selected = this.isItemSelected(item);
			var hovered = this.isItemHovered(item);
			var focused = this.isItemFocused(item);

			var renderer = ir.renderer;

			renderer.set("hovered", hovered);
			renderer.set("selected", selected);
			renderer.set("edited", edited);
			renderer.set("focused", this.showFocus ? focused : false);
			renderer.set("moveEnabled", this.isItemMoveEnabled(item, kind));
			if(kind != "label"){
				renderer.set("resizeEnabled", this.isItemResizeEnabled(item, kind));
			}

			this.applyRendererZIndex(item, ir, hovered, selected, edited, focused);

			if(renderer.updateRendering){
				renderer.updateRendering(w, h);
			}
										
			domConstruct.place(ir.container, cell);
			domStyle.set(ir.container, "display", "block");
		},
		
		_getCellAt: function(rowIndex, columnIndex, rtl){
			// tags:
			//		private
			
			if((rtl == undefined || rtl == true) && !this.isLeftToRight()){
				columnIndex = this.renderData.columnCount -1 - columnIndex;
			}
			return this.gridTable.childNodes[0].childNodes[rowIndex].childNodes[columnIndex];
		},
	
		_layoutExpandRenderers: function(index, hasHiddenItems, hiddenItems){
			// tags:
			//		private
			
			if(!this.expandRenderer){
				return;
			}
			var rd = this.renderData;
			if(rd.expandedRow == index){
				if(rd.expandedRowCol != null && rd.expandedRowCol != -1){
					this._layoutExpandRendererImpl(rd.expandedRow, rd.expandedRowCol, null, true);
				}
			}else{
				if(rd.expandedRow == null){
					for(var i=0; i<rd.columnCount; i++){
						if(hasHiddenItems[i]){
							this._layoutExpandRendererImpl(index, rd.rtl ? rd.columnCount -1 -i: i, hiddenItems[i], false);
						}
					}
				}
			}
		},
		
		_layoutExpandRendererImpl: function(rowIndex, colIndex, items, expanded){
			// tags:
			//		private
			
			var d, ir;		
			var rd = this.renderData;
			var cal = rd.dateModule;
			var cell = rd.cells[rowIndex];					
			
			ir = this._getExpandRenderer(
				lang.clone(rd.dates[rowIndex][colIndex]),
				items, rowIndex, colIndex, expanded);
				
			var dim = domGeometry.position(this._getCellAt(rowIndex, colIndex));
			dim.x -= rd.gridTablePosX;
			this.layoutExpandRenderer(ir, d, items, dim, this.expandRendererHeight);
			domConstruct.place(ir.domNode, cell);
			domStyle.set(ir.domNode, "display", "block");
		},
		
		layoutExpandRenderer: function(renderer, date, items, cellPosition, height){
			// summary:
			//		Computes and sets the position of the expand/collapse renderers.
			//		By default the renderer is set to take the width of the cell and is placed at the bottom of the cell.
			//		The renderer DOM node is in a row that takes all the grid width. 
			// renderer: Object
			//		The renderer used in specified cell that indicates that some items cannot be displayed.
			// date: Date
			//		The date displayed by the cell.
			// items: Object[]
			//		The list of non visible items.
			// cellPosition: Object
			//		An object that contains the position (x and y properties) and size of the cell (w and h properties).
			// tags:
			//		private
			domStyle.set(renderer.domNode, {
				"left": cellPosition.x + "px",
				"width": cellPosition.w + "px",
				"height": height + "px",
				"top":  (cellPosition.h - height -1) + "px"
			});
		},
		
		/////////////////////////////////////////////
		//
		// Editing
		//
		//////////////////////////////////////////////
		
		_onItemEditBeginGesture: function(e){
			// tags:
			//		private
			var p = this._edProps;
			
			var item = p.editedItem;
			var dates = e.dates;
			
			var refTime = this.newDate(p.editKind == "resizeEnd" ? item.endTime : item.startTime);
			
			if(p.rendererKind == "label"){
				// noop
			}else if(e.editKind == "move" && (item.allDay || this.roundToDay)){							
				var cal = this.renderData.dateModule;
				p.dayOffset = cal.difference(
					this.floorToDay(dates[0], false, this.renderData), 
					refTime, "day");
			} // else managed in super
			
			this.inherited(arguments);
		},
		
		_computeItemEditingTimes: function(item, editKind, rendererKind, times, eventSource){
			// tags:
			//		private
			var cal = this.renderData.dateModule;
			var p = this._edProps;
			
			if(rendererKind == "label"){ // noop
			}else	if(item.allDay || this.roundToDay){		
				var isStartOfDay = this.isStartOfDay(times[0]);	
				switch(editKind){
					case "resizeEnd":
						if(!isStartOfDay && item.allDay){
							times[0] = cal.add(times[0], "day", 1); // no break;
						}
					case "resizeStart":
						if(!isStartOfDay){
							times[0] = this.floorToDay(times[0], true);
						}
						break;
					case "move":
						times[0] = cal.add(times[0], "day", p.dayOffset);
						break;
					case "resizeBoth":
						if(!isStartOfDay){
							times[0] = this.floorToDay(times[0], true);
						}
						if(!this.isStartOfDay(times[1])){
							times[1] = this.floorToDay(cal.add(times[1], "day", 1), true);
						}
						break; 
				}	
				
			}else{
				times = this.inherited(arguments); 
			}			
			
			return times;			
		},
			
		
		/////////////////////////////////////////////
		//
		// Pixel to Time projection
		//
		//////////////////////////////////////////////
		
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
			
			var rd = this.renderData;
			
			if(e != null){				
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
			
			if(x < 0){
				x = 0;
			}else if(x > r.w){
				x = r.w-1;
			}
			
			if(y < 0){
				y = 0;
			}else if(y > r.h){
				y = r.h-1;
			}

			// compute the date from column the time in day instead of time from start date of row to prevent DST hour offset.
			
			var w = domGeometry.getMarginBox(this.itemContainer).w;
			var colW = w / rd.columnCount;
			 
			var row;
			if(rd.expandedRow == null){
				row = Math.floor(y / (domGeometry.getMarginBox(this.itemContainer).h / rd.rowCount));
			}else{
				row = rd.expandedRow; //other rows are not usable
			}
			
			var r = domGeometry.getContentBox(this.itemContainer);
			
			if(rd.rtl){
				x = r.w - x;
			}
			
			var col = Math.floor(x / colW);
			
			var tm = Math.floor((x-(col*colW)) * 1440 / colW);
			
			var date = null;
			if(row < rd.dates.length && col < this.renderData.dates[row].length){
				date = this.newDate(this.renderData.dates[row][col]); 
				date = this.renderData.dateModule.add(date, "minute", tm);
			}
			
			return date;
		},
		
		/////////////////////////////////////////////
		//
		// Event management
		//
		//////////////////////////////////////////////
		
		_onGridMouseUp: function(e){
			// tags:
			//		private
			
			this.inherited(arguments);
			
			if(this._gridMouseDown){
				this._gridMouseDown = false;
				
				this._onGridClick({
					date: this.getTime(e),
					triggerEvent: e
				});
			}			
		},
		
		_onGridTouchEnd: function(e){
			// tags:
			//		private
			this.inherited(arguments);

			var g = this._gridProps;
			
			if(g){
				
				if(!this._isEditing){
						
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
				
				this._gridProps = null;
			}					
		},
		
				
		/////////////////////////////////////////////
		//
		// Events
		//
		//////////////////////////////////////////////
		
		_onRowHeaderClick: function(e){
			this._dispatchCalendarEvt(e, "onRowHeaderClick");
			// tags:
			//		private
		},
		
		onRowHeaderClick: function(e){
			// summary:
			//		Event dispatched when a row header cell is clicked.
			// e: __HeaderClickEventArgs
			//		Header click event.
			// tags:
			//		callback
		},
		
		expandRendererClickHandler: function(e, renderer){
			// summary:
			//		Default action when an expand renderer is clicked.
			// e: Event
			//		The mouse event.
			// renderer: Object
			//		The expand renderer.
			// tags:
			//		protected
			
			event.stop(e);
			
			var ri = renderer.get("rowIndex");
			var ci = renderer.get("columnIndex");
			
			this._onExpandRendererClick(lang.mixin(this._createItemEditEvent(), {
				rowIndex: ri,
				columnIndex: ci,
				renderer: renderer,
				triggerEvent: e,
				date: this.renderData.dates[ri][ci]
			}));
		},
		
		onExpandRendererClick: function(e){
			// summary:
			//		Event dispatched when an expand renderer is clicked.
			// e: __ExpandRendererClickEventArgs
			//		Expand renderer click event.
			// tags:
			//		callback
		},
		
		_onExpandRendererClick: function(e){
			
			this._dispatchCalendarEvt(e, "onExpandRendererClick");
			
			if(!e.isDefaultPrevented()){
			
				if(this.getExpandedRowIndex() != -1){
					this.collapseRow();
				}else{
					this.expandRow(e.rowIndex, e.columnIndex);
				}
			}
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
		triggerExtent: 3,
		liveLayout: false,
		stayInView: true,
		allowStartEndSwap: true,
		allowResizeLessThan24H: false		

	});
});
