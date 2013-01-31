define([
	"dojo/_base/lang",
	"dojo/dom",
	"../Context",
	"../dom",
	"../_base"
], function(lang,dom,ddc,dddom,dd){

	lang.getObject("dojox.dtl.render.dom", true);

	dd.render.dom.Render = function(/*DOMNode?*/ attachPoint, /*dojox/dtl/DomTemplate?*/ tpl){
		this._tpl = tpl;
		this.domNode = dom.byId(attachPoint);
	};
	lang.extend(dd.render.dom.Render, {
		setAttachPoint: function(/*Node*/ node){
			this.domNode = node;
		},
		render: function(/*Object*/ context, /*dojox/dtl/DomTemplate?*/ tpl, /*dojox/dtl/DomBuffer?*/ buffer){
			if(!this.domNode){
				throw new Error("You cannot use the Render object without specifying where you want to render it");
			}

			this._tpl = tpl = tpl || this._tpl;
			buffer = buffer || tpl.getBuffer();
			context = context || new ddc();

			var frag = tpl.render(context, buffer).getParent();
			if(!frag){
				throw new Error("Rendered template does not have a root node");
			}

			if(this.domNode !== frag){
				if(this.domNode.parentNode){
					this.domNode.parentNode.replaceChild(frag, this.domNode);
				}
				this.domNode = frag;
			}
		}
	});
	return dojox.dtl.render.dom;
});
