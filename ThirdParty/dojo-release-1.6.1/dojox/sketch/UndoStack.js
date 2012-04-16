/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.sketch.UndoStack"]){
dojo._hasResource["dojox.sketch.UndoStack"]=true;
dojo.provide("dojox.sketch.UndoStack");
dojo.require("dojox.xml.DomParser");
(function(){
var ta=dojox.sketch;
ta.CommandTypes={Create:"Create",Move:"Move",Modify:"Modify",Delete:"Delete",Convert:"Convert"};
dojo.declare("dojox.sketch.UndoStack",null,{constructor:function(_1){
this.figure=_1;
this._steps=[];
this._undoedSteps=[];
},apply:function(_2,_3,to){
if(!_3&&!to&&_2.fullText){
this.figure.setValue(_2.fullText);
return;
}
var _4=_3.shapeText;
var _5=to.shapeText;
if(_4.length==0&&_5.length==0){
return;
}
if(_4.length==0){
var o=dojox.xml.DomParser.parse(_5).documentElement;
var a=this.figure._loadAnnotation(o);
if(a){
this.figure._add(a);
}
return;
}
if(_5.length==0){
var _6=this.figure.getAnnotator(_3.shapeId);
this.figure._delete([_6],true);
return;
}
var _7=this.figure.getAnnotator(to.shapeId);
var no=dojox.xml.DomParser.parse(_5).documentElement;
_7.draw(no);
this.figure.select(_7);
return;
},add:function(_8,_9,_a){
var id=_9?_9.id:"";
var _b=_9?_9.serialize():"";
if(_8==ta.CommandTypes.Delete){
_b="";
}
var _c={cmdname:_8,before:{shapeId:id,shapeText:_a||""},after:{shapeId:id,shapeText:_b}};
this._steps.push(_c);
this._undoedSteps=[];
},destroy:function(){
},undo:function(){
var _d=this._steps.pop();
if(_d){
this._undoedSteps.push(_d);
this.apply(_d,_d.after,_d.before);
}
},redo:function(){
var _e=this._undoedSteps.pop();
if(_e){
this._steps.push(_e);
this.apply(_e,_e.before,_e.after);
}
}});
})();
}
