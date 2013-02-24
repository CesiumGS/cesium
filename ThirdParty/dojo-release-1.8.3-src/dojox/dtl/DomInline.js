define([
	"dojo/_base/lang",
	"./dom",
	"./_base",
	"dijit/_WidgetBase"
], function(lang,ddd,dd,Widget){

	dd.DomInline = lang.extend(function(args, node){
			this.create(args, node);
		},
		Widget.prototype,
		{
			context: null,
			render: function(/*dojox/dtl/Context?*/ context){
				this.context = context || this.context;
				this.postMixInProperties();
				var root = this.template.render(this.context).getRootNode();
				if(root != this.containerNode){
					this.containerNode.parentNode.replaceChild(root, this.containerNode);
					this.containerNode = root;
				}
			},
			declaredClass: "dojox.dtl.Inline",
			buildRendering: function(){
				var div = this.domNode = document.createElement("div");
				this.containerNode = div.appendChild(document.createElement("div"));
				var node = this.srcNodeRef;
				if(node.parentNode){
					node.parentNode.replaceChild(div, node);
				}
	
				this.template = new dojox.dtl.DomTemplate(lang.trim(node.text), true);
				this.render();
			},
			postMixInProperties: function(){
				this.context = (this.context.get === dojox.dtl._Context.prototype.get) ? this.context : new dojox.dtl.Context(this.context);
			}
		});
	return dojox.dtl.DomInline;
});