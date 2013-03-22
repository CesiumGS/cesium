define([
	"dojo/_base/declare", // declare
	"dojo/_base/event", // event.stop
	"dojo/keys", // keys keys.DOWN_ARROW keys.PAGE_DOWN keys.PAGE_UP keys.UP_ARROW
	"dojo/_base/lang", // lang.hitch
	"dojo/sniff", // has("mozilla")
	"dojo/mouse", // mouse.wheel
	"../typematic",
	"./RangeBoundTextBox",
	"dojo/text!./templates/Spinner.html",
	"./_TextBoxMixin"	// selectInputText
], function(declare, event, keys, lang, has, mouse, typematic, RangeBoundTextBox, template, _TextBoxMixin){

	// module:
	//		dijit/form/_Spinner

	return declare("dijit.form._Spinner", RangeBoundTextBox, {
		// summary:
		//		Mixin for validation widgets with a spinner.
		// description:
		//		This class basically (conceptually) extends `dijit/form/ValidationTextBox`.
		//		It modifies the template to have up/down arrows, and provides related handling code.

		// defaultTimeout: Number
		//		Number of milliseconds before a held arrow key or up/down button becomes typematic
		defaultTimeout: 500,

		// minimumTimeout: Number
		//		minimum number of milliseconds that typematic event fires when held key or button is held
		minimumTimeout: 10,

		// timeoutChangeRate: Number
		//		Fraction of time used to change the typematic timer between events.
		//		1.0 means that each typematic event fires at defaultTimeout intervals.
		//		Less than 1.0 means that each typematic event fires at an increasing faster rate.
		timeoutChangeRate: 0.90,

		// smallDelta: Number
		//		Adjust the value by this much when spinning using the arrow keys/buttons
		smallDelta: 1,

		// largeDelta: Number
		//		Adjust the value by this much when spinning using the PgUp/Dn keys
		largeDelta: 10,

		templateString: template,

		baseClass: "dijitTextBox dijitSpinner",

		// Set classes like dijitUpArrowButtonHover or dijitDownArrowButtonActive depending on
		// mouse action over specified node
		cssStateNodes: {
			"upArrowNode": "dijitUpArrowButton",
			"downArrowNode": "dijitDownArrowButton"
		},

		adjust: function(val /*=====, delta =====*/){
			// summary:
			//		Overridable function used to adjust a primitive value(Number/Date/...) by the delta amount specified.
			//		The val is adjusted in a way that makes sense to the object type.
			// val: Object
			// delta: Number
			// tags:
			//		protected extension
			return val;
		},

		_arrowPressed: function(/*Node*/ nodePressed, /*Number*/ direction, /*Number*/ increment){
			// summary:
			//		Handler for arrow button or arrow key being pressed
			if(this.disabled || this.readOnly){ return; }
			this._setValueAttr(this.adjust(this.get('value'), direction*increment), false);
			_TextBoxMixin.selectInputText(this.textbox, this.textbox.value.length);
		},

		_arrowReleased: function(/*Node*/ /*===== node =====*/){
			// summary:
			//		Handler for arrow button or arrow key being released
			this._wheelTimer = null;
		},

		_typematicCallback: function(/*Number*/ count, /*DOMNode*/ node, /*Event*/ evt){
			var inc=this.smallDelta;
			if(node == this.textbox){
				var key = evt.charOrCode;
				inc = (key == keys.PAGE_UP || key == keys.PAGE_DOWN) ? this.largeDelta : this.smallDelta;
				node = (key == keys.UP_ARROW || key == keys.PAGE_UP) ? this.upArrowNode : this.downArrowNode;
			}
			if(count == -1){ this._arrowReleased(node); }
			else{ this._arrowPressed(node, (node == this.upArrowNode) ? 1 : -1, inc); }
		},

		_wheelTimer: null,
		_mouseWheeled: function(/*Event*/ evt){
			// summary:
			//		Mouse wheel listener where supported

			event.stop(evt);
			// FIXME: Safari bubbles

			// be nice to DOH and scroll as much as the event says to
			var wheelDelta = evt.wheelDelta / 120;
			if(Math.floor(wheelDelta) != wheelDelta){
				// If not an int multiple of 120, then its touchpad scrolling.
				// This can change very fast so just assume 1 wheel click to make it more manageable.
				wheelDelta = evt.wheelDelta > 0 ? 1 : -1;
			}
			var scrollAmount = evt.detail ? (evt.detail * -1) : wheelDelta;
			if(scrollAmount !== 0){
				var node = this[(scrollAmount > 0 ? "upArrowNode" : "downArrowNode" )];

				this._arrowPressed(node, scrollAmount, this.smallDelta);

				if(this._wheelTimer){
					this._wheelTimer.remove();
				}
				this._wheelTimer = this.defer(function(){ this._arrowReleased(node); }, 50);
			}
		},

		_setConstraintsAttr: function(/*Object*/ constraints){
			this.inherited(arguments);
			if(this.focusNode){ // not set when called from postMixInProperties
				if(this.constraints.min !== undefined){
					this.focusNode.setAttribute("aria-valuemin", this.constraints.min);
				}else{
					this.focusNode.removeAttribute("aria-valuemin");
				}
				if(this.constraints.max !== undefined){
					this.focusNode.setAttribute("aria-valuemax", this.constraints.max);
				}else{
					this.focusNode.removeAttribute("aria-valuemax");
				}
			}
		},

		_setValueAttr: function(/*Number*/ value, /*Boolean?*/ priorityChange){
			// summary:
			//		Hook so set('value', ...) works.

			this.focusNode.setAttribute("aria-valuenow", value);
			this.inherited(arguments);
		},

		postCreate: function(){
			this.inherited(arguments);

			// extra listeners
			this.connect(this.domNode, mouse.wheel, "_mouseWheeled");
			this.own(
				typematic.addListener(this.upArrowNode, this.textbox, {charOrCode:keys.UP_ARROW,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false}, this, "_typematicCallback", this.timeoutChangeRate, this.defaultTimeout, this.minimumTimeout),
				typematic.addListener(this.downArrowNode, this.textbox, {charOrCode:keys.DOWN_ARROW,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false}, this, "_typematicCallback", this.timeoutChangeRate, this.defaultTimeout, this.minimumTimeout),
				typematic.addListener(this.upArrowNode, this.textbox, {charOrCode:keys.PAGE_UP,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false}, this, "_typematicCallback", this.timeoutChangeRate, this.defaultTimeout, this.minimumTimeout),
				typematic.addListener(this.downArrowNode, this.textbox, {charOrCode:keys.PAGE_DOWN,ctrlKey:false,altKey:false,shiftKey:false,metaKey:false}, this, "_typematicCallback", this.timeoutChangeRate, this.defaultTimeout, this.minimumTimeout)
			);
		}
	});
});
