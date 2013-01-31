define([
	"dojo/_base/declare",
	"dojo/_base/kernel",
	"dojo/fx",
	"dijit/TitlePane",
	"dijit/Dialog"
	], function(declare, kernel, fx, TitlePane, Dialog){
		
	return declare("dojox.widget.PortletDialogSettings", [dojox.widget.PortletSettings],{
			// summary:
			//		A settings widget to be used with a dojox.widget.Portlet, which displays
			//		the contents of this widget in a dijit.Dialog box.

			// dimensions: Array
			//		The size of the dialog to display.	This defaults to [300, 300]
			dimensions: null,

			constructor: function(props, node){
				this.dimensions = props.dimensions || [300, 100];
			},

			toggle: function(){
				// summary:
				//		Shows and hides the Dialog box.
				
				if(!this.dialog){
					//require("dijit.Dialog");
					this.dialog = new dijit.Dialog({title: this.title});

					dojo.body().appendChild(this.dialog.domNode);

					// Move this widget inside the dialog
					this.dialog.containerNode.appendChild(this.domNode);

					dojo.style(this.dialog.domNode,{
						"width" : this.dimensions[0] + "px",
						"height" : this.dimensions[1] + "px"
					});
					dojo.style(this.domNode, "display", "");
				}
				if(this.dialog.open){
					this.dialog.hide();
				}else{
					this.dialog.show(this.domNode);
				}
			}
	});
});
