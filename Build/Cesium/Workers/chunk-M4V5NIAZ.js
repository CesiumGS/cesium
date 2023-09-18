/**
 * @license
 * Cesium - https://github.com/CesiumGS/cesium
 * Version 1.109
 *
 * Copyright 2011-2022 Cesium Contributors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * Columbus View (Pat. Pend.)
 *
 * Portions licensed separately.
 * See https://github.com/CesiumGS/cesium/blob/main/LICENSE.md for full licensing details.
 */

import{a as O,b as d}from"./chunk-EDXNYDRG.js";import{c as R,d as g}from"./chunk-BZH667V4.js";import{b as p}from"./chunk-CJUPDKMM.js";import{a as w}from"./chunk-3G6A2N63.js";import{b as m}from"./chunk-BJ5TGS5X.js";import{e as f}from"./chunk-FZAERGXZ.js";function o(i,h,n,t){this.x=w(i,0),this.y=w(h,0),this.width=w(n,0),this.height=w(t,0)}o.packedLength=4;o.pack=function(i,h,n){return m.typeOf.object("value",i),m.defined("array",h),n=w(n,0),h[n++]=i.x,h[n++]=i.y,h[n++]=i.width,h[n]=i.height,h};o.unpack=function(i,h,n){return m.defined("array",i),h=w(h,0),f(n)||(n=new o),n.x=i[h++],n.y=i[h++],n.width=i[h++],n.height=i[h],n};o.fromPoints=function(i,h){if(f(h)||(h=new o),!f(i)||i.length===0)return h.x=0,h.y=0,h.width=0,h.height=0,h;let n=i.length,t=i[0].x,c=i[0].y,e=i[0].x,y=i[0].y;for(let x=1;x<n;x++){let b=i[x],j=b.x,M=b.y;t=Math.min(j,t),e=Math.max(j,e),c=Math.min(M,c),y=Math.max(M,y)}return h.x=t,h.y=c,h.width=e-t,h.height=y-c,h};var L=new O,X=new p,Y=new p;o.fromRectangle=function(i,h,n){if(f(n)||(n=new o),!f(i))return n.x=0,n.y=0,n.width=0,n.height=0,n;h=w(h,L);let t=h.project(R.southwest(i,X)),c=h.project(R.northeast(i,Y));return g.subtract(c,t,c),n.x=t.x,n.y=t.y,n.width=c.x,n.height=c.y,n};o.clone=function(i,h){if(f(i))return f(h)?(h.x=i.x,h.y=i.y,h.width=i.width,h.height=i.height,h):new o(i.x,i.y,i.width,i.height)};o.union=function(i,h,n){m.typeOf.object("left",i),m.typeOf.object("right",h),f(n)||(n=new o);let t=Math.min(i.x,h.x),c=Math.min(i.y,h.y),e=Math.max(i.x+i.width,h.x+h.width),y=Math.max(i.y+i.height,h.y+h.height);return n.x=t,n.y=c,n.width=e-t,n.height=y-c,n};o.expand=function(i,h,n){m.typeOf.object("rectangle",i),m.typeOf.object("point",h),n=o.clone(i,n);let t=h.x-n.x,c=h.y-n.y;return t>n.width?n.width=t:t<0&&(n.width-=t,n.x=h.x),c>n.height?n.height=c:c<0&&(n.height-=c,n.y=h.y),n};o.intersect=function(i,h){m.typeOf.object("left",i),m.typeOf.object("right",h);let n=i.x,t=i.y,c=h.x,e=h.y;return n>c+h.width||n+i.width<c||t+i.height<e||t>e+h.height?d.OUTSIDE:d.INTERSECTING};o.equals=function(i,h){return i===h||f(i)&&f(h)&&i.x===h.x&&i.y===h.y&&i.width===h.width&&i.height===h.height};o.prototype.clone=function(i){return o.clone(this,i)};o.prototype.intersect=function(i){return o.intersect(this,i)};o.prototype.equals=function(i){return o.equals(this,i)};var S=o;export{S as a};
