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

import{a}from"./chunk-3G6A2N63.js";import{e as l}from"./chunk-FZAERGXZ.js";function p(n,r,i){i=a(i,!1);let f={},u=l(n),s=l(r),e,t,o;if(u)for(e in n)n.hasOwnProperty(e)&&(t=n[e],s&&i&&typeof t=="object"&&r.hasOwnProperty(e)?(o=r[e],typeof o=="object"?f[e]=p(t,o,i):f[e]=t):f[e]=t);if(s)for(e in r)r.hasOwnProperty(e)&&!f.hasOwnProperty(e)&&(o=r[e],f[e]=o);return f}var h=p;export{h as a};
