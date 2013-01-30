define(["dojo/_base/kernel", "dojo/_base/window", "dojo/_base/xhr", "dojo/_base/sniff", "dojo/_base/url", "dojo/domReady!"], function(dojo){
dojo.getObject("io.windowName", true, dojox);
// Implements the window.name transport

dojox.io.windowName = {
	send: function(/*String*/ method, /*dojo.__IoArgs*/ args){
		// summary:
		//		Provides secure cross-domain request capability.
		//		Sends a request using an iframe (POST or GET) and reads the response through the
		//		frame's window.name.
		//
		// method:
		//		The method to use to send the request, GET or POST
		//
		// args:
		//		See dojo.xhr
		//
		//		####args.authElement: DOMNode?
		//
		//		By providing an authElement, this indicates that windowName should use the
		//		authorized window.name protocol, relying on
		//		the loaded XD resource to return to the provided return URL on completion
		//		of authorization/authentication. The provided authElement will be used to place
		//		the iframe in, so the user can interact with the server resource for authentication
		//		and/or authorization to access the resource.
		//
		//		####args.onAuthLoad: Function?
		//
		//		When using authorized access to resources, this function will be called when the
		//		authorization page has been loaded. (When authorization is actually completed,
		//		the deferred callback function is called with the result). The primary use for this
		//		is to make the authElement visible to the user once the resource has loaded
		//		(this can be preferable to showing the iframe while the resource is loading
		//		since it may not require authorization, it may simply return the resource).
		//
		// description:
		//		In order to provide a windowname transport accessible resources/web services, a server
		//		should check for the presence of a parameter window.name=true and if a request includes
		//		such a parameter, it should respond to the request with an HTML
		//		document that sets it's window.name to the string that is to be
		//		delivered to the client. For example, if a client makes a window.name request like:
		// 	|	http://othersite.com/greeting?windowname=true
		//		And server wants to respond to the client with "Hello", it should return an html page:
		//	|	<html><script type="text/javascript">
		//	|	window.name="Hello";
		//	|	</script></html>
		//		One can provide XML or JSON data by simply quoting the data as a string, and parsing the data
		//		on the client.
		//		If you use the authorization window.name protocol, the requester should include an
		//		authElement element in the args, and a request will be created like:
		// 	|	http://othersite.com/greeting?windowname=auth
		//		And the server can respond like this:
		//	|	<html><script type="text/javascript">
		//	|	var loc = window.name;
		//	|	authorizationButton.onclick = function(){
		//	|		window.name="Hello";
		//	|		location = loc;
		//	|	};
		//	|	</script></html>
		//		When using windowName from a XD Dojo build, make sure to set the
		//		dojo.dojoBlankHtmlUrl property to a local URL.
		args.url += (args.url.match(/\?/) ? '&' : '?') + "windowname=" + (args.authElement ? "auth" : true); // indicate our desire for window.name communication
		var authElement = args.authElement;
		var cleanup = function(result){
			try{
				// we have to do this to stop the wait cursor in FF
				var innerDoc = dfd.ioArgs.frame.contentWindow.document;
				innerDoc.write(" ");
				innerDoc.close();
			}catch(e){}
			(authElement || dojo.body()).removeChild(dfd.ioArgs.outerFrame); // clean up
			return result;
		};
		var dfd = dojo._ioSetArgs(args,cleanup,cleanup,cleanup);
		if(args.timeout){
			setTimeout(function(){
					if(dfd.fired == -1){
						dfd.callback(new Error("Timeout"));
					}
				},
				args.timeout
			);
		}
		dojox.io.windowName._send(dfd, method, authElement, args.onAuthLoad);
		return dfd;
	},
	_send: function(dfd, method, authTarget, onAuthLoad){

		var ioArgs = dfd.ioArgs;
		var frameNum = dojox.io.windowName._frameNum++;
		var sameDomainUrl = (dojo.config.dojoBlankHtmlUrl||dojo.config.dojoCallbackUrl||dojo.moduleUrl("dojo", "resources/blank.html")) + "#" + frameNum;
		var frameName = new dojo._Url(window.location, sameDomainUrl);
		var doc = dojo.doc;
		var frameContainer = authTarget || dojo.body();
		function styleFrame(frame){
			frame.style.width="100%";
			frame.style.height="100%";
			frame.style.border="0px";
		}
		if(dojo.isMoz && ![].reduce){
			// FF2 allows unsafe sibling frame modification,
			// the fix for this is to create nested frames with getters and setters to protect access
			var outerFrame = doc.createElement("iframe");
			styleFrame(outerFrame);
			if(!authTarget){
				outerFrame.style.display='none';
			}
			frameContainer.appendChild(outerFrame);

			var firstWindow = outerFrame.contentWindow;
			doc = firstWindow.document;
			doc.write("<html><body margin='0px'><iframe style='width:100%;height:100%;border:0px' name='protectedFrame'></iframe></body></html>");
			doc.close();
			var secondWindow = firstWindow[0];
			firstWindow.__defineGetter__(0,function(){});
			firstWindow.__defineGetter__("protectedFrame",function(){});
			doc = secondWindow.document;
			doc.write("<html><body margin='0px'></body></html>");
			doc.close();
			frameContainer = doc.body;
		}
		var frame;
		if(dojo.isIE){
			var div = doc.createElement("div");
			div.innerHTML = '<iframe name="' + frameName + '" onload="dojox.io.windowName['+frameNum+']()">';
			frame = div.firstChild;
		}else{
			frame = doc.createElement('iframe');
		}
		ioArgs.frame = frame;
		styleFrame(frame);
		ioArgs.outerFrame = outerFrame = outerFrame || frame;
		if(!authTarget){
			outerFrame.style.display='none';
		}
		var state = 0;
		function getData(){
			var data = frame.contentWindow.name;
			if(typeof data == 'string'){
				if(data != frameName){
					state = 2; // we are done now
					dfd.ioArgs.hash = frame.contentWindow.location.hash;
					dfd.callback(data);
				}
			}
		}
		dojox.io.windowName[frameNum] = frame.onload = function(){
			try{
				if(!dojo.isMoz && frame.contentWindow.location =='about:blank'){
					// opera and safari will do an onload for about:blank first, we can ignore this first onload
					return;
				}
			}catch(e){
				// if we are in the target domain, frame.contentWindow.location will throw an ignorable error
			}
			if(!state){
				// we have loaded the target resource, now time to navigate back to our domain so we can read the frame name
				state=1;
				if(authTarget){
					// call the callback so it can make it visible
					if(onAuthLoad){
						onAuthLoad();
					}
				}else{
					// we are doing a synchronous capture, go directly to our same domain URL and retrieve the resource
					frame.contentWindow.location = sameDomainUrl;
				}
			}
			// back to our domain, we should be able to access the frame name now
			try{
				if(state<2){
					getData();
				}
			}
			catch(e){
			}

		};
		frame.name = frameName;
		if(method.match(/GET/i)){
			// if it is a GET we can just the iframe our src url
			dojo._ioAddQueryToUrl(ioArgs);
			frame.src = ioArgs.url;
			frameContainer.appendChild(frame);
			if(frame.contentWindow){
				frame.contentWindow.location.replace(ioArgs.url);
			}
		}else if(method.match(/POST/i)){
			// if it is a POST we will build a form to post it
			frameContainer.appendChild(frame);
			var form = dojo.doc.createElement("form");
			dojo.body().appendChild(form);
			var query = dojo.queryToObject(ioArgs.query);
			for(var i in query){
				var values = query[i];
				values = values instanceof Array ? values : [values];
				for(var j = 0; j < values.length; j++){
					// create hidden inputs for all the parameters
					var input = doc.createElement("input");
					input.type = 'hidden';
					input.name = i;
					input.value = values[j];
					form.appendChild(input);
				}
			}
			form.method = 'POST';
			form.action = ioArgs.url;
			form.target = frameName;// connect the form to the iframe

			form.submit();
			form.parentNode.removeChild(form);
		}else{
			throw new Error("Method " + method + " not supported with the windowName transport");
		}
		if(frame.contentWindow){
			frame.contentWindow.name = frameName; // IE likes it afterwards
		}
	},
	_frameNum: 0

};

return dojox.io.windowName;

});
