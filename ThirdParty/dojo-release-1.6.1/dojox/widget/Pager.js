/*
	Copyright (c) 2004-2011, The Dojo Foundation All Rights Reserved.
	Available via Academic Free License >= 2.1 OR the modified BSD license.
	see: http://dojotoolkit.org/license for details
*/


if(!dojo._hasResource["dojox.widget.Pager"]){
dojo._hasResource["dojox.widget.Pager"]=true;
dojo.provide("dojox.widget.Pager");
dojo.experimental("dojox.widget.Pager");
dojo.require("dijit._Widget");
dojo.require("dijit._Templated");
dojo.require("dojo.fx");
dojo.declare("dojox.widget.Pager",[dijit._Widget,dijit._Templated],{templateString:dojo.cache("dojox.widget","Pager/Pager.html","<div dojoAttachPoint=\"pagerContainer\" tabIndex=\"0\" dojoAttachEvent=\"onkeypress: _handleKey, onfocus: _a11yStyle, onblur:_a11yStyle\" class=\"${orientation}PagerContainer\">\n    <div class=\"pagerContainer\">\n\t\t<div dojoAttachPoint=\"pagerContainerStatus\" class=\"${orientation}PagerStatus\"></div>\n\t\t<div dojoAttachPoint=\"pagerContainerView\" class=\"${orientation}PagerView\">\n\t\t    <div dojoAttachPoint=\"pagerItemContainer\"><ul dojoAttachPoint=\"pagerItems\" class=\"pagerItems\"></ul></div>\n\t\t</div>\n\t\t<div dojoAttachPoint=\"pagerContainerPager\" class=\"${orientation}PagerPager\">\n\t\t\t<div tabIndex=\"0\" dojoAttachPoint=\"pagerNext\" class=\"pagerIconContainer\" dojoAttachEvent=\"onclick: _pagerNext\"><img dojoAttachPoint=\"pagerIconNext\" src=\"${iconNext}\" alt=\"Next\" /></div>\n\t\t\t<div tabIndex=\"0\" dojoAttachPoint=\"pagerPrevious\" class=\"pagerIconContainer\" dojoAttachEvent=\"onclick: _pagerPrevious\"><img dojoAttachPoint=\"pagerIconPrevious\" src=\"${iconPrevious}\" alt=\"Previous\" /></div>\n\t\t</div>\n    </div>\n\t<div dojoAttachPoint=\"containerNode\" style=\"display:none\"></div>\n</div>\n"),iconPage:dojo.moduleUrl("dojox.widget","Pager/images/pageInactive.png"),iconPageActive:dojo.moduleUrl("dojox.widget","Pager/images/pageActive.png"),store:null,orientation:"horizontal",statusPos:"leading",pagerPos:"center",duration:500,itemSpace:2,resizeChildren:true,itemClass:"dojox.widget._PagerItem",itemsPage:3,postMixInProperties:function(){
var h=(this.orientation=="horizontal");
dojo.mixin(this,{_totalPages:0,_currentPage:1,dirClass:"pager"+(h?"Horizontal":"Vertical"),iconNext:dojo.moduleUrl("dojox.widget","Pager/images/"+(h?"h":"v")+"Next.png"),iconPrevious:dojo.moduleUrl("dojox.widget","Pager/images/"+(h?"h":"v")+"Previous.png")});
},postCreate:function(){
this.inherited(arguments);
this.store.fetch({onComplete:dojo.hitch(this,"_init")});
},_a11yStyle:function(e){
dojo[(e.type=="focus"?"addClass":"removeClass")](e.target,"pagerFocus");
},_handleKey:function(e){
var dk=dojo.keys;
var _1=(e.charCode==dk.SPACE?dk.SPACE:e.keyCode);
switch(_1){
case dk.UP_ARROW:
case dk.RIGHT_ARROW:
case 110:
case 78:
e.preventDefault();
this._pagerNext();
break;
case dk.DOWN_ARROW:
case dk.LEFT_ARROW:
case 112:
case 80:
e.preventDefault();
this._pagerPrevious();
break;
case dk.ENTER:
switch(e.target){
case this.pagerNext:
this._pagerNext();
break;
case this.pagerPrevious:
this._pagerPrevious();
break;
}
break;
}
},_init:function(_2){
this.items=_2;
this._renderPages();
this._renderStatus();
this._renderPager();
},_renderPages:function(){
var _3=this.pagerContainerView;
var _4=(this.orientation=="horizontal");
var _5=dojo.style;
if(_4){
var _6=dojo.marginBox(this.pagerContainerPager).h;
var _7=dojo.marginBox(this.pagerContainerStatus).h;
if(this.pagerPos!="center"){
var _8=_6+_7;
}else{
var _8=_7;
var _9=this.pagerIconNext.width;
var _a=_5(_3,"width");
var _b=_a-(2*_9);
_5(_3,{width:_b+"px",marginLeft:this.pagerIconNext.width+"px",marginRight:this.pagerIconNext.width+"px"});
}
var _c=_5(this.pagerContainer,"height")-_8;
_5(this.pagerContainerView,"height",_c+"px");
var _d=Math.floor(_5(_3,"width")/this.itemsPage);
if(this.statusPos=="trailing"){
if(this.pagerPos!="center"){
_5(_3,"marginTop",_6+"px");
}
_5(_3,"marginBottom",_7+"px");
}else{
_5(_3,"marginTop",_7+"px");
if(this.pagerPos!="center"){
_5(_3,"marginTop",_6+"px");
}
}
}else{
var _e=dojo.marginBox(this.pagerContainerPager).w;
var _f=dojo.marginBox(this.pagerContainerStatus).w;
var _10=_5(this.pagerContainer,"width");
if(this.pagerPos!="center"){
var _11=_e+_f;
}else{
var _11=_f;
var _12=this.pagerIconNext.height;
var _13=_5(_3,"height");
var _14=_13-(2*_12);
_5(_3,{height:_14+"px",marginTop:this.pagerIconNext.height+"px",marginBottom:this.pagerIconNext.height+"px"});
}
var _15=_5(this.pagerContainer,"width")-_11;
_5(_3,"width",_15+"px");
var _d=Math.floor(_5(_3,"height")/this.itemsPage);
if(this.statusPos=="trailing"){
if(this.pagerPos!="center"){
_5(_3,"marginLeft",_e+"px");
}
_5(_3,"marginRight",_f+"px");
}else{
_5(_3,"marginLeft",_f+"px");
if(this.pagerPos!="center"){
_5(_3,"marginRight",_e+"px");
}
}
}
var _16=dojo.getObject(this.itemClass);
var _17="padding"+(_4?"Left":"Top");
var _18="padding"+(_4?"Right":"Bottom");
dojo.forEach(this.items,function(_19,cnt){
var _1a=dojo.create("div",{innerHTML:_19.content});
var _1b=new _16({id:this.id+"-item-"+(cnt+1)},_1a);
this.pagerItems.appendChild(_1b.domNode);
var _1c={};
_1c[(_4?"width":"height")]=(_d-this.itemSpace)+"px";
var p=(_4?"height":"width");
_1c[p]=_5(_3,p)+"px";
_5(_1b.containerNode,_1c);
if(this.resizeChildren){
_1b.resizeChildren();
}
_1b.parseChildren();
_5(_1b.domNode,"position","absolute");
if(cnt<this.itemsPage){
var pos=(cnt)*_d;
var _1d=(_4?"left":"top");
var dir=(_4?"top":"left");
_5(_1b.domNode,dir,"0px");
_5(_1b.domNode,_1d,pos+"px");
}else{
_5(_1b.domNode,"top","-1000px");
_5(_1b.domNode,"left","-1000px");
}
_5(_1b.domNode,_18,(this.itemSpace/2)+"px");
_5(_1b.domNode,_17,(this.itemSpace/2)+"px");
},this);
},_renderPager:function(){
var tcp=this.pagerContainerPager;
var _1e="0px";
var _1f=(this.orientation=="horizontal");
if(_1f){
if(this.statusPos=="center"){
}else{
if(this.statusPos=="trailing"){
dojo.style(tcp,"top",_1e);
}else{
dojo.style(tcp,"bottom",_1e);
}
}
dojo.style(this.pagerNext,"right",_1e);
dojo.style(this.pagerPrevious,"left",_1e);
}else{
if(this.statusPos=="trailing"){
dojo.style(tcp,"left",_1e);
}else{
dojo.style(tcp,"right",_1e);
}
dojo.style(this.pagerNext,"bottom",_1e);
dojo.style(this.pagerPrevious,"top",_1e);
}
},_renderStatus:function(){
this._totalPages=Math.ceil(this.items.length/this.itemsPage);
this.iconWidth=0;
this.iconHeight=0;
this.iconsLoaded=0;
this._iconConnects=[];
for(var i=1;i<=this._totalPages;i++){
var _20=new Image();
var _21=i;
dojo.connect(_20,"onclick",dojo.hitch(this,function(_22){
this._pagerSkip(_22);
},_21));
this._iconConnects[_21]=dojo.connect(_20,"onload",dojo.hitch(this,function(_23){
this.iconWidth+=_20.width;
this.iconHeight+=_20.height;
this.iconsLoaded++;
if(this._totalPages==this.iconsLoaded){
if(this.orientation=="horizontal"){
if(this.statusPos=="trailing"){
if(this.pagerPos=="center"){
var _24=dojo.style(this.pagerContainer,"height");
var _25=dojo.style(this.pagerContainerStatus,"height");
dojo.style(this.pagerContainerPager,"top",((_24/2)-(_25/2))+"px");
}
dojo.style(this.pagerContainerStatus,"bottom","0px");
}else{
if(this.pagerPos=="center"){
var _24=dojo.style(this.pagerContainer,"height");
var _25=dojo.style(this.pagerContainerStatus,"height");
dojo.style(this.pagerContainerPager,"bottom",((_24/2)-(_25/2))+"px");
}
dojo.style(this.pagerContainerStatus,"top","0px");
}
var _26=(dojo.style(this.pagerContainer,"width")/2)-(this.iconWidth/2);
dojo.style(this.pagerContainerStatus,"paddingLeft",_26+"px");
}else{
if(this.statusPos=="trailing"){
if(this.pagerPos=="center"){
var _27=dojo.style(this.pagerContainer,"width");
var _28=dojo.style(this.pagerContainerStatus,"width");
dojo.style(this.pagerContainerPager,"left",((_27/2)-(_28/2))+"px");
}
dojo.style(this.pagerContainerStatus,"right","0px");
}else{
if(this.pagerPos=="center"){
var _27=dojo.style(this.pagerContainer,"width");
var _28=dojo.style(this.pagerContainerStatus,"width");
dojo.style(this.pagerContainerPager,"right",((_27/2)-(_28/2))+"px");
}
dojo.style(this.pagerContainerStatus,"left","0px");
}
var _26=(dojo.style(this.pagerContainer,"height")/2)-(this.iconHeight/2);
dojo.style(this.pagerContainerStatus,"paddingTop",_26+"px");
}
}
dojo.disconnect(this._iconConnects[_23]);
},_21));
if(i==this._currentPage){
_20.src=this.iconPageActive;
}else{
_20.src=this.iconPage;
}
var _21=i;
dojo.addClass(_20,this.orientation+"PagerIcon");
dojo.attr(_20,"id",this.id+"-status-"+i);
this.pagerContainerStatus.appendChild(_20);
if(this.orientation=="vertical"){
dojo.style(_20,"display","block");
}
}
},_pagerSkip:function(_29){
if(this._currentPage==_29){
return;
}else{
var _2a;
var _2b;
if(_29<this._currentPage){
_2a=this._currentPage-_29;
_2b=(this._totalPages+_29)-this._currentPage;
}else{
_2a=(this._totalPages+this._currentPage)-_29;
_2b=_29-this._currentPage;
}
var b=(_2b>_2a);
this._toScroll=(b?_2a:_2b);
var cmd=(b?"_pagerPrevious":"_pagerNext");
var _2c=this.connect(this,"onScrollEnd",function(){
this._toScroll--;
if(this._toScroll<1){
this.disconnect(_2c);
}else{
this[cmd]();
}
});
this[cmd]();
}
},_pagerNext:function(){
if(this._anim){
return;
}
var _2d=[];
for(var i=this._currentPage*this.itemsPage;i>(this._currentPage-1)*this.itemsPage;i--){
if(!dojo.byId(this.id+"-item-"+i)){
continue;
}
var _2e=dojo.byId(this.id+"-item-"+i);
var _2f=dojo.marginBox(_2e);
if(this.orientation=="horizontal"){
var _30=_2f.l-(this.itemsPage*_2f.w);
_2d.push(dojo.fx.slideTo({node:_2e,left:_30,duration:this.duration}));
}else{
var _30=_2f.t-(this.itemsPage*_2f.h);
_2d.push(dojo.fx.slideTo({node:_2e,top:_30,duration:this.duration}));
}
}
var _31=this._currentPage;
if(this._currentPage==this._totalPages){
this._currentPage=1;
}else{
this._currentPage++;
}
var cnt=this.itemsPage;
for(var i=this._currentPage*this.itemsPage;i>(this._currentPage-1)*this.itemsPage;i--){
if(dojo.byId(this.id+"-item-"+i)){
var _2e=dojo.byId(this.id+"-item-"+i);
var _2f=dojo.marginBox(_2e);
if(this.orientation=="horizontal"){
var _32=(dojo.style(this.pagerContainerView,"width")+((cnt-1)*_2f.w))-1;
dojo.style(_2e,"left",_32+"px");
dojo.style(_2e,"top","0px");
var _30=_32-(this.itemsPage*_2f.w);
_2d.push(dojo.fx.slideTo({node:_2e,left:_30,duration:this.duration}));
}else{
_32=(dojo.style(this.pagerContainerView,"height")+((cnt-1)*_2f.h))-1;
dojo.style(_2e,"top",_32+"px");
dojo.style(_2e,"left","0px");
var _30=_32-(this.itemsPage*_2f.h);
_2d.push(dojo.fx.slideTo({node:_2e,top:_30,duration:this.duration}));
}
}
cnt--;
}
this._anim=dojo.fx.combine(_2d);
var _33=this.connect(this._anim,"onEnd",function(){
delete this._anim;
this.onScrollEnd();
this.disconnect(_33);
});
this._anim.play();
dojo.byId(this.id+"-status-"+_31).src=this.iconPage;
dojo.byId(this.id+"-status-"+this._currentPage).src=this.iconPageActive;
},_pagerPrevious:function(){
if(this._anim){
return;
}
var _34=[];
for(var i=this._currentPage*this.itemsPage;i>(this._currentPage-1)*this.itemsPage;i--){
if(!dojo.byId(this.id+"-item-"+i)){
continue;
}
var _35=dojo.byId(this.id+"-item-"+i);
var _36=dojo.marginBox(_35);
if(this.orientation=="horizontal"){
var _37=dojo.style(_35,"left")+(this.itemsPage*_36.w);
_34.push(dojo.fx.slideTo({node:_35,left:_37,duration:this.duration}));
}else{
var _37=dojo.style(_35,"top")+(this.itemsPage*_36.h);
_34.push(dojo.fx.slideTo({node:_35,top:_37,duration:this.duration}));
}
}
var _38=this._currentPage;
if(this._currentPage==1){
this._currentPage=this._totalPages;
}else{
this._currentPage--;
}
var cnt=this.itemsPage;
var j=1;
for(var i=this._currentPage*this.itemsPage;i>(this._currentPage-1)*this.itemsPage;i--){
if(dojo.byId(this.id+"-item-"+i)){
var _35=dojo.byId(this.id+"-item-"+i);
var _36=dojo.marginBox(_35);
if(this.orientation=="horizontal"){
var _39=-(j*_36.w)+1;
dojo.style(_35,"left",_39+"px");
dojo.style(_35,"top","0px");
var _37=((cnt-1)*_36.w);
_34.push(dojo.fx.slideTo({node:_35,left:_37,duration:this.duration}));
var _37=_39+(this.itemsPage*_36.w);
_34.push(dojo.fx.slideTo({node:_35,left:_37,duration:this.duration}));
}else{
_39=-((j*_36.h)+1);
dojo.style(_35,"top",_39+"px");
dojo.style(_35,"left","0px");
var _37=((cnt-1)*_36.h);
_34.push(dojo.fx.slideTo({node:_35,top:_37,duration:this.duration}));
}
}
cnt--;
j++;
}
this._anim=dojo.fx.combine(_34);
var _3a=dojo.connect(this._anim,"onEnd",dojo.hitch(this,function(){
delete this._anim;
this.onScrollEnd();
dojo.disconnect(_3a);
}));
this._anim.play();
dojo.byId(this.id+"-status-"+_38).src=this.iconPage;
dojo.byId(this.id+"-status-"+this._currentPage).src=this.iconPageActive;
},onScrollEnd:function(){
}});
dojo.declare("dojox.widget._PagerItem",[dijit._Widget,dijit._Templated],{templateString:"<li class=\"pagerItem\" dojoAttachPoint=\"containerNode\"></li>",resizeChildren:function(){
var box=dojo.marginBox(this.containerNode);
dojo.style(this.containerNode.firstChild,{width:box.w+"px",height:box.h+"px"});
},parseChildren:function(){
dojo.parser.parse(this.containerNode);
}});
}
