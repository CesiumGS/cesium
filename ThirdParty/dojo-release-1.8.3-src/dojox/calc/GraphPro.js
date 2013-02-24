define([
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/window",
	"dojo/dom-style",
	"dojo/dom-construct",
	"dojo/dom-geometry",
	"dojo/ready",
	"dojox/calc/Standard",
	"dojox/calc/Grapher",
	"dojox/layout/FloatingPane",
	"dojo/text!./templates/GraphPro.html",
	"dojox/calc/_Executor", // template
	"dijit/Menu", // template
	"dijit/MenuItem", // template
	"dijit/form/ComboButton", // template
	"dijit/form/Button", // template
	"dijit/form/TextBox" // template
], function(declare, lang, win, domStyle, domConstruct, domGeometry, ready, Standard, calc, FloatingPane, template){


	return declare(
		"dojox.calc.GraphPro",
		Standard,
	{
		// summary:
		//		The dialog widget for a graphing, scientific calculator

		templateString: template,

		grapher:null,
		funcMaker:null,
		aFloatingPane: null,

		executorLoaded: function(){
			// summary:
			//		when executor loads check to see if the writestore is there
			this.inherited(arguments);
			ready(lang.hitch(this, function(){
				if(this.writeStore == null && "functionMakerButton" in this){
					domStyle.set(this.functionMakerButton.domNode, { visibility: "hidden" });
				}
			}));
		},
		makeFunctionWindow: function(){
			// summary:
			//		use this function to create a function window (with the button on the layout)
			var body = win.body();

			var pane = domConstruct.create('div');
			body.appendChild(pane);

			this.aFloatingPane = new dojox.layout.FloatingPane({resizable:false, dockable:true, maxable:false, closable:true, duration:300, title:"Function Window", style:"position:absolute;left:10em;top:10em;width:50em;"}, pane);
			var that = this;
			var d = domConstruct.create("div");
			this.funcMaker = new calc.FuncGen({
				writeStore:that.writeStore,
				readStore:that.readStore,
				functions:that.functions,
				deleteFunction: that.executor.deleteFunction,
				onSaved:function(){
					var	name,
						body;
					if((name = this.combo.get("value")) == ""){
						this.status.set("value", "The function needs a name");
					}else if((body = this.textarea.get("value")) == ""){
						// i don't think users need empty functions for math
						this.status.set("value", "The function needs a body");
					}else{
						var args = this.args.get("value");
						if(!(name in this.functions)){
							this.combo.item = this.writeStore.put({name: name, args: args, body: body});
						}
						this.saveFunction(name, args, body);
						this.status.set("value", "Function "+name+" was saved");
					}
				},
				saveFunction: lang.hitch(that, that.saveFunction)
			}, d);
			this.aFloatingPane.set('content', this.funcMaker);
			this.aFloatingPane.startup();
			this.aFloatingPane.bringToTop();
		},
		makeGrapherWindow: function(){
			// summary:
			//		use this to make a Grapher window appear with a button
			var body = win.body();

			var pane = domConstruct.create('div');
			body.appendChild(pane);

			this.aFloatingPane = new dojox.layout.FloatingPane({resizable:false, dockable:true, maxable:false, closable:true, duration:300, title:"Graph Window", style:"position:absolute;left:10em;top:5em;width:50em;"}, pane);
			var that = this;

			var d = domConstruct.create("div");
			this.grapher = new calc.Grapher({
				myPane: this.aFloatingPane,
				drawOne: function(i){
					this.array[i][this.chartIndex].resize(this.graphWidth.get("value"), this.graphHeight.get("value"));
					this.array[i][this.chartIndex].axes["x"].max = this.graphMaxX.get('value');
					if(this.array[i][this.expressionIndex].get("value")==""){
						this.setStatus(i, "Error");
						return;
					}
					var func;
					var yEquals = (this.array[i][this.functionMode]=="y=");
					if(this.array[i][this.expressionIndex].get("value")!=this.array[i][this.evaluatedExpression]){
						var args = 'x';
						if(!yEquals){
							args = 'y';
						}
						func = that.executor.Function('', args, "return "+this.array[i][this.expressionIndex].get('value'));
						this.array[i][this.evaluatedExpression] = this.array[i][this.expressionIndex].value;
						this.array[i][this.functionRef] = func;
					}
					else{
						func = this.array[i][this.functionRef];
					}
					var pickedColor = this.array[i][this.colorIndex].get("value");
					if(!pickedColor){
						pickedColor = 'black';
					}
					calc.draw(this.array[i][this.chartIndex], func, {graphNumber:this.array[i][this.funcNumberIndex], fOfX:yEquals, color:{stroke:{color:pickedColor}}});
					this.setStatus(i, "Drawn");
				},
				onDraw:function(){
					for(var i = 0; i < this.rowCount; i++){
						if((!this.dirty && this.array[i][this.checkboxIndex].get("checked")) || (this.dirty && this.array[i][this.statusIndex].innerHTML=="Drawn")){
							this.drawOne(i);
						}else{
							this.array[i][this.chartIndex].resize(this.graphWidth.get("value"), this.graphHeight.get("value"));
							this.array[i][this.chartIndex].axes["x"].max = this.graphMaxX.get('value');
						}
					}

					var bufferY = domGeometry.position(this.outerDiv).y-domGeometry.position(this.myPane.domNode).y;
					bufferY*=2;
					bufferY=Math.abs(bufferY);
					var height = "" + Math.max(parseInt(this.graphHeight.get('value'))+50, this.outerDiv.scrollHeight+bufferY);
					var width = "" + (parseInt(this.graphWidth.get('value')) + this.outerDiv.scrollWidth);
					this.myPane.resize({w:width, h:height});
				}
			}, d);
			this.aFloatingPane.set('content', this.grapher);
			this.aFloatingPane.startup();
			this.aFloatingPane.bringToTop();
		}
	});
});
