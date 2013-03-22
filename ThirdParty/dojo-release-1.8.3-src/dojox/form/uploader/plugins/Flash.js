define([
	"dojo/dom-form",
	"dojo/dom-style",
	"dojo/dom-construct",
	"dojo/dom-attr",
	"dojo/_base/declare",
	"dojo/_base/config",
	"dojo/_base/connect",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojox/form/uploader/plugins/HTML5",
	"dojox/embed/Flash"
],function(domForm, domStyle, domConstruct, domAttr, declare, config, connect, lang, array, formUploaderPluginsHTML5, embedFlash){


var pluginsFlash = declare("dojox.form.uploader.plugins.Flash", [], {
	// summary:
	//		A plugin for dojox.form.Uploader that utilizes a Flash SWF for handling to upload in IE.
	//		All other browsers will use the HTML5 plugin, unless force="flash" is used, then Flash
	//		will be used in all browsers. force="flash"	is provided because Flash has some features
	//		that HTML5 does not yet have. But it is still not recommended because of the many problems
	//		that Firefox and Webkit have with the Flash plugin.
	//
	// description:
	//		Inherits all properties from dojox.form.Uploader and formUploaderPluginsHTML5.
	//		All properties and methods listed here are specific to the Flash plugin only.
	//
	//		Version: 1.6

	
	// swfPath:String
	//		Path to SWF. Can be overwritten or provided in djConfig.
	swfPath:config.uploaderPath || require.toUrl("dojox/form/resources/uploader.swf"),

	// skipServerCheck: Boolean
	//		If true, will not verify that the server was sent the correct format.
	//		This can be safely set to true. The purpose of the server side check
	//		is mainly to show the dev if they've implemented the different returns
	//		correctly.
	skipServerCheck:true,

	// serverTimeout:Number (milliseconds)
	//		The amount of time given to the uploaded file
	//		to wait for a server response. After this amount
	//		of time, the onComplete is fired but with a 'server timeout'
	//		error in the returned item.
	serverTimeout: 2000,

	// isDebug: Boolean
	//		If true, outputs traces from the SWF to console. What exactly gets passed
	//		is very relative, and depends upon what traces have been left in the DEFT SWF.
	isDebug:false,

	// devMode: Boolean.
	//		Re-implemented. devMode increases the logging, adding style tracing from the SWF.
	devMode:false,

	// deferredUploading: Number (1 - X)
	//		(Flash only) throttles the upload to a certain amount of files at a time.
	//		By default, Flash uploads file one at a time to the server, but in parallel.
	//		Firefox will try to queue all files at once, leading to problems. Set this
	//		to the amount to upload in parallel at a time.
	//		Generally, 1 should work fine, but you can experiment with queuing more than
	//		one at a time.
	//		This is of course ignored if selectMultipleFiles equals false.
	deferredUploading:0,

	// force: String
	//		Use "flash" to always use Flash (and hopefully force the user to download the plugin
	//		if they don't have it).
	force:"",

	postMixInProperties: function(){
		if(!this.supports("multiple")){
			// Flash will only be used in IE6-8 unless force="flash"
			this.uploadType = "flash";
			this._files = [];
			this._fileMap = {};
			this._createInput = this._createFlashUploader;
			this.getFileList = this.getFlashFileList;
			this.reset = this.flashReset;
			this.upload = this.uploadFlash;
			this.fieldname = "flashUploadFiles"; ///////////////////// this.name
		}
		this.inherited(arguments);
	},

	/*************************
	 *	   Public Events	 *
	 *************************/

	onReady: function(/*dojox/form/FileUploader*/ uploader){
		// summary:
		//		Stub - Fired when embedFlash has created the
		//		Flash object, but it has not necessarilly finished
		//		downloading, and is ready to be communicated with.
	},

	onLoad: function(/*dojox/form/FileUploader*/ uploader){
		// summary:
		//		Stub - SWF has been downloaded 100%.
	},

	onFileChange: function(fileArray){
		// summary:
		//		Stub - Flash-specific event. Fires on each selection of files
		//		and only provides the files selected on that event - not all files
		//		selected, as with HTML5
	},

	onFileProgress: function(fileArray){
		// summary:
		//		Stub - Flash-specific event. Fires on progress of upload
		//		and only provides a file-specific event
	},


	/*************************
	 *	   Public Methods	 *
	 *************************/

	getFlashFileList: function(){
		// summary:
		//		Returns list of currently selected files
		return this._files; // Array
	},

	flashReset: function(){
		this.flashMovie.reset();
		this._files = [];
	},

	/*************************
	 *	   Private Methods	 *
	 *************************/

	uploadFlash: function(/*Object ? */ formData){
		// summary:
		//		Uploads selected files. Alias "upload()" should be used instead.
		// tags:
		//		private
		this.onBegin(this.getFileList());
		formData.returnType = "F";
		this.flashMovie.doUpload(formData);
	},

	_change: function(fileArray){
		this._files = this._files.concat(fileArray);
		array.forEach(fileArray, function(f){
			f.bytesLoaded = 0;
			f.bytesTotal = f.size;
			this._fileMap[f.name+"_"+f.size] = f;
		}, this);
		this.onChange(this._files);
		this.onFileChange(fileArray);
	},
	_complete: function(fileArray){
		var o = this._getCustomEvent();
		o.type = "load";
		this.onComplete(fileArray);
	},
	_progress: function(f){
		this._fileMap[f.name+"_"+f.bytesTotal].bytesLoaded = f.bytesLoaded;
		var o = this._getCustomEvent();
		this.onFileProgress(f);
		this.onProgress(o);
	},
	_error: function(err){
		this.onError(err);
	},
	_onFlashBlur: function(fileArray){
		//console.log("UploaderFlash._onFlashBlur");
	},

	_getCustomEvent: function(){
		var o = {
			bytesLoaded:0,
			bytesTotal:0,
			type:"progress",
			timeStamp:new Date().getTime()
		};


		for(var nm in this._fileMap){
			o.bytesTotal += this._fileMap[nm].bytesTotal;
			o.bytesLoaded += this._fileMap[nm].bytesLoaded;
		}
		o.decimal = o.bytesLoaded / o.bytesTotal;
		o.percent = Math.ceil((o.bytesLoaded / o.bytesTotal)*100)+"%";
		return o; // Object
	},

	_connectFlash: function(){
		// summary:
		//		Subscribing to published topics coming from the
		//		Flash uploader.

		// Sacrificing some readability for compactness. this.id
		// will be on the beginning of the topic, so more than
		// one uploader can be on a page and can have unique calls.

		this._subs = [];
		this._cons = [];

		var doSub = lang.hitch(this, function(s, funcStr){
			this._subs.push(connect.subscribe(this.id + s, this, funcStr));
		});

		doSub("/filesSelected", "_change");
		doSub("/filesUploaded", "_complete");
		doSub("/filesProgress", "_progress");
		doSub("/filesError", "_error");
		doSub("/filesCanceled", "onCancel");
		doSub("/stageBlur", "_onFlashBlur");

		this.connect(this.domNode, "focus", function(){
			// TODO: some kind of indicator that the Flash button is in focus
			this.flashMovie.focus();
			this.flashMovie.doFocus();
		});
		if(this.tabIndex>=0){
			domAttr.set(this.domNode, "tabIndex", this.tabIndex);
		}
	},
	_createFlashUploader: function(){
		// summary:
		//		Internal. Creates Flash Uploader

		var w = this.btnSize.w;
		var h = this.btnSize.h;
		if(!w){
			// FIXME: Commit this
			setTimeout(dojo.hitch(this, function(){
				this._getButtonStyle(this.domNode);
				this._createFlashUploader();
			}), 200);
			return;
		}
		var url = this.getUrl();
		if(url){
			if(url.toLowerCase().indexOf("http")<0 && url.indexOf("/")!=0){
				// Appears to be a relative path. Attempt to
				// convert it to absolute, so it will better
				// target the SWF.
				var loc = window.location.href.split("/");
				loc.pop();
				loc = loc.join("/")+"/";
				url = loc+url;
			}
		}else{
			console.warn("Warning: no uploadUrl provided.");
		}

		this.inputNode = domConstruct.create("div", {className:"dojoxFlashNode"}, this.domNode, "first");
		domStyle.set(this.inputNode, {
			position:"absolute",
			top:"-2px",
			width:w+"px",
			height:h+"px",
			opacity:0
		});



		var args = {
			expressInstall:true,
			path: (this.swfPath.uri || this.swfPath) + "?cb_" + (new Date().getTime()),
			width: w,
			height: h,
			allowScriptAccess:"always",
			allowNetworking:"all",
			vars: {
				uploadDataFieldName: this.flashFieldName || this.name+"Flash",
				uploadUrl: url,
				uploadOnSelect: this.uploadOnSelect,
				deferredUploading:this.deferredUploading || 0,
				selectMultipleFiles: this.multiple,
				id: this.id,
				isDebug: this.isDebug,
				noReturnCheck: this.skipServerCheck,
				serverTimeout:this.serverTimeout
			},
			params: {
				scale:"noscale",
				wmode:"transparent",
				wmode:"opaque",
				allowScriptAccess:"always",
				allowNetworking:"all"
			}

		};

		this.flashObject = new embedFlash(args, this.inputNode);
		this.flashObject.onError = lang.hitch(function(msg){
			console.error("Flash Error: " + msg);
		});
		this.flashObject.onReady = lang.hitch(this, function(){
			this.onReady(this);
		});
		this.flashObject.onLoad = lang.hitch(this, function(mov){
			this.flashMovie = mov;
			this.flashReady = true;

			this.onLoad(this);
		});
		this._connectFlash();
	}
});
dojox.form.addUploaderPlugin(pluginsFlash);


return pluginsFlash;
});
