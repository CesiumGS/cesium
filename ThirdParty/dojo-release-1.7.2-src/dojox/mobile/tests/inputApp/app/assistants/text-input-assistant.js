dojo.require("dojox.mobile.app.SceneAssistant");

dojo.declare("TextInputAssistant", dojox.mobile.app.SceneAssistant, {
  
  setup: function(){
    console.log("In main assistant setup");
    
    // Instantiate widgets in the template HTML.
    this.controller.parse();
    
    
  },
  
  activate: function(){
    console.log("In main assistant activate");
    
    
  }
  
});