dojo.provide("dojox.widget.DynamicTooltip");
dojo.experimental("dojox.widget.DynamicTooltip");

dojo.require("dijit.Tooltip");
dojo.requireLocalization("dijit", "loading");

dojo.declare("dojox.widget.DynamicTooltip", dijit.Tooltip,
	{
		// summary:
		//		Extention of dijit.Tooltip providing content set via XHR
		//		request via href param

		// hasLoaded: Boolean
		//		false if the contents are yet to be loaded from the HTTP request
		hasLoaded: false,
		
		// href: String
		//		location from where to fetch the contents
		href: "",
		
		// label: String
		//		contents to diplay in the tooltip. Initialized to a loading icon.
		label: "",

		// preventCache: Boolean
		//		Cache content retreived externally
		preventCache:	false,
		
		postMixInProperties: function(){
			this.inherited(arguments);
			this._setLoadingLabel();
		},
		
		_setLoadingLabel: function(){
			// summary:
			//		Changes the tooltip label / contents to loading message, only if
			//		there's an href param, otherwise acts as normal tooltip

			if(this.href){
				this.label = dojo.i18n.getLocalization("dijit", "loading", this.lang).loadingState;
			}
		},

		// MOW: this is a new widget, do we really need a deprecated stub?
		// setHref: function(/*String|Uri*/ href){
		//	// summary:
		//	//		Deprecated.   Use set('href', ...) instead.
		//	dojo.deprecated("dojox.widget.DynamicTooltip.setHref() is deprecated.	Use set('href', ...) instead.", "", "2.0");
		//	return this.set("href", href);
		// },

		_setHrefAttr: function(/*String|Uri*/ href){
			// summary:
			//		Hook so attr("href", ...) works.
			// description:
			//		resets so next show loads new href
			//	href:
			//		url to the content you want to show, must be within the same domain as your mainpage
		
			this.href = href;
			this.hasLoaded = false;
		},
		
		loadContent: function(node){
			// summary:
			//		Download contents of href via XHR and display
			// description:
			//		1. checks if content already loaded
			//		2. if not, sends XHR to download new data
			if(!this.hasLoaded && this.href){
				this._setLoadingLabel();
				this.hasLoaded = true;
				
				dojo.xhrGet({
					url: this.href,
					handleAs: "text",
					tooltipWidget: this,
					load: function(response, ioArgs){
						this.tooltipWidget.label = response;
						this.tooltipWidget.close();
						this.tooltipWidget.open(node);
					},
					preventCache: this.preventCache
				});
			}
		},
		
		refresh: function(){
			// summary:
			//		Allows re-download of contents of href and display
			//		Useful with preventCache = true

			this.hasLoaded = false;
		},
		
		open: function(/*DomNode*/ target){
 			// summary:
			//		Display the tooltip; usually not called directly.
			
			target = target || (this._connectNodes && this._connectNodes[0]);
			if(!target){ return; }

			this.loadContent(target);
			this.inherited(arguments);
		}
	}
);
