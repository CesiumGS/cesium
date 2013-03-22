define([
	"dojo/_base/kernel",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"./_base"
], function(dojo){
	dojo.experimental("dojox.timing.Sequence");
	dojo.declare("dojox.timing.Sequence", null, {
		// summary:
		//	This class provides functionality to really sequentialize
		//	function calls. You need to provide a list of functions and
		//	some parameters for each (like: pauseBefore) and they will
		//	be run one after another. This can be very useful for slideshows
		//	or alike things.
		//
		// description:
		//	This array will contain the sequence defines resolved, so that
		// 	ie. repeat:10 will result in 10 elements in the sequence, so
		// 	the repeat handling is easier and we don't need to handle that
		// 	many extra cases. Also the doneFunction, if given is added at the
		// 	end of the resolved-sequences.

	/*=====
		// _defsResolved: Array
		// 	The resolved sequence, for easier handling.
		_defsResolved: [],
	=====*/

		// This is the time to wait before goOn() calls _go(), which
		// mostly results from a pauseAfter for a function that returned
		// false and is later continued by the external goOn() call.
		// The time to wait needs to be waited in goOn() where the
		// sequence is continued.

		// _goOnPause: Integer
		//	The pause to wait before really going on.
		_goOnPause: 0,

		_running: false,

		constructor: function(){
			this._defsResolved = [];
		},

		go: function(/* Array */defs, /* Function|Array? */doneFunction){
			// summary:
			//		Run the passed sequence definition
			// defs: Array
			//		The sequence of actions
			// doneFunction: Function|Array?
			//		The function to call when done
			this._running = true;
			dojo.forEach(defs, function(cur){
				if(cur.repeat > 1){
					var repeat = cur.repeat;
					for(var j = 0; j < repeat; j++){
						cur.repeat = 1;
						this._defsResolved.push(cur);
					}
				}else{
					this._defsResolved.push(cur);
				}
			}, this);
			var last = defs[defs.length - 1];
			if(doneFunction){
				this._defsResolved.push({ func: doneFunction });
			}
			// stop the sequence, this actually just sets this._running to false
			this._defsResolved.push({ func: [this.stop, this] });
			this._curId = 0;
			this._go();
		},

		_go: function(){
			// summary:
			//		Execute one task of this._defsResolved.

			// if _running was set to false stop the sequence, this is the
			// case when i.e. stop() was called.
			if(!this._running){
				return;
			}
			var cur = this._defsResolved[this._curId];
			this._curId += 1;
			// create the function to call, the func property might be an array, which means
			// [function, context, parameter1, parameter2, ...]
			function resolveAndCallFunc(func) {
				var ret = null;
				if(dojo.isArray(func)){
					// Two elements might only be given when the function+context
					// is given, this is nice for using this, ie: [this.func, this]
					if(func.length>2){
						ret = func[0].apply(func[1], func.slice(2));
					}else{
						ret = func[0].apply(func[1]);
					}
				}else{
					ret = func();
				}
				return ret;
			}

			if(this._curId >= this._defsResolved.length){
				resolveAndCallFunc(cur.func); // call the last function, since it is the doneFunction we dont need to handle pause stuff
				// don't go on and call this._go() again, we are done
				return;
			}

			if(cur.pauseAfter){
				if(resolveAndCallFunc(cur.func) !== false){
					setTimeout(dojo.hitch(this, "_go"), cur.pauseAfter);
				}else{
					this._goOnPause = cur.pauseAfter;
				}
			}else if(cur.pauseBefore){
				var x = dojo.hitch(this,function(){
					if(resolveAndCallFunc(cur.func) !== false){
						this._go()
					}
				});
				setTimeout(x, cur.pauseBefore);
			}else{
				if(resolveAndCallFunc(cur.func) !== false){
					this._go();
				}
			}
		},

		goOn: function(){
			// summary:
			//		This method just provides a hook from the outside, so that
			//		an interrupted sequence can be continued.
			if(this._goOnPause){
				setTimeout(dojo.hitch(this, "_go"), this._goOnPause);
				this._goOnPause = 0; // reset it, so if the next one doesnt set it we dont use the old pause
			}else{ this._go(); }
		},

		stop: function(){
			// summary:
			//		Stop the currently running sequence.
			// description:
			//		This can only interrupt the sequence not the last function that
			//		had been started. If the last function was i.e. a slideshow
			//		that is handled inside a function that you have given as
			//		one sequence item it cant be stopped, since it is not controlled
			//		by this object here. In this case it would be smarter to
			//		run the slideshow using a sequence object so you can also stop
			//		it using this method.
			this._running = false;
		}

	});
	return dojox.timing.Sequence;
});
