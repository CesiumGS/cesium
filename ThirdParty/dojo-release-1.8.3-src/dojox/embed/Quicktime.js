define([
	"dojo/_base/kernel",
	"dojo/_base/lang",
	"dojo/_base/sniff",
	"dojo/_base/window",
	"dojo/dom",
	"dojo/dom-construct",
	"dojo/domReady!" // fixes doc.readyState in Fx<=3.5
], function (dojo, lang, has, windowUtil, domUtil, domConstruct) {
	// module:
	//		dojox/embed/Quicktime
	// summary:
	//		Base functionality to insert a QuickTime movie
	//		into a document on the fly.

	var qtMarkup,
		qtVersion = { major: 0, minor: 0, rev: 0 },
		installed,
		__def__ = {
			width: 320,
			height: 240,
			redirect: null
		},
		keyBase = "dojox-embed-quicktime-",
		keyCount = 0,
		getQTMarkup = 'This content requires the <a href="http://www.apple.com/quicktime/download/" title="Download and install QuickTime.">QuickTime plugin</a>.',
		embed = dojo.getObject("dojox.embed", true);

	//	*** private methods *********************************************************
	function prep(kwArgs){
		kwArgs = dojo.mixin(lang.clone(__def__), kwArgs || {});
		if(!("path" in kwArgs) && !kwArgs.testing){
			console.error("dojox.embed.Quicktime(ctor):: no path reference to a QuickTime movie was provided.");
			return null;
		}
		if(kwArgs.testing){
			kwArgs.path = "";
		}
		if(!("id" in kwArgs)){
			kwArgs.id = keyBase + keyCount++;
		}
		return kwArgs;
	}

	if(has("ie")){
		installed = (function(){
			try{
				var o = new ActiveXObject("QuickTimeCheckObject.QuickTimeCheck.1");
				if(o!==undefined){
					//	pull the qt version too
					var v = o.QuickTimeVersion.toString(16);
					function p(i){ return (v.substring(i, i+1)-0) || 0; }
					qtVersion = {
						major: p(0),
						minor: p(1),
						rev: p(2)
					};
					return o.IsQuickTimeAvailable(0);
				}
			} catch(e){ }
			return false;
		})();

		qtMarkup = function(kwArgs){
			if(!installed){ return { id: null, markup: getQTMarkup }; }
			
			kwArgs = prep(kwArgs);
			if(!kwArgs){ return null; }
			var s = '<object classid="clsid:02BF25D5-8C17-4B23-BC80-D3488ABDDC6B" '
				+ 'codebase="http://www.apple.com/qtactivex/qtplugin.cab#version=6,0,2,0" '
				+ 'id="' + kwArgs.id + '" '
				+ 'width="' + kwArgs.width + '" '
				+ 'height="' + kwArgs.height + '">'
				+ '<param name="src" value="' + kwArgs.path + '"/>';
			for(var p in kwArgs.params||{}){
				s += '<param name="' + p + '" value="' + kwArgs.params[p] + '"/>';
			}
			s += '</object>';
			return { id: kwArgs.id, markup: s };
		}
	} else {
		installed = (function(){
			for(var i=0, p=navigator.plugins, l=p.length; i<l; i++){
				if(p[i].name.indexOf("QuickTime")>-1){
					return true;
				}
			}
			return false;
		})();

		qtMarkup = function(kwArgs){
			if(!installed){ return { id: null, markup: getQTMarkup }; }

			kwArgs = prep(kwArgs);
			if(!kwArgs){ return null; }
			var s = '<embed type="video/quicktime" src="' + kwArgs.path + '" '
				+ 'id="' + kwArgs.id + '" '
				+ 'name="' + kwArgs.id + '" '
				+ 'pluginspage="www.apple.com/quicktime/download" '
				+ 'enablejavascript="true" '
				+ 'width="' + kwArgs.width + '" '
				+ 'height="' + kwArgs.height + '"';
			for(var p in kwArgs.params||{}){
				s += ' ' + p + '="' + kwArgs.params[p] + '"';
			}
			s += '></embed>';
			return { id: kwArgs.id, markup: s };
		}
	}

	/*=====
	var __QTArgs = {
		// path: String
		//		The URL of the movie to embed.
		// id: String?
		//		A unique key that will be used as the id of the created markup.  If you don't
		//		provide this, a unique key will be generated.
		// width: Number?
		//		The width of the embedded movie; the default value is 320px.
		// height: Number?
		//		The height of the embedded movie; the default value is 240px
		// params: Object?
		//		A set of key/value pairs that you want to define in the resultant markup.
		// redirect: String?
		//		A url to redirect the browser to if the current QuickTime version is not supported.
	};
	=====*/

	var Quicktime=function(/* __QTArgs */kwArgs, /* DOMNode */node){
		// summary:
		//		Returns a reference to the HTMLObject/HTMLEmbed that is created to
		//		place the movie in the document.  You can use this either with or
		//		without the new operator.  Note that with any other DOM manipulation,
		//		you must wait until the document is finished loading before trying
		//		to use this.
		//
		// example:
		//		Embed a QuickTime movie in a document using the new operator, and get a reference to it.
		//	|	var movie = new dojox.embed.Quicktime({
		//	|		path: "path/to/my/movie.mov",
		//	|		width: 400,
		//	|		height: 300
		//	|	}, myWrapperNode);
		//
		// example:
		//		Embed a movie in a document without using the new operator.
		//	|	var movie = dojox.embed.Quicktime({
		//	|		path: "path/to/my/movie.mov",
		//	|		width: 400,
		//	|		height: 300
		//	|	}, myWrapperNode);

		return Quicktime.place(kwArgs, node);	//	HTMLObject
	};

	dojo.mixin(Quicktime, {
		// summary:
		//		A singleton object used internally to get information
		//		about the QuickTime player available in a browser, and
		//		as the factory for generating and placing markup in a
		//		document.
		//
		// minSupported: Number
		//		The minimum supported version of the QuickTime Player, defaults to
		//		6.
		// available: Boolean
		//		Whether or not QuickTime is available.
		// supported: Boolean
		//		Whether or not the QuickTime Player installed is supported by
		//		dojox.embed.
		// version: Object
		//		The version of the installed QuickTime Player; takes the form of
		//		{ major, minor, rev }.  To get the major version, you'd do this:
		//		var v=dojox.embed.Quicktime.version.major;
		// initialized: Boolean
		//		Whether or not the QuickTime engine is available for use.
		// onInitialize: Function
		//		A stub you can connect to if you are looking to fire code when the
		//		engine becomes available.  A note: do NOT use this stub to embed
		//		a movie in your document; this WILL be fired before DOMContentLoaded
		//		is fired, and you will get an error.  You should use dojo.addOnLoad
		//		to place your movie instead.

		minSupported: 6,
		available: installed,
		supported: installed,
		version: qtVersion,
		initialized: false,
		onInitialize: function(){
			Quicktime.initialized = true;
		},	//	stub function to let you know when this is ready

		place: function(kwArgs, node){
			var o = qtMarkup(kwArgs);

			if(!(node = domUtil.byId(node))){
				node=domConstruct.create("div", { id:o.id+"-container" }, windowUtil.body());
			}
			
			if(o){
				node.innerHTML = o.markup;
				if(o.id){
					return has("ie") ? dom.byId(o.id) : document[o.id];	//	QuickTimeObject
				}
			}
			return null;	//	QuickTimeObject
		}
	});

	//	go get the info
	if(!has("ie")){
		var id = "-qt-version-test",
			o = qtMarkup({ testing:true , width:4, height:4 }),
			c = 10, // counter to prevent infinite looping
			top = "-1000px",
			widthHeight = "1px";

		function getVer(){
			setTimeout(function(){
				var qt = document[o.id],
					n = domUtil.byId(id);

				if(qt){
					try{
						var v = qt.GetQuickTimeVersion().split(".");
						Quicktime.version = { major: parseInt(v[0]||0), minor: parseInt(v[1]||0), rev: parseInt(v[2]||0) };
						if((Quicktime.supported = v[0])){
							Quicktime.onInitialize();
						}
						c = 0;
					} catch(e){
						if(c--){
							getVer();
						}
					}
				}

				if(!c && n){ domConstruct.destroy(n); }
			}, 20);
		}

		domConstruct.create("div", {
			innerHTML: o.markup,
			id: id,
			style: { top:top, left:0, width:widthHeight, height:widthHeight, overflow:"hidden", position:"absolute" }
		}, windowUtil.body());
		getVer();
	}else if(has("ie") && installed){
		// we already know if IE has QuickTime installed, but we need this to seem like a callback.
		setTimeout(function(){
			Quicktime.onInitialize();
		}, 10);
	}

	lang.setObject("dojox.embed.Quicktime", Quicktime);

	return Quicktime;
});
