define([
	"dojo/_base/kernel",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dijit/_Contained",
	"dijit/_WidgetBase",
	"dojo/_base/xhr",
	"./ProgressIndicator"
], function(dojo, array, declare, lang, win, Contained, WidgetBase, xhr, ProgressIndicator){

/*=====
	var Contained = dijit._Contained;
	var WidgetBase = dijit._WidgetBase;
=====*/

	// module:
	//		dojox/mobile/ContentPane
	// summary:
	//		A very simple content pane to embed an HTML fragment.

	return declare("dojox.mobile.ContentPane", [WidgetBase, Contained],{
		// summary:
		//		A very simple content pane to embed an HTML fragment.
		// description:
		//		This widget embeds an HTML fragment and run the parser. onLoad()
		//		is called when parsing is done and the content is ready.
		//		"dojo/_base/xhr" is in the dependency list. Usually this is not
		//		necessary, but there is a case where dojox.mobile custom build
		//		does not contain xhr. Note that this widget does not inherit
		//		from dijit._Container.

		// href: String
		//		URL of the content to embed.
		href: "",

		// content: String
		//		An html fragment to embed.
		content: "",

		// parseOnLoad: Boolean
		//		If true, runs the parser when the load completes.
		parseOnLoad: true,

		// prog: Boolean
		//		If true, shows progress indicator.
		prog: true,

		buildRendering: function(){
			this.inherited(arguments);
			this.domNode.className = "mblContentPane";
			if(!this.containerNode){
				this.containerNode = this.domNode;
			}
		},

		startup: function(){
			if(this._started){ return; }
			if(this.prog){
				this._p = ProgressIndicator.getInstance();
			}
			var parent = this.getParent && this.getParent();
			if(!parent || !parent.resize){ // top level widget
				this.resize();
			}
			this.inherited(arguments);
		},
	
		resize: function(){
			// summary:
			//		Calls resize() of each child widget.
			array.forEach(this.getChildren(), function(child){
				if(child.resize){ child.resize(); }
			});
		},
	
		loadHandler: function(/*String*/response){
			// summary:
			//		A handler called when load completes.
			this.set("content", response);
		},
	
		errorHandler: function(err){
			// summary:
			//		An error handler called when load fails.
			if(this._p){ this._p.stop(); }
		},
	
		onLoad: function(){
			// summary:
			//		Stub method to allow the application to connect to.
			//		Called when parsing is done and the content is ready.
		},
	
		_setHrefAttr: function(/*String*/href){
			var p = this._p;
			if(p){
				win.body().appendChild(p.domNode);
				p.start();
			}
			this.href = href;
			xhr.get({
				url: href,
				handleAs: "text",
				load: lang.hitch(this, "loadHandler"),
				error: lang.hitch(this, "errorHandler")
			});
		},

		_setContentAttr: function(/*String|DomNode*/data){
			this.destroyDescendants();
			if(typeof data === "object"){
				this.domNode.appendChild(data);
			}else{
				this.domNode.innerHTML = data;
			}
			if(this.parseOnLoad){
				dojo.parser.parse(this.domNode);
			}
			if(this._p){ this._p.stop(); }
			this.onLoad();
		}
	});
});
