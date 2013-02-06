dojo.provide("dojox.layout.ext-dijit.layout.StackContainer-touch");
dojo.experimental("dojox.layout.ext-dijit.layout.StackContainer-touch");
dojo.require("dijit.layout.StackContainer");

// To support "flick" actions on iPhone, iPod Touch, etc.
// Implemented as a mixin to work with StackContainer (horizontal) and AccordionContainer (vertical)
// TODO: use native CSS animations for fx, provide live tracking of touch and perhaps a 'bounce' effect.

dojo.connect(dijit.layout.StackContainer.prototype, "postCreate", function(){
	this.axis = (this.baseClass == "dijitAccordionContainer") ? "Y" : "X";
	dojo.forEach(
		["touchstart", "touchmove", "touchend", "touchcancel"],
		function(p){
			this.connect(this.domNode, p, function(e){
				switch(e.type){
					case "touchmove":
						e.preventDefault();
						if(this.touchPosition){
							var delta = e.touches[0]["page" + this.axis] - this.touchPosition;
							if(Math.abs(delta) > 100){
								if(this.axis == "Y"){ delta *= -1;}
								delete this.touchPosition;
								if(delta > 0){
									!this.selectedChildWidget.isLastChild && this.forward();
								}else{
									!this.selectedChildWidget.isFirstChild && this.back();
								}
							}
						}
						break;
					case "touchstart":
						if(e.touches.length == 1){
							this.touchPosition = e.touches[0]["page" + this.axis];
							break;
						}
					// else fallthrough
					case "touchend":
					case "touchcancel":
						delete this.touchPosition;
				}
			});
		},
		this);
});
