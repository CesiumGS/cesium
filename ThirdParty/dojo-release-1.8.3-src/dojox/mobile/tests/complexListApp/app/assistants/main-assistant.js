dojo.require("dojox.mobile.app.SceneAssistant");

dojo.declare("MainAssistant", dojox.mobile.app.SceneAssistant, {

	setup: function(){
		console.log("In main assistant setup");

		this.controller.parse();
		console.log("In main assistant setup 2");

		var data1 = [
			{
				label: "Row 1",
				button1Cls: "listButton1",
				button2Cls: "listButton2",
				buttonLabel1: "Add"
			},
			{
				label: "Row 2",
				button1Cls: "listButton2",
				button2Cls: "listButton1"
			}
		];
		var data2 = [
			{
				label: "Row 3",
				button1Cls: "listButton1",
				button2Cls: "listButtonHidden"
			},
			{
				label: "Row 4",
				button1Cls: "listButton2",
				button2Cls: "listButton3"
			},
			{
				label: "Row 5",
				button1Cls: "listButton3",
				button2Cls: "listButton2",
				buttonLabel2: "Del"
			},
			{
				label: "Row 6",
				button1Cls: "listButtonHidden",
				button2Cls: "listButton2"
			}
		];
		var data3 = [];

		var listWidget = dijit.byId("listWidget");

		listWidget.dividerFunction = function(item){
			return item.label < "Row 5" ? "First Section" : "Second Section";
		};
		listWidget.set("items", data1);

		var buttonOutput = this.controller.query("#buttonOutput")[0];

		this.connect(dijit.byId("btn1"), "onClick", function(){
			dijit.byId("listWidget").set("items", data1);
		});
		this.connect(dijit.byId("btn2"), "onClick", function(){
			dijit.byId("listWidget").set("items", data2);
		});
		this.connect(dijit.byId("btn3"), "onClick", function(){
			dijit.byId("listWidget").set("items", data3);
		});

		var _this = this;

		this.connect(dijit.byId("listWidget").domNode, "onclick", function(event){
			// If the user clicked one of the buttons in a row,
			// then show a popup menu for further actions.
			if(!event.item){
				return;
			}

			if(dojo.hasClass(event.target, "listBtn")){
				buttonOutput.innerHTML = "You clicked Item " + event.index
								+ " with the label '" + event.item.label + "'"
								+ " using a button with the CSS class '"
								+ event.target.className.split(" ")[2]
								+ "'";

				_this.showMenu(event.target);
			} else {
				buttonOutput.innerHTML = "You clicked Item " + event.index
								+ " with the label '" + event.item.label + "'"
			}
		});
//
//	  this.connect(dijit.byId("listWidget").domNode, "onmousedown", function(event){
//		_this.controller.showAlertDialog({
//		  title: "MDown",
//		  text: "type: " + dojox.mobile.app.isIPhone//event.target.className
//		})
//	  });

	},

	showMenu: function(fromNode){

		var buttonOutput = this.controller.query("#buttonOutput")[0];

		this.controller.popupSubMenu({
			choices: [
				{label: "Option 1", value: 1},
				{label: "Option 2", value: 2},
				{label: "Option 3 - A Bit Longer", value: 3},
				{label: "Option 4", value: 4}
			],

			fromNode: fromNode,

			onChoose: function(value){
				buttonOutput.innerHTML = "You chose the menu item with value " + value;
			}

		})
	},

	activate: function(){
		console.log("In main assistant activate");


	}

});