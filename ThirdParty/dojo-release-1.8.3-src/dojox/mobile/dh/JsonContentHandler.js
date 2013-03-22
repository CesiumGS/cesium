define([
	"dojo/_base/kernel",
	"dojo/_base/array",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/Deferred",
	"dojo/json",
	"dojo/dom-construct"
], function(dojo, array, declare, lang, Deferred, json, domConstruct){

	// module:
	//		dojox/mobile/dh/JsonContentHandler

	return declare("dojox.mobile.dh.JsonContentHandler", null, {
		// summary:
		//		A JSON content handler.
		// description:
		//		This module is a content handler that creates a view from JSON
		//		data. If widgets used in the JSON data are not available, they
		//		are loaded automatically before instantiation.
		//
		//		There are two formats as shown in the examples below. You can
		//		choose either of them. The v1.7 format can be more compact, but
		//		if you want multiple widgets at the same level, they must be in
		//		an array. So, you can have, for example, two consecutive
		//		RoundRectLists, but you cannot have, for example,
		//		RoundRectCategory, RoundRectList, RoundRectCategory, and
		//		RoundRectList, because they are keys in one JS object, which
		//		causes conflict. The v1.8 format has no such limitation.
		//
		// example:
		// 	|	// v1.7 format
		//	|	{
		//	|	  "dojox.mobile.View": {
		//	|	    "@id": "view1",
		//	|	    "dojox.mobile.Heading": {
		//	|	      "@back": "Home",
		//	|	      "@moveTo": "home",
		//	|	      "@label": "view1.json"
		//	|	    },
		//	|	    "dojox.mobile.EdgeToEdgeList": {
		//	|	      "dojox.mobile.ListItem": [{
		//	|	        "@label": "Jack Coleman"
		//	|	      }, {
		//	|	        "@label": "James Evans"
		//	|	      }, {
		//	|	        "@label": "Jason Griffin"
		//	|	      }]
		//	|	    }
		//	|	  }
		//	|	}
		//	|	
		// example:
		//	|	// v1.8 format
		//	|	{
		//	|	  "class": "dojox.mobile.View",
		//	|	  "@id": "view1",
		//	|	  "children": [
		//	|	
		//	|	    {
		//	|	      "class": "dojox.mobile.Heading",
		//	|	      "@back": "Home",
		//	|	      "@moveTo": "home",
		//	|	      "@label": "view1.json"
		//	|	    },
		//	|	
		//	|	    {
		//	|	      "class": "dojox.mobile.EdgeToEdgeList",
		//	|	      "children": [
		//	|	        {
		//	|	          "class": "dojox.mobile.ListItem",
		//	|	          "@label": "Jack Coleman"
		//	|	        },
		//	|	        {
		//	|	          "class": "dojox.mobile.ListItem",
		//	|	          "@label": "James Evans"
		//	|	        },
		//	|	        {
		//	|	          "class": "dojox.mobile.ListItem",
		//	|	          "@label": "Jason Griffin"
		//	|	        }
		//	|	      ]
		//	|	    }
		//	|	
		//	|	  ]
		//	|	}
		//	|	
		// example:
		//	|	// SpinWheel in v1.8 format
		//	|	{
		//	|	  "class": "dojox.mobile.View",
		//	|	  "@id": "view1",
		//	|	  "children": [
		//	|	    {
		//	|	      "class": "dojox.mobile.SpinWheel",
		//	|	      "@id": "spin1",
		//	|	      "@style": {"margin":"10px auto","width":"304px"},
		//	|	      "children": [
		//	|	        {
		//	|	          "class": "dojox.mobile.SpinWheelSlot",
		//	|	          "@labels": "A,B,C,D,E",
		//	|	          "@style": {"textAlign":"center","width":"300px"}
		//	|	        }
		//	|	      ]
		//	|	    }
		//	|	  ]
		//	|	}

		parse: function(/*Object*/ content, /*DomNode*/ target, /*DomNode?*/ refNode){
			// summary:
			//		Parses the given data and creates a new view at the given position.
			// content:
			//		Content data for a new view.
			// target:
			//		A DOM node under which a new view is created.
			// refNode:
			//		An optional reference DOM node before which a new view is created.
			var view, container = domConstruct.create("DIV");
			target.insertBefore(container, refNode);
			this._ws = [];
			this._req = [];
			var root = json.parse(content);
			return Deferred.when(this._loadPrereqs(root), lang.hitch(this, function(){
				view = this._instantiate(root, container);
				view.style.visibility = "hidden";
				array.forEach(this._ws, function(w){
					if(!w._started && w.startup){
						w.startup();
					}
				});
				this._ws = null;
				return view.id;
			}));
		},

		_loadPrereqs: function(root){
			// tags:
			//		private
			var d = new Deferred();
			var req = this._collectRequires(root);
			if(req.length === 0){ return true; }

			if(dojo.require){
				array.forEach(req, function(c){
					dojo["require"](c);
				});
				return true;
			}else{
				req = array.map(req, function(s){ return s.replace(/\./g, "/"); });
				require(req, function(){
					d.resolve(true);
				});
			}
			return d;
		},

		_collectRequires: function(obj){
			// tags:
			//		private
			var className = obj["class"];
			for(var key in obj){
				if(key.charAt(0) == "@" || key === "children"){ continue; }
				var cls = className || key.replace(/:.*/, "");
				this._req.push(cls);
				if(!cls){ continue; }
				var objs = className ? [obj] :
						(lang.isArray(obj[key]) ? obj[key] : [obj[key]]);
				for(var i = 0; i < objs.length; i++){
					// process child widgets
					if(!className){
						this._collectRequires(objs[i]);
					}else if(objs[i].children){
						for(var j = 0; j < objs[i].children.length; j++){
							this._collectRequires(objs[i].children[j]);
						}
					}
				}
			}
			return this._req;
		},

		_instantiate: function(/*Object*/obj, /*DomNode*/node, /*Widget*/parent){
			// summary:
			//		Given the evaluated json data, does the same thing as what
			//		the parser does.
			// tags:
			//		private
			var widget;
			var className = obj["class"];
			for(var key in obj){
				if(key.charAt(0) == "@" || key === "children"){ continue; }
				var cls = lang.getObject(className || key.replace(/:.*/, ""));
				if(!cls){ continue; }
				var proto = cls.prototype,
					objs = className ? [obj] :
						(lang.isArray(obj[key]) ? obj[key] : [obj[key]]);
				for(var i = 0; i < objs.length; i++){
					var params = {};
					for(var prop in objs[i]){
						if(prop.charAt(0) == "@"){
							var v = objs[i][prop];
							prop = prop.substring(1);
							var t = typeof proto[prop];
							if(lang.isArray(proto[prop])){
								params[prop] = v.split(/\s*,\s*/);
							}else if(t === "string"){
								params[prop] = v;
							}else if(t === "number"){
								params[prop] = v - 0;
							}else if(t === "boolean"){
								params[prop] = (v !== "false");
							}else if(t === "object"){
								params[prop] = json.parse(v);
							}else if(t === "function"){
								params[prop] = lang.getObject(v, false) || new Function(v);
							}
						}
					}
					widget = new cls(params, node);
					if(node){ // to call View's startup()
						this._ws.push(widget);
					}
					if(parent){
						widget.placeAt(parent.containerNode || parent.domNode);
					}
					// process child widgets
					if(!className){
						this._instantiate(objs[i], null, widget);
					}else if(objs[i].children){
						for(var j = 0; j < objs[i].children.length; j++){
							this._instantiate(objs[i].children[j], null, widget);
						}
					}
				}
			}
			return widget && widget.domNode;
		}
	});
});
