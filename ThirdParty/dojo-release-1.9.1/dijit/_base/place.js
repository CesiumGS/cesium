//>>built
define("dijit/_base/place",["dojo/_base/array","dojo/_base/lang","dojo/window","../place","../main"],function(_1,_2,_3,_4,_5){
var _6={};
_6.getViewport=function(){
return _3.getBox();
};
_6.placeOnScreen=_4.at;
_6.placeOnScreenAroundElement=function(_7,_8,_9,_a){
var _b;
if(_2.isArray(_9)){
_b=_9;
}else{
_b=[];
for(var _c in _9){
_b.push({aroundCorner:_c,corner:_9[_c]});
}
}
return _4.around(_7,_8,_b,true,_a);
};
_6.placeOnScreenAroundNode=_6.placeOnScreenAroundElement;
_6.placeOnScreenAroundRectangle=_6.placeOnScreenAroundElement;
_6.getPopupAroundAlignment=function(_d,_e){
var _f={};
_1.forEach(_d,function(pos){
var ltr=_e;
switch(pos){
case "after":
_f[_e?"BR":"BL"]=_e?"BL":"BR";
break;
case "before":
_f[_e?"BL":"BR"]=_e?"BR":"BL";
break;
case "below-alt":
ltr=!ltr;
case "below":
_f[ltr?"BL":"BR"]=ltr?"TL":"TR";
_f[ltr?"BR":"BL"]=ltr?"TR":"TL";
break;
case "above-alt":
ltr=!ltr;
case "above":
default:
_f[ltr?"TL":"TR"]=ltr?"BL":"BR";
_f[ltr?"TR":"TL"]=ltr?"BR":"BL";
break;
}
});
return _f;
};
_2.mixin(_5,_6);
return _5;
});
