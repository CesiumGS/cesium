define(["dojox/mobile/ProgressIndicator","dijit/registry"], function(ProgressIndicator, registry){
	return function(){
		// the default select_item is 0, or will throw an error if directly transition to #details,EditTodoItem view
		this.selected_item = 0;
		this.selected_configuration_item = 0;
		this.progressIndicator = null;
		/*
	 	* show or hide global progress indicator
	 	*/
	 	
		this.showProgressIndicator = function(show){
				
			if(!this.progressIndicator){
				this.progressIndicator = ProgressIndicator.getInstance({removeOnStop:false, startSpinning:true, size:40, center:true, interval:30});
				// TODO: use dojo.body will throw no appendChild method error.
				var body = document.getElementsByTagName("body")[0];
				body.appendChild(this.progressIndicator.domNode);
				this.progressIndicator.domNode.style.zIndex = 999;
			}
			if(show){
				this.progressIndicator.domNode.style.visibility = "visible";
				this.progressIndicator.start();
			}else{
				this.progressIndicator.stop();
				this.progressIndicator.domNode.style.visibility = "hidden";
			}
			
		}
	};
});
