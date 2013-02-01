define(["dojo/_base/declare", "dojo/dom-construct", "dojo/dom-style"],
	function(declare, domConstruct, domStyle) {

	return declare("dojox.treemap.GroupLabel", null, {
		// summary:
		//		Specializes TreeMap to remove leaf labels and display group labels centered on group
		//		content instead of display them in headers.

		createRenderer: function(item, level, kind){
			var renderer = this.inherited(arguments);
			if(kind == "content" || kind == "leaf"){
				var p = domConstruct.create("div");
				domStyle.set(p, {
					"zIndex": 30,
					"position": "relative",
					"height": "100%",
					"textAlign": "center",
					"top": "50%",
					"marginTop": "-.5em"
				});
				domConstruct.place(p, renderer);
			}
			return renderer;
		},

		styleRenderer: function(renderer, item, level, kind){
			switch(kind){
				case "leaf":
					domStyle.set(renderer, "background", this.getColorForItem(item).toHex());
				case "content":
					if(level == 0){
						renderer.firstChild.innerHTML = this.getLabelForItem(item);
					}else{
						renderer.firstChild.innerHTML = null;
					}
					break;
				case "header":
					domStyle.set(renderer, "display", "none");
			}
		}
	});
});