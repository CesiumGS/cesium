define([
	"dojo/_base/declare",
	"dojo/_base/array",
	"dojo/_base/lang",
	"dojo/on",
	"dojo/mouse",
	"dojox/widget/Rotator"
], function(declare, array, lang, on, mouse, Rotator) {

return declare("dojox.widget.AutoRotator", Rotator,{
	// summary:
	//		A rotator that automatically transitions between child nodes.
	// description:
	//		Adds automatic rotating to the dojox.widget.Rotator.  The
	//		AutoRotator has parameters that control how user input can
	//		affect the rotator including a suspend when hovering over the
	//		rotator and pausing when the user manually advances to another
	//		pane.
	// example:
	//	|	<div dojoType="dojox.widget.AutoRotator" duration="3000">
	//	|		<div>
	//	|			Pane 1!
	//	|		</div>
	//	|		<div duration="5000">
	//	|			Pane 2 with an overrided duration!
	//	|		</div>
	//	|	</div>

	// suspendOnHover: Boolean
	//		Pause the rotator when the mouse hovers over it.
	suspendOnHover: false,

	// duration: int
	//		The time in milliseconds before transitioning to the next pane.  The
	//		default value is 4000 (4 seconds).
	duration: 4000,
	
	// autoStart: Boolean
	//		Starts the timer to transition children upon creation.
	autoStart: true,
	
	// pauseOnManualChange: Boolean
	//		Pause the rotator when the pane is changed or a controller's next or
	//		previous buttons are clicked.
	pauseOnManualChange: false,
	
	// cycles: int
	//		Number of cycles before pausing.
	cycles: -1,

	// random: Boolean
	//		Determines if the panes should cycle randomly.
	random: false,

	// reverse: Boolean
	//		Causes the rotator to rotate in reverse order.
	reverse: false,

  constructor: function(){
	// summary:
	//		Initializes the timer and connect to the rotator.

			var _t = this;

			// validate the cycles counter
			if(_t.cycles-0 == _t.cycles && _t.cycles > 0){
				// we need to add 1 because we decrement cycles before the animation starts
				_t.cycles++;
			}else{
				_t.cycles = _t.cycles ? -1 : 0;
			}

			// wire up the mouse hover events
			_t._signals = [
				on(_t._domNode, mouse.enter, function(){
					// temporarily suspend the cycling, but don't officially pause
					// it and don't allow suspending if we're transitioning
					if(_t.suspendOnHover && !_t.anim && !_t.wfe){
						var t = _t._endTime,
							n = _t._now();
						_t._suspended = true;
						_t._resetTimer();
						_t._resumeDuration = t > n ? t - n : 0.01;
					}
				}),

				on(_t._domNode, mouse.leave, function(){
					// if we were playing, resume playback unless were in the
					// middle of a transition
					if(_t.suspendOnHover && !_t.anim){
						_t._suspended = false;
						if(_t.playing && !_t.wfe){
							_t.play(true);
						}
					}
				})
			];

			// everything is ready, so start
			if(_t.autoStart && _t.panes.length > 1){
				// start playing
				_t.play();
			}else{
				// since we're not playing, lets pause
				_t.pause();
			}
		},

		destroy: function(){
			// summary:
			//		Disconnect the AutoRotator's events.
			array.forEach(this._signals, function(signal) { signal.remove(); });
			delete this._signals;
			dojo.forEach(this._connects, dojo.disconnect);
			this.inherited(arguments);
		},

		play: function(/*Boolean?*/skipCycleDecrement, /*Boolean?*/skipDuration){
			// summary:
			//		Sets the state to "playing" and schedules the next cycle to run.
			this.playing = true;
			this._resetTimer();

			// don't decrement the count if we're resuming play
			if(skipCycleDecrement !== true && this.cycles > 0){
				this.cycles--;
			}

			if(this.cycles == 0){
				// we have reached the number of cycles, so pause
				this.pause();
			}else if(!this._suspended){
				this.onUpdate("play");
				// if we haven't been suspended, then grab the duration for this pane and
				// schedule a cycle to be run
				if(skipDuration){
					this._cycle();
				}else{
					var r = (this._resumeDuration || 0)-0,
						u = (r > 0 ? r : (this.panes[this.idx].duration || this.duration))-0;
					// call _cycle() after a duration and pass in false so it isn't manual
					this._resumeDuration = 0;
					this._endTime = this._now() + u;
					this._timer = setTimeout(lang.hitch(this, "_cycle", false), u);
				}
			}
		},

		pause: function(){
			// summary:
			//		Sets the state to "not playing" and clears the cycle timer.
			this.playing = this._suspended = false;
			this.cycles = -1;
			this._resetTimer();

			// notify the controllers we're paused
			this.onUpdate("pause");
		},

		_now: function(){
			// summary:
			//		Helper function to return the current system time in milliseconds.
			return (new Date()).getTime(); // int
		},

		_resetTimer: function(){
			// summary:
			//		Resets the timer used to schedule the next transition.
			clearTimeout(this._timer);
		},

		_cycle: function(/*Boolean|int?*/manual){
			// summary:
			//		Cycles the rotator to the next/previous pane.
			var _t = this,
				i = _t.idx,
				j;

			if(_t.random){
				// make sure we don't randomly pick the pane we're already on
				do{
					j = Math.floor(Math.random() * _t.panes.length + 1);
				}while(j == i);
			}else{
				j = i + (_t.reverse ? -1 : 1)
			}

			// rotate!
			var def = _t.go(j);

			if(def){
				def.addCallback(function(/*Boolean?*/skipDuration){
					_t.onUpdate("cycle");
					if(_t.playing){
						_t.play(false, skipDuration);
					}
				});
			}
		},

		onManualChange: function(/*string*/action){
			// summary:
			//		Override the Rotator's onManualChange so we can pause.

			this.cycles = -1;

			// obviously we don't want to pause if play was just clicked
			if(action != "play"){
				this._resetTimer();
				if(this.pauseOnManualChange){
					this.pause();
				}
			}

			if(this.playing){
				this.play();
			}
		}		
});
});
