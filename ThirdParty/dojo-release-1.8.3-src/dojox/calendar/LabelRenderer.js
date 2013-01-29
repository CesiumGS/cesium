define(["dojo/_base/declare", "dijit/_WidgetBase", "dijit/_TemplatedMixin",
	"dojox/calendar/_RendererMixin", "dojo/text!./templates/LabelRenderer.html"],
	 
	function(declare, _WidgetBase, _TemplatedMixin, _RendererMixin, template){
	
	return declare("dojox.calendar.LabelRenderer", [_WidgetBase, _TemplatedMixin, _RendererMixin], {
		
		// summary:
		//		The default item label renderer. 
		
		templateString: template,
		
		_orientation: "horizontal",
		
		resizeEnabled: false,
		
		visibilityLimits: {
			resizeStartHandle: 50,
			resizeEndHandle: -1,
			summaryLabel: 15,
			startTimeLabel: 45,
			endTimeLabel: 30
		},
		
		_isElementVisible: function(elt, startHidden, endHidden, size){
			switch(elt){
				case "startTimeLabel":
					var d = this.item.startTime;
					if(this.item.isAllDay || d.getHours() == 0 && d.getMinutes() == 0 && d.getSeconds() == 0 && d.getMilliseconds() == 0){
						return false;
					}
					break;
			}
			return this.inherited(arguments);
		},
		
		_displayValue: "inline",
		
		postCreate: function() {
			this.inherited(arguments);
			this._applyAttributes();
		}
	});
});
