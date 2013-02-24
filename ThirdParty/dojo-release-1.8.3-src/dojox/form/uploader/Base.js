define([
	"dojo/dom-form",
	"dojo/dom-style",
	"dojo/dom-construct",
	"dojo/dom-attr",
	"dojo/has",
	"dojo/_base/declare",
	"dojo/_base/event",
	"dijit/_Widget",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin"
],function(domForm, domStyle, domConstruct, domAttr, has, declare, event, Widget, TemplatedMixin, WidgetsInTemplateMixin){

has.add('FormData', function(){return !!window.FormData;});
has.add('xhr-sendAsBinary', function(){var xhr=window.XMLHttpRequest && new window.XMLHttpRequest(); return xhr && !!xhr.sendAsBinary;});
has.add('file-multiple', function(){return !!({'true':1,'false':1}[domAttr.get(document.createElement('input',{type:"file"}), 'multiple')]);});


return declare("dojox.form.uploader.Base", [Widget, TemplatedMixin, WidgetsInTemplateMixin], {
	// summary:
	//		The Base class used for dojox.form.Uploader and dojox.form.uploader.FileList.
	//
	//		Should not be used as a standalone. To be mixed in with other classes.
	//
	//		Version: 1.6

	getForm: function(){
		// summary:
		//		Finds the parent form of the Uploader, if it exists.

		if(!this.form){
			var n = this.domNode;
			while(n && n.tagName && n !== document.body){
				if(n.tagName.toLowerCase() == "form"){
					this.form = n;
					break;
				}
				n = n.parentNode;
			}
		}
		return this.form // Node;
	},

	getUrl: function(){
		// summary:
		//		Finds the URL to upload to, whether it be the action in the parent form, this.url or
		//		this.uploadUrl

		if(this.uploadUrl) this.url = this.uploadUrl;
		if(this.url) return this.url;
		if(this.getForm()) this.url = this.form.action;
		return this.url; // String
	},


	connectForm: function(){
		// summary:
		//		Internal. Connects to form if there is one.

		this.url = this.getUrl();
		if(!this._fcon && !!this.getForm()){
			this._fcon = true;
			this.connect(this.form, "onsubmit", function(evt){
				event.stop(evt);
				this.submit(this.form);
			});
		}
	},

	supports: function(what){
		// summary:
		//		Does feature testing for uploader capabilities. (No browser sniffing - yay)

		switch(what){
			case "multiple":
				if(this.force == "flash" || this.force == "iframe") return false;
				return has("file-multiple");
			case "FormData":
				return has(what);
			case "sendAsBinary":
				return has("xhr-sendAsBinary");
		}
		return false; // Boolean
	},
	getMimeType: function(){
		// summary:
		//		Returns the mime type that should be used in an HTML5 upload form. Return result
		//		may change as the current use is very generic.

		return "application/octet-stream"; //image/gif
	},
	getFileType: function(/*String*/ name){
		// summary:
		//		Gets the extension of a file
		return name.substring(name.lastIndexOf(".")+1).toUpperCase(); // String
	},
	convertBytes: function(bytes){
		// summary:
		//		Converts bytes. Returns an object with all conversions. The "value" property is
		//		considered the most likely desired result.

		var kb = Math.round(bytes/1024*100000)/100000;
		var mb = Math.round(bytes/1048576*100000)/100000;
		var gb = Math.round(bytes/1073741824*100000)/100000;
		var value = bytes;
		if(kb>1) value = kb.toFixed(1)+" kb";
		if(mb>1) value = mb.toFixed(1)+" mb";
		if(gb>1) value = gb.toFixed(1)+" gb";
		return {
			kb:kb,
			mb:mb,
			gb:gb,
			bytes:bytes,
			value: value
		}; // Object
	}
});
});
