define([
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojo/dom-geometry",
	"dojo/dom-style",
	"dojo/window",
	"dijit/form/_AutoCompleterMixin",
	"dijit/popup",
	"./_ComboBoxMenu",
	"./TextBox",
	"./sniff"
], function(kernel, declare, lang, win, domGeometry, domStyle, windowUtils, AutoCompleterMixin, popup, ComboBoxMenu, TextBox, has){
	kernel.experimental("dojox.mobile.ComboBox"); // should be using a more native search-type UI

	/*=====
		TextBox = dojox.mobile.TextBox;
		AutoCompleterMixin = dijit.form._AutoCompleterMixin;
	=====*/
	return declare("dojox.mobile.ComboBox", [TextBox, AutoCompleterMixin], {
		// summary:
		//		A non-templated auto-completing text box widget
		//

		// dropDownClass: [protected extension] String
		//		Name of the dropdown widget class used to select a date/time.
		//		Subclasses should specify this.
		dropDownClass: "dojox.mobile._ComboBoxMenu",

		// initially disable selection since iphone displays selection handles that makes it hard to pick from the list
		selectOnClick: false,
		autoComplete: false,

		// dropDown: [protected] Widget
		//		The widget to display as a popup.  This widget *must* be
		//		defined before the startup function is called.
		dropDown: null,

		// maxHeight: [protected] Integer
		//		The max height for our dropdown.
		//		Any dropdown taller than this will have scrollbars.
		//		Set to -1 to limit height to available space in viewport
		maxHeight: -1,

		// dropDownPosition: [const] String[]
		//		This variable controls the position of the drop down.
		//		It's an array of strings with the following values:
		//
		//			* before: places drop down to the left of the target node/widget, or to the right in
		//			  the case of RTL scripts like Hebrew and Arabic
		//			* after: places drop down to the right of the target node/widget, or to the left in
		//			  the case of RTL scripts like Hebrew and Arabic
		//			* above: drop down goes above target node
		//			* below: drop down goes below target node
		//
		//		The list is positions is tried, in order, until a position is found where the drop down fits
		//		within the viewport.
		//
		dropDownPosition: ["below","above"],

		_throttleOpenClose: function(){
			// prevent open/close in rapid succession
			if(this._throttleHandler){
				clearTimeout(this._throttleHandler);
			}
			this._throttleHandler = setTimeout(lang.hitch(this, function(){ this._throttleHandler = null; }), 500);
		},

		_onFocus: function(){
			this.inherited(arguments);
			if(!this._opened && !this._throttleHandler){
				this._startSearchAll(); // show dropdown if user is selecting Next/Previous from virtual keyboard
			}
		},

		onInput: function(e){
			this._onKey(e);
			this.inherited(arguments);
		},

		_setListAttr: function(v){
			this._set('list', v); // needed for Firefox 4+ to prevent HTML5 mode
		},

		closeDropDown: function(){
			// summary:
			//		Closes the drop down on this widget
			// tags:
			//		protected

			this._throttleOpenClose();
			if(this.startHandler){
				this.disconnect(this.startHandler);
				this.startHandler = null;
				if(this.moveHandler){ this.disconnect(this.moveHandler); }
				if(this.endHandler){ this.disconnect(this.endHandler); }
			}
			this.inherited(arguments);
			popup.close(this.dropDown);
			this._opened = false;
		},

		openDropDown: function(){
			// summary:
			//		Opens the dropdown for this widget.   To be called only when this.dropDown
			//		has been created and is ready to display (ie, it's data is loaded).
			// returns:
			//		return value of popup.open()
			// tags:
			//		protected

			var wasClosed = !this._opened;
			var dropDown = this.dropDown,
				ddNode = dropDown.domNode,
				aroundNode = this.domNode,
				self = this;


			// TODO: isn't maxHeight dependent on the return value from popup.open(),
			// ie, dependent on how much space is available (BK)

			if(!this._preparedNode){
				this._preparedNode = true;
				// Check if we have explicitly set width and height on the dropdown widget dom node
				if(ddNode.style.width){
					this._explicitDDWidth = true;
				}
				if(ddNode.style.height){
					this._explicitDDHeight = true;
				}
			}

			// Code for resizing dropdown (height limitation, or increasing width to match my width)
			var myStyle = {
				display: "",
				overflow: "hidden",
				visibility: "hidden"
			};
			if(!this._explicitDDWidth){
				myStyle.width = "";
			}
			if(!this._explicitDDHeight){
				myStyle.height = "";
			}
			domStyle.set(ddNode, myStyle);

			// Figure out maximum height allowed (if there is a height restriction)
			var maxHeight = this.maxHeight;
			if(maxHeight == -1){
				// limit height to space available in viewport either above or below my domNode
				// (whichever side has more room)
				var viewport = windowUtils.getBox(),
					position = domGeometry.position(aroundNode, false);
				maxHeight = Math.floor(Math.max(position.y, viewport.h - (position.y + position.h)));
			}

			// Attach dropDown to DOM and make make visibility:hidden rather than display:none
			// so we call startup() and also get the size
			popup.moveOffScreen(dropDown);

			if(dropDown.startup && !dropDown._started){
				dropDown.startup(); // this has to be done after being added to the DOM
			}
			// Get size of drop down, and determine if vertical scroll bar needed
			var mb = domGeometry.position(this.dropDown.containerNode, false);
			var overHeight = (maxHeight && mb.h > maxHeight);
			if(overHeight){
				mb.h = maxHeight;
			}

			// Adjust dropdown width to match or be larger than my width
			mb.w = Math.max(mb.w, aroundNode.offsetWidth);
			domGeometry.setMarginBox(ddNode, mb);

			var retVal = popup.open({
				parent: this,
				popup: dropDown,
				around: aroundNode,
				orient: this.dropDownPosition,
				onExecute: function(){
					self.closeDropDown();
				},
				onCancel: function(){
					self.closeDropDown();
				},
				onClose: function(){
					self._opened = false;
				}
			});
			this._opened=true;

			if(wasClosed){
				if(retVal.aroundCorner.charAt(0) == 'B'){ // is popup below?
					this.domNode.scrollIntoView(true); // scroll to top
				}
				this.startHandler = this.connect(win.doc.documentElement, has('touch') ? "ontouchstart" : "onmousedown",
					lang.hitch(this, function(){
						var isMove = false;
						this.moveHandler = this.connect(win.doc.documentElement, has('touch') ? "ontouchmove" : "onmousemove", function(){ isMove = true; });
						this.endHandler = this.connect(win.doc.documentElement, has('touch') ? "ontouchend" : "onmouseup", function(){ if(!isMove){ this.closeDropDown(); } });
					})
				);
			}
			return retVal;
		},

		postCreate: function(){
			this.inherited(arguments);
			this.connect(this.domNode, "onclick", "_onClick");
		},

		_onClick: function(/*Event*/ e){
			// throttle clicks to prevent double click from doing double actions
			if(!this._throttleHandler){
				if(this.opened){
					this.closeDropDown();
				}else{
					this._startSearchAll();
				}
			}
		}
	});
});
