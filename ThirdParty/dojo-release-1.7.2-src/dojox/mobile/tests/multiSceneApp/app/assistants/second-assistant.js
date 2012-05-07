dojo.require("dojox.mobile.app.SceneAssistant");

dojo.declare("SecondAssistant", dojox.mobile.app.SceneAssistant, {
  
  setup: function(){
    console.log("In second assistant setup");
    
    // Instantiate widgets in the template HTML.
    this.controller.parse();
    
    var _this = this;
     this.connect(dijit.byId("btn1"), "onClick", function(){
      _this.controller.stageController.popScene("Button 1");
    });
    this.connect(dijit.byId("btn2"), "onClick", function(){
      _this.controller.stageController.pushScene("third", "Came from second scene");
    });
  },
  
  activate: function(data){
    console.log("In main assistant activate");
    var node = this.controller.query(".inputData")[0];
    if(data) {
      node.innerHTML = "Scene got the data: " + data;
    } else {
      node.innerHTML = "Scene did not receive data";
    }
  }
  
});