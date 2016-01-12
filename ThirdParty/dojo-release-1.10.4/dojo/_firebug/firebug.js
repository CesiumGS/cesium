define([
	"../_base/kernel",
	"require",
	"../_base/html",
	"../sniff",
	"../_base/array",
	"../_base/lang",
	"../_base/event",
	"../_base/unload"], function(dojo, require, html, has){

	// module:
	//		dojo/_firebug/firebug
	// summary:
	//		Firebug Lite, the baby brother to Joe Hewitt's Firebug for Mozilla Firefox
	// description:
	//		Opens a console for logging, debugging, and error messages.
	//		Contains partial functionality to Firebug. See function list below.
	//
	//		NOTE:
	//		Firebug is a Firefox extension created by Joe Hewitt (see license). You do not need Dojo to run Firebug.
	//		Firebug Lite is included in Dojo by permission from Joe Hewitt
	//		If you are new to Firebug, or used to the Dojo 0.4 dojo.debug, you can learn Firebug
	//		functionality by reading the function comments below or visiting http://www.getfirebug.com/docs.html
	//
	//		NOTE:
	//		To test Firebug Lite in Firefox:
	//
	//		- FF2: set "console = null" before loading dojo and set djConfig.isDebug=true
	//		- FF3: disable Firebug and set djConfig.isDebug=true
	//
	// example:
	//		Supports inline objects in object inspector window (only simple trace of dom nodes, however)
	//	|	console.log("my object", {foo:"bar"})
	// example:
	//		Option for console to open in popup window
	//	|	var djConfig = {isDebug: true, popup:true };
	// example:
	//		Option for console height (ignored for popup)
	//	|	var djConfig = {isDebug: true, debugHeight:100 }


	var isNewIE = (/Trident/.test(window.navigator.userAgent));
	if(isNewIE){
		// Fixing IE's console
		// IE doesn't insert space between arguments. How annoying.
		var calls = ["log", "info", "debug", "warn", "error"];
		for(var i=0;i<calls.length;i++){
			var m = calls[i];
			if(!console[m] ||console[m]._fake){
				// IE9 doesn't have console.debug method, a fake one is added later
				continue;
			}
			var n = "_"+calls[i];
			console[n] = console[m];
			console[m] = (function(){
				var type = n;
				return function(){
					console[type](Array.prototype.join.call(arguments, " "));
				};
			})();
		}
		// clear the console on load. This is more than a convenience - too many logs crashes it.
		// If closed it throws an error
		try{ console.clear(); }catch(e){}
	}

	if(
		has("ff") ||								// Firefox has Firebug
		has("chrome") ||							// Chrome 3+ has a console
		has("safari") ||							// Safari 4 has a console
		isNewIE ||									// Has the new IE console
		window.firebug ||							// Testing for mozilla firebug lite
		(typeof console != "undefined" && console.firebug) || //The firebug console
		dojo.config.useCustomLogger ||				// Allow custom loggers
		has("air")									// isDebug triggers AIRInsector, not Firebug
	){
		return;
	}

	// don't build firebug in iframes
	try{
		if(window != window.parent){
			// but if we've got a parent logger, connect to it
			if(window.parent["console"]){
				window.console = window.parent.console;
			}
			return;
		}
	}catch(e){/*squelch*/}

	// ***************************************************************************
	// Placing these variables before the functions that use them to avoid a
	// shrinksafe bug where variable renaming does not happen correctly otherwise.

	// most of the objects in this script are run anonomously
	var _firebugDoc = document;
	var _firebugWin = window;
	var __consoleAnchorId__ = 0;

	var consoleFrame = null;
	var consoleBody = null;
	var consoleObjectInspector = null;
	var fireBugTabs = null;
	var commandLine = null;
	var consoleToolbar = null;

	var frameVisible = false;
	var messageQueue = [];
	var groupStack = [];
	var timeMap = {};
	var countMap = {};

	var consoleDomInspector = null;
	var _inspectionMoveConnection;
	var _inspectionClickConnection;
	var _inspectionEnabled = false;
	var _inspectionTimer = null;
	var _inspectTempNode = document.createElement("div");


	var _inspectCurrentNode;
	var _restoreBorderStyle;

	// ***************************************************************************

	window.console = {
		_connects: [],
		log: function(){
			// summary:
			//		Sends arguments to console.
			logFormatted(arguments, "");
		},

		debug: function(){
			// summary:
			//		Sends arguments to console. Missing finctionality to show script line of trace.
			logFormatted(arguments, "debug");
		},

		info: function(){
			// summary:
			//		Sends arguments to console, highlighted with (I) icon.
			logFormatted(arguments, "info");
		},

		warn: function(){
			// summary:
			//		Sends warning arguments to console, highlighted with (!) icon and blue style.
			logFormatted(arguments, "warning");
		},

		error: function(){
			// summary:
			//		Sends error arguments (object) to console, highlighted with (X) icon and yellow style
			//		NEW: error object now displays in object inspector
			logFormatted(arguments, "error");
		},

		assert: function(truth, message){
			// summary:
			//		Tests for true. Throws exception if false.
			if(!truth){
				var args = [];
				for(var i = 1; i < arguments.length; ++i){
					args.push(arguments[i]);
				}

				logFormatted(args.length ? args : ["Assertion Failure"], "error");
				throw message ? message : "Assertion Failure";
			}
		},

		dir: function(obj){
			var str = printObject( obj );
			str = str.replace(/\n/g, "<br />");
			str = str.replace(/\t/g, "&nbsp;&nbsp;&nbsp;&nbsp;");
			logRow([str], "dir");
		},

		dirxml: function(node){
			var html = [];
			appendNode(node, html);
			logRow(html, "dirxml");
		},

		group: function(){
			// summary:
			//		collects log messages into a group, starting with this call and ending with
			//		groupEnd(). Missing collapse functionality
			logRow(arguments, "group", pushGroup);
		},

		groupEnd: function(){
			// summary:
			//		Closes group. See above
			logRow(arguments, "", popGroup);
		},

		time: function(name){
			// summary:
			//		Starts timers assigned to name given in argument. Timer stops and displays on timeEnd(title);
			// example:
			//	|	console.time("load");
			//	|	console.time("myFunction");
			//	|	console.timeEnd("load");
			//	|	console.timeEnd("myFunction");
			timeMap[name] = new Date().getTime();
		},

		timeEnd: function(name){
			// summary:
			//		See above.
			if(name in timeMap){
				var delta = (new Date()).getTime() - timeMap[name];
				logFormatted([name+ ":", delta+"ms"]);
				delete timeMap[name];
			}
		},

		count: function(name){
			// summary:
			//		Not supported
			if(!countMap[name]) countMap[name] = 0;
			countMap[name]++;
			logFormatted([name+": "+countMap[name]]);
		},

		trace: function(_value){
			var stackAmt = _value || 3;
			var f = console.trace.caller; //function that called trace
			console.log(">>> console.trace(stack)");
			for(var i=0;i<stackAmt;i++){
				var func = f.toString();
				var args=[];
				for (var a = 0; a < f.arguments.length; a++){
					args.push(f.arguments[a]);
				}
				if(f.arguments.length){
					console.dir({"function":func, "arguments":args});
				}else{
					console.dir({"function":func});
				}

				f = f.caller;
			}
		},

		profile: function(){
			// summary:
			//		Not supported
			this.warn(["profile() not supported."]);
		},

		profileEnd: function(){ },

		clear: function(){
			// summary:
			//		Clears message console. Do not call this directly
			if(consoleBody){
				while(consoleBody.childNodes.length){
					dojo.destroy(consoleBody.firstChild);
				}
			}
			dojo.forEach(this._connects,dojo.disconnect);
		},

		open: function(){
			// summary:
			//		Opens message console. Do not call this directly
			toggleConsole(true);
		},

		close: function(){
			// summary:
			//		Closes message console. Do not call this directly
			if(frameVisible){
				toggleConsole();
			}
		},
		_restoreBorder: function(){
			if(_inspectCurrentNode){
				_inspectCurrentNode.style.border = _restoreBorderStyle;
			}
		},
		openDomInspector: function(){
			_inspectionEnabled = true;
			consoleBody.style.display = "none";
			consoleDomInspector.style.display = "block";
			consoleObjectInspector.style.display = "none";
			document.body.style.cursor = "pointer";
			_inspectionMoveConnection = dojo.connect(document, "mousemove", function(evt){
				if(!_inspectionEnabled){ return; }
				if(!_inspectionTimer){
					_inspectionTimer = setTimeout(function(){ _inspectionTimer = null; }, 50);
				}else{
					return;
				}
				var node = evt.target;
				if(node && (_inspectCurrentNode !== node)){
					var parent = true;

					console._restoreBorder();
					var html = [];
					appendNode(node, html);
					consoleDomInspector.innerHTML = html.join("");

					_inspectCurrentNode = node;
					_restoreBorderStyle = _inspectCurrentNode.style.border;
					_inspectCurrentNode.style.border = "#0000FF 1px solid";
				}
			});
			setTimeout(function(){
				_inspectionClickConnection = dojo.connect(document, "click", function(evt){
					document.body.style.cursor = "";
					_inspectionEnabled = !_inspectionEnabled;
					dojo.disconnect(_inspectionClickConnection);
					// console._restoreBorder();
				});
			}, 30);
		},
		_closeDomInspector: function(){
			document.body.style.cursor = "";
			dojo.disconnect(_inspectionMoveConnection);
			dojo.disconnect(_inspectionClickConnection);
			_inspectionEnabled = false;
			console._restoreBorder();
		},
		openConsole:function(){
			// summary:
			//		Closes object inspector and opens message console. Do not call this directly
			consoleBody.style.display = "block";
			consoleDomInspector.style.display = "none";
			consoleObjectInspector.style.display = "none";
			console._closeDomInspector();
		},
		openObjectInspector:function(){
			consoleBody.style.display = "none";
			consoleDomInspector.style.display = "none";
			consoleObjectInspector.style.display = "block";
			console._closeDomInspector();
		},
		recss: function(){
			// this is placed in dojo since the console is most likely
			// in another window and dojo is easily accessible
			var i,a,s;a=document.getElementsByTagName('link');
			for(i=0;i<a.length;i++){
				s=a[i];
				if(s.rel.toLowerCase().indexOf('stylesheet')>=0&&s.href){
					var h=s.href.replace(/(&|%5C?)forceReload=\d+/,'');
					s.href=h+(h.indexOf('?')>=0?'&':'?')+'forceReload='+new Date().valueOf();
				}
			}
		}
	};

	// ***************************************************************************

	function toggleConsole(forceOpen){
		frameVisible = forceOpen || !frameVisible;
		if(consoleFrame){
			consoleFrame.style.display = frameVisible ? "block" : "none";
		}
	}

	function focusCommandLine(){
		toggleConsole(true);
		if(commandLine){
			commandLine.focus();
		}
	}

	function openWin(x,y,w,h){
		var win = window.open("","_firebug","status=0,menubar=0,resizable=1,top="+y+",left="+x+",width="+w+",height="+h+",scrollbars=1,addressbar=0");
		if(!win){
			var msg = "Firebug Lite could not open a pop-up window, most likely because of a blocker.\n" +
				"Either enable pop-ups for this domain, or change the djConfig to popup=false.";
			alert(msg);
		}
		createResizeHandler(win);
		var newDoc=win.document;
		//Safari needs an HTML height
		var HTMLstring=	'<html style="height:100%;"><head><title>Firebug Lite</title></head>\n' +
					'<body bgColor="#ccc" style="height:97%;" onresize="opener.onFirebugResize()">\n' +
					'<div id="fb"></div>' +
					'</body></html>';

		newDoc.write(HTMLstring);
		newDoc.close();
		return win;
	}

	function createResizeHandler(wn){
		// summary:
		//		Creates handle for onresize window. Called from script in popup's body tag (so that it will work with IE).
		//

		var d = new Date();
			d.setTime(d.getTime()+(60*24*60*60*1000)); // 60 days
			d = d.toUTCString();

			var dc = wn.document,
				getViewport;

			if (wn.innerWidth){
				getViewport = function(){
					return{w:wn.innerWidth, h:wn.innerHeight};
				};
			}else if (dc.documentElement && dc.documentElement.clientWidth){
				getViewport = function(){
					return{w:dc.documentElement.clientWidth, h:dc.documentElement.clientHeight};
				};
			}else if (dc.body){
				getViewport = function(){
					return{w:dc.body.clientWidth, h:dc.body.clientHeight};
				};
			}


		window.onFirebugResize = function(){

			//resize the height of the console log body
			layout(getViewport().h);

			clearInterval(wn._firebugWin_resize);
			wn._firebugWin_resize = setTimeout(function(){
				var x = wn.screenLeft,
					y = wn.screenTop,
					w = wn.outerWidth  || wn.document.body.offsetWidth,
					h = wn.outerHeight || wn.document.body.offsetHeight;

				document.cookie = "_firebugPosition=" + [x,y,w,h].join(",") + "; expires="+d+"; path=/";

			 }, 5000); //can't capture window.onMove - long timeout gives better chance of capturing a resize, then the move

		};
	}


	/*****************************************************************************/


	function createFrame(){
		if(consoleFrame){
			return;
		}
		toggleConsole(true);
		if(dojo.config.popup){
			var containerHeight = "100%";
			var cookieMatch = document.cookie.match(/(?:^|; )_firebugPosition=([^;]*)/);
			var p = cookieMatch ? cookieMatch[1].split(",") : [2,2,320,480];

			_firebugWin = openWin(p[0],p[1],p[2],p[3]);	// global
			_firebugDoc = _firebugWin.document;			// global

			dojo.config.debugContainerId = 'fb';

			// connecting popup
			_firebugWin.console = window.console;
			_firebugWin.dojo = window.dojo;
		}else{
			_firebugDoc = document;
			containerHeight = (dojo.config.debugHeight || 300) + "px";
		}

		var styleElement = _firebugDoc.createElement("link");
		styleElement.href = require.toUrl("./firebug.css");
		styleElement.rel = "stylesheet";
		styleElement.type = "text/css";
		var styleParent = _firebugDoc.getElementsByTagName("head");
		if(styleParent){
			styleParent = styleParent[0];
		}
		if(!styleParent){
			styleParent = _firebugDoc.getElementsByTagName("html")[0];
		}
		if(has("ie")){
			window.setTimeout(function(){ styleParent.appendChild(styleElement); }, 0);
		}else{
			styleParent.appendChild(styleElement);
		}

		if(dojo.config.debugContainerId){
			consoleFrame = _firebugDoc.getElementById(dojo.config.debugContainerId);
		}
		if(!consoleFrame){
			consoleFrame = _firebugDoc.createElement("div");
			_firebugDoc.body.appendChild(consoleFrame);
		}
		consoleFrame.className += " firebug";
		consoleFrame.id = "firebug";
		consoleFrame.style.height = containerHeight;
		consoleFrame.style.display = (frameVisible ? "block" : "none");

		var buildLink = function(label, title, method, _class){
			return '<li class="'+_class+'"><a href="javascript:void(0);" onclick="console.'+ method +'(); return false;" title="'+title+'">'+label+'</a></li>';
		};
		consoleFrame.innerHTML =
			  '<div id="firebugToolbar">'
			+ '  <ul id="fireBugTabs" class="tabs">'

			+ buildLink("Clear", "Remove All Console Logs", "clear", "")
			+ buildLink("ReCSS", "Refresh CSS without reloading page", "recss", "")

			+ buildLink("Console", "Show Console Logs", "openConsole", "gap")
			+ buildLink("DOM", "Show DOM Inspector", "openDomInspector", "")
			+ buildLink("Object", "Show Object Inspector", "openObjectInspector", "")
			+ ((dojo.config.popup) ? "" : buildLink("Close", "Close the console", "close", "gap"))

			+ '	</ul>'
			+ '</div>'
			+ '<input type="text" id="firebugCommandLine" />'
			+ '<div id="firebugLog"></div>'
			+ '<div id="objectLog" style="display:none;">Click on an object in the Log display</div>'
			+ '<div id="domInspect" style="display:none;">Hover over HTML elements in the main page. Click to hold selection.</div>';


		consoleToolbar = _firebugDoc.getElementById("firebugToolbar");

		commandLine = _firebugDoc.getElementById("firebugCommandLine");
		addEvent(commandLine, "keydown", onCommandLineKeyDown);

		addEvent(_firebugDoc, has("ie") || has("safari") ? "keydown" : "keypress", onKeyDown);

		consoleBody = _firebugDoc.getElementById("firebugLog");
		consoleObjectInspector = _firebugDoc.getElementById("objectLog");
		consoleDomInspector = _firebugDoc.getElementById("domInspect");
		fireBugTabs = _firebugDoc.getElementById("fireBugTabs");
		layout();
		flush();
	}

	dojo.addOnLoad(createFrame);

	function clearFrame(){
		_firebugDoc = null;

		if(_firebugWin.console){
			_firebugWin.console.clear();
		}
		_firebugWin = null;
		consoleFrame = null;
		consoleBody = null;
		consoleObjectInspector = null;
		consoleDomInspector = null;
		commandLine = null;
		messageQueue = [];
		groupStack = [];
		timeMap = {};
	}


	function evalCommandLine(){
		var text = commandLine.value;
		commandLine.value = "";

		logRow([">  ", text], "command");

		var value;
		try{
			value = eval(text);
		}catch(e){
			console.debug(e); // put exception on the console
		}

		console.log(value);
	}

	function layout(h){
		var tHeight = 25; //consoleToolbar.offsetHeight; // tab style not ready on load - throws off layout
		var height = h ?
			h  - (tHeight + commandLine.offsetHeight +25 + (h*.01)) + "px" :
			(consoleFrame.offsetHeight - tHeight - commandLine.offsetHeight) + "px";

		consoleBody.style.top = tHeight + "px";
		consoleBody.style.height = height;
		consoleObjectInspector.style.height = height;
		consoleObjectInspector.style.top = tHeight + "px";
		consoleDomInspector.style.height = height;
		consoleDomInspector.style.top = tHeight + "px";
		commandLine.style.bottom = 0;

		dojo.addOnWindowUnload(clearFrame);
	}

	function logRow(message, className, handler){
		if(consoleBody){
			writeMessage(message, className, handler);
		}else{
			messageQueue.push([message, className, handler]);
		}
	}

	function flush(){
		var queue = messageQueue;
		messageQueue = [];

		for(var i = 0; i < queue.length; ++i){
			writeMessage(queue[i][0], queue[i][1], queue[i][2]);
		}
	}

	function writeMessage(message, className, handler){
		var isScrolledToBottom =
			consoleBody.scrollTop + consoleBody.offsetHeight >= consoleBody.scrollHeight;

		handler = handler||writeRow;

		handler(message, className);

		if(isScrolledToBottom){
			consoleBody.scrollTop = consoleBody.scrollHeight - consoleBody.offsetHeight;
		}
	}

	function appendRow(row){
		var container = groupStack.length ? groupStack[groupStack.length-1] : consoleBody;
		container.appendChild(row);
	}

	function writeRow(message, className){
		var row = consoleBody.ownerDocument.createElement("div");
		row.className = "logRow" + (className ? " logRow-"+className : "");
		row.innerHTML = message.join("");
		appendRow(row);
	}

	function pushGroup(message, className){
		logFormatted(message, className);

		//var groupRow = consoleBody.ownerDocument.createElement("div");
		//groupRow.className = "logGroup";
		var groupRowBox = consoleBody.ownerDocument.createElement("div");
		groupRowBox.className = "logGroupBox";
		//groupRow.appendChild(groupRowBox);
		appendRow(groupRowBox);
		groupStack.push(groupRowBox);
	}

	function popGroup(){
		groupStack.pop();
	}

	// ***************************************************************************

	function logFormatted(objects, className){
		var html = [];

		var format = objects[0];
		var objIndex = 0;

		if(typeof(format) != "string"){
			format = "";
			objIndex = -1;
		}

		var parts = parseFormat(format);

		for(var i = 0; i < parts.length; ++i){
			var part = parts[i];
			if(part && typeof part == "object"){
				part.appender(objects[++objIndex], html);
			}else{
				appendText(part, html);
			}
		}


		var ids = [];
		var obs = [];
		for(i = objIndex+1; i < objects.length; ++i){
			appendText(" ", html);

			var object = objects[i];
			if(object === undefined || object === null ){
				appendNull(object, html);

			}else if(typeof(object) == "string"){
				appendText(object, html);

			}else if(object instanceof Date){
				appendText(object.toString(), html);

			}else if(object.nodeType == 9){
				appendText("[ XmlDoc ]", html);

			}else{
				// Create link for object inspector
				// need to create an ID for this link, since it is currently text
				var id = "_a" + __consoleAnchorId__++;
				ids.push(id);
				// need to save the object, so the arrays line up
				obs.push(object);
				var str = '<a id="'+id+'" href="javascript:void(0);">'+getObjectAbbr(object)+'</a>';

				appendLink( str , html);
			}
		}

		logRow(html, className);

		// Now that the row is inserted in the DOM, loop through all of the links that were just created
		for(i=0; i<ids.length; i++){
			var btn = _firebugDoc.getElementById(ids[i]);
			if(!btn){ continue; }

			// store the object in the dom btn for reference later
			// avoid parsing these objects unless necessary
			btn.obj = obs[i];

			_firebugWin.console._connects.push(dojo.connect(btn, "onclick", function(){

				console.openObjectInspector();

				try{
					printObject(this.obj);
				}catch(e){
					this.obj = e;
				}
				consoleObjectInspector.innerHTML = "<pre>" + printObject( this.obj ) + "</pre>";
			}));
		}
	}

	function parseFormat(format){
		var parts = [];

		var reg = /((^%|[^\\]%)(\d+)?(\.)([a-zA-Z]))|((^%|[^\\]%)([a-zA-Z]))/;
		var appenderMap = {s: appendText, d: appendInteger, i: appendInteger, f: appendFloat};

		for(var m = reg.exec(format); m; m = reg.exec(format)){
			var type = m[8] ? m[8] : m[5];
			var appender = type in appenderMap ? appenderMap[type] : appendObject;
			var precision = m[3] ? parseInt(m[3]) : (m[4] == "." ? -1 : 0);

			parts.push(format.substr(0, m[0][0] == "%" ? m.index : m.index+1));
			parts.push({appender: appender, precision: precision});

			format = format.substr(m.index+m[0].length);
		}

		parts.push(format);

		return parts;
	}

	function escapeHTML(value){
		function replaceChars(ch){
			switch(ch){
				case "<":
					return "&lt;";
				case ">":
					return "&gt;";
				case "&":
					return "&amp;";
				case "'":
					return "&#39;";
				case '"':
					return "&quot;";
			}
			return "?";
		}
		return String(value).replace(/[<>&"']/g, replaceChars);
	}

	function objectToString(object){
		try{
			return object+"";
		}catch(e){
			return null;
		}
	}

	// ***************************************************************************
	function appendLink(object, html){
		// needed for object links - no HTML escaping
		html.push( objectToString(object) );
	}

	function appendText(object, html){
		html.push(escapeHTML(objectToString(object)));
	}

	function appendNull(object, html){
		html.push('<span class="objectBox-null">', escapeHTML(objectToString(object)), '</span>');
	}

	function appendString(object, html){
		html.push('<span class="objectBox-string">&quot;', escapeHTML(objectToString(object)),
			'&quot;</span>');
	}

	function appendInteger(object, html){
		html.push('<span class="objectBox-number">', escapeHTML(objectToString(object)), '</span>');
	}

	function appendFloat(object, html){
		html.push('<span class="objectBox-number">', escapeHTML(objectToString(object)), '</span>');
	}

	function appendFunction(object, html){
		html.push('<span class="objectBox-function">', getObjectAbbr(object), '</span>');
	}

	function appendObject(object, html){
		try{
			if(object === undefined){
				appendNull("undefined", html);
			}else if(object === null){
				appendNull("null", html);
			}else if(typeof object == "string"){
				appendString(object, html);
			}else if(typeof object == "number"){
				appendInteger(object, html);
			}else if(typeof object == "function"){
				appendFunction(object, html);
			}else if(object.nodeType == 1){
				appendSelector(object, html);
			}else if(typeof object == "object"){
				appendObjectFormatted(object, html);
			}else{
				appendText(object, html);
			}
		}catch(e){
			/* squelch */
		}
	}

	function appendObjectFormatted(object, html){
		var text = objectToString(object);
		var reObject = /\[object (.*?)\]/;

		var m = reObject.exec(text);
		html.push('<span class="objectBox-object">', m ? m[1] : text, '</span>');
	}

	function appendSelector(object, html){
		html.push('<span class="objectBox-selector">');

		html.push('<span class="selectorTag">', escapeHTML(object.nodeName.toLowerCase()), '</span>');
		if(object.id){
			html.push('<span class="selectorId">#', escapeHTML(object.id), '</span>');
		}
		if(object.className){
			html.push('<span class="selectorClass">.', escapeHTML(object.className), '</span>');
		}

		html.push('</span>');
	}

	function appendNode(node, html){
		if(node.nodeType == 1){
			html.push(
				'<div class="objectBox-element">',
					'&lt;<span class="nodeTag">', node.nodeName.toLowerCase(), '</span>');

			for(var i = 0; i < node.attributes.length; ++i){
				var attr = node.attributes[i];
				if(!attr.specified){ continue; }

				html.push('&nbsp;<span class="nodeName">', attr.nodeName.toLowerCase(),
					'</span>=&quot;<span class="nodeValue">', escapeHTML(attr.nodeValue),
					'</span>&quot;');
			}

			if(node.firstChild){
				html.push('&gt;</div><div class="nodeChildren">');

				for(var child = node.firstChild; child; child = child.nextSibling){
					appendNode(child, html);
				}

				html.push('</div><div class="objectBox-element">&lt;/<span class="nodeTag">',
					node.nodeName.toLowerCase(), '&gt;</span></div>');
			}else{
				html.push('/&gt;</div>');
			}
		}else if (node.nodeType == 3){
			html.push('<div class="nodeText">', escapeHTML(node.nodeValue),
				'</div>');
		}
	}

	// ***************************************************************************

	function addEvent(object, name, handler){
		if(document.all){
			object.attachEvent("on"+name, handler);
		}else{
			object.addEventListener(name, handler, false);
		}
	}

	function removeEvent(object, name, handler){
		if(document.all){
			object.detachEvent("on"+name, handler);
		}else{
			object.removeEventListener(name, handler, false);
		}
	}

	function cancelEvent(event){
		if(document.all){
			event.cancelBubble = true;
		}else{
			event.stopPropagation();
		}
	}

	function onError(msg, href, lineNo){
		var lastSlash = href.lastIndexOf("/");
		var fileName = lastSlash == -1 ? href : href.substr(lastSlash+1);

		var html = [
			'<span class="errorMessage">', msg, '</span>',
			'<div class="objectBox-sourceLink">', fileName, ' (line ', lineNo, ')</div>'
		];

		logRow(html, "error");
	}


	//After converting to div instead of iframe, now getting two keydowns right away in IE 6.
	//Make sure there is a little bit of delay.
	var onKeyDownTime = new Date().getTime();

	function onKeyDown(event){
		var timestamp = (new Date()).getTime();
		if(timestamp > onKeyDownTime + 200){
			event = dojo.fixEvent(event);
			var keys = dojo.keys;
			var ekc = event.keyCode;
			onKeyDownTime = timestamp;
			if(ekc == keys.F12){
				toggleConsole();
			}else if(
				(ekc == keys.NUMPAD_ENTER || ekc == 76) &&
				event.shiftKey &&
				(event.metaKey || event.ctrlKey)
			){
				focusCommandLine();
			}else{
				return;
			}
			cancelEvent(event);
		}
	}

	function onCommandLineKeyDown(e){
		var dk = dojo.keys;
		if(e.keyCode == 13 && commandLine.value){
			addToHistory(commandLine.value);
			evalCommandLine();
		}else if(e.keyCode == 27){
			commandLine.value = "";
		}else if(e.keyCode == dk.UP_ARROW || e.charCode == dk.UP_ARROW){
			navigateHistory("older");
		}else if(e.keyCode == dk.DOWN_ARROW || e.charCode == dk.DOWN_ARROW){
			navigateHistory("newer");
		}else if(e.keyCode == dk.HOME || e.charCode == dk.HOME){
			historyPosition = 1;
			navigateHistory("older");
		}else if(e.keyCode == dk.END || e.charCode == dk.END){
			historyPosition = 999999;
			navigateHistory("newer");
		}
	}

	var historyPosition = -1;
	var historyCommandLine = null;

	function addToHistory(value){
		var history = cookie("firebug_history");
		history = (history) ? dojo.fromJson(history) : [];
		var pos = dojo.indexOf(history, value);
		if (pos != -1){
			history.splice(pos, 1);
		}
		history.push(value);
		cookie("firebug_history", dojo.toJson(history), 30);
		while(history.length && !cookie("firebug_history")){
			history.shift();
			cookie("firebug_history", dojo.toJson(history), 30);
		}
		historyCommandLine = null;
		historyPosition = -1;
	}

	function navigateHistory(direction){
		var history = cookie("firebug_history");
		history = (history) ? dojo.fromJson(history) : [];
		if(!history.length){
			return;
		}

		if(historyCommandLine === null){
			historyCommandLine = commandLine.value;
		}

		if(historyPosition == -1){
			historyPosition = history.length;
		}

		if(direction == "older"){
			--historyPosition;
			if(historyPosition < 0){
				historyPosition = 0;
			}
		}else if(direction == "newer"){
			++historyPosition;
			if(historyPosition > history.length){
				historyPosition = history.length;
			}
		}

		if(historyPosition == history.length){
			commandLine.value = historyCommandLine;
			historyCommandLine = null;
		}else{
			commandLine.value = history[historyPosition];
		}
	}

	function cookie(name, value){
		var c = document.cookie;
		if(arguments.length == 1){
			var matches = c.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
			return matches ? decodeURIComponent(matches[1]) : undefined; // String or undefined
		}else{
			var d = new Date();
			d.setMonth(d.getMonth()+1);
			document.cookie = name + "=" + encodeURIComponent(value) + ((d.toUtcString) ? "; expires=" + d.toUTCString() : "");
		}
	}

	function isArray(it){
		return it && it instanceof Array || typeof it == "array";
	}

	//***************************************************************************************************
	// Print Object Helpers
	function objectLength(o){
		var cnt = 0;
		for(var nm in o){
			cnt++;
		}
		return cnt;
	}

	function printObject(o, i, txt, used){
		// Recursively trace object, indenting to represent depth for display in object inspector
		var ind = " \t";
		txt = txt || "";
		i = i || ind;
		used = used || [];
		var opnCls;

		if(o && o.nodeType == 1){
			var html = [];
			appendNode(o, html);
			return html.join("");
		}

		var br=",\n", cnt = 0, length = objectLength(o);

		if(o instanceof Date){
			return i + o.toString() + br;
		}
		looking:
		for(var nm in o){
			cnt++;
			if(cnt==length){br = "\n";}
			if(o[nm] === window || o[nm] === document){
				// do nothing
			}else if(o[nm] === null){
				txt += i+nm + " : NULL" + br;
			}else if(o[nm] && o[nm].nodeType){
				if(o[nm].nodeType == 1){
					//txt += i+nm + " : < "+o[nm].tagName+" id=\""+ o[nm].id+"\" />" + br;
				}else if(o[nm].nodeType == 3){
					txt += i+nm + " : [ TextNode "+o[nm].data + " ]" + br;
				}

			}else if(typeof o[nm] == "object" && (o[nm] instanceof String || o[nm] instanceof Number || o[nm] instanceof Boolean)){
				txt += i+nm + " : " + o[nm] + "," + br;

			}else if(o[nm] instanceof Date){
				txt += i+nm + " : " + o[nm].toString() + br;

			}else if(typeof(o[nm]) == "object" && o[nm]){
				for(var j = 0, seen; seen = used[j]; j++){
					if(o[nm] === seen){
						txt += i+nm + " : RECURSION" + br;
						continue looking;
					}
				}
				used.push(o[nm]);

				opnCls = (isArray(o[nm]))?["[","]"]:["{","}"];
				txt += i+nm +" : " + opnCls[0] + "\n";//non-standard break, (no comma)
				txt += printObject(o[nm], i+ind, "", used);
				txt += i + opnCls[1] + br;

			}else if(typeof o[nm] == "undefined"){
				txt += i+nm + " : undefined" + br;
			}else if(nm == "toString" && typeof o[nm] == "function"){
				var toString = o[nm]();
				if(typeof toString == "string" && toString.match(/function ?(.*?)\(/)){
					toString = escapeHTML(getObjectAbbr(o[nm]));
				}
				txt += i+nm +" : " + toString + br;
			}else{
				txt += i+nm +" : "+ escapeHTML(getObjectAbbr(o[nm])) + br;
			}
		}
		return txt;
	}

	function getObjectAbbr(obj){
		// Gets an abbreviation of an object for display in log
		// X items in object, including id
		// X items in an array
		// TODO: Firebug Sr. actually goes by char count
		var isError = (obj instanceof Error);
		if(obj.nodeType == 1){
			return escapeHTML('< '+obj.tagName.toLowerCase()+' id=\"'+ obj.id+ '\" />');
		}
		if(obj.nodeType == 3){
			return escapeHTML('[TextNode: "'+obj.nodeValue+'"]');
		}
		var nm = (obj && (obj.id || obj.name || obj.ObjectID || obj.widgetId));
		if(!isError && nm){ return "{"+nm+"}";	}

		var obCnt = 2;
		var arCnt = 4;
		var cnt = 0;

		if(isError){
			nm = "[ Error: "+(obj.message || obj.description || obj)+" ]";
		}else if(isArray(obj)){
			nm = "[" + obj.slice(0,arCnt).join(",");
			if(obj.length > arCnt){
				nm += " ... ("+obj.length+" items)";
			}
			nm += "]";
		}else if(typeof obj == "function"){
			nm = obj + "";
			var reg = /function\s*([^\(]*)(\([^\)]*\))[^\{]*\{/;
			var m = reg.exec(nm);
			if(m){
				if(!m[1]){
					m[1] = "function";
				}
				nm = m[1] + m[2];
			}else{
				nm = "function()";
			}
		}else if(typeof obj != "object" || typeof obj == "string"){
			nm = obj + "";
		}else{
			nm = "{";
			for(var i in obj){
				cnt++;
				if(cnt > obCnt){ break; }
				nm += i+":"+escapeHTML(obj[i])+"  ";
			}
			nm+="}";
		}

		return nm;
	}

	//*************************************************************************************

	//window.onerror = onError;

	addEvent(document, has("ie") || has("safari") ? "keydown" : "keypress", onKeyDown);

	if(	(document.documentElement.getAttribute("debug") == "true")||
		(dojo.config.isDebug)
	){
		toggleConsole(true);
	}

	dojo.addOnWindowUnload(function(){
		// Erase the globals and event handlers I created, to prevent spurious leak warnings
		removeEvent(document, has("ie") || has("safari") ? "keydown" : "keypress", onKeyDown);
		window.onFirebugResize = null;
		window.console = null;
	});

});
