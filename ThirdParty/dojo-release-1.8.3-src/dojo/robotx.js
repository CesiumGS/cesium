define([
	"require",
	"doh/main",
	"./aspect",
	"./dom-construct",
	"./dom-style",
	"./_base/kernel",
	"./_base/lang",
	"./on",
	"./robot",
	"./sniff",
	"./_base/window"
], function(require, doh, aspect, construct, style, kernel, lang, on, robot, has, win){

kernel.experimental("dojo.robotx");

// module:
//		dojo.robotx
// description:
//		loads an external app into an iframe and points dojo.doc to the iframe document, allowing the robot to control it
//		to use: set robotURL in djConfig to the URL you want to load
//		dojo.require this file

// The iframe containing the external app
var iframe = null;

// On IE6/7, a firebug console will appear.   Scrunch it a bit to leave room for the external test file.
kernel.config.debugHeight = kernel.config.debugHeight || 200;

// If initRobot() is called before robot has finished initializing, then this is a flag that
// when robot finishes initializing it should create the iframe and point it to this URL.
var iframeUrl;

var groupStarted = aspect.after(doh, "_groupStarted", function(){
	groupStarted.remove();
	iframe.style.visibility = "visible";
}, true);

var iframeLoad;

var attachIframe = function(url){
	// summary:
	//		Create iframe to load external app at specified url, and call iframeLoad() when that URL finishes loading

	require(["./domReady!"], function(){
		var emptyStyle = {
			overflow: "hidden",
			margin: "0px",
			borderWidth: "0px",
			height: "100%",
			width: "100%"
		};
		style.set(document.documentElement, emptyStyle);
		style.set(document.body, emptyStyle);

		// Create the iframe for the external document.   Put it above the firebug-lite div (if such a div exists).
		// console.log("creating iframe for external document");
		iframe = document.createElement("iframe");
		iframe.setAttribute("ALLOWTRANSPARENCY","true");
		iframe.scrolling = has("ie") ? "yes" : "auto";
		var scrollRoot = document.compatMode == "BackCompat" ? document.body : document.documentElement;
		var consoleHeight = (document.getElementById("firebug") || {}).offsetHeight || 0;
		style.set(iframe, {
			visibility: "hidden",
			border: "0px none",
			padding: "0px",
			margin: "0px",
			width: "100%",
			height: consoleHeight ? (scrollRoot.clientHeight - consoleHeight)+"px" : "100%"
		});
		iframe.src = url;
		if(iframe.attachEvent !== undefined){
			iframe.attachEvent("onload", iframeLoad);
		}else{
			on(iframe, "load", iframeLoad);
		}
		construct.place(iframe, win.body(), "first");
	});
};

// Prevent race conditions between iframe loading and robot init.
// If iframe is allowed to load while the robot is typing, sync XHRs can prevent the robot from completing its initialization.
var robotReady = false;
var robotFrame = null;
var _run = robot._run;
robot._run = function(frame){
	// Called from robot when the robot has completed its initialization.
	robotReady = true;
	robotFrame = frame;
	robot._run = _run;

	// If initRobot was already called, then attach the iframe.
	if(iframeUrl){
		attachIframe(iframeUrl);
	}
};

var onIframeLoad = function(){
	// initial load handler: update the document and start the tests
	robot._updateDocument();
	onIframeLoad = null;

	// If dojo is present in the test case, then at least make a best effort to wait for it to load.
	// The test must handle other race conditions like initial data queries by itself.
	if(iframe.contentWindow.require){
		iframe.contentWindow.require(["dojo/ready"], function(ready){
			ready(999, function(){
				robot._run(robotFrame);
			});
		});
	}else{
		robot._run(robotFrame);
	}
};

iframeLoad = function(){
	if(onIframeLoad){
		onIframeLoad();
	}
	var unloadConnect = on(win.body(), "onunload", function(){
		kernel.setContext(window, document);
		unloadConnect.remove();
	});
};

lang.mixin(robot, {
	_updateDocument: function(){
		// summary:
		//		Called every time a new page is loaded into the iframe, to setup variables
		//		Point dojo.global, dojo.publish, etc. to refer to iframe.
		//		Remove for 2.0?

		kernel.setContext(iframe.contentWindow, iframe.contentWindow.document);

		// Also set pointers inside robot, for easy access via AMD (where there is no dojo variable)
		robot.window = iframe.contentWindow;
		robot.doc = iframe.contentWindow.document;

		// TODO: shouldn't this wait until dojo has finished loading in the iframe?  See require code in onIframeLoad().
		var win = kernel.global;
		if(win.dojo){
			// allow the tests to subscribe to topics published by the iframe
			kernel.publish = win.dojo.publish;
			kernel.subscribe = win.dojo.subscribe;
			kernel.connectPublisher = win.dojo.connectPublisher;
		}
	},

	initRobot: function(/*String*/ url){
		// summary:
		//		Opens the application at the specified URL for testing, redirecting dojo to point to the application environment instead of the test environment.
		// url:
		//		URL to open. Any of the test's dojo.doc calls (e.g. dojo.byId()), and any dijit.registry calls (e.g. dijit.byId()) will point to elements and widgets inside this application.

		if(robotReady){
			// If robot has already finished loading then create iframe pointing to specified URL
			attachIframe(url);
		}else{
			// Otherwise, set flag for robot to call attachIframe() when robot finishes initializing
			iframeUrl = url;
		}
	},

	waitForPageToLoad: function(/*Function*/ submitActions){
		// summary:
		//		Notifies DOH that the doh.robot is about to make a page change in the application it is driving,
		//		returning a doh.Deferred object the user should return in their runTest function as part of a DOH test.
		// description:
		//		Notifies DOH that the doh.robot is about to make a page change in the application it is driving,
		//		returning a doh.Deferred object the user should return in their runTest function as part of a DOH test.
		// example:
		// |	runTest: function(){
		// |		return waitForPageLoad(function(){ doh.robot.keyPress(keys.ENTER, 500); });
		// |	}
		// submitActions:
		//		The doh.robot will execute the actions the test passes into the submitActions argument (like clicking the submit button),
		//		expecting these actions to create a page change (like a form submit).
		//		After these actions execute and the resulting page loads, the next test will start.

		var d = new doh.Deferred();
		// create iframe event handler to track submit progress
		onIframeLoad = function(){
			onIframeLoad = null;
			// set dojo.doc on every page change to point to the iframe doc so the robot works
			robot._updateDocument();
			d.callback(true);
		};
		submitActions();
		return d;
	}

});

return robot;
});
