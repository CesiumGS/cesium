define([
	"dojo/_base/kernel",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/connect",
	"dojo/_base/window",
	"dojo/dom-style",
	"dojo/dom-geometry",
	"dojo/dom-attr",
	"dojo/dom-construct",
	"dojo/dom-form",
	"dijit",
	"dijit/form/Button",
	"dojox/form/uploader/Base",
	"dojo/i18n!./nls/Uploader",
	"dojo/text!./resources/Uploader.html"
],function(kernel, declare, lang, array, connect, win, domStyle, domGeometry, domAttr, domConstruct, domForm, dijit, Button, uploader, res, template){

	kernel.experimental("dojox.form.Uploader");

	// TODO:
	//		i18n
	//		label via innerHTML
	//		Doc and or test what can be extended.
	//		Doc custom file events
	//		Use new FileReader() for thumbnails
	//		flashFieldName should default to Flash
	//		get('value'); and set warning
	//		Make it so URL can change (current set to Flash on build)
	//

declare("dojox.form.Uploader", [uploader, Button], {
	// summary:
	//		A widget that creates a stylable file-input button, with optional multi-file selection,
	//		using only HTML elements. Non-HTML5 browsers have fallback options of Flash or an iframe.
	//
	// description:
	//		A bare-bones, stylable file-input button, with optional multi-file selection. The list
	//		of files is not displayed, that is for you to handle by connecting to the onChange
	//		event, or use the dojox.form.uploader.FileList.
	//
	//		Uploader without plugins does not have any ability to upload - it is for use in forms
	//		where you handle the upload either by a standard POST or with Ajax using an iFrame. This
	//		class is for convenience of multiple files only. No progress events are available.
	//
	//		If the browser supports a file-input with the "multiple" attribute, that will be used.
	//		If the browser does not support "multiple" (ergo, IE) multiple inputs are used,
	//		one for each selection.
	//
	//		Version: 1.6


	// uploadOnSelect: Boolean
	//		If true, uploads immediately after a file has been selected. If false,
	//		waits for upload() to be called.
	uploadOnSelect:false,

	// tabIndex: Number|String
	//		The tab order in the DOM.
	tabIndex:0,

	// multiple: Boolean
	//		If true and flash mode, multiple files may be selected from the dialog.
	multiple:false,

	// label: String
	//		The text used in the button that when clicked, opens a system Browse Dialog.
	label:res.label,

	// url: String
	//		The url targeted for upload. An absolute URL is preferred. Relative URLs are
	//		changed to absolute.
	url:"",

	// name: String
	//		The name attribute needs to end with square brackets: [] as this is the standard way
	//		of handling an attribute "array". This requires a slightly different technique on the
	//		server.
	name:"uploadedfile",

	// flashFieldName: String
	//		If set, this will be the name of the field of the flash uploaded files that the server
	//		is expecting. If not set, "Flash" is appended to the "name" property.
	flashFieldName:"",

	// uploadType: String [readonly]
	//		The type of uploader being used. As an alternative to determining the upload type on the
	//		server based on the fieldName, this property could be sent to the server to help
	//		determine what type of parsing should be used.
	uploadType:"form",

	// showInput: String [const]
	//		Position to show an input which shows selected filename(s). Possible
	//		values are "before", "after", which specifies where the input should
	//		be placed with reference to the containerNode which contains the
	//		label). By default, this is empty string (no such input will be
	//		shown). Specify showInput="before" to mimic the look&feel of a
	//		native file input element.
	showInput: "",

	_nameIndex:0,

	templateString: template,

	baseClass: 'dijitUploader '+Button.prototype.baseClass,

	postMixInProperties: function(){
		this._inputs = [];
		this._cons = [];
		this.inherited(arguments);
	},
	buildRendering: function(){
		this.inherited(arguments);
		domStyle.set(this.domNode, {
			overflow:"hidden",
			position:"relative"
		});
		this._buildDisplay();
		//change the button node not occupy tabIndex: the real file input
		//will have tabIndex set
		domAttr.set(this.titleNode, 'tabIndex', -1);
	},
	_buildDisplay: function(){
		if(this.showInput){
			this.displayInput = dojo.create('input', {
				  'class':'dijitUploadDisplayInput',
				  'tabIndex':-1, 'autocomplete':'off'},
				this.containerNode, this.showInput);
			//schedule the attachpoint to be cleaned up on destroy
			this._attachPoints.push('displayInput');
			this.connect(this,'onChange', function(files){
				var i=0,l=files.length, f, r=[];
				while((f=files[i++])){
					if(f && f.name){
						r.push(f.name);
					}
				}
				this.displayInput.value = r.join(', ');
			});
			this.connect(this,'reset', function(){
				this.displayInput.value = '';
			});
		}
	},

	startup: function(){
		if(this._buildInitialized){
			return;
		}
		this._buildInitialized = true;
		this._getButtonStyle(this.domNode);
		this._setButtonStyle();
		this.inherited(arguments);
	},

	/*************************
	 *	   Public Events	 *
	 *************************/

	onChange: function(/*Array*/ fileArray){
		// summary:
		//		stub to connect
		//		Fires when files are selected
		//		Event is an array of last files selected
	},

	onBegin: function(/*Array*/ dataArray){
		// summary:
		//		Fires when upload begins
	},

	onProgress: function(/*Object*/ customEvent){
		// summary:
		//		Stub to connect
		//		Fires on upload progress. Event is a normalized object of common properties
		//		from HTML5 uploaders and the Flash uploader. Will not fire for IFrame.
		// customEvent:
		//		- bytesLoaded: Number:
		//			Amount of bytes uploaded so far of entire payload (all files)
		//		- bytesTotal: Number:
		//			Amount of bytes of entire payload (all files)
		//		- type: String:
		//			Type of event (progress or load)
		//		- timeStamp: Number:
		//			Timestamp of when event occurred
	},

	onComplete: function(/*Object*/ customEvent){
		// summary:
		//		stub to connect
		//		Fires when all files have uploaded
		//		Event is an array of all files
		this.reset();
	},

	onCancel: function(){
		// summary:
		//		Stub to connect
		//		Fires when dialog box has been closed
		//		without a file selection
	},

	onAbort: function(){
		// summary:
		//		Stub to connect
		//		Fires when upload in progress was canceled
	},

	onError: function(/*Object or String*/ evtObject){
		// summary:
		//		Fires on errors

		// FIXME: Unsure of a standard form of error events
	},

	/*************************
	 *	   Public Methods	 *
	 *************************/

	upload: function(/*Object?*/ formData){
		// summary:
		//		When called, begins file upload. Only supported with plugins.
	},

	submit: function(/*form Node?*/ form){
		// summary:
		//		If Uploader is in a form, and other data should be sent along with the files, use
		//		this instead of form submit.
		form = !!form ? form.tagName ? form : this.getForm() : this.getForm();
		var data = domForm.toObject(form);
		this.upload(data);
	},

	reset: function(){
		// summary:
		//		Resets entire input, clearing all files.
		//		NOTE:
		//		Removing individual files is not yet supported, because the HTML5 uploaders can't
		//		be edited.
		//		TODO:
		//		Add this ability by effectively, not uploading them
		//
		delete this._files;
		this._disconnectButton();
		array.forEach(this._inputs, domConstruct.destroy, dojo);
		this._inputs = [];
		this._nameIndex = 0;
		this._createInput();
	},

	getFileList: function(){
		// summary:
		//		Returns a list of selected files.

		var fileArray = [];
		if(this.supports("multiple")){
			array.forEach(this._files, function(f, i){
				fileArray.push({
					index:i,
					name:f.name,
					size:f.size,
					type:f.type
				});
			}, this);
		}else{
			array.forEach(this._inputs, function(n, i){
				if(n.value){
					fileArray.push({
						index:i,
						name:n.value.substring(n.value.lastIndexOf("\\")+1),
						size:0,
						type:n.value.substring(n.value.lastIndexOf(".")+1)
					});
				}
			}, this);

		}
		return fileArray; // Array
	},

	/*********************************************
	 *	   Private Property. Get off my lawn.	 *
	 *********************************************/

	_getValueAttr: function(){
		// summary:
		//		Internal. To get disabled use: uploader.get("disabled");
		return this.getFileList();
	},

	_setValueAttr: function(disabled){
		console.error("Uploader value is read only");
	},

	_setDisabledAttr: function(disabled){
		// summary:
		//		Internal. To set disabled use: uploader.set("disabled", true);
		if(this.disabled == disabled || !this.inputNode){ return; } 
		this.inherited(arguments);
		domStyle.set(this.inputNode, "display", disabled ? "none" : "");
	},

	_getButtonStyle: function(node){
		this.btnSize = {w:domStyle.get(node,'width'), h:domStyle.get(node,'height')};
	},

	_setButtonStyle: function(){
		this.inputNodeFontSize = Math.max(2, Math.max(Math.ceil(this.btnSize.w / 60), Math.ceil(this.btnSize.h / 15)));
		this._createInput();
	},

	_getFileFieldName: function(){
		var name;
		if(this.multiple && this.supports("multiple")){
			// FF3.5+, WebKit
			name = this.name+"s[]";
		}else{
			// <=IE8
			name = this.name + (this.multiple ? this._nameIndex : "");
		}
		return name;
	},

	_createInput: function(){
		if(this._inputs.length){
			domStyle.set(this.inputNode, {
				top:"500px"
			});
			this._disconnectButton();
			this._nameIndex++;
		}

		var name = this._getFileFieldName();
		// reset focusNode to the inputNode, so when the button is clicked,
		// the focus is properly moved to the input element
		this.focusNode = this.inputNode = domConstruct.create("input", {type:"file", name:name}, this.domNode, "first");
		if(this.supports("multiple") && this.multiple){
			domAttr.set(this.inputNode, "multiple", true);
		}
		this._inputs.push(this.inputNode);

		domStyle.set(this.inputNode, {
			position:"absolute",
			fontSize:this.inputNodeFontSize+"em",
			top:"-3px",
			right:"-3px",
			opacity:0
		});
		this._connectButton();
	},

	_connectButton: function(){
		this._cons.push(connect.connect(this.inputNode, "change", this, function(evt){
			this._files = this.inputNode.files;
			this.onChange(this.getFileList(evt));
			if(!this.supports("multiple") && this.multiple) this._createInput();
		}));

		if(this.tabIndex > -1){
			this.inputNode.tabIndex = this.tabIndex;

			this._cons.push(connect.connect(this.inputNode, "focus", this, function(){
				this.titleNode.style.outline= "1px dashed #ccc";
			}));
			this._cons.push(connect.connect(this.inputNode, "blur", this, function(){
				this.titleNode.style.outline = "";
			}));
		}
	},

	_disconnectButton: function(){
		array.forEach(this._cons, connect.disconnect);
		this._cons.splice(0,this._cons.length);
	}
});

	dojox.form.UploaderOrg = dojox.form.Uploader;
	var extensions = [dojox.form.UploaderOrg];
	dojox.form.addUploaderPlugin = function(plug){
		// summary:
		//		Handle Uploader plugins. When the dojox.form.addUploaderPlugin() function is called,
		//		the dojox.form.Uploader is recreated using the new plugin (mixin).

		extensions.push(plug);
		declare("dojox.form.Uploader", extensions, {});
	};

	return dojox.form.Uploader;
});
