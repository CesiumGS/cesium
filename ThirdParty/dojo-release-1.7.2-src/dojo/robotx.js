define(["dojo", "dojo/robot"], function(dojo) {

dojo.experimental("dojo.robotx");

// loads an external app into an iframe and points dojo.doc to the iframe document, allowing the robot to control it
// to use: set robotURL in djConfig to the URL you want to load
// dojo.require this file

var iframe = null;

var groupStarted=dojo.connect(doh, '_groupStarted', function(){
	dojo.disconnect(groupStarted);
	iframe.style.visibility="visible";
});

var attachIframe = function(){
	dojo.addOnLoad(function(){
		var emptyStyle = {
			overflow: dojo.isWebKit? 'hidden' : 'visible',
			margin: '0px',
			borderWidth: '0px',
			height: '100%',
			width: '100%'
		};
		dojo.style(document.documentElement, emptyStyle);
		dojo.style(document.body, emptyStyle);
		document.body.appendChild(iframe);
		var base=document.createElement('base');
		base.href=iframe.src;
		document.getElementsByTagName("head")[0].appendChild(base);
	});
};

// Prevent race conditions between iframe loading and robot init.
// If iframe is allowed to load while the robot is typing, sync XHRs can prevent the robot from completing its initialization.
var robotReady=false;
var robotFrame=null;
var _run=doh.robot._run;
doh.robot._run = function(frame){
	// Called from robot when the robot completed its initialization.
	robotReady = true;
	robotFrame = frame;
	doh.robot._run = _run;
	// If initRobot was already called, then attach the iframe.
	if(iframe.src){
		attachIframe();
	}
};

var onIframeLoad=function(){
	// initial load handler: update the document and start the tests
	doh.robot._updateDocument();
	onIframeLoad = null;
	var scrollRoot = (document.compatMode == 'BackCompat')? document.body : document.documentElement;
	var consoleHeight = document.getElementById('robotconsole').offsetHeight;
	if(consoleHeight){
		iframe.style.height = (scrollRoot.clientHeight - consoleHeight)+"px";
	}
	// If dojo is present in the test case, then at least make a best effort to wait for it to load.
	// The test must handle other race conditions like initial data queries by itself.
	if(iframe.contentWindow.dojo){
		iframe.contentWindow.dojo.addOnLoad(function(){
			doh.robot._run(robotFrame);
		});
	}else{
		doh.robot._run(robotFrame);
	}
};

var iframeLoad=function(){
	if(onIframeLoad){
		onIframeLoad();
	}
	var unloadConnect = dojo.connect(dojo.body(), 'onunload', function(){
		dojo.global = window;
		dojo.doc = document;
		dojo.disconnect(unloadConnect);
	});
};

// write the firebug console to a place it will fit
dojo.config.debugContainerId = "robotconsole";
dojo.config.debugHeight = dojo.config.debugHeight || 200;
document.write('<div id="robotconsole" style="position:absolute;left:0px;bottom:0px;width:100%;"></div>');

// write the iframe
//document.writeln('<iframe id="robotapplication" style="visibility:hidden; border:0px none; padding:0px; margin:0px; position:absolute; left:0px; top:0px; width:100%; height:100%; z-index: 1;" src="'+dojo.config.robotURL+'" onload="iframeLoad();" ></iframe>');
iframe = document.createElement('iframe');
iframe.setAttribute("ALLOWTRANSPARENCY","true");
iframe.scrolling = dojo.isIE? "yes" : "auto";
dojo.style(iframe,{visibility:'hidden', border:'0px none', padding:'0px', margin:'0px', position:'absolute', left:'0px', top:'0px', width:'100%', height:'100%'});
if(iframe['attachEvent'] !== undefined){
	iframe.attachEvent('onload', iframeLoad);
}else{
	dojo.connect(iframe, 'onload', iframeLoad);
}

dojo.mixin(doh.robot,{
	_updateDocument: function(){
		dojo.setContext(iframe.contentWindow, iframe.contentWindow.document);
		var win = dojo.global;
		if(win.dojo){
			// allow the tests to subscribe to topics published by the iframe
			dojo.publish = win.dojo.publish;
			dojo.subscribe = win.dojo.subscribe;
			dojo.connectPublisher = win.dojo.connectPublisher;  
		}

	},

	initRobot: function(/*String*/ url){
		// summary:
		//		Opens the application at the specified URL for testing, redirecting dojo to point to the application environment instead of the test environment.
		//
		// url:
		//		URL to open. Any of the test's dojo.doc calls (e.g. dojo.byId()), and any dijit.registry calls (e.g. dijit.byId()) will point to elements and widgets inside this application.
		//

		iframe.src=url;
		// see above note about race conditions
		if(robotReady){
			attachIframe();

		}
	},

	waitForPageToLoad: function(/*Function*/ submitActions){
		// summary:
		// 		Notifies DOH that the doh.robot is about to make a page change in the application it is driving,
		//		returning a doh.Deferred object the user should return in their runTest function as part of a DOH test.
		//
		// description:
		// 		Notifies DOH that the doh.robot is about to make a page change in the application it is driving,
		//		returning a doh.Deferred object the user should return in their runTest function as part of a DOH test.
		//		Example:
		//			runTest:function(){
		//				return waitForPageLoad(function(){ doh.robot.keyPress(dojo.keys.ENTER, 500); });
		//			}
		//
		// submitActions:
		//		The doh.robot will execute the actions the test passes into the submitActions argument (like clicking the submit button),
		//		expecting these actions to create a page change (like a form submit).
		//		After these actions execute and the resulting page loads, the next test will start.
		//

		var d = new doh.Deferred();
		// create iframe event handler to track submit progress
		onIframeLoad = function(){
			onIframeLoad = null;
			// set dojo.doc on every page change to point to the iframe doc so the robot works
			doh.robot._updateDocument();
			d.callback(true);
		};
		submitActions();
		return d;
	}

});

return doh.robot;
});
