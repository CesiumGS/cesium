//>>built
define("dijit/registry",["dojo/_base/array","dojo/sniff","dojo/_base/window","./main"],function(_1,_2,_3,_4){
var _5={},_6={};
var _7={length:0,add:function(_8){
if(_6[_8.id]){
throw new Error("Tried to register widget with id=="+_8.id+" but that id is already registered");
}
_6[_8.id]=_8;
this.length++;
},remove:function(id){
if(_6[id]){
delete _6[id];
this.length--;
}
},byId:function(id){
return typeof id=="string"?_6[id]:id;
},byNode:function(_9){
return _6[_9.getAttribute("widgetId")];
},toArray:function(){
var ar=[];
for(var id in _6){
ar.push(_6[id]);
}
return ar;
},getUniqueId:function(_a){
var id;
do{
id=_a+"_"+(_a in _5?++_5[_a]:_5[_a]=0);
}while(_6[id]);
return _4._scopeName=="dijit"?id:_4._scopeName+"_"+id;
},findWidgets:function(_b,_c){
var _d=[];
function _e(_f){
for(var _10=_f.firstChild;_10;_10=_10.nextSibling){
if(_10.nodeType==1){
var _11=_10.getAttribute("widgetId");
if(_11){
var _12=_6[_11];
if(_12){
_d.push(_12);
}
}else{
if(_10!==_c){
_e(_10);
}
}
}
}
};
_e(_b);
return _d;
},_destroyAll:function(){
_4._curFocus=null;
_4._prevFocus=null;
_4._activeStack=[];
_1.forEach(_7.findWidgets(_3.body()),function(_13){
if(!_13._destroyed){
if(_13.destroyRecursive){
_13.destroyRecursive();
}else{
if(_13.destroy){
_13.destroy();
}
}
}
});
},getEnclosingWidget:function(_14){
while(_14){
var id=_14.nodeType==1&&_14.getAttribute("widgetId");
if(id){
return _6[id];
}
_14=_14.parentNode;
}
return null;
},_hash:_6};
_4.registry=_7;
return _7;
});
