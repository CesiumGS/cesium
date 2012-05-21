dojo.require("dojox.mobile.app.SceneAssistant");

dojo.declare("MainAssistant", dojox.mobile.app.SceneAssistant, {
  
  setup: function(){
    console.log("In main assistant setup");
    
    this.controller.parse();
    console.log("In main assistant setup 2");
    
    var data1 = [
      {
        label: "Row 1"
      },
      {
        label: "Row 2"
      }
    ];
    var data2 = [
      {
        label: "Row 3"
      },
      {
        label: "Row 4"
      },
      {
        label: "Row 5"
      },
      {
        label: "Row 6"
      }
    ];
    
    var listWidget = dijit.byId("listWidget");
    listWidget.set("items", data1);
    
    var _this = this;
    
    dojo.connect(listWidget, "onSelect", function(data, index, rowNode){
      try {
        console.log("selected data item  ", data);
        _this.controller.query(".listInfo")[0].innerHTML
                = "Selected (" + index + ") '" + data.label + "'";
      } catch(e){
        console.log("caught ", e);
      }
    });
    
    this.connect(dijit.byId("btn1"), "onClick", function(){
      dijit.byId("listWidget").set("items", data1);
    });
    this.connect(dijit.byId("btn2"), "onClick", function(){
      dijit.byId("listWidget").set("items", data2);
    });
    
    
  },
  
  activate: function(){
    console.log("In main assistant activate");
    
    
  }
  
});