/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.fx.split"]){
dojo._hasResource["dojox.fx.split"]=true;
dojo.provide("dojox.fx.split");
dojo.require("dojo.fx");
dojo.require("dojo.fx.easing");
dojo.mixin(dojox.fx,{_split:function(_1){
_1.rows=_1.rows||3;
_1.columns=_1.columns||3;
_1.duration=_1.duration||1000;
var _2=_1.node=dojo.byId(_1.node),_3=_2.parentNode,_4=_3,_5=dojo.body(),_6="position";
while(_4&&_4!=_5&&dojo.style(_4,_6)=="static"){
_4=_4.parentNode;
}
var _7=_4!=_5?dojo.position(_4,true):{x:0,y:0},_8=dojo.position(_2,true),_9=dojo.style(_2,"height"),_a=dojo.style(_2,"width"),_b=dojo.style(_2,"borderLeftWidth")+dojo.style(_2,"borderRightWidth"),_c=dojo.style(_2,"borderTopWidth")+dojo.style(_2,"borderBottomWidth"),_d=Math.ceil(_9/_1.rows),_e=Math.ceil(_a/_1.columns),_f=dojo.create(_2.tagName,{style:{position:"absolute",padding:0,margin:0,border:"none",top:_8.y-_7.y+"px",left:_8.x-_7.x+"px",height:_9+_c+"px",width:_a+_b+"px",background:"none",overflow:_1.crop?"hidden":"visible",zIndex:dojo.style(_2,"zIndex")}},_2,"after"),_10=[],_11=dojo.create(_2.tagName,{style:{position:"absolute",border:"none",padding:0,margin:0,height:_d+_b+"px",width:_e+_c+"px",overflow:"hidden"}});
for(var y=0,ly=_1.rows;y<ly;y++){
for(var x=0,lx=_1.columns;x<lx;x++){
var _12=dojo.clone(_11),_13=dojo.clone(_2),_14=y*_d,_15=x*_e;
_13.style.filter="";
dojo.removeAttr(_13,"id");
dojo.style(_12,{border:"none",overflow:"hidden",top:_14+"px",left:_15+"px"});
dojo.style(_13,{position:"static",opacity:"1",marginTop:-_14+"px",marginLeft:-_15+"px"});
_12.appendChild(_13);
_f.appendChild(_12);
var _16=_1.pieceAnimation(_12,x,y,_8);
if(dojo.isArray(_16)){
_10=_10.concat(_16);
}else{
_10.push(_16);
}
}
}
var _17=dojo.fx.combine(_10);
dojo.connect(_17,"onEnd",_17,function(){
_f.parentNode.removeChild(_f);
});
if(_1.onPlay){
dojo.connect(_17,"onPlay",_17,_1.onPlay);
}
if(_1.onEnd){
dojo.connect(_17,"onEnd",_17,_1.onEnd);
}
return _17;
},explode:function(_18){
var _19=_18.node=dojo.byId(_18.node);
_18.rows=_18.rows||3;
_18.columns=_18.columns||3;
_18.distance=_18.distance||1;
_18.duration=_18.duration||1000;
_18.random=_18.random||0;
if(!_18.fade){
_18.fade=true;
}
if(typeof _18.sync=="undefined"){
_18.sync=true;
}
_18.random=Math.abs(_18.random);
_18.pieceAnimation=function(_1a,x,y,_1b){
var _1c=_1b.h/_18.rows,_1d=_1b.w/_18.columns,_1e=_18.distance*2,_1f=_18.duration,ps=_1a.style,_20=parseInt(ps.top),_21=parseInt(ps.left),_22=0,_23=0,_24=0;
if(_18.random){
var _25=(Math.random()*_18.random)+Math.max(1-_18.random,0);
_1e*=_25;
_1f*=_25;
_22=((_18.unhide&&_18.sync)||(!_18.unhide&&!_18.sync))?(_18.duration-_1f):0;
_23=Math.random()-0.5;
_24=Math.random()-0.5;
}
var _26=((_1b.h-_1c)/2-_1c*y),_27=((_1b.w-_1d)/2-_1d*x),_28=Math.sqrt(Math.pow(_27,2)+Math.pow(_26,2)),_29=parseInt(_20-_26*_1e+_28*_24),_2a=parseInt(_21-_27*_1e+_28*_23);
var _2b=dojo.animateProperty({node:_1a,duration:_1f,delay:_22,easing:(_18.easing||(_18.unhide?dojo.fx.easing.sinOut:dojo.fx.easing.circOut)),beforeBegin:(_18.unhide?function(){
if(_18.fade){
dojo.style(_1a,{opacity:"0"});
}
ps.top=_29+"px";
ps.left=_2a+"px";
}:undefined),properties:{top:(_18.unhide?{start:_29,end:_20}:{start:_20,end:_29}),left:(_18.unhide?{start:_2a,end:_21}:{start:_21,end:_2a})}});
if(_18.fade){
var _2c=dojo.animateProperty({node:_1a,duration:_1f,delay:_22,easing:(_18.fadeEasing||dojo.fx.easing.quadOut),properties:{opacity:(_18.unhide?{start:"0",end:"1"}:{start:"1",end:"0"})}});
return (_18.unhide?[_2c,_2b]:[_2b,_2c]);
}else{
return _2b;
}
};
var _2d=dojox.fx._split(_18);
if(_18.unhide){
dojo.connect(_2d,"onEnd",null,function(){
dojo.style(_19,{opacity:"1"});
});
}else{
dojo.connect(_2d,"onPlay",null,function(){
dojo.style(_19,{opacity:"0"});
});
}
return _2d;
},converge:function(_2e){
_2e.unhide=true;
return dojox.fx.explode(_2e);
},disintegrate:function(_2f){
var _30=_2f.node=dojo.byId(_2f.node);
_2f.rows=_2f.rows||5;
_2f.columns=_2f.columns||5;
_2f.duration=_2f.duration||1500;
_2f.interval=_2f.interval||_2f.duration/(_2f.rows+_2f.columns*2);
_2f.distance=_2f.distance||1.5;
_2f.random=_2f.random||0;
if(typeof _2f.fade=="undefined"){
_2f.fade=true;
}
var _31=Math.abs(_2f.random),_32=_2f.duration-(_2f.rows+_2f.columns)*_2f.interval;
_2f.pieceAnimation=function(_33,x,y,_34){
var _35=Math.random()*(_2f.rows+_2f.columns)*_2f.interval,ps=_33.style,_36=(_2f.reverseOrder||_2f.distance<0)?((x+y)*_2f.interval):(((_2f.rows+_2f.columns)-(x+y))*_2f.interval),_37=_35*_31+Math.max(1-_31,0)*_36,_38={};
if(_2f.unhide){
_38.top={start:(parseInt(ps.top)-_34.h*_2f.distance),end:parseInt(ps.top)};
if(_2f.fade){
_38.opacity={start:"0",end:"1"};
}
}else{
_38.top={end:(parseInt(ps.top)+_34.h*_2f.distance)};
if(_2f.fade){
_38.opacity={end:"0"};
}
}
var _39=dojo.animateProperty({node:_33,duration:_32,delay:_37,easing:(_2f.easing||(_2f.unhide?dojo.fx.easing.sinIn:dojo.fx.easing.circIn)),properties:_38,beforeBegin:(_2f.unhide?function(){
if(_2f.fade){
dojo.style(_33,{opacity:"0"});
}
ps.top=_38.top.start+"px";
}:undefined)});
return _39;
};
var _3a=dojox.fx._split(_2f);
if(_2f.unhide){
dojo.connect(_3a,"onEnd",_3a,function(){
dojo.style(_30,{opacity:"1"});
});
}else{
dojo.connect(_3a,"onPlay",_3a,function(){
dojo.style(_30,{opacity:"0"});
});
}
return _3a;
},build:function(_3b){
_3b.unhide=true;
return dojox.fx.disintegrate(_3b);
},shear:function(_3c){
var _3d=_3c.node=dojo.byId(_3c.node);
_3c.rows=_3c.rows||6;
_3c.columns=_3c.columns||6;
_3c.duration=_3c.duration||1000;
_3c.interval=_3c.interval||0;
_3c.distance=_3c.distance||1;
_3c.random=_3c.random||0;
if(typeof (_3c.fade)=="undefined"){
_3c.fade=true;
}
var _3e=Math.abs(_3c.random),_3f=(_3c.duration-(_3c.rows+_3c.columns)*Math.abs(_3c.interval));
_3c.pieceAnimation=function(_40,x,y,_41){
var _42=!(x%2),_43=!(y%2),_44=Math.random()*_3f,_45=(_3c.reverseOrder)?(((_3c.rows+_3c.columns)-(x+y))*_3c.interval):((x+y)*_3c.interval),_46=_44*_3e+Math.max(1-_3e,0)*_45,_47={},ps=_40.style;
if(_3c.fade){
_47.opacity=(_3c.unhide?{start:"0",end:"1"}:{end:"0"});
}
if(_3c.columns==1){
_42=_43;
}else{
if(_3c.rows==1){
_43=!_42;
}
}
var _48=parseInt(ps.left),top=parseInt(ps.top),_49=_3c.distance*_41.w,_4a=_3c.distance*_41.h;
if(_3c.unhide){
if(_42==_43){
_47.left=_42?{start:(_48-_49),end:_48}:{start:(_48+_49),end:_48};
}else{
_47.top=_42?{start:(top+_4a),end:top}:{start:(top-_4a),end:top};
}
}else{
if(_42==_43){
_47.left=_42?{end:(_48-_49)}:{end:(_48+_49)};
}else{
_47.top=_42?{end:(top+_4a)}:{end:(top-_4a)};
}
}
var _4b=dojo.animateProperty({node:_40,duration:_3f,delay:_46,easing:(_3c.easing||dojo.fx.easing.sinInOut),properties:_47,beforeBegin:(_3c.unhide?function(){
if(_3c.fade){
ps.opacity="0";
}
if(_42==_43){
ps.left=_47.left.start+"px";
}else{
ps.top=_47.top.start+"px";
}
}:undefined)});
return _4b;
};
var _4c=dojox.fx._split(_3c);
if(_3c.unhide){
dojo.connect(_4c,"onEnd",_4c,function(){
dojo.style(_3d,{opacity:"1"});
});
}else{
dojo.connect(_4c,"onPlay",_4c,function(){
dojo.style(_3d,{opacity:"0"});
});
}
return _4c;
},unShear:function(_4d){
_4d.unhide=true;
return dojox.fx.shear(_4d);
},pinwheel:function(_4e){
var _4f=_4e.node=dojo.byId(_4e.node);
_4e.rows=_4e.rows||4;
_4e.columns=_4e.columns||4;
_4e.duration=_4e.duration||1000;
_4e.interval=_4e.interval||0;
_4e.distance=_4e.distance||1;
_4e.random=_4e.random||0;
if(typeof _4e.fade=="undefined"){
_4e.fade=true;
}
var _50=(_4e.duration-(_4e.rows+_4e.columns)*Math.abs(_4e.interval));
_4e.pieceAnimation=function(_51,x,y,_52){
var _53=_52.h/_4e.rows,_54=_52.w/_4e.columns,_55=!(x%2),_56=!(y%2),_57=Math.random()*_50,_58=(_4e.interval<0)?(((_4e.rows+_4e.columns)-(x+y))*_4e.interval*-1):((x+y)*_4e.interval),_59=_57*_4e.random+Math.max(1-_4e.random,0)*_58,_5a={},ps=_51.style;
if(_4e.fade){
_5a.opacity=(_4e.unhide?{start:0,end:1}:{end:0});
}
if(_4e.columns==1){
_55=!_56;
}else{
if(_4e.rows==1){
_56=_55;
}
}
var _5b=parseInt(ps.left),top=parseInt(ps.top);
if(_55){
if(_56){
_5a.top=_4e.unhide?{start:top+_53*_4e.distance,end:top}:{start:top,end:top+_53*_4e.distance};
}else{
_5a.left=_4e.unhide?{start:_5b+_54*_4e.distance,end:_5b}:{start:_5b,end:_5b+_54*_4e.distance};
}
}
if(_55!=_56){
_5a.width=_4e.unhide?{start:_54*(1-_4e.distance),end:_54}:{start:_54,end:_54*(1-_4e.distance)};
}else{
_5a.height=_4e.unhide?{start:_53*(1-_4e.distance),end:_53}:{start:_53,end:_53*(1-_4e.distance)};
}
var _5c=dojo.animateProperty({node:_51,duration:_50,delay:_59,easing:(_4e.easing||dojo.fx.easing.sinInOut),properties:_5a,beforeBegin:(_4e.unhide?function(){
if(_4e.fade){
dojo.style(_51,"opacity",0);
}
if(_55){
if(_56){
ps.top=(top+_53*(1-_4e.distance))+"px";
}else{
ps.left=(_5b+_54*(1-_4e.distance))+"px";
}
}else{
ps.left=_5b+"px";
ps.top=top+"px";
}
if(_55!=_56){
ps.width=(_54*(1-_4e.distance))+"px";
}else{
ps.height=(_53*(1-_4e.distance))+"px";
}
}:undefined)});
return _5c;
};
var _5d=dojox.fx._split(_4e);
if(_4e.unhide){
dojo.connect(_5d,"onEnd",_5d,function(){
dojo.style(_4f,{opacity:"1"});
});
}else{
dojo.connect(_5d,"play",_5d,function(){
dojo.style(_4f,{opacity:"0"});
});
}
return _5d;
},unPinwheel:function(_5e){
_5e.unhide=true;
return dojox.fx.pinwheel(_5e);
},blockFadeOut:function(_5f){
var _60=_5f.node=dojo.byId(_5f.node);
_5f.rows=_5f.rows||5;
_5f.columns=_5f.columns||5;
_5f.duration=_5f.duration||1000;
_5f.interval=_5f.interval||_5f.duration/(_5f.rows+_5f.columns*2);
_5f.random=_5f.random||0;
var _61=Math.abs(_5f.random),_62=_5f.duration-(_5f.rows+_5f.columns)*_5f.interval;
_5f.pieceAnimation=function(_63,x,y,_64){
var _65=Math.random()*_5f.duration,_66=(_5f.reverseOrder)?(((_5f.rows+_5f.columns)-(x+y))*Math.abs(_5f.interval)):((x+y)*_5f.interval),_67=_65*_61+Math.max(1-_61,0)*_66,_68=dojo.animateProperty({node:_63,duration:_62,delay:_67,easing:(_5f.easing||dojo.fx.easing.sinInOut),properties:{opacity:(_5f.unhide?{start:"0",end:"1"}:{start:"1",end:"0"})},beforeBegin:(_5f.unhide?function(){
dojo.style(_63,{opacity:"0"});
}:function(){
_63.style.filter="";
})});
return _68;
};
var _69=dojox.fx._split(_5f);
if(_5f.unhide){
dojo.connect(_69,"onEnd",_69,function(){
dojo.style(_60,{opacity:"1"});
});
}else{
dojo.connect(_69,"onPlay",_69,function(){
dojo.style(_60,{opacity:"0"});
});
}
return _69;
},blockFadeIn:function(_6a){
_6a.unhide=true;
return dojox.fx.blockFadeOut(_6a);
}});
}
