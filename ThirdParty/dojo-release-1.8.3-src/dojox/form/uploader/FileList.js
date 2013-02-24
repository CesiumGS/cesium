define([
	"dojo/_base/fx",
	"dojo/dom-style",
	"dojo/dom-class",
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dijit/_base/manager",
	"dojox/form/uploader/Base"
],function(fx, domStyle, domClass, declare, lang, array, manager, formUploaderBase){

return declare("dojox.form.uploader.FileList", [formUploaderBase], {
	// summary:
	//		A simple widget that provides a list of the files currently selected by
	//		dojox.form.Uploader
	// description:
	//		There is a required CSS file: resources/UploaderFileList.css.
	//		This is a very simple widget, and not beautifully styled. It is here mainly for test
	//		cases, but could very easily be used, extended, modified, or copied.
	// Version: 1.6

	// uploaderId: String
	//		The id of the dojox.form.Uploader to connect to.
	uploaderId:"",

	// uploader: dojox.form.Uploader
	//		The dojox.form.Uploader to connect to. Use either this property of unploaderId. This
	//		property is populated if uploaderId is used.
	uploader:null,

	// headerIndex: String
	//		The label for the index column.
	headerIndex:"#",

	// headerType: String
	//		The label for the file type column.
	headerType:"Type",

	// headerFilename: String
	//		The label for the file name column.
	headerFilename:"File Name",

	// headerFilesize: String
	//		The label for the file size column.
	headerFilesize:"Size",

	_upCheckCnt:0,
	rowAmt:0,

	templateString:	'<div class="dojoxUploaderFileList">' +
						'<div dojoAttachPoint="progressNode" class="dojoxUploaderFileListProgress"><div dojoAttachPoint="percentBarNode" class="dojoxUploaderFileListProgressBar"></div><div dojoAttachPoint="percentTextNode" class="dojoxUploaderFileListPercentText">0%</div></div>' +
						'<table class="dojoxUploaderFileListTable">'+
							'<thead><tr class="dojoxUploaderFileListHeader"><th class="dojoxUploaderIndex">${headerIndex}</th><th class="dojoxUploaderIcon">${headerType}</th><th class="dojoxUploaderFileName">${headerFilename}</th><th class="dojoxUploaderFileSize" dojoAttachPoint="sizeHeader">${headerFilesize}</th></tr></thead>'+
							'<tbody class="dojoxUploaderFileListContent" dojoAttachPoint="listNode">'+
							'</tbody>'+
						'</table>'+
						'<div>'
						,

	postCreate: function(){
		this.setUploader();
		this.hideProgress();
	},

	reset: function(){
		// summary:
		//		Clears all rows of items. Happens automatically if Uploader is reset, but you
		//		could call this directly.

		for(var i=0;i<this.rowAmt;i++){
			this.listNode.deleteRow(0);
		}
		this.rowAmt = 0;
	},

	setUploader: function(){
		// summary:
		//		Connects to the Uploader based on the uploader or the uploaderId properties.

		if(!this.uploaderId && !this.uploader){
			console.warn("uploaderId not passed to UploaderFileList");
		}else if(this.uploaderId && !this.uploader){
			this.uploader = manager.byId(this.uploaderId);
		}else if(this._upCheckCnt>4){
			console.warn("uploader not found for ID ", this.uploaderId);
			return;
		}
		if(this.uploader){
			this.connect(this.uploader, "onChange", "_onUploaderChange");
			this.connect(this.uploader, "reset", "reset");
			this.connect(this.uploader, "onBegin", function(){
				this.showProgress(true);
			});
			this.connect(this.uploader, "onProgress", "_progress");
			this.connect(this.uploader, "onComplete", function(){
				setTimeout(lang.hitch(this, function(){
					this.hideProgress(true);
				}), 1250);
			});
			if(!(this._fileSizeAvail = {'html5':1,'flash':1}[this.uploader.uploadType])){
				//if uploadType is neither html5 nor flash, file size is not available
				//hide the size header
				this.sizeHeader.style.display="none";
			}
		}else{
			this._upCheckCnt++;
			setTimeout(lang.hitch(this, "setUploader"), 250);
		}
	},

	hideProgress: function(/*Boolean*/ animate){
		var o = animate ? {
			ani:true,
			endDisp:"none",
			beg:15,
			end:0
		} : {
			endDisp:"none",
			ani:false
		};
		this._hideShowProgress(o);
	},

	showProgress: function(/*Boolean*/ animate){
		var o = animate ? {
			ani:true,
			endDisp:"block",
			beg:0,
			end:15
		} : {
			endDisp:"block",
			ani:false
		};
		this._hideShowProgress(o);
	},

	_progress: function(/*Object*/ customEvent){
		this.percentTextNode.innerHTML = customEvent.percent;
		domStyle.set(this.percentBarNode, "width", customEvent.percent);
	},

	_hideShowProgress: function(o){
		var node = this.progressNode;
		var onEnd = function(){
			domStyle.set(node, "display", o.endDisp);
		};
		if(o.ani){
			domStyle.set(node, "display", "block");
			fx.animateProperty({
				node: node,
				properties:{
					height:{
						start:o.beg,
						end:o.end,
						units:"px"
					}
				},
				onEnd:onEnd
			}).play();
		}else{
			onEnd();
		}
	},

	_onUploaderChange: function(fileArray){
		this.reset();
		array.forEach(fileArray, function(f, i){
			this._addRow(i+1, this.getFileType(f.name), f.name, f.size);
		}, this)
	},

	_addRow: function(index, type, name, size){

		var c, r = this.listNode.insertRow(-1);
		c = r.insertCell(-1);
		domClass.add(c, "dojoxUploaderIndex");
		c.innerHTML = index;

		c = r.insertCell(-1);
		domClass.add(c, "dojoxUploaderIcon");
		c.innerHTML = type;

		c = r.insertCell(-1);
		domClass.add(c, "dojoxUploaderFileName");
		c.innerHTML = name;
		if(this._fileSizeAvail){
			c = r.insertCell(-1);
			domClass.add(c, "dojoxUploaderSize");
			c.innerHTML = this.convertBytes(size).value;
		}

		this.rowAmt++;
	}
});
});
