/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.calc.Grapher"]){
dojo._hasResource["dojox.calc.Grapher"]=true;
dojo.provide("dojox.calc.Grapher");
dojo.require("dijit._Templated");
dojo.require("dojox.math._base");
dojo.require("dijit.dijit");
dojo.require("dijit.form.DropDownButton");
dojo.require("dijit.TooltipDialog");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Button");
dojo.require("dijit.form.ComboBox");
dojo.require("dijit.form.Select");
dojo.require("dijit.form.CheckBox");
dojo.require("dijit.ColorPalette");
dojo.require("dojox.charting.Chart2D");
dojo.require("dojox.charting.themes.Tufte");
dojo.require("dojo.colors");
dojo.experimental("dojox.calc.Grapher");
dojo.declare("dojox.calc.Grapher",[dijit._Widget,dijit._Templated],{templateString:dojo.cache("dojox.calc","templates/Grapher.html","<div>\n<div dojoAttachPoint=\"chartsParent\" class=\"dojoxCalcChartHolder\"></div>\n<span dojoAttachPoint=\"outerDiv\">\n<div dojoType=\"dijit.form.DropDownButton\" dojoAttachPoint=\"windowOptions\" class=\"dojoxCalcDropDownForWindowOptions\" title=\"Window Options\">\n\t<div>Window Options</div>\n\t<div dojoType=\"dijit.TooltipDialog\" dojoAttachPoint=\"windowOptionsInside\" class=\"dojoxCalcTooltipDialogForWindowOptions\" title=\"\">\n\t\t<table class=\"dojoxCalcGraphOptionTable\">\n\t\t\t<tr>\n\t\t\t\t<td>\n\t\t\t\t\tWidth:\n\t\t\t\t</td>\n\t\t\t\t<td>\n\t\t\t\t\t<input dojoType=\"dijit.form.TextBox\" dojoAttachPoint=\"graphWidth\" class=\"dojoxCalcGraphWidth\" value=\"500\" />\n\t\t\t\t</td>\n\t\t\t\t<td>\n\t\t\t\t\tHeight:\n\t\t\t\t</td>\n\t\t\t\t<td>\n\t\t\t\t\t<input dojoType=\"dijit.form.TextBox\" dojoAttachPoint=\"graphHeight\" class=\"dojoxCalcGraphHeight\" value=\"500\" />\n\t\t\t\t</td>\n\t\t\t</tr>\n\t\t\t<tr>\n\t\t\t\t<td>\n\t\t\t\t\tX >=\n\t\t\t\t</td>\n\t\t\t\t<td>\n\t\t\t\t\t<input dojoType=\"dijit.form.TextBox\" dojoAttachPoint=\"graphMinX\" class=\"dojoxCalcGraphMinX\" value=\"-10\" />\n\t\t\t\t</td>\n\n\t\t\t\t<td>\n\t\t\t\t\tX <=\n\t\t\t\t</td>\n\t\t\t\t<td>\n\t\t\t\t\t<input dojoType=\"dijit.form.TextBox\" dojoAttachPoint=\"graphMaxX\" class=\"dojoxCalcGraphMaxX\" value=\"10\" />\n\t\t\t\t</td>\n\t\t\t</tr>\n\t\t\t<tr>\n\t\t\t\t<td>\n\t\t\t\t\tY >=\n\t\t\t\t</td>\n\t\t\t\t<td>\n\t\t\t\t\t<input dojoType=\"dijit.form.TextBox\" dojoAttachPoint=\"graphMinY\" class=\"dojoxCalcGraphMinY\" value=\"-10\" />\n\t\t\t\t</td>\n\n\t\t\t\t<td>\n\t\t\t\t\tY <=\n\t\t\t\t</td>\n\t\t\t\t<td>\n\t\t\t\t\t<input dojoType=\"dijit.form.TextBox\" dojoAttachPoint=\"graphMaxY\" class=\"dojoxCalcGraphMaxY\" value=\"10\" />\n\t\t\t\t</td>\n\t\t\t</tr>\n\t\t</table>\n\t</div>\n</div>\n\n<BR>\n\n<div class=\"dojoxCalcGrapherFuncOuterDiv\">\n\t<table class=\"dojoxCalcGrapherFuncTable\" dojoAttachPoint=\"graphTable\">\n\t</table>\n</div>\n\n<div dojoType=\"dijit.form.DropDownButton\" dojoAttachPoint='addFuncButton' class=\"dojoxCalcDropDownAddingFunction\">\n\t<div>Add Function</div>\n\t<div dojoType=\"dijit.TooltipDialog\" dojoAttachPoint=\"addFuncInside\" class=\"dojoxCalcTooltipDialogAddingFunction\" title=\"\">\n\t\t<table class=\"dojoxCalcGrapherModeTable\">\n\t\t\t<tr>\n\t\t\t\t<td>\n\t\t\t\t\tMode:\n\t\t\t\t</td>\n\t\t\t\t<td>\n\t\t\t\t\t<select dojoType=\"dijit.form.Select\" dojoAttachPoint=\"funcMode\" class=\"dojoxCalcFunctionModeSelector\">\n\t\t\t\t\t\t<option value=\"y=\" selected=\"selected\">y=</option>\n\t\t\t\t\t\t<option value=\"x=\">x=</option>\n\t\t\t\t\t</select>\n\t\t\t\t</td>\n\t\t\t\t<td>\n\t\t\t</tr>\n\t\n\t\t\t<tr>\n\t\t\t\t<td>\n\t\t\t\t\t<input dojoType=\"dijit.form.Button\" dojoAttachPoint=\"createFunc\" class=\"dojoxCalcAddFunctionButton\" label=\"Create\" />\n\t\t\t\t</td>\n\t\t\t</tr>\n\t\t</table>\n\t</div>\n</div>\n<BR>\n<BR>\n<table class=\"dijitInline dojoxCalcGrapherLayout\">\n\t<tr>\n\t\t<td class=\"dojoxCalcGrapherButtonContainer\">\n\t\t\t<input dojoType=\"dijit.form.Button\" class=\"dojoxCalcGrapherButton\" dojoAttachPoint='selectAllButton' label=\"Select All\" />\n\t\t</td>\n\t\t<td class=\"dojoxCalcGrapherButtonContainer\">\n\t\t\t<input dojoType=\"dijit.form.Button\" class=\"dojoxCalcGrapherButton\" dojoAttachPoint='deselectAllButton' label=\"Deselect All\" />\n\t\t</td>\n\t</tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcGrapherButtonContainer\">\n\t\t\t<input dojoType=\"dijit.form.Button\" class=\"dojoxCalcGrapherButton\" dojoAttachPoint='drawButton'label=\"Draw Selected\" />\n\t\t</td>\n\t\t<td class=\"dojoxCalcGrapherButtonContainer\">\n\t\t\t<input dojoType=\"dijit.form.Button\" class=\"dojoxCalcGrapherButton\" dojoAttachPoint='eraseButton' label=\"Erase Selected\" />\n\t\t</td>\n\t</tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcGrapherButtonContainer\">\n\t\t\t<input dojoType=\"dijit.form.Button\" class=\"dojoxCalcGrapherButton\" dojoAttachPoint='deleteButton' label=\"Delete Selected\" />\n\t\t</td>\n\t\t<td class=\"dojoxCalcGrapherButtonContainer\">\n\t\t\t<input dojoType=\"dijit.form.Button\" class=\"dojoxCalcGrapherButton\" dojoAttachPoint='closeButton' label=\"Close\" />\n\t\t</td>\n\t</tr>\n</table>\n</span>\n</div>\n"),widgetsInTemplate:true,addXYAxes:function(_1){
return _1.addAxis("x",{max:parseInt(this.graphMaxX.get("value")),min:parseInt(this.graphMinX.get("value")),majorLabels:true,minorLabels:true,minorTicks:false,microTicks:false,htmlLabels:true,labelFunc:function(_2){
return _2;
},maxLabelSize:30,fixUpper:"major",fixLower:"major",majorTick:{length:3}}).addAxis("y",{max:parseInt(this.graphMaxY.get("value")),min:parseInt(this.graphMinY.get("value")),labelFunc:function(_3){
return _3;
},maxLabelSize:50,vertical:true,microTicks:false,minorTicks:true,majorTick:{stroke:"black",length:3}});
},selectAll:function(){
for(var i=0;i<this.rowCount;i++){
this.array[i][this.checkboxIndex].set("checked",true);
}
},deselectAll:function(){
for(var i=0;i<this.rowCount;i++){
this.array[i][this.checkboxIndex].set("checked",false);
}
},drawOne:function(i){
},onDraw:function(){
},erase:function(i){
var _4=0;
var _5="Series "+this.array[i][this.funcNumberIndex]+"_"+_4;
while(_5 in this.array[i][this.chartIndex].runs){
this.array[i][this.chartIndex].removeSeries(_5);
_4++;
_5="Series "+this.array[i][this.funcNumberIndex]+"_"+_4;
}
this.array[i][this.chartIndex].render();
this.setStatus(i,"Hidden");
},onErase:function(){
for(var i=0;i<this.rowCount;i++){
if(this.array[i][this.checkboxIndex].get("checked")){
this.erase(i);
}
}
},onDelete:function(){
for(var i=0;i<this.rowCount;i++){
if(this.array[i][this.checkboxIndex].get("checked")){
this.erase(i);
for(var k=0;k<this.functionRef;k++){
if(this.array[i][k]&&this.array[i][k]["destroy"]){
this.array[i][k].destroy();
}
}
this.graphTable.deleteRow(i);
this.array.splice(i,1);
this.rowCount--;
i--;
}
}
},checkboxIndex:0,functionMode:1,expressionIndex:2,colorIndex:3,dropDownIndex:4,tooltipIndex:5,colorBoxFieldsetIndex:6,statusIndex:7,chartIndex:8,funcNumberIndex:9,evaluatedExpression:10,functionRef:11,createFunction:function(){
var tr=this.graphTable.insertRow(-1);
this.array[tr.rowIndex]=[];
var td=tr.insertCell(-1);
var d=dojo.create("div");
td.appendChild(d);
var _6=new dijit.form.CheckBox({},d);
this.array[tr.rowIndex][this.checkboxIndex]=_6;
dojo.addClass(d,"dojoxCalcCheckBox");
td=tr.insertCell(-1);
var _7=this.funcMode.get("value");
d=dojo.doc.createTextNode(_7);
td.appendChild(d);
this.array[tr.rowIndex][this.functionMode]=_7;
td=tr.insertCell(-1);
d=dojo.create("div");
td.appendChild(d);
var _8=new dijit.form.TextBox({},d);
this.array[tr.rowIndex][this.expressionIndex]=_8;
dojo.addClass(d,"dojoxCalcExpressionBox");
var b=dojo.create("div");
var _9=new dijit.ColorPalette({changedColor:this.changedColor},b);
dojo.addClass(b,"dojoxCalcColorPalette");
this.array[tr.rowIndex][this.colorIndex]=_9;
var c=dojo.create("div");
var _a=new dijit.TooltipDialog({content:_9},c);
this.array[tr.rowIndex][this.tooltipIndex]=_a;
dojo.addClass(c,"dojoxCalcContainerOfColor");
td=tr.insertCell(-1);
d=dojo.create("div");
td.appendChild(d);
var _b=dojo.create("fieldset");
dojo.style(_b,{backgroundColor:"black",width:"1em",height:"1em",display:"inline"});
this.array[tr.rowIndex][this.colorBoxFieldsetIndex]=_b;
var _c=new dijit.form.DropDownButton({label:"Color ",dropDown:_a},d);
_c.containerNode.appendChild(_b);
this.array[tr.rowIndex][this.dropDownIndex]=_c;
dojo.addClass(d,"dojoxCalcDropDownForColor");
td=tr.insertCell(-1);
d=dojo.create("fieldset");
d.innerHTML="Hidden";
this.array[tr.rowIndex][this.statusIndex]=d;
dojo.addClass(d,"dojoxCalcStatusBox");
td.appendChild(d);
d=dojo.create("div");
dojo.style(d,{position:"absolute",left:"0px",top:"0px"});
this.chartsParent.appendChild(d);
this.array[tr.rowIndex][this.chartNodeIndex]=d;
dojo.addClass(d,"dojoxCalcChart");
var _d=new dojox.charting.Chart2D(d).setTheme(dojox.charting.themes.Tufte).addPlot("default",{type:"Lines",shadow:{dx:1,dy:1,width:2,color:[0,0,0,0.3]}});
this.addXYAxes(_d);
this.array[tr.rowIndex][this.chartIndex]=_d;
_9.set("chart",_d);
_9.set("colorBox",_b);
_9.set("onChange",dojo.hitch(_9,"changedColor"));
this.array[tr.rowIndex][this.funcNumberIndex]=this.funcNumber++;
this.rowCount++;
},setStatus:function(i,_e){
this.array[i][this.statusIndex].innerHTML=_e;
},changedColor:function(){
var _f=this.get("chart");
var _10=this.get("colorBox");
for(var i=0;i<_f.series.length;i++){
if(_f.series[i]["stroke"]){
if(_f.series[i].stroke["color"]){
_f.series[i]["stroke"].color=this.get("value");
_f.dirty=true;
}
}
}
_f.render();
dojo.style(_10,{backgroundColor:this.get("value")});
},makeDirty:function(){
this.dirty=true;
},checkDirty1:function(){
setTimeout(dojo.hitch(this,"checkDirty"),0);
},checkDirty:function(){
if(this.dirty){
for(var i=0;i<this.rowCount;i++){
this.array[i][this.chartIndex].removeAxis("x");
this.array[i][this.chartIndex].removeAxis("y");
this.addXYAxes(this.array[i][this.chartIndex]);
}
this.onDraw();
}
this.dirty=false;
},postCreate:function(){
this.inherited(arguments);
this.createFunc.set("onClick",dojo.hitch(this,"createFunction"));
this.selectAllButton.set("onClick",dojo.hitch(this,"selectAll"));
this.deselectAllButton.set("onClick",dojo.hitch(this,"deselectAll"));
this.drawButton.set("onClick",dojo.hitch(this,"onDraw"));
this.eraseButton.set("onClick",dojo.hitch(this,"onErase"));
this.deleteButton.set("onClick",dojo.hitch(this,"onDelete"));
this.dirty=false;
this.graphWidth.set("onChange",dojo.hitch(this,"makeDirty"));
this.graphHeight.set("onChange",dojo.hitch(this,"makeDirty"));
this.graphMaxX.set("onChange",dojo.hitch(this,"makeDirty"));
this.graphMinX.set("onChange",dojo.hitch(this,"makeDirty"));
this.graphMaxY.set("onChange",dojo.hitch(this,"makeDirty"));
this.graphMinY.set("onChange",dojo.hitch(this,"makeDirty"));
this.windowOptionsInside.set("onClose",dojo.hitch(this,"checkDirty1"));
this.funcNumber=0;
this.rowCount=0;
this.array=[];
},startup:function(){
this.inherited(arguments);
var _11=dijit.getEnclosingWidget(this.domNode.parentNode);
if(_11&&typeof _11.close=="function"){
this.closeButton.set("onClick",dojo.hitch(_11,"close"));
}else{
dojo.style(this.closeButton.domNode,"display","none");
}
this.createFunction();
this.array[0][this.checkboxIndex].set("checked",true);
this.onDraw();
this.erase(0);
this.array[0][this.expressionIndex].value="";
}});
(function(){
var _12=1e-15/9,_13=1e+200,_14=Math.log(2),_15={graphNumber:0,fOfX:true,color:{stroke:"black"}};
dojox.calc.Grapher.draw=function(_16,_17,_18){
_18=dojo.mixin({},_15,_18);
_16.fullGeometry();
var x;
var y;
var _19;
if(_18.fOfX==true){
x="x";
y="y";
_19=dojox.calc.Grapher.generatePoints(_17,x,y,_16.axes.x.scaler.bounds.span,_16.axes.x.scaler.bounds.lower,_16.axes.x.scaler.bounds.upper,_16.axes.y.scaler.bounds.lower,_16.axes.y.scaler.bounds.upper);
}else{
x="y";
y="x";
_19=dojox.calc.Grapher.generatePoints(_17,x,y,_16.axes.y.scaler.bounds.span,_16.axes.y.scaler.bounds.lower,_16.axes.y.scaler.bounds.upper,_16.axes.x.scaler.bounds.lower,_16.axes.x.scaler.bounds.upper);
}
var i=0;
if(_19.length>0){
for(;i<_19.length;i++){
if(_19[i].length>0){
_16.addSeries("Series "+_18.graphNumber+"_"+i,_19[i],_18.color);
}
}
}
var _1a="Series "+_18.graphNumber+"_"+i;
while(_1a in _16.runs){
_16.removeSeries(_1a);
i++;
_1a="Series "+_18.graphNumber+"_"+i;
}
_16.render();
return _19;
};
dojox.calc.Grapher.generatePoints=function(_1b,x,y,_1c,_1d,_1e,_1f,_20){
var _21=(1<<Math.ceil(Math.log(_1c)/_14));
var dx=(_1e-_1d)/_21,_22=[],_23=0,_24,_25;
_22[_23]=[];
var i=_1d,k,p;
for(var _26=0;_26<=_21;i+=dx,_26++){
p={};
p[x]=i;
p[y]=_1b({_name:x,_value:i,_graphing:true});
if(p[x]==null||p[y]==null){
return {};
}
if(isNaN(p[y])||isNaN(p[x])){
continue;
}
_22[_23].push(p);
if(_22[_23].length==3){
_24=_27(_28(_22[_23][_22[_23].length-3],_22[_23][_22[_23].length-2]),_28(_22[_23][_22[_23].length-2],_22[_23][_22[_23].length-1]));
continue;
}
if(_22[_23].length<4){
continue;
}
_25=_27(_28(_22[_23][_22[_23].length-3],_22[_23][_22[_23].length-2]),_28(_22[_23][_22[_23].length-2],_22[_23][_22[_23].length-1]));
if(_24.inc!=_25.inc||_24.pos!=_25.pos){
var a=_29(_1b,_22[_23][_22[_23].length-3],_22[_23][_22[_23].length-1]);
p=_22[_23].pop();
_22[_23].pop();
for(var j=0;j<a[0].length;j++){
_22[_23].push(a[0][j]);
}
for(k=1;k<a.length;k++){
_22[++_23]=a.pop();
}
_22[_23].push(p);
_24=_25;
}
}
while(_22.length>1){
for(k=0;k<_22[1].length;k++){
if(_22[0][_22[0].length-1][x]==_22[1][k][x]){
continue;
}
_22[0].push(_22[1][k]);
}
_22.splice(1,1);
}
_22=_22[0];
var s=0;
var _2a=[[]];
for(k=0;k<_22.length;k++){
var x1,y1,b,_2b;
if(isNaN(_22[k][y])||isNaN(_22[k][x])){
while(isNaN(_22[k][y])||isNaN(_22[k][x])){
_22.splice(k,1);
}
_2a[++s]=[];
k--;
}else{
if(_22[k][y]>_20||_22[k][y]<_1f){
if(k>0&&_22[k-1].y!=_1f&&_22[k-1].y!=_20){
_2b=_28(_22[k-1],_22[k]);
if(_2b>_13){
_2b=_13;
}else{
if(_2b<-_13){
_2b=-_13;
}
}
if(_22[k][y]>_20){
y1=_20;
}else{
y1=_1f;
}
b=_22[k][y]-_2b*_22[k][x];
x1=(y1-b)/_2b;
p={};
p[x]=x1;
p[y]=_1b(x1);
if(p[y]!=y1){
p=_2c(_1b,_22[k-1],_22[k],y1);
}
_2a[s].push(p);
_2a[++s]=[];
}
var _2d=k;
while(k<_22.length&&(_22[k][y]>_20||_22[k][y]<_1f)){
k++;
}
if(k>=_22.length){
if(_2a[s].length==0){
_2a.splice(s,1);
}
break;
}
if(k>0&&_22[k].y!=_1f&&_22[k].y!=_20){
_2b=_28(_22[k-1],_22[k]);
if(_2b>_13){
_2b=_13;
}else{
if(_2b<-_13){
_2b=-_13;
}
}
if(_22[k-1][y]>_20){
y1=_20;
}else{
y1=_1f;
}
b=_22[k][y]-_2b*_22[k][x];
x1=(y1-b)/_2b;
p={};
p[x]=x1;
p[y]=_1b(x1);
if(p[y]!=y1){
p=_2c(_1b,_22[k-1],_22[k],y1);
}
_2a[s].push(p);
_2a[s].push(_22[k]);
}
}else{
_2a[s].push(_22[k]);
}
}
}
return _2a;
function _2c(_2e,_2f,_30,_31){
while(_2f<=_30){
var _32=(_2f[x]+_30[x])/2;
var mid={};
mid[x]=_32;
mid[y]=_2e(mid[x]);
if(_31==mid[y]||mid[x]==_30[x]||mid[x]==_2f[x]){
return mid;
}
var _33=true;
if(_31<mid[y]){
_33=false;
}
if(mid[y]<_30[y]){
if(_33){
_2f=mid;
}else{
_30=mid;
}
}else{
if(mid[y]<_2f[y]){
if(!_33){
_2f=mid;
}else{
_30=mid;
}
}
}
}
return NaN;
};
function _29(_34,_35,_36){
var _37=[[],[]],_38=_35,_39=_36,_3a;
while(_38[x]<=_39[x]){
var _3b=(_38[x]+_39[x])/2;
_3a={};
_3a[x]=_3b;
_3a[y]=_34(_3b);
var rx=_3c(_3a[x]);
var _3d={};
_3d[x]=rx;
_3d[y]=_34(rx);
if(Math.abs(_3d[y])>=Math.abs(_3a[y])){
_37[0].push(_3a);
_38=_3d;
}else{
_37[1].unshift(_3a);
if(_39[x]==_3a[x]){
break;
}
_39=_3a;
}
}
return _37;
};
function _27(_3e,_3f){
var _40=false,_41=false;
if(_3e<_3f){
_40=true;
}
if(_3f>0){
_41=true;
}
return {inc:_40,pos:_41};
};
function _3c(v){
var _42;
if(v>-1&&v<1){
if(v<0){
if(v>=-_12){
_42=-v;
}else{
_42=v/Math.ceil(v/_12);
}
}else{
_42=_12;
}
}else{
_42=Math.abs(v)*_12;
}
return v+_42;
};
function _28(p1,p2){
return (p2[y]-p1[y])/(p2[x]-p1[x]);
};
};
})();
}
