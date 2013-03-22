define([
	"dojo",//FIXME
	"dijit",//FIXME
	"dijit/registry",
	"dijit/_base/popup",
	"dijit/_editor/_Plugin",
	"dijit/_editor/plugins/LinkDialog",
	"dijit/TooltipDialog",
	"dijit/form/_TextBoxMixin",
	"dijit/form/Button",
	"dijit/form/ValidationTextBox",
	"dijit/form/DropDownButton",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/_base/sniff",
	"dojox/form/FileUploader", //FIXME: deprecated.  Use Uploader instead
	"dojo/i18n!dojox/editor/plugins/nls/LocalImage"
], function(dojo, dijit, registry, popup, _Plugin, LinkDialog, TooltipDialog,
			_TextBoxMixin, Button, ValidationTextBox, DropDownButton,
			connect, declare, has, FileUploader, messages) {

var LocalImage = dojo.declare("dojox.editor.plugins.LocalImage", LinkDialog.ImgLinkDialog, {
	// summary:
	//		This plugin provides an enhanced image link dialog that
	//		not only insert the online images, but upload the local image files onto
	//		to server then insert them as well.
	//
	//		Dependencies:
	//		This plugin depends on dojox.form.FileUploader to upload the images on the local driver.
	//		Do the regression test whenever FileUploader is upgraded.
	
	// uploadable: [public] Boolean
	//		Indicate whether the user can upload a local image file onto the server.
	//		If it is set to true, the Browse button will be available.
	uploadable: false,
	
	// uploadUrl: [public] String
	//		The url targeted for uploading. Both absolute and relative URLs are OK.
	uploadUrl: "",
	
	// baseImageUrl: [public] String
	//		The prefix of the image url on the server.
	//		For example, an image is uploaded and stored at
	//		`http://www.myhost.com/images/uploads/test.jpg`.
	//		When the image is uploaded, the server returns "uploads/test.jpg" as the
	//		relative path. So the baseImageUrl should be set to "http://www.myhost.com/images/"
	//		so that the client can retrieve the image from the server.
	//		If the image file is located on the same domain as that of the current web page,
	//		baseImageUrl can be a relative path. For example:
	// |	baseImageUrl = images/
	//		and the server returns uploads/test.jpg
	//		The complete URL of the image file is images/upload/test.jpg
	baseImageUrl: "",
	
	// fileMask: [public] String
	//		Specify the types of images that are allowed to be uploaded.
	//		Note that the type checking on server is also very important!
	fileMask: "*.jpg;*.jpeg;*.gif;*.png;*.bmp",
	
	// urlRegExp: [protected] String
	//		Used to validate if the input is a valid image URL.
	urlRegExp: "",
	
	// htmlFieldName: [private] htmlFieldName
	htmlFieldName:"uploadedfile",
	
	// _isLocalFile: [private] Boolean
	//		Indicate if a local file is to be uploaded to the server
	//		If false, the text of _urlInput field is regarded as the
	//		URL of the online image
	_isLocalFile: false,
	
	// _messages: [private] Array<String>
	//		Contains i18n strings.
	_messages: "",
	
	// _cssPrefix: [private] String
	//		The prefix of the CSS style
	_cssPrefix: "dijitEditorEilDialog",
	
	// _closable: [private] Boolean
	//		Indicate if the tooltip dialog can be closed. Used to workaround Safari 5 bug
	//		where the file dialog doesn't pop up in modal until after the first click.
	_closable: true,
	
	// linkDialogTemplate: [protected] String
	//		Over-ride for template since this is an enhanced image dialog.
	linkDialogTemplate: [
		"<div style='border-bottom: 1px solid black; padding-bottom: 2pt; margin-bottom: 4pt;'></div>", // <hr/> breaks the dialog in IE6
		"<div class='dijitEditorEilDialogDescription'>${prePopuTextUrl}${prePopuTextBrowse}</div>",
		"<table role='presentation'><tr><td colspan='2'>",
		"<label for='${id}_urlInput' title='${prePopuTextUrl}${prePopuTextBrowse}'>${url}</label>",
		"</td></tr><tr><td class='dijitEditorEilDialogField'>",
		"<input dojoType='dijit.form.ValidationTextBox' class='dijitEditorEilDialogField'" +
		"regExp='${urlRegExp}' title='${prePopuTextUrl}${prePopuTextBrowse}'  selectOnClick='true' required='true' " +
		"id='${id}_urlInput' name='urlInput' intermediateChanges='true' invalidMessage='${invalidMessage}' " +
		"prePopuText='&lt;${prePopuTextUrl}${prePopuTextBrowse}&gt'>",
		"</td><td>",
		"<div id='${id}_browse' style='display:${uploadable}'>${browse}</div>",
		"</td></tr><tr><td colspan='2'>",
		"<label for='${id}_textInput'>${text}</label>",
		"</td></tr><tr><td>",
		"<input dojoType='dijit.form.TextBox' required='false' id='${id}_textInput' " +
		"name='textInput' intermediateChanges='true' selectOnClick='true' class='dijitEditorEilDialogField'>",
		"</td><td></td></tr><tr><td>",
		"</td><td>",
		"</td></tr><tr><td colspan='2'>",
		"<button dojoType='dijit.form.Button' id='${id}_setButton'>${set}</button>",
		"</td></tr></table>"
	].join(""),

	_initButton: function(){
		// summary:
		//		Override _Plugin._initButton() to initialize DropDownButton and TooltipDialog.
		// tags:
		//		protected
	    	var _this = this;
		this._messages = messages;
		this.tag = "img";
		var dropDown = (this.dropDown = new TooltipDialog({
			title: messages[this.command + "Title"],
			onOpen: function(){
				_this._initialFileUploader();
				_this._onOpenDialog();
				TooltipDialog.prototype.onOpen.apply(this, arguments);
				setTimeout(function(){
					// Auto-select the text if it is not empty
					_TextBoxMixin.selectInputText(_this._urlInput.textbox);
					_this._urlInput.isLoadComplete = true;
				}, 0);
			},
			onClose: function(){
				dojo.disconnect(_this.blurHandler);
				_this.blurHandler = null;
				this.onHide();
			},
			onCancel: function(){
				setTimeout(dojo.hitch(_this, "_onCloseDialog"),0);
			}
		}));
		
		var label = this.getLabel(this.command),
			className = this.iconClassPrefix + " " + this.iconClassPrefix + this.command.charAt(0).toUpperCase() + this.command.substr(1),
			props = dojo.mixin({
					label: label,
					showLabel: false,
					iconClass: className,
					dropDown: this.dropDown,
					tabIndex: "-1"
				}, this.params || {});
		
		if(!has('ie')){
			// Workaround for Non-IE problem:
			// Safari 5: After the select-file dialog opens, the first time the user clicks anywhere (even on that dialog)
			// it's treated like a plain click on the page, and the tooltip dialog closes
			// FF & Chrome: the select-file dialog does not block the execution of JS
			props.closeDropDown = function(/*Boolean*/ focus){
				if(_this._closable){
					if(this._opened){
						popup.close(this.dropDown);
						if(focus){ this.focus(); }
						this._opened = false;
						this.state = "";
					}
				}
				setTimeout(function(){ _this._closable = true; }, 10);
			};
		}
		
		this.button = new DropDownButton(props);
		
		// Generate the RegExp of the ValidationTextBox from fileMask
		// *.jpg;*.png => /.*\.jpg|.*\.JPG|.*\.png|.*\.PNG/
		var masks = this.fileMask.split(";"),
			temp = "";
		dojo.forEach(masks, function(m){
			m = m.replace(/\./, "\\.").replace(/\*/g, ".*");
			temp += "|" + m + "|" + m.toUpperCase();
		});
		messages.urlRegExp = this.urlRegExp = temp.substring(1);
		
		if(!this.uploadable){
			messages.prePopuTextBrowse = ".";
		}
		
		messages.id = registry.getUniqueId(this.editor.id);
		messages.uploadable = this.uploadable ? "inline" : "none";
		this._uniqueId = messages.id;
		this._setContent("<div class='" + this._cssPrefix + "Title'>" + dropDown.title + "</div>" +
			dojo.string.substitute(this.linkDialogTemplate, messages));
		dropDown.startup();
		
		var urlInput = (this._urlInput = registry.byId(this._uniqueId + "_urlInput"));
		this._textInput = registry.byId(this._uniqueId + "_textInput");
		this._setButton = registry.byId(this._uniqueId + "_setButton");
		
		if(urlInput){
			var pt = ValidationTextBox.prototype;
			urlInput = dojo.mixin(urlInput, {
				// Indicate if the widget is ready to validate the input text
				isLoadComplete: false,
				isValid: function(isFocused){
					if(this.isLoadComplete){
						return pt.isValid.apply(this, arguments);
					}else{
						return this.get("value").length > 0;
					}
				},
				reset: function(){
					this.isLoadComplete = false;
					pt.reset.apply(this, arguments);
				}
			});
			
			this.connect(urlInput, "onKeyDown", "_cancelFileUpload");
			this.connect(urlInput, "onChange", "_checkAndFixInput");
		}
		if(this._setButton){
			this.connect(this._setButton, "onClick", "_checkAndSetValue");
		}
		this._connectTagEvents();
	},
	
	_initialFileUploader: function(){
		// summary:
		//		Initialize the FileUploader and connect up its events
		// tags:
		//		private
		var fup = null,
			_this = this,
			widgetId = _this._uniqueId,
			fUpId = widgetId + "_browse",
			urlInput = _this._urlInput;
		
		if(_this.uploadable && !_this._fileUploader){
			fup = _this._fileUploader = new FileUploader({
				force: "html", // Noticed that SWF may cause browsers to crash sometimes
				uploadUrl: _this.uploadUrl,
				htmlFieldName: _this.htmlFieldName,
				uploadOnChange: false,
				selectMultipleFiles: false,
				showProgress: true
			}, fUpId);
			
			// TooltipDialog will call reset on all the widgets contained within it.
			// Have FileUploader be responsive to this call.
			fup.reset = function(){
				_this._isLocalFile = false;
				fup._resetHTML();
			};
			
			_this.connect(fup, "onClick", function(){
				urlInput.validate(false);
				if(!has('ie')){
					// Firefox, Chrome and Safari have a strange behavior:
					// When the File Upload dialog is open, the browse div (FileUploader) will lose its focus
					// and triggers onBlur event. This event will cause the whole tooltip dialog
					// to be closed when the File Upload dialog is open. The popup dialog should hang up
					// the js execution rather than triggering an event. IE does not have such a problem.
					_this._closable = false;
				}
			});

			
			_this.connect(fup, "onChange", function(data){
				_this._isLocalFile = true;
				urlInput.set("value", data[0].name); //Single selection
				urlInput.focus();
			});
			
			_this.connect(fup, "onComplete", function(data){
				var urlPrefix = _this.baseImageUrl;
				urlPrefix = urlPrefix && urlPrefix.charAt(urlPrefix.length - 1) == "/" ? urlPrefix : urlPrefix + "/";
				urlInput.set("value", urlPrefix + data[0].file); //Single selection
				_this._isLocalFile = false;
				_this._setDialogStatus(true);
				_this.setValue(_this.dropDown.get("value"));
			});
			
			_this.connect(fup, "onError", function(evtObject){
				// summary:
				//		Fires on errors
				console.log("Error occurred when uploading image file!");
				_this._setDialogStatus(true);
			});
		}
	},
	
	_checkAndFixInput: function(){
		// summary:
		//		Over-ride the original method
		this._setButton.set("disabled", !this._isValid());
	},
	
	_isValid: function(){
		// summary:
		//		Invalid cases: URL is not ended with the suffix listed
		return this._urlInput.isValid();
	},
	
	_cancelFileUpload: function(){
		this._fileUploader.reset();
		this._isLocalFile = false;
	},
	
	_checkAndSetValue: function(){
		// summary:
		//		Determine if a local file is to be uploaded.
		//		If a local file is to be uploaded, do not close the dialog
		//		until the file uploading is finished. Else, insert the image directly into the editor.
		// tags:
		//		private
		if(this._fileUploader && this._isLocalFile){
			this._setDialogStatus(false);
			this._fileUploader.upload();
		}else{
			this.setValue(this.dropDown.get("value"));
		}
	},
	
	_setDialogStatus: function(/*Boolean*/ value){
		this._urlInput.set("disabled", !value);
		this._textInput.set("disabled", !value);
		this._setButton.set("disabled", !value);
	},
	
	destroy: function(){
		// summary:
		//		Cleanup of the plugin.
		this.inherited(arguments);
		if(this._fileUploader){
			this._fileUploader.destroy();
			delete this._fileUploader;
		}
	}
});

var plugin = function(args){
	return new LocalImage({
		command: "insertImage",
		uploadable: ("uploadable" in args) ? args.uploadable : false,
		uploadUrl: ("uploadable" in args && "uploadUrl" in args) ? args.uploadUrl : "",
		htmlFieldName: ("uploadable" in args && "htmlFieldName" in args) ? args.htmlFieldName : "uploadedfile",
		baseImageUrl: ("uploadable" in args && "baseImageUrl" in args) ? args.baseImageUrl : "",
		fileMask: ("fileMask" in args) ? args.fileMask : "*.jpg;*.jpeg;*.gif;*.png;*.bmp"
	});
};

// Register the plugin and some name varients.
_Plugin.registry["LocalImage"] = plugin;
_Plugin.registry["localImage"] = plugin;
_Plugin.registry["localimage"] = plugin;

return LocalImage;

});
