define([
	"dojo/_base/lang",
	"dojo/_base/array",
	"dijit/_WidgetBase",
	"./_DataBindingMixin",
	"dijit/form/ValidationTextBox",
	"dijit/form/NumberTextBox"
], function(lang, array, wb, dbm, vtb, ntb){
	/*=====
		vtb = dijit.form.ValidationTextBox;
		ntb = dijit.form.NumberTextBox;
		dbm = dojox.mvc._DataBindingMixin;
		wb = dijit._WidgetBase;
	=====*/

	//Apply the data binding mixin to all dijits, see mixin class description for details
	lang.extend(wb, new dbm());

	// monkey patch dijit._WidgetBase.startup to get data binds set up
	var oldWidgetBaseStartup = wb.prototype.startup;
	wb.prototype.startup = function(){
		this._dbstartup();
		oldWidgetBaseStartup.apply(this);
	};

	// monkey patch dijit._WidgetBase.destroy to remove watches setup in _DataBindingMixin
	var oldWidgetBaseDestroy = wb.prototype.destroy;
	wb.prototype.destroy = function(/*Boolean*/ preserveDom){
		if(this._modelWatchHandles){
			array.forEach(this._modelWatchHandles, function(h){ h.unwatch(); });
		}
		if(this._viewWatchHandles){
			array.forEach(this._viewWatchHandles, function(h){ h.unwatch(); });
		}
		oldWidgetBaseDestroy.apply(this, [preserveDom]);		
	};

	// monkey patch dijit.form.ValidationTextBox.isValid to check this.inherited for isValid
	var oldValidationTextBoxIsValid = vtb.prototype.isValid;
	vtb.prototype.isValid = function(/*Boolean*/ isFocused){
		return (this.inherited("isValid", arguments) !== false && oldValidationTextBoxIsValid.apply(this, [isFocused]));
	};

	// monkey patch dijit.form.NumberTextBox.isValid to check this.inherited for isValid
	var oldNumberTextBoxIsValid = ntb.prototype.isValid;
	ntb.prototype.isValid = function(/*Boolean*/ isFocused){
		return (this.inherited("isValid", arguments) !== false && oldNumberTextBoxIsValid.apply(this, [isFocused]));
	};
});
