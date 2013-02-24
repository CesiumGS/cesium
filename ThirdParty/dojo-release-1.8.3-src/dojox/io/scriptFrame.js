define(["dojo/main", "dojo/io/script", "dojo/io/iframe"], function(dojo, ioScript, iframe){
	dojo.deprecated("dojox.io.scriptFrame", "dojo.io.script now supports parallel requests without dojox.io.scriptFrame", "2.0");
	dojo.getObject("io.scriptFrame", true, dojox);

//This module extends dojo.io.script to use an iframe for the dojo.io.script.attach calls
//if the frameDoc argument is passed to dojo.io.script.get(), and if frameDoc is a string (representing
//the DOM ID of an iframe that should be used for the connection. If frameDoc is not a string, then
//it is probably a document object, and dojox.io.scriptFrame should not get involved with the request.
//This is useful in some long-polling comet situations in Firefox and Opera. Those browsers execute scripts
//in DOM order, not network-receive order, so a long-polling script will block other
//dynamically appended scripts from running until it completes. By using an iframe
//for the dojo.io.script requests, this issue can be avoided.

//WARNING: the url argument to dojo.io.script MUST BE relative to the iframe document's location,
//NOT the parent page location. This iframe document's URL will be (dojo.moduleUrl("dojo", "resources/blank.html")
//or djConfig.dojoBlankHtmlUrl (for xdomain loading).

	dojox.io.scriptFrame = {
		_waiters: {},
		_loadedIds: {},

		_getWaiters: function(/*String*/frameId){
			return this._waiters[frameId] || (this._waiters[frameId] = []);
		},

		_fixAttachUrl: function(/*String*/url){
			// summary:
			//		fixes the URL so that
		},

		_loaded: function(/*String*/frameId){
			// summary:
			//		callback used when waiting for a frame to load (related to the usage of
			//		the frameId argument to dojo.io.script.get().
			var waiters = this._getWaiters(frameId);
			this._loadedIds[frameId] = true;
			this._waiters[frameId] = null;

			for(var i = 0; i < waiters.length; i++){
				var ioArgs = waiters[i];
				ioArgs.frameDoc = iframe.doc(dojo.byId(frameId));
				ioScript.attach(ioArgs.id, ioArgs.url, ioArgs.frameDoc);
			}
		}
	};

	//Hold on to the old _canAttach function.
	var oldCanAttach = ioScript._canAttach;
	var scriptFrame = dojox.io.scriptFrame;

	//Define frame-aware _canAttach method on dojo.io.script
	ioScript._canAttach = function(/*Object*/ioArgs){
		// summary:
		//		provides an override of dojo.io.script._canAttach to check for
		//		the existence of a the args.frameDoc property. If it is there, and it is a string,
		//		not a document, then create the iframe with an ID of frameDoc, and use that for the calls.
		//		If frameDoc is a document, then dojox.io.scriptFrame should not get involved.
		var fId = ioArgs.args.frameDoc;

		if(fId && dojo.isString(fId)){
			var frame = dojo.byId(fId);
			var waiters = scriptFrame._getWaiters(fId);
			if(!frame){
				//Need to create frame, but the frame document, which *must* be
				//on the same domain as the page (set djConfig.dojoBlankHtmlUrl
				//if using xdomain loading). Loading of the frame document is asynchronous,
				//so we need to do callback stuff.
				waiters.push(ioArgs);
				iframe.create(fId, dojox._scopeName + ".io.scriptFrame._loaded('" + fId + "');");
			}else{
				//Frame loading could still be happening. Only call attach if the frame has loaded.
				if(scriptFrame._loadedIds[fId]){
					ioArgs.frameDoc = iframe.doc(frame);
					this.attach(ioArgs.id, ioArgs.url, ioArgs.frameDoc);
				}else{
					waiters.push(ioArgs);
				}
			}
			return false;
		}else{
			return oldCanAttach.apply(this, arguments);
		}
	};

	return dojox.io.scriptFrame;
});

