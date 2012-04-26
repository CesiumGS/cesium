/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.drawing.tools.TextBlock"]){
dojo._hasResource["dojox.drawing.tools.TextBlock"]=true;
dojo.provide("dojox.drawing.tools.TextBlock");
dojo.require("dojox.drawing.stencil.Text");
(function(){
var _1;
dojo.addOnLoad(function(){
_1=dojo.byId("conEdit");
if(!_1){
console.error("A contenteditable div is missing from the main document. See 'dojox.drawing.tools.TextBlock'");
}else{
_1.parentNode.removeChild(_1);
}
});
dojox.drawing.tools.TextBlock=dojox.drawing.util.oo.declare(dojox.drawing.stencil.Text,function(_2){
if(_2.data){
var d=_2.data;
var _3=d.text?this.typesetter(d.text):d.text;
var w=!d.width?this.style.text.minWidth:d.width=="auto"?"auto":Math.max(d.width,this.style.text.minWidth);
var h=this._lineHeight;
if(_3&&w=="auto"){
var o=this.measureText(this.cleanText(_3,false),w);
w=o.w;
h=o.h;
}else{
this._text="";
}
this.points=[{x:d.x,y:d.y},{x:d.x+w,y:d.y},{x:d.x+w,y:d.y+h},{x:d.x,y:d.y+h}];
if(d.showEmpty||_3){
this.editMode=true;
dojo.disconnect(this._postRenderCon);
this._postRenderCon=null;
this.connect(this,"render",this,"onRender",true);
if(d.showEmpty){
this._text=_3||"";
this.edit();
}else{
if(_3&&d.editMode){
this._text="";
this.edit();
}else{
if(_3){
this.render(_3);
}
}
}
setTimeout(dojo.hitch(this,function(){
this.editMode=false;
}),100);
}else{
this.render();
}
}else{
this.connectMouse();
this._postRenderCon=dojo.connect(this,"render",this,"_onPostRender");
}
},{draws:true,baseRender:false,type:"dojox.drawing.tools.TextBlock",_caretStart:0,_caretEnd:0,_blockExec:false,selectOnExec:true,showEmpty:false,onDrag:function(_4){
if(!this.parentNode){
this.showParent(_4);
}
var s=this._startdrag,e=_4.page;
this._box.left=(s.x<e.x?s.x:e.x);
this._box.top=s.y;
this._box.width=(s.x<e.x?e.x-s.x:s.x-e.x)+this.style.text.pad;
dojo.style(this.parentNode,this._box.toPx());
},onUp:function(_5){
if(!this._downOnCanvas){
return;
}
this._downOnCanvas=false;
var c=dojo.connect(this,"render",this,function(){
dojo.disconnect(c);
this.onRender(this);
});
this.editMode=true;
this.showParent(_5);
this.created=true;
this.createTextField();
this.connectTextField();
},showParent:function(_6){
if(this.parentNode){
return;
}
var x=_6.pageX||10;
var y=_6.pageY||10;
this.parentNode=dojo.doc.createElement("div");
this.parentNode.id=this.id;
var d=this.style.textMode.create;
this._box={left:x,top:y,width:_6.width||1,height:_6.height&&_6.height>8?_6.height:this._lineHeight,border:d.width+"px "+d.style+" "+d.color,position:"absolute",zIndex:500,toPx:function(){
var o={};
for(var nm in this){
o[nm]=typeof (this[nm])=="number"&&nm!="zIndex"?this[nm]+"px":this[nm];
}
return o;
}};
dojo.style(this.parentNode,this._box);
document.body.appendChild(this.parentNode);
},createTextField:function(_7){
var d=this.style.textMode.edit;
this._box.border=d.width+"px "+d.style+" "+d.color;
this._box.height="auto";
this._box.width=Math.max(this._box.width,this.style.text.minWidth*this.mouse.zoom);
dojo.style(this.parentNode,this._box.toPx());
this.parentNode.appendChild(_1);
dojo.style(_1,{height:_7?"auto":this._lineHeight+"px",fontSize:(this.textSize/this.mouse.zoom)+"px",fontFamily:this.style.text.family});
_1.innerHTML=_7||"";
return _1;
},connectTextField:function(){
if(this._textConnected){
return;
}
var _8=dijit.byId("dropdown");
this._textConnected=true;
this._dropMode=false;
this.mouse.setEventMode("TEXT");
this.keys.editMode(true);
var _9,_a,_b,_c,_d=this,_e=false,_f=function(){
if(_d._dropMode){
return;
}
dojo.forEach([_9,_a,_b,_c],function(c){
dojo.disconnect(c);
});
_d._textConnected=false;
_d.keys.editMode(false);
_d.mouse.setEventMode();
_d.execText();
};
_9=dojo.connect(_1,"keyup",this,function(evt){
if(dojo.trim(_1.innerHTML)&&!_e){
dojo.style(_1,"height","auto");
_e=true;
}else{
if(dojo.trim(_1.innerHTML).length<2&&_e){
dojo.style(_1,"height",this._lineHeight+"px");
_e=false;
}
}
if(!this._blockExec){
if(evt.keyCode==13||evt.keyCode==27){
dojo.stopEvent(evt);
_f();
}
}else{
if(evt.keyCode==dojo.keys.SPACE){
dojo.stopEvent(evt);
_8.onCancel();
}
}
});
_a=dojo.connect(_1,"keydown",this,function(evt){
if(evt.keyCode==13||evt.keyCode==27){
dojo.stopEvent(evt);
}
if(evt.keyCode==220){
if(_8==undefined){
console.warn("Dropdown not found");
return;
}
dojo.stopEvent(evt);
this.getSelection(_1);
this.insertText(_1,"\\");
this._dropMode=true;
this._blockExec=true;
_8._pushChangeTo=_1;
_8._textBlock=this;
dijit.popup.open({parent:this.parentNode,popup:_8,around:this.parentNode,orient:{"BL":"TL"}});
}
if(!this._dropMode){
this._blockExec=false;
}else{
switch(evt.keyCode){
case dojo.keys.UP_ARROW:
case dojo.keys.DOWN_ARROW:
case dojo.keys.LEFT_ARROW:
case dojo.keys.RIGHT_ARROW:
dojo.stopEvent(evt);
_8._navigateByArrow(evt);
break;
case dojo.keys.ENTER:
dojo.stopEvent(evt);
_8._onCellClick(evt);
break;
case dojo.keys.BACKSPACE:
case dojo.keys.DELETE:
dojo.stopEvent(evt);
_8.onCancel();
break;
}
}
});
_b=dojo.connect(document,"mouseup",this,function(evt){
if(!this._onAnchor&&evt.target.id!="conEdit"){
dojo.stopEvent(evt);
_f();
}else{
if(evt.target.id=="conEdit"&&_1.innerHTML==""){
_1.blur();
setTimeout(function(){
_1.focus();
},200);
}
}
});
this.createAnchors();
_c=dojo.connect(this.mouse,"setZoom",this,function(evt){
_f();
});
_1.focus();
this.onDown=function(){
};
this.onDrag=function(){
};
setTimeout(dojo.hitch(this,function(){
_1.focus();
this.onUp=function(){
if(!_d._onAnchor&&this.parentNode){
_d.disconnectMouse();
_f();
_d.onUp=function(){
};
}
};
}),500);
},execText:function(){
var d=dojo.marginBox(this.parentNode);
var w=Math.max(d.w,this.style.text.minWidth);
var txt=this.cleanText(_1.innerHTML,true);
_1.innerHTML="";
_1.blur();
this.destroyAnchors();
txt=this.typesetter(txt);
var o=this.measureText(txt,w);
var sc=this.mouse.scrollOffset();
var org=this.mouse.origin;
var x=this._box.left+sc.left-org.x;
var y=this._box.top+sc.top-org.y;
x*=this.mouse.zoom;
y*=this.mouse.zoom;
w*=this.mouse.zoom;
o.h*=this.mouse.zoom;
this.points=[{x:x,y:y},{x:x+w,y:y},{x:x+w,y:y+o.h},{x:x,y:y+o.h}];
this.editMode=false;
if(!o.text){
this._text="";
this._textArray=[];
}
this.render(o.text);
this.onChangeText(this.getText());
},edit:function(){
this.editMode=true;
var _10=this.getText()||"";
if(this.parentNode||!this.points){
return;
}
var d=this.pointsToData();
var sc=this.mouse.scrollOffset();
var org=this.mouse.origin;
var obj={pageX:(d.x)/this.mouse.zoom-sc.left+org.x,pageY:(d.y)/this.mouse.zoom-sc.top+org.y,width:d.width/this.mouse.zoom,height:d.height/this.mouse.zoom};
this.remove(this.shape,this.hit);
this.showParent(obj);
this.createTextField(_10.replace("/n"," "));
this.connectTextField();
if(_10){
this.setSelection(_1,"end");
}
},cleanText:function(txt,_11){
var _12=function(str){
var _13={"&lt;":"<","&gt;":">","&amp;":"&"};
for(var nm in _13){
str=str.replace(new RegExp(nm,"gi"),_13[nm]);
}
return str;
};
if(_11){
dojo.forEach(["<br>","<br/>","<br />","\\n","\\r"],function(br){
txt=txt.replace(new RegExp(br,"gi")," ");
});
}
txt=txt.replace(/&nbsp;/g," ");
txt=_12(txt);
txt=dojo.trim(txt);
txt=txt.replace(/\s{2,}/g," ");
return txt;
},measureText:function(str,_14){
var r="(<br\\s*/*>)|(\\n)|(\\r)";
this.showParent({width:_14||"auto",height:"auto"});
this.createTextField(str);
var txt="";
var el=_1;
el.innerHTML="X";
var h=dojo.marginBox(el).h;
el.innerHTML=str;
if(!_14||new RegExp(r,"gi").test(str)){
txt=str.replace(new RegExp(r,"gi"),"\n");
el.innerHTML=str.replace(new RegExp(r,"gi"),"<br/>");
}else{
if(dojo.marginBox(el).h==h){
txt=str;
}else{
var ar=str.split(" ");
var _15=[[]];
var _16=0;
el.innerHTML="";
while(ar.length){
var _17=ar.shift();
el.innerHTML+=_17+" ";
if(dojo.marginBox(el).h>h){
_16++;
_15[_16]=[];
el.innerHTML=_17+" ";
}
_15[_16].push(_17);
}
dojo.forEach(_15,function(ar,i){
_15[i]=ar.join(" ");
});
txt=_15.join("\n");
el.innerHTML=txt.replace("\n","<br/>");
}
}
var dim=dojo.marginBox(el);
_1.parentNode.removeChild(_1);
dojo.destroy(this.parentNode);
this.parentNode=null;
return {h:dim.h,w:dim.w,text:txt};
},_downOnCanvas:false,onDown:function(obj){
this._startdrag={x:obj.pageX,y:obj.pageY};
dojo.disconnect(this._postRenderCon);
this._postRenderCon=null;
this._downOnCanvas=true;
},createAnchors:function(){
this._anchors={};
var _18=this;
var d=this.style.anchors,b=d.width,w=d.size-b*2,h=d.size-b*2,p=(d.size)/2*-1+"px";
var s={position:"absolute",width:w+"px",height:h+"px",backgroundColor:d.fill,border:b+"px "+d.style+" "+d.color};
if(dojo.isIE){
s.paddingLeft=w+"px";
s.fontSize=w+"px";
}
var ss=[{top:p,left:p},{top:p,right:p},{bottom:p,right:p},{bottom:p,left:p}];
for(var i=0;i<4;i++){
var _19=(i==0)||(i==3);
var id=this.util.uid(_19?"left_anchor":"right_anchor");
var a=dojo.create("div",{id:id},this.parentNode);
dojo.style(a,dojo.mixin(dojo.clone(s),ss[i]));
var md,mm,mu;
var md=dojo.connect(a,"mousedown",this,function(evt){
_19=evt.target.id.indexOf("left")>-1;
_18._onAnchor=true;
var _1a=evt.pageX;
var _1b=this._box.width;
dojo.stopEvent(evt);
mm=dojo.connect(document,"mousemove",this,function(evt){
var x=evt.pageX;
if(_19){
this._box.left=x;
this._box.width=_1b+_1a-x;
}else{
this._box.width=x+_1b-_1a;
}
dojo.style(this.parentNode,this._box.toPx());
});
mu=dojo.connect(document,"mouseup",this,function(evt){
_1a=this._box.left;
_1b=this._box.width;
dojo.disconnect(mm);
dojo.disconnect(mu);
_18._onAnchor=false;
_1.focus();
dojo.stopEvent(evt);
});
});
this._anchors[id]={a:a,cons:[md]};
}
},destroyAnchors:function(){
for(var n in this._anchors){
dojo.forEach(this._anchors[n].con,dojo.disconnect,dojo);
dojo.destroy(this._anchors[n].a);
}
},setSavedCaret:function(val){
this._caretStart=this._caretEnd=val;
},getSavedCaret:function(){
return {start:this._caretStart,end:this._caretEnd};
},insertText:function(_1c,val){
var t,_1d=_1c.innerHTML;
var _1e=this.getSavedCaret();
_1d=_1d.replace(/&nbsp;/g," ");
t=_1d.substr(0,_1e.start)+val+_1d.substr(_1e.end);
t=this.cleanText(t,true);
this.setSavedCaret(Math.min(t.length,(_1e.end+val.length)));
_1c.innerHTML=t;
this.setSelection(_1c,"stored");
},getSelection:function(_1f){
var _20,end;
if(dojo.doc.selection){
var r=dojo.doc.selection.createRange();
var rs=dojo.body().createTextRange();
rs.moveToElementText(_1f);
var re=rs.duplicate();
rs.moveToBookmark(r.getBookmark());
re.setEndPoint("EndToStart",rs);
_20=this._caretStart=re.text.length;
end=this._caretEnd=re.text.length+r.text.length;
console.warn("Caret start: ",_20," end: ",end," length: ",re.text.length," text: ",re.text);
}else{
this._caretStart=dojo.global.getSelection().getRangeAt(_1f).startOffset;
this._caretEnd=dojo.global.getSelection().getRangeAt(_1f).endOffset;
}
},setSelection:function(_21,_22){
console.warn("setSelection:");
if(dojo.doc.selection){
var rs=dojo.body().createTextRange();
rs.moveToElementText(_21);
switch(_22){
case "end":
rs.collapse(false);
break;
case "beg"||"start":
rs.collapse();
break;
case "all":
rs.collapse();
rs.moveStart("character",0);
rs.moveEnd("character",_21.text.length);
break;
case "stored":
rs.collapse();
var dif=this._caretStart-this._caretEnd;
rs.moveStart("character",this._caretStart);
rs.moveEnd("character",dif);
break;
}
rs.select();
}else{
var _23=function(_24,_25){
_25=_25||[];
for(var i=0;i<_24.childNodes.length;i++){
var n=_24.childNodes[i];
if(n.nodeType==3){
_25.push(n);
}else{
if(n.tagName&&n.tagName.toLowerCase()=="img"){
_25.push(n);
}
}
if(n.childNodes&&n.childNodes.length){
_23(n,_25);
}
}
return _25;
};
_21.focus();
var _26=dojo.global.getSelection();
_26.removeAllRanges();
var r=dojo.doc.createRange();
var _27=_23(_21);
switch(_22){
case "end":
undefined;
r.setStart(_27[_27.length-1],_27[_27.length-1].textContent.length);
r.setEnd(_27[_27.length-1],_27[_27.length-1].textContent.length);
break;
case "beg"||"start":
r.setStart(_27[0],0);
r.setEnd(_27[0],0);
break;
case "all":
r.setStart(_27[0],0);
r.setEnd(_27[_27.length-1],_27[_27.length-1].textContent.length);
break;
case "stored":
undefined;
r.setStart(_27[0],this._caretStart);
r.setEnd(_27[0],this._caretEnd);
}
_26.addRange(r);
}
}});
dojox.drawing.tools.TextBlock.setup={name:"dojox.drawing.tools.TextBlock",tooltip:"Text Tool",iconClass:"iconText"};
dojox.drawing.register(dojox.drawing.tools.TextBlock.setup,"tool");
})();
}
