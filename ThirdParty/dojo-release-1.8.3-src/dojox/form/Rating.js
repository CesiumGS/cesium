define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/mouse",
	"dojo/on",
	"dojo/string",
	"dojo/query",
	"dijit/form/_FormWidget"
], function(declare, lang, domAttr, domClass, mouse, on, string, query, FormWidget){


	return declare("dojox.form.Rating", FormWidget, {
		// summary:
		//		A widget for rating using stars.

		/*=====
		// required: Boolean
		//		TODO: Can be true or false, default is false.
		required: false,
		=====*/

		templateString: null,

		// numStars: Integer|Float
		//		The number of stars to show, default is 3.
		numStars: 3,

		// value: Integer|Float
		//		The current value of the Rating
		value: 0,

		buildRendering: function(/*Object*/ params){
			// summary:
			//		Build the templateString. The number of stars is given by this.numStars,
			//		which is normally an attribute to the widget node.

			// The hidden value node is attached as "focusNode" because tabIndex, id, etc. are getting mapped there.
			var tpl = '<div dojoAttachPoint="domNode" class="dojoxRating dijitInline">' +
				'<input type="hidden" value="0" dojoAttachPoint="focusNode" /><ul data-dojo-attach-point="list">${stars}</ul>' +
				'</div>';
			// The value-attribute is used to "read" the value for processing in the widget class
			var starTpl = '<li class="dojoxRatingStar dijitInline" value="${value}"></li>';
			var rendered = "";
			for(var i = 0; i < this.numStars; i++){
				rendered += string.substitute(starTpl, {value:i + 1});
			}
			this.templateString = string.substitute(tpl, {stars:rendered});

			this.inherited(arguments);
		},

		postCreate: function(){
			this.inherited(arguments);
			this._renderStars(this.value);
			this.own(
				// Fire when mouse is moved over one of the stars.
				on(this.list, on.selector(".dojoxRatingStar", "mouseover"), lang.hitch(this, "_onMouse")),
				on(this.list, on.selector(".dojoxRatingStar", "click"), lang.hitch(this, "onStarClick")),
				on(this.list, mouse.leave, lang.hitch(this, function(){
					// go from hover display back to dormant display
					this._renderStars(this.value);
				}))
			);
		},

		_onMouse: function(evt){
			// summary:
			//		Called when mouse is moved over one of the stars
			var hoverValue = +domAttr.get(evt.target, "value");
			this._renderStars(hoverValue, true);
			this.onMouseOver(evt, hoverValue);
		},

		_renderStars: function(value, hover){
			// summary:
			//		Render the stars depending on the value.
			query(".dojoxRatingStar", this.domNode).forEach(function(star, i){
				if(i + 1 > value){
					domClass.remove(star, "dojoxRatingStarHover");
					domClass.remove(star, "dojoxRatingStarChecked");
				}else{
					domClass.remove(star, "dojoxRatingStar" + (hover ? "Checked" : "Hover"));
					domClass.add(star, "dojoxRatingStar" + (hover ? "Hover" : "Checked"));
				}
			});
		},

		onStarClick: function(/*Event*/ evt){
			// summary:
			//		Connect on this method to get noticed when a star was clicked.
			// example:
			//	|	connect(widget, "onStarClick", function(event){ ... })
			var newVal = +domAttr.get(evt.target, "value");
			this.setAttribute("value", newVal == this.value ? 0 : newVal);
			this._renderStars(this.value);
			this.onChange(this.value); // Do I have to call this by hand?
		},

		onMouseOver: function(/*=====evt, value=====*/ ){
			// summary:
			//		Connect here, the value is passed to this function as the second parameter!
		},

		setAttribute: function(/*String*/ key, /*Number*/ value){
			// summary:
			//		Deprecated.   Use set("value", ...) instead.
			this.set(key, value);
		},

		_setValueAttr: function(val){
			this.focusNode.value = val;		// reflect the value in our hidden field, for form submission
			this._set("value", val);
			this._renderStars(val);
			this.onChange(val); // Do I really have to call this by hand? :-(
		}
	});
});
