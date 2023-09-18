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

import{a as B}from"./chunk-NAFEA7DI.js";import"./chunk-YWPCGYBY.js";import"./chunk-7I4XO6H7.js";import"./chunk-7OXYSRTX.js";import"./chunk-5AJJ3R5G.js";import"./chunk-LWEB5OIH.js";import"./chunk-BFYNB4OA.js";import{a as N}from"./chunk-UQAIZ44P.js";import{a as M}from"./chunk-V2I3KQC6.js";import{b as q,c as R,d as W}from"./chunk-BCEMSXEQ.js";import{d as D}from"./chunk-EDXNYDRG.js";import"./chunk-I5APSYNV.js";import"./chunk-BZH667V4.js";import{a as S}from"./chunk-73TRCFHO.js";import{a as p,c as l}from"./chunk-CJUPDKMM.js";import{a as O}from"./chunk-RSM3RCYG.js";import"./chunk-6FRIJAB3.js";import"./chunk-HESD226B.js";import{a as d}from"./chunk-3G6A2N63.js";import{a as _}from"./chunk-BJ5TGS5X.js";import{e as m}from"./chunk-FZAERGXZ.js";var G=new p,U=new p;function w(i){i=d(i,d.EMPTY_OBJECT);let t=i.positions,e=i.maximumHeights,o=i.minimumHeights;if(!m(t))throw new _("options.positions is required.");if(m(e)&&e.length!==t.length)throw new _("options.positions and options.maximumHeights must have the same length.");if(m(o)&&o.length!==t.length)throw new _("options.positions and options.minimumHeights must have the same length.");let s=d(i.granularity,O.RADIANS_PER_DEGREE),r=d(i.ellipsoid,l.WGS84);this._positions=t,this._minimumHeights=o,this._maximumHeights=e,this._granularity=s,this._ellipsoid=l.clone(r),this._workerName="createWallOutlineGeometry";let n=1+t.length*p.packedLength+2;m(o)&&(n+=o.length),m(e)&&(n+=e.length),this.packedLength=n+l.packedLength+1}w.pack=function(i,t,e){if(!m(i))throw new _("value is required");if(!m(t))throw new _("array is required");e=d(e,0);let o,s=i._positions,r=s.length;for(t[e++]=r,o=0;o<r;++o,e+=p.packedLength)p.pack(s[o],t,e);let n=i._minimumHeights;if(r=m(n)?n.length:0,t[e++]=r,m(n))for(o=0;o<r;++o)t[e++]=n[o];let c=i._maximumHeights;if(r=m(c)?c.length:0,t[e++]=r,m(c))for(o=0;o<r;++o)t[e++]=c[o];return l.pack(i._ellipsoid,t,e),e+=l.packedLength,t[e]=i._granularity,t};var z=l.clone(l.UNIT_SPHERE),b={positions:void 0,minimumHeights:void 0,maximumHeights:void 0,ellipsoid:z,granularity:void 0};w.unpack=function(i,t,e){if(!m(i))throw new _("array is required");t=d(t,0);let o,s=i[t++],r=new Array(s);for(o=0;o<s;++o,t+=p.packedLength)r[o]=p.unpack(i,t);s=i[t++];let n;if(s>0)for(n=new Array(s),o=0;o<s;++o)n[o]=i[t++];s=i[t++];let c;if(s>0)for(c=new Array(s),o=0;o<s;++o)c[o]=i[t++];let E=l.unpack(i,t,z);t+=l.packedLength;let u=i[t];return m(e)?(e._positions=r,e._minimumHeights=n,e._maximumHeights=c,e._ellipsoid=l.clone(E,e._ellipsoid),e._granularity=u,e):(b.positions=r,b.minimumHeights=n,b.maximumHeights=c,b.granularity=u,new w(b))};w.fromConstantHeights=function(i){i=d(i,d.EMPTY_OBJECT);let t=i.positions;if(!m(t))throw new _("options.positions is required.");let e,o,s=i.minimumHeight,r=i.maximumHeight,n=m(s),c=m(r);if(n||c){let u=t.length;e=n?new Array(u):void 0,o=c?new Array(u):void 0;for(let g=0;g<u;++g)n&&(e[g]=s),c&&(o[g]=r)}let E={positions:t,maximumHeights:o,minimumHeights:e,ellipsoid:i.ellipsoid};return new w(E)};w.createGeometry=function(i){let t=i._positions,e=i._minimumHeights,o=i._maximumHeights,s=i._granularity,r=i._ellipsoid,n=B.computePositions(r,t,o,e,s,!1);if(!m(n))return;let c=n.bottomPositions,E=n.topPositions,u=E.length,g=u*2,f=new Float64Array(g),P=0;u/=3;let h;for(h=0;h<u;++h){let A=h*3,k=p.fromArray(E,A,G),L=p.fromArray(c,A,U);f[P++]=L.x,f[P++]=L.y,f[P++]=L.z,f[P++]=k.x,f[P++]=k.y,f[P++]=k.z}let V=new M({position:new W({componentDatatype:S.DOUBLE,componentsPerAttribute:3,values:f})}),y=g/3;g=2*y-4+y;let a=N.createTypedArray(y,g),H=0;for(h=0;h<y-2;h+=2){let A=h,k=h+2,L=p.fromArray(f,A*3,G),v=p.fromArray(f,k*3,U);if(p.equalsEpsilon(L,v,O.EPSILON10))continue;let T=h+1,x=h+3;a[H++]=T,a[H++]=A,a[H++]=T,a[H++]=x,a[H++]=A,a[H++]=k}return a[H++]=y-2,a[H++]=y-1,new R({attributes:V,indices:a,primitiveType:q.LINES,boundingSphere:new D.fromVertices(f)})};var C=w;function J(i,t){return m(t)&&(i=C.unpack(i,t)),i._ellipsoid=l.clone(i._ellipsoid),C.createGeometry(i)}var pi=J;export{pi as default};
