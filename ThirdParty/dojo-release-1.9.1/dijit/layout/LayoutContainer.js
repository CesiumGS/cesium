//>>built
define("dijit/layout/LayoutContainer",["dojo/_base/array","dojo/_base/declare","dojo/dom-class","dojo/dom-style","dojo/_base/lang","../_WidgetBase","./_LayoutWidget","./utils"],function(_1,_2,_3,_4,_5,_6,_7,_8){
var _9=_2("dijit.layout.LayoutContainer",_7,{design:"headline",baseClass:"dijitLayoutContainer",startup:function(){
if(this._started){
return;
}
_1.forEach(this.getChildren(),this._setupChild,this);
this.inherited(arguments);
},_setupChild:function(_a){
this.inherited(arguments);
var _b=_a.region;
if(_b){
_3.add(_a.domNode,this.baseClass+"Pane");
}
},_getOrderedChildren:function(){
var _c=_1.map(this.getChildren(),function(_d,_e){
return {pane:_d,weight:[_d.region=="center"?Infinity:0,_d.layoutPriority,(this.design=="sidebar"?1:-1)*(/top|bottom/.test(_d.region)?1:-1),_e]};
},this);
_c.sort(function(a,b){
var aw=a.weight,bw=b.weight;
for(var i=0;i<aw.length;i++){
if(aw[i]!=bw[i]){
return aw[i]-bw[i];
}
}
return 0;
});
return _1.map(_c,function(w){
return w.pane;
});
},layout:function(){
_8.layoutChildren(this.domNode,this._contentBox,this._getOrderedChildren());
},addChild:function(_f,_10){
this.inherited(arguments);
if(this._started){
this.layout();
}
},removeChild:function(_11){
this.inherited(arguments);
if(this._started){
this.layout();
}
_3.remove(_11.domNode,this.baseClass+"Pane");
_4.set(_11.domNode,{top:"auto",bottom:"auto",left:"auto",right:"auto",position:"static"});
_4.set(_11.domNode,/top|bottom/.test(_11.region)?"width":"height","auto");
}});
_9.ChildWidgetProperties={region:"",layoutAlign:"",layoutPriority:0};
_5.extend(_6,_9.ChildWidgetProperties);
return _9;
});
