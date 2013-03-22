define([
"dojo/_base/declare", 
"dojo/_base/sniff", 
"dojo/_base/event", 
"dojo/_base/lang", 
"dojo/_base/array", 
"dojo/cldr/supplemental",
"dojo/dom", 
"dojo/dom-class", 
"dojo/dom-style",
"dojo/dom-construct", 
"dojo/date", 
"dojo/date/locale", 
"dojo/_base/fx", 
"dojo/fx",
"dojo/on", 
"dijit/_WidgetBase", 
"dijit/_TemplatedMixin", 
"dijit/_WidgetsInTemplateMixin", 
"./StoreMixin", 
"dojox/widget/_Invalidating", 
"dojox/widget/Selection", 
"dojox/calendar/time", 
"dojo/i18n!./nls/buttons"],	
function(
declare, 
has, 
event, 
lang, 
arr, 
cldr, 
dom, 
domClass, 
domStyle,
domConstruct, 
date, 
locale,
coreFx,
fx, 
on,  
_WidgetBase, 
_TemplatedMixin, 
_WidgetsInTemplateMixin, 
StoreMixin, 
_Invalidating, 
Selection, 
timeUtil,
_nls){
	
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
	var __TimeIntervalChangeArgs = {
		// summary:
		//		An time interval change event, dispatched when the calendar displayed time range has changed.
		// oldStartTime: Date
		//		The start of the previously displayed time interval, if any. 
		// startTime: Date
		//		The new start of the displayed time interval.
		// oldEndTime: Date
		//		The end of the previously displayed time interval, if any.
		// endTime: Date
		//		The new end of the displayed time interval.
	};
	=====*/
	
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
		//		For views with several sheets (columns view for example), the sheet when the event occured.
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
		// renderer: dojox/calendar/_RendererMixin
		//		The renderer clicked.
		// triggerEvent: Event
		//		The origin event.
	};
	=====*/

	return declare("dojox.calendar.CalendarBase", [_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, StoreMixin, _Invalidating, Selection], {
		
		// summary:		
		//		This class defines a generic calendar widget that manages several views to display event in time.
		
		baseClass: "dojoxCalendar",
		
		// datePackage: Object
		//		JavaScript namespace to find Calendar routines. Uses Gregorian Calendar routines at dojo.date by default.
		datePackage: date,
		
		// startDate: Date
		//		The start date of the displayed time interval.
		startDate: null,

		// endDate: Date
		//		The end date of the displayed time interval (included).		
		endDate: null,
		
		// date:Date
		//		The reference date used to determine along with the <code>dateInterval</code> 
		//		and <code>dateIntervalSteps</code> properties the time interval to display.
		date: null,
	
		// dateInterval:String
		//		The date interval used to compute along with the <code>date</code> and 
		//		<code>dateIntervalSteps</code> the time interval to display.
		//		Valid values are "day", "week" (default value) and "month".
		dateInterval: "week",
		
		// dateInterval:Integer
		//		The number of date intervals used to compute along with the <code>date</code> and 
		//		<code>dateInterval</code> the time interval to display.
		//		Default value is 1.		
		dateIntervalSteps: 1,		
		
		// viewContainer: Node
		//		The DOM node that will contains the views.
		viewContainer: null,
		
		// firstDayOfWeek: Integer
		//		(Optional) The first day of week override. By default the first day of week is determined 
		//		for the current locale (extracted from the CLDR).
		//		Special value -1 (default value), means use locale dependent value.
		firstDayOfWeek: -1, 
		
		// formatItemTimeFunc: Function?
		//		Optional function to format the time of day of the item renderers.
		//		The function takes the date and render data object as arguments and returns a String.
		formatItemTimeFunc: null,
		
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
		//		If <code>true</code>, the control supports resizing of items.
		resizeEnabled: true,
		
		// columnView: dojox/calendar/ColumnView
		//		The column view is displaying one day to seven days time intervals.
		columnView: null,
		
		// matrixView: dojox/calendar/MatrixView
		//		The column view is displaying time intervals that lasts more than seven days.
		matrixView: null,
		
		// columnViewProps: Object
		//		Map of property/value passed to the constructor of the column view.
		columnViewProps: null,
		
		// matrixViewProps: Object
		//		Map of property/value passed to the constructor of the matrix view.
		matrixViewProps: null,
		
		// createOnGridClick: Boolean
		//		Indicates whether the user can create new event by clicking and dragging the grid.
		//		A createItem function must be defined on the view or the calendar object.
		createOnGridClick: false,
		
		// createItemFunc: Function
		//		A user supplied function that creates a new event.
		//		This function is used when createOnGridClick is set to true and the user is clicking and dragging on the grid.
		//		This view takes two parameters:
		//
		//		- view: the current view,
		//		- d: the date at the clicked location.
		createItemFunc: null,
				
		_currentViewIndex: -1,
		
		views: null,
		
		_calendar: "gregorian",
		
		constructor: function(/*Object*/args){
			this.views = [];
			
			this.invalidatingProperties = ["store", "items", "startDate", "endDate", "views", 
				"date", "dateInterval", "dateIntervalSteps", "firstDayOfWeek"];
			
			args = args || {};
			this._calendar = args.datePackage ? args.datePackage.substr(args.datePackage.lastIndexOf(".")+1) : this._calendar;
			this.dateModule = args.datePackage ? lang.getObject(args.datePackage, false) : date; 
			this.dateClassObj = this.dateModule.Date || Date; 
			this.dateLocaleModule = args.datePackage ? lang.getObject(args.datePackage+".locale", false) : locale; 
						
			this.invalidateRendering();
		},
		
		destroy: function(preserveDom){
			arr.forEach(this._buttonHandles, function(h){
				h.remove();
			});
			this.inherited(arguments);
		},
				
		buildRendering: function(){
			this.inherited(arguments);
			if(this.views == null || this.views.length == 0){
				this.set("views", this._createDefaultViews());	
			}			
		},
		
		_applyAttributes: function(){
			this._applyAttr = true;
			this.inherited(arguments);
			delete this._applyAttr;
		},
		
		////////////////////////////////////////////////////
		//
		// Getter / setters
		//
		////////////////////////////////////////////////////
				
		_setStartDateAttr: function(value){
			this._set("startDate", value);
			this._timeRangeInvalidated = true;
		},
		
		_setEndDateAttr: function(value){
			this._set("endDate", value);
			this._timeRangeInvalidated = true;
		},
		
		_setDateAttr: function(value){
			this._set("date", value);
			this._timeRangeInvalidated = true;
		},
		
		_setDateIntervalAttr: function(value){
			this._set("dateInterval", value);
			this._timeRangeInvalidated = true;
		},
		
		_setDateIntervalStepsAttr: function(value){
			this._set("dateIntervalSteps", value);
			this._timeRangeInvalidated = true;
		},
		
		_setFirstDayOfWeekAttr: function(value){
			this._set("firstDayOfWeek", value);
			if(this.get("date") != null && this.get("dateInterval") == "week"){
				this._timeRangeInvalidated = true;
			}			
		},
		
		_setTextDirAttr: function(value){
			arr.forEach(this.views, function(view){
				view.set("textDir", value);
			});
		},
		
		///////////////////////////////////////////////////
		//
		// Validating
		//
		///////////////////////////////////////////////////
		
		refreshRendering: function(){
			// summary:
			//		Refreshes all the visual rendering of the calendar. 
			// tags:
			//		protected
			this.inherited(arguments);
			this._validateProperties();
		},
		
		_refreshItemsRendering: function(){
			if(this.currentView){
				this.currentView._refreshItemsRendering();
			}
		},
				
		_validateProperties: function(){
			// tags:
			//		private

			var cal = this.dateModule;
			var startDate = this.get("startDate");
			var endDate = this.get("endDate");
			var date = this.get("date");
			
			if(this.firstDayOfWeek < -1 || this.firstDayOfWeek > 6){
				this._set("firstDayOfWeek", 0);
			}
			
			if(date == null && (startDate != null || endDate != null)){
				
				if(startDate == null){
					startDate = new this.dateClassObj();
					this._set("startDate", startDate);
					this._timeRangeInvalidated = true;
				}
				
				if(endDate == null){
					endDate = new this.dateClassObj();
					this._set("endDate", endDate);
					this._timeRangeInvalidated = true;
				}
				
				if(cal.compare(startDate, endDate) >= 0){
					endDate = cal.add(startDate, "day", 1);
					this._set("endDate", endDate);
					this._timeRangeInvalidated = true;
				}
			
			}else{
			
				if(this.date == null){
					this._set("date", new this.dateClassObj());
					this._timeRangeInvalidated = true;
				}
				
				var dint = this.get("dateInterval");
				if(dint != "day" && dint != "week" && dint != "month"){
					this._set("dateInterval", "day");
					this._timeRangeInvalidated = true;
				}
				
				var dis = this.get("dateIntervalSteps");
				if(lang.isString(dis)){
					dis = parseInt(dis);
					this._set("dateIntervalSteps", dis);
				}
				if(dis <= 0) {
					this.set("dateIntervalSteps", 1);
					this._timeRangeInvalidated = true;
				}
			}
			
			if(this._timeRangeInvalidated){
				this._timeRangeInvalidated = false;
				var timeInterval = this.computeTimeInterval();
				
				if(this._timeInterval == null || 
					 cal.compare(this._timeInterval[0], timeInterval[0] != 0) || 
					 cal.compare(this._timeInterval[1], timeInterval[1] != 0)){
					this.onTimeIntervalChange({
						oldStartTime: this._timeInterval == null ? null : this._timeInterval[0],
						oldEndTime: this._timeInterval == null ? null : this._timeInterval[1],
						startTime: timeInterval[0],
						endTime: timeInterval[1]
					});
				}
				
				this._timeInterval = timeInterval;
				
				var duration = this.dateModule.difference(this._timeInterval[0], this._timeInterval[1], "day");
				var view = this._computeCurrentView(timeInterval[0], timeInterval[1], duration);
				
				var index = arr.indexOf(this.views, view);
				
				if(view == null || index == -1){
					return;
				}
				
				if(this.animateRange && (!has("ie") || has("ie")>8) ){
					if(this.currentView){ // there's a view to animate
						var ltr = this.isLeftToRight();
						var inLeft = this._animRangeInDir=="left" || this._animRangeInDir == null; 
						var outLeft = this._animRangeOutDir=="left" || this._animRangeOutDir == null;
						this._animateRange(this.currentView.domNode, outLeft && ltr, false, 0, outLeft ? -100 : 100, 
							lang.hitch(this, function(){
								this.animateRangeTimer = setTimeout(lang.hitch(this, function(){
									this._applyViewChange(view, index, timeInterval, duration);
									this._animateRange(this.currentView.domNode, inLeft && ltr, true, inLeft ? -100 : 100, 0);
									this._animRangeInDir = null;
									this._animRangeOutDir = null;
								}), 100);	// setTimeout give time for layout of view.							
							}));
					}else{
						this._applyViewChange(view, index, timeInterval, duration);						
					}
				}else{					
					this._applyViewChange(view, index, timeInterval, duration);
				}
			}
		},
		
		_applyViewChange: function(view, index, timeInterval, duration){			
			// summary:
			//		Applies the changes of a view time and changes the currently visible view if needed.
			// view: ViewBase
			//		The view that is configured and is or will be shown.
			// index: Integer
			//		The view index in the internal structure.
			// timeInterval: Date[]
			//		The time interval displayed by the calendar.
			// duration: Integer
			//		The duration in days of the time interval.
			// tags:
			//		protected
			
			this._configureView(view, index, timeInterval, duration);
			
			if(index != this._currentViewIndex){
				if(this.currentView == null){
					view.set("items", this.items);
					this.set("currentView", view);			
				}else{					
					if(this.items == null || this.items.length == 0){
						this.set("currentView", view);
						if(this.animateRange && (!has("ie") || has("ie")>8) ){
							domStyle.set(this.currentView.domNode, "opacity", 0);
						}
						view.set("items", this.items);
					}else{
						this.currentView = view;
						view.set("items", this.items);
						this.set("currentView", view);
						if(this.animateRange && (!has("ie") || has("ie")>8) ){
							domStyle.set(this.currentView.domNode, "opacity", 0);
						}
					}																	
				}											
			}
		},
		
		_timeInterval: null,
		
		computeTimeInterval: function(){
			// summary:
			//		Computes the displayed time interval according to the date, dateInterval and 
			//		dateIntervalSteps if date is not null or startDate and endDate properties otherwise.
			// tags:
			//		protected
					
			var cal = this.dateModule;
			var d = this.get("date");
			
			if(d == null){
				return [ this.floorToDay(this.get("startDate")), cal.add(this.get("endDate"), "day", 1) ];
			}else{
				
				var s = this.floorToDay(d);
				var di = this.get("dateInterval");
				var dis = this.get("dateIntervalSteps");
				var e;
				
				switch(di){
					case "day":						
						e = cal.add(s, "day", dis);
						break;
					case "week":
						s = this.floorToWeek(s);
						e = cal.add(s, "week", dis);
						break;
					case "month":
						s.setDate(1);
						e = cal.add(s, "month", dis);						
						break;
				}				
				return [s, e];
			}			
		},
		
		onTimeIntervalChange: function(e){
			// summary:
			//		Event dispatched when the displayed time interval has changed.
			// e: __TimeIntervalChangeArgs
			//		The time interval change event.
			// tags:
			//		callback
		},
		
		/////////////////////////////////////////////////////
		//
		// View Management
		//
		/////////////////////////////////////////////////////
		
		// views: dojox.calendar.ViewBase[]
		//		The views displayed by the widget.
		//		To add/remove only one view, prefer, respectively, the addView() or removeView() methods.
		views: null,
		
		_setViewsAttr: function(views){
			if(!this._applyAttr){
				// 1/ in create() the constructor parameters are mixed in the widget 
				// 2/ in _applyAttributes(), every property with a setter is called.
				// So no need to call on view removed for a non added view.... 
				for(var i=0;i<this.views.length;i++){
					this._onViewRemoved(this.views[i]);
				}
			}
			if(views != null){
				for(var i=0;i<views.length;i++){
					this._onViewAdded(views[i]);
				}			
			}
			this._set("views",  views == null ? [] : views.concat());			
		},
		
		_getViewsAttr: function(){
			return this.views.concat();
		},
		
		_createDefaultViews: function(){
			// summary:
			//		Creates the default views.
			//		This method does nothing and is designed to be overridden.
			// tags:
			//		protected
		},
		
		addView: function(view, index){
			// summary:
			//		Add a view to the calendar's view list.
			// view: dojox/calendar/ViewBase
			//		The view to add to the calendar.
			// index: Integer
			//		Optional, the index where to insert the view in current view list.
			// tags:
			//		protected

			if(index <= 0 || index > this.views.length){
				index = this.views.length;
			}
			this.views.splice(index, view);
			this._onViewAdded(view);
		},
		
		removeView: function(view){
			// summary:
			//		Removes a view from the calendar's view list.
			// view: dojox/calendar/ViewBase
			//		The view to remove from the calendar.
			// tags:
			//		protected

			if(index < 0 || index >=  this.views.length){
				return;
			}
			
			this._onViewRemoved(this.views[index]);
			this.views.splice(index, 1);
		},
		
		_onViewAdded: function(view){
			view.owner = this;
			view.buttonContainer = this.buttonContainer;
			view._calendar = this._calendar;
			view.datePackage = this.datePackage;
			view.dateModule = this.dateModule;
			view.dateClassObj = this.dateClassObj;
			view.dateLocaleModule = this.dateLocaleModule;
			domStyle.set(view.domNode, "display", "none");			
			domClass.add(view.domNode, "view");
			domConstruct.place(view.domNode, this.viewContainer);
			this.onViewAdded(view);
		},
		
		onViewAdded: function(view){
			// summary:
			//		Event dispatched when a view is added from the calendar.
			// view: dojox/calendar/ViewBase
			//		The view that has been added to the calendar.
			// tags:
			//		callback

		},
		
		_onViewRemoved: function(view){
			view.owner = null;
			view.buttonContainer = null;
			domClass.remove(view.domNode, "view");
			this.viewContainer.removeChild(view.domNode);
			this.onViewRemoved(view);
		},
		
		onViewRemoved: function(view){			
			// summary:
			//		Event dispatched when a view is removed from the calendar.
			// view: dojox/calendar/ViewBase
			//		The view that has been removed from the calendar.
			// tags:
			//		callback

		},
		
		_setCurrentViewAttr: function(view){
			var index = arr.indexOf(this.views, view);
			if(index != -1){
				var oldView = this.get("currentView");
				this._currentViewIndex = index;
				this._set("currentView", view);
				
				this._showView(oldView, view);
				this.onCurrentViewChange({
					oldView: oldView,
					newView: view
				});
			}					
		},
				
		_getCurrentViewAttr: function(){
			return this.views[this._currentViewIndex];		
		},
		
		onCurrentViewChange: function(e){
			// summary:
			//		Event dispatched when the current view has changed.
			// e: Event
			//		Object that contains the oldView and newView properties.
			// tags:
			//		callback

		},
		
		_configureView: function(view, index, timeInterval, duration){
			// summary:
			//		Configures the view to show the specified time interval.
			//		This method is computing and setting the following properties:
			//		- "startDate", "columnCount" for a column view,
			//		- "startDate", "columnCount", "rowCount", "refStartTime" and "refEndTime" for a matrix view.
			//		This method can be extended to configure other properties like layout properties for example.
			// view: dojox/calendar/ViewBase
			//		The view to configure.
			// index: Integer
			//		The index of the view in the Calendar view list.
			// timeInterval: Date[]
			//		The time interval that will be displayed by the view.
			// duration: Integer
			//		The duration, in days, of the displayed time interval.
			// tags:
			//		protected

			var cal = this.dateModule;
			if(view.viewKind == "columns"){
				view.set("startDate", timeInterval[0]);
				view.set("columnCount", duration);
			}else if(view.viewKind == "matrix"){
				if(duration > 7){ // show only full weeks.
					var s = this.floorToWeek(timeInterval[0]);					
					var e = this.floorToWeek(timeInterval[1]);
					if(cal.compare(e, timeInterval[1]) != 0){
						e = this.dateModule.add(e, "week", 1);
					}					
					duration = this.dateModule.difference(s, e, "day");
					view.set("startDate", s);
					view.set("columnCount", 7);
					view.set("rowCount", Math.ceil(duration/7));
					view.set("refStartTime", timeInterval[0]);
					view.set("refEndTime", timeInterval[1]);					
				}else{ 
					view.set("startDate", timeInterval[0]);
					view.set("columnCount", duration);
					view.set("rowCount", 1);
					view.set("refStartTime", null);
					view.set("refEndTime", null);
				}				
			}
		},
		
		_computeCurrentView: function(startDate, endDate, duration){
			// summary:
			//		If the time range is lasting less than seven days returns the column view or the matrix view otherwise.
			// startDate: Date
			//		The start date of the displayed time interval
			// endDate: Date
			//		The end date of the displayed time interval	
			// duration: Integer
			//		Duration of the 		
			// returns: dojox/calendar/ViewBase
			//		The view to display.
			// tags:
			//		protected

			return duration <= 7 ? this.columnView : this.matrixView;
		},
		
		matrixViewRowHeaderClick: function(e){
			// summary:
			//		Function called when the cell of a row header of the matrix view is clicked.
			//		The implementation is doing the foolowing actions:
			//		- If another row is already expanded, collapse it and then expand the clicked row.
			//		- If the clicked row is already expadned, collapse it.
			//		- If no row is expanded, expand the click row.
			// e: Object
			//		The row header click event.
			// tags:
			//		protected

			var expIndex = this.matrixView.getExpandedRowIndex();
				if(expIndex == e.index){
					this.matrixView.collapseRow();
				}else if(expIndex == -1){
					this.matrixView.expandRow(e.index);
				}else{
					var h = this.matrixView.on("expandAnimationEnd", lang.hitch(this, function(){
						h.remove();
						this.matrixView.expandRow(e.index);
					}));
					this.matrixView.collapseRow();
				}
		},
		
		columnViewColumnHeaderClick: function(e){
			// summary:
			//		Function called when the cell of a column header of the column view is clicked.
			//		Show the time range defined by the clicked date.
			// e: Object
			//		The column header click event.
			// tags:
			//		protected

			var cal = this.dateModule;
			if(cal.compare(e.date, this._timeInterval[0]) == 0 && this.dateInterval == "day" && this.dateIntervalSteps == 1){
				this.set("dateInterval", "week");
			}else{
				this.set("date", e.date);
				this.set("dateInterval", "day");
				this.set("dateIntervalSteps", 1);
			}
		},
		
		// viewFadeDuration: Integer
		//		The duration in milliseconds of the fade animation when the current view is changing.
		viewChangeDuration: 0,
		
		_showView: function(oldView, newView){
			// summary:
			//		Displays the current view.
			// oldView: dojox/calendar/ViewBase
			//		The previously displayed view or null.
			// newView: dojox/calendar/ViewBase
			//		The view to display.
			// tags:
			//		protected

			if(oldView != null){									
				domStyle.set(oldView.domNode, "display", "none");							
			}
			if(newView != null){												
				domStyle.set(newView.domNode, "display", "block");
				newView.resize();				
				if(!has("ie") || has("ie") > 7){
					domStyle.set(newView.domNode, "opacity", "1");
				}
			}
		},
		
		////////////////////////////////////////////////////
		//
		// Store & data
		//
		////////////////////////////////////////////////////
		
		_setItemsAttr: function(value){
			this._set("items", value);
			if(this.currentView){
				this.currentView.set("items", value);
				this.currentView.invalidateRendering();
			}
		},
		
		/////////////////////////////////////////////////////
		//
		// Time utilities
		//
		////////////////////////////////////////////////////
		
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
		
		floorToWeek: function(d){
			// summary:
			//		Floors the specified date to the beginning of week.
			// date: Date
			//		Date to floor.
			return timeUtil.floorToWeek(d, this.dateClassObj, this.dateModule, this.firstDayOfWeek, this.locale);
		},
		
		newDate: function(obj){
			// summary:
			//		Creates a new Date object.
			// obj: Object
			//		This object can have several values:
			//		- the time in milliseconds since gregorian epoch.
			//		- a Date instance
			// returns: Date
			return timeUtil.newDate(obj, this.dateClassObj);			
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
			return timeUtil.floor(date, unit, steps, reuse, this.classFuncObj);
		},
		
		/////////////////////////////////////////////////////
		//
		// Time navigation
		//
		////////////////////////////////////////////////////
		
		
		// animateRange: Boolean
		//		Indicates that the previous/next range method will be animated.
		animateRange: true,
		
		// animationRangeDuration: Integer
		//		The duration of the next/previous range animation.
		animationRangeDuration: 400,
		
		_animateRange : function(node, toLeft, fadeIn, xFrom, xTo, onEnd){
			// summary:
			//		Animates the current view using a synchronous fade and horizontal translation.
			// toLeft: Boolean
			//		Whether the view is moved to the left or to the right.
			// fadeIn: Boolean
			//		Whether the view is faded in or out.
			// xFrom: Integer
			//		Position before the animation
			// xTo: Integer
			//		Position after the animation
			// onEnd: Function
			//		Function called when the animation is finished.
			// tags:
			//		protected

			
			if(this.animateRangeTimer){ // cleanup previous call not finished
				clearTimeout(this.animateRangeTimer);
				delete this.animateRangeTimer;
			}
			
			var fadeFunc = fadeIn ? coreFx.fadeIn : coreFx.fadeOut;								
			domStyle.set(node, {left: xFrom + "px", right: (-xFrom) + "px"});
						
			fx.combine([
				coreFx.animateProperty({
					node: node, 
					properties: {left: xTo, right: -xTo},
					duration: this.animationRangeDuration/2,
					onEnd: onEnd									
				}),
				fadeFunc({node: node, duration: this.animationRangeDuration/2})
			]).play();
		},			
		
		// _animRangeOutDir: Boolean
		//		Direction of the range animation when the view 'leaving' the screen. 
		//		Valid values are: 
		//		- null: auto value,
		//		- "left": hides to left side (right in right to left).
		//		- "right": hides to right side (left in right to left).
		_animRangeOutDir: null,

		// _animRangeInDir: Boolean
		//		Direction of the range animation when the view 'entering' the screen. 
		//		Valid values are: 
		//		- null: auto value,
		//		- "left": shows from left side (right in right to left).
		//		- "right": shows from  right side (left in right to left).
		_animRangeOutDir: null,		
		
		nextRange: function(){
			this._animRangeOutDir = "left";
			this._animRangeInDir = "right";			
			this._navigate(1);			
		},
		
		previousRange: function(){
			this._animRangeOutDir = "right";
			this._animRangeInDir =  "left";			
			this._navigate(-1);			
		},
		
		_navigate: function(dir){
			// tags:
			//		private

			var d = this.get("date");
			var cal = this.dateModule;
			
			if(d == null){
				var s = this.get("startDate");
				var e = this.get("endDate");
				var dur = cal.difference(s, e, "day");
				if(dir == 1){								
					e = cal.add(e, "day", 1);
					this.set("startDate", e);
					this.set("endDate", cal.add(e, "day", dur));
				}else{
					s = cal.add(s, "day", -1);
					this.set("startDate", cal.add(s, "day", -dur));
					this.set("endDate", s);
				}
			}else{
				var di = this.get("dateInterval");
				var dis = this.get("dateIntervalSteps");
				this.set("date", cal.add(d, di, dir * dis));
			}
		},
		
		goToday: function(){
			// summary:
			//		Changes the displayed time interval to show the current day.
			//		Sets the date property to the current day, the dateInterval property to "day" and 
			//		the "dateIntervalSteps" to 1.
			this.set("date", this.floorToDay(new this.dateClassObj(), true));
			this.set("dateInterval", "day");
			this.set("dateIntervalSteps", 1);			
		},
		
		////////////////////////////////////////////////////
		//
		// Buttons
		//
		////////////////////////////////////////////////////
		
		postCreate: function(){
			this.inherited(arguments);
			this.configureButtons();
		},
		
		configureButtons: function(){
			// summary:
			//		Set the localized labels of the buttons and the event handlers.
			// tags:
			//		protected

			
			var h = [];
			var rtl = !this.isLeftToRight();
			
			if(this.previousButton){
				this.previousButton.set("label", _nls[rtl?"nextButton":"previousButton"]);
				h.push(
					on(this.previousButton, "click", lang.hitch(this, rtl?this.nextRange:this.previousRange))
				);	
			}
			
			if(this.nextButton){
				this.nextButton.set("label", _nls[rtl?"previousButton":"nextButton"]);
				h.push(
					on(this.nextButton, "click", lang.hitch(this, rtl?this.previousRange:this.nextRange))
				);	
			}
			
			if(rtl && this.previousButton && this.nextButton){
				var t = this.previousButton;
				this.previousButton = this.nextButton;
				this.nextButton = t;
			}
			
			if(this.todayButton){
				this.todayButton.set("label", _nls.todayButton);
				h.push(
					on(this.todayButton, "click", lang.hitch(this, this.todayButtonClick))
				);	
			}
			
			if(this.dayButton){
				this.dayButton.set("label", _nls.dayButton);
				h.push(
					on(this.dayButton, "click", lang.hitch(this, this.dayButtonClick))
				);
			}		
			
			if(this.weekButton){
				this.weekButton.set("label", _nls.weekButton);
				h.push(
					on(this.weekButton, "click", lang.hitch(this, this.weekButtonClick))
				);	
			}		

			if(this.fourDaysButton){
				this.fourDaysButton.set("label", _nls.fourDaysButton);
				h.push(
					on(this.fourDaysButton, "click", lang.hitch(this, this.fourDaysButtonClick))
				);
			}
			
			if(this.monthButton){
				this.monthButton.set("label", _nls.monthButton);
				h.push(
					on(this.monthButton, "click", lang.hitch(this, this.monthButtonClick))
				);	
			}	
			
			this._buttonHandles = h;
		},
		
		todayButtonClick: function(e){
			// summary:
			//		The action triggered when the today button is clicked.
			//		By default, calls the goToday() method.

			this.goToday();							
		},
		dayButtonClick: function(e){
			// summary:
			//		The action triggerred when the day button is clicked.
			//		By default, sets the dateInterval property to "day" and 
			//		the "dateIntervalSteps" to 1.

			if(this.get("date") == null){
				this.set("date", this.floorToDay(new this.dateClassObj(), true));
			}			
			this.set("dateInterval", "day");
			this.set("dateIntervalSteps", 1);								
		},
		
		weekButtonClick: function(e){
			// summary:
			//		The action triggered when the week button is clicked.
			//		By default, sets the dateInterval property to "week" and 
			//		the "dateIntervalSteps" to 1.
			this.set("dateInterval", "week");
			this.set("dateIntervalSteps", 1);						
		},
		fourDaysButtonClick: function(e){
			// summary:
			//		The action triggerred when the 4 days button is clicked.
			//		By default, sets the dateInterval property to "day" and 
			//		the "dateIntervalSteps" to 4.
			this.set("dateInterval", "day");
			this.set("dateIntervalSteps", 4);		
		},
		monthButtonClick: function(e){
			// summary:
			//		The action triggered when the month button is clicked.
			//		By default, sets the dateInterval property to "month" and 
			//		the "dateIntervalSteps" to 1.
			this.set("dateInterval", "month");
			this.set("dateIntervalSteps", 1);		
		},
					
		/////////////////////////////////////////////////////
		//
		// States item
		//
		////////////////////////////////////////////////////
		
		updateRenderers: function(obj, stateOnly){
			if(this.currentView){
				this.currentView.updateRenderers(obj, stateOnly);
			}			
		},

		getIdentity: function(item){
			return item ? item.id : null; 
		},

		_setHoveredItem: function(item, renderer){			
			if(this.hoveredItem && item && this.hoveredItem.id != item.id || 
				item == null || this.hoveredItem == null){
				var old = this.hoveredItem;
				this.hoveredItem = item;
				
				this.updateRenderers([old, this.hoveredItem], true);
				
				if(item && renderer){
					this.currentView._updateEditingCapabilities(item, renderer);
				}
			}
		},
		
		hoveredItem: null,
		
		isItemHovered: function(item){
			// summary:
			//		Returns whether the specified item is hovered or not.
			// item: Object
			//		The item.
			// returns: Boolean								
			return this.hoveredItem != null && this.hoveredItem.id == item.id;			
		},
		
		////////////////////////////////////////////////////////////////////////
		//
		// Editing 
		//
		////////////////////////////////////////////////////////////////////////

		isItemEditable: function(item, rendererKind){
			// summary:
			//		Computes whether particular item renderer can be edited.
			//		By default it is using the editable property value.
			// item: Object
			//		The item represented by the renderer.
			// rendererKind: String
			//		The kind of renderer.
			// returns: Boolean
			return this.editable;
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
			return this.isItemEditable() && this.moveEnabled;
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
			
			return this.isItemEditable() && this.resizeEnabled;
		},			

		////////////////////////////////////////////////////////////////////////
		//
		// Widget events
		//
		////////////////////////////////////////////////////////////////////////
		
		onGridClick: function(e){
			// summary:
			//		Event dispatched when the grid has been clicked.
			// e: __GridClickEventArgs
			//		The event dispatched when the grid is clicked.
			// tags:
			//		callback

		},
		
		onGridDoubleClick: function(e){
			// summary:
			//		Event dispatched when the grid has been double-clicked.	
			// e: __GridClickEventArgs
			//		The event dispatched when the grid is double-clicked.
			// tags:
			//		callback
		},	
		
		onItemClick: function(e){
			// summary:
			//		Event dispatched when an item renderer has been clicked.
			// e: __ItemMouseEventArgs
			//		The event dispatched when an item is clicked.
			// tags:
			//		callback
		},
		
		onItemDoubleClick: function(e){
			// summary:
			//		Event dispatched when an item renderer has been double-clicked.
			// e: __ItemMouseEventArgs
			//		The event dispatched when an item is double-clicked.
			// tags:
			//		callback
		},
		
		onItemContextMenu: function(e){
			// summary:
			//		Event dispatched when an item renderer has been context-clicked.
			// e: __ItemMouseEventArgs
			//		The event dispatched when an item is context-clicked.
			// tags:
			//		callback
		},
		
		onItemEditBegin: function(e){
			// summary:
			//		Event dispatched when the item is entering the editing mode.
			// e: __itemEditingEventArgs
			//		The editing event.
			// tags:
			//		callback
		},
		
		onItemEditEnd: function(e){
			// summary:
			//		Event dispatched when the item is leaving the editing mode.
			// e: __itemEditingEventArgs
			//		The editing event.
			// tags:
			//		callback
		},
		
		onItemEditBeginGesture: function(e){
			// summary:
			//		Event dispatched when an editing gesture is beginning.
			// e: __itemEditingEventArgs
			//		The editing event.
			// tags:
			//		callback
		},
		
		onItemEditMoveGesture: function(e){
			// summary:
			//		Event dispatched during a move editing gesture.		
			// e: __itemEditingEventArgs
			//		The editing event.
			// tags:
			//		callback
		},
		
		onItemEditResizeGesture: function(e){
			// summary:
			//		Event dispatched during a resize editing gesture.
			// e: __itemEditingEventArgs
			//		The editing event.
			// tags:
			//		callback
		},
		
		onItemEditEndGesture: function(e){
			// summary:
			//		Event dispatched at the end of an editing gesture.
			// e: __itemEditingEventArgs
			//		The editing event.
			// tags:
			//		callback
		},
		
		onItemRollOver: function(e){
			// Summary:
			//		Event dispatched when the mouse cursor in going over an item renderer.
			// e: __ItemMouseEventArgs
			//		The event dispatched when the mouse cursor enters in the item renderer.
			// tags:
			//		callback
		},
		
		onItemRollOut: function(e){
			// Summary:
			//		Event dispatched when the mouse cursor in leaving an item renderer.
			// e: __ItemMouseEventArgs
			//		The event dispatched when the mouse cursor enters in the item renderer.
			// tags:
			//		callback
		},
		
		onColumnHeaderClick: function(e){
			// summary:
			//		Event dispatched when a column header cell is clicked.
			// e: __HeaderClickEventArgs
			//		Header click event.
			// tags:
			//		callback
		},
				
		onRowHeaderClick: function(e){
			// summary:
			//		Event dispatched when a row header cell is clicked.
			// e: __HeaderClickEventArgs
			//		Header click event.
			// tags:
			//		callback
		},
		
		onExpandRendererClick: function(e){
			// summary:
			//		Event dispatched when an expand renderer is clicked.
			// e: __ExpandRendererClickEventArgs
			//		Expand renderer click event.
			// tags:
			//		callback
		},
		
		onRendererCreated: function(renderer){
			// summary:
			//		Event dispatched when an item renderer has been created.
			// renderer: dojox/calendar/_RendererMixin
			//		The renderer created.
			// tags:
			//		callback
		},
		
		onRendererRecycled: function(renderer){
			// summary:
			//		Event dispatched when an item renderer has been recycled.
			// renderer: dojox/calendar/_RendererMixin
			//		The renderer created.
			// tags:
			//		callback
		},
		
		onRendererReused: function(renderer){
			// summary:
			//		Event dispatched when an item renderer that was recycled is reused.
			// renderer: dojox/calendar/_RendererMixin
			//		The renderer created.
			// tags:
			//		callback
		},
		
		onRendererDestroyed: function(renderer){
			// summary:
			//		Event dispatched when an item renderer is destroyed.
			// renderer: dojox/calendar/_RendererMixin
			//		The renderer created.
			// tags:
			//		callback
		},
		
		onRenderersLayoutDone: function(view){
			// summary:
			//		Event triggered when item renderers layout has been done.
			// view: dojox/calendar/ViewBase
			//		The view that has been laid-out.
			// tags:
			//		callback
		}

	}) 
});
