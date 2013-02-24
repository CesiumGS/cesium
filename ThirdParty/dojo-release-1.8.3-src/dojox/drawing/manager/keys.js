define(["dojo", "../util/common"], 
function(dojo, utilCommon){
	
	// Ref: isEdit allows events to happen in Drawing, like TextBlocks
	var isEdit = false;
	
	// Ref: enabled = false allows inputs outside of drawing to function
	var enabled = true;
	
	var alphabet = "abcdefghijklmnopqrstuvwxyz";
	
	//dojox.drawing.manager.keys = 
	var keys = {
		// summary:
		//		A singleton, master object that detects
		//		keyboard keys and events
		//		Connect to it like:
		//	|	dojo.connect(this.keys, "onEnter", ....);

		// arrowIncrement: Number
		//		The amount, in pixels, a selected Stencil will
		//		move on an arrow key event
		arrowIncrement:1,

		// arrowShiftIncrement: Number
		//		The amount, in pixels, a selected Stencil will
		//		move on an arrow key + SHIFT event
		arrowShiftIncrement:10,

		// shift: [readonly] Boolean
		//		Indicates whether the Shift key is currently pressed
		shift:false,

		// ctrl: [readonly] Boolean
		//		Indicates whether the Control key is currently pressed
		ctrl:false,

		// alt: [readonly] Boolean
		//		Indicates whether the Alt or Option key is currently pressed
		alt:false,

		// cmmd: [readonly] Boolean
		//		Indicates whether the Apple Command key is currently pressed
		cmmd:false, // apple key

		// meta: [readonly] Boolean
		//		Indicates whether any 'meta' key is currently pressed:
		//		shift || ctrl || cmd || alt
		meta:false, // any meta key
		
		onDelete: function(/* Event */evt){
			// summary:
			//		Event fires when Delete key is released
		},
		onEsc: function(/* Event */evt){
			// summary:
			//		Event fires when ESC key is released
		},
		onEnter: function(/* Event */evt){
			// summary:
			//		Event fires when Enter key is released
		},
		onArrow: function(/* Event */evt){
			// summary:
			//		Event fires when an Arrow key is released
			//		You will have to further check if evt.keyCode
			//		is 37,38,39, or 40
		},
		onKeyDown: function(/* Event */evt){
			// summary:
			//		Event fires when any key is pressed
		},
		onKeyUp: function(/* Event */evt){
			// summary:
			//		Event fires when any key is released
		},
		
		listeners:[],
		register: function(options){
			// summary:
			//		Register an object and callback to be notified
			//		of events.
			//		NOTE: Not really used in code, but should work.
			//		See manager.mouse for similar usage

			var _handle = utilCommon.uid("listener");
			this.listeners.push({
				handle:_handle,
				scope: options.scope || window,
				callback:options.callback,
				keyCode:options.keyCode
			});
		},
		
		_getLetter: function(evt){
			if(!evt.meta && evt.keyCode>=65 && evt.keyCode<=90){
				return alphabet.charAt(evt.keyCode-65);
			}
			return null;
		},
		
		_mixin: function(evt){
			// summary:
			//		Internal. Mixes in key events.
			evt.meta = this.meta;
			evt.shift = this.shift;
			evt.alt = this.alt;
			evt.cmmd = this.cmmd;
			evt.ctrl = this.ctrl;
			evt.letter = this._getLetter(evt);
			return evt;
		},
		
		editMode: function(_isedit){
			// summary:
			//		Relinquishes control of events to another portion
			//		of Drawing; namely the TextBlock.
			isEdit = _isedit;
		},
		
		enable: function(_enabled){
			// summary:
			//		Enables or disables key events, to relinquish
			//		control to something outside of Drawing; input
			//		fields for example.
			//		You may need to call this directly if you are
			//		using textareas or contenteditables.
			//		NOTE: See scanForFields
			enabled = _enabled;
		},
		
		scanForFields: function(){
			// summary:
			//		Scans the document for inputs
			//		and calls this automatically. However you may need
			//		to call this if you create inputs after the fact.

			if(this._fieldCons){
				dojo.forEach(this._fieldCons, dojo.disconnect, dojo);
			}
			this._fieldCons = [];
			dojo.query("input").forEach(function(n){
				var a = dojo.connect(n, "focus", this, function(evt){
					this.enable(false);
				});
				var b = dojo.connect(n, "blur", this, function(evt){
					this.enable(true);
				});
				this._fieldCons.push(a);
				this._fieldCons.push(b);
			}, this);
		
		},
		
		init: function(){
			// summary:
			//		Initialize the keys object

			// a little extra time is needed in some browsers
			setTimeout(dojo.hitch(this, "scanForFields"), 500);
			
			dojo.connect(document, "blur", this, function(evt){
				// when command tabbing to another application, the key "sticks"
				// this clears any key used for such activity
				this.meta = this.shift = this.ctrl = this.cmmd = this.alt = false;
			});
			
			dojo.connect(document, "keydown", this, function(evt){
				if(!enabled){ return; }
				if(evt.keyCode==16){
					this.shift = true;
				}
				if(evt.keyCode==17){
					this.ctrl = true;
				}
				if(evt.keyCode==18){
					this.alt = true;
				}
				if(evt.keyCode==224){
					this.cmmd = true;
				}
				
				this.meta = this.shift || this.ctrl || this.cmmd || this.alt;
				
				if(!isEdit){
					this.onKeyDown(this._mixin(evt));
					if(evt.keyCode==8 || evt.keyCode==46){
						dojo.stopEvent(evt);
					}
				}
			});
			dojo.connect(document, "keyup", this, function(evt){
				if(!enabled){ return; }
				//console.log("KEY UP:", evt.keyCode);
				var _stop = false;
				if(evt.keyCode==16){
					this.shift = false;
				}
				if(evt.keyCode==17){
					this.ctrl = false;
				}
				if(evt.keyCode==18){
					this.alt = false;
				}
				if(evt.keyCode==224){
					this.cmmd = false;
				}
				
				this.meta = this.shift || this.ctrl || this.cmmd || this.alt;
				
				!isEdit && this.onKeyUp(this._mixin(evt));
				
				if(evt.keyCode==13){
					console.warn("KEY ENTER");
					this.onEnter(evt);
					_stop = true;
				}
				if(evt.keyCode==27){
					this.onEsc(evt);
					_stop = true;
				}
				if(evt.keyCode==8 || evt.keyCode==46){
					this.onDelete(evt);
					_stop = true;
				}
				
				if(_stop && !isEdit){
					dojo.stopEvent(evt);
				}
			});
			
			dojo.connect(document, "keypress", this, function(evt){
				if(!enabled){ return; }
				var inc = this.shift ? this.arrowIncrement*this.arrowShiftIncrement : this.arrowIncrement;
				
				var x =0, y =0;
				if(evt.keyCode==32 && !isEdit){ //space
					dojo.stopEvent(evt);
				}
				if(evt.keyCode==37){ //left
					x = -inc;
				}
				if(evt.keyCode==38){ //up
					y = -inc;
				}
				if(evt.keyCode==39){ //right
					x = inc;
				}
				if(evt.keyCode==40){ //down
					y = inc;
				}
				if(x || y){
					evt.x = x;
					evt.y = y;
					evt.shift = this.shift;
					if(!isEdit){
						this.onArrow(evt);
						dojo.stopEvent(evt);
					}
				}
			});
		}
	};
	dojo.addOnLoad(keys, "init");
	return keys;
});
