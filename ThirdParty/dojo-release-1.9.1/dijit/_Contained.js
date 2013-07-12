//>>built
define("dijit/_Contained",["dojo/_base/declare","./registry"],function(_1,_2){
return _1("dijit._Contained",null,{_getSibling:function(_3){
var _4=this.domNode;
do{
_4=_4[_3+"Sibling"];
}while(_4&&_4.nodeType!=1);
return _4&&_2.byNode(_4);
},getPreviousSibling:function(){
return this._getSibling("previous");
},getNextSibling:function(){
return this._getSibling("next");
},getIndexInParent:function(){
var p=this.getParent();
if(!p||!p.getIndexOfChild){
return -1;
}
return p.getIndexOfChild(this);
}});
});
