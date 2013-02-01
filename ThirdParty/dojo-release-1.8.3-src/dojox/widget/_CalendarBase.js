define([
	"dijit/_WidgetBase",
	"dijit/_TemplatedMixin",
	"dijit/_Container",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/typematic",
	"dojo/_base/declare",
	"dojo/date",
	"dojo/date/stamp",
	"dojo/date/locale",
	"dojo/dom-style",
	"dojo/dom-class",
	"dojo/_base/fx",
	"dojo/on",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/text!./Calendar/Calendar.html"
], function(_WidgetBase, _TemplatedMixin, _Container, _WidgetsInTemplateMixin, dijitTypematic,
		declare, dojoDate, stamp, dojoDateLocale, domStyle, domClass, fx, on, array, lang, template){
	return declare("dojox.widget._CalendarBase", [_WidgetBase, _TemplatedMixin, _Container, _WidgetsInTemplateMixin], {
		// summary:
		//		The Root class for all _Calendar extensions

		// templateString: String
		//		The template to be used to construct the widget.
		templateString: template,

		// _views: Array
		//		The list of mixin views available on this calendar.
		_views: null,

		// useFx: Boolean
		//		Specifies if visual effects should be applied to the widget.
		//		The default behavior of the widget does not contain any effects.
		//		The dojox.widget.CalendarFx package is needed for these.
		useFx: true,

		// value: Date
		//		The currently selected Date
		value: new Date(),

		constraints: null,

		// footerFormat: String
		//		The date format of the date displayed in the footer.	Can be
		//		'short', 'medium', and 'long'
		footerFormat: "medium",

		constructor: function(){
			this._views = [];
			this.value = new Date();
		},

		_setConstraintsAttr: function(constraints){
			// summary:
			//		Sets minimum and maximum constraints
			var c = this.constraints = constraints;
			if(c){
				if(typeof c.min == "string"){
					c.min = stamp.fromISOString(c.min);
				}
				if(typeof c.max == "string"){
					c.max = stamp.fromISOString(c.max);
				}
			}
		},

		postMixInProperties: function () {
			this.inherited(arguments);
			this.value = this.parseInitialValue(this.value);
		},

		parseInitialValue: function(value){
			if (!value || value === -1){
				return new Date();
			}else if(value.getFullYear){
				return value;
			}else if (!isNaN(value)) {
				if (typeof this.value == "string") {
					value = parseInt(value);
				}
				value = this._makeDate(value);
			}
			return value;
		},

		_makeDate: function(value){
			return value;//new Date(value);
		},

		postCreate: function(){
			// summary:
			//		Instantiates the mixin views

			this.displayMonth = new Date(this.get('value'));

			if(this._isInvalidDate(this.displayMonth)){
				this.displayMonth = new Date();
			}

			var mixin = {
				parent: this,
				_getValueAttr: lang.hitch(this, function(){return new Date(this._internalValue || this.value);}),
				_getDisplayMonthAttr: lang.hitch(this, function(){return new Date(this.displayMonth);}),
				_getConstraintsAttr: lang.hitch(this, function(){return this.constraints;}),
				getLang: lang.hitch(this, function(){return this.lang;}),
				isDisabledDate: lang.hitch(this, this.isDisabledDate),
				getClassForDate: lang.hitch(this, this.getClassForDate),
				addFx: this.useFx ? lang.hitch(this, this.addFx) : function(){}
			};

			//Add the mixed in views.
			array.forEach(this._views, function(widgetType){
				var widget = new widgetType(mixin).placeAt(this);

				var header = widget.getHeader();
				if(header){
				//place the views's header node in the header of the main widget
					this.header.appendChild(header);

					//hide the header node of the widget
					domStyle.set(header, "display", "none");
				}
				//Hide all views
				domStyle.set(widget.domNode, "visibility", "hidden");

				//Listen for the values in a view to be selected
				widget.on("valueSelected", lang.hitch(this, "_onDateSelected"));
				widget.set("value", this.get('value'));
			}, this);

			if(this._views.length < 2){
				domStyle.set(this.header, "cursor", "auto");
			}

			this.inherited(arguments);

			// Cache the list of children widgets.
			this._children = this.getChildren();

			this._currentChild = 0;

			//Populate the footer with today's date.
			var today = new Date();

			this.footer.innerHTML = "Today: "
				+ dojoDateLocale.format(today, {
					formatLength:this.footerFormat,
					selector:'date',
					locale:this.lang});

			on(this.footer, "click", lang.hitch(this, "goToToday"));

			var first = this._children[0];

			domStyle.set(first.domNode, "top", "0px");
			domStyle.set(first.domNode, "visibility", "visible");

			var header = first.getHeader();
			if(header){
				domStyle.set(first.getHeader(), "display", "");
			}

			domClass.toggle(this.container, "no-header", !first.useHeader);

			first.onDisplay();

			var _this = this;

			var typematic = function(nodeProp, dateProp, adj){
				dijitTypematic.addMouseListener(_this[nodeProp], _this, function(count){
					if(count >= 0){	_this._adjustDisplay(dateProp, adj);}
				}, 0.8, 500);
			};
			typematic("incrementMonth", "month", 1);
			typematic("decrementMonth", "month", -1);
			this._updateTitleStyle();
		},

		addFx: function(query, fromNode){
			// Stub function than can be overridden to add effects.
		},

		_isInvalidDate: function(/*Date*/ value){
			// summary:
			//		Runs various tests on the value, checking for invalid conditions
			// tags:
			//		private
			return !value || isNaN(value) || typeof value != "object" || value.toString() == this._invalidDate;
		},

		_setValueAttr: function(/*Date*/ value){
			// summary:
			//		Set the current date and update the UI.	If the date is disabled, the selection will
			//		not change, but the display will change to the corresponding month.
			if(!value){
				value = new Date();
			}
			if(!value["getFullYear"]){
				value = stamp.fromISOString(value + "");
			}
			if(this._isInvalidDate(value)){
				return false;
			}
			if(!this.value || dojoDate.compare(value, this.value)){
				value = new Date(value);
				this.displayMonth = new Date(value);
				this._internalValue = value;
				if(!this.isDisabledDate(value, this.lang) && this._currentChild == 0){
					this.value = value;
					this.onChange(value);
				}
				if (this._children && this._children.length > 0) {
					this._children[this._currentChild].set("value", this.value);
				}
				return true;
			}
			return false;
		},

		isDisabledDate: function(/*Date*/date, /*String?*/locale){
			// summary:
			//		May be overridden to disable certain dates in the calendar e.g. `isDisabledDate=dojo.date.locale.isWeekend`
			var c = this.constraints;
			var compare = dojoDate.compare;
			return c && (c.min && (compare(c.min, date, "date") > 0) ||
								(c.max && compare(c.max, date, "date") < 0));
		},

		onValueSelected: function(/*Date*/date){
			// summary:
			//		A date cell was selected. It may be the same as the previous value.
		},

		_onDateSelected: function(date, formattedValue, force){
			this.displayMonth = date;

			this.set("value", date);
			//Only change the selected value if it was chosen from the
			//first child.
			if(!this._transitionVert(-1)){
				if(!formattedValue && formattedValue !== 0){
					formattedValue = this.get('value');
				}
				this.onValueSelected(formattedValue);
			}

		},

		onChange: function(/*Date*/date){
			// summary:
			//		Called only when the selected date has changed
		},

		onHeaderClick: function(e){
			// summary:
			//		Transitions to the next view.
			this._transitionVert(1);
		},

		goToToday: function(){
			this.set("value", new Date());
			this.onValueSelected(this.get('value'));
		},

		_transitionVert: function(/*Number*/direction){
			// summary:
			//		Animates the views to show one and hide another, in a
			//		vertical direction.
			//		If 'direction' is 1, then the views slide upwards.
			//		If 'direction' is -1, the views slide downwards.
			var curWidget = this._children[this._currentChild];
			var nextWidget = this._children[this._currentChild + direction];
			if(!nextWidget){return false;}

			domStyle.set(nextWidget.domNode, "visibility", "visible");

			var height = domStyle.get(this.containerNode, "height");
			nextWidget.set("value", this.displayMonth);

			if(curWidget.header){
				domStyle.set(curWidget.header, "display", "none");
			}
			if(nextWidget.header){
				domStyle.set(nextWidget.header, "display", "");
			}
			domStyle.set(nextWidget.domNode, "top", (height * -1) + "px");
			domStyle.set(nextWidget.domNode, "visibility", "visible");

			this._currentChild += direction;

			var height1 = height * direction;
			var height2 = 0;
			domStyle.set(nextWidget.domNode, "top", (height1 * -1) + "px");

			// summary:
			//		Slides two nodes vertically.
			var anim1 = fx.animateProperty({
				node: curWidget.domNode,
				properties: {top: height1},
				onEnd: function(){
					domStyle.set(curWidget.domNode, "visibility", "hidden");
				}
			});
			var anim2 = fx.animateProperty({
				node: nextWidget.domNode,
				properties: {top: height2},
				onEnd: function(){
					nextWidget.onDisplay();
				}
			});

			domClass.toggle(this.container, "no-header", !nextWidget.useHeader);

			anim1.play();
			anim2.play();
			curWidget.onBeforeUnDisplay();
			nextWidget.onBeforeDisplay();

			this._updateTitleStyle();
			return true;
		},

		_updateTitleStyle: function(){
			domClass.toggle(this.header, "navToPanel", this._currentChild < this._children.length -1);
		},

		_slideTable: function(/*String*/widget, /*Number*/direction, /*Function*/callback){
			// summary:
			//		Animates the horizontal sliding of a table.
			var table = widget.domNode;

			//Clone the existing table
			var newTable = table.cloneNode(true);
			var left = domStyle.get(table, "width");

			table.parentNode.appendChild(newTable);

			//Place the existing node either to the left or the right of the new node,
			//depending on which direction it is to slide.
			domStyle.set(table, "left", (left * direction) + "px");

			//Call the function that generally populates the new cloned node with new data.
			//It may also attach event listeners.
			callback();

			//Animate the two nodes.
			var anim1 = fx.animateProperty({node: newTable, properties:{left: left * direction * -1}, duration: 500, onEnd: function(){
				newTable.parentNode.removeChild(newTable);
			}});
			var anim2 = fx.animateProperty({node: table, properties:{left: 0}, duration: 500});

			anim1.play();
			anim2.play();
		},

		_addView: function(view){
			//Insert the view at the start of the array.
			this._views.push(view);
		},

		getClassForDate: function(/*Date*/dateObject, /*String?*/locale){
			// summary:
			//		May be overridden to return CSS classes to associate with the date entry for the given dateObject,
			//		for example to indicate a holiday in specified locale.

	/*=====
			return ""; // String
	=====*/
		},

		_adjustDisplay: function(/*String*/part, /*int*/amount, noSlide){
			// summary:
			//		This function overrides the base function defined in dijit/Calendar.
			//		It changes the displayed years, months and days depending on the inputs.
			var child = this._children[this._currentChild];

			var month = this.displayMonth = child.adjustDate(this.displayMonth, amount);

			this._slideTable(child, amount, function(){
				child.set("value", month);
			});
		}
	});
});
