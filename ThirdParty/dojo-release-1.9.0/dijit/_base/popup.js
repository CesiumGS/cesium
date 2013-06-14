//>>built
define("dijit/_base/popup",["dojo/dom-class","dojo/_base/window","../popup","../BackgroundIframe"],function(_1,_2,_3){
var _4=_3._createWrapper;
_3._createWrapper=function(_5){
if(!_5.declaredClass){
_5={_popupWrapper:(_5.parentNode&&_1.contains(_5.parentNode,"dijitPopup"))?_5.parentNode:null,domNode:_5,destroy:function(){
},ownerDocument:_5.ownerDocument,ownerDocumentBody:_2.body(_5.ownerDocument)};
}
return _4.call(this,_5);
};
var _6=_3.open;
_3.open=function(_7){
if(_7.orient&&typeof _7.orient!="string"&&!("length" in _7.orient)){
var _8=[];
for(var _9 in _7.orient){
_8.push({aroundCorner:_9,corner:_7.orient[_9]});
}
_7.orient=_8;
}
return _6.call(this,_7);
};
return _3;
});
