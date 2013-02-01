define([
	"dojo/_base/declare",
	"./_CalendarView",
	"dijit/_TemplatedMixin",
	"dojo/query",
	"dojo/dom-class",
	"dojo/_base/connect",
	"dojo/_base/event",
	"dojo/_base/lang",
	"dojo/date/locale",
	"dojo/text!./Calendar/CalendarMonthYear.html"
], function(declare, _CalendarView, _TemplatedMixin, query, domClass, connect, event, lang, dojoDateLocale, template){
	return declare("dojox.widget._CalendarMonthYearView", [_CalendarView, _TemplatedMixin], {

		// summary:
		//		A Calendar view listing the 12 months of the year

		// templateString: String
		//		The template to be used to construct the widget.
		templateString: template,

		// datePart: String
		//		Specifies how much to increment the displayed date when the user
		//		clicks the array button to increment of decrement the view.
		datePart: "year",

		// displayedYears: Number
		//		The number of years to display at once.
		displayedYears: 10,

		useHeader: false,

		postCreate: function(){
			this.cloneClass(".dojoxCal-MY-G-Template", 5, ".dojoxCal-MY-btns");
			this.monthContainer = this.yearContainer = this.myContainer;

			var yClass = "dojoxCalendarYearLabel";
			var dClass = "dojoxCalendarDecrease";
			var iClass = "dojoxCalendarIncrease";

			query("." + yClass, this.myContainer).forEach(function(node, idx){
				var clazz = iClass;
				switch(idx){
					case 0:
						clazz = dClass;
					case 1:
						domClass.remove(node, yClass);
						domClass.add(node, clazz);
						break;
				}
			});
			// Get the year increment and decrement buttons.
			this._decBtn = query('.' + dClass, this.myContainer)[0];
			this._incBtn = query('.' + iClass, this.myContainer)[0];

			query(".dojoxCal-MY-M-Template", this.domNode)
				.filter(function(item){
					return item.cellIndex == 1;
				})
				.addClass("dojoxCal-MY-M-last");

			connect.connect(this, "onBeforeDisplay", lang.hitch(this, function(){
				this._cachedDate = new Date(this.get("value").getTime());
				this._populateYears(this._cachedDate.getFullYear());
				this._populateMonths();
				this._updateSelectedMonth();
				this._updateSelectedYear();
			}));

			connect.connect(this, "_populateYears", lang.hitch(this, function(){
				this._updateSelectedYear();
			}));
			connect.connect(this, "_populateMonths", lang.hitch(this, function(){
				this._updateSelectedMonth();
			}));

			this._cachedDate = this.get("value");

			this._populateYears();
			this._populateMonths();

			// Add visual effects to the view, if any have been mixed in
			this.addFx(".dojoxCalendarMonthLabel,.dojoxCalendarYearLabel ", this.myContainer);
		},

		_setValueAttr: function(value){
			if (value && value.getFullYear()) {
				this._populateYears(value.getFullYear());
			}
		},

		getHeader: function(){
			return null;
		},

		_getMonthNames: function(format){
			// summary:
			//		Returns localized month names
			this._monthNames	= this._monthNames || dojoDateLocale.getNames('months', format, 'standAlone', this.getLang());
			return this._monthNames;
		},

		_populateMonths: function(){
			// summary:
			//		Populate the month names using the localized values.
			var monthNames = this._getMonthNames('abbr');
			query(".dojoxCalendarMonthLabel", this.monthContainer).forEach(lang.hitch(this, function(node, cnt){
				this._setText(node, monthNames[cnt]);
			}));
			var constraints = this.get('constraints');

			if(constraints){
				var date = new Date();
				date.setFullYear(this._year);
				var min = -1, max = 12;
				if(constraints.min){
					var minY = constraints.min.getFullYear();
					if(minY > this._year){
						min = 12;
					}else if(minY == this._year){
						min = constraints.min.getMonth();
					}
				}
				if(constraints.max){
					var maxY = constraints.max.getFullYear();
					if(maxY < this._year){
						max = -1;
					}else if(maxY == this._year){
						max = constraints.max.getMonth();
					}
				}

				query(".dojoxCalendarMonthLabel", this.monthContainer)
					.forEach(lang.hitch(this, function(node, cnt){
						domClass[(cnt < min || cnt > max) ? "add" : "remove"]
							(node, 'dijitCalendarDisabledDate');
				}));
			}

			var h = this.getHeader();
			if(h){
				this._setText(this.getHeader(), this.get("value").getFullYear());
			}
		},

		_populateYears: function(year){
			// summary:
			//		Fills the list of years with a range of 12 numbers, with the current year
			//		being the 6th number.
			var constraints = this.get('constraints');
			var dispYear = year || this.get("value").getFullYear();
			var firstYear = dispYear - Math.floor(this.displayedYears/2);
			var min = constraints && constraints.min ? constraints.min.getFullYear() : firstYear -10000;
			firstYear = Math.max(min, firstYear);

			this._displayedYear = dispYear;

			var yearLabels = query(".dojoxCalendarYearLabel", this.yearContainer);

			var max = constraints && constraints.max ? constraints.max.getFullYear() - firstYear :	yearLabels.length;
			var disabledClass = 'dijitCalendarDisabledDate';

			yearLabels.forEach(lang.hitch(this, function(node, cnt){
				if(cnt <= max){
					this._setText(node, firstYear + cnt);
				}
				domClass.toggle(node, disabledClass, cnt > max);
			}));

			if(this._incBtn){
				domClass.toggle(this._incBtn, disabledClass, max < yearLabels.length);
			}
			if(this._decBtn){
				domClass.toggle(this._decBtn, disabledClass, min >= firstYear);
			}

			var h = this.getHeader();
			if(h){
				this._setText(this.getHeader(), firstYear + " - " + (firstYear + 11));
			}
		},

		_updateSelectedYear: function(){
			this._year = String((this._cachedDate || this.get("value")).getFullYear());
			this._updateSelectedNode(".dojoxCalendarYearLabel", lang.hitch(this, function(node){
				return this._year !== null && node.innerHTML == this._year;
			}));
		},

		_updateSelectedMonth: function(){
			var month = (this._cachedDate || this.get("value")).getMonth();
			this._month = month;
			this._updateSelectedNode(".dojoxCalendarMonthLabel", function(node, idx){
				return idx == month;
			});
		},

		_updateSelectedNode: function(queryNode, filter){
			var sel = "dijitCalendarSelectedDate";
			query(queryNode, this.domNode)
				.forEach(function(node, idx, array){
					domClass.toggle(node.parentNode, sel, filter(node, idx, array));
			});
			var selMonth = query('.dojoxCal-MY-M-Template div', this.myContainer)
				.filter(function(node){
					return domClass.contains(node.parentNode, sel);
			})[0];
			if(!selMonth){return;}
			var disabled = domClass.contains(selMonth, 'dijitCalendarDisabledDate');

			domClass.toggle(this.okBtn, "dijitDisabled", disabled);
		},

		onClick: function(evt){
			// summary:
			//		Handles clicks on month names
			var clazz;
			function hc(c){
				return domClass.contains(evt.target, c);
			}

			if(hc('dijitCalendarDisabledDate')){
				event.stop(evt);
				return false;
			}

			if(hc("dojoxCalendarMonthLabel")){
				clazz = "dojoxCal-MY-M-Template";
				this._month = evt.target.parentNode.cellIndex + (evt.target.parentNode.parentNode.rowIndex * 2);
				this._cachedDate.setMonth(this._month);
				this._updateSelectedMonth();
			}else if(hc( "dojoxCalendarYearLabel")){
				clazz = "dojoxCal-MY-Y-Template";
				this._year = Number(evt.target.innerHTML);
				this._cachedDate.setYear(this._year);
				this._populateMonths();
				this._updateSelectedYear();
			}else if(hc("dojoxCalendarDecrease")){
				this._populateYears(this._displayedYear - 10);
				return true;
			}else if(hc("dojoxCalendarIncrease")){
				this._populateYears(this._displayedYear + 10);
				return true;
			}else{
				return true;
			}
			event.stop(evt);
			return false;
		},

		onOk: function(evt){
			event.stop(evt);
			if(domClass.contains(this.okBtn, "dijitDisabled")){
				return false;
			}
			this.onValueSelected(this._cachedDate);
			return false;
		},

		onCancel: function(evt){
			event.stop(evt);
			this.onValueSelected(this.get("value"));
			return false;
		}
	});
});
