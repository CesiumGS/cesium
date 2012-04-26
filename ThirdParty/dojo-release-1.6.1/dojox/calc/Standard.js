/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.calc.Standard"]){
dojo._hasResource["dojox.calc.Standard"]=true;
dojo.provide("dojox.calc.Standard");
dojo.require("dijit._Templated");
dojo.require("dojox.math._base");
dojo.require("dijit.dijit");
dojo.require("dijit.Menu");
dojo.require("dijit.form.DropDownButton");
dojo.require("dijit.TooltipDialog");
dojo.require("dijit.form.TextBox");
dojo.require("dijit.form.Button");
dojo.require("dojox.calc._Executor");
dojo.experimental("dojox.calc.Standard");
dojo.declare("dojox.calc.Standard",[dijit._Widget,dijit._Templated],{templateString:dojo.cache("dojox.calc","templates/Standard.html","<div class=\"dijitReset dijitInline dojoxCalc\"\n><table class=\"dijitReset dijitInline dojoxCalcLayout\" dojoAttachPoint=\"calcTable\" rules=\"none\" cellspacing=0 cellpadding=0 border=0>\n\t<tr\n\t\t><td colspan=\"4\" class=\"dojoxCalcInputContainer\"\n\t\t\t><input dojoType=\"dijit.form.TextBox\" dojoAttachEvent=\"onBlur:onBlur,onKeyPress:onKeyPress\" dojoAttachPoint='textboxWidget'\n\t\t/></td\n\t></tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"seven\" label=\"7\" value='7' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"eight\" label=\"8\" value='8' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"nine\" label=\"9\" value='9' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"divide\" label=\"/\" value='/' dojoAttachEvent='onClick:insertOperator' />\n\t\t</td>\n\t</tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"four\" label=\"4\" value='4' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"five\" label=\"5\" value='5' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"six\" label=\"6\" value='6' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"multiply\" label=\"*\" value='*' dojoAttachEvent='onClick:insertOperator' />\n\t\t</td>\n\t</tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"one\" label=\"1\" value='1' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"two\" label=\"2\" value='2' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"three\" label=\"3\" value='3' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"add\" label=\"+\" value='+' dojoAttachEvent='onClick:insertOperator' />\n\t\t</td>\n\t</tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"decimal\" label=\".\" value='.' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"zero\" label=\"0\" value='0' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"equals\" label=\"x=y\" value='=' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcMinusButtonContainer\">\n\t\t\t<span dojoType=\"dijit.form.ComboButton\" dojoAttachPoint=\"subtract\" label='-' value='-' dojoAttachEvent='onClick:insertOperator'>\n\n\t\t\t\t<div dojoType=\"dijit.Menu\" style=\"display:none;\">\n\t\t\t\t\t<div dojoType=\"dijit.MenuItem\" dojoAttachEvent=\"onClick:insertMinus\">\n\t\t\t\t\t\t(-)\n\t\t\t\t\t</div>\n\t\t\t\t</div>\n\t\t\t</span>\n\t\t</td>\n\t</tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"clear\" label=\"Clear\" dojoAttachEvent='onClick:clearText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"sqrt\" label=\"&#x221A;\" value=\"&#x221A;\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"power\" label=\"^\" value=\"^\" dojoAttachEvent='onClick:insertOperator' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"comma\" label=\",\" value=',' dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t</tr>\n\t<tr>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"AnsButton\" label=\"Ans\" value=\"Ans\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"LeftParenButton\" label=\"(\" value=\"(\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"RightParenButton\" label=\")\" value=\")\" dojoAttachEvent='onClick:insertText' />\n\t\t</td>\n\t\t<td class=\"dojoxCalcButtonContainer\">\n\t\t\t<button dojoType=\"dijit.form.Button\" dojoAttachPoint=\"enter\" label=\"Enter\" dojoAttachEvent='onClick:parseTextbox' />\n\t\t</td>\n\t</tr>\n</table>\n<span dojoAttachPoint=\"executor\" dojoType=\"dojox.calc._Executor\" dojoAttachEvent=\"onLoad:executorLoaded\"></span>\n</div>\n"),readStore:null,writeStore:null,functions:[],widgetsInTemplate:true,executorLoaded:function(){
dojo.addOnLoad(dojo.hitch(this,function(){
this.loadStore(this.readStore,true);
this.loadStore(this.writeStore);
}));
},saveFunction:function(_1,_2,_3){
this.functions[_1]=this.executor.normalizedFunction(_1,_2,_3);
this.functions[_1].args=_2;
this.functions[_1].body=_3;
},loadStore:function(_4,_5){
function _6(_7){
for(var i=0;i<_7.length;i++){
this.saveFunction(_7[i].name[0],_7[i].args[0],_7[i].body[0]);
}
};
function _8(_9){
for(var i=0;i<_9.length;i++){
this.executor.normalizedFunction(_9[i].name[0],_9[i].args[0],_9[i].body[0]);
}
};
if(_4==null){
return;
}
if(_5){
_4.fetch({onComplete:dojo.hitch(this,_8),onError:function(_a){
console.error(_a);
}});
}else{
_4.fetch({onComplete:dojo.hitch(this,_6),onError:function(_b){
console.error(_b);
}});
}
},parseTextbox:function(){
var _c=this.textboxWidget.textbox.value;
if(_c==""&&this.commandList.length>0){
this.setTextboxValue(this.textboxWidget,this.commandList[this.commandList.length-1]);
_c=this.textboxWidget.textbox.value;
}
if(_c!=""){
var _d=this.executor.eval(_c);
if((typeof _d=="number"&&isNaN(_d))){
if(this.commandList.length==0||this.commandList[this.commandList.length-1]!=_c){
this.commandList.push(_c);
}
this.print(_c,false);
this.print("Not a Number",true);
}else{
if(((typeof _d=="object"&&"length" in _d)||typeof _d!="object")&&typeof _d!="function"&&_d!=null){
this.executor.eval("Ans="+_d);
if(this.commandList.length==0||this.commandList[this.commandList.length-1]!=_c){
this.commandList.push(_c);
}
this.print(_c,false);
this.print(_d,true);
}
}
this.commandIndex=this.commandList.length-1;
if(this.hasDisplay){
this.displayBox.scrollTop=this.displayBox.scrollHeight;
}
dijit.selectInputText(this.textboxWidget.textbox);
}else{
this.textboxWidget.focus();
}
},cycleCommands:function(_e,_f,_10){
if(_e==-1||this.commandList.length==0){
return;
}
var _11=_10.charOrCode;
if(_11==dojo.keys.UP_ARROW){
this.cycleCommandUp();
}else{
if(_11==dojo.keys.DOWN_ARROW){
this.cycleCommandDown();
}
}
},cycleCommandUp:function(){
if(this.commandIndex-1<0){
this.commandIndex=0;
}else{
this.commandIndex--;
}
this.setTextboxValue(this.textboxWidget,this.commandList[this.commandIndex]);
},cycleCommandDown:function(){
if(this.commandIndex+1>=this.commandList.length){
this.commandIndex=this.commandList.length;
this.setTextboxValue(this.textboxWidget,"");
}else{
this.commandIndex++;
this.setTextboxValue(this.textboxWidget,this.commandList[this.commandIndex]);
}
},onBlur:function(){
if(dojo.isIE){
var tr=dojo.doc.selection.createRange().duplicate();
var _12=tr.text||"";
var ntr=this.textboxWidget.textbox.createTextRange();
tr.move("character",0);
ntr.move("character",0);
try{
ntr.setEndPoint("EndToEnd",tr);
this.textboxWidget.textbox.selectionEnd=(this.textboxWidget.textbox.selectionStart=String(ntr.text).replace(/\r/g,"").length)+_12.length;
}
catch(e){
}
}
},onKeyPress:function(_13){
if(_13.charOrCode==dojo.keys.ENTER){
this.parseTextbox();
dojo.stopEvent(_13);
}else{
if(_13.charOrCode=="!"||_13.charOrCode=="^"||_13.charOrCode=="*"||_13.charOrCode=="/"||_13.charOrCode=="-"||_13.charOrCode=="+"){
if(dojo.isIE){
var tr=dojo.doc.selection.createRange().duplicate();
var _14=tr.text||"";
var ntr=this.textboxWidget.textbox.createTextRange();
tr.move("character",0);
ntr.move("character",0);
try{
ntr.setEndPoint("EndToEnd",tr);
this.textboxWidget.textbox.selectionEnd=(this.textboxWidget.textbox.selectionStart=String(ntr.text).replace(/\r/g,"").length)+_14.length;
}
catch(e){
}
}
if(this.textboxWidget.get("value")==""){
this.setTextboxValue(this.textboxWidget,"Ans");
}else{
if(this.putInAnsIfTextboxIsHighlighted(this.textboxWidget.textbox,_13.charOrCode)){
this.setTextboxValue(this.textboxWidget,"Ans");
dijit.selectInputText(this.textboxWidget.textbox,this.textboxWidget.textbox.value.length,this.textboxWidget.textbox.value.length);
}
}
}
}
},insertMinus:function(){
this.insertText("-");
},print:function(_15,_16){
var t="<span style='display:block;";
if(_16){
t+="text-align:right;'>";
}else{
t+="text-align:left;'>";
}
t+=_15+"<br></span>";
if(this.hasDisplay){
this.displayBox.innerHTML+=t;
}else{
this.setTextboxValue(this.textboxWidget,_15);
}
},setTextboxValue:function(_17,val){
_17.set("value",val);
},putInAnsIfTextboxIsHighlighted:function(_18){
if(typeof _18.selectionStart=="number"){
if(_18.selectionStart==0&&_18.selectionEnd==_18.value.length){
return true;
}
}else{
if(document.selection){
var _19=document.selection.createRange();
if(_18.value==_19.text){
return true;
}
}
}
return false;
},clearText:function(){
if(this.hasDisplay&&this.textboxWidget.get("value")==""){
this.displayBox.innerHTML="";
}else{
this.setTextboxValue(this.textboxWidget,"");
}
this.textboxWidget.focus();
},insertOperator:function(_1a){
if(typeof _1a=="object"){
_1a=_1a=dijit.getEnclosingWidget(_1a["target"]).value;
}
if(this.textboxWidget.get("value")==""||this.putInAnsIfTextboxIsHighlighted(this.textboxWidget.textbox)){
_1a="Ans"+_1a;
}
this.insertText(_1a);
},insertText:function(_1b){
setTimeout(dojo.hitch(this,function(){
var _1c=this.textboxWidget.textbox;
if(_1c.value==""){
_1c.selectionStart=0;
_1c.selectionEnd=0;
}
if(typeof _1b=="object"){
_1b=_1b=dijit.getEnclosingWidget(_1b["target"]).value;
}
var _1d=_1c.value.replace(/\r/g,"");
if(typeof _1c.selectionStart=="number"){
var pos=_1c.selectionStart;
var cr=0;
if(navigator.userAgent.indexOf("Opera")!=-1){
cr=(_1c.value.substring(0,pos).match(/\r/g)||[]).length;
}
_1c.value=_1d.substring(0,_1c.selectionStart-cr)+_1b+_1d.substring(_1c.selectionEnd-cr);
_1c.focus();
pos+=_1b.length;
dijit.selectInputText(this.textboxWidget.textbox,pos,pos);
}else{
if(document.selection){
if(this.handle){
clearTimeout(this.handle);
this.handle=null;
}
_1c.focus();
this.handle=setTimeout(function(){
var _1e=document.selection.createRange();
_1e.text=_1b;
_1e.select();
this.handle=null;
},0);
}
}
}),0);
},hasDisplay:false,postCreate:function(){
this.handle=null;
this.commandList=[];
this.commandIndex=0;
if(this.displayBox){
this.hasDisplay=true;
}
if(this.toFracButton&&!dojox.calc.toFrac){
dojo.style(this.toFracButton.domNode,{visibility:"hidden"});
}
if(this.functionMakerButton&&!dojox.calc.FuncGen){
dojo.style(this.functionMakerButton.domNode,{visibility:"hidden"});
}
if(this.grapherMakerButton&&!dojox.calc.Grapher){
dojo.style(this.grapherMakerButton.domNode,{visibility:"hidden"});
}
this._connects.push(dijit.typematic.addKeyListener(this.textboxWidget.textbox,{charOrCode:dojo.keys.UP_ARROW,shiftKey:false,metaKey:false,ctrlKey:false},this,this.cycleCommands,200,200));
this._connects.push(dijit.typematic.addKeyListener(this.textboxWidget.textbox,{charOrCode:dojo.keys.DOWN_ARROW,shiftKey:false,metaKey:false,ctrlKey:false},this,this.cycleCommands,200,200));
this.startup();
}});
}
