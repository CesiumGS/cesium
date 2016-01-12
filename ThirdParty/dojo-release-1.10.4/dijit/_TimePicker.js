define([
	"dojo/_base/array", // array.forEach
	"dojo/date", // date.compare
	"dojo/date/locale", // locale.format
	"dojo/date/stamp", // stamp.fromISOString stamp.toISOString
	"dojo/_base/declare", // declare
	"dojo/dom-class", // domClass.add domClass.contains domClass.toggle
	"dojo/dom-construct", // domConstruct.create
	"dojo/_base/kernel", // deprecated
	"dojo/keys", // keys
	"dojo/_base/lang", // lang.mixin
	"dojo/sniff", // has(...)
	"dojo/query", // query
	"dojo/mouse", // mouse.wheel
	"dojo/on",
	"./_WidgetBase",
	"./form/_ListMouseMixin"
], function(array, ddate, locale, stamp, declare, domClass, domConstruct, kernel, keys, lang, has, query, mouse, on,
			_WidgetBase, _ListMouseMixin){

	// module:
	//		dijit/_TimePicker


	var TimePicker = declare("dijit._TimePicker", [_WidgetBase, _ListMouseMixin], {
		// summary:
		//		A time picker dropdown, used by dijit/form/TimeTextBox.
		//		This widget is not available as a standalone widget due to lack of accessibility support.

		// baseClass: [protected] String
		//		The root className to use for the various states of this widget
		baseClass: "dijitTimePicker",

		// pickerMin: String
		//		ISO-8601 string representing the time of the first
		//		visible element in the time picker.
		//		Set in local time, without a time zone.
		pickerMin: "T00:00:00",

		// pickerMax: String
		//		ISO-8601 string representing the last (possible) time
		//		added to the time picker.
		//		Set in local time, without a time zone.
		pickerMax: "T23:59:59",

		// clickableIncrement: String
		//		ISO-8601 string representing the interval between choices in the time picker.
		//		Set in local time, without a time zone.
		//		Example: `T00:15:00` creates 15 minute increments
		//		Must divide dijit/_TimePicker.visibleIncrement evenly
		clickableIncrement: "T00:15:00",

		// visibleIncrement: String
		//		ISO-8601 string representing the interval between "major" choices in the time picker.
		//		Each theme will highlight the major choices with a larger font / different color / etc.
		//		Set in local time, without a time zone.
		//		Example: `T01:00:00` creates text in every 1 hour increment
		visibleIncrement: "T01:00:00",

		// value: String
		//		Time to display.
		//		Defaults to current time.
		//		Can be a Date object or an ISO-8601 string.
		//		If you specify the GMT time zone (`-01:00`),
		//		the time will be converted to the local time in the local time zone.
		//		Otherwise, the time is considered to be in the local time zone.
		//		If you specify the date and isDate is true, the date is used.
		//		Example: if your local time zone is `GMT -05:00`,
		//		`T10:00:00` becomes `T10:00:00-05:00` (considered to be local time),
		//		`T10:00:00-01:00` becomes `T06:00:00-05:00` (4 hour difference),
		//		`T10:00:00Z` becomes `T05:00:00-05:00` (5 hour difference between Zulu and local time)
		//		`yyyy-mm-ddThh:mm:ss` is the format to set the date and time
		//		Example: `2007-06-01T09:00:00`
		value: new Date(),

		_visibleIncrement: 2,
		_clickableIncrement: 1,
		_totalIncrements: 10,

		// constraints: TimePicker.__Constraints
		//		Specifies valid range of times (start time, end time), and also used by TimeTextBox to pass other
		//		options to the TimePicker: pickerMin, pickerMax, clickableIncrement, and visibleIncrement.
		constraints: {},

		/*=====
		 serialize: function(val, options){
			 // summary:
			 //		User overridable function used to convert the attr('value') result to a String
			 // val: Date
			 //		The current value
			 // options: Object?
			 // tags:
			 //		protected
		 },
		 =====*/
		serialize: stamp.toISOString,

		/*=====
		 // filterString: string
		 //		The string to filter by
		 filterString: "",
		 =====*/

		buildRendering: function(){
			this.inherited(arguments);
			this.containerNode = this.domNode;	// expected by _ListBase
			this.timeMenu = this.domNode;	// for back-compat
		},

		setValue: function(/*Date*/ value){
			// summary:
			//		Deprecated.  Used set('value') instead.
			// tags:
			//		deprecated
			kernel.deprecated("dijit._TimePicker:setValue() is deprecated.  Use set('value', ...) instead.", "", "2.0");
			this.set('value', value);
		},

		_setValueAttr: function(/*Date*/ date){
			// summary:
			//		Hook so set('value', ...) works.
			// description:
			//		Set the value of the TimePicker.
			//		Redraws the TimePicker around the new date.
			// tags:
			//		protected
			this._set("value", date);
			this._showText();
		},

		_setFilterStringAttr: function(val){
			// summary:
			//		Called by TimeTextBox to filter the values shown in my list
			this._set("filterString", val);
			this._showText();
		},

		isDisabledDate: function(/*===== dateObject, locale =====*/){
			// summary:
			//		May be overridden to disable certain dates in the TimePicker e.g. `isDisabledDate=locale.isWeekend`
			// dateObject: Date
			// locale: String?
			// type:
			//		extension
			return false; // Boolean
		},

		_getFilteredNodes: function(/*number*/ start, /*number*/ maxNum, /*Boolean*/ before, /*DOMNode*/ lastNode){
			// summary:
			//		Returns an array of nodes with the filter applied.  At most maxNum nodes
			//		will be returned - but fewer may be returned as well.  If the
			//		before parameter is set to true, then it will return the elements
			//		before the given index
			// tags:
			//		private

			var nodes = [];

			for(var i = 0 ; i < this._maxIncrement; i++){
				var n = this._createOption(i);
				if(n){
					nodes.push(n);
				}
			}
			return nodes;
		},

		_showText: function(){
			// summary:
			//		Displays the relevant choices in the drop down list
			// tags:
			//		private
			var fromIso = stamp.fromISOString;
			this.domNode.innerHTML = "";
			this._clickableIncrementDate = fromIso(this.clickableIncrement);
			this._visibleIncrementDate = fromIso(this.visibleIncrement);
			// get the value of the increments to find out how many divs to create
			var
				sinceMidnight = function(/*Date*/ date){
					return date.getHours() * 60 * 60 + date.getMinutes() * 60 + date.getSeconds();
				},
				clickableIncrementSeconds = sinceMidnight(this._clickableIncrementDate),
				visibleIncrementSeconds = sinceMidnight(this._visibleIncrementDate),
				// round reference date to previous visible increment
				time = (this.value || this.currentFocus).getTime();

			this._refDate = fromIso(this.pickerMin);
			this._refDate.setFullYear(1970, 0, 1); // match parse defaults

			// assume clickable increment is the smallest unit
			this._clickableIncrement = 1;
			// divide the visible range by the clickable increment to get the number of divs to create
			// example: 10:00:00/00:15:00 -> display 40 divs
			// divide the visible increments by the clickable increments to get how often to display the time inline
			// example: 01:00:00/00:15:00 -> display the time every 4 divs
			this._visibleIncrement = visibleIncrementSeconds / clickableIncrementSeconds;

			// get the number of increments (i.e. number of entries in the picker)
			var endDate = fromIso(this.pickerMax);
			endDate.setFullYear(1970, 0, 1);
			var visibleRange = (endDate.getTime() - this._refDate.getTime()) * 0.001;
			this._maxIncrement = Math.ceil((visibleRange + 1) / clickableIncrementSeconds);

			var nodes  = this._getFilteredNodes();
			array.forEach(nodes, function(n){
				this.domNode.appendChild(n);
			}, this);

			// never show empty due to a bad filter
			if(!nodes.length && this.filterString){
				this.filterString = '';
				this._showText();
			}
		},

		constructor: function(/*===== params, srcNodeRef =====*/){
			// summary:
			//		Create the widget.
			// params: Object|null
			//		Hash of initialization parameters for widget, including scalar values (like title, duration etc.)
			//		and functions, typically callbacks like onClick.
			//		The hash can contain any of the widget's properties, excluding read-only properties.
			// srcNodeRef: DOMNode|String?
			//		If a srcNodeRef (DOM node) is specified, replace srcNodeRef with my generated DOM tree

			this.constraints = {};
		},

		postMixInProperties: function(){
			this.inherited(arguments);
			this._setConstraintsAttr(this.constraints); // this needs to happen now (and later) due to codependency on _set*Attr calls
		},

		// For historical reasons TimeTextBox sends all the options for the _TimePicker inside of a constraints{} object
		_setConstraintsAttr: function(/* Object */ constraints){
			// brings in increments, etc.
			for (var key in { clickableIncrement: 1, visibleIncrement: 1, pickerMin: 1, pickerMax: 1 }) {
				if (key in constraints) {
					this[key] = constraints[key];
				}
			}

			// locale needs the lang in the constraints as locale
			if(!constraints.locale){
				constraints.locale = this.lang;
			}
		},

		_createOption: function(/*Number*/ index){
			// summary:
			//		Creates a clickable time option, or returns null if the specified index doesn't match the filter
			// tags:
			//		private
			var date = new Date(this._refDate);
			var incrementDate = this._clickableIncrementDate;
			date.setHours(date.getHours() + incrementDate.getHours() * index,
				date.getMinutes() + incrementDate.getMinutes() * index,
				date.getSeconds() + incrementDate.getSeconds() * index);
			if(this.constraints.selector == "time"){
				date.setFullYear(1970, 0, 1); // make sure each time is for the same date
			}
			var dateString = locale.format(date, this.constraints);
			if(this.filterString && dateString.toLowerCase().indexOf(this.filterString) !== 0){
				// Doesn't match the filter - return null
				return null;
			}

			var div = this.ownerDocument.createElement("div");
			div.className = this.baseClass + "Item";
			div.date = date;
			div.idx = index;
			domConstruct.create('div', {
				"class": this.baseClass + "ItemInner",
				innerHTML: dateString
			}, div);

			if(index % this._visibleIncrement < 1 && index % this._visibleIncrement > -1){
				domClass.add(div, this.baseClass + "Marker");
			}else if(!(index % this._clickableIncrement)){
				domClass.add(div, this.baseClass + "Tick");
			}

			if(this.isDisabledDate(date)){
				// set disabled
				domClass.add(div, this.baseClass + "ItemDisabled");
			}
			if(this.value && !ddate.compare(this.value, date, this.constraints.selector)){
				div.selected = true;
				domClass.add(div, this.baseClass + "ItemSelected");
				this._selectedDiv = div;
				if(domClass.contains(div, this.baseClass + "Marker")){
					domClass.add(div, this.baseClass + "MarkerSelected");
				}else{
					domClass.add(div, this.baseClass + "TickSelected");
				}

				// Initially highlight the current value.   User can change highlight by up/down arrow keys
				// or mouse movement.
				this._highlightOption(div, true);
			}
			return div;
		},

		onOpen: function(){
			this.inherited(arguments);

			// Since _ListBase::_setSelectedAttr() calls scrollIntoView(), shouldn't call it until list is visible.
			this.set("selected", this._selectedDiv);
		},

		_onOptionSelected: function(/*Object*/ tgt){
			// summary:
			//		Called when user clicks an option in the drop down list
			// tags:
			//		private
			var tdate = tgt.target.date || tgt.target.parentNode.date;
			if(!tdate || this.isDisabledDate(tdate)){
				return;
			}
			this._highlighted_option = null;
			this.set('value', tdate);
			this.onChange(tdate);
		},

		onChange: function(/*Date*/ /*===== time =====*/){
			// summary:
			//		Notification that a time was selected.  It may be the same as the previous value.
			// tags:
			//		public
		},

		_highlightOption: function(/*node*/ node, /*Boolean*/ highlight){
			// summary:
			//		Turns on/off highlight effect on a node based on mouse out/over event
			// tags:
			//		private
			if(!node){
				return;
			}
			if(highlight){
				if(this._highlighted_option){
					this._highlightOption(this._highlighted_option, false);
				}
				this._highlighted_option = node;
			}else if(this._highlighted_option !== node){
				return;
			}else{
				this._highlighted_option = null;
			}
			domClass.toggle(node, this.baseClass + "ItemHover", highlight);
			if(domClass.contains(node, this.baseClass + "Marker")){
				domClass.toggle(node, this.baseClass + "MarkerHover", highlight);
			}else{
				domClass.toggle(node, this.baseClass + "TickHover", highlight);
			}
		},

		handleKey: function(/*Event*/ e){
			// summary:
			//		Called from `dijit/form/_DateTimeTextBox` to pass a keypress event
			//		from the `dijit/form/TimeTextBox` to be handled in this widget
			// tags:
			//		protected
			if(e.keyCode == keys.DOWN_ARROW){
				this.selectNextNode();
				e.stopPropagation();
				e.preventDefault();
				return false;
			}else if(e.keyCode == keys.UP_ARROW){
				this.selectPreviousNode();
				e.stopPropagation();
				e.preventDefault();
				return false;
			}else if(e.keyCode == keys.ENTER || e.keyCode === keys.TAB){
				// mouse hover followed by TAB is NO selection
				if(!this._keyboardSelected && e.keyCode === keys.TAB){
					return true;	// true means don't call stopEvent()
				}

				// Accept the currently-highlighted option as the value
				if(this._highlighted_option){
					this._onOptionSelected({target: this._highlighted_option});
				}

				// Call stopEvent() for ENTER key so that form doesn't submit,
				// but not for TAB, so that TAB does switch focus
				return e.keyCode === keys.TAB;
			}
			return undefined;
		},

		// Implement abstract methods for _ListBase
		onHover: function(/*DomNode*/ node){
			this._highlightOption(node, true);
		},

		onUnhover: function(/*DomNode*/ node){
			this._highlightOption(node, false);
		},

		onSelect: function(/*DomNode*/ node){
			this._highlightOption(node, true);
		},

		onDeselect: function(/*DomNode*/ node){
			this._highlightOption(node, false);
		},

		onClick: function(/*DomNode*/ node){
			this._onOptionSelected({target: node});
		}
	});

	/*=====
	 TimePicker.__Constraints = declare(locale.__FormatOptions, {
		 // clickableIncrement: String
		 //		See `dijit/_TimePicker.clickableIncrement`
		 clickableIncrement: "T00:15:00"
	 });
	 =====*/

	return TimePicker;
});
