define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/on", 
	"dojox/calendar/Calendar", 
	"dojox/calendar/MonthColumnView", 
	"dojox/calendar/VerticalRenderer", 
	"dojox/calendar/Mouse",
	"dojox/calendar/Keyboard",
	"dojo/text!./CalendarMonthColumn.html"],

function(
	declare,
	lang,
	on,
	Calendar, 
	MonthColumnView,		
	VerticalRenderer, 
	Mouse,
	Keyboard,
	template){
					
	return declare("demo.ExtendedCalendar", Calendar, {
		
		// summary:
		//		A Calendar subclass that embeds a month column view.	
		
		templateString: template,
		
		verticalRenderer: VerticalRenderer,
		
		_createDefaultViews: function(){
			this.inherited(arguments);
			// create the month column view.
			this.monthColumnView = declare([MonthColumnView, Keyboard, Mouse])({
				verticalRenderer: VerticalRenderer				
			});
			
			this.monthColumnView.on("columnHeaderClick", lang.hitch(this, function(e){
				this.set("dateInterval", "month");
				this.set("dateIntervalSteps", 1);
				this.set("date", e.date);
			}));			
			
			return [this.columnView, this.matrixView, this.monthColumnView];
		},
		
		_computeCurrentView: function(startDate, endDate, duration){
			// show the month column view if the duration is greater than 31x2 days
			if(duration>62){
				return this.monthColumnView;
			}else{
				return this.inherited(arguments);
			}
		},
		
		_configureView: function(view, index, timeInterval, duration){
			// show only from January to June or from July to December
			if(view.viewKind == "monthColumns"){
				var m = timeInterval[0].getMonth();
				var d = this.newDate(timeInterval[0])
				d.setMonth(m<6?0:6);
				view.set("startDate", d);
				view.set("columnCount", 6);
			}else{
				this.inherited(arguments);
			}
		},
		
		configureButtons: function(){
			// configure the 6 months button
			this.inherited(arguments);
			if(this.sixMonthButton){
				// should set label from resource bundle here!
				this._buttonHandles.push(
					on(this.sixMonthButton, "click", lang.hitch(this, function(){						
						this.set("dateIntervalSteps", 6);
						this.set("dateInterval", "month");
					}))
				);	
			}
		},
		
		matrixViewRowHeaderClick: function(e){
			this.set("dateInterval", "week");
			this.set("dateIntervalSteps", 1);
			this.set("date", e.date);
		}
		
	});
});
