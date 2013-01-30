define([
	"dojo/_base/declare",
	"dojo/_base/kernel",
	"dojo/_base/fx",
	"dojo/dom-attr",
	"dojo/dom-class",
	"dojo/text!./resources/FileInput.html",
	"dijit/form/_FormWidget",
	"dijit/_Templated"
],
function(declare, kernel, fx, domAttr, domClass, template, FormWidget, Templated){
kernel.experimental("dojox.form.FileInput");

return declare("dojox.form.FileInput", FormWidget,
	{
	// summary:
	//		A styled input type="file"
	//
	// description:
	//		A input type="file" form widget, with a button for uploading to be styled via css,
	//		a cancel button to clear selection, and FormWidget mixin to provide standard dijit.form.Form
	//		support (FIXME: maybe not fully implemented)

	// label: String
	//		the title text of the "Browse" button
	label: "Browse ...",

	// cancelText: String
	//		the title of the "Cancel" button
	cancelText: "Cancel",

	// name: String
	//		ugh, this should be pulled from this.domNode
	name: "uploadFile",

	templateString: template,

	startup: function(){
		// summary:
		//		listen for changes on our real file input
		this._listener = this.connect(this.fileInput,"onchange","_matchValue");
		this._keyListener = this.connect(this.fileInput,"onkeyup","_matchValue");
	},

	//get rid of the this.connect in _FormWidget.postCreate to allow IE to show
	//the file picker dialog properly
	postCreate: function(){},

	_matchValue: function(){
		// summary:
		//		set the content of the upper input based on the semi-hidden file input
		this.inputNode.value = this.fileInput.value;
		if(this.inputNode.value){
			this.cancelNode.style.visibility = "visible";
			fx.fadeIn({ node: this.cancelNode, duration:275 }).play();
		}
	},

	setLabel: function(/*String*/ label, /*String?*/ cssClass){
		// summary:
		//		method to allow use to change button label
		this.titleNode.innerHTML = label;
	},

	reset: function(/*Event*/ e){
		// summary:
		//		on click of cancel button, since we can't clear the input because of
		//		security reasons, we destroy it, and add a new one in it's place.
		this.disconnect(this._listener);
		this.disconnect(this._keyListener);
		if(this.fileInput){
			this.domNode.removeChild(this.fileInput);
		}
		fx.fadeOut({ node: this.cancelNode, duration:275 }).play();

		// should we use cloneNode()? can we?
		this.fileInput = document.createElement('input');
		// domAttr.set(this.fileInput,{
		//		"type":"file", "id":this.id, "name": this.name
		//});
		this.fileInput.setAttribute("type","file");
		this.fileInput.setAttribute("id", this.id);
		this.fileInput.setAttribute("name", this.name);
		domClass.add(this.fileInput,"dijitFileInputReal");
		this.domNode.appendChild(this.fileInput);

		this._keyListener = this.connect(this.fileInput, "onkeyup", "_matchValue");
		this._listener = this.connect(this.fileInput, "onchange", "_matchValue");
		this.inputNode.value = "";
	}

});

});
