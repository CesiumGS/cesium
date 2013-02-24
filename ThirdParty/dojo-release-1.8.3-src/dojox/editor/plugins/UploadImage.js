define([
	"dojo",
	"dijit",
	"dojox",
	"dijit/_editor/_Plugin",
	"dojo/_base/connect",
	"dojo/_base/declare",
	"dojox/form/FileUploader",
	"dijit/_editor/_Plugin"
], function(dojo, dijit, dojox, _Plugin) {

dojo.experimental("dojox.editor.plugins.UploadImage");

dojo.declare("dojox.editor.plugins.UploadImage",
	_Plugin,
	{
		// summary:
		// 		Adds an icon to the Editor toolbar that when clicked, opens a system dialog
		//		Although the toolbar icon is a tiny "image" the uploader could be used for
		//		any file type
		
		tempImageUrl: "",
		iconClassPrefix: "editorIcon",
		useDefaultCommand: false,
		uploadUrl: "",
		button:null,
		label:"Upload",
		
		setToolbar: function(toolbar){
			this.button.destroy();
			this.createFileInput();
			toolbar.addChild(this.button);
		},
		_initButton: function(){
			this.command = "uploadImage";
			this.editor.commands[this.command] = "Upload Image";
			this.inherited("_initButton", arguments);
			delete this.command;
		},
		
		updateState: function(){
			// summary:
			//		Over-ride for button state control for disabled to work.
			this.button.set("disabled", this.get("disabled"));
		},
		
		createFileInput: function(){
			var node = dojo.create('span', {innerHTML:"."}, document.body)
			dojo.style(node, {
				width:"40px",
				height:"20px",
				paddingLeft:"8px",
				paddingRight:"8px"
			});
			this.button = new dojox.form.FileUploader({
				isDebug:true,
				//force:"html",
				uploadUrl:this.uploadUrl,
				uploadOnChange:true,
				selectMultipleFiles:false,
				baseClass:"dojoxEditorUploadNorm",
				hoverClass:"dojoxEditorUploadHover",
				activeClass:"dojoxEditorUploadActive",
				disabledClass:"dojoxEditorUploadDisabled"
			}, node);
			this.connect(this.button, "onChange", "insertTempImage");
			this.connect(this.button, "onComplete", "onComplete");
		},
		
		onComplete: function(data,ioArgs,widgetRef){
			data = data[0];
			// Image is ready to insert
			var tmpImgNode = dojo.byId(this.currentImageId, this.editor.document);
			var file;
			// download path is mainly used so we can access a PHP script
			// not relative to this file. The server *should* return a qualified path.
			if(this.downloadPath){
				file = this.downloadPath+data.name
			}else{
				file = data.file;
			}
			
			tmpImgNode.src = file;
			dojo.attr(tmpImgNode,'_djrealurl',file);

			if(data.width){
				tmpImgNode.width = data.width;
				tmpImgNode.height = data.height;
			}
		},
		
		insertTempImage: function(){
			// summary:
			//		inserting a "busy" image to show something is hapening
			//		during upload and download of the image.
			this.currentImageId = "img_"+(new Date().getTime());
			var iTxt = '<img id="'+this.currentImageId+'" src="'+this.tempImageUrl+'" width="32" height="32"/>';
			this.editor.execCommand('inserthtml', iTxt);
		}
		
	}
);

dojo.subscribe(dijit._scopeName + ".Editor.getPlugin",null,function(o){
	if(o.plugin){ return; }
	switch(o.args.name){
	case "uploadImage":
		o.plugin = new dojox.editor.plugins.UploadImage({url: o.args.url});
	}
});

return dojox.editor.plugins.UploadImage;

});
