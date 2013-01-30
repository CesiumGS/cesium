dojo.provide("dojox.wire.demos.WidgetRepeater")
		
dojo.require("dojo.parser");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dijit._Container");

dojo.declare("dojox.wire.demos.WidgetRepeater", [ dijit._Widget, dijit._Templated, dijit._Container ], {
	// summary:
	//		Simple widget that does generation of widgets repetatively, based on calls to
	//		the createNew function and contains them as child widgets.
	templateString: "<div class='WidgetRepeater' dojoAttachPoint='repeaterNode'></div>",
	widget: null,
	repeater: null,
	createNew: function(obj){
		// summary:
		//		Function to handle the creation of a new widget and appending it into the widget tree.
		// obj:
		//		The parameters to pass to the widget.
		try{
			if(dojo.isString(this.widget)){
				// dojo.require(this.widget);	confuses new AMD builder, include resource manually first
				this.widget = dojo.getObject(this.widget);
			}
			this.addChild(new this.widget(obj));
			this.repeaterNode.appendChild(document.createElement("br"));
		}catch(e){ console.debug(e); }
	}
});
