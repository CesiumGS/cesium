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


// urlLoaded is a Deferred that will be resolved whenever the iframe passed to initRobot() finishes loading, or reloads
var urlLoaded;

function attachIframe(url){
	// summary:
	//		Create iframe to load external app at specified url.   Iframe gets onload handler to  call onIframeLoad()
	//		when specified URL finishes loading, and also if the iframe loads a different URL in the future.
	// returns:
	//		A Deferred that fires when everything has finished initializing

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
			border: "0px none",
			padding: "0px",
			margin: "0px",
			width: "100%",
			height: consoleHeight ? (scrollRoot.clientHeight - consoleHeight)+"px" : "100%"
		});
		iframe.src = url;

		// Code to handle load event on iframe.  Seems like this should happen before setting iframe src on line above?
		// Also, can't we use on() in all cases, even for old IE?
		if(iframe.attachEvent !== undefined){
			iframe.attachEvent("onload", onIframeLoad);
		}else{
			on(iframe, "load", onIframeLoad);
		}

		construct.place(iframe, win.body(), "first");
	});
}

function onIframeLoad(){
	// summary:
	//		Load handler when iframe specified to initRobot() finishes loading, or when it reloads.
	//		It resolves the urlLoaded Deferred to make the rests of the tests runs.

	robot._updateDocument();

	// If dojo is present in the test case, then at least make a best effort to wait for it to load.
	// The test must handle other race conditions like initial data queries or asynchronous parses by itself.
	if(iframe.contentWindow.require){
		iframe.contentWindow.require(["dojo/ready"], function(ready){
			ready(Infinity, function(){
				setTimeout(function(){
					urlLoaded.resolve(true);
				}, 500);	// 500ms fudge factor; otherwise focus doesn't work on IE8, see ValidationTextBox.js, TimeTextBox.js, etc.
			});
		});
	}else{
		urlLoaded.resolve(true);
	}
}

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
		//		Opens the application at the specified URL for testing, redirecting dojo to point to the application
		//		environment instead of the test environment.
		// url:
		//		URL to open. Any of the test's dojo.doc calls (e.g. dojo.byId()), and any dijit.registry calls
		//		(e.g. dijit.byId()) will point to elements and widgets inside this application.

		doh.registerGroup("initialize robot", {
			name: "load " + url,
			timeout: 100000,	// could take more than 10s so setting to 100s
			runTest: function(){
				// Setup module level urlLoaded Deferred that will be resolved by onIframeLoad(), after the iframe
				// has finished loading
				urlLoaded = new doh.Deferred();
				attachIframe(url);

				return urlLoaded;
			}
		});
	},

	waitForPageToLoad: function(/*Function*/ submitActions){
		// summary:
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

		// Setup a new Deferred that onIframeLoad() will resolve when the iframe finishes loading
		urlLoaded = new doh.Deferred();

		submitActions();

		return urlLoaded;
	}

});

return robot;
});
