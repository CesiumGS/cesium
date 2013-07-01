//>>built
define("dijit/_base/focus",["dojo/_base/array","dojo/dom","dojo/_base/lang","dojo/topic","dojo/_base/window","../focus","../selection","../main"],function(_1,_2,_3,_4,_5,_6,_7,_8){
var _9={_curFocus:null,_prevFocus:null,isCollapsed:function(){
return _8.getBookmark().isCollapsed;
},getBookmark:function(){
var _a=_5.global==window?_7:new _7.SelectionManager(_5.global);
return _a.getBookmark();
},moveToBookmark:function(_b){
var _c=_5.global==window?_7:new _7.SelectionManager(_5.global);
return _c.moveToBookmark(_b);
},getFocus:function(_d,_e){
var _f=!_6.curNode||(_d&&_2.isDescendant(_6.curNode,_d.domNode))?_8._prevFocus:_6.curNode;
return {node:_f,bookmark:_f&&(_f==_6.curNode)&&_5.withGlobal(_e||_5.global,_8.getBookmark),openedForWindow:_e};
},_activeStack:[],registerIframe:function(_10){
return _6.registerIframe(_10);
},unregisterIframe:function(_11){
_11&&_11.remove();
},registerWin:function(_12,_13){
return _6.registerWin(_12,_13);
},unregisterWin:function(_14){
_14&&_14.remove();
}};
_6.focus=function(_15){
if(!_15){
return;
}
var _16="node" in _15?_15.node:_15,_17=_15.bookmark,_18=_15.openedForWindow,_19=_17?_17.isCollapsed:false;
if(_16){
var _1a=(_16.tagName.toLowerCase()=="iframe")?_16.contentWindow:_16;
if(_1a&&_1a.focus){
try{
_1a.focus();
}
catch(e){
}
}
_6._onFocusNode(_16);
}
if(_17&&_5.withGlobal(_18||_5.global,_8.isCollapsed)&&!_19){
if(_18){
_18.focus();
}
try{
_5.withGlobal(_18||_5.global,_8.moveToBookmark,null,[_17]);
}
catch(e2){
}
}
};
_6.watch("curNode",function(_1b,_1c,_1d){
_8._curFocus=_1d;
_8._prevFocus=_1c;
if(_1d){
_4.publish("focusNode",_1d);
}
});
_6.watch("activeStack",function(_1e,_1f,_20){
_8._activeStack=_20;
});
_6.on("widget-blur",function(_21,by){
_4.publish("widgetBlur",_21,by);
});
_6.on("widget-focus",function(_22,by){
_4.publish("widgetFocus",_22,by);
});
_3.mixin(_8,_9);
return _8;
});
