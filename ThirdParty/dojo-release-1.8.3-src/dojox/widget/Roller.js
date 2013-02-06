define(["dojo", "dijit", "dijit/_Widget"], function(dojo, dijit){

	dojo.declare("dojox.widget.Roller", dijit._Widget, {
		// summary:
		//		A simple widget to take an unordered-list of Text and roll through them
		// description:
		//		The Roller widget takes an unordered-list of items, and converts
		//		them to a single-area (the size of one list-item, however you so choose
		//		to style it) and loops continually, fading between items.
		//
		//		In it's current state, it requires it be created from an unordered (or ordered)
		//		list, though can contain complex markup.
		//
		//		You can manipulate the `items` array at any point during the cycle with
		//		standard array manipulation techniques.
		//
		//		The class "dojoxRoller" is added to the UL element for styling purposes.
		// example:
		//	|	// create a scroller from a unordered list with id="lister"
		//	|	var thinger = new dojox.widget.Roller.Roller({},"lister");
		//
		// example:
		//	|	// create a scroller from a fixed array, and place in the DOM:
		//	|	new dojox.widget.Roller({ items:["one","two","three"] }).placeAt(dojo.body());
		//
		// example:
		//	|	// add an item:
		//	|	dijit.byId("roller").items.push("I am a new Label");
		//
		// example:
		//	|	// stop a roller from rolling:
		//	|	dijit.byId("roller").stop();
		
		// delay: Integer
		//		Interval between rolls
		delay: 2000,

		// autoStart: Boolean
		//		Toggle to control starup behavior. Call .start() manually
		//		if set to `false`
		autoStart: true,

		// itemSelector: String
		//		A CSS selector to be used by `dojo.query` to find the children
		//		items in this widget. Defaults to "> li", finding only first-children
		//		list-items in the list, allowing for embedded lists to occur.
		itemSelector: "> li",

		// durationIn: Integer
		//		Speed (in ms) to apply to the "in" animation (show the node)
		durationIn: 400,

		// durationOut: Integer
		//		Speed (in ms) to apply to the "out" animation (hide the showing node)
		durationOut: 275,
	/*=====
		// items: Array
		//		If populated prior to instantiation, is used as the Items over the children
		items: [],
	=====*/

		// _idx: Integer
		//		Index of the the currently visible item in the list of items[]
		_idx: -1,

		postCreate: function(){

			// add some instance vars:
			if(!this["items"]){
				this.items = [];
			}

			dojo.addClass(this.domNode,"dojoxRoller");

			// find all the items in this list, and popuplate
			dojo.query(this.itemSelector, this.domNode).forEach(function(item, i){
				this.items.push(item.innerHTML);
				// reuse the first match, destroy the rest
				if(i == 0){
					this._roller = item;
					this._idx = 0;
				}else{ dojo.destroy(item); }
			}, this);

			// handle the case where items[] were passed, and no srcNodeRef exists
			if(!this._roller){
				this._roller = dojo.create('li', null, this.domNode);
			}
			// stub out animation creation (for overloading maybe later)
			this.makeAnims();

			// and start, if true:
			if(this.autoStart){ this.start(); }

		},

		makeAnims: function(){
			// summary:
			//		Animation creator function. Need to create an 'in' and 'out'
			//		Animation stored in _anim Object, which the rest of the widget
			//		will reuse.
			var n = this.domNode;
			dojo.mixin(this, {
				_anim: {
					"in": dojo.fadeIn({ node:n, duration: this.durationIn }),
					"out": dojo.fadeOut({ node:n, duration: this.durationOut })
				}
			});
			this._setupConnects();

		},

		_setupConnects: function(){
			// summary:
			//		setup the loop connection logic
			var anim = this._anim;

			this.connect(anim["out"], "onEnd", function(){
				// onEnd of the `out` animation, select the next items and play `in` animation
				this._setIndex(this._idx + 1);
				anim["in"].play(15);
			});

			this.connect(anim["in"], "onEnd", function(){
				// onEnd of the `in` animation, call `start` again after some delay:
				this._timeout = setTimeout(dojo.hitch(this, "_run"), this.delay);
			});
		},

		start: function(){
			// summary:
			//		Starts to Roller looping
			if(!this.rolling){
				this.rolling = true;
				this._run();
			}
		},

		_run: function(){
			this._anim["out"].gotoPercent(0, true);
		},

		stop: function(){
			// summary:
			//		Stops the Roller from looping anymore.
			this.rolling = false;

			var m = this._anim,
				t = this._timeout;

			if(t){ clearTimeout(t); }
			m["in"].stop();
			m["out"].stop();
		},

		_setIndex: function(i){
			// summary:
			//		Set the Roller to some passed index. If beyond range, go to first.
			var l = this.items.length - 1;
			if(i < 0){ i = l; }
			if(i > l){ i = 0; }
			this._roller.innerHTML = this.items[i] || "error!";
			this._idx = i;
		}

	});

	dojo.declare("dojox.widget.RollerSlide", dojox.widget.Roller, {
		// summary:
		//		An add-on to the Roller to modify animations. This produces
		//		a slide-from-bottom like effect. See `dojox.widget.Roller` for
		//		full API information.

		durationOut: 175, // slightly faster than default

		makeAnims: function(){
			// summary:
			//		Animation creator function. Need to create an 'in' and 'out'
			//		Animation stored in _anim Object, which the rest of the widget
			//		will reuse.

			var n = this.domNode, pos = "position",
				props = {
					top: { end: 0, start: 25 },
					opacity: 1
				}
			;

			dojo.style(n, pos, "relative");
			dojo.style(this._roller, pos, "absolute");

			dojo.mixin(this, {
				_anim: {

					"in": dojo.animateProperty({
						node: n,
						duration: this.durationIn,
						properties: props
					}),

					"out": dojo.fadeOut({ node: n, duration: this.durationOut })
				}
			});
			// don't forget to do this in the class. override if necessary.
			this._setupConnects();
		}

	});

	dojo.declare("dojox.widget._RollerHover", null, {
		// summary:
		//		A mixin class to provide a way to automate the "stop on hover" functionality.
		//
		// description:
		//		A mixin class used to provide a way to automate a "stop on hover" behavior,
		//		while still allowing for ambigious subclassing for custom animations.
		//		Simply mix this class into a `dojox.widget.Roller` variant, and instantiate
		//		as you would. The hover connection is done automatically.
		//
		//		The "hover" functionality is as such: Stop rotation while the mouse is over the
		//		instance, and resume again once leaving. Even if autoStart is disabled, the widget
		//		will start if a mouse enters and leaves the node in this case.
		//
		// example:
		// |	dojo.declare("my.Roller", [dojox.widget.RollerSlide, dojox.widget._RollerHover], {});
		// |	new my.Roller({}, "myList");

		postCreate: function(){
			this.inherited(arguments);
			this.connect(this.domNode, "onmouseenter", "stop");
			this.connect(this.domNode, "onmouseleave", "start");
		}

	});
	
	return dojox.widget.Roller;
	
});
