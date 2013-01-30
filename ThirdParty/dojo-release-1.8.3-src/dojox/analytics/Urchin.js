define(["dojo/_base/lang", "dojo/_base/declare", "dojo/_base/window",
        "dojo/_base/config", "dojo/dom-construct"
], function(lang, declare, window, config, construct){

	/*=====
	lang.mixin(config,{
		// urchin: String
		//		Used by `dojox.analytics.Urchin` as the default UA-123456-7 account
		//		number used when being created. Alternately, you can pass an acct:""
		//		parameter to the constructor a la: new dojox.analytics.Urchin({ acct:"UA-123456-7" });
		urchin: ""
	});
	=====*/

	return declare("dojox.analytics.Urchin", null, {
		// summary:
		//		A Google-analytics helper, for post-onLoad inclusion of the tracker, and
		//		dynamic tracking during long-lived page cycles.
		// description:
		//		A small class object will allows for lazy-loading the Google Analytics API
		//		at any point during a page lifecycle. Most commonly, Google-Analytics is loaded
		//		via a synchronous script tag in the body, which causes `dojo.addOnLoad` to
		//		stall until the external API has been completely loaded. The Urchin helper
		//		will load the API on the fly, and provide a convenient API to use, wrapping
		//		Analytics for Ajaxy or single page applications.
		//
		//		The class can be instantiated two ways: Programatically, by passing an
		//		`acct:` parameter, or via Markup / dojoType and defining a djConfig
		//		parameter `urchin:`
		//
		//		IMPORTANT:
		//		This module will not work simultaneously with the core dojox.analytics
		//		package. If you need the ability to run Google Analytics AND your own local
		//		analytics system, you MUST include dojox.analytics._base BEFORE dojox.analytics.Urchin
		// example:
		//	|	// create the tracker programatically:
		//	|	var tracker = new dojox.analytics.Urchin({ acct:"UA-123456-7" });
		//
		// example:
		//	|	// define the urchin djConfig option:
		//	|	var djConfig = { urchin: "UA-123456-7" };
		//	|
		//	|	// and in markup:
		//	|	<div dojoType="dojox.analytics.Urchin"></div>
		//	|	// or code:
		//	|	new dojox.analytics.Urchin();
		//
		// example:
		//	|	// create and define all analytics with one tag.
		//	|	<div dojoType="dojox.analytics.Urchin" acct="UA-12345-67"></div>

		// acct: String
		//		your GA urchin tracker account number. Overrides `djConfig.urchin`
		acct: "",

		constructor: function(args){
			// summary:
			//		Initialize this Urchin instance. Immediately starts the load
			//		sequence, so defer construction until (ideally) after onLoad and
			//		potentially widget parsing.
			this.tracker = null;
			lang.mixin(this, args);
			this.acct = this.acct || config.urchin;

			var re = /loaded|complete/,
				gaHost = ("https:" == window.doc.location.protocol) ? "https://ssl." : "http://www.",
				h = window.doc.getElementsByTagName("head")[0],
				n = construct.create('script', {
					src: gaHost + "google-analytics.com/ga.js"
				}, h);

			n.onload = n.onreadystatechange = lang.hitch(this, function(e){
				if(e && e.type == "load" || re.test(n.readyState)){
					n.onload = n.onreadystatechange = null;
					this._gotGA();
					h.removeChild(n);
				}
			});

		},

		_gotGA: function(){
			// summary:
			//		initialize the tracker
			this.tracker = _gat._getTracker(this.acct);
			this.GAonLoad.apply(this, arguments);
		},

		GAonLoad: function(){
			// summary:
			//		Stub function to fire when urchin is complete
			// description:
			//		This function is executed when the tracker variable is
			//		complete and initialized. The initial trackPageView (with
			//		no arguments) is called here as well, so remeber to call
			//		manually if overloading this method.
			//
			// example:
			//		Create an Urchin tracker that will track a specific page on init
			//		after page load (or parsing, if parseOnLoad is true)
			//	|	dojo.addOnLoad(function(){
			//	|		new dojox.ananlytics.Urchin({
			//	|			acct:"UA-12345-67",
			//	|			GAonLoad: function(){
			//	|				this.trackPageView("/custom-page");
			//	|			}
			//	|		});
			//	|	});
			
			this.trackPageView();
		},

		trackPageView: function(/* string */url){
			// summary:
			//		A public API attached to this widget instance, allowing you
			//		Ajax-like notification of updates.
			// url: String
			//		A location to tell the tracker to track, eg: "/my-ajaxy-endpoint"
			// example:
			//		Track clicks from a container of anchors and populate a `ContentPane`
			//	|	// 'tracker' is our `Urchin` instance, pane is the `ContentPane` ref.
			//	|	dojo.connect(container, "onclick", function(e){
			//	|		var ref = dojo.attr(e.target, "href");
			//	|		tracker.trackPageView(ref);
			//	|		pane.attr("href", ref);
			//	|	});
			
			this.tracker._trackPageview.apply(this.tracker, arguments);
		}

	});
});
