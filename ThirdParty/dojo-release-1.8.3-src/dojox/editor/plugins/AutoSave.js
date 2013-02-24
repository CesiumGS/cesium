define([
	"dojo",
	"dijit",	// _scopeName
	"dojox",
	"dijit/_base/manager",	// getUniqueId()
	"dijit/_base/popup",
	"dijit/_Widget",
	"dijit/_TemplatedMixin",
	"dijit/_WidgetsInTemplateMixin",
	"dijit/Dialog",
	"dijit/MenuItem",
	"dijit/Menu",
	"dijit/form/Button",
	"dijit/form/ComboButton",
	"dijit/form/ComboBox",
	"dijit/form/_TextBoxMixin",	// selectInputText()
	"dijit/form/TextBox",
	"dijit/TooltipDialog",
	"dijit/_editor/_Plugin",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojo/date/locale",
	"dojo/i18n",
	"dojo/string",
	"dojox/editor/plugins/Save",
	"dojo/i18n!dojox/editor/plugins/nls/AutoSave"
], function(dojo, dijit, dojox, manager, popup, _Widget, _TemplatedMixin, _WidgetsInTemplateMixin,
	Dialog, MenuItem, Menu, Button, ComboButton, ComboBox, _TextBoxMixin, TextBox, TooltipDialog, _Plugin,
	connect, declare, locale, i18n, string, Save) {

dojo.experimental("dojox.editor.plugins.AutoSave");

dojo.declare("dojox.editor.plugins._AutoSaveSettingDialog", [_Widget, _TemplatedMixin, _WidgetsInTemplateMixin], {
	
	// dialogTitle [public] String
	//		The tile of the Auto-Save setting dialog
	dialogTitle: "",
	
	// dialogDescription [public] String
	//		The description of the Auto-Save setting dialog
	dialogDescription: "",
	
	// paramName [public] String
	//		The name of the parameter (Auto-Save Interval)
	paramName: "",
	
	// paramLabel [public] String
	//		Minute
	paramLabel: "",
	
	// btnOk [public] String
	//		The label of the OK button
	btnOk: "",
	
	// btnCancel [public] String
	//		The label of the Cancel button
	btnCancel: "",
	
	widgetsInTemplate: true,
	
	templateString:
		"<span id='${dialogId}' class='dijit dijitReset dijitInline' tabindex='-1'>" +
			"<div dojoType='dijit.Dialog' title='${dialogTitle}' dojoAttachPoint='dialog' " +
				"class='dijitEditorAutoSaveSettingDialog'>" +
				"<div tabindex='-1'>${dialogDescription}</div>" +
				"<div tabindex='-1' class='dijitEditorAutoSaveSettingInputArea'>${paramName}</div>" +
				"<div class='dijitEditorAutoSaveSettingInputArea' tabindex='-1'>" +
					"<input class='textBox' dojoType='dijit.form.TextBox' id='${textBoxId}' required='false' intermediateChanges='true' " +
						"selectOnClick='true' required='true' dojoAttachPoint='intBox' " +
						"dojoAttachEvent='onKeyDown: _onKeyDown, onChange: _onChange'/>" +
					"<label class='dijitLeft dijitInline boxLabel' " +
						"for='${textBoxId}' tabindex='-1'>${paramLabel}</label>" +
				"</div>" +
				"<div class='dijitEditorAutoSaveSettingButtonArea' tabindex='-1'>" +
					"<button dojoType='dijit.form.Button' dojoAttachEvent='onClick: onOk'>${btnOk}</button>" +
					"<button dojoType='dijit.form.Button' dojoAttachEvent='onClick: onCancel'>${btnCancel}</button>" +
				"</div>" +
			"</div>" +
		"</span>",
	
	postMixInProperties: function(){
		this.id = dijit.getUniqueId(this.declaredClass.replace(/\./g,"_"));
		this.dialogId = this.id + "_dialog";
		this.textBoxId = this.id + "_textBox";
	},
	
	show: function(){
		// summary:
		//		Display the setting dialog. If the internal interval value is ""
		//		set it to zero
		// tags:
		//		public
		if(this._value == ""){
			this._value = 0;
			this.intBox.set("value", 0);
		}else{
			this.intBox.set("value", this._value);
		}
		this.dialog.show();
		dijit.selectInputText(this.intBox.focusNode);
	},
	
	hide: function(){
		// summary:
		//		Hide the setting dialog.
		// tags:
		//		public
		this.dialog.hide();
	},
	
	onOk: function(){
		// summary:
		//		Handle the OK event and close the dialog.
		// tags:
		//		public
		this.dialog.hide();
	},
	
	onCancel: function(){
		// summary:
		//		Handle the Cancel event and close the dialog.
		// tags:
		//		public
		this.dialog.hide();
	},
	
	_onKeyDown: function(evt){
		// summary:
		//		Handle the keydown event
		// tags:
		//		private
		if(evt.keyCode == dojo.keys.ENTER){
			this.onOk();
		}
	},
	
	_onChange: function(/*String*/ val){
		// summary:
		//		Check if the value is between 1 - 999.
		// tags:
		//		public
		if(this._isValidValue(val)){
			this._value = val;
		}else{
			this.intBox.set("value", this._value);
		}
	},
	
	_setValueAttr: function(/*String*/ val){
		// summary:
		//		Set the value attribute if it is acceptable
		// val:
		//		The interval value
		// tags:
		//		private
		if(this._isValidValue(val)){
			this._value = val;
		}
	},
	
	_getValueAttr: function(){
		// summary:
		//		Get the interval value
		// tags:
		//		protected
		return this._value;
	},
	
	_isValidValue: function(/*String*/ val){
		// summary:
		//		Check if this value between 1- 999
		// tags:
		//		private
		var regExp = /^\d{0,3}$/,
			_v = String(val);
		return Boolean(_v.match ? _v.match(regExp) : "");
	}
});

dojo.declare("dojox.editor.plugins.AutoSave", Save, {
	// summary:
	//		This plugin provides the auto save capability to the editor. The
	//		plugin saves the content of the editor in interval. When
	//		the save action is performed, the document in the editor frame
	//		will be posted to the URL provided, or none, if none provided.
	
	// url: [public] String
	//		The URL to POST the content back to.  Used by the save function.
	url: "",

	// logResults: [public] Boolean
	//		Boolean flag to indicate that the default action for save and
	//		error handlers is to just log to console.  Default is true.
	logResults: true,
	
	// interval: [public] Number
	//		The interval to perform the save action.
	interval: 0,
	
	// _iconClassPrefix: [private] String
	//		This prefix of the CSS class
	_iconClassPrefix: "dijitEditorIconAutoSave",
	
	// _MIN: [private const] Number
	//		Default 1 minute
	_MIN: 60000,
	
	_setIntervalAttr: function(val){
		// summary:
		//		Set the interval value.
		//		Delay the boundary check to _isValidValue of the dialog class
		// val:
		//		The interval value.
		// tags:
		//		private
		this.interval = val;
	},
	
	_getIntervalAttr: function(){
		// summary:
		//		Get the interval value
		// tags:
		//		private
		return this._interval;
	},
	
	setEditor: function(editor){
		// summary:
		//		Over-ride for the setting of the editor. No toggle button for
		//		this plugin. And start to save the content of the editor in
		//		interval
		// editor: Object
		//		The editor to configure for this plugin to use.
		this.editor = editor;
		this._strings = dojo.i18n.getLocalization("dojox.editor.plugins", "AutoSave");
		this._initButton();
		
		this._saveSettingDialog = new dojox.editor.plugins._AutoSaveSettingDialog({
			"dialogTitle": this._strings["saveSettingdialogTitle"],
			"dialogDescription": this._strings["saveSettingdialogDescription"],
			"paramName": this._strings["saveSettingdialogParamName"],
			"paramLabel": this._strings["saveSettingdialogParamLabel"],
			"btnOk": this._strings["saveSettingdialogButtonOk"],
			"btnCancel": this._strings["saveSettingdialogButtonCancel"]
		});
		this.connect(this._saveSettingDialog, "onOk", "_onDialogOk");
		
		var pd = (this._promDialog = new dijit.TooltipDialog());
		pd.startup();
		pd.set("content", "");
	},
	
	_initButton: function(){
		var menu = new dijit.Menu({
				style: "display: none"
			}),
			menuItemSave = new dijit.MenuItem({
				iconClass: this._iconClassPrefix + "Default " + this._iconClassPrefix,
				label: this._strings["saveLabel"]
			}),
			menuItemAutoSave = (this._menuItemAutoSave = new dijit.MenuItem({
				iconClass: this._iconClassPrefix + "Setting " + this._iconClassPrefix,
				label: this._strings["saveSettingLabelOn"]
			}));
			
		menu.addChild(menuItemSave);
		menu.addChild(menuItemAutoSave);
		this.button = new dijit.form.ComboButton({
			label: this._strings["saveLabel"],
			iconClass: this._iconClassPrefix + "Default " + this._iconClassPrefix,
			showLabel: false,
			dropDown: menu
		});
		
		this.connect(this.button, "onClick", "_save");
		this.connect(menuItemSave, "onClick", "_save");
		this._menuItemAutoSaveClickHandler = dojo.connect(menuItemAutoSave, "onClick", this, "_showAutSaveSettingDialog");
	},
	
	_showAutSaveSettingDialog: function(){
		// summary:
		//		Show the setting dialog
		// tags:
		//		private
		var dialog = this._saveSettingDialog;
		dialog.set("value", this.interval);
		dialog.show();
	},
	
	_onDialogOk: function(){
		// summary:
		//		If the interval is set (larger than 0), enable auto-save.
		// tags:
		//		private
		var interval = (this.interval = this._saveSettingDialog.get("value") * this._MIN);
		if(interval > 0){
			this._setSaveInterval(interval);
			// Change the menu "Set Auto-Save Interval..." to "Turn off Auto-Save"
			// Connect it to another handler that terminates the auto-save.
			dojo.disconnect(this._menuItemAutoSaveClickHandler);
			this._menuItemAutoSave.set("label", this._strings["saveSettingLabelOff"]);
			this._menuItemAutoSaveClickHandler = dojo.connect(this._menuItemAutoSave, "onClick", this, "_onStopClick");
			// Change the icon of the main button to auto-save style
			this.button.set("iconClass", this._iconClassPrefix + "Setting " + this._iconClassPrefix);
		}
	},
	
	_onStopClick: function(){
		// summary:
		//		Stop auto-save
		// tags:
		//		private
		this._clearSaveInterval();
		// Change the menu "Turn off Auto-Save" to "Set Auto-Save Interval...".
		// Connect it to another handler that show the setting dialog.
		dojo.disconnect(this._menuItemAutoSaveClickHandler);
		this._menuItemAutoSave.set("label", this._strings["saveSettingLabelOn"]);
		this._menuItemAutoSaveClickHandler = dojo.connect(this._menuItemAutoSave, "onClick", this, "_showAutSaveSettingDialog");
		// Change the icon of the main button
		this.button.set("iconClass", this._iconClassPrefix + "Default " + this._iconClassPrefix);
	},
	
	_setSaveInterval: function(/*Number*/ interval){
		// summary:
		//		Function to trigger saving of the editor document
		// tags:
		//		private
		if(interval <= 0){
			return;
		}
		this._clearSaveInterval();
		this._intervalHandler = setInterval(dojo.hitch(this,  function(){
									if(!this._isWorking && !this.get("disabled")){
										// If the plugin is not disabled (ViewSource, etc.)
										// and not working. Do saving!
										this._isWorking = true;
										this._save();
									}
								}), interval);
	},
	
	_clearSaveInterval: function(){
		if(this._intervalHandler){
			clearInterval(this._intervalHandler);
			this._intervalHandler = null;
		}
	},

	onSuccess: function(resp, ioargs){
		// summary:
		//		User over-ridable save success function for editor content.
		// resp:
		//		The response from the server, if any, in text format.
		// tags:
		//		public
		this.button.set("disabled", false);
		// Show the successful message
		this._promDialog.set("content", dojo.string.substitute(
					this._strings["saveMessageSuccess"], {"0": dojo.date.locale.format(new Date(), {selector: "time"})}));
				dijit.popup.open({popup: this._promDialog, around: this.button.domNode});
				this._promDialogTimeout = setTimeout(dojo.hitch(this, function(){
					clearTimeout(this._promDialogTimeout);
					this._promDialogTimeout = null;
					dijit.popup.close(this._promDialog);
				}), 3000);
		this._isWorking = false;
		if(this.logResults){
			console.log(resp);
		}
	},

	onError: function(error, ioargs){
		// summary:
		//		User over-ridable save success function for editor content.
		// resp:
		//		The response from the server, if any, in text format.
		// tags:
		//		public
		this.button.set("disabled", false);
		// Show the failure message
		this._promDialog.set("content", dojo.string.substitute(
					this._strings["saveMessageFail"], {"0": dojo.date.locale.format(new Date(), {selector: "time"})}));
				dijit.popup.open({popup: this._promDialog, around: this.button.domNode});
				this._promDialogTimeout = setTimeout(dojo.hitch(this, function(){
					clearTimeout(this._promDialogTimeout);
					this._promDialogTimeout = null;
					dijit.popup.close(this._promDialog);
				}), 3000);
		this._isWorking = false;
		if(this.logResults){
			console.log(error);
		}
	},
	
	destroy: function(){
		// summary:
		//		Cleanup of our plugin.
		this.inherited(arguments);
		
		this._menuItemAutoSave = null;
		
		if(this._promDialogTimeout){
			clearTimeout(this._promDialogTimeout);
			this._promDialogTimeout = null;
			dijit.popup.close(this._promDialog);
		}
		
		this._clearSaveInterval();
		
		if(this._saveSettingDialog){
			this._saveSettingDialog.destroyRecursive();
			this._destroyRecursive = null;
		}
		
		if(this._menuItemAutoSaveClickHandler){
			dojo.disconnect(this._menuItemAutoSaveClickHandler);
			this._menuItemAutoSaveClickHandler = null;
		}
	}
});

// Register this plugin.
dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	var name = o.args.name.toLowerCase();
	if(name == "autosave"){
		o.plugin = new dojox.editor.plugins.AutoSave({
			url: ("url" in o.args) ? o.args.url : "",
			logResults: ("logResults" in o.args) ? o.args.logResults : true,
			interval: ("interval" in o.args) ? o.args.interval : 5
		});
	}
});

return dojox.editor.plugins.AutoSave;

});
