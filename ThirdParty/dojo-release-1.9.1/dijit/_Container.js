//>>built
define("dijit/_Container",["dojo/_base/array","dojo/_base/declare","dojo/dom-construct","dojo/_base/kernel"],function(_1,_2,_3,_4){
return _2("dijit._Container",null,{buildRendering:function(){
this.inherited(arguments);
if(!this.containerNode){
this.containerNode=this.domNode;
}
},addChild:function(_5,_6){
var _7=this.containerNode;
if(_6>0){
_7=_7.firstChild;
while(_6>0){
if(_7.nodeType==1){
_6--;
}
_7=_7.nextSibling;
}
if(_7){
_6="before";
}else{
_7=this.containerNode;
_6="last";
}
}
_3.place(_5.domNode,_7,_6);
if(this._started&&!_5._started){
_5.startup();
}
},removeChild:function(_8){
if(typeof _8=="number"){
_8=this.getChildren()[_8];
}
if(_8){
var _9=_8.domNode;
if(_9&&_9.parentNode){
_9.parentNode.removeChild(_9);
}
}
},hasChildren:function(){
return this.getChildren().length>0;
},_getSiblingOfChild:function(_a,_b){
_4.deprecated(this.declaredClass+"::_getSiblingOfChild() is deprecated. Use _KeyNavMixin::_getNext() instead.","","2.0");
var _c=this.getChildren(),_d=_1.indexOf(_c,_a);
return _c[_d+_b];
},getIndexOfChild:function(_e){
return _1.indexOf(this.getChildren(),_e);
}});
});
