/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.calc.GraphPro"]){
dojo._hasResource["dojox.calc.GraphPro"]=true;
dojo.provide("dojox.calc.GraphPro");
dojo.require("dojox.calc.Standard");
dojo.require("dijit.dijit");
dojo.require("dijit.form.ComboBox");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.ColorPalette");
dojo.require("dojox.charting.Chart2D");
dojo.require("dojox.calc.Grapher");
dojo.require("dojox.layout.FloatingPane");
dojo.require("dojox.charting.themes.Tufte");
dojo.require("dojo.colors");
dojo.experimental("dojox.calc.GraphPro");
dojo.declare("dojox.calc.GraphPro",dojox.calc.Standard,{templateString:dojo.cache("dojox.calc","templates/GraphPro.html","<div class=\"dijitReset dijitInline dojoxCalc\"\n><table class=\"dijitReset dijitInline dojoxCalcLayout\" dojoAttachPoint=\"calcTable\" rules=\"none\" cellspacing=0 cellpadding=0 border=0>\n\t<tr\n\t\t><td colspan=\"4\" class=\"dojoxCalcTextAreaContainer\"\n\t\t\t><div class=\"dijitTextBox dijitTextArea\" style=\"height:10em;width:auto;max-width:15.3em;border-width:0px;\" dojoAttachPoint='displayBox'></div\n\t\t></td\n\t></tr>\n\t<tr\n\t\t><td colspan=\"4\" class=\"dojoxCalcInputContainer\"\n\t\t\t><input dojoType=\"dijit.form.TextBox\" dojoAttachEvent=\"onBlur:onBlur,onKeyPress:onKeyPress\" dojoAttachPoint='textboxWidget'\n\t\t/></td\n\t></tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"grapherMakerButton\" label=\"Graph\" dojoAttachEvent='onClick:makeGrapherWindow' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"functionMakerButton\" label=\"Func\" dojoAttachEvent='onClick:makeFunctionWindow' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"toFracButton\" label=\"toFrac\" value=\"toFrac(\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td colspan=\"1\" class=\"dojoxCalcButtonContainer\">\n\t\t</td>\n\n\t</tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"seven\" label=\"7\" value='7' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"eight\" label=\"8\" value='8' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"nine\" label=\"9\" value='9' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"divide\" label=\"/\" value='/' dojoAttachEvent='onClick:insertOperator' />\n\t\t</td>\n\t</tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"four\" label=\"4\" value='4' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"five\" label=\"5\" value='5' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"six\" label=\"6\" value='6' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"multiply\" label=\"*\" value='*' dojoAttachEvent='onClick:insertOperator' />\n\t\t</td>\n\t</tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"one\" label=\"1\" value='1' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"two\" label=\"2\" value='2' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"three\" label=\"3\" value='3' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"add\" label=\"+\" value='+' dojoAttachEvent='onClick:insertOperator' />\n\t\t</td>\n\t</tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"decimal\" label=\".\" value='.' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"zero\" label=\"0\" value='0' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"equals\" label=\"x=y\" value='=' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcMinusButtonContainer\">\n\t\t\t<span dojoType=\"dijit.form.ComboButton\" dojoAttachPoint=\"subtract\" label='-' value='-' dojoAttachEvent='onClick:insertOperator'>\n\n\t\t\t\t<div dojoType=\"dijit.Menu\" style=\"display:none;\">\n\t\t\t\t\t<div dojoType=\"dijit.MenuItem\" dojoAttachEvent=\"onClick:insertMinus\">\n\t\t\t\t\t\t(-)\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</span>\n\t\t</td>\n\t</tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"clear\" label=\"Clear\" dojoAttachEvent='onClick:clearText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"sqrt\" label=\"&#x221A;\" value=\"&#x221A;\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"power\" label=\"^\" value=\"^\" dojoAttachEvent='onClick:insertOperator' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"factorialButton\" label=\"!\" value=\"!\" dojoAttachEvent='onClick:insertOperator' />\n\t\t</td>\n\t</tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"pi\" label=\"&#x03C0;\" value=\"&#x03C0;\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"sin\" label=\"sin\" value=\"sin(\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"cos\" label=\"cos\" value=\"cos(\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"tan\" label=\"tan\" value=\"tan(\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\n\t</tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"e\" label=\"&#x03F5;\" value=\"&#x03F5;\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"log10\" label=\"log\" value=\"log(\" value=\"log(\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"lnE\" label=\"ln\" value=\"ln(\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"round\" label=\"Round\" value=\"Round(\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\n\t</tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"intButton\" label=\"Int\" value=\"Int(\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"PermutationButton\" label=\"P\" value=\"P(\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"CombinationButton\" label=\"C\" value=\"C(\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"comma\" label=\",\" value=',' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\n\t</tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"AnsButton\" label=\"Ans\" value=\"Ans\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"LeftParenButton\" label=\"(\" value=\"(\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"RightParenButton\" label=\")\" value=\")\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"enter\" label=\"Enter\" dojoAttachEvent='onClick:parseTextbox' />\n\t\t</td>\n\t</tr>\n</table>\n<span dojoAttachPoint=\"executor\" dojoType=\"dojox.calc._Executor\" dojoAttachEvent=\"onLoad:executorLoaded\"></span>\n</div>\n"),grapher:null,funcMaker:null,aFloatingPane:null,executorLoaded:function(){
this.inherited(arguments);
dojo.addOnLoad(dojo.hitch(this,function(){
if(this.writeStore==null&&"functionMakerButton" in this){
dojo.style(this.functionMakerButton.domNode,{visibility:"hidden"});
}
}));
},makeFunctionWindow:function(){
var _1=dojo.body();
var _2=dojo.create("div");
_1.appendChild(_2);
this.aFloatingPane=new dojox.layout.FloatingPane({resizable:false,dockable:true,maxable:false,closable:true,duration:300,title:"Function Window",style:"position:absolute;left:10em;top:10em;width:50em;"},_2);
var _3=this;
var d=dojo.create("div");
this.funcMaker=new dojox.calc.FuncGen({writeStore:_3.writeStore,readStore:_3.readStore,functions:_3.functions,deleteFunction:_3.executor.deleteFunction,onSaved:function(){
var _4,_1;
if((_4=this.combo.get("value"))==""){
this.status.set("value","The function needs a name");
}else{
if((_1=this.textarea.get("value"))==""){
this.status.set("value","The function needs a body");
}else{
var _5=this.args.get("value");
if(!(_4 in this.functions)){
this.combo.item=this.writeStore.newItem({name:_4,args:_5,body:_1});
this.writeStore.save();
}
this.saveFunction(_4,_5,_1);
this.status.set("value","Function "+_4+" was saved");
}
}
},saveFunction:dojo.hitch(_3,_3.saveFunction)},d);
this.aFloatingPane.set("content",this.funcMaker);
this.aFloatingPane.startup();
this.aFloatingPane.bringToTop();
},makeGrapherWindow:function(){
var _6=dojo.body();
var _7=dojo.create("div");
_6.appendChild(_7);
this.aFloatingPane=new dojox.layout.FloatingPane({resizable:false,dockable:true,maxable:false,closable:true,duration:300,title:"Graph Window",style:"position:absolute;left:10em;top:5em;width:50em;"},_7);
var _8=this;
var d=dojo.create("div");
this.grapher=new dojox.calc.Grapher({myPane:this.aFloatingPane,drawOne:function(i){
this.array[i][this.chartIndex].resize(this.graphWidth.get("value"),this.graphHeight.get("value"));
this.array[i][this.chartIndex].axes["x"].max=this.graphMaxX.get("value");
if(this.array[i][this.expressionIndex].get("value")==""){
this.setStatus(i,"Error");
return;
}
var _9;
var _a=(this.array[i][this.functionMode]=="y=");
if(this.array[i][this.expressionIndex].get("value")!=this.array[i][this.evaluatedExpression]){
var _b="x";
if(!_a){
_b="y";
}
_9=_8.executor.Function("",_b,"return "+this.array[i][this.expressionIndex].get("value"));
this.array[i][this.evaluatedExpression]=this.array[i][this.expressionIndex].value;
this.array[i][this.functionRef]=_9;
}else{
_9=this.array[i][this.functionRef];
}
var _c=this.array[i][this.colorIndex].get("value");
if(!_c){
_c="black";
}
dojox.calc.Grapher.draw(this.array[i][this.chartIndex],_9,{graphNumber:this.array[i][this.funcNumberIndex],fOfX:_a,color:{stroke:{color:_c}}});
this.setStatus(i,"Drawn");
},onDraw:function(){
for(var i=0;i<this.rowCount;i++){
if((!this.dirty&&this.array[i][this.checkboxIndex].get("checked"))||(this.dirty&&this.array[i][this.statusIndex].innerHTML=="Drawn")){
this.drawOne(i);
}else{
this.array[i][this.chartIndex].resize(this.graphWidth.get("value"),this.graphHeight.get("value"));
this.array[i][this.chartIndex].axes["x"].max=this.graphMaxX.get("value");
}
}
var _d=dojo.position(this.outerDiv).y-dojo.position(this.myPane.domNode).y;
_d*=2;
_d=Math.abs(_d);
var _e=""+Math.max(parseInt(this.graphHeight.get("value"))+50,this.outerDiv.scrollHeight+_d);
var _f=""+(parseInt(this.graphWidth.get("value"))+this.outerDiv.scrollWidth);
this.myPane.resize({w:_f,h:_e});
}},d);
this.aFloatingPane.set("content",this.grapher);
this.aFloatingPane.startup();
this.aFloatingPane.bringToTop();
}});
}
