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

import {
  combine_default
} from "./chunk-Z2BQIJST.js";
import {
  Cartesian2_default,
  Cartesian4_default,
  Matrix4_default,
  Rectangle_default
} from "./chunk-5G2JRFMX.js";
import {
  Cartesian3_default,
  Cartographic_default,
  Ellipsoid_default,
  Matrix3_default
} from "./chunk-A7FTZEKI.js";
import {
  Math_default
} from "./chunk-DPAUXJXY.js";
import {
  RuntimeError_default
} from "./chunk-JQQW5OSU.js";
import {
  defaultValue_default
} from "./chunk-63W23YZY.js";
import {
  Check_default,
  DeveloperError_default
} from "./chunk-J64Y4DQH.js";
import {
  __commonJS,
  __require,
  __toESM,
  defined_default
} from "./chunk-7KX4PCVC.js";

// node_modules/urijs/src/punycode.js
var require_punycode = __commonJS({
  "node_modules/urijs/src/punycode.js"(exports, module) {
    /*! https://mths.be/punycode v1.4.0 by @mathias */
    (function(root) {
      var freeExports = typeof exports == "object" && exports && !exports.nodeType && exports;
      var freeModule = typeof module == "object" && module && !module.nodeType && module;
      var freeGlobal = typeof global == "object" && global;
      if (freeGlobal.global === freeGlobal || freeGlobal.window === freeGlobal || freeGlobal.self === freeGlobal) {
        root = freeGlobal;
      }
      var punycode, maxInt = 2147483647, base = 36, tMin = 1, tMax = 26, skew = 38, damp = 700, initialBias = 72, initialN = 128, delimiter = "-", regexPunycode = /^xn--/, regexNonASCII = /[^\x20-\x7E]/, regexSeparators = /[\x2E\u3002\uFF0E\uFF61]/g, errors = {
        "overflow": "Overflow: input needs wider integers to process",
        "not-basic": "Illegal input >= 0x80 (not a basic code point)",
        "invalid-input": "Invalid input"
      }, baseMinusTMin = base - tMin, floor = Math.floor, stringFromCharCode = String.fromCharCode, key;
      function error(type) {
        throw new RangeError(errors[type]);
      }
      function map(array, fn) {
        var length = array.length;
        var result = [];
        while (length--) {
          result[length] = fn(array[length]);
        }
        return result;
      }
      function mapDomain(string, fn) {
        var parts = string.split("@");
        var result = "";
        if (parts.length > 1) {
          result = parts[0] + "@";
          string = parts[1];
        }
        string = string.replace(regexSeparators, ".");
        var labels = string.split(".");
        var encoded = map(labels, fn).join(".");
        return result + encoded;
      }
      function ucs2decode(string) {
        var output = [], counter = 0, length = string.length, value, extra;
        while (counter < length) {
          value = string.charCodeAt(counter++);
          if (value >= 55296 && value <= 56319 && counter < length) {
            extra = string.charCodeAt(counter++);
            if ((extra & 64512) == 56320) {
              output.push(((value & 1023) << 10) + (extra & 1023) + 65536);
            } else {
              output.push(value);
              counter--;
            }
          } else {
            output.push(value);
          }
        }
        return output;
      }
      function ucs2encode(array) {
        return map(array, function(value) {
          var output = "";
          if (value > 65535) {
            value -= 65536;
            output += stringFromCharCode(value >>> 10 & 1023 | 55296);
            value = 56320 | value & 1023;
          }
          output += stringFromCharCode(value);
          return output;
        }).join("");
      }
      function basicToDigit(codePoint) {
        if (codePoint - 48 < 10) {
          return codePoint - 22;
        }
        if (codePoint - 65 < 26) {
          return codePoint - 65;
        }
        if (codePoint - 97 < 26) {
          return codePoint - 97;
        }
        return base;
      }
      function digitToBasic(digit, flag) {
        return digit + 22 + 75 * (digit < 26) - ((flag != 0) << 5);
      }
      function adapt(delta, numPoints, firstTime) {
        var k = 0;
        delta = firstTime ? floor(delta / damp) : delta >> 1;
        delta += floor(delta / numPoints);
        for (; delta > baseMinusTMin * tMax >> 1; k += base) {
          delta = floor(delta / baseMinusTMin);
        }
        return floor(k + (baseMinusTMin + 1) * delta / (delta + skew));
      }
      function decode(input) {
        var output = [], inputLength = input.length, out, i = 0, n = initialN, bias = initialBias, basic, j, index, oldi, w, k, digit, t, baseMinusT;
        basic = input.lastIndexOf(delimiter);
        if (basic < 0) {
          basic = 0;
        }
        for (j = 0; j < basic; ++j) {
          if (input.charCodeAt(j) >= 128) {
            error("not-basic");
          }
          output.push(input.charCodeAt(j));
        }
        for (index = basic > 0 ? basic + 1 : 0; index < inputLength; ) {
          for (oldi = i, w = 1, k = base; ; k += base) {
            if (index >= inputLength) {
              error("invalid-input");
            }
            digit = basicToDigit(input.charCodeAt(index++));
            if (digit >= base || digit > floor((maxInt - i) / w)) {
              error("overflow");
            }
            i += digit * w;
            t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
            if (digit < t) {
              break;
            }
            baseMinusT = base - t;
            if (w > floor(maxInt / baseMinusT)) {
              error("overflow");
            }
            w *= baseMinusT;
          }
          out = output.length + 1;
          bias = adapt(i - oldi, out, oldi == 0);
          if (floor(i / out) > maxInt - n) {
            error("overflow");
          }
          n += floor(i / out);
          i %= out;
          output.splice(i++, 0, n);
        }
        return ucs2encode(output);
      }
      function encode(input) {
        var n, delta, handledCPCount, basicLength, bias, j, m, q, k, t, currentValue, output = [], inputLength, handledCPCountPlusOne, baseMinusT, qMinusT;
        input = ucs2decode(input);
        inputLength = input.length;
        n = initialN;
        delta = 0;
        bias = initialBias;
        for (j = 0; j < inputLength; ++j) {
          currentValue = input[j];
          if (currentValue < 128) {
            output.push(stringFromCharCode(currentValue));
          }
        }
        handledCPCount = basicLength = output.length;
        if (basicLength) {
          output.push(delimiter);
        }
        while (handledCPCount < inputLength) {
          for (m = maxInt, j = 0; j < inputLength; ++j) {
            currentValue = input[j];
            if (currentValue >= n && currentValue < m) {
              m = currentValue;
            }
          }
          handledCPCountPlusOne = handledCPCount + 1;
          if (m - n > floor((maxInt - delta) / handledCPCountPlusOne)) {
            error("overflow");
          }
          delta += (m - n) * handledCPCountPlusOne;
          n = m;
          for (j = 0; j < inputLength; ++j) {
            currentValue = input[j];
            if (currentValue < n && ++delta > maxInt) {
              error("overflow");
            }
            if (currentValue == n) {
              for (q = delta, k = base; ; k += base) {
                t = k <= bias ? tMin : k >= bias + tMax ? tMax : k - bias;
                if (q < t) {
                  break;
                }
                qMinusT = q - t;
                baseMinusT = base - t;
                output.push(
                  stringFromCharCode(digitToBasic(t + qMinusT % baseMinusT, 0))
                );
                q = floor(qMinusT / baseMinusT);
              }
              output.push(stringFromCharCode(digitToBasic(q, 0)));
              bias = adapt(delta, handledCPCountPlusOne, handledCPCount == basicLength);
              delta = 0;
              ++handledCPCount;
            }
          }
          ++delta;
          ++n;
        }
        return output.join("");
      }
      function toUnicode(input) {
        return mapDomain(input, function(string) {
          return regexPunycode.test(string) ? decode(string.slice(4).toLowerCase()) : string;
        });
      }
      function toASCII(input) {
        return mapDomain(input, function(string) {
          return regexNonASCII.test(string) ? "xn--" + encode(string) : string;
        });
      }
      punycode = {
        /**
         * A string representing the current Punycode.js version number.
         * @memberOf punycode
         * @type String
         */
        "version": "1.3.2",
        /**
         * An object of methods to convert from JavaScript's internal character
         * representation (UCS-2) to Unicode code points, and back.
         * @see <https://mathiasbynens.be/notes/javascript-encoding>
         * @memberOf punycode
         * @type Object
         */
        "ucs2": {
          "decode": ucs2decode,
          "encode": ucs2encode
        },
        "decode": decode,
        "encode": encode,
        "toASCII": toASCII,
        "toUnicode": toUnicode
      };
      if (typeof define == "function" && typeof define.amd == "object" && define.amd) {
        define("punycode", function() {
          return punycode;
        });
      } else if (freeExports && freeModule) {
        if (module.exports == freeExports) {
          freeModule.exports = punycode;
        } else {
          for (key in punycode) {
            punycode.hasOwnProperty(key) && (freeExports[key] = punycode[key]);
          }
        }
      } else {
        root.punycode = punycode;
      }
    })(exports);
  }
});

// node_modules/urijs/src/IPv6.js
var require_IPv6 = __commonJS({
  "node_modules/urijs/src/IPv6.js"(exports, module) {
    /*!
     * URI.js - Mutating URLs
     * IPv6 Support
     *
     * Version: 1.19.11
     *
     * Author: Rodney Rehm
     * Web: http://medialize.github.io/URI.js/
     *
     * Licensed under
     *   MIT License http://www.opensource.org/licenses/mit-license
     *
     */
    (function(root, factory) {
      "use strict";
      if (typeof module === "object" && module.exports) {
        module.exports = factory();
      } else if (typeof define === "function" && define.amd) {
        define(factory);
      } else {
        root.IPv6 = factory(root);
      }
    })(exports, function(root) {
      "use strict";
      var _IPv6 = root && root.IPv6;
      function bestPresentation(address) {
        var _address = address.toLowerCase();
        var segments = _address.split(":");
        var length = segments.length;
        var total = 8;
        if (segments[0] === "" && segments[1] === "" && segments[2] === "") {
          segments.shift();
          segments.shift();
        } else if (segments[0] === "" && segments[1] === "") {
          segments.shift();
        } else if (segments[length - 1] === "" && segments[length - 2] === "") {
          segments.pop();
        }
        length = segments.length;
        if (segments[length - 1].indexOf(".") !== -1) {
          total = 7;
        }
        var pos;
        for (pos = 0; pos < length; pos++) {
          if (segments[pos] === "") {
            break;
          }
        }
        if (pos < total) {
          segments.splice(pos, 1, "0000");
          while (segments.length < total) {
            segments.splice(pos, 0, "0000");
          }
        }
        var _segments;
        for (var i = 0; i < total; i++) {
          _segments = segments[i].split("");
          for (var j = 0; j < 3; j++) {
            if (_segments[0] === "0" && _segments.length > 1) {
              _segments.splice(0, 1);
            } else {
              break;
            }
          }
          segments[i] = _segments.join("");
        }
        var best = -1;
        var _best = 0;
        var _current = 0;
        var current = -1;
        var inzeroes = false;
        for (i = 0; i < total; i++) {
          if (inzeroes) {
            if (segments[i] === "0") {
              _current += 1;
            } else {
              inzeroes = false;
              if (_current > _best) {
                best = current;
                _best = _current;
              }
            }
          } else {
            if (segments[i] === "0") {
              inzeroes = true;
              current = i;
              _current = 1;
            }
          }
        }
        if (_current > _best) {
          best = current;
          _best = _current;
        }
        if (_best > 1) {
          segments.splice(best, _best, "");
        }
        length = segments.length;
        var result = "";
        if (segments[0] === "") {
          result = ":";
        }
        for (i = 0; i < length; i++) {
          result += segments[i];
          if (i === length - 1) {
            break;
          }
          result += ":";
        }
        if (segments[length - 1] === "") {
          result += ":";
        }
        return result;
      }
      function noConflict() {
        if (root.IPv6 === this) {
          root.IPv6 = _IPv6;
        }
        return this;
      }
      return {
        best: bestPresentation,
        noConflict
      };
    });
  }
});

// node_modules/urijs/src/SecondLevelDomains.js
var require_SecondLevelDomains = __commonJS({
  "node_modules/urijs/src/SecondLevelDomains.js"(exports, module) {
    /*!
     * URI.js - Mutating URLs
     * Second Level Domain (SLD) Support
     *
     * Version: 1.19.11
     *
     * Author: Rodney Rehm
     * Web: http://medialize.github.io/URI.js/
     *
     * Licensed under
     *   MIT License http://www.opensource.org/licenses/mit-license
     *
     */
    (function(root, factory) {
      "use strict";
      if (typeof module === "object" && module.exports) {
        module.exports = factory();
      } else if (typeof define === "function" && define.amd) {
        define(factory);
      } else {
        root.SecondLevelDomains = factory(root);
      }
    })(exports, function(root) {
      "use strict";
      var _SecondLevelDomains = root && root.SecondLevelDomains;
      var SLD = {
        // list of known Second Level Domains
        // converted list of SLDs from https://github.com/gavingmiller/second-level-domains
        // ----
        // publicsuffix.org is more current and actually used by a couple of browsers internally.
        // downside is it also contains domains like "dyndns.org" - which is fine for the security
        // issues browser have to deal with (SOP for cookies, etc) - but is way overboard for URI.js
        // ----
        list: {
          "ac": " com gov mil net org ",
          "ae": " ac co gov mil name net org pro sch ",
          "af": " com edu gov net org ",
          "al": " com edu gov mil net org ",
          "ao": " co ed gv it og pb ",
          "ar": " com edu gob gov int mil net org tur ",
          "at": " ac co gv or ",
          "au": " asn com csiro edu gov id net org ",
          "ba": " co com edu gov mil net org rs unbi unmo unsa untz unze ",
          "bb": " biz co com edu gov info net org store tv ",
          "bh": " biz cc com edu gov info net org ",
          "bn": " com edu gov net org ",
          "bo": " com edu gob gov int mil net org tv ",
          "br": " adm adv agr am arq art ato b bio blog bmd cim cng cnt com coop ecn edu eng esp etc eti far flog fm fnd fot fst g12 ggf gov imb ind inf jor jus lel mat med mil mus net nom not ntr odo org ppg pro psc psi qsl rec slg srv tmp trd tur tv vet vlog wiki zlg ",
          "bs": " com edu gov net org ",
          "bz": " du et om ov rg ",
          "ca": " ab bc mb nb nf nl ns nt nu on pe qc sk yk ",
          "ck": " biz co edu gen gov info net org ",
          "cn": " ac ah bj com cq edu fj gd gov gs gx gz ha hb he hi hl hn jl js jx ln mil net nm nx org qh sc sd sh sn sx tj tw xj xz yn zj ",
          "co": " com edu gov mil net nom org ",
          "cr": " ac c co ed fi go or sa ",
          "cy": " ac biz com ekloges gov ltd name net org parliament press pro tm ",
          "do": " art com edu gob gov mil net org sld web ",
          "dz": " art asso com edu gov net org pol ",
          "ec": " com edu fin gov info med mil net org pro ",
          "eg": " com edu eun gov mil name net org sci ",
          "er": " com edu gov ind mil net org rochest w ",
          "es": " com edu gob nom org ",
          "et": " biz com edu gov info name net org ",
          "fj": " ac biz com info mil name net org pro ",
          "fk": " ac co gov net nom org ",
          "fr": " asso com f gouv nom prd presse tm ",
          "gg": " co net org ",
          "gh": " com edu gov mil org ",
          "gn": " ac com gov net org ",
          "gr": " com edu gov mil net org ",
          "gt": " com edu gob ind mil net org ",
          "gu": " com edu gov net org ",
          "hk": " com edu gov idv net org ",
          "hu": " 2000 agrar bolt casino city co erotica erotika film forum games hotel info ingatlan jogasz konyvelo lakas media news org priv reklam sex shop sport suli szex tm tozsde utazas video ",
          "id": " ac co go mil net or sch web ",
          "il": " ac co gov idf k12 muni net org ",
          "in": " ac co edu ernet firm gen gov i ind mil net nic org res ",
          "iq": " com edu gov i mil net org ",
          "ir": " ac co dnssec gov i id net org sch ",
          "it": " edu gov ",
          "je": " co net org ",
          "jo": " com edu gov mil name net org sch ",
          "jp": " ac ad co ed go gr lg ne or ",
          "ke": " ac co go info me mobi ne or sc ",
          "kh": " com edu gov mil net org per ",
          "ki": " biz com de edu gov info mob net org tel ",
          "km": " asso com coop edu gouv k medecin mil nom notaires pharmaciens presse tm veterinaire ",
          "kn": " edu gov net org ",
          "kr": " ac busan chungbuk chungnam co daegu daejeon es gangwon go gwangju gyeongbuk gyeonggi gyeongnam hs incheon jeju jeonbuk jeonnam k kg mil ms ne or pe re sc seoul ulsan ",
          "kw": " com edu gov net org ",
          "ky": " com edu gov net org ",
          "kz": " com edu gov mil net org ",
          "lb": " com edu gov net org ",
          "lk": " assn com edu gov grp hotel int ltd net ngo org sch soc web ",
          "lr": " com edu gov net org ",
          "lv": " asn com conf edu gov id mil net org ",
          "ly": " com edu gov id med net org plc sch ",
          "ma": " ac co gov m net org press ",
          "mc": " asso tm ",
          "me": " ac co edu gov its net org priv ",
          "mg": " com edu gov mil nom org prd tm ",
          "mk": " com edu gov inf name net org pro ",
          "ml": " com edu gov net org presse ",
          "mn": " edu gov org ",
          "mo": " com edu gov net org ",
          "mt": " com edu gov net org ",
          "mv": " aero biz com coop edu gov info int mil museum name net org pro ",
          "mw": " ac co com coop edu gov int museum net org ",
          "mx": " com edu gob net org ",
          "my": " com edu gov mil name net org sch ",
          "nf": " arts com firm info net other per rec store web ",
          "ng": " biz com edu gov mil mobi name net org sch ",
          "ni": " ac co com edu gob mil net nom org ",
          "np": " com edu gov mil net org ",
          "nr": " biz com edu gov info net org ",
          "om": " ac biz co com edu gov med mil museum net org pro sch ",
          "pe": " com edu gob mil net nom org sld ",
          "ph": " com edu gov i mil net ngo org ",
          "pk": " biz com edu fam gob gok gon gop gos gov net org web ",
          "pl": " art bialystok biz com edu gda gdansk gorzow gov info katowice krakow lodz lublin mil net ngo olsztyn org poznan pwr radom slupsk szczecin torun warszawa waw wroc wroclaw zgora ",
          "pr": " ac biz com edu est gov info isla name net org pro prof ",
          "ps": " com edu gov net org plo sec ",
          "pw": " belau co ed go ne or ",
          "ro": " arts com firm info nom nt org rec store tm www ",
          "rs": " ac co edu gov in org ",
          "sb": " com edu gov net org ",
          "sc": " com edu gov net org ",
          "sh": " co com edu gov net nom org ",
          "sl": " com edu gov net org ",
          "st": " co com consulado edu embaixada gov mil net org principe saotome store ",
          "sv": " com edu gob org red ",
          "sz": " ac co org ",
          "tr": " av bbs bel biz com dr edu gen gov info k12 name net org pol tel tsk tv web ",
          "tt": " aero biz cat co com coop edu gov info int jobs mil mobi museum name net org pro tel travel ",
          "tw": " club com ebiz edu game gov idv mil net org ",
          "mu": " ac co com gov net or org ",
          "mz": " ac co edu gov org ",
          "na": " co com ",
          "nz": " ac co cri geek gen govt health iwi maori mil net org parliament school ",
          "pa": " abo ac com edu gob ing med net nom org sld ",
          "pt": " com edu gov int net nome org publ ",
          "py": " com edu gov mil net org ",
          "qa": " com edu gov mil net org ",
          "re": " asso com nom ",
          "ru": " ac adygeya altai amur arkhangelsk astrakhan bashkiria belgorod bir bryansk buryatia cbg chel chelyabinsk chita chukotka chuvashia com dagestan e-burg edu gov grozny int irkutsk ivanovo izhevsk jar joshkar-ola kalmykia kaluga kamchatka karelia kazan kchr kemerovo khabarovsk khakassia khv kirov koenig komi kostroma kranoyarsk kuban kurgan kursk lipetsk magadan mari mari-el marine mil mordovia mosreg msk murmansk nalchik net nnov nov novosibirsk nsk omsk orenburg org oryol penza perm pp pskov ptz rnd ryazan sakhalin samara saratov simbirsk smolensk spb stavropol stv surgut tambov tatarstan tom tomsk tsaritsyn tsk tula tuva tver tyumen udm udmurtia ulan-ude vladikavkaz vladimir vladivostok volgograd vologda voronezh vrn vyatka yakutia yamal yekaterinburg yuzhno-sakhalinsk ",
          "rw": " ac co com edu gouv gov int mil net ",
          "sa": " com edu gov med net org pub sch ",
          "sd": " com edu gov info med net org tv ",
          "se": " a ac b bd c d e f g h i k l m n o org p parti pp press r s t tm u w x y z ",
          "sg": " com edu gov idn net org per ",
          "sn": " art com edu gouv org perso univ ",
          "sy": " com edu gov mil net news org ",
          "th": " ac co go in mi net or ",
          "tj": " ac biz co com edu go gov info int mil name net nic org test web ",
          "tn": " agrinet com defense edunet ens fin gov ind info intl mincom nat net org perso rnrt rns rnu tourism ",
          "tz": " ac co go ne or ",
          "ua": " biz cherkassy chernigov chernovtsy ck cn co com crimea cv dn dnepropetrovsk donetsk dp edu gov if in ivano-frankivsk kh kharkov kherson khmelnitskiy kiev kirovograd km kr ks kv lg lugansk lutsk lviv me mk net nikolaev od odessa org pl poltava pp rovno rv sebastopol sumy te ternopil uzhgorod vinnica vn zaporizhzhe zhitomir zp zt ",
          "ug": " ac co go ne or org sc ",
          "uk": " ac bl british-library co cym gov govt icnet jet lea ltd me mil mod national-library-scotland nel net nhs nic nls org orgn parliament plc police sch scot soc ",
          "us": " dni fed isa kids nsn ",
          "uy": " com edu gub mil net org ",
          "ve": " co com edu gob info mil net org web ",
          "vi": " co com k12 net org ",
          "vn": " ac biz com edu gov health info int name net org pro ",
          "ye": " co com gov ltd me net org plc ",
          "yu": " ac co edu gov org ",
          "za": " ac agric alt bourse city co cybernet db edu gov grondar iaccess imt inca landesign law mil net ngo nis nom olivetti org pix school tm web ",
          "zm": " ac co com edu gov net org sch ",
          // https://en.wikipedia.org/wiki/CentralNic#Second-level_domains
          "com": "ar br cn de eu gb gr hu jpn kr no qc ru sa se uk us uy za ",
          "net": "gb jp se uk ",
          "org": "ae",
          "de": "com "
        },
        // gorhill 2013-10-25: Using indexOf() instead Regexp(). Significant boost
        // in both performance and memory footprint. No initialization required.
        // http://jsperf.com/uri-js-sld-regex-vs-binary-search/4
        // Following methods use lastIndexOf() rather than array.split() in order
        // to avoid any memory allocations.
        has: function(domain) {
          var tldOffset = domain.lastIndexOf(".");
          if (tldOffset <= 0 || tldOffset >= domain.length - 1) {
            return false;
          }
          var sldOffset = domain.lastIndexOf(".", tldOffset - 1);
          if (sldOffset <= 0 || sldOffset >= tldOffset - 1) {
            return false;
          }
          var sldList = SLD.list[domain.slice(tldOffset + 1)];
          if (!sldList) {
            return false;
          }
          return sldList.indexOf(" " + domain.slice(sldOffset + 1, tldOffset) + " ") >= 0;
        },
        is: function(domain) {
          var tldOffset = domain.lastIndexOf(".");
          if (tldOffset <= 0 || tldOffset >= domain.length - 1) {
            return false;
          }
          var sldOffset = domain.lastIndexOf(".", tldOffset - 1);
          if (sldOffset >= 0) {
            return false;
          }
          var sldList = SLD.list[domain.slice(tldOffset + 1)];
          if (!sldList) {
            return false;
          }
          return sldList.indexOf(" " + domain.slice(0, tldOffset) + " ") >= 0;
        },
        get: function(domain) {
          var tldOffset = domain.lastIndexOf(".");
          if (tldOffset <= 0 || tldOffset >= domain.length - 1) {
            return null;
          }
          var sldOffset = domain.lastIndexOf(".", tldOffset - 1);
          if (sldOffset <= 0 || sldOffset >= tldOffset - 1) {
            return null;
          }
          var sldList = SLD.list[domain.slice(tldOffset + 1)];
          if (!sldList) {
            return null;
          }
          if (sldList.indexOf(" " + domain.slice(sldOffset + 1, tldOffset) + " ") < 0) {
            return null;
          }
          return domain.slice(sldOffset + 1);
        },
        noConflict: function() {
          if (root.SecondLevelDomains === this) {
            root.SecondLevelDomains = _SecondLevelDomains;
          }
          return this;
        }
      };
      return SLD;
    });
  }
});

// node_modules/urijs/src/URI.js
var require_URI = __commonJS({
  "node_modules/urijs/src/URI.js"(exports, module) {
    /*!
     * URI.js - Mutating URLs
     *
     * Version: 1.19.11
     *
     * Author: Rodney Rehm
     * Web: http://medialize.github.io/URI.js/
     *
     * Licensed under
     *   MIT License http://www.opensource.org/licenses/mit-license
     *
     */
    (function(root, factory) {
      "use strict";
      if (typeof module === "object" && module.exports) {
        module.exports = factory(require_punycode(), require_IPv6(), require_SecondLevelDomains());
      } else if (typeof define === "function" && define.amd) {
        define(["./punycode", "./IPv6", "./SecondLevelDomains"], factory);
      } else {
        root.URI = factory(root.punycode, root.IPv6, root.SecondLevelDomains, root);
      }
    })(exports, function(punycode, IPv6, SLD, root) {
      "use strict";
      var _URI = root && root.URI;
      function URI(url, base) {
        var _urlSupplied = arguments.length >= 1;
        var _baseSupplied = arguments.length >= 2;
        if (!(this instanceof URI)) {
          if (_urlSupplied) {
            if (_baseSupplied) {
              return new URI(url, base);
            }
            return new URI(url);
          }
          return new URI();
        }
        if (url === void 0) {
          if (_urlSupplied) {
            throw new TypeError("undefined is not a valid argument for URI");
          }
          if (typeof location !== "undefined") {
            url = location.href + "";
          } else {
            url = "";
          }
        }
        if (url === null) {
          if (_urlSupplied) {
            throw new TypeError("null is not a valid argument for URI");
          }
        }
        this.href(url);
        if (base !== void 0) {
          return this.absoluteTo(base);
        }
        return this;
      }
      function isInteger(value) {
        return /^[0-9]+$/.test(value);
      }
      URI.version = "1.19.11";
      var p = URI.prototype;
      var hasOwn = Object.prototype.hasOwnProperty;
      function escapeRegEx(string) {
        return string.replace(/([.*+?^=!:${}()|[\]\/\\])/g, "\\$1");
      }
      function getType(value) {
        if (value === void 0) {
          return "Undefined";
        }
        return String(Object.prototype.toString.call(value)).slice(8, -1);
      }
      function isArray(obj) {
        return getType(obj) === "Array";
      }
      function filterArrayValues(data, value) {
        var lookup = {};
        var i, length;
        if (getType(value) === "RegExp") {
          lookup = null;
        } else if (isArray(value)) {
          for (i = 0, length = value.length; i < length; i++) {
            lookup[value[i]] = true;
          }
        } else {
          lookup[value] = true;
        }
        for (i = 0, length = data.length; i < length; i++) {
          var _match = lookup && lookup[data[i]] !== void 0 || !lookup && value.test(data[i]);
          if (_match) {
            data.splice(i, 1);
            length--;
            i--;
          }
        }
        return data;
      }
      function arrayContains(list, value) {
        var i, length;
        if (isArray(value)) {
          for (i = 0, length = value.length; i < length; i++) {
            if (!arrayContains(list, value[i])) {
              return false;
            }
          }
          return true;
        }
        var _type = getType(value);
        for (i = 0, length = list.length; i < length; i++) {
          if (_type === "RegExp") {
            if (typeof list[i] === "string" && list[i].match(value)) {
              return true;
            }
          } else if (list[i] === value) {
            return true;
          }
        }
        return false;
      }
      function arraysEqual(one, two) {
        if (!isArray(one) || !isArray(two)) {
          return false;
        }
        if (one.length !== two.length) {
          return false;
        }
        one.sort();
        two.sort();
        for (var i = 0, l = one.length; i < l; i++) {
          if (one[i] !== two[i]) {
            return false;
          }
        }
        return true;
      }
      function trimSlashes(text) {
        var trim_expression = /^\/+|\/+$/g;
        return text.replace(trim_expression, "");
      }
      URI._parts = function() {
        return {
          protocol: null,
          username: null,
          password: null,
          hostname: null,
          urn: null,
          port: null,
          path: null,
          query: null,
          fragment: null,
          // state
          preventInvalidHostname: URI.preventInvalidHostname,
          duplicateQueryParameters: URI.duplicateQueryParameters,
          escapeQuerySpace: URI.escapeQuerySpace
        };
      };
      URI.preventInvalidHostname = false;
      URI.duplicateQueryParameters = false;
      URI.escapeQuerySpace = true;
      URI.protocol_expression = /^[a-z][a-z0-9.+-]*$/i;
      URI.idn_expression = /[^a-z0-9\._-]/i;
      URI.punycode_expression = /(xn--)/i;
      URI.ip4_expression = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
      URI.ip6_expression = /^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/;
      URI.find_uri_expression = /\b((?:[a-z][\w-]+:(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.\-]+[.][a-z]{2,4}\/)(?:[^\s()<>]+|\(([^\s()<>]+|(\([^\s()<>]+\)))*\))+(?:\(([^\s()<>]+|(\([^\s()<>]+\)))*\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))/ig;
      URI.findUri = {
        // valid "scheme://" or "www."
        start: /\b(?:([a-z][a-z0-9.+-]*:\/\/)|www\.)/gi,
        // everything up to the next whitespace
        end: /[\s\r\n]|$/,
        // trim trailing punctuation captured by end RegExp
        trim: /[`!()\[\]{};:'".,<>?«»“”„‘’]+$/,
        // balanced parens inclusion (), [], {}, <>
        parens: /(\([^\)]*\)|\[[^\]]*\]|\{[^}]*\}|<[^>]*>)/g
      };
      URI.leading_whitespace_expression = /^[\x00-\x20\u00a0\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/;
      URI.ascii_tab_whitespace = /[\u0009\u000A\u000D]+/g;
      URI.defaultPorts = {
        http: "80",
        https: "443",
        ftp: "21",
        gopher: "70",
        ws: "80",
        wss: "443"
      };
      URI.hostProtocols = [
        "http",
        "https"
      ];
      URI.invalid_hostname_characters = /[^a-zA-Z0-9\.\-:_]/;
      URI.domAttributes = {
        "a": "href",
        "blockquote": "cite",
        "link": "href",
        "base": "href",
        "script": "src",
        "form": "action",
        "img": "src",
        "area": "href",
        "iframe": "src",
        "embed": "src",
        "source": "src",
        "track": "src",
        "input": "src",
        // but only if type="image"
        "audio": "src",
        "video": "src"
      };
      URI.getDomAttribute = function(node) {
        if (!node || !node.nodeName) {
          return void 0;
        }
        var nodeName = node.nodeName.toLowerCase();
        if (nodeName === "input" && node.type !== "image") {
          return void 0;
        }
        return URI.domAttributes[nodeName];
      };
      function escapeForDumbFirefox36(value) {
        return escape(value);
      }
      function strictEncodeURIComponent(string) {
        return encodeURIComponent(string).replace(/[!'()*]/g, escapeForDumbFirefox36).replace(/\*/g, "%2A");
      }
      URI.encode = strictEncodeURIComponent;
      URI.decode = decodeURIComponent;
      URI.iso8859 = function() {
        URI.encode = escape;
        URI.decode = unescape;
      };
      URI.unicode = function() {
        URI.encode = strictEncodeURIComponent;
        URI.decode = decodeURIComponent;
      };
      URI.characters = {
        pathname: {
          encode: {
            // RFC3986 2.1: For consistency, URI producers and normalizers should
            // use uppercase hexadecimal digits for all percent-encodings.
            expression: /%(24|26|2B|2C|3B|3D|3A|40)/ig,
            map: {
              // -._~!'()*
              "%24": "$",
              "%26": "&",
              "%2B": "+",
              "%2C": ",",
              "%3B": ";",
              "%3D": "=",
              "%3A": ":",
              "%40": "@"
            }
          },
          decode: {
            expression: /[\/\?#]/g,
            map: {
              "/": "%2F",
              "?": "%3F",
              "#": "%23"
            }
          }
        },
        reserved: {
          encode: {
            // RFC3986 2.1: For consistency, URI producers and normalizers should
            // use uppercase hexadecimal digits for all percent-encodings.
            expression: /%(21|23|24|26|27|28|29|2A|2B|2C|2F|3A|3B|3D|3F|40|5B|5D)/ig,
            map: {
              // gen-delims
              "%3A": ":",
              "%2F": "/",
              "%3F": "?",
              "%23": "#",
              "%5B": "[",
              "%5D": "]",
              "%40": "@",
              // sub-delims
              "%21": "!",
              "%24": "$",
              "%26": "&",
              "%27": "'",
              "%28": "(",
              "%29": ")",
              "%2A": "*",
              "%2B": "+",
              "%2C": ",",
              "%3B": ";",
              "%3D": "="
            }
          }
        },
        urnpath: {
          // The characters under `encode` are the characters called out by RFC 2141 as being acceptable
          // for usage in a URN. RFC2141 also calls out "-", ".", and "_" as acceptable characters, but
          // these aren't encoded by encodeURIComponent, so we don't have to call them out here. Also
          // note that the colon character is not featured in the encoding map; this is because URI.js
          // gives the colons in URNs semantic meaning as the delimiters of path segements, and so it
          // should not appear unencoded in a segment itself.
          // See also the note above about RFC3986 and capitalalized hex digits.
          encode: {
            expression: /%(21|24|27|28|29|2A|2B|2C|3B|3D|40)/ig,
            map: {
              "%21": "!",
              "%24": "$",
              "%27": "'",
              "%28": "(",
              "%29": ")",
              "%2A": "*",
              "%2B": "+",
              "%2C": ",",
              "%3B": ";",
              "%3D": "=",
              "%40": "@"
            }
          },
          // These characters are the characters called out by RFC2141 as "reserved" characters that
          // should never appear in a URN, plus the colon character (see note above).
          decode: {
            expression: /[\/\?#:]/g,
            map: {
              "/": "%2F",
              "?": "%3F",
              "#": "%23",
              ":": "%3A"
            }
          }
        }
      };
      URI.encodeQuery = function(string, escapeQuerySpace) {
        var escaped = URI.encode(string + "");
        if (escapeQuerySpace === void 0) {
          escapeQuerySpace = URI.escapeQuerySpace;
        }
        return escapeQuerySpace ? escaped.replace(/%20/g, "+") : escaped;
      };
      URI.decodeQuery = function(string, escapeQuerySpace) {
        string += "";
        if (escapeQuerySpace === void 0) {
          escapeQuerySpace = URI.escapeQuerySpace;
        }
        try {
          return URI.decode(escapeQuerySpace ? string.replace(/\+/g, "%20") : string);
        } catch (e) {
          return string;
        }
      };
      var _parts = { "encode": "encode", "decode": "decode" };
      var _part;
      var generateAccessor = function(_group, _part2) {
        return function(string) {
          try {
            return URI[_part2](string + "").replace(URI.characters[_group][_part2].expression, function(c) {
              return URI.characters[_group][_part2].map[c];
            });
          } catch (e) {
            return string;
          }
        };
      };
      for (_part in _parts) {
        URI[_part + "PathSegment"] = generateAccessor("pathname", _parts[_part]);
        URI[_part + "UrnPathSegment"] = generateAccessor("urnpath", _parts[_part]);
      }
      var generateSegmentedPathFunction = function(_sep, _codingFuncName, _innerCodingFuncName) {
        return function(string) {
          var actualCodingFunc;
          if (!_innerCodingFuncName) {
            actualCodingFunc = URI[_codingFuncName];
          } else {
            actualCodingFunc = function(string2) {
              return URI[_codingFuncName](URI[_innerCodingFuncName](string2));
            };
          }
          var segments = (string + "").split(_sep);
          for (var i = 0, length = segments.length; i < length; i++) {
            segments[i] = actualCodingFunc(segments[i]);
          }
          return segments.join(_sep);
        };
      };
      URI.decodePath = generateSegmentedPathFunction("/", "decodePathSegment");
      URI.decodeUrnPath = generateSegmentedPathFunction(":", "decodeUrnPathSegment");
      URI.recodePath = generateSegmentedPathFunction("/", "encodePathSegment", "decode");
      URI.recodeUrnPath = generateSegmentedPathFunction(":", "encodeUrnPathSegment", "decode");
      URI.encodeReserved = generateAccessor("reserved", "encode");
      URI.parse = function(string, parts) {
        var pos;
        if (!parts) {
          parts = {
            preventInvalidHostname: URI.preventInvalidHostname
          };
        }
        string = string.replace(URI.leading_whitespace_expression, "");
        string = string.replace(URI.ascii_tab_whitespace, "");
        pos = string.indexOf("#");
        if (pos > -1) {
          parts.fragment = string.substring(pos + 1) || null;
          string = string.substring(0, pos);
        }
        pos = string.indexOf("?");
        if (pos > -1) {
          parts.query = string.substring(pos + 1) || null;
          string = string.substring(0, pos);
        }
        string = string.replace(/^(https?|ftp|wss?)?:+[/\\]*/i, "$1://");
        string = string.replace(/^[/\\]{2,}/i, "//");
        if (string.substring(0, 2) === "//") {
          parts.protocol = null;
          string = string.substring(2);
          string = URI.parseAuthority(string, parts);
        } else {
          pos = string.indexOf(":");
          if (pos > -1) {
            parts.protocol = string.substring(0, pos) || null;
            if (parts.protocol && !parts.protocol.match(URI.protocol_expression)) {
              parts.protocol = void 0;
            } else if (string.substring(pos + 1, pos + 3).replace(/\\/g, "/") === "//") {
              string = string.substring(pos + 3);
              string = URI.parseAuthority(string, parts);
            } else {
              string = string.substring(pos + 1);
              parts.urn = true;
            }
          }
        }
        parts.path = string;
        return parts;
      };
      URI.parseHost = function(string, parts) {
        if (!string) {
          string = "";
        }
        string = string.replace(/\\/g, "/");
        var pos = string.indexOf("/");
        var bracketPos;
        var t;
        if (pos === -1) {
          pos = string.length;
        }
        if (string.charAt(0) === "[") {
          bracketPos = string.indexOf("]");
          parts.hostname = string.substring(1, bracketPos) || null;
          parts.port = string.substring(bracketPos + 2, pos) || null;
          if (parts.port === "/") {
            parts.port = null;
          }
        } else {
          var firstColon = string.indexOf(":");
          var firstSlash = string.indexOf("/");
          var nextColon = string.indexOf(":", firstColon + 1);
          if (nextColon !== -1 && (firstSlash === -1 || nextColon < firstSlash)) {
            parts.hostname = string.substring(0, pos) || null;
            parts.port = null;
          } else {
            t = string.substring(0, pos).split(":");
            parts.hostname = t[0] || null;
            parts.port = t[1] || null;
          }
        }
        if (parts.hostname && string.substring(pos).charAt(0) !== "/") {
          pos++;
          string = "/" + string;
        }
        if (parts.preventInvalidHostname) {
          URI.ensureValidHostname(parts.hostname, parts.protocol);
        }
        if (parts.port) {
          URI.ensureValidPort(parts.port);
        }
        return string.substring(pos) || "/";
      };
      URI.parseAuthority = function(string, parts) {
        string = URI.parseUserinfo(string, parts);
        return URI.parseHost(string, parts);
      };
      URI.parseUserinfo = function(string, parts) {
        var _string = string;
        var firstBackSlash = string.indexOf("\\");
        if (firstBackSlash !== -1) {
          string = string.replace(/\\/g, "/");
        }
        var firstSlash = string.indexOf("/");
        var pos = string.lastIndexOf("@", firstSlash > -1 ? firstSlash : string.length - 1);
        var t;
        if (pos > -1 && (firstSlash === -1 || pos < firstSlash)) {
          t = string.substring(0, pos).split(":");
          parts.username = t[0] ? URI.decode(t[0]) : null;
          t.shift();
          parts.password = t[0] ? URI.decode(t.join(":")) : null;
          string = _string.substring(pos + 1);
        } else {
          parts.username = null;
          parts.password = null;
        }
        return string;
      };
      URI.parseQuery = function(string, escapeQuerySpace) {
        if (!string) {
          return {};
        }
        string = string.replace(/&+/g, "&").replace(/^\?*&*|&+$/g, "");
        if (!string) {
          return {};
        }
        var items = {};
        var splits = string.split("&");
        var length = splits.length;
        var v2, name, value;
        for (var i = 0; i < length; i++) {
          v2 = splits[i].split("=");
          name = URI.decodeQuery(v2.shift(), escapeQuerySpace);
          value = v2.length ? URI.decodeQuery(v2.join("="), escapeQuerySpace) : null;
          if (name === "__proto__") {
            continue;
          } else if (hasOwn.call(items, name)) {
            if (typeof items[name] === "string" || items[name] === null) {
              items[name] = [items[name]];
            }
            items[name].push(value);
          } else {
            items[name] = value;
          }
        }
        return items;
      };
      URI.build = function(parts) {
        var t = "";
        var requireAbsolutePath = false;
        if (parts.protocol) {
          t += parts.protocol + ":";
        }
        if (!parts.urn && (t || parts.hostname)) {
          t += "//";
          requireAbsolutePath = true;
        }
        t += URI.buildAuthority(parts) || "";
        if (typeof parts.path === "string") {
          if (parts.path.charAt(0) !== "/" && requireAbsolutePath) {
            t += "/";
          }
          t += parts.path;
        }
        if (typeof parts.query === "string" && parts.query) {
          t += "?" + parts.query;
        }
        if (typeof parts.fragment === "string" && parts.fragment) {
          t += "#" + parts.fragment;
        }
        return t;
      };
      URI.buildHost = function(parts) {
        var t = "";
        if (!parts.hostname) {
          return "";
        } else if (URI.ip6_expression.test(parts.hostname)) {
          t += "[" + parts.hostname + "]";
        } else {
          t += parts.hostname;
        }
        if (parts.port) {
          t += ":" + parts.port;
        }
        return t;
      };
      URI.buildAuthority = function(parts) {
        return URI.buildUserinfo(parts) + URI.buildHost(parts);
      };
      URI.buildUserinfo = function(parts) {
        var t = "";
        if (parts.username) {
          t += URI.encode(parts.username);
        }
        if (parts.password) {
          t += ":" + URI.encode(parts.password);
        }
        if (t) {
          t += "@";
        }
        return t;
      };
      URI.buildQuery = function(data, duplicateQueryParameters, escapeQuerySpace) {
        var t = "";
        var unique, key, i, length;
        for (key in data) {
          if (key === "__proto__") {
            continue;
          } else if (hasOwn.call(data, key)) {
            if (isArray(data[key])) {
              unique = {};
              for (i = 0, length = data[key].length; i < length; i++) {
                if (data[key][i] !== void 0 && unique[data[key][i] + ""] === void 0) {
                  t += "&" + URI.buildQueryParameter(key, data[key][i], escapeQuerySpace);
                  if (duplicateQueryParameters !== true) {
                    unique[data[key][i] + ""] = true;
                  }
                }
              }
            } else if (data[key] !== void 0) {
              t += "&" + URI.buildQueryParameter(key, data[key], escapeQuerySpace);
            }
          }
        }
        return t.substring(1);
      };
      URI.buildQueryParameter = function(name, value, escapeQuerySpace) {
        return URI.encodeQuery(name, escapeQuerySpace) + (value !== null ? "=" + URI.encodeQuery(value, escapeQuerySpace) : "");
      };
      URI.addQuery = function(data, name, value) {
        if (typeof name === "object") {
          for (var key in name) {
            if (hasOwn.call(name, key)) {
              URI.addQuery(data, key, name[key]);
            }
          }
        } else if (typeof name === "string") {
          if (data[name] === void 0) {
            data[name] = value;
            return;
          } else if (typeof data[name] === "string") {
            data[name] = [data[name]];
          }
          if (!isArray(value)) {
            value = [value];
          }
          data[name] = (data[name] || []).concat(value);
        } else {
          throw new TypeError("URI.addQuery() accepts an object, string as the name parameter");
        }
      };
      URI.setQuery = function(data, name, value) {
        if (typeof name === "object") {
          for (var key in name) {
            if (hasOwn.call(name, key)) {
              URI.setQuery(data, key, name[key]);
            }
          }
        } else if (typeof name === "string") {
          data[name] = value === void 0 ? null : value;
        } else {
          throw new TypeError("URI.setQuery() accepts an object, string as the name parameter");
        }
      };
      URI.removeQuery = function(data, name, value) {
        var i, length, key;
        if (isArray(name)) {
          for (i = 0, length = name.length; i < length; i++) {
            data[name[i]] = void 0;
          }
        } else if (getType(name) === "RegExp") {
          for (key in data) {
            if (name.test(key)) {
              data[key] = void 0;
            }
          }
        } else if (typeof name === "object") {
          for (key in name) {
            if (hasOwn.call(name, key)) {
              URI.removeQuery(data, key, name[key]);
            }
          }
        } else if (typeof name === "string") {
          if (value !== void 0) {
            if (getType(value) === "RegExp") {
              if (!isArray(data[name]) && value.test(data[name])) {
                data[name] = void 0;
              } else {
                data[name] = filterArrayValues(data[name], value);
              }
            } else if (data[name] === String(value) && (!isArray(value) || value.length === 1)) {
              data[name] = void 0;
            } else if (isArray(data[name])) {
              data[name] = filterArrayValues(data[name], value);
            }
          } else {
            data[name] = void 0;
          }
        } else {
          throw new TypeError("URI.removeQuery() accepts an object, string, RegExp as the first parameter");
        }
      };
      URI.hasQuery = function(data, name, value, withinArray) {
        switch (getType(name)) {
          case "String":
            break;
          case "RegExp":
            for (var key in data) {
              if (hasOwn.call(data, key)) {
                if (name.test(key) && (value === void 0 || URI.hasQuery(data, key, value))) {
                  return true;
                }
              }
            }
            return false;
          case "Object":
            for (var _key in name) {
              if (hasOwn.call(name, _key)) {
                if (!URI.hasQuery(data, _key, name[_key])) {
                  return false;
                }
              }
            }
            return true;
          default:
            throw new TypeError("URI.hasQuery() accepts a string, regular expression or object as the name parameter");
        }
        switch (getType(value)) {
          case "Undefined":
            return name in data;
          case "Boolean":
            var _booly = Boolean(isArray(data[name]) ? data[name].length : data[name]);
            return value === _booly;
          case "Function":
            return !!value(data[name], name, data);
          case "Array":
            if (!isArray(data[name])) {
              return false;
            }
            var op = withinArray ? arrayContains : arraysEqual;
            return op(data[name], value);
          case "RegExp":
            if (!isArray(data[name])) {
              return Boolean(data[name] && data[name].match(value));
            }
            if (!withinArray) {
              return false;
            }
            return arrayContains(data[name], value);
          case "Number":
            value = String(value);
          case "String":
            if (!isArray(data[name])) {
              return data[name] === value;
            }
            if (!withinArray) {
              return false;
            }
            return arrayContains(data[name], value);
          default:
            throw new TypeError("URI.hasQuery() accepts undefined, boolean, string, number, RegExp, Function as the value parameter");
        }
      };
      URI.joinPaths = function() {
        var input = [];
        var segments = [];
        var nonEmptySegments = 0;
        for (var i = 0; i < arguments.length; i++) {
          var url = new URI(arguments[i]);
          input.push(url);
          var _segments = url.segment();
          for (var s = 0; s < _segments.length; s++) {
            if (typeof _segments[s] === "string") {
              segments.push(_segments[s]);
            }
            if (_segments[s]) {
              nonEmptySegments++;
            }
          }
        }
        if (!segments.length || !nonEmptySegments) {
          return new URI("");
        }
        var uri = new URI("").segment(segments);
        if (input[0].path() === "" || input[0].path().slice(0, 1) === "/") {
          uri.path("/" + uri.path());
        }
        return uri.normalize();
      };
      URI.commonPath = function(one, two) {
        var length = Math.min(one.length, two.length);
        var pos;
        for (pos = 0; pos < length; pos++) {
          if (one.charAt(pos) !== two.charAt(pos)) {
            pos--;
            break;
          }
        }
        if (pos < 1) {
          return one.charAt(0) === two.charAt(0) && one.charAt(0) === "/" ? "/" : "";
        }
        if (one.charAt(pos) !== "/" || two.charAt(pos) !== "/") {
          pos = one.substring(0, pos).lastIndexOf("/");
        }
        return one.substring(0, pos + 1);
      };
      URI.withinString = function(string, callback, options) {
        options || (options = {});
        var _start = options.start || URI.findUri.start;
        var _end = options.end || URI.findUri.end;
        var _trim = options.trim || URI.findUri.trim;
        var _parens = options.parens || URI.findUri.parens;
        var _attributeOpen = /[a-z0-9-]=["']?$/i;
        _start.lastIndex = 0;
        while (true) {
          var match = _start.exec(string);
          if (!match) {
            break;
          }
          var start = match.index;
          if (options.ignoreHtml) {
            var attributeOpen = string.slice(Math.max(start - 3, 0), start);
            if (attributeOpen && _attributeOpen.test(attributeOpen)) {
              continue;
            }
          }
          var end = start + string.slice(start).search(_end);
          var slice = string.slice(start, end);
          var parensEnd = -1;
          while (true) {
            var parensMatch = _parens.exec(slice);
            if (!parensMatch) {
              break;
            }
            var parensMatchEnd = parensMatch.index + parensMatch[0].length;
            parensEnd = Math.max(parensEnd, parensMatchEnd);
          }
          if (parensEnd > -1) {
            slice = slice.slice(0, parensEnd) + slice.slice(parensEnd).replace(_trim, "");
          } else {
            slice = slice.replace(_trim, "");
          }
          if (slice.length <= match[0].length) {
            continue;
          }
          if (options.ignore && options.ignore.test(slice)) {
            continue;
          }
          end = start + slice.length;
          var result = callback(slice, start, end, string);
          if (result === void 0) {
            _start.lastIndex = end;
            continue;
          }
          result = String(result);
          string = string.slice(0, start) + result + string.slice(end);
          _start.lastIndex = start + result.length;
        }
        _start.lastIndex = 0;
        return string;
      };
      URI.ensureValidHostname = function(v2, protocol) {
        var hasHostname = !!v2;
        var hasProtocol = !!protocol;
        var rejectEmptyHostname = false;
        if (hasProtocol) {
          rejectEmptyHostname = arrayContains(URI.hostProtocols, protocol);
        }
        if (rejectEmptyHostname && !hasHostname) {
          throw new TypeError("Hostname cannot be empty, if protocol is " + protocol);
        } else if (v2 && v2.match(URI.invalid_hostname_characters)) {
          if (!punycode) {
            throw new TypeError('Hostname "' + v2 + '" contains characters other than [A-Z0-9.-:_] and Punycode.js is not available');
          }
          if (punycode.toASCII(v2).match(URI.invalid_hostname_characters)) {
            throw new TypeError('Hostname "' + v2 + '" contains characters other than [A-Z0-9.-:_]');
          }
        }
      };
      URI.ensureValidPort = function(v2) {
        if (!v2) {
          return;
        }
        var port = Number(v2);
        if (isInteger(port) && port > 0 && port < 65536) {
          return;
        }
        throw new TypeError('Port "' + v2 + '" is not a valid port');
      };
      URI.noConflict = function(removeAll) {
        if (removeAll) {
          var unconflicted = {
            URI: this.noConflict()
          };
          if (root.URITemplate && typeof root.URITemplate.noConflict === "function") {
            unconflicted.URITemplate = root.URITemplate.noConflict();
          }
          if (root.IPv6 && typeof root.IPv6.noConflict === "function") {
            unconflicted.IPv6 = root.IPv6.noConflict();
          }
          if (root.SecondLevelDomains && typeof root.SecondLevelDomains.noConflict === "function") {
            unconflicted.SecondLevelDomains = root.SecondLevelDomains.noConflict();
          }
          return unconflicted;
        } else if (root.URI === this) {
          root.URI = _URI;
        }
        return this;
      };
      p.build = function(deferBuild) {
        if (deferBuild === true) {
          this._deferred_build = true;
        } else if (deferBuild === void 0 || this._deferred_build) {
          this._string = URI.build(this._parts);
          this._deferred_build = false;
        }
        return this;
      };
      p.clone = function() {
        return new URI(this);
      };
      p.valueOf = p.toString = function() {
        return this.build(false)._string;
      };
      function generateSimpleAccessor(_part2) {
        return function(v2, build) {
          if (v2 === void 0) {
            return this._parts[_part2] || "";
          } else {
            this._parts[_part2] = v2 || null;
            this.build(!build);
            return this;
          }
        };
      }
      function generatePrefixAccessor(_part2, _key) {
        return function(v2, build) {
          if (v2 === void 0) {
            return this._parts[_part2] || "";
          } else {
            if (v2 !== null) {
              v2 = v2 + "";
              if (v2.charAt(0) === _key) {
                v2 = v2.substring(1);
              }
            }
            this._parts[_part2] = v2;
            this.build(!build);
            return this;
          }
        };
      }
      p.protocol = generateSimpleAccessor("protocol");
      p.username = generateSimpleAccessor("username");
      p.password = generateSimpleAccessor("password");
      p.hostname = generateSimpleAccessor("hostname");
      p.port = generateSimpleAccessor("port");
      p.query = generatePrefixAccessor("query", "?");
      p.fragment = generatePrefixAccessor("fragment", "#");
      p.search = function(v2, build) {
        var t = this.query(v2, build);
        return typeof t === "string" && t.length ? "?" + t : t;
      };
      p.hash = function(v2, build) {
        var t = this.fragment(v2, build);
        return typeof t === "string" && t.length ? "#" + t : t;
      };
      p.pathname = function(v2, build) {
        if (v2 === void 0 || v2 === true) {
          var res = this._parts.path || (this._parts.hostname ? "/" : "");
          return v2 ? (this._parts.urn ? URI.decodeUrnPath : URI.decodePath)(res) : res;
        } else {
          if (this._parts.urn) {
            this._parts.path = v2 ? URI.recodeUrnPath(v2) : "";
          } else {
            this._parts.path = v2 ? URI.recodePath(v2) : "/";
          }
          this.build(!build);
          return this;
        }
      };
      p.path = p.pathname;
      p.href = function(href, build) {
        var key;
        if (href === void 0) {
          return this.toString();
        }
        this._string = "";
        this._parts = URI._parts();
        var _URI2 = href instanceof URI;
        var _object = typeof href === "object" && (href.hostname || href.path || href.pathname);
        if (href.nodeName) {
          var attribute = URI.getDomAttribute(href);
          href = href[attribute] || "";
          _object = false;
        }
        if (!_URI2 && _object && href.pathname !== void 0) {
          href = href.toString();
        }
        if (typeof href === "string" || href instanceof String) {
          this._parts = URI.parse(String(href), this._parts);
        } else if (_URI2 || _object) {
          var src = _URI2 ? href._parts : href;
          for (key in src) {
            if (key === "query") {
              continue;
            }
            if (hasOwn.call(this._parts, key)) {
              this._parts[key] = src[key];
            }
          }
          if (src.query) {
            this.query(src.query, false);
          }
        } else {
          throw new TypeError("invalid input");
        }
        this.build(!build);
        return this;
      };
      p.is = function(what) {
        var ip = false;
        var ip4 = false;
        var ip6 = false;
        var name = false;
        var sld = false;
        var idn = false;
        var punycode2 = false;
        var relative = !this._parts.urn;
        if (this._parts.hostname) {
          relative = false;
          ip4 = URI.ip4_expression.test(this._parts.hostname);
          ip6 = URI.ip6_expression.test(this._parts.hostname);
          ip = ip4 || ip6;
          name = !ip;
          sld = name && SLD && SLD.has(this._parts.hostname);
          idn = name && URI.idn_expression.test(this._parts.hostname);
          punycode2 = name && URI.punycode_expression.test(this._parts.hostname);
        }
        switch (what.toLowerCase()) {
          case "relative":
            return relative;
          case "absolute":
            return !relative;
          case "domain":
          case "name":
            return name;
          case "sld":
            return sld;
          case "ip":
            return ip;
          case "ip4":
          case "ipv4":
          case "inet4":
            return ip4;
          case "ip6":
          case "ipv6":
          case "inet6":
            return ip6;
          case "idn":
            return idn;
          case "url":
            return !this._parts.urn;
          case "urn":
            return !!this._parts.urn;
          case "punycode":
            return punycode2;
        }
        return null;
      };
      var _protocol = p.protocol;
      var _port = p.port;
      var _hostname = p.hostname;
      p.protocol = function(v2, build) {
        if (v2) {
          v2 = v2.replace(/:(\/\/)?$/, "");
          if (!v2.match(URI.protocol_expression)) {
            throw new TypeError('Protocol "' + v2 + `" contains characters other than [A-Z0-9.+-] or doesn't start with [A-Z]`);
          }
        }
        return _protocol.call(this, v2, build);
      };
      p.scheme = p.protocol;
      p.port = function(v2, build) {
        if (this._parts.urn) {
          return v2 === void 0 ? "" : this;
        }
        if (v2 !== void 0) {
          if (v2 === 0) {
            v2 = null;
          }
          if (v2) {
            v2 += "";
            if (v2.charAt(0) === ":") {
              v2 = v2.substring(1);
            }
            URI.ensureValidPort(v2);
          }
        }
        return _port.call(this, v2, build);
      };
      p.hostname = function(v2, build) {
        if (this._parts.urn) {
          return v2 === void 0 ? "" : this;
        }
        if (v2 !== void 0) {
          var x = { preventInvalidHostname: this._parts.preventInvalidHostname };
          var res = URI.parseHost(v2, x);
          if (res !== "/") {
            throw new TypeError('Hostname "' + v2 + '" contains characters other than [A-Z0-9.-]');
          }
          v2 = x.hostname;
          if (this._parts.preventInvalidHostname) {
            URI.ensureValidHostname(v2, this._parts.protocol);
          }
        }
        return _hostname.call(this, v2, build);
      };
      p.origin = function(v2, build) {
        if (this._parts.urn) {
          return v2 === void 0 ? "" : this;
        }
        if (v2 === void 0) {
          var protocol = this.protocol();
          var authority = this.authority();
          if (!authority) {
            return "";
          }
          return (protocol ? protocol + "://" : "") + this.authority();
        } else {
          var origin = URI(v2);
          this.protocol(origin.protocol()).authority(origin.authority()).build(!build);
          return this;
        }
      };
      p.host = function(v2, build) {
        if (this._parts.urn) {
          return v2 === void 0 ? "" : this;
        }
        if (v2 === void 0) {
          return this._parts.hostname ? URI.buildHost(this._parts) : "";
        } else {
          var res = URI.parseHost(v2, this._parts);
          if (res !== "/") {
            throw new TypeError('Hostname "' + v2 + '" contains characters other than [A-Z0-9.-]');
          }
          this.build(!build);
          return this;
        }
      };
      p.authority = function(v2, build) {
        if (this._parts.urn) {
          return v2 === void 0 ? "" : this;
        }
        if (v2 === void 0) {
          return this._parts.hostname ? URI.buildAuthority(this._parts) : "";
        } else {
          var res = URI.parseAuthority(v2, this._parts);
          if (res !== "/") {
            throw new TypeError('Hostname "' + v2 + '" contains characters other than [A-Z0-9.-]');
          }
          this.build(!build);
          return this;
        }
      };
      p.userinfo = function(v2, build) {
        if (this._parts.urn) {
          return v2 === void 0 ? "" : this;
        }
        if (v2 === void 0) {
          var t = URI.buildUserinfo(this._parts);
          return t ? t.substring(0, t.length - 1) : t;
        } else {
          if (v2[v2.length - 1] !== "@") {
            v2 += "@";
          }
          URI.parseUserinfo(v2, this._parts);
          this.build(!build);
          return this;
        }
      };
      p.resource = function(v2, build) {
        var parts;
        if (v2 === void 0) {
          return this.path() + this.search() + this.hash();
        }
        parts = URI.parse(v2);
        this._parts.path = parts.path;
        this._parts.query = parts.query;
        this._parts.fragment = parts.fragment;
        this.build(!build);
        return this;
      };
      p.subdomain = function(v2, build) {
        if (this._parts.urn) {
          return v2 === void 0 ? "" : this;
        }
        if (v2 === void 0) {
          if (!this._parts.hostname || this.is("IP")) {
            return "";
          }
          var end = this._parts.hostname.length - this.domain().length - 1;
          return this._parts.hostname.substring(0, end) || "";
        } else {
          var e = this._parts.hostname.length - this.domain().length;
          var sub = this._parts.hostname.substring(0, e);
          var replace = new RegExp("^" + escapeRegEx(sub));
          if (v2 && v2.charAt(v2.length - 1) !== ".") {
            v2 += ".";
          }
          if (v2.indexOf(":") !== -1) {
            throw new TypeError("Domains cannot contain colons");
          }
          if (v2) {
            URI.ensureValidHostname(v2, this._parts.protocol);
          }
          this._parts.hostname = this._parts.hostname.replace(replace, v2);
          this.build(!build);
          return this;
        }
      };
      p.domain = function(v2, build) {
        if (this._parts.urn) {
          return v2 === void 0 ? "" : this;
        }
        if (typeof v2 === "boolean") {
          build = v2;
          v2 = void 0;
        }
        if (v2 === void 0) {
          if (!this._parts.hostname || this.is("IP")) {
            return "";
          }
          var t = this._parts.hostname.match(/\./g);
          if (t && t.length < 2) {
            return this._parts.hostname;
          }
          var end = this._parts.hostname.length - this.tld(build).length - 1;
          end = this._parts.hostname.lastIndexOf(".", end - 1) + 1;
          return this._parts.hostname.substring(end) || "";
        } else {
          if (!v2) {
            throw new TypeError("cannot set domain empty");
          }
          if (v2.indexOf(":") !== -1) {
            throw new TypeError("Domains cannot contain colons");
          }
          URI.ensureValidHostname(v2, this._parts.protocol);
          if (!this._parts.hostname || this.is("IP")) {
            this._parts.hostname = v2;
          } else {
            var replace = new RegExp(escapeRegEx(this.domain()) + "$");
            this._parts.hostname = this._parts.hostname.replace(replace, v2);
          }
          this.build(!build);
          return this;
        }
      };
      p.tld = function(v2, build) {
        if (this._parts.urn) {
          return v2 === void 0 ? "" : this;
        }
        if (typeof v2 === "boolean") {
          build = v2;
          v2 = void 0;
        }
        if (v2 === void 0) {
          if (!this._parts.hostname || this.is("IP")) {
            return "";
          }
          var pos = this._parts.hostname.lastIndexOf(".");
          var tld = this._parts.hostname.substring(pos + 1);
          if (build !== true && SLD && SLD.list[tld.toLowerCase()]) {
            return SLD.get(this._parts.hostname) || tld;
          }
          return tld;
        } else {
          var replace;
          if (!v2) {
            throw new TypeError("cannot set TLD empty");
          } else if (v2.match(/[^a-zA-Z0-9-]/)) {
            if (SLD && SLD.is(v2)) {
              replace = new RegExp(escapeRegEx(this.tld()) + "$");
              this._parts.hostname = this._parts.hostname.replace(replace, v2);
            } else {
              throw new TypeError('TLD "' + v2 + '" contains characters other than [A-Z0-9]');
            }
          } else if (!this._parts.hostname || this.is("IP")) {
            throw new ReferenceError("cannot set TLD on non-domain host");
          } else {
            replace = new RegExp(escapeRegEx(this.tld()) + "$");
            this._parts.hostname = this._parts.hostname.replace(replace, v2);
          }
          this.build(!build);
          return this;
        }
      };
      p.directory = function(v2, build) {
        if (this._parts.urn) {
          return v2 === void 0 ? "" : this;
        }
        if (v2 === void 0 || v2 === true) {
          if (!this._parts.path && !this._parts.hostname) {
            return "";
          }
          if (this._parts.path === "/") {
            return "/";
          }
          var end = this._parts.path.length - this.filename().length - 1;
          var res = this._parts.path.substring(0, end) || (this._parts.hostname ? "/" : "");
          return v2 ? URI.decodePath(res) : res;
        } else {
          var e = this._parts.path.length - this.filename().length;
          var directory = this._parts.path.substring(0, e);
          var replace = new RegExp("^" + escapeRegEx(directory));
          if (!this.is("relative")) {
            if (!v2) {
              v2 = "/";
            }
            if (v2.charAt(0) !== "/") {
              v2 = "/" + v2;
            }
          }
          if (v2 && v2.charAt(v2.length - 1) !== "/") {
            v2 += "/";
          }
          v2 = URI.recodePath(v2);
          this._parts.path = this._parts.path.replace(replace, v2);
          this.build(!build);
          return this;
        }
      };
      p.filename = function(v2, build) {
        if (this._parts.urn) {
          return v2 === void 0 ? "" : this;
        }
        if (typeof v2 !== "string") {
          if (!this._parts.path || this._parts.path === "/") {
            return "";
          }
          var pos = this._parts.path.lastIndexOf("/");
          var res = this._parts.path.substring(pos + 1);
          return v2 ? URI.decodePathSegment(res) : res;
        } else {
          var mutatedDirectory = false;
          if (v2.charAt(0) === "/") {
            v2 = v2.substring(1);
          }
          if (v2.match(/\.?\//)) {
            mutatedDirectory = true;
          }
          var replace = new RegExp(escapeRegEx(this.filename()) + "$");
          v2 = URI.recodePath(v2);
          this._parts.path = this._parts.path.replace(replace, v2);
          if (mutatedDirectory) {
            this.normalizePath(build);
          } else {
            this.build(!build);
          }
          return this;
        }
      };
      p.suffix = function(v2, build) {
        if (this._parts.urn) {
          return v2 === void 0 ? "" : this;
        }
        if (v2 === void 0 || v2 === true) {
          if (!this._parts.path || this._parts.path === "/") {
            return "";
          }
          var filename = this.filename();
          var pos = filename.lastIndexOf(".");
          var s, res;
          if (pos === -1) {
            return "";
          }
          s = filename.substring(pos + 1);
          res = /^[a-z0-9%]+$/i.test(s) ? s : "";
          return v2 ? URI.decodePathSegment(res) : res;
        } else {
          if (v2.charAt(0) === ".") {
            v2 = v2.substring(1);
          }
          var suffix = this.suffix();
          var replace;
          if (!suffix) {
            if (!v2) {
              return this;
            }
            this._parts.path += "." + URI.recodePath(v2);
          } else if (!v2) {
            replace = new RegExp(escapeRegEx("." + suffix) + "$");
          } else {
            replace = new RegExp(escapeRegEx(suffix) + "$");
          }
          if (replace) {
            v2 = URI.recodePath(v2);
            this._parts.path = this._parts.path.replace(replace, v2);
          }
          this.build(!build);
          return this;
        }
      };
      p.segment = function(segment, v2, build) {
        var separator = this._parts.urn ? ":" : "/";
        var path = this.path();
        var absolute = path.substring(0, 1) === "/";
        var segments = path.split(separator);
        if (segment !== void 0 && typeof segment !== "number") {
          build = v2;
          v2 = segment;
          segment = void 0;
        }
        if (segment !== void 0 && typeof segment !== "number") {
          throw new Error('Bad segment "' + segment + '", must be 0-based integer');
        }
        if (absolute) {
          segments.shift();
        }
        if (segment < 0) {
          segment = Math.max(segments.length + segment, 0);
        }
        if (v2 === void 0) {
          return segment === void 0 ? segments : segments[segment];
        } else if (segment === null || segments[segment] === void 0) {
          if (isArray(v2)) {
            segments = [];
            for (var i = 0, l = v2.length; i < l; i++) {
              if (!v2[i].length && (!segments.length || !segments[segments.length - 1].length)) {
                continue;
              }
              if (segments.length && !segments[segments.length - 1].length) {
                segments.pop();
              }
              segments.push(trimSlashes(v2[i]));
            }
          } else if (v2 || typeof v2 === "string") {
            v2 = trimSlashes(v2);
            if (segments[segments.length - 1] === "") {
              segments[segments.length - 1] = v2;
            } else {
              segments.push(v2);
            }
          }
        } else {
          if (v2) {
            segments[segment] = trimSlashes(v2);
          } else {
            segments.splice(segment, 1);
          }
        }
        if (absolute) {
          segments.unshift("");
        }
        return this.path(segments.join(separator), build);
      };
      p.segmentCoded = function(segment, v2, build) {
        var segments, i, l;
        if (typeof segment !== "number") {
          build = v2;
          v2 = segment;
          segment = void 0;
        }
        if (v2 === void 0) {
          segments = this.segment(segment, v2, build);
          if (!isArray(segments)) {
            segments = segments !== void 0 ? URI.decode(segments) : void 0;
          } else {
            for (i = 0, l = segments.length; i < l; i++) {
              segments[i] = URI.decode(segments[i]);
            }
          }
          return segments;
        }
        if (!isArray(v2)) {
          v2 = typeof v2 === "string" || v2 instanceof String ? URI.encode(v2) : v2;
        } else {
          for (i = 0, l = v2.length; i < l; i++) {
            v2[i] = URI.encode(v2[i]);
          }
        }
        return this.segment(segment, v2, build);
      };
      var q = p.query;
      p.query = function(v2, build) {
        if (v2 === true) {
          return URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
        } else if (typeof v2 === "function") {
          var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
          var result = v2.call(this, data);
          this._parts.query = URI.buildQuery(result || data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
          this.build(!build);
          return this;
        } else if (v2 !== void 0 && typeof v2 !== "string") {
          this._parts.query = URI.buildQuery(v2, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
          this.build(!build);
          return this;
        } else {
          return q.call(this, v2, build);
        }
      };
      p.setQuery = function(name, value, build) {
        var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
        if (typeof name === "string" || name instanceof String) {
          data[name] = value !== void 0 ? value : null;
        } else if (typeof name === "object") {
          for (var key in name) {
            if (hasOwn.call(name, key)) {
              data[key] = name[key];
            }
          }
        } else {
          throw new TypeError("URI.addQuery() accepts an object, string as the name parameter");
        }
        this._parts.query = URI.buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
        if (typeof name !== "string") {
          build = value;
        }
        this.build(!build);
        return this;
      };
      p.addQuery = function(name, value, build) {
        var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
        URI.addQuery(data, name, value === void 0 ? null : value);
        this._parts.query = URI.buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
        if (typeof name !== "string") {
          build = value;
        }
        this.build(!build);
        return this;
      };
      p.removeQuery = function(name, value, build) {
        var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
        URI.removeQuery(data, name, value);
        this._parts.query = URI.buildQuery(data, this._parts.duplicateQueryParameters, this._parts.escapeQuerySpace);
        if (typeof name !== "string") {
          build = value;
        }
        this.build(!build);
        return this;
      };
      p.hasQuery = function(name, value, withinArray) {
        var data = URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace);
        return URI.hasQuery(data, name, value, withinArray);
      };
      p.setSearch = p.setQuery;
      p.addSearch = p.addQuery;
      p.removeSearch = p.removeQuery;
      p.hasSearch = p.hasQuery;
      p.normalize = function() {
        if (this._parts.urn) {
          return this.normalizeProtocol(false).normalizePath(false).normalizeQuery(false).normalizeFragment(false).build();
        }
        return this.normalizeProtocol(false).normalizeHostname(false).normalizePort(false).normalizePath(false).normalizeQuery(false).normalizeFragment(false).build();
      };
      p.normalizeProtocol = function(build) {
        if (typeof this._parts.protocol === "string") {
          this._parts.protocol = this._parts.protocol.toLowerCase();
          this.build(!build);
        }
        return this;
      };
      p.normalizeHostname = function(build) {
        if (this._parts.hostname) {
          if (this.is("IDN") && punycode) {
            this._parts.hostname = punycode.toASCII(this._parts.hostname);
          } else if (this.is("IPv6") && IPv6) {
            this._parts.hostname = IPv6.best(this._parts.hostname);
          }
          this._parts.hostname = this._parts.hostname.toLowerCase();
          this.build(!build);
        }
        return this;
      };
      p.normalizePort = function(build) {
        if (typeof this._parts.protocol === "string" && this._parts.port === URI.defaultPorts[this._parts.protocol]) {
          this._parts.port = null;
          this.build(!build);
        }
        return this;
      };
      p.normalizePath = function(build) {
        var _path = this._parts.path;
        if (!_path) {
          return this;
        }
        if (this._parts.urn) {
          this._parts.path = URI.recodeUrnPath(this._parts.path);
          this.build(!build);
          return this;
        }
        if (this._parts.path === "/") {
          return this;
        }
        _path = URI.recodePath(_path);
        var _was_relative;
        var _leadingParents = "";
        var _parent, _pos;
        if (_path.charAt(0) !== "/") {
          _was_relative = true;
          _path = "/" + _path;
        }
        if (_path.slice(-3) === "/.." || _path.slice(-2) === "/.") {
          _path += "/";
        }
        _path = _path.replace(/(\/(\.\/)+)|(\/\.$)/g, "/").replace(/\/{2,}/g, "/");
        if (_was_relative) {
          _leadingParents = _path.substring(1).match(/^(\.\.\/)+/) || "";
          if (_leadingParents) {
            _leadingParents = _leadingParents[0];
          }
        }
        while (true) {
          _parent = _path.search(/\/\.\.(\/|$)/);
          if (_parent === -1) {
            break;
          } else if (_parent === 0) {
            _path = _path.substring(3);
            continue;
          }
          _pos = _path.substring(0, _parent).lastIndexOf("/");
          if (_pos === -1) {
            _pos = _parent;
          }
          _path = _path.substring(0, _pos) + _path.substring(_parent + 3);
        }
        if (_was_relative && this.is("relative")) {
          _path = _leadingParents + _path.substring(1);
        }
        this._parts.path = _path;
        this.build(!build);
        return this;
      };
      p.normalizePathname = p.normalizePath;
      p.normalizeQuery = function(build) {
        if (typeof this._parts.query === "string") {
          if (!this._parts.query.length) {
            this._parts.query = null;
          } else {
            this.query(URI.parseQuery(this._parts.query, this._parts.escapeQuerySpace));
          }
          this.build(!build);
        }
        return this;
      };
      p.normalizeFragment = function(build) {
        if (!this._parts.fragment) {
          this._parts.fragment = null;
          this.build(!build);
        }
        return this;
      };
      p.normalizeSearch = p.normalizeQuery;
      p.normalizeHash = p.normalizeFragment;
      p.iso8859 = function() {
        var e = URI.encode;
        var d = URI.decode;
        URI.encode = escape;
        URI.decode = decodeURIComponent;
        try {
          this.normalize();
        } finally {
          URI.encode = e;
          URI.decode = d;
        }
        return this;
      };
      p.unicode = function() {
        var e = URI.encode;
        var d = URI.decode;
        URI.encode = strictEncodeURIComponent;
        URI.decode = unescape;
        try {
          this.normalize();
        } finally {
          URI.encode = e;
          URI.decode = d;
        }
        return this;
      };
      p.readable = function() {
        var uri = this.clone();
        uri.username("").password("").normalize();
        var t = "";
        if (uri._parts.protocol) {
          t += uri._parts.protocol + "://";
        }
        if (uri._parts.hostname) {
          if (uri.is("punycode") && punycode) {
            t += punycode.toUnicode(uri._parts.hostname);
            if (uri._parts.port) {
              t += ":" + uri._parts.port;
            }
          } else {
            t += uri.host();
          }
        }
        if (uri._parts.hostname && uri._parts.path && uri._parts.path.charAt(0) !== "/") {
          t += "/";
        }
        t += uri.path(true);
        if (uri._parts.query) {
          var q2 = "";
          for (var i = 0, qp = uri._parts.query.split("&"), l = qp.length; i < l; i++) {
            var kv = (qp[i] || "").split("=");
            q2 += "&" + URI.decodeQuery(kv[0], this._parts.escapeQuerySpace).replace(/&/g, "%26");
            if (kv[1] !== void 0) {
              q2 += "=" + URI.decodeQuery(kv[1], this._parts.escapeQuerySpace).replace(/&/g, "%26");
            }
          }
          t += "?" + q2.substring(1);
        }
        t += URI.decodeQuery(uri.hash(), true);
        return t;
      };
      p.absoluteTo = function(base) {
        var resolved = this.clone();
        var properties = ["protocol", "username", "password", "hostname", "port"];
        var basedir, i, p2;
        if (this._parts.urn) {
          throw new Error("URNs do not have any generally defined hierarchical components");
        }
        if (!(base instanceof URI)) {
          base = new URI(base);
        }
        if (resolved._parts.protocol) {
          return resolved;
        } else {
          resolved._parts.protocol = base._parts.protocol;
        }
        if (this._parts.hostname) {
          return resolved;
        }
        for (i = 0; p2 = properties[i]; i++) {
          resolved._parts[p2] = base._parts[p2];
        }
        if (!resolved._parts.path) {
          resolved._parts.path = base._parts.path;
          if (!resolved._parts.query) {
            resolved._parts.query = base._parts.query;
          }
        } else {
          if (resolved._parts.path.substring(-2) === "..") {
            resolved._parts.path += "/";
          }
          if (resolved.path().charAt(0) !== "/") {
            basedir = base.directory();
            basedir = basedir ? basedir : base.path().indexOf("/") === 0 ? "/" : "";
            resolved._parts.path = (basedir ? basedir + "/" : "") + resolved._parts.path;
            resolved.normalizePath();
          }
        }
        resolved.build();
        return resolved;
      };
      p.relativeTo = function(base) {
        var relative = this.clone().normalize();
        var relativeParts, baseParts, common, relativePath, basePath;
        if (relative._parts.urn) {
          throw new Error("URNs do not have any generally defined hierarchical components");
        }
        base = new URI(base).normalize();
        relativeParts = relative._parts;
        baseParts = base._parts;
        relativePath = relative.path();
        basePath = base.path();
        if (relativePath.charAt(0) !== "/") {
          throw new Error("URI is already relative");
        }
        if (basePath.charAt(0) !== "/") {
          throw new Error("Cannot calculate a URI relative to another relative URI");
        }
        if (relativeParts.protocol === baseParts.protocol) {
          relativeParts.protocol = null;
        }
        if (relativeParts.username !== baseParts.username || relativeParts.password !== baseParts.password) {
          return relative.build();
        }
        if (relativeParts.protocol !== null || relativeParts.username !== null || relativeParts.password !== null) {
          return relative.build();
        }
        if (relativeParts.hostname === baseParts.hostname && relativeParts.port === baseParts.port) {
          relativeParts.hostname = null;
          relativeParts.port = null;
        } else {
          return relative.build();
        }
        if (relativePath === basePath) {
          relativeParts.path = "";
          return relative.build();
        }
        common = URI.commonPath(relativePath, basePath);
        if (!common) {
          return relative.build();
        }
        var parents = baseParts.path.substring(common.length).replace(/[^\/]*$/, "").replace(/.*?\//g, "../");
        relativeParts.path = parents + relativeParts.path.substring(common.length) || "./";
        return relative.build();
      };
      p.equals = function(uri) {
        var one = this.clone();
        var two = new URI(uri);
        var one_map = {};
        var two_map = {};
        var checked = {};
        var one_query, two_query, key;
        one.normalize();
        two.normalize();
        if (one.toString() === two.toString()) {
          return true;
        }
        one_query = one.query();
        two_query = two.query();
        one.query("");
        two.query("");
        if (one.toString() !== two.toString()) {
          return false;
        }
        if (one_query.length !== two_query.length) {
          return false;
        }
        one_map = URI.parseQuery(one_query, this._parts.escapeQuerySpace);
        two_map = URI.parseQuery(two_query, this._parts.escapeQuerySpace);
        for (key in one_map) {
          if (hasOwn.call(one_map, key)) {
            if (!isArray(one_map[key])) {
              if (one_map[key] !== two_map[key]) {
                return false;
              }
            } else if (!arraysEqual(one_map[key], two_map[key])) {
              return false;
            }
            checked[key] = true;
          }
        }
        for (key in two_map) {
          if (hasOwn.call(two_map, key)) {
            if (!checked[key]) {
              return false;
            }
          }
        }
        return true;
      };
      p.preventInvalidHostname = function(v2) {
        this._parts.preventInvalidHostname = !!v2;
        return this;
      };
      p.duplicateQueryParameters = function(v2) {
        this._parts.duplicateQueryParameters = !!v2;
        return this;
      };
      p.escapeQuerySpace = function(v2) {
        this._parts.escapeQuerySpace = !!v2;
        return this;
      };
      return URI;
    });
  }
});

// packages/engine/Source/Core/GeographicProjection.js
function GeographicProjection(ellipsoid) {
  this._ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84);
  this._semimajorAxis = this._ellipsoid.maximumRadius;
  this._oneOverSemimajorAxis = 1 / this._semimajorAxis;
}
Object.defineProperties(GeographicProjection.prototype, {
  /**
   * Gets the {@link Ellipsoid}.
   *
   * @memberof GeographicProjection.prototype
   *
   * @type {Ellipsoid}
   * @readonly
   */
  ellipsoid: {
    get: function() {
      return this._ellipsoid;
    }
  }
});
GeographicProjection.prototype.project = function(cartographic, result) {
  const semimajorAxis = this._semimajorAxis;
  const x = cartographic.longitude * semimajorAxis;
  const y = cartographic.latitude * semimajorAxis;
  const z = cartographic.height;
  if (!defined_default(result)) {
    return new Cartesian3_default(x, y, z);
  }
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
GeographicProjection.prototype.unproject = function(cartesian, result) {
  if (!defined_default(cartesian)) {
    throw new DeveloperError_default("cartesian is required");
  }
  const oneOverEarthSemimajorAxis = this._oneOverSemimajorAxis;
  const longitude = cartesian.x * oneOverEarthSemimajorAxis;
  const latitude = cartesian.y * oneOverEarthSemimajorAxis;
  const height = cartesian.z;
  if (!defined_default(result)) {
    return new Cartographic_default(longitude, latitude, height);
  }
  result.longitude = longitude;
  result.latitude = latitude;
  result.height = height;
  return result;
};
var GeographicProjection_default = GeographicProjection;

// packages/engine/Source/Core/Intersect.js
var Intersect = {
  /**
   * Represents that an object is not contained within the frustum.
   *
   * @type {number}
   * @constant
   */
  OUTSIDE: -1,
  /**
   * Represents that an object intersects one of the frustum's planes.
   *
   * @type {number}
   * @constant
   */
  INTERSECTING: 0,
  /**
   * Represents that an object is fully within the frustum.
   *
   * @type {number}
   * @constant
   */
  INSIDE: 1
};
var Intersect_default = Object.freeze(Intersect);

// packages/engine/Source/Core/Interval.js
function Interval(start, stop) {
  this.start = defaultValue_default(start, 0);
  this.stop = defaultValue_default(stop, 0);
}
var Interval_default = Interval;

// packages/engine/Source/Core/BoundingSphere.js
function BoundingSphere(center, radius) {
  this.center = Cartesian3_default.clone(defaultValue_default(center, Cartesian3_default.ZERO));
  this.radius = defaultValue_default(radius, 0);
}
var fromPointsXMin = new Cartesian3_default();
var fromPointsYMin = new Cartesian3_default();
var fromPointsZMin = new Cartesian3_default();
var fromPointsXMax = new Cartesian3_default();
var fromPointsYMax = new Cartesian3_default();
var fromPointsZMax = new Cartesian3_default();
var fromPointsCurrentPos = new Cartesian3_default();
var fromPointsScratch = new Cartesian3_default();
var fromPointsRitterCenter = new Cartesian3_default();
var fromPointsMinBoxPt = new Cartesian3_default();
var fromPointsMaxBoxPt = new Cartesian3_default();
var fromPointsNaiveCenterScratch = new Cartesian3_default();
var volumeConstant = 4 / 3 * Math_default.PI;
BoundingSphere.fromPoints = function(positions, result) {
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  if (!defined_default(positions) || positions.length === 0) {
    result.center = Cartesian3_default.clone(Cartesian3_default.ZERO, result.center);
    result.radius = 0;
    return result;
  }
  const currentPos = Cartesian3_default.clone(positions[0], fromPointsCurrentPos);
  const xMin = Cartesian3_default.clone(currentPos, fromPointsXMin);
  const yMin = Cartesian3_default.clone(currentPos, fromPointsYMin);
  const zMin = Cartesian3_default.clone(currentPos, fromPointsZMin);
  const xMax = Cartesian3_default.clone(currentPos, fromPointsXMax);
  const yMax = Cartesian3_default.clone(currentPos, fromPointsYMax);
  const zMax = Cartesian3_default.clone(currentPos, fromPointsZMax);
  const numPositions = positions.length;
  let i;
  for (i = 1; i < numPositions; i++) {
    Cartesian3_default.clone(positions[i], currentPos);
    const x = currentPos.x;
    const y = currentPos.y;
    const z = currentPos.z;
    if (x < xMin.x) {
      Cartesian3_default.clone(currentPos, xMin);
    }
    if (x > xMax.x) {
      Cartesian3_default.clone(currentPos, xMax);
    }
    if (y < yMin.y) {
      Cartesian3_default.clone(currentPos, yMin);
    }
    if (y > yMax.y) {
      Cartesian3_default.clone(currentPos, yMax);
    }
    if (z < zMin.z) {
      Cartesian3_default.clone(currentPos, zMin);
    }
    if (z > zMax.z) {
      Cartesian3_default.clone(currentPos, zMax);
    }
  }
  const xSpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(xMax, xMin, fromPointsScratch)
  );
  const ySpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(yMax, yMin, fromPointsScratch)
  );
  const zSpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(zMax, zMin, fromPointsScratch)
  );
  let diameter1 = xMin;
  let diameter2 = xMax;
  let maxSpan = xSpan;
  if (ySpan > maxSpan) {
    maxSpan = ySpan;
    diameter1 = yMin;
    diameter2 = yMax;
  }
  if (zSpan > maxSpan) {
    maxSpan = zSpan;
    diameter1 = zMin;
    diameter2 = zMax;
  }
  const ritterCenter = fromPointsRitterCenter;
  ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
  ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
  ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;
  let radiusSquared = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(diameter2, ritterCenter, fromPointsScratch)
  );
  let ritterRadius = Math.sqrt(radiusSquared);
  const minBoxPt = fromPointsMinBoxPt;
  minBoxPt.x = xMin.x;
  minBoxPt.y = yMin.y;
  minBoxPt.z = zMin.z;
  const maxBoxPt = fromPointsMaxBoxPt;
  maxBoxPt.x = xMax.x;
  maxBoxPt.y = yMax.y;
  maxBoxPt.z = zMax.z;
  const naiveCenter = Cartesian3_default.midpoint(
    minBoxPt,
    maxBoxPt,
    fromPointsNaiveCenterScratch
  );
  let naiveRadius = 0;
  for (i = 0; i < numPositions; i++) {
    Cartesian3_default.clone(positions[i], currentPos);
    const r = Cartesian3_default.magnitude(
      Cartesian3_default.subtract(currentPos, naiveCenter, fromPointsScratch)
    );
    if (r > naiveRadius) {
      naiveRadius = r;
    }
    const oldCenterToPointSquared = Cartesian3_default.magnitudeSquared(
      Cartesian3_default.subtract(currentPos, ritterCenter, fromPointsScratch)
    );
    if (oldCenterToPointSquared > radiusSquared) {
      const oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
      ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
      radiusSquared = ritterRadius * ritterRadius;
      const oldToNew = oldCenterToPoint - ritterRadius;
      ritterCenter.x = (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) / oldCenterToPoint;
      ritterCenter.y = (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) / oldCenterToPoint;
      ritterCenter.z = (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) / oldCenterToPoint;
    }
  }
  if (ritterRadius < naiveRadius) {
    Cartesian3_default.clone(ritterCenter, result.center);
    result.radius = ritterRadius;
  } else {
    Cartesian3_default.clone(naiveCenter, result.center);
    result.radius = naiveRadius;
  }
  return result;
};
var defaultProjection = new GeographicProjection_default();
var fromRectangle2DLowerLeft = new Cartesian3_default();
var fromRectangle2DUpperRight = new Cartesian3_default();
var fromRectangle2DSouthwest = new Cartographic_default();
var fromRectangle2DNortheast = new Cartographic_default();
BoundingSphere.fromRectangle2D = function(rectangle, projection, result) {
  return BoundingSphere.fromRectangleWithHeights2D(
    rectangle,
    projection,
    0,
    0,
    result
  );
};
BoundingSphere.fromRectangleWithHeights2D = function(rectangle, projection, minimumHeight, maximumHeight, result) {
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  if (!defined_default(rectangle)) {
    result.center = Cartesian3_default.clone(Cartesian3_default.ZERO, result.center);
    result.radius = 0;
    return result;
  }
  projection = defaultValue_default(projection, defaultProjection);
  Rectangle_default.southwest(rectangle, fromRectangle2DSouthwest);
  fromRectangle2DSouthwest.height = minimumHeight;
  Rectangle_default.northeast(rectangle, fromRectangle2DNortheast);
  fromRectangle2DNortheast.height = maximumHeight;
  const lowerLeft = projection.project(
    fromRectangle2DSouthwest,
    fromRectangle2DLowerLeft
  );
  const upperRight = projection.project(
    fromRectangle2DNortheast,
    fromRectangle2DUpperRight
  );
  const width = upperRight.x - lowerLeft.x;
  const height = upperRight.y - lowerLeft.y;
  const elevation = upperRight.z - lowerLeft.z;
  result.radius = Math.sqrt(width * width + height * height + elevation * elevation) * 0.5;
  const center = result.center;
  center.x = lowerLeft.x + width * 0.5;
  center.y = lowerLeft.y + height * 0.5;
  center.z = lowerLeft.z + elevation * 0.5;
  return result;
};
var fromRectangle3DScratch = [];
BoundingSphere.fromRectangle3D = function(rectangle, ellipsoid, surfaceHeight, result) {
  ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84);
  surfaceHeight = defaultValue_default(surfaceHeight, 0);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  if (!defined_default(rectangle)) {
    result.center = Cartesian3_default.clone(Cartesian3_default.ZERO, result.center);
    result.radius = 0;
    return result;
  }
  const positions = Rectangle_default.subsample(
    rectangle,
    ellipsoid,
    surfaceHeight,
    fromRectangle3DScratch
  );
  return BoundingSphere.fromPoints(positions, result);
};
BoundingSphere.fromVertices = function(positions, center, stride, result) {
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  if (!defined_default(positions) || positions.length === 0) {
    result.center = Cartesian3_default.clone(Cartesian3_default.ZERO, result.center);
    result.radius = 0;
    return result;
  }
  center = defaultValue_default(center, Cartesian3_default.ZERO);
  stride = defaultValue_default(stride, 3);
  Check_default.typeOf.number.greaterThanOrEquals("stride", stride, 3);
  const currentPos = fromPointsCurrentPos;
  currentPos.x = positions[0] + center.x;
  currentPos.y = positions[1] + center.y;
  currentPos.z = positions[2] + center.z;
  const xMin = Cartesian3_default.clone(currentPos, fromPointsXMin);
  const yMin = Cartesian3_default.clone(currentPos, fromPointsYMin);
  const zMin = Cartesian3_default.clone(currentPos, fromPointsZMin);
  const xMax = Cartesian3_default.clone(currentPos, fromPointsXMax);
  const yMax = Cartesian3_default.clone(currentPos, fromPointsYMax);
  const zMax = Cartesian3_default.clone(currentPos, fromPointsZMax);
  const numElements = positions.length;
  let i;
  for (i = 0; i < numElements; i += stride) {
    const x = positions[i] + center.x;
    const y = positions[i + 1] + center.y;
    const z = positions[i + 2] + center.z;
    currentPos.x = x;
    currentPos.y = y;
    currentPos.z = z;
    if (x < xMin.x) {
      Cartesian3_default.clone(currentPos, xMin);
    }
    if (x > xMax.x) {
      Cartesian3_default.clone(currentPos, xMax);
    }
    if (y < yMin.y) {
      Cartesian3_default.clone(currentPos, yMin);
    }
    if (y > yMax.y) {
      Cartesian3_default.clone(currentPos, yMax);
    }
    if (z < zMin.z) {
      Cartesian3_default.clone(currentPos, zMin);
    }
    if (z > zMax.z) {
      Cartesian3_default.clone(currentPos, zMax);
    }
  }
  const xSpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(xMax, xMin, fromPointsScratch)
  );
  const ySpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(yMax, yMin, fromPointsScratch)
  );
  const zSpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(zMax, zMin, fromPointsScratch)
  );
  let diameter1 = xMin;
  let diameter2 = xMax;
  let maxSpan = xSpan;
  if (ySpan > maxSpan) {
    maxSpan = ySpan;
    diameter1 = yMin;
    diameter2 = yMax;
  }
  if (zSpan > maxSpan) {
    maxSpan = zSpan;
    diameter1 = zMin;
    diameter2 = zMax;
  }
  const ritterCenter = fromPointsRitterCenter;
  ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
  ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
  ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;
  let radiusSquared = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(diameter2, ritterCenter, fromPointsScratch)
  );
  let ritterRadius = Math.sqrt(radiusSquared);
  const minBoxPt = fromPointsMinBoxPt;
  minBoxPt.x = xMin.x;
  minBoxPt.y = yMin.y;
  minBoxPt.z = zMin.z;
  const maxBoxPt = fromPointsMaxBoxPt;
  maxBoxPt.x = xMax.x;
  maxBoxPt.y = yMax.y;
  maxBoxPt.z = zMax.z;
  const naiveCenter = Cartesian3_default.midpoint(
    minBoxPt,
    maxBoxPt,
    fromPointsNaiveCenterScratch
  );
  let naiveRadius = 0;
  for (i = 0; i < numElements; i += stride) {
    currentPos.x = positions[i] + center.x;
    currentPos.y = positions[i + 1] + center.y;
    currentPos.z = positions[i + 2] + center.z;
    const r = Cartesian3_default.magnitude(
      Cartesian3_default.subtract(currentPos, naiveCenter, fromPointsScratch)
    );
    if (r > naiveRadius) {
      naiveRadius = r;
    }
    const oldCenterToPointSquared = Cartesian3_default.magnitudeSquared(
      Cartesian3_default.subtract(currentPos, ritterCenter, fromPointsScratch)
    );
    if (oldCenterToPointSquared > radiusSquared) {
      const oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
      ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
      radiusSquared = ritterRadius * ritterRadius;
      const oldToNew = oldCenterToPoint - ritterRadius;
      ritterCenter.x = (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) / oldCenterToPoint;
      ritterCenter.y = (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) / oldCenterToPoint;
      ritterCenter.z = (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) / oldCenterToPoint;
    }
  }
  if (ritterRadius < naiveRadius) {
    Cartesian3_default.clone(ritterCenter, result.center);
    result.radius = ritterRadius;
  } else {
    Cartesian3_default.clone(naiveCenter, result.center);
    result.radius = naiveRadius;
  }
  return result;
};
BoundingSphere.fromEncodedCartesianVertices = function(positionsHigh, positionsLow, result) {
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  if (!defined_default(positionsHigh) || !defined_default(positionsLow) || positionsHigh.length !== positionsLow.length || positionsHigh.length === 0) {
    result.center = Cartesian3_default.clone(Cartesian3_default.ZERO, result.center);
    result.radius = 0;
    return result;
  }
  const currentPos = fromPointsCurrentPos;
  currentPos.x = positionsHigh[0] + positionsLow[0];
  currentPos.y = positionsHigh[1] + positionsLow[1];
  currentPos.z = positionsHigh[2] + positionsLow[2];
  const xMin = Cartesian3_default.clone(currentPos, fromPointsXMin);
  const yMin = Cartesian3_default.clone(currentPos, fromPointsYMin);
  const zMin = Cartesian3_default.clone(currentPos, fromPointsZMin);
  const xMax = Cartesian3_default.clone(currentPos, fromPointsXMax);
  const yMax = Cartesian3_default.clone(currentPos, fromPointsYMax);
  const zMax = Cartesian3_default.clone(currentPos, fromPointsZMax);
  const numElements = positionsHigh.length;
  let i;
  for (i = 0; i < numElements; i += 3) {
    const x = positionsHigh[i] + positionsLow[i];
    const y = positionsHigh[i + 1] + positionsLow[i + 1];
    const z = positionsHigh[i + 2] + positionsLow[i + 2];
    currentPos.x = x;
    currentPos.y = y;
    currentPos.z = z;
    if (x < xMin.x) {
      Cartesian3_default.clone(currentPos, xMin);
    }
    if (x > xMax.x) {
      Cartesian3_default.clone(currentPos, xMax);
    }
    if (y < yMin.y) {
      Cartesian3_default.clone(currentPos, yMin);
    }
    if (y > yMax.y) {
      Cartesian3_default.clone(currentPos, yMax);
    }
    if (z < zMin.z) {
      Cartesian3_default.clone(currentPos, zMin);
    }
    if (z > zMax.z) {
      Cartesian3_default.clone(currentPos, zMax);
    }
  }
  const xSpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(xMax, xMin, fromPointsScratch)
  );
  const ySpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(yMax, yMin, fromPointsScratch)
  );
  const zSpan = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(zMax, zMin, fromPointsScratch)
  );
  let diameter1 = xMin;
  let diameter2 = xMax;
  let maxSpan = xSpan;
  if (ySpan > maxSpan) {
    maxSpan = ySpan;
    diameter1 = yMin;
    diameter2 = yMax;
  }
  if (zSpan > maxSpan) {
    maxSpan = zSpan;
    diameter1 = zMin;
    diameter2 = zMax;
  }
  const ritterCenter = fromPointsRitterCenter;
  ritterCenter.x = (diameter1.x + diameter2.x) * 0.5;
  ritterCenter.y = (diameter1.y + diameter2.y) * 0.5;
  ritterCenter.z = (diameter1.z + diameter2.z) * 0.5;
  let radiusSquared = Cartesian3_default.magnitudeSquared(
    Cartesian3_default.subtract(diameter2, ritterCenter, fromPointsScratch)
  );
  let ritterRadius = Math.sqrt(radiusSquared);
  const minBoxPt = fromPointsMinBoxPt;
  minBoxPt.x = xMin.x;
  minBoxPt.y = yMin.y;
  minBoxPt.z = zMin.z;
  const maxBoxPt = fromPointsMaxBoxPt;
  maxBoxPt.x = xMax.x;
  maxBoxPt.y = yMax.y;
  maxBoxPt.z = zMax.z;
  const naiveCenter = Cartesian3_default.midpoint(
    minBoxPt,
    maxBoxPt,
    fromPointsNaiveCenterScratch
  );
  let naiveRadius = 0;
  for (i = 0; i < numElements; i += 3) {
    currentPos.x = positionsHigh[i] + positionsLow[i];
    currentPos.y = positionsHigh[i + 1] + positionsLow[i + 1];
    currentPos.z = positionsHigh[i + 2] + positionsLow[i + 2];
    const r = Cartesian3_default.magnitude(
      Cartesian3_default.subtract(currentPos, naiveCenter, fromPointsScratch)
    );
    if (r > naiveRadius) {
      naiveRadius = r;
    }
    const oldCenterToPointSquared = Cartesian3_default.magnitudeSquared(
      Cartesian3_default.subtract(currentPos, ritterCenter, fromPointsScratch)
    );
    if (oldCenterToPointSquared > radiusSquared) {
      const oldCenterToPoint = Math.sqrt(oldCenterToPointSquared);
      ritterRadius = (ritterRadius + oldCenterToPoint) * 0.5;
      radiusSquared = ritterRadius * ritterRadius;
      const oldToNew = oldCenterToPoint - ritterRadius;
      ritterCenter.x = (ritterRadius * ritterCenter.x + oldToNew * currentPos.x) / oldCenterToPoint;
      ritterCenter.y = (ritterRadius * ritterCenter.y + oldToNew * currentPos.y) / oldCenterToPoint;
      ritterCenter.z = (ritterRadius * ritterCenter.z + oldToNew * currentPos.z) / oldCenterToPoint;
    }
  }
  if (ritterRadius < naiveRadius) {
    Cartesian3_default.clone(ritterCenter, result.center);
    result.radius = ritterRadius;
  } else {
    Cartesian3_default.clone(naiveCenter, result.center);
    result.radius = naiveRadius;
  }
  return result;
};
BoundingSphere.fromCornerPoints = function(corner, oppositeCorner, result) {
  Check_default.typeOf.object("corner", corner);
  Check_default.typeOf.object("oppositeCorner", oppositeCorner);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  const center = Cartesian3_default.midpoint(corner, oppositeCorner, result.center);
  result.radius = Cartesian3_default.distance(center, oppositeCorner);
  return result;
};
BoundingSphere.fromEllipsoid = function(ellipsoid, result) {
  Check_default.typeOf.object("ellipsoid", ellipsoid);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  Cartesian3_default.clone(Cartesian3_default.ZERO, result.center);
  result.radius = ellipsoid.maximumRadius;
  return result;
};
var fromBoundingSpheresScratch = new Cartesian3_default();
BoundingSphere.fromBoundingSpheres = function(boundingSpheres, result) {
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  if (!defined_default(boundingSpheres) || boundingSpheres.length === 0) {
    result.center = Cartesian3_default.clone(Cartesian3_default.ZERO, result.center);
    result.radius = 0;
    return result;
  }
  const length = boundingSpheres.length;
  if (length === 1) {
    return BoundingSphere.clone(boundingSpheres[0], result);
  }
  if (length === 2) {
    return BoundingSphere.union(boundingSpheres[0], boundingSpheres[1], result);
  }
  const positions = [];
  let i;
  for (i = 0; i < length; i++) {
    positions.push(boundingSpheres[i].center);
  }
  result = BoundingSphere.fromPoints(positions, result);
  const center = result.center;
  let radius = result.radius;
  for (i = 0; i < length; i++) {
    const tmp = boundingSpheres[i];
    radius = Math.max(
      radius,
      Cartesian3_default.distance(center, tmp.center, fromBoundingSpheresScratch) + tmp.radius
    );
  }
  result.radius = radius;
  return result;
};
var fromOrientedBoundingBoxScratchU = new Cartesian3_default();
var fromOrientedBoundingBoxScratchV = new Cartesian3_default();
var fromOrientedBoundingBoxScratchW = new Cartesian3_default();
BoundingSphere.fromOrientedBoundingBox = function(orientedBoundingBox, result) {
  Check_default.defined("orientedBoundingBox", orientedBoundingBox);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  const halfAxes = orientedBoundingBox.halfAxes;
  const u2 = Matrix3_default.getColumn(halfAxes, 0, fromOrientedBoundingBoxScratchU);
  const v2 = Matrix3_default.getColumn(halfAxes, 1, fromOrientedBoundingBoxScratchV);
  const w = Matrix3_default.getColumn(halfAxes, 2, fromOrientedBoundingBoxScratchW);
  Cartesian3_default.add(u2, v2, u2);
  Cartesian3_default.add(u2, w, u2);
  result.center = Cartesian3_default.clone(orientedBoundingBox.center, result.center);
  result.radius = Cartesian3_default.magnitude(u2);
  return result;
};
var scratchFromTransformationCenter = new Cartesian3_default();
var scratchFromTransformationScale = new Cartesian3_default();
BoundingSphere.fromTransformation = function(transformation, result) {
  Check_default.typeOf.object("transformation", transformation);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  const center = Matrix4_default.getTranslation(
    transformation,
    scratchFromTransformationCenter
  );
  const scale = Matrix4_default.getScale(
    transformation,
    scratchFromTransformationScale
  );
  const radius = 0.5 * Cartesian3_default.magnitude(scale);
  result.center = Cartesian3_default.clone(center, result.center);
  result.radius = radius;
  return result;
};
BoundingSphere.clone = function(sphere, result) {
  if (!defined_default(sphere)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new BoundingSphere(sphere.center, sphere.radius);
  }
  result.center = Cartesian3_default.clone(sphere.center, result.center);
  result.radius = sphere.radius;
  return result;
};
BoundingSphere.packedLength = 4;
BoundingSphere.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const center = value.center;
  array[startingIndex++] = center.x;
  array[startingIndex++] = center.y;
  array[startingIndex++] = center.z;
  array[startingIndex] = value.radius;
  return array;
};
BoundingSphere.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  const center = result.center;
  center.x = array[startingIndex++];
  center.y = array[startingIndex++];
  center.z = array[startingIndex++];
  result.radius = array[startingIndex];
  return result;
};
var unionScratch = new Cartesian3_default();
var unionScratchCenter = new Cartesian3_default();
BoundingSphere.union = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  const leftCenter = left.center;
  const leftRadius = left.radius;
  const rightCenter = right.center;
  const rightRadius = right.radius;
  const toRightCenter = Cartesian3_default.subtract(
    rightCenter,
    leftCenter,
    unionScratch
  );
  const centerSeparation = Cartesian3_default.magnitude(toRightCenter);
  if (leftRadius >= centerSeparation + rightRadius) {
    left.clone(result);
    return result;
  }
  if (rightRadius >= centerSeparation + leftRadius) {
    right.clone(result);
    return result;
  }
  const halfDistanceBetweenTangentPoints = (leftRadius + centerSeparation + rightRadius) * 0.5;
  const center = Cartesian3_default.multiplyByScalar(
    toRightCenter,
    (-leftRadius + halfDistanceBetweenTangentPoints) / centerSeparation,
    unionScratchCenter
  );
  Cartesian3_default.add(center, leftCenter, center);
  Cartesian3_default.clone(center, result.center);
  result.radius = halfDistanceBetweenTangentPoints;
  return result;
};
var expandScratch = new Cartesian3_default();
BoundingSphere.expand = function(sphere, point, result) {
  Check_default.typeOf.object("sphere", sphere);
  Check_default.typeOf.object("point", point);
  result = BoundingSphere.clone(sphere, result);
  const radius = Cartesian3_default.magnitude(
    Cartesian3_default.subtract(point, result.center, expandScratch)
  );
  if (radius > result.radius) {
    result.radius = radius;
  }
  return result;
};
BoundingSphere.intersectPlane = function(sphere, plane) {
  Check_default.typeOf.object("sphere", sphere);
  Check_default.typeOf.object("plane", plane);
  const center = sphere.center;
  const radius = sphere.radius;
  const normal = plane.normal;
  const distanceToPlane = Cartesian3_default.dot(normal, center) + plane.distance;
  if (distanceToPlane < -radius) {
    return Intersect_default.OUTSIDE;
  } else if (distanceToPlane < radius) {
    return Intersect_default.INTERSECTING;
  }
  return Intersect_default.INSIDE;
};
BoundingSphere.transform = function(sphere, transform, result) {
  Check_default.typeOf.object("sphere", sphere);
  Check_default.typeOf.object("transform", transform);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  result.center = Matrix4_default.multiplyByPoint(
    transform,
    sphere.center,
    result.center
  );
  result.radius = Matrix4_default.getMaximumScale(transform) * sphere.radius;
  return result;
};
var distanceSquaredToScratch = new Cartesian3_default();
BoundingSphere.distanceSquaredTo = function(sphere, cartesian) {
  Check_default.typeOf.object("sphere", sphere);
  Check_default.typeOf.object("cartesian", cartesian);
  const diff = Cartesian3_default.subtract(
    sphere.center,
    cartesian,
    distanceSquaredToScratch
  );
  const distance = Cartesian3_default.magnitude(diff) - sphere.radius;
  if (distance <= 0) {
    return 0;
  }
  return distance * distance;
};
BoundingSphere.transformWithoutScale = function(sphere, transform, result) {
  Check_default.typeOf.object("sphere", sphere);
  Check_default.typeOf.object("transform", transform);
  if (!defined_default(result)) {
    result = new BoundingSphere();
  }
  result.center = Matrix4_default.multiplyByPoint(
    transform,
    sphere.center,
    result.center
  );
  result.radius = sphere.radius;
  return result;
};
var scratchCartesian3 = new Cartesian3_default();
BoundingSphere.computePlaneDistances = function(sphere, position, direction, result) {
  Check_default.typeOf.object("sphere", sphere);
  Check_default.typeOf.object("position", position);
  Check_default.typeOf.object("direction", direction);
  if (!defined_default(result)) {
    result = new Interval_default();
  }
  const toCenter = Cartesian3_default.subtract(
    sphere.center,
    position,
    scratchCartesian3
  );
  const mag = Cartesian3_default.dot(direction, toCenter);
  result.start = mag - sphere.radius;
  result.stop = mag + sphere.radius;
  return result;
};
var projectTo2DNormalScratch = new Cartesian3_default();
var projectTo2DEastScratch = new Cartesian3_default();
var projectTo2DNorthScratch = new Cartesian3_default();
var projectTo2DWestScratch = new Cartesian3_default();
var projectTo2DSouthScratch = new Cartesian3_default();
var projectTo2DCartographicScratch = new Cartographic_default();
var projectTo2DPositionsScratch = new Array(8);
for (let n = 0; n < 8; ++n) {
  projectTo2DPositionsScratch[n] = new Cartesian3_default();
}
var projectTo2DProjection = new GeographicProjection_default();
BoundingSphere.projectTo2D = function(sphere, projection, result) {
  Check_default.typeOf.object("sphere", sphere);
  projection = defaultValue_default(projection, projectTo2DProjection);
  const ellipsoid = projection.ellipsoid;
  let center = sphere.center;
  const radius = sphere.radius;
  let normal;
  if (Cartesian3_default.equals(center, Cartesian3_default.ZERO)) {
    normal = Cartesian3_default.clone(Cartesian3_default.UNIT_X, projectTo2DNormalScratch);
  } else {
    normal = ellipsoid.geodeticSurfaceNormal(center, projectTo2DNormalScratch);
  }
  const east = Cartesian3_default.cross(
    Cartesian3_default.UNIT_Z,
    normal,
    projectTo2DEastScratch
  );
  Cartesian3_default.normalize(east, east);
  const north = Cartesian3_default.cross(normal, east, projectTo2DNorthScratch);
  Cartesian3_default.normalize(north, north);
  Cartesian3_default.multiplyByScalar(normal, radius, normal);
  Cartesian3_default.multiplyByScalar(north, radius, north);
  Cartesian3_default.multiplyByScalar(east, radius, east);
  const south = Cartesian3_default.negate(north, projectTo2DSouthScratch);
  const west = Cartesian3_default.negate(east, projectTo2DWestScratch);
  const positions = projectTo2DPositionsScratch;
  let corner = positions[0];
  Cartesian3_default.add(normal, north, corner);
  Cartesian3_default.add(corner, east, corner);
  corner = positions[1];
  Cartesian3_default.add(normal, north, corner);
  Cartesian3_default.add(corner, west, corner);
  corner = positions[2];
  Cartesian3_default.add(normal, south, corner);
  Cartesian3_default.add(corner, west, corner);
  corner = positions[3];
  Cartesian3_default.add(normal, south, corner);
  Cartesian3_default.add(corner, east, corner);
  Cartesian3_default.negate(normal, normal);
  corner = positions[4];
  Cartesian3_default.add(normal, north, corner);
  Cartesian3_default.add(corner, east, corner);
  corner = positions[5];
  Cartesian3_default.add(normal, north, corner);
  Cartesian3_default.add(corner, west, corner);
  corner = positions[6];
  Cartesian3_default.add(normal, south, corner);
  Cartesian3_default.add(corner, west, corner);
  corner = positions[7];
  Cartesian3_default.add(normal, south, corner);
  Cartesian3_default.add(corner, east, corner);
  const length = positions.length;
  for (let i = 0; i < length; ++i) {
    const position = positions[i];
    Cartesian3_default.add(center, position, position);
    const cartographic = ellipsoid.cartesianToCartographic(
      position,
      projectTo2DCartographicScratch
    );
    projection.project(cartographic, position);
  }
  result = BoundingSphere.fromPoints(positions, result);
  center = result.center;
  const x = center.x;
  const y = center.y;
  const z = center.z;
  center.x = z;
  center.y = x;
  center.z = y;
  return result;
};
BoundingSphere.isOccluded = function(sphere, occluder) {
  Check_default.typeOf.object("sphere", sphere);
  Check_default.typeOf.object("occluder", occluder);
  return !occluder.isBoundingSphereVisible(sphere);
};
BoundingSphere.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && Cartesian3_default.equals(left.center, right.center) && left.radius === right.radius;
};
BoundingSphere.prototype.intersectPlane = function(plane) {
  return BoundingSphere.intersectPlane(this, plane);
};
BoundingSphere.prototype.distanceSquaredTo = function(cartesian) {
  return BoundingSphere.distanceSquaredTo(this, cartesian);
};
BoundingSphere.prototype.computePlaneDistances = function(position, direction, result) {
  return BoundingSphere.computePlaneDistances(
    this,
    position,
    direction,
    result
  );
};
BoundingSphere.prototype.isOccluded = function(occluder) {
  return BoundingSphere.isOccluded(this, occluder);
};
BoundingSphere.prototype.equals = function(right) {
  return BoundingSphere.equals(this, right);
};
BoundingSphere.prototype.clone = function(result) {
  return BoundingSphere.clone(this, result);
};
BoundingSphere.prototype.volume = function() {
  const radius = this.radius;
  return volumeConstant * radius * radius * radius;
};
var BoundingSphere_default = BoundingSphere;

// packages/engine/Source/Core/binarySearch.js
function binarySearch(array, itemToFind, comparator) {
  Check_default.defined("array", array);
  Check_default.defined("itemToFind", itemToFind);
  Check_default.defined("comparator", comparator);
  let low = 0;
  let high = array.length - 1;
  let i;
  let comparison;
  while (low <= high) {
    i = ~~((low + high) / 2);
    comparison = comparator(array[i], itemToFind);
    if (comparison < 0) {
      low = i + 1;
      continue;
    }
    if (comparison > 0) {
      high = i - 1;
      continue;
    }
    return i;
  }
  return ~(high + 1);
}
var binarySearch_default = binarySearch;

// packages/engine/Source/Core/EarthOrientationParametersSample.js
function EarthOrientationParametersSample(xPoleWander, yPoleWander, xPoleOffset, yPoleOffset, ut1MinusUtc) {
  this.xPoleWander = xPoleWander;
  this.yPoleWander = yPoleWander;
  this.xPoleOffset = xPoleOffset;
  this.yPoleOffset = yPoleOffset;
  this.ut1MinusUtc = ut1MinusUtc;
}
var EarthOrientationParametersSample_default = EarthOrientationParametersSample;

// packages/engine/Source/Core/GregorianDate.js
function GregorianDate(year, month, day, hour, minute, second, millisecond, isLeapSecond) {
  this.year = year;
  this.month = month;
  this.day = day;
  this.hour = hour;
  this.minute = minute;
  this.second = second;
  this.millisecond = millisecond;
  this.isLeapSecond = isLeapSecond;
}
var GregorianDate_default = GregorianDate;

// packages/engine/Source/Core/isLeapYear.js
function isLeapYear(year) {
  if (year === null || isNaN(year)) {
    throw new DeveloperError_default("year is required and must be a number.");
  }
  return year % 4 === 0 && year % 100 !== 0 || year % 400 === 0;
}
var isLeapYear_default = isLeapYear;

// packages/engine/Source/Core/LeapSecond.js
function LeapSecond(date, offset) {
  this.julianDate = date;
  this.offset = offset;
}
var LeapSecond_default = LeapSecond;

// packages/engine/Source/Core/TimeConstants.js
var TimeConstants = {
  /**
   * The number of seconds in one millisecond: <code>0.001</code>
   * @type {number}
   * @constant
   */
  SECONDS_PER_MILLISECOND: 1e-3,
  /**
   * The number of seconds in one minute: <code>60</code>.
   * @type {number}
   * @constant
   */
  SECONDS_PER_MINUTE: 60,
  /**
   * The number of minutes in one hour: <code>60</code>.
   * @type {number}
   * @constant
   */
  MINUTES_PER_HOUR: 60,
  /**
   * The number of hours in one day: <code>24</code>.
   * @type {number}
   * @constant
   */
  HOURS_PER_DAY: 24,
  /**
   * The number of seconds in one hour: <code>3600</code>.
   * @type {number}
   * @constant
   */
  SECONDS_PER_HOUR: 3600,
  /**
   * The number of minutes in one day: <code>1440</code>.
   * @type {number}
   * @constant
   */
  MINUTES_PER_DAY: 1440,
  /**
   * The number of seconds in one day, ignoring leap seconds: <code>86400</code>.
   * @type {number}
   * @constant
   */
  SECONDS_PER_DAY: 86400,
  /**
   * The number of days in one Julian century: <code>36525</code>.
   * @type {number}
   * @constant
   */
  DAYS_PER_JULIAN_CENTURY: 36525,
  /**
   * One trillionth of a second.
   * @type {number}
   * @constant
   */
  PICOSECOND: 1e-9,
  /**
   * The number of days to subtract from a Julian date to determine the
   * modified Julian date, which gives the number of days since midnight
   * on November 17, 1858.
   * @type {number}
   * @constant
   */
  MODIFIED_JULIAN_DATE_DIFFERENCE: 24000005e-1
};
var TimeConstants_default = Object.freeze(TimeConstants);

// packages/engine/Source/Core/TimeStandard.js
var TimeStandard = {
  /**
   * Represents the coordinated Universal Time (UTC) time standard.
   *
   * UTC is related to TAI according to the relationship
   * <code>UTC = TAI - deltaT</code> where <code>deltaT</code> is the number of leap
   * seconds which have been introduced as of the time in TAI.
   *
   * @type {number}
   * @constant
   */
  UTC: 0,
  /**
   * Represents the International Atomic Time (TAI) time standard.
   * TAI is the principal time standard to which the other time standards are related.
   *
   * @type {number}
   * @constant
   */
  TAI: 1
};
var TimeStandard_default = Object.freeze(TimeStandard);

// packages/engine/Source/Core/JulianDate.js
var gregorianDateScratch = new GregorianDate_default();
var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var daysInLeapFeburary = 29;
function compareLeapSecondDates(leapSecond, dateToFind) {
  return JulianDate.compare(leapSecond.julianDate, dateToFind.julianDate);
}
var binarySearchScratchLeapSecond = new LeapSecond_default();
function convertUtcToTai(julianDate) {
  binarySearchScratchLeapSecond.julianDate = julianDate;
  const leapSeconds = JulianDate.leapSeconds;
  let index = binarySearch_default(
    leapSeconds,
    binarySearchScratchLeapSecond,
    compareLeapSecondDates
  );
  if (index < 0) {
    index = ~index;
  }
  if (index >= leapSeconds.length) {
    index = leapSeconds.length - 1;
  }
  let offset = leapSeconds[index].offset;
  if (index > 0) {
    const difference = JulianDate.secondsDifference(
      leapSeconds[index].julianDate,
      julianDate
    );
    if (difference > offset) {
      index--;
      offset = leapSeconds[index].offset;
    }
  }
  JulianDate.addSeconds(julianDate, offset, julianDate);
}
function convertTaiToUtc(julianDate, result) {
  binarySearchScratchLeapSecond.julianDate = julianDate;
  const leapSeconds = JulianDate.leapSeconds;
  let index = binarySearch_default(
    leapSeconds,
    binarySearchScratchLeapSecond,
    compareLeapSecondDates
  );
  if (index < 0) {
    index = ~index;
  }
  if (index === 0) {
    return JulianDate.addSeconds(julianDate, -leapSeconds[0].offset, result);
  }
  if (index >= leapSeconds.length) {
    return JulianDate.addSeconds(
      julianDate,
      -leapSeconds[index - 1].offset,
      result
    );
  }
  const difference = JulianDate.secondsDifference(
    leapSeconds[index].julianDate,
    julianDate
  );
  if (difference === 0) {
    return JulianDate.addSeconds(
      julianDate,
      -leapSeconds[index].offset,
      result
    );
  }
  if (difference <= 1) {
    return void 0;
  }
  return JulianDate.addSeconds(
    julianDate,
    -leapSeconds[--index].offset,
    result
  );
}
function setComponents(wholeDays, secondsOfDay, julianDate) {
  const extraDays = secondsOfDay / TimeConstants_default.SECONDS_PER_DAY | 0;
  wholeDays += extraDays;
  secondsOfDay -= TimeConstants_default.SECONDS_PER_DAY * extraDays;
  if (secondsOfDay < 0) {
    wholeDays--;
    secondsOfDay += TimeConstants_default.SECONDS_PER_DAY;
  }
  julianDate.dayNumber = wholeDays;
  julianDate.secondsOfDay = secondsOfDay;
  return julianDate;
}
function computeJulianDateComponents(year, month, day, hour, minute, second, millisecond) {
  const a3 = (month - 14) / 12 | 0;
  const b = year + 4800 + a3;
  let dayNumber = (1461 * b / 4 | 0) + (367 * (month - 2 - 12 * a3) / 12 | 0) - (3 * ((b + 100) / 100 | 0) / 4 | 0) + day - 32075;
  hour = hour - 12;
  if (hour < 0) {
    hour += 24;
  }
  const secondsOfDay = second + (hour * TimeConstants_default.SECONDS_PER_HOUR + minute * TimeConstants_default.SECONDS_PER_MINUTE + millisecond * TimeConstants_default.SECONDS_PER_MILLISECOND);
  if (secondsOfDay >= 43200) {
    dayNumber -= 1;
  }
  return [dayNumber, secondsOfDay];
}
var matchCalendarYear = /^(\d{4})$/;
var matchCalendarMonth = /^(\d{4})-(\d{2})$/;
var matchOrdinalDate = /^(\d{4})-?(\d{3})$/;
var matchWeekDate = /^(\d{4})-?W(\d{2})-?(\d{1})?$/;
var matchCalendarDate = /^(\d{4})-?(\d{2})-?(\d{2})$/;
var utcOffset = /([Z+\-])?(\d{2})?:?(\d{2})?$/;
var matchHours = /^(\d{2})(\.\d+)?/.source + utcOffset.source;
var matchHoursMinutes = /^(\d{2}):?(\d{2})(\.\d+)?/.source + utcOffset.source;
var matchHoursMinutesSeconds = /^(\d{2}):?(\d{2}):?(\d{2})(\.\d+)?/.source + utcOffset.source;
var iso8601ErrorMessage = "Invalid ISO 8601 date.";
function JulianDate(julianDayNumber, secondsOfDay, timeStandard) {
  this.dayNumber = void 0;
  this.secondsOfDay = void 0;
  julianDayNumber = defaultValue_default(julianDayNumber, 0);
  secondsOfDay = defaultValue_default(secondsOfDay, 0);
  timeStandard = defaultValue_default(timeStandard, TimeStandard_default.UTC);
  const wholeDays = julianDayNumber | 0;
  secondsOfDay = secondsOfDay + (julianDayNumber - wholeDays) * TimeConstants_default.SECONDS_PER_DAY;
  setComponents(wholeDays, secondsOfDay, this);
  if (timeStandard === TimeStandard_default.UTC) {
    convertUtcToTai(this);
  }
}
JulianDate.fromGregorianDate = function(date, result) {
  if (!(date instanceof GregorianDate_default)) {
    throw new DeveloperError_default("date must be a valid GregorianDate.");
  }
  const components = computeJulianDateComponents(
    date.year,
    date.month,
    date.day,
    date.hour,
    date.minute,
    date.second,
    date.millisecond
  );
  if (!defined_default(result)) {
    return new JulianDate(components[0], components[1], TimeStandard_default.UTC);
  }
  setComponents(components[0], components[1], result);
  convertUtcToTai(result);
  return result;
};
JulianDate.fromDate = function(date, result) {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new DeveloperError_default("date must be a valid JavaScript Date.");
  }
  const components = computeJulianDateComponents(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds(),
    date.getUTCMilliseconds()
  );
  if (!defined_default(result)) {
    return new JulianDate(components[0], components[1], TimeStandard_default.UTC);
  }
  setComponents(components[0], components[1], result);
  convertUtcToTai(result);
  return result;
};
JulianDate.fromIso8601 = function(iso8601String, result) {
  if (typeof iso8601String !== "string") {
    throw new DeveloperError_default(iso8601ErrorMessage);
  }
  iso8601String = iso8601String.replace(",", ".");
  let tokens = iso8601String.split("T");
  let year;
  let month = 1;
  let day = 1;
  let hour = 0;
  let minute = 0;
  let second = 0;
  let millisecond = 0;
  const date = tokens[0];
  const time = tokens[1];
  let tmp;
  let inLeapYear;
  if (!defined_default(date)) {
    throw new DeveloperError_default(iso8601ErrorMessage);
  }
  let dashCount;
  tokens = date.match(matchCalendarDate);
  if (tokens !== null) {
    dashCount = date.split("-").length - 1;
    if (dashCount > 0 && dashCount !== 2) {
      throw new DeveloperError_default(iso8601ErrorMessage);
    }
    year = +tokens[1];
    month = +tokens[2];
    day = +tokens[3];
  } else {
    tokens = date.match(matchCalendarMonth);
    if (tokens !== null) {
      year = +tokens[1];
      month = +tokens[2];
    } else {
      tokens = date.match(matchCalendarYear);
      if (tokens !== null) {
        year = +tokens[1];
      } else {
        let dayOfYear;
        tokens = date.match(matchOrdinalDate);
        if (tokens !== null) {
          year = +tokens[1];
          dayOfYear = +tokens[2];
          inLeapYear = isLeapYear_default(year);
          if (dayOfYear < 1 || inLeapYear && dayOfYear > 366 || !inLeapYear && dayOfYear > 365) {
            throw new DeveloperError_default(iso8601ErrorMessage);
          }
        } else {
          tokens = date.match(matchWeekDate);
          if (tokens !== null) {
            year = +tokens[1];
            const weekNumber = +tokens[2];
            const dayOfWeek = +tokens[3] || 0;
            dashCount = date.split("-").length - 1;
            if (dashCount > 0 && (!defined_default(tokens[3]) && dashCount !== 1 || defined_default(tokens[3]) && dashCount !== 2)) {
              throw new DeveloperError_default(iso8601ErrorMessage);
            }
            const january4 = new Date(Date.UTC(year, 0, 4));
            dayOfYear = weekNumber * 7 + dayOfWeek - january4.getUTCDay() - 3;
          } else {
            throw new DeveloperError_default(iso8601ErrorMessage);
          }
        }
        tmp = new Date(Date.UTC(year, 0, 1));
        tmp.setUTCDate(dayOfYear);
        month = tmp.getUTCMonth() + 1;
        day = tmp.getUTCDate();
      }
    }
  }
  inLeapYear = isLeapYear_default(year);
  if (month < 1 || month > 12 || day < 1 || (month !== 2 || !inLeapYear) && day > daysInMonth[month - 1] || inLeapYear && month === 2 && day > daysInLeapFeburary) {
    throw new DeveloperError_default(iso8601ErrorMessage);
  }
  let offsetIndex;
  if (defined_default(time)) {
    tokens = time.match(matchHoursMinutesSeconds);
    if (tokens !== null) {
      dashCount = time.split(":").length - 1;
      if (dashCount > 0 && dashCount !== 2 && dashCount !== 3) {
        throw new DeveloperError_default(iso8601ErrorMessage);
      }
      hour = +tokens[1];
      minute = +tokens[2];
      second = +tokens[3];
      millisecond = +(tokens[4] || 0) * 1e3;
      offsetIndex = 5;
    } else {
      tokens = time.match(matchHoursMinutes);
      if (tokens !== null) {
        dashCount = time.split(":").length - 1;
        if (dashCount > 2) {
          throw new DeveloperError_default(iso8601ErrorMessage);
        }
        hour = +tokens[1];
        minute = +tokens[2];
        second = +(tokens[3] || 0) * 60;
        offsetIndex = 4;
      } else {
        tokens = time.match(matchHours);
        if (tokens !== null) {
          hour = +tokens[1];
          minute = +(tokens[2] || 0) * 60;
          offsetIndex = 3;
        } else {
          throw new DeveloperError_default(iso8601ErrorMessage);
        }
      }
    }
    if (minute >= 60 || second >= 61 || hour > 24 || hour === 24 && (minute > 0 || second > 0 || millisecond > 0)) {
      throw new DeveloperError_default(iso8601ErrorMessage);
    }
    const offset = tokens[offsetIndex];
    const offsetHours = +tokens[offsetIndex + 1];
    const offsetMinutes = +(tokens[offsetIndex + 2] || 0);
    switch (offset) {
      case "+":
        hour = hour - offsetHours;
        minute = minute - offsetMinutes;
        break;
      case "-":
        hour = hour + offsetHours;
        minute = minute + offsetMinutes;
        break;
      case "Z":
        break;
      default:
        minute = minute + new Date(
          Date.UTC(year, month - 1, day, hour, minute)
        ).getTimezoneOffset();
        break;
    }
  }
  const isLeapSecond = second === 60;
  if (isLeapSecond) {
    second--;
  }
  while (minute >= 60) {
    minute -= 60;
    hour++;
  }
  while (hour >= 24) {
    hour -= 24;
    day++;
  }
  tmp = inLeapYear && month === 2 ? daysInLeapFeburary : daysInMonth[month - 1];
  while (day > tmp) {
    day -= tmp;
    month++;
    if (month > 12) {
      month -= 12;
      year++;
    }
    tmp = inLeapYear && month === 2 ? daysInLeapFeburary : daysInMonth[month - 1];
  }
  while (minute < 0) {
    minute += 60;
    hour--;
  }
  while (hour < 0) {
    hour += 24;
    day--;
  }
  while (day < 1) {
    month--;
    if (month < 1) {
      month += 12;
      year--;
    }
    tmp = inLeapYear && month === 2 ? daysInLeapFeburary : daysInMonth[month - 1];
    day += tmp;
  }
  const components = computeJulianDateComponents(
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond
  );
  if (!defined_default(result)) {
    result = new JulianDate(components[0], components[1], TimeStandard_default.UTC);
  } else {
    setComponents(components[0], components[1], result);
    convertUtcToTai(result);
  }
  if (isLeapSecond) {
    JulianDate.addSeconds(result, 1, result);
  }
  return result;
};
JulianDate.now = function(result) {
  return JulianDate.fromDate(/* @__PURE__ */ new Date(), result);
};
var toGregorianDateScratch = new JulianDate(0, 0, TimeStandard_default.TAI);
JulianDate.toGregorianDate = function(julianDate, result) {
  if (!defined_default(julianDate)) {
    throw new DeveloperError_default("julianDate is required.");
  }
  let isLeapSecond = false;
  let thisUtc = convertTaiToUtc(julianDate, toGregorianDateScratch);
  if (!defined_default(thisUtc)) {
    JulianDate.addSeconds(julianDate, -1, toGregorianDateScratch);
    thisUtc = convertTaiToUtc(toGregorianDateScratch, toGregorianDateScratch);
    isLeapSecond = true;
  }
  let julianDayNumber = thisUtc.dayNumber;
  const secondsOfDay = thisUtc.secondsOfDay;
  if (secondsOfDay >= 43200) {
    julianDayNumber += 1;
  }
  let L = julianDayNumber + 68569 | 0;
  const N = 4 * L / 146097 | 0;
  L = L - ((146097 * N + 3) / 4 | 0) | 0;
  const I = 4e3 * (L + 1) / 1461001 | 0;
  L = L - (1461 * I / 4 | 0) + 31 | 0;
  const J = 80 * L / 2447 | 0;
  const day = L - (2447 * J / 80 | 0) | 0;
  L = J / 11 | 0;
  const month = J + 2 - 12 * L | 0;
  const year = 100 * (N - 49) + I + L | 0;
  let hour = secondsOfDay / TimeConstants_default.SECONDS_PER_HOUR | 0;
  let remainingSeconds = secondsOfDay - hour * TimeConstants_default.SECONDS_PER_HOUR;
  const minute = remainingSeconds / TimeConstants_default.SECONDS_PER_MINUTE | 0;
  remainingSeconds = remainingSeconds - minute * TimeConstants_default.SECONDS_PER_MINUTE;
  let second = remainingSeconds | 0;
  const millisecond = (remainingSeconds - second) / TimeConstants_default.SECONDS_PER_MILLISECOND;
  hour += 12;
  if (hour > 23) {
    hour -= 24;
  }
  if (isLeapSecond) {
    second += 1;
  }
  if (!defined_default(result)) {
    return new GregorianDate_default(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      isLeapSecond
    );
  }
  result.year = year;
  result.month = month;
  result.day = day;
  result.hour = hour;
  result.minute = minute;
  result.second = second;
  result.millisecond = millisecond;
  result.isLeapSecond = isLeapSecond;
  return result;
};
JulianDate.toDate = function(julianDate) {
  if (!defined_default(julianDate)) {
    throw new DeveloperError_default("julianDate is required.");
  }
  const gDate = JulianDate.toGregorianDate(julianDate, gregorianDateScratch);
  let second = gDate.second;
  if (gDate.isLeapSecond) {
    second -= 1;
  }
  return new Date(
    Date.UTC(
      gDate.year,
      gDate.month - 1,
      gDate.day,
      gDate.hour,
      gDate.minute,
      second,
      gDate.millisecond
    )
  );
};
JulianDate.toIso8601 = function(julianDate, precision) {
  if (!defined_default(julianDate)) {
    throw new DeveloperError_default("julianDate is required.");
  }
  const gDate = JulianDate.toGregorianDate(julianDate, gregorianDateScratch);
  let year = gDate.year;
  let month = gDate.month;
  let day = gDate.day;
  let hour = gDate.hour;
  const minute = gDate.minute;
  const second = gDate.second;
  const millisecond = gDate.millisecond;
  if (year === 1e4 && month === 1 && day === 1 && hour === 0 && minute === 0 && second === 0 && millisecond === 0) {
    year = 9999;
    month = 12;
    day = 31;
    hour = 24;
  }
  let millisecondStr;
  if (!defined_default(precision) && millisecond !== 0) {
    millisecondStr = (millisecond * 0.01).toString().replace(".", "");
    return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:${second.toString().padStart(2, "0")}.${millisecondStr}Z`;
  }
  if (!defined_default(precision) || precision === 0) {
    return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:${second.toString().padStart(2, "0")}Z`;
  }
  millisecondStr = (millisecond * 0.01).toFixed(precision).replace(".", "").slice(0, precision);
  return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}:${second.toString().padStart(2, "0")}.${millisecondStr}Z`;
};
JulianDate.clone = function(julianDate, result) {
  if (!defined_default(julianDate)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new JulianDate(
      julianDate.dayNumber,
      julianDate.secondsOfDay,
      TimeStandard_default.TAI
    );
  }
  result.dayNumber = julianDate.dayNumber;
  result.secondsOfDay = julianDate.secondsOfDay;
  return result;
};
JulianDate.compare = function(left, right) {
  if (!defined_default(left)) {
    throw new DeveloperError_default("left is required.");
  }
  if (!defined_default(right)) {
    throw new DeveloperError_default("right is required.");
  }
  const julianDayNumberDifference = left.dayNumber - right.dayNumber;
  if (julianDayNumberDifference !== 0) {
    return julianDayNumberDifference;
  }
  return left.secondsOfDay - right.secondsOfDay;
};
JulianDate.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left.dayNumber === right.dayNumber && left.secondsOfDay === right.secondsOfDay;
};
JulianDate.equalsEpsilon = function(left, right, epsilon) {
  epsilon = defaultValue_default(epsilon, 0);
  return left === right || defined_default(left) && defined_default(right) && Math.abs(JulianDate.secondsDifference(left, right)) <= epsilon;
};
JulianDate.totalDays = function(julianDate) {
  if (!defined_default(julianDate)) {
    throw new DeveloperError_default("julianDate is required.");
  }
  return julianDate.dayNumber + julianDate.secondsOfDay / TimeConstants_default.SECONDS_PER_DAY;
};
JulianDate.secondsDifference = function(left, right) {
  if (!defined_default(left)) {
    throw new DeveloperError_default("left is required.");
  }
  if (!defined_default(right)) {
    throw new DeveloperError_default("right is required.");
  }
  const dayDifference = (left.dayNumber - right.dayNumber) * TimeConstants_default.SECONDS_PER_DAY;
  return dayDifference + (left.secondsOfDay - right.secondsOfDay);
};
JulianDate.daysDifference = function(left, right) {
  if (!defined_default(left)) {
    throw new DeveloperError_default("left is required.");
  }
  if (!defined_default(right)) {
    throw new DeveloperError_default("right is required.");
  }
  const dayDifference = left.dayNumber - right.dayNumber;
  const secondDifference = (left.secondsOfDay - right.secondsOfDay) / TimeConstants_default.SECONDS_PER_DAY;
  return dayDifference + secondDifference;
};
JulianDate.computeTaiMinusUtc = function(julianDate) {
  binarySearchScratchLeapSecond.julianDate = julianDate;
  const leapSeconds = JulianDate.leapSeconds;
  let index = binarySearch_default(
    leapSeconds,
    binarySearchScratchLeapSecond,
    compareLeapSecondDates
  );
  if (index < 0) {
    index = ~index;
    --index;
    if (index < 0) {
      index = 0;
    }
  }
  return leapSeconds[index].offset;
};
JulianDate.addSeconds = function(julianDate, seconds, result) {
  if (!defined_default(julianDate)) {
    throw new DeveloperError_default("julianDate is required.");
  }
  if (!defined_default(seconds)) {
    throw new DeveloperError_default("seconds is required.");
  }
  if (!defined_default(result)) {
    throw new DeveloperError_default("result is required.");
  }
  return setComponents(
    julianDate.dayNumber,
    julianDate.secondsOfDay + seconds,
    result
  );
};
JulianDate.addMinutes = function(julianDate, minutes, result) {
  if (!defined_default(julianDate)) {
    throw new DeveloperError_default("julianDate is required.");
  }
  if (!defined_default(minutes)) {
    throw new DeveloperError_default("minutes is required.");
  }
  if (!defined_default(result)) {
    throw new DeveloperError_default("result is required.");
  }
  const newSecondsOfDay = julianDate.secondsOfDay + minutes * TimeConstants_default.SECONDS_PER_MINUTE;
  return setComponents(julianDate.dayNumber, newSecondsOfDay, result);
};
JulianDate.addHours = function(julianDate, hours, result) {
  if (!defined_default(julianDate)) {
    throw new DeveloperError_default("julianDate is required.");
  }
  if (!defined_default(hours)) {
    throw new DeveloperError_default("hours is required.");
  }
  if (!defined_default(result)) {
    throw new DeveloperError_default("result is required.");
  }
  const newSecondsOfDay = julianDate.secondsOfDay + hours * TimeConstants_default.SECONDS_PER_HOUR;
  return setComponents(julianDate.dayNumber, newSecondsOfDay, result);
};
JulianDate.addDays = function(julianDate, days, result) {
  if (!defined_default(julianDate)) {
    throw new DeveloperError_default("julianDate is required.");
  }
  if (!defined_default(days)) {
    throw new DeveloperError_default("days is required.");
  }
  if (!defined_default(result)) {
    throw new DeveloperError_default("result is required.");
  }
  const newJulianDayNumber = julianDate.dayNumber + days;
  return setComponents(newJulianDayNumber, julianDate.secondsOfDay, result);
};
JulianDate.lessThan = function(left, right) {
  return JulianDate.compare(left, right) < 0;
};
JulianDate.lessThanOrEquals = function(left, right) {
  return JulianDate.compare(left, right) <= 0;
};
JulianDate.greaterThan = function(left, right) {
  return JulianDate.compare(left, right) > 0;
};
JulianDate.greaterThanOrEquals = function(left, right) {
  return JulianDate.compare(left, right) >= 0;
};
JulianDate.prototype.clone = function(result) {
  return JulianDate.clone(this, result);
};
JulianDate.prototype.equals = function(right) {
  return JulianDate.equals(this, right);
};
JulianDate.prototype.equalsEpsilon = function(right, epsilon) {
  return JulianDate.equalsEpsilon(this, right, epsilon);
};
JulianDate.prototype.toString = function() {
  return JulianDate.toIso8601(this);
};
JulianDate.leapSeconds = [
  new LeapSecond_default(new JulianDate(2441317, 43210, TimeStandard_default.TAI), 10),
  // January 1, 1972 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2441499, 43211, TimeStandard_default.TAI), 11),
  // July 1, 1972 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2441683, 43212, TimeStandard_default.TAI), 12),
  // January 1, 1973 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2442048, 43213, TimeStandard_default.TAI), 13),
  // January 1, 1974 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2442413, 43214, TimeStandard_default.TAI), 14),
  // January 1, 1975 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2442778, 43215, TimeStandard_default.TAI), 15),
  // January 1, 1976 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2443144, 43216, TimeStandard_default.TAI), 16),
  // January 1, 1977 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2443509, 43217, TimeStandard_default.TAI), 17),
  // January 1, 1978 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2443874, 43218, TimeStandard_default.TAI), 18),
  // January 1, 1979 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2444239, 43219, TimeStandard_default.TAI), 19),
  // January 1, 1980 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2444786, 43220, TimeStandard_default.TAI), 20),
  // July 1, 1981 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2445151, 43221, TimeStandard_default.TAI), 21),
  // July 1, 1982 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2445516, 43222, TimeStandard_default.TAI), 22),
  // July 1, 1983 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2446247, 43223, TimeStandard_default.TAI), 23),
  // July 1, 1985 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2447161, 43224, TimeStandard_default.TAI), 24),
  // January 1, 1988 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2447892, 43225, TimeStandard_default.TAI), 25),
  // January 1, 1990 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2448257, 43226, TimeStandard_default.TAI), 26),
  // January 1, 1991 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2448804, 43227, TimeStandard_default.TAI), 27),
  // July 1, 1992 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2449169, 43228, TimeStandard_default.TAI), 28),
  // July 1, 1993 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2449534, 43229, TimeStandard_default.TAI), 29),
  // July 1, 1994 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2450083, 43230, TimeStandard_default.TAI), 30),
  // January 1, 1996 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2450630, 43231, TimeStandard_default.TAI), 31),
  // July 1, 1997 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2451179, 43232, TimeStandard_default.TAI), 32),
  // January 1, 1999 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2453736, 43233, TimeStandard_default.TAI), 33),
  // January 1, 2006 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2454832, 43234, TimeStandard_default.TAI), 34),
  // January 1, 2009 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2456109, 43235, TimeStandard_default.TAI), 35),
  // July 1, 2012 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2457204, 43236, TimeStandard_default.TAI), 36),
  // July 1, 2015 00:00:00 UTC
  new LeapSecond_default(new JulianDate(2457754, 43237, TimeStandard_default.TAI), 37)
  // January 1, 2017 00:00:00 UTC
];
var JulianDate_default = JulianDate;

// packages/engine/Source/Core/Resource.js
var import_urijs6 = __toESM(require_URI(), 1);

// packages/engine/Source/Core/appendForwardSlash.js
function appendForwardSlash(url) {
  if (url.length === 0 || url[url.length - 1] !== "/") {
    url = `${url}/`;
  }
  return url;
}
var appendForwardSlash_default = appendForwardSlash;

// packages/engine/Source/Core/clone.js
function clone(object, deep) {
  if (object === null || typeof object !== "object") {
    return object;
  }
  deep = defaultValue_default(deep, false);
  const result = new object.constructor();
  for (const propertyName in object) {
    if (object.hasOwnProperty(propertyName)) {
      let value = object[propertyName];
      if (deep) {
        value = clone(value, deep);
      }
      result[propertyName] = value;
    }
  }
  return result;
}
var clone_default = clone;

// packages/engine/Source/Core/defer.js
function defer() {
  let resolve;
  let reject;
  const promise = new Promise(function(res, rej) {
    resolve = res;
    reject = rej;
  });
  return {
    resolve,
    reject,
    promise
  };
}
var defer_default = defer;

// packages/engine/Source/Core/getAbsoluteUri.js
var import_urijs = __toESM(require_URI(), 1);
function getAbsoluteUri(relative, base) {
  let documentObject;
  if (typeof document !== "undefined") {
    documentObject = document;
  }
  return getAbsoluteUri._implementation(relative, base, documentObject);
}
getAbsoluteUri._implementation = function(relative, base, documentObject) {
  if (!defined_default(relative)) {
    throw new DeveloperError_default("relative uri is required.");
  }
  if (!defined_default(base)) {
    if (typeof documentObject === "undefined") {
      return relative;
    }
    base = defaultValue_default(documentObject.baseURI, documentObject.location.href);
  }
  const relativeUri = new import_urijs.default(relative);
  if (relativeUri.scheme() !== "") {
    return relativeUri.toString();
  }
  return relativeUri.absoluteTo(base).toString();
};
var getAbsoluteUri_default = getAbsoluteUri;

// packages/engine/Source/Core/getBaseUri.js
var import_urijs2 = __toESM(require_URI(), 1);
function getBaseUri(uri, includeQuery) {
  if (!defined_default(uri)) {
    throw new DeveloperError_default("uri is required.");
  }
  let basePath = "";
  const i = uri.lastIndexOf("/");
  if (i !== -1) {
    basePath = uri.substring(0, i + 1);
  }
  if (!includeQuery) {
    return basePath;
  }
  uri = new import_urijs2.default(uri);
  if (uri.query().length !== 0) {
    basePath += `?${uri.query()}`;
  }
  if (uri.fragment().length !== 0) {
    basePath += `#${uri.fragment()}`;
  }
  return basePath;
}
var getBaseUri_default = getBaseUri;

// packages/engine/Source/Core/getExtensionFromUri.js
var import_urijs3 = __toESM(require_URI(), 1);
function getExtensionFromUri(uri) {
  if (!defined_default(uri)) {
    throw new DeveloperError_default("uri is required.");
  }
  const uriObject = new import_urijs3.default(uri);
  uriObject.normalize();
  let path = uriObject.path();
  let index = path.lastIndexOf("/");
  if (index !== -1) {
    path = path.substr(index + 1);
  }
  index = path.lastIndexOf(".");
  if (index === -1) {
    path = "";
  } else {
    path = path.substr(index + 1);
  }
  return path;
}
var getExtensionFromUri_default = getExtensionFromUri;

// packages/engine/Source/Core/getImagePixels.js
var context2DsByWidthAndHeight = {};
function getImagePixels(image, width, height) {
  if (!defined_default(width)) {
    width = image.width;
  }
  if (!defined_default(height)) {
    height = image.height;
  }
  let context2DsByHeight = context2DsByWidthAndHeight[width];
  if (!defined_default(context2DsByHeight)) {
    context2DsByHeight = {};
    context2DsByWidthAndHeight[width] = context2DsByHeight;
  }
  let context2d = context2DsByHeight[height];
  if (!defined_default(context2d)) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    context2d = canvas.getContext("2d", { willReadFrequently: true });
    context2d.globalCompositeOperation = "copy";
    context2DsByHeight[height] = context2d;
  }
  context2d.drawImage(image, 0, 0, width, height);
  return context2d.getImageData(0, 0, width, height).data;
}
var getImagePixels_default = getImagePixels;

// packages/engine/Source/Core/isBlobUri.js
var blobUriRegex = /^blob:/i;
function isBlobUri(uri) {
  Check_default.typeOf.string("uri", uri);
  return blobUriRegex.test(uri);
}
var isBlobUri_default = isBlobUri;

// packages/engine/Source/Core/isCrossOriginUrl.js
var a;
function isCrossOriginUrl(url) {
  if (!defined_default(a)) {
    a = document.createElement("a");
  }
  a.href = window.location.href;
  const host = a.host;
  const protocol = a.protocol;
  a.href = url;
  a.href = a.href;
  return protocol !== a.protocol || host !== a.host;
}
var isCrossOriginUrl_default = isCrossOriginUrl;

// packages/engine/Source/Core/isDataUri.js
var dataUriRegex = /^data:/i;
function isDataUri(uri) {
  Check_default.typeOf.string("uri", uri);
  return dataUriRegex.test(uri);
}
var isDataUri_default = isDataUri;

// packages/engine/Source/Core/loadAndExecuteScript.js
function loadAndExecuteScript(url) {
  const script = document.createElement("script");
  script.async = true;
  script.src = url;
  return new Promise((resolve, reject) => {
    if (window.crossOriginIsolated) {
      script.setAttribute("crossorigin", "anonymous");
    }
    const head = document.getElementsByTagName("head")[0];
    script.onload = function() {
      script.onload = void 0;
      head.removeChild(script);
      resolve();
    };
    script.onerror = function(e) {
      reject(e);
    };
    head.appendChild(script);
  });
}
var loadAndExecuteScript_default = loadAndExecuteScript;

// packages/engine/Source/Core/objectToQuery.js
function objectToQuery(obj) {
  if (!defined_default(obj)) {
    throw new DeveloperError_default("obj is required.");
  }
  let result = "";
  for (const propName in obj) {
    if (obj.hasOwnProperty(propName)) {
      const value = obj[propName];
      const part = `${encodeURIComponent(propName)}=`;
      if (Array.isArray(value)) {
        for (let i = 0, len = value.length; i < len; ++i) {
          result += `${part + encodeURIComponent(value[i])}&`;
        }
      } else {
        result += `${part + encodeURIComponent(value)}&`;
      }
    }
  }
  result = result.slice(0, -1);
  return result;
}
var objectToQuery_default = objectToQuery;

// packages/engine/Source/Core/queryToObject.js
function queryToObject(queryString) {
  if (!defined_default(queryString)) {
    throw new DeveloperError_default("queryString is required.");
  }
  const result = {};
  if (queryString === "") {
    return result;
  }
  const parts = queryString.replace(/\+/g, "%20").split(/[&;]/);
  for (let i = 0, len = parts.length; i < len; ++i) {
    const subparts = parts[i].split("=");
    const name = decodeURIComponent(subparts[0]);
    let value = subparts[1];
    if (defined_default(value)) {
      value = decodeURIComponent(value);
    } else {
      value = "";
    }
    const resultValue = result[name];
    if (typeof resultValue === "string") {
      result[name] = [resultValue, value];
    } else if (Array.isArray(resultValue)) {
      resultValue.push(value);
    } else {
      result[name] = value;
    }
  }
  return result;
}
var queryToObject_default = queryToObject;

// packages/engine/Source/Core/RequestState.js
var RequestState = {
  /**
   * Initial unissued state.
   *
   * @type {number}
   * @constant
   */
  UNISSUED: 0,
  /**
   * Issued but not yet active. Will become active when open slots are available.
   *
   * @type {number}
   * @constant
   */
  ISSUED: 1,
  /**
   * Actual http request has been sent.
   *
   * @type {number}
   * @constant
   */
  ACTIVE: 2,
  /**
   * Request completed successfully.
   *
   * @type {number}
   * @constant
   */
  RECEIVED: 3,
  /**
   * Request was cancelled, either explicitly or automatically because of low priority.
   *
   * @type {number}
   * @constant
   */
  CANCELLED: 4,
  /**
   * Request failed.
   *
   * @type {number}
   * @constant
   */
  FAILED: 5
};
var RequestState_default = Object.freeze(RequestState);

// packages/engine/Source/Core/RequestType.js
var RequestType = {
  /**
   * Terrain request.
   *
   * @type {number}
   * @constant
   */
  TERRAIN: 0,
  /**
   * Imagery request.
   *
   * @type {number}
   * @constant
   */
  IMAGERY: 1,
  /**
   * 3D Tiles request.
   *
   * @type {number}
   * @constant
   */
  TILES3D: 2,
  /**
   * Other request.
   *
   * @type {number}
   * @constant
   */
  OTHER: 3
};
var RequestType_default = Object.freeze(RequestType);

// packages/engine/Source/Core/Request.js
function Request(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const throttleByServer = defaultValue_default(options.throttleByServer, false);
  const throttle = defaultValue_default(options.throttle, false);
  this.url = options.url;
  this.requestFunction = options.requestFunction;
  this.cancelFunction = options.cancelFunction;
  this.priorityFunction = options.priorityFunction;
  this.priority = defaultValue_default(options.priority, 0);
  this.throttle = throttle;
  this.throttleByServer = throttleByServer;
  this.type = defaultValue_default(options.type, RequestType_default.OTHER);
  this.serverKey = options.serverKey;
  this.state = RequestState_default.UNISSUED;
  this.deferred = void 0;
  this.cancelled = false;
}
Request.prototype.cancel = function() {
  this.cancelled = true;
};
Request.prototype.clone = function(result) {
  if (!defined_default(result)) {
    return new Request(this);
  }
  result.url = this.url;
  result.requestFunction = this.requestFunction;
  result.cancelFunction = this.cancelFunction;
  result.priorityFunction = this.priorityFunction;
  result.priority = this.priority;
  result.throttle = this.throttle;
  result.throttleByServer = this.throttleByServer;
  result.type = this.type;
  result.serverKey = this.serverKey;
  result.state = RequestState_default.UNISSUED;
  result.deferred = void 0;
  result.cancelled = false;
  return result;
};
var Request_default = Request;

// packages/engine/Source/Core/parseResponseHeaders.js
function parseResponseHeaders(headerString) {
  const headers = {};
  if (!headerString) {
    return headers;
  }
  const headerPairs = headerString.split("\r\n");
  for (let i = 0; i < headerPairs.length; ++i) {
    const headerPair = headerPairs[i];
    const index = headerPair.indexOf(": ");
    if (index > 0) {
      const key = headerPair.substring(0, index);
      const val = headerPair.substring(index + 2);
      headers[key] = val;
    }
  }
  return headers;
}
var parseResponseHeaders_default = parseResponseHeaders;

// packages/engine/Source/Core/RequestErrorEvent.js
function RequestErrorEvent(statusCode, response, responseHeaders) {
  this.statusCode = statusCode;
  this.response = response;
  this.responseHeaders = responseHeaders;
  if (typeof this.responseHeaders === "string") {
    this.responseHeaders = parseResponseHeaders_default(this.responseHeaders);
  }
}
RequestErrorEvent.prototype.toString = function() {
  let str = "Request has failed.";
  if (defined_default(this.statusCode)) {
    str += ` Status Code: ${this.statusCode}`;
  }
  return str;
};
var RequestErrorEvent_default = RequestErrorEvent;

// packages/engine/Source/Core/RequestScheduler.js
var import_urijs4 = __toESM(require_URI(), 1);

// packages/engine/Source/Core/Event.js
function Event() {
  this._listeners = [];
  this._scopes = [];
  this._toRemove = [];
  this._insideRaiseEvent = false;
}
Object.defineProperties(Event.prototype, {
  /**
   * The number of listeners currently subscribed to the event.
   * @memberof Event.prototype
   * @type {number}
   * @readonly
   */
  numberOfListeners: {
    get: function() {
      return this._listeners.length - this._toRemove.length;
    }
  }
});
Event.prototype.addEventListener = function(listener, scope) {
  Check_default.typeOf.func("listener", listener);
  this._listeners.push(listener);
  this._scopes.push(scope);
  const event = this;
  return function() {
    event.removeEventListener(listener, scope);
  };
};
Event.prototype.removeEventListener = function(listener, scope) {
  Check_default.typeOf.func("listener", listener);
  const listeners = this._listeners;
  const scopes = this._scopes;
  let index = -1;
  for (let i = 0; i < listeners.length; i++) {
    if (listeners[i] === listener && scopes[i] === scope) {
      index = i;
      break;
    }
  }
  if (index !== -1) {
    if (this._insideRaiseEvent) {
      this._toRemove.push(index);
      listeners[index] = void 0;
      scopes[index] = void 0;
    } else {
      listeners.splice(index, 1);
      scopes.splice(index, 1);
    }
    return true;
  }
  return false;
};
function compareNumber(a3, b) {
  return b - a3;
}
Event.prototype.raiseEvent = function() {
  this._insideRaiseEvent = true;
  let i;
  const listeners = this._listeners;
  const scopes = this._scopes;
  let length = listeners.length;
  for (i = 0; i < length; i++) {
    const listener = listeners[i];
    if (defined_default(listener)) {
      listeners[i].apply(scopes[i], arguments);
    }
  }
  const toRemove = this._toRemove;
  length = toRemove.length;
  if (length > 0) {
    toRemove.sort(compareNumber);
    for (i = 0; i < length; i++) {
      const index = toRemove[i];
      listeners.splice(index, 1);
      scopes.splice(index, 1);
    }
    toRemove.length = 0;
  }
  this._insideRaiseEvent = false;
};
var Event_default = Event;

// packages/engine/Source/Core/Heap.js
function Heap(options) {
  Check_default.typeOf.object("options", options);
  Check_default.defined("options.comparator", options.comparator);
  this._comparator = options.comparator;
  this._array = [];
  this._length = 0;
  this._maximumLength = void 0;
}
Object.defineProperties(Heap.prototype, {
  /**
   * Gets the length of the heap.
   *
   * @memberof Heap.prototype
   *
   * @type {number}
   * @readonly
   */
  length: {
    get: function() {
      return this._length;
    }
  },
  /**
   * Gets the internal array.
   *
   * @memberof Heap.prototype
   *
   * @type {Array}
   * @readonly
   */
  internalArray: {
    get: function() {
      return this._array;
    }
  },
  /**
   * Gets and sets the maximum length of the heap.
   *
   * @memberof Heap.prototype
   *
   * @type {number}
   */
  maximumLength: {
    get: function() {
      return this._maximumLength;
    },
    set: function(value) {
      Check_default.typeOf.number.greaterThanOrEquals("maximumLength", value, 0);
      const originalLength = this._length;
      if (value < originalLength) {
        const array = this._array;
        for (let i = value; i < originalLength; ++i) {
          array[i] = void 0;
        }
        this._length = value;
        array.length = value;
      }
      this._maximumLength = value;
    }
  },
  /**
   * The comparator to use for the heap. If comparator(a, b) is less than 0, sort a to a lower index than b, otherwise sort to a higher index.
   *
   * @memberof Heap.prototype
   *
   * @type {Heap.ComparatorCallback}
   */
  comparator: {
    get: function() {
      return this._comparator;
    }
  }
});
function swap(array, a3, b) {
  const temp = array[a3];
  array[a3] = array[b];
  array[b] = temp;
}
Heap.prototype.reserve = function(length) {
  length = defaultValue_default(length, this._length);
  this._array.length = length;
};
Heap.prototype.heapify = function(index) {
  index = defaultValue_default(index, 0);
  const length = this._length;
  const comparator = this._comparator;
  const array = this._array;
  let candidate = -1;
  let inserting = true;
  while (inserting) {
    const right = 2 * (index + 1);
    const left = right - 1;
    if (left < length && comparator(array[left], array[index]) < 0) {
      candidate = left;
    } else {
      candidate = index;
    }
    if (right < length && comparator(array[right], array[candidate]) < 0) {
      candidate = right;
    }
    if (candidate !== index) {
      swap(array, candidate, index);
      index = candidate;
    } else {
      inserting = false;
    }
  }
};
Heap.prototype.resort = function() {
  const length = this._length;
  for (let i = Math.ceil(length / 2); i >= 0; --i) {
    this.heapify(i);
  }
};
Heap.prototype.insert = function(element) {
  Check_default.defined("element", element);
  const array = this._array;
  const comparator = this._comparator;
  const maximumLength = this._maximumLength;
  let index = this._length++;
  if (index < array.length) {
    array[index] = element;
  } else {
    array.push(element);
  }
  while (index !== 0) {
    const parent = Math.floor((index - 1) / 2);
    if (comparator(array[index], array[parent]) < 0) {
      swap(array, index, parent);
      index = parent;
    } else {
      break;
    }
  }
  let removedElement;
  if (defined_default(maximumLength) && this._length > maximumLength) {
    removedElement = array[maximumLength];
    this._length = maximumLength;
  }
  return removedElement;
};
Heap.prototype.pop = function(index) {
  index = defaultValue_default(index, 0);
  if (this._length === 0) {
    return void 0;
  }
  Check_default.typeOf.number.lessThan("index", index, this._length);
  const array = this._array;
  const root = array[index];
  swap(array, index, --this._length);
  this.heapify(index);
  array[this._length] = void 0;
  return root;
};
var Heap_default = Heap;

// packages/engine/Source/Core/RequestScheduler.js
function sortRequests(a3, b) {
  return a3.priority - b.priority;
}
var statistics = {
  numberOfAttemptedRequests: 0,
  numberOfActiveRequests: 0,
  numberOfCancelledRequests: 0,
  numberOfCancelledActiveRequests: 0,
  numberOfFailedRequests: 0,
  numberOfActiveRequestsEver: 0,
  lastNumberOfActiveRequests: 0
};
var priorityHeapLength = 20;
var requestHeap = new Heap_default({
  comparator: sortRequests
});
requestHeap.maximumLength = priorityHeapLength;
requestHeap.reserve(priorityHeapLength);
var activeRequests = [];
var numberOfActiveRequestsByServer = {};
var pageUri = typeof document !== "undefined" ? new import_urijs4.default(document.location.href) : new import_urijs4.default();
var requestCompletedEvent = new Event_default();
function RequestScheduler() {
}
RequestScheduler.maximumRequests = 50;
RequestScheduler.maximumRequestsPerServer = 6;
RequestScheduler.requestsByServer = {
  "api.cesium.com:443": 18,
  "assets.ion.cesium.com:443": 18,
  "ibasemaps-api.arcgis.com:443": 18,
  "tile.googleapis.com:443": 18,
  "tile.openstreetmap.org:443": 18
};
RequestScheduler.throttleRequests = true;
RequestScheduler.debugShowStatistics = false;
RequestScheduler.requestCompletedEvent = requestCompletedEvent;
Object.defineProperties(RequestScheduler, {
  /**
   * Returns the statistics used by the request scheduler.
   *
   * @memberof RequestScheduler
   *
   * @type {object}
   * @readonly
   * @private
   */
  statistics: {
    get: function() {
      return statistics;
    }
  },
  /**
   * The maximum size of the priority heap. This limits the number of requests that are sorted by priority. Only applies to requests that are not yet active.
   *
   * @memberof RequestScheduler
   *
   * @type {number}
   * @default 20
   * @private
   */
  priorityHeapLength: {
    get: function() {
      return priorityHeapLength;
    },
    set: function(value) {
      if (value < priorityHeapLength) {
        while (requestHeap.length > value) {
          const request = requestHeap.pop();
          cancelRequest(request);
        }
      }
      priorityHeapLength = value;
      requestHeap.maximumLength = value;
      requestHeap.reserve(value);
    }
  }
});
function updatePriority(request) {
  if (defined_default(request.priorityFunction)) {
    request.priority = request.priorityFunction();
  }
}
RequestScheduler.serverHasOpenSlots = function(serverKey, desiredRequests) {
  desiredRequests = defaultValue_default(desiredRequests, 1);
  const maxRequests = defaultValue_default(
    RequestScheduler.requestsByServer[serverKey],
    RequestScheduler.maximumRequestsPerServer
  );
  const hasOpenSlotsServer = numberOfActiveRequestsByServer[serverKey] + desiredRequests <= maxRequests;
  return hasOpenSlotsServer;
};
RequestScheduler.heapHasOpenSlots = function(desiredRequests) {
  const hasOpenSlotsHeap = requestHeap.length + desiredRequests <= priorityHeapLength;
  return hasOpenSlotsHeap;
};
function issueRequest(request) {
  if (request.state === RequestState_default.UNISSUED) {
    request.state = RequestState_default.ISSUED;
    request.deferred = defer_default();
  }
  return request.deferred.promise;
}
function getRequestReceivedFunction(request) {
  return function(results) {
    if (request.state === RequestState_default.CANCELLED) {
      return;
    }
    const deferred = request.deferred;
    --statistics.numberOfActiveRequests;
    --numberOfActiveRequestsByServer[request.serverKey];
    requestCompletedEvent.raiseEvent();
    request.state = RequestState_default.RECEIVED;
    request.deferred = void 0;
    deferred.resolve(results);
  };
}
function getRequestFailedFunction(request) {
  return function(error) {
    if (request.state === RequestState_default.CANCELLED) {
      return;
    }
    ++statistics.numberOfFailedRequests;
    --statistics.numberOfActiveRequests;
    --numberOfActiveRequestsByServer[request.serverKey];
    requestCompletedEvent.raiseEvent(error);
    request.state = RequestState_default.FAILED;
    request.deferred.reject(error);
  };
}
function startRequest(request) {
  const promise = issueRequest(request);
  request.state = RequestState_default.ACTIVE;
  activeRequests.push(request);
  ++statistics.numberOfActiveRequests;
  ++statistics.numberOfActiveRequestsEver;
  ++numberOfActiveRequestsByServer[request.serverKey];
  request.requestFunction().then(getRequestReceivedFunction(request)).catch(getRequestFailedFunction(request));
  return promise;
}
function cancelRequest(request) {
  const active = request.state === RequestState_default.ACTIVE;
  request.state = RequestState_default.CANCELLED;
  ++statistics.numberOfCancelledRequests;
  if (defined_default(request.deferred)) {
    const deferred = request.deferred;
    request.deferred = void 0;
    deferred.reject();
  }
  if (active) {
    --statistics.numberOfActiveRequests;
    --numberOfActiveRequestsByServer[request.serverKey];
    ++statistics.numberOfCancelledActiveRequests;
  }
  if (defined_default(request.cancelFunction)) {
    request.cancelFunction();
  }
}
RequestScheduler.update = function() {
  let i;
  let request;
  let removeCount = 0;
  const activeLength = activeRequests.length;
  for (i = 0; i < activeLength; ++i) {
    request = activeRequests[i];
    if (request.cancelled) {
      cancelRequest(request);
    }
    if (request.state !== RequestState_default.ACTIVE) {
      ++removeCount;
      continue;
    }
    if (removeCount > 0) {
      activeRequests[i - removeCount] = request;
    }
  }
  activeRequests.length -= removeCount;
  const issuedRequests = requestHeap.internalArray;
  const issuedLength = requestHeap.length;
  for (i = 0; i < issuedLength; ++i) {
    updatePriority(issuedRequests[i]);
  }
  requestHeap.resort();
  const openSlots = Math.max(
    RequestScheduler.maximumRequests - activeRequests.length,
    0
  );
  let filledSlots = 0;
  while (filledSlots < openSlots && requestHeap.length > 0) {
    request = requestHeap.pop();
    if (request.cancelled) {
      cancelRequest(request);
      continue;
    }
    if (request.throttleByServer && !RequestScheduler.serverHasOpenSlots(request.serverKey)) {
      cancelRequest(request);
      continue;
    }
    startRequest(request);
    ++filledSlots;
  }
  updateStatistics();
};
RequestScheduler.getServerKey = function(url) {
  Check_default.typeOf.string("url", url);
  let uri = new import_urijs4.default(url);
  if (uri.scheme() === "") {
    uri = uri.absoluteTo(pageUri);
    uri.normalize();
  }
  let serverKey = uri.authority();
  if (!/:/.test(serverKey)) {
    serverKey = `${serverKey}:${uri.scheme() === "https" ? "443" : "80"}`;
  }
  const length = numberOfActiveRequestsByServer[serverKey];
  if (!defined_default(length)) {
    numberOfActiveRequestsByServer[serverKey] = 0;
  }
  return serverKey;
};
RequestScheduler.request = function(request) {
  Check_default.typeOf.object("request", request);
  Check_default.typeOf.string("request.url", request.url);
  Check_default.typeOf.func("request.requestFunction", request.requestFunction);
  if (isDataUri_default(request.url) || isBlobUri_default(request.url)) {
    requestCompletedEvent.raiseEvent();
    request.state = RequestState_default.RECEIVED;
    return request.requestFunction();
  }
  ++statistics.numberOfAttemptedRequests;
  if (!defined_default(request.serverKey)) {
    request.serverKey = RequestScheduler.getServerKey(request.url);
  }
  if (RequestScheduler.throttleRequests && request.throttleByServer && !RequestScheduler.serverHasOpenSlots(request.serverKey)) {
    return void 0;
  }
  if (!RequestScheduler.throttleRequests || !request.throttle) {
    return startRequest(request);
  }
  if (activeRequests.length >= RequestScheduler.maximumRequests) {
    return void 0;
  }
  updatePriority(request);
  const removedRequest = requestHeap.insert(request);
  if (defined_default(removedRequest)) {
    if (removedRequest === request) {
      return void 0;
    }
    cancelRequest(removedRequest);
  }
  return issueRequest(request);
};
function updateStatistics() {
  if (!RequestScheduler.debugShowStatistics) {
    return;
  }
  if (statistics.numberOfActiveRequests === 0 && statistics.lastNumberOfActiveRequests > 0) {
    if (statistics.numberOfAttemptedRequests > 0) {
      console.log(
        `Number of attempted requests: ${statistics.numberOfAttemptedRequests}`
      );
      statistics.numberOfAttemptedRequests = 0;
    }
    if (statistics.numberOfCancelledRequests > 0) {
      console.log(
        `Number of cancelled requests: ${statistics.numberOfCancelledRequests}`
      );
      statistics.numberOfCancelledRequests = 0;
    }
    if (statistics.numberOfCancelledActiveRequests > 0) {
      console.log(
        `Number of cancelled active requests: ${statistics.numberOfCancelledActiveRequests}`
      );
      statistics.numberOfCancelledActiveRequests = 0;
    }
    if (statistics.numberOfFailedRequests > 0) {
      console.log(
        `Number of failed requests: ${statistics.numberOfFailedRequests}`
      );
      statistics.numberOfFailedRequests = 0;
    }
  }
  statistics.lastNumberOfActiveRequests = statistics.numberOfActiveRequests;
}
RequestScheduler.clearForSpecs = function() {
  while (requestHeap.length > 0) {
    const request = requestHeap.pop();
    cancelRequest(request);
  }
  const length = activeRequests.length;
  for (let i = 0; i < length; ++i) {
    cancelRequest(activeRequests[i]);
  }
  activeRequests.length = 0;
  numberOfActiveRequestsByServer = {};
  statistics.numberOfAttemptedRequests = 0;
  statistics.numberOfActiveRequests = 0;
  statistics.numberOfCancelledRequests = 0;
  statistics.numberOfCancelledActiveRequests = 0;
  statistics.numberOfFailedRequests = 0;
  statistics.numberOfActiveRequestsEver = 0;
  statistics.lastNumberOfActiveRequests = 0;
};
RequestScheduler.numberOfActiveRequestsByServer = function(serverKey) {
  return numberOfActiveRequestsByServer[serverKey];
};
RequestScheduler.requestHeap = requestHeap;
var RequestScheduler_default = RequestScheduler;

// packages/engine/Source/Core/TrustedServers.js
var import_urijs5 = __toESM(require_URI(), 1);
var TrustedServers = {};
var _servers = {};
TrustedServers.add = function(host, port) {
  if (!defined_default(host)) {
    throw new DeveloperError_default("host is required.");
  }
  if (!defined_default(port) || port <= 0) {
    throw new DeveloperError_default("port is required to be greater than 0.");
  }
  const authority = `${host.toLowerCase()}:${port}`;
  if (!defined_default(_servers[authority])) {
    _servers[authority] = true;
  }
};
TrustedServers.remove = function(host, port) {
  if (!defined_default(host)) {
    throw new DeveloperError_default("host is required.");
  }
  if (!defined_default(port) || port <= 0) {
    throw new DeveloperError_default("port is required to be greater than 0.");
  }
  const authority = `${host.toLowerCase()}:${port}`;
  if (defined_default(_servers[authority])) {
    delete _servers[authority];
  }
};
function getAuthority(url) {
  const uri = new import_urijs5.default(url);
  uri.normalize();
  let authority = uri.authority();
  if (authority.length === 0) {
    return void 0;
  }
  uri.authority(authority);
  if (authority.indexOf("@") !== -1) {
    const parts = authority.split("@");
    authority = parts[1];
  }
  if (authority.indexOf(":") === -1) {
    let scheme = uri.scheme();
    if (scheme.length === 0) {
      scheme = window.location.protocol;
      scheme = scheme.substring(0, scheme.length - 1);
    }
    if (scheme === "http") {
      authority += ":80";
    } else if (scheme === "https") {
      authority += ":443";
    } else {
      return void 0;
    }
  }
  return authority;
}
TrustedServers.contains = function(url) {
  if (!defined_default(url)) {
    throw new DeveloperError_default("url is required.");
  }
  const authority = getAuthority(url);
  if (defined_default(authority) && defined_default(_servers[authority])) {
    return true;
  }
  return false;
};
TrustedServers.clear = function() {
  _servers = {};
};
var TrustedServers_default = TrustedServers;

// packages/engine/Source/Core/Resource.js
var xhrBlobSupported = function() {
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", "#", true);
    xhr.responseType = "blob";
    return xhr.responseType === "blob";
  } catch (e) {
    return false;
  }
}();
function Resource(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  if (typeof options === "string") {
    options = {
      url: options
    };
  }
  Check_default.typeOf.string("options.url", options.url);
  this._url = void 0;
  this._templateValues = defaultClone(options.templateValues, {});
  this._queryParameters = defaultClone(options.queryParameters, {});
  this.headers = defaultClone(options.headers, {});
  this.request = defaultValue_default(options.request, new Request_default());
  this.proxy = options.proxy;
  this.retryCallback = options.retryCallback;
  this.retryAttempts = defaultValue_default(options.retryAttempts, 0);
  this._retryCount = 0;
  const parseUrl = defaultValue_default(options.parseUrl, true);
  if (parseUrl) {
    this.parseUrl(options.url, true, true);
  } else {
    this._url = options.url;
  }
  this._credits = options.credits;
}
function defaultClone(value, defaultValue) {
  return defined_default(value) ? clone_default(value) : defaultValue;
}
Resource.createIfNeeded = function(resource) {
  if (resource instanceof Resource) {
    return resource.getDerivedResource({
      request: resource.request
    });
  }
  if (typeof resource !== "string") {
    return resource;
  }
  return new Resource({
    url: resource
  });
};
var supportsImageBitmapOptionsPromise;
Resource.supportsImageBitmapOptions = function() {
  if (defined_default(supportsImageBitmapOptionsPromise)) {
    return supportsImageBitmapOptionsPromise;
  }
  if (typeof createImageBitmap !== "function") {
    supportsImageBitmapOptionsPromise = Promise.resolve(false);
    return supportsImageBitmapOptionsPromise;
  }
  const imageDataUri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAABGdBTUEAAE4g3rEiDgAAACBjSFJNAAB6JgAAgIQAAPoAAACA6AAAdTAAAOpgAAA6mAAAF3CculE8AAAADElEQVQI12Ng6GAAAAEUAIngE3ZiAAAAAElFTkSuQmCC";
  supportsImageBitmapOptionsPromise = Resource.fetchBlob({
    url: imageDataUri
  }).then(function(blob) {
    const imageBitmapOptions = {
      imageOrientation: "flipY",
      // default is "none"
      premultiplyAlpha: "none",
      // default is "default"
      colorSpaceConversion: "none"
      // default is "default"
    };
    return Promise.all([
      createImageBitmap(blob, imageBitmapOptions),
      createImageBitmap(blob)
    ]);
  }).then(function(imageBitmaps) {
    const colorWithOptions = getImagePixels_default(imageBitmaps[0]);
    const colorWithDefaults = getImagePixels_default(imageBitmaps[1]);
    return colorWithOptions[1] !== colorWithDefaults[1];
  }).catch(function() {
    return false;
  });
  return supportsImageBitmapOptionsPromise;
};
Object.defineProperties(Resource, {
  /**
   * Returns true if blobs are supported.
   *
   * @memberof Resource
   * @type {boolean}
   *
   * @readonly
   */
  isBlobSupported: {
    get: function() {
      return xhrBlobSupported;
    }
  }
});
Object.defineProperties(Resource.prototype, {
  /**
   * Query parameters appended to the url.
   *
   * @memberof Resource.prototype
   * @type {object}
   *
   * @readonly
   */
  queryParameters: {
    get: function() {
      return this._queryParameters;
    }
  },
  /**
   * The key/value pairs used to replace template parameters in the url.
   *
   * @memberof Resource.prototype
   * @type {object}
   *
   * @readonly
   */
  templateValues: {
    get: function() {
      return this._templateValues;
    }
  },
  /**
   * The url to the resource with template values replaced, query string appended and encoded by proxy if one was set.
   *
   * @memberof Resource.prototype
   * @type {string}
   */
  url: {
    get: function() {
      return this.getUrlComponent(true, true);
    },
    set: function(value) {
      this.parseUrl(value, false, false);
    }
  },
  /**
   * The file extension of the resource.
   *
   * @memberof Resource.prototype
   * @type {string}
   *
   * @readonly
   */
  extension: {
    get: function() {
      return getExtensionFromUri_default(this._url);
    }
  },
  /**
   * True if the Resource refers to a data URI.
   *
   * @memberof Resource.prototype
   * @type {boolean}
   */
  isDataUri: {
    get: function() {
      return isDataUri_default(this._url);
    }
  },
  /**
   * True if the Resource refers to a blob URI.
   *
   * @memberof Resource.prototype
   * @type {boolean}
   */
  isBlobUri: {
    get: function() {
      return isBlobUri_default(this._url);
    }
  },
  /**
   * True if the Resource refers to a cross origin URL.
   *
   * @memberof Resource.prototype
   * @type {boolean}
   */
  isCrossOriginUrl: {
    get: function() {
      return isCrossOriginUrl_default(this._url);
    }
  },
  /**
   * True if the Resource has request headers. This is equivalent to checking if the headers property has any keys.
   *
   * @memberof Resource.prototype
   * @type {boolean}
   */
  hasHeaders: {
    get: function() {
      return Object.keys(this.headers).length > 0;
    }
  },
  /**
   * Gets the credits required for attribution of an asset.
   * @private
   */
  credits: {
    get: function() {
      return this._credits;
    }
  }
});
Resource.prototype.toString = function() {
  return this.getUrlComponent(true, true);
};
Resource.prototype.parseUrl = function(url, merge, preserveQuery, baseUrl) {
  let uri = new import_urijs6.default(url);
  const query = parseQueryString(uri.query());
  this._queryParameters = merge ? combineQueryParameters(query, this.queryParameters, preserveQuery) : query;
  uri.search("");
  uri.fragment("");
  if (defined_default(baseUrl) && uri.scheme() === "") {
    uri = uri.absoluteTo(getAbsoluteUri_default(baseUrl));
  }
  this._url = uri.toString();
};
function parseQueryString(queryString) {
  if (queryString.length === 0) {
    return {};
  }
  if (queryString.indexOf("=") === -1) {
    return { [queryString]: void 0 };
  }
  return queryToObject_default(queryString);
}
function combineQueryParameters(q1, q2, preserveQueryParameters) {
  if (!preserveQueryParameters) {
    return combine_default(q1, q2);
  }
  const result = clone_default(q1, true);
  for (const param in q2) {
    if (q2.hasOwnProperty(param)) {
      let value = result[param];
      const q2Value = q2[param];
      if (defined_default(value)) {
        if (!Array.isArray(value)) {
          value = result[param] = [value];
        }
        result[param] = value.concat(q2Value);
      } else {
        result[param] = Array.isArray(q2Value) ? q2Value.slice() : q2Value;
      }
    }
  }
  return result;
}
Resource.prototype.getUrlComponent = function(query, proxy) {
  if (this.isDataUri) {
    return this._url;
  }
  let url = this._url;
  if (query) {
    url = `${url}${stringifyQuery(this.queryParameters)}`;
  }
  url = url.replace(/%7B/g, "{").replace(/%7D/g, "}");
  const templateValues = this._templateValues;
  if (Object.keys(templateValues).length > 0) {
    url = url.replace(/{(.*?)}/g, function(match, key) {
      const replacement = templateValues[key];
      if (defined_default(replacement)) {
        return encodeURIComponent(replacement);
      }
      return match;
    });
  }
  if (proxy && defined_default(this.proxy)) {
    url = this.proxy.getURL(url);
  }
  return url;
};
function stringifyQuery(queryObject) {
  const keys = Object.keys(queryObject);
  if (keys.length === 0) {
    return "";
  }
  if (keys.length === 1 && !defined_default(queryObject[keys[0]])) {
    return `?${keys[0]}`;
  }
  return `?${objectToQuery_default(queryObject)}`;
}
Resource.prototype.setQueryParameters = function(params, useAsDefault) {
  if (useAsDefault) {
    this._queryParameters = combineQueryParameters(
      this._queryParameters,
      params,
      false
    );
  } else {
    this._queryParameters = combineQueryParameters(
      params,
      this._queryParameters,
      false
    );
  }
};
Resource.prototype.appendQueryParameters = function(params) {
  this._queryParameters = combineQueryParameters(
    params,
    this._queryParameters,
    true
  );
};
Resource.prototype.setTemplateValues = function(template, useAsDefault) {
  if (useAsDefault) {
    this._templateValues = combine_default(this._templateValues, template);
  } else {
    this._templateValues = combine_default(template, this._templateValues);
  }
};
Resource.prototype.getDerivedResource = function(options) {
  const resource = this.clone();
  resource._retryCount = 0;
  if (defined_default(options.url)) {
    const preserveQuery = defaultValue_default(options.preserveQueryParameters, false);
    resource.parseUrl(options.url, true, preserveQuery, this._url);
  }
  if (defined_default(options.queryParameters)) {
    resource._queryParameters = combine_default(
      options.queryParameters,
      resource.queryParameters
    );
  }
  if (defined_default(options.templateValues)) {
    resource._templateValues = combine_default(
      options.templateValues,
      resource.templateValues
    );
  }
  if (defined_default(options.headers)) {
    resource.headers = combine_default(options.headers, resource.headers);
  }
  if (defined_default(options.proxy)) {
    resource.proxy = options.proxy;
  }
  if (defined_default(options.request)) {
    resource.request = options.request;
  }
  if (defined_default(options.retryCallback)) {
    resource.retryCallback = options.retryCallback;
  }
  if (defined_default(options.retryAttempts)) {
    resource.retryAttempts = options.retryAttempts;
  }
  return resource;
};
Resource.prototype.retryOnError = function(error) {
  const retryCallback = this.retryCallback;
  if (typeof retryCallback !== "function" || this._retryCount >= this.retryAttempts) {
    return Promise.resolve(false);
  }
  const that = this;
  return Promise.resolve(retryCallback(this, error)).then(function(result) {
    ++that._retryCount;
    return result;
  });
};
Resource.prototype.clone = function(result) {
  if (!defined_default(result)) {
    return new Resource({
      url: this._url,
      queryParameters: this.queryParameters,
      templateValues: this.templateValues,
      headers: this.headers,
      proxy: this.proxy,
      retryCallback: this.retryCallback,
      retryAttempts: this.retryAttempts,
      request: this.request.clone(),
      parseUrl: false,
      credits: defined_default(this.credits) ? this.credits.slice() : void 0
    });
  }
  result._url = this._url;
  result._queryParameters = clone_default(this._queryParameters);
  result._templateValues = clone_default(this._templateValues);
  result.headers = clone_default(this.headers);
  result.proxy = this.proxy;
  result.retryCallback = this.retryCallback;
  result.retryAttempts = this.retryAttempts;
  result._retryCount = 0;
  result.request = this.request.clone();
  return result;
};
Resource.prototype.getBaseUri = function(includeQuery) {
  return getBaseUri_default(this.getUrlComponent(includeQuery), includeQuery);
};
Resource.prototype.appendForwardSlash = function() {
  this._url = appendForwardSlash_default(this._url);
};
Resource.prototype.fetchArrayBuffer = function() {
  return this.fetch({
    responseType: "arraybuffer"
  });
};
Resource.fetchArrayBuffer = function(options) {
  const resource = new Resource(options);
  return resource.fetchArrayBuffer();
};
Resource.prototype.fetchBlob = function() {
  return this.fetch({
    responseType: "blob"
  });
};
Resource.fetchBlob = function(options) {
  const resource = new Resource(options);
  return resource.fetchBlob();
};
Resource.prototype.fetchImage = function(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const preferImageBitmap = defaultValue_default(options.preferImageBitmap, false);
  const preferBlob = defaultValue_default(options.preferBlob, false);
  const flipY = defaultValue_default(options.flipY, false);
  const skipColorSpaceConversion = defaultValue_default(
    options.skipColorSpaceConversion,
    false
  );
  checkAndResetRequest(this.request);
  if (!xhrBlobSupported || this.isDataUri || this.isBlobUri || !this.hasHeaders && !preferBlob) {
    return fetchImage({
      resource: this,
      flipY,
      skipColorSpaceConversion,
      preferImageBitmap
    });
  }
  const blobPromise = this.fetchBlob();
  if (!defined_default(blobPromise)) {
    return;
  }
  let supportsImageBitmap;
  let useImageBitmap;
  let generatedBlobResource;
  let generatedBlob;
  return Resource.supportsImageBitmapOptions().then(function(result) {
    supportsImageBitmap = result;
    useImageBitmap = supportsImageBitmap && preferImageBitmap;
    return blobPromise;
  }).then(function(blob) {
    if (!defined_default(blob)) {
      return;
    }
    generatedBlob = blob;
    if (useImageBitmap) {
      return Resource.createImageBitmapFromBlob(blob, {
        flipY,
        premultiplyAlpha: false,
        skipColorSpaceConversion
      });
    }
    const blobUrl = window.URL.createObjectURL(blob);
    generatedBlobResource = new Resource({
      url: blobUrl
    });
    return fetchImage({
      resource: generatedBlobResource,
      flipY,
      skipColorSpaceConversion,
      preferImageBitmap: false
    });
  }).then(function(image) {
    if (!defined_default(image)) {
      return;
    }
    image.blob = generatedBlob;
    if (useImageBitmap) {
      return image;
    }
    window.URL.revokeObjectURL(generatedBlobResource.url);
    return image;
  }).catch(function(error) {
    if (defined_default(generatedBlobResource)) {
      window.URL.revokeObjectURL(generatedBlobResource.url);
    }
    error.blob = generatedBlob;
    return Promise.reject(error);
  });
};
function fetchImage(options) {
  const resource = options.resource;
  const flipY = options.flipY;
  const skipColorSpaceConversion = options.skipColorSpaceConversion;
  const preferImageBitmap = options.preferImageBitmap;
  const request = resource.request;
  request.url = resource.url;
  request.requestFunction = function() {
    let crossOrigin = false;
    if (!resource.isDataUri && !resource.isBlobUri) {
      crossOrigin = resource.isCrossOriginUrl;
    }
    const deferred = defer_default();
    Resource._Implementations.createImage(
      request,
      crossOrigin,
      deferred,
      flipY,
      skipColorSpaceConversion,
      preferImageBitmap
    );
    return deferred.promise;
  };
  const promise = RequestScheduler_default.request(request);
  if (!defined_default(promise)) {
    return;
  }
  return promise.catch(function(e) {
    if (request.state !== RequestState_default.FAILED) {
      return Promise.reject(e);
    }
    return resource.retryOnError(e).then(function(retry) {
      if (retry) {
        request.state = RequestState_default.UNISSUED;
        request.deferred = void 0;
        return fetchImage({
          resource,
          flipY,
          skipColorSpaceConversion,
          preferImageBitmap
        });
      }
      return Promise.reject(e);
    });
  });
}
Resource.fetchImage = function(options) {
  const resource = new Resource(options);
  return resource.fetchImage({
    flipY: options.flipY,
    skipColorSpaceConversion: options.skipColorSpaceConversion,
    preferBlob: options.preferBlob,
    preferImageBitmap: options.preferImageBitmap
  });
};
Resource.prototype.fetchText = function() {
  return this.fetch({
    responseType: "text"
  });
};
Resource.fetchText = function(options) {
  const resource = new Resource(options);
  return resource.fetchText();
};
Resource.prototype.fetchJson = function() {
  const promise = this.fetch({
    responseType: "text",
    headers: {
      Accept: "application/json,*/*;q=0.01"
    }
  });
  if (!defined_default(promise)) {
    return void 0;
  }
  return promise.then(function(value) {
    if (!defined_default(value)) {
      return;
    }
    return JSON.parse(value);
  });
};
Resource.fetchJson = function(options) {
  const resource = new Resource(options);
  return resource.fetchJson();
};
Resource.prototype.fetchXML = function() {
  return this.fetch({
    responseType: "document",
    overrideMimeType: "text/xml"
  });
};
Resource.fetchXML = function(options) {
  const resource = new Resource(options);
  return resource.fetchXML();
};
Resource.prototype.fetchJsonp = function(callbackParameterName) {
  callbackParameterName = defaultValue_default(callbackParameterName, "callback");
  checkAndResetRequest(this.request);
  let functionName;
  do {
    functionName = `loadJsonp${Math_default.nextRandomNumber().toString().substring(2, 8)}`;
  } while (defined_default(window[functionName]));
  return fetchJsonp(this, callbackParameterName, functionName);
};
function fetchJsonp(resource, callbackParameterName, functionName) {
  const callbackQuery = {};
  callbackQuery[callbackParameterName] = functionName;
  resource.setQueryParameters(callbackQuery);
  const request = resource.request;
  const url = resource.url;
  request.url = url;
  request.requestFunction = function() {
    const deferred = defer_default();
    window[functionName] = function(data) {
      deferred.resolve(data);
      try {
        delete window[functionName];
      } catch (e) {
        window[functionName] = void 0;
      }
    };
    Resource._Implementations.loadAndExecuteScript(url, functionName, deferred);
    return deferred.promise;
  };
  const promise = RequestScheduler_default.request(request);
  if (!defined_default(promise)) {
    return;
  }
  return promise.catch(function(e) {
    if (request.state !== RequestState_default.FAILED) {
      return Promise.reject(e);
    }
    return resource.retryOnError(e).then(function(retry) {
      if (retry) {
        request.state = RequestState_default.UNISSUED;
        request.deferred = void 0;
        return fetchJsonp(resource, callbackParameterName, functionName);
      }
      return Promise.reject(e);
    });
  });
}
Resource.fetchJsonp = function(options) {
  const resource = new Resource(options);
  return resource.fetchJsonp(options.callbackParameterName);
};
Resource.prototype._makeRequest = function(options) {
  const resource = this;
  checkAndResetRequest(resource.request);
  const request = resource.request;
  const url = resource.url;
  request.url = url;
  request.requestFunction = function() {
    const responseType = options.responseType;
    const headers = combine_default(options.headers, resource.headers);
    const overrideMimeType = options.overrideMimeType;
    const method = options.method;
    const data = options.data;
    const deferred = defer_default();
    const xhr = Resource._Implementations.loadWithXhr(
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    );
    if (defined_default(xhr) && defined_default(xhr.abort)) {
      request.cancelFunction = function() {
        xhr.abort();
      };
    }
    return deferred.promise;
  };
  const promise = RequestScheduler_default.request(request);
  if (!defined_default(promise)) {
    return;
  }
  return promise.then(function(data) {
    request.cancelFunction = void 0;
    return data;
  }).catch(function(e) {
    request.cancelFunction = void 0;
    if (request.state !== RequestState_default.FAILED) {
      return Promise.reject(e);
    }
    return resource.retryOnError(e).then(function(retry) {
      if (retry) {
        request.state = RequestState_default.UNISSUED;
        request.deferred = void 0;
        return resource.fetch(options);
      }
      return Promise.reject(e);
    });
  });
};
function checkAndResetRequest(request) {
  if (request.state === RequestState_default.ISSUED || request.state === RequestState_default.ACTIVE) {
    throw new RuntimeError_default("The Resource is already being fetched.");
  }
  request.state = RequestState_default.UNISSUED;
  request.deferred = void 0;
}
var dataUriRegex2 = /^data:(.*?)(;base64)?,(.*)$/;
function decodeDataUriText(isBase64, data) {
  const result = decodeURIComponent(data);
  if (isBase64) {
    return atob(result);
  }
  return result;
}
function decodeDataUriArrayBuffer(isBase64, data) {
  const byteString = decodeDataUriText(isBase64, data);
  const buffer = new ArrayBuffer(byteString.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < byteString.length; i++) {
    view[i] = byteString.charCodeAt(i);
  }
  return buffer;
}
function decodeDataUri(dataUriRegexResult, responseType) {
  responseType = defaultValue_default(responseType, "");
  const mimeType = dataUriRegexResult[1];
  const isBase64 = !!dataUriRegexResult[2];
  const data = dataUriRegexResult[3];
  let buffer;
  let parser;
  switch (responseType) {
    case "":
    case "text":
      return decodeDataUriText(isBase64, data);
    case "arraybuffer":
      return decodeDataUriArrayBuffer(isBase64, data);
    case "blob":
      buffer = decodeDataUriArrayBuffer(isBase64, data);
      return new Blob([buffer], {
        type: mimeType
      });
    case "document":
      parser = new DOMParser();
      return parser.parseFromString(
        decodeDataUriText(isBase64, data),
        mimeType
      );
    case "json":
      return JSON.parse(decodeDataUriText(isBase64, data));
    default:
      throw new DeveloperError_default(`Unhandled responseType: ${responseType}`);
  }
}
Resource.prototype.fetch = function(options) {
  options = defaultClone(options, {});
  options.method = "GET";
  return this._makeRequest(options);
};
Resource.fetch = function(options) {
  const resource = new Resource(options);
  return resource.fetch({
    // Make copy of just the needed fields because headers can be passed to both the constructor and to fetch
    responseType: options.responseType,
    overrideMimeType: options.overrideMimeType
  });
};
Resource.prototype.delete = function(options) {
  options = defaultClone(options, {});
  options.method = "DELETE";
  return this._makeRequest(options);
};
Resource.delete = function(options) {
  const resource = new Resource(options);
  return resource.delete({
    // Make copy of just the needed fields because headers can be passed to both the constructor and to fetch
    responseType: options.responseType,
    overrideMimeType: options.overrideMimeType,
    data: options.data
  });
};
Resource.prototype.head = function(options) {
  options = defaultClone(options, {});
  options.method = "HEAD";
  return this._makeRequest(options);
};
Resource.head = function(options) {
  const resource = new Resource(options);
  return resource.head({
    // Make copy of just the needed fields because headers can be passed to both the constructor and to fetch
    responseType: options.responseType,
    overrideMimeType: options.overrideMimeType
  });
};
Resource.prototype.options = function(options) {
  options = defaultClone(options, {});
  options.method = "OPTIONS";
  return this._makeRequest(options);
};
Resource.options = function(options) {
  const resource = new Resource(options);
  return resource.options({
    // Make copy of just the needed fields because headers can be passed to both the constructor and to fetch
    responseType: options.responseType,
    overrideMimeType: options.overrideMimeType
  });
};
Resource.prototype.post = function(data, options) {
  Check_default.defined("data", data);
  options = defaultClone(options, {});
  options.method = "POST";
  options.data = data;
  return this._makeRequest(options);
};
Resource.post = function(options) {
  const resource = new Resource(options);
  return resource.post(options.data, {
    // Make copy of just the needed fields because headers can be passed to both the constructor and to post
    responseType: options.responseType,
    overrideMimeType: options.overrideMimeType
  });
};
Resource.prototype.put = function(data, options) {
  Check_default.defined("data", data);
  options = defaultClone(options, {});
  options.method = "PUT";
  options.data = data;
  return this._makeRequest(options);
};
Resource.put = function(options) {
  const resource = new Resource(options);
  return resource.put(options.data, {
    // Make copy of just the needed fields because headers can be passed to both the constructor and to post
    responseType: options.responseType,
    overrideMimeType: options.overrideMimeType
  });
};
Resource.prototype.patch = function(data, options) {
  Check_default.defined("data", data);
  options = defaultClone(options, {});
  options.method = "PATCH";
  options.data = data;
  return this._makeRequest(options);
};
Resource.patch = function(options) {
  const resource = new Resource(options);
  return resource.patch(options.data, {
    // Make copy of just the needed fields because headers can be passed to both the constructor and to post
    responseType: options.responseType,
    overrideMimeType: options.overrideMimeType
  });
};
Resource._Implementations = {};
Resource._Implementations.loadImageElement = function(url, crossOrigin, deferred) {
  const image = new Image();
  image.onload = function() {
    if (image.naturalWidth === 0 && image.naturalHeight === 0 && image.width === 0 && image.height === 0) {
      image.width = 300;
      image.height = 150;
    }
    deferred.resolve(image);
  };
  image.onerror = function(e) {
    deferred.reject(e);
  };
  if (crossOrigin) {
    if (TrustedServers_default.contains(url)) {
      image.crossOrigin = "use-credentials";
    } else {
      image.crossOrigin = "";
    }
  }
  image.src = url;
};
Resource._Implementations.createImage = function(request, crossOrigin, deferred, flipY, skipColorSpaceConversion, preferImageBitmap) {
  const url = request.url;
  Resource.supportsImageBitmapOptions().then(function(supportsImageBitmap) {
    if (!(supportsImageBitmap && preferImageBitmap)) {
      Resource._Implementations.loadImageElement(url, crossOrigin, deferred);
      return;
    }
    const responseType = "blob";
    const method = "GET";
    const xhrDeferred = defer_default();
    const xhr = Resource._Implementations.loadWithXhr(
      url,
      responseType,
      method,
      void 0,
      void 0,
      xhrDeferred,
      void 0,
      void 0,
      void 0
    );
    if (defined_default(xhr) && defined_default(xhr.abort)) {
      request.cancelFunction = function() {
        xhr.abort();
      };
    }
    return xhrDeferred.promise.then(function(blob) {
      if (!defined_default(blob)) {
        deferred.reject(
          new RuntimeError_default(
            `Successfully retrieved ${url} but it contained no content.`
          )
        );
        return;
      }
      return Resource.createImageBitmapFromBlob(blob, {
        flipY,
        premultiplyAlpha: false,
        skipColorSpaceConversion
      });
    }).then(function(image) {
      deferred.resolve(image);
    });
  }).catch(function(e) {
    deferred.reject(e);
  });
};
Resource.createImageBitmapFromBlob = function(blob, options) {
  Check_default.defined("options", options);
  Check_default.typeOf.bool("options.flipY", options.flipY);
  Check_default.typeOf.bool("options.premultiplyAlpha", options.premultiplyAlpha);
  Check_default.typeOf.bool(
    "options.skipColorSpaceConversion",
    options.skipColorSpaceConversion
  );
  return createImageBitmap(blob, {
    imageOrientation: options.flipY ? "flipY" : "none",
    premultiplyAlpha: options.premultiplyAlpha ? "premultiply" : "none",
    colorSpaceConversion: options.skipColorSpaceConversion ? "none" : "default"
  });
};
function decodeResponse(loadWithHttpResponse, responseType) {
  switch (responseType) {
    case "text":
      return loadWithHttpResponse.toString("utf8");
    case "json":
      return JSON.parse(loadWithHttpResponse.toString("utf8"));
    default:
      return new Uint8Array(loadWithHttpResponse).buffer;
  }
}
function loadWithHttpRequest(url, responseType, method, data, headers, deferred, overrideMimeType) {
  let URL;
  let zlib;
  Promise.all([import("url"), import("zlib")]).then(([urlImport, zlibImport]) => {
    URL = urlImport.parse(url);
    zlib = zlibImport;
    return URL.protocol === "https:" ? import("https") : import("http");
  }).then((http) => {
    const options = {
      protocol: URL.protocol,
      hostname: URL.hostname,
      port: URL.port,
      path: URL.path,
      query: URL.query,
      method,
      headers
    };
    http.request(options).on("response", function(res) {
      if (res.statusCode < 200 || res.statusCode >= 300) {
        deferred.reject(
          new RequestErrorEvent_default(res.statusCode, res, res.headers)
        );
        return;
      }
      const chunkArray = [];
      res.on("data", function(chunk) {
        chunkArray.push(chunk);
      });
      res.on("end", function() {
        const result = Buffer.concat(chunkArray);
        if (res.headers["content-encoding"] === "gzip") {
          zlib.gunzip(result, function(error, resultUnzipped) {
            if (error) {
              deferred.reject(
                new RuntimeError_default("Error decompressing response.")
              );
            } else {
              deferred.resolve(
                decodeResponse(resultUnzipped, responseType)
              );
            }
          });
        } else {
          deferred.resolve(decodeResponse(result, responseType));
        }
      });
    }).on("error", function(e) {
      deferred.reject(new RequestErrorEvent_default());
    }).end();
  });
}
var noXMLHttpRequest = typeof XMLHttpRequest === "undefined";
Resource._Implementations.loadWithXhr = function(url, responseType, method, data, headers, deferred, overrideMimeType) {
  const dataUriRegexResult = dataUriRegex2.exec(url);
  if (dataUriRegexResult !== null) {
    deferred.resolve(decodeDataUri(dataUriRegexResult, responseType));
    return;
  }
  if (noXMLHttpRequest) {
    loadWithHttpRequest(
      url,
      responseType,
      method,
      data,
      headers,
      deferred,
      overrideMimeType
    );
    return;
  }
  const xhr = new XMLHttpRequest();
  if (TrustedServers_default.contains(url)) {
    xhr.withCredentials = true;
  }
  xhr.open(method, url, true);
  if (defined_default(overrideMimeType) && defined_default(xhr.overrideMimeType)) {
    xhr.overrideMimeType(overrideMimeType);
  }
  if (defined_default(headers)) {
    for (const key in headers) {
      if (headers.hasOwnProperty(key)) {
        xhr.setRequestHeader(key, headers[key]);
      }
    }
  }
  if (defined_default(responseType)) {
    xhr.responseType = responseType;
  }
  let localFile = false;
  if (typeof url === "string") {
    localFile = url.indexOf("file://") === 0 || typeof window !== "undefined" && window.location.origin === "file://";
  }
  xhr.onload = function() {
    if ((xhr.status < 200 || xhr.status >= 300) && !(localFile && xhr.status === 0)) {
      deferred.reject(
        new RequestErrorEvent_default(
          xhr.status,
          xhr.response,
          xhr.getAllResponseHeaders()
        )
      );
      return;
    }
    const response = xhr.response;
    const browserResponseType = xhr.responseType;
    if (method === "HEAD" || method === "OPTIONS") {
      const responseHeaderString = xhr.getAllResponseHeaders();
      const splitHeaders = responseHeaderString.trim().split(/[\r\n]+/);
      const responseHeaders = {};
      splitHeaders.forEach(function(line) {
        const parts = line.split(": ");
        const header = parts.shift();
        responseHeaders[header] = parts.join(": ");
      });
      deferred.resolve(responseHeaders);
      return;
    }
    if (xhr.status === 204) {
      deferred.resolve();
    } else if (defined_default(response) && (!defined_default(responseType) || browserResponseType === responseType)) {
      deferred.resolve(response);
    } else if (responseType === "json" && typeof response === "string") {
      try {
        deferred.resolve(JSON.parse(response));
      } catch (e) {
        deferred.reject(e);
      }
    } else if ((browserResponseType === "" || browserResponseType === "document") && defined_default(xhr.responseXML) && xhr.responseXML.hasChildNodes()) {
      deferred.resolve(xhr.responseXML);
    } else if ((browserResponseType === "" || browserResponseType === "text") && defined_default(xhr.responseText)) {
      deferred.resolve(xhr.responseText);
    } else {
      deferred.reject(
        new RuntimeError_default("Invalid XMLHttpRequest response type.")
      );
    }
  };
  xhr.onerror = function(e) {
    deferred.reject(new RequestErrorEvent_default());
  };
  xhr.send(data);
  return xhr;
};
Resource._Implementations.loadAndExecuteScript = function(url, functionName, deferred) {
  return loadAndExecuteScript_default(url, functionName).catch(function(e) {
    deferred.reject(e);
  });
};
Resource._DefaultImplementations = {};
Resource._DefaultImplementations.createImage = Resource._Implementations.createImage;
Resource._DefaultImplementations.loadWithXhr = Resource._Implementations.loadWithXhr;
Resource._DefaultImplementations.loadAndExecuteScript = Resource._Implementations.loadAndExecuteScript;
Resource.DEFAULT = Object.freeze(
  new Resource({
    url: typeof document === "undefined" ? "" : document.location.href.split("?")[0]
  })
);
var Resource_default = Resource;

// packages/engine/Source/Core/EarthOrientationParameters.js
function EarthOrientationParameters(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  this._dates = void 0;
  this._samples = void 0;
  this._dateColumn = -1;
  this._xPoleWanderRadiansColumn = -1;
  this._yPoleWanderRadiansColumn = -1;
  this._ut1MinusUtcSecondsColumn = -1;
  this._xCelestialPoleOffsetRadiansColumn = -1;
  this._yCelestialPoleOffsetRadiansColumn = -1;
  this._taiMinusUtcSecondsColumn = -1;
  this._columnCount = 0;
  this._lastIndex = -1;
  this._addNewLeapSeconds = defaultValue_default(options.addNewLeapSeconds, true);
  if (defined_default(options.data)) {
    onDataReady(this, options.data);
  } else {
    onDataReady(this, {
      columnNames: [
        "dateIso8601",
        "modifiedJulianDateUtc",
        "xPoleWanderRadians",
        "yPoleWanderRadians",
        "ut1MinusUtcSeconds",
        "lengthOfDayCorrectionSeconds",
        "xCelestialPoleOffsetRadians",
        "yCelestialPoleOffsetRadians",
        "taiMinusUtcSeconds"
      ],
      samples: []
    });
  }
}
EarthOrientationParameters.fromUrl = async function(url, options) {
  Check_default.defined("url", url);
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  const resource = Resource_default.createIfNeeded(url);
  let eopData;
  try {
    eopData = await resource.fetchJson();
  } catch (e) {
    throw new RuntimeError_default(
      `An error occurred while retrieving the EOP data from the URL ${resource.url}.`
    );
  }
  return new EarthOrientationParameters({
    addNewLeapSeconds: options.addNewLeapSeconds,
    data: eopData
  });
};
EarthOrientationParameters.NONE = Object.freeze({
  compute: function(date, result) {
    if (!defined_default(result)) {
      result = new EarthOrientationParametersSample_default(0, 0, 0, 0, 0);
    } else {
      result.xPoleWander = 0;
      result.yPoleWander = 0;
      result.xPoleOffset = 0;
      result.yPoleOffset = 0;
      result.ut1MinusUtc = 0;
    }
    return result;
  }
});
EarthOrientationParameters.prototype.compute = function(date, result) {
  if (!defined_default(this._samples)) {
    return void 0;
  }
  if (!defined_default(result)) {
    result = new EarthOrientationParametersSample_default(0, 0, 0, 0, 0);
  }
  if (this._samples.length === 0) {
    result.xPoleWander = 0;
    result.yPoleWander = 0;
    result.xPoleOffset = 0;
    result.yPoleOffset = 0;
    result.ut1MinusUtc = 0;
    return result;
  }
  const dates = this._dates;
  const lastIndex = this._lastIndex;
  let before = 0;
  let after = 0;
  if (defined_default(lastIndex)) {
    const previousIndexDate = dates[lastIndex];
    const nextIndexDate = dates[lastIndex + 1];
    const isAfterPrevious = JulianDate_default.lessThanOrEquals(
      previousIndexDate,
      date
    );
    const isAfterLastSample = !defined_default(nextIndexDate);
    const isBeforeNext = isAfterLastSample || JulianDate_default.greaterThanOrEquals(nextIndexDate, date);
    if (isAfterPrevious && isBeforeNext) {
      before = lastIndex;
      if (!isAfterLastSample && nextIndexDate.equals(date)) {
        ++before;
      }
      after = before + 1;
      interpolate(this, dates, this._samples, date, before, after, result);
      return result;
    }
  }
  let index = binarySearch_default(dates, date, JulianDate_default.compare, this._dateColumn);
  if (index >= 0) {
    if (index < dates.length - 1 && dates[index + 1].equals(date)) {
      ++index;
    }
    before = index;
    after = index;
  } else {
    after = ~index;
    before = after - 1;
    if (before < 0) {
      before = 0;
    }
  }
  this._lastIndex = before;
  interpolate(this, dates, this._samples, date, before, after, result);
  return result;
};
function compareLeapSecondDates2(leapSecond, dateToFind) {
  return JulianDate_default.compare(leapSecond.julianDate, dateToFind);
}
function onDataReady(eop, eopData) {
  if (!defined_default(eopData.columnNames)) {
    throw new RuntimeError_default(
      "Error in loaded EOP data: The columnNames property is required."
    );
  }
  if (!defined_default(eopData.samples)) {
    throw new RuntimeError_default(
      "Error in loaded EOP data: The samples property is required."
    );
  }
  const dateColumn = eopData.columnNames.indexOf("modifiedJulianDateUtc");
  const xPoleWanderRadiansColumn = eopData.columnNames.indexOf(
    "xPoleWanderRadians"
  );
  const yPoleWanderRadiansColumn = eopData.columnNames.indexOf(
    "yPoleWanderRadians"
  );
  const ut1MinusUtcSecondsColumn = eopData.columnNames.indexOf(
    "ut1MinusUtcSeconds"
  );
  const xCelestialPoleOffsetRadiansColumn = eopData.columnNames.indexOf(
    "xCelestialPoleOffsetRadians"
  );
  const yCelestialPoleOffsetRadiansColumn = eopData.columnNames.indexOf(
    "yCelestialPoleOffsetRadians"
  );
  const taiMinusUtcSecondsColumn = eopData.columnNames.indexOf(
    "taiMinusUtcSeconds"
  );
  if (dateColumn < 0 || xPoleWanderRadiansColumn < 0 || yPoleWanderRadiansColumn < 0 || ut1MinusUtcSecondsColumn < 0 || xCelestialPoleOffsetRadiansColumn < 0 || yCelestialPoleOffsetRadiansColumn < 0 || taiMinusUtcSecondsColumn < 0) {
    throw new RuntimeError_default(
      "Error in loaded EOP data: The columnNames property must include modifiedJulianDateUtc, xPoleWanderRadians, yPoleWanderRadians, ut1MinusUtcSeconds, xCelestialPoleOffsetRadians, yCelestialPoleOffsetRadians, and taiMinusUtcSeconds columns"
    );
  }
  const samples = eop._samples = eopData.samples;
  const dates = eop._dates = [];
  eop._dateColumn = dateColumn;
  eop._xPoleWanderRadiansColumn = xPoleWanderRadiansColumn;
  eop._yPoleWanderRadiansColumn = yPoleWanderRadiansColumn;
  eop._ut1MinusUtcSecondsColumn = ut1MinusUtcSecondsColumn;
  eop._xCelestialPoleOffsetRadiansColumn = xCelestialPoleOffsetRadiansColumn;
  eop._yCelestialPoleOffsetRadiansColumn = yCelestialPoleOffsetRadiansColumn;
  eop._taiMinusUtcSecondsColumn = taiMinusUtcSecondsColumn;
  eop._columnCount = eopData.columnNames.length;
  eop._lastIndex = void 0;
  let lastTaiMinusUtc;
  const addNewLeapSeconds = eop._addNewLeapSeconds;
  for (let i = 0, len = samples.length; i < len; i += eop._columnCount) {
    const mjd = samples[i + dateColumn];
    const taiMinusUtc = samples[i + taiMinusUtcSecondsColumn];
    const day = mjd + TimeConstants_default.MODIFIED_JULIAN_DATE_DIFFERENCE;
    const date = new JulianDate_default(day, taiMinusUtc, TimeStandard_default.TAI);
    dates.push(date);
    if (addNewLeapSeconds) {
      if (taiMinusUtc !== lastTaiMinusUtc && defined_default(lastTaiMinusUtc)) {
        const leapSeconds = JulianDate_default.leapSeconds;
        const leapSecondIndex = binarySearch_default(
          leapSeconds,
          date,
          compareLeapSecondDates2
        );
        if (leapSecondIndex < 0) {
          const leapSecond = new LeapSecond_default(date, taiMinusUtc);
          leapSeconds.splice(~leapSecondIndex, 0, leapSecond);
        }
      }
      lastTaiMinusUtc = taiMinusUtc;
    }
  }
}
function fillResultFromIndex(eop, samples, index, columnCount, result) {
  const start = index * columnCount;
  result.xPoleWander = samples[start + eop._xPoleWanderRadiansColumn];
  result.yPoleWander = samples[start + eop._yPoleWanderRadiansColumn];
  result.xPoleOffset = samples[start + eop._xCelestialPoleOffsetRadiansColumn];
  result.yPoleOffset = samples[start + eop._yCelestialPoleOffsetRadiansColumn];
  result.ut1MinusUtc = samples[start + eop._ut1MinusUtcSecondsColumn];
}
function linearInterp(dx, y1, y2) {
  return y1 + dx * (y2 - y1);
}
function interpolate(eop, dates, samples, date, before, after, result) {
  const columnCount = eop._columnCount;
  if (after > dates.length - 1) {
    result.xPoleWander = 0;
    result.yPoleWander = 0;
    result.xPoleOffset = 0;
    result.yPoleOffset = 0;
    result.ut1MinusUtc = 0;
    return result;
  }
  const beforeDate = dates[before];
  const afterDate = dates[after];
  if (beforeDate.equals(afterDate) || date.equals(beforeDate)) {
    fillResultFromIndex(eop, samples, before, columnCount, result);
    return result;
  } else if (date.equals(afterDate)) {
    fillResultFromIndex(eop, samples, after, columnCount, result);
    return result;
  }
  const factor = JulianDate_default.secondsDifference(date, beforeDate) / JulianDate_default.secondsDifference(afterDate, beforeDate);
  const startBefore = before * columnCount;
  const startAfter = after * columnCount;
  let beforeUt1MinusUtc = samples[startBefore + eop._ut1MinusUtcSecondsColumn];
  let afterUt1MinusUtc = samples[startAfter + eop._ut1MinusUtcSecondsColumn];
  const offsetDifference = afterUt1MinusUtc - beforeUt1MinusUtc;
  if (offsetDifference > 0.5 || offsetDifference < -0.5) {
    const beforeTaiMinusUtc = samples[startBefore + eop._taiMinusUtcSecondsColumn];
    const afterTaiMinusUtc = samples[startAfter + eop._taiMinusUtcSecondsColumn];
    if (beforeTaiMinusUtc !== afterTaiMinusUtc) {
      if (afterDate.equals(date)) {
        beforeUt1MinusUtc = afterUt1MinusUtc;
      } else {
        afterUt1MinusUtc -= afterTaiMinusUtc - beforeTaiMinusUtc;
      }
    }
  }
  result.xPoleWander = linearInterp(
    factor,
    samples[startBefore + eop._xPoleWanderRadiansColumn],
    samples[startAfter + eop._xPoleWanderRadiansColumn]
  );
  result.yPoleWander = linearInterp(
    factor,
    samples[startBefore + eop._yPoleWanderRadiansColumn],
    samples[startAfter + eop._yPoleWanderRadiansColumn]
  );
  result.xPoleOffset = linearInterp(
    factor,
    samples[startBefore + eop._xCelestialPoleOffsetRadiansColumn],
    samples[startAfter + eop._xCelestialPoleOffsetRadiansColumn]
  );
  result.yPoleOffset = linearInterp(
    factor,
    samples[startBefore + eop._yCelestialPoleOffsetRadiansColumn],
    samples[startAfter + eop._yCelestialPoleOffsetRadiansColumn]
  );
  result.ut1MinusUtc = linearInterp(
    factor,
    beforeUt1MinusUtc,
    afterUt1MinusUtc
  );
  return result;
}
var EarthOrientationParameters_default = EarthOrientationParameters;

// packages/engine/Source/Core/HeadingPitchRoll.js
function HeadingPitchRoll(heading, pitch, roll) {
  this.heading = defaultValue_default(heading, 0);
  this.pitch = defaultValue_default(pitch, 0);
  this.roll = defaultValue_default(roll, 0);
}
HeadingPitchRoll.fromQuaternion = function(quaternion, result) {
  if (!defined_default(quaternion)) {
    throw new DeveloperError_default("quaternion is required");
  }
  if (!defined_default(result)) {
    result = new HeadingPitchRoll();
  }
  const test = 2 * (quaternion.w * quaternion.y - quaternion.z * quaternion.x);
  const denominatorRoll = 1 - 2 * (quaternion.x * quaternion.x + quaternion.y * quaternion.y);
  const numeratorRoll = 2 * (quaternion.w * quaternion.x + quaternion.y * quaternion.z);
  const denominatorHeading = 1 - 2 * (quaternion.y * quaternion.y + quaternion.z * quaternion.z);
  const numeratorHeading = 2 * (quaternion.w * quaternion.z + quaternion.x * quaternion.y);
  result.heading = -Math.atan2(numeratorHeading, denominatorHeading);
  result.roll = Math.atan2(numeratorRoll, denominatorRoll);
  result.pitch = -Math_default.asinClamped(test);
  return result;
};
HeadingPitchRoll.fromDegrees = function(heading, pitch, roll, result) {
  if (!defined_default(heading)) {
    throw new DeveloperError_default("heading is required");
  }
  if (!defined_default(pitch)) {
    throw new DeveloperError_default("pitch is required");
  }
  if (!defined_default(roll)) {
    throw new DeveloperError_default("roll is required");
  }
  if (!defined_default(result)) {
    result = new HeadingPitchRoll();
  }
  result.heading = heading * Math_default.RADIANS_PER_DEGREE;
  result.pitch = pitch * Math_default.RADIANS_PER_DEGREE;
  result.roll = roll * Math_default.RADIANS_PER_DEGREE;
  return result;
};
HeadingPitchRoll.clone = function(headingPitchRoll, result) {
  if (!defined_default(headingPitchRoll)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new HeadingPitchRoll(
      headingPitchRoll.heading,
      headingPitchRoll.pitch,
      headingPitchRoll.roll
    );
  }
  result.heading = headingPitchRoll.heading;
  result.pitch = headingPitchRoll.pitch;
  result.roll = headingPitchRoll.roll;
  return result;
};
HeadingPitchRoll.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left.heading === right.heading && left.pitch === right.pitch && left.roll === right.roll;
};
HeadingPitchRoll.equalsEpsilon = function(left, right, relativeEpsilon, absoluteEpsilon) {
  return left === right || defined_default(left) && defined_default(right) && Math_default.equalsEpsilon(
    left.heading,
    right.heading,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    left.pitch,
    right.pitch,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    left.roll,
    right.roll,
    relativeEpsilon,
    absoluteEpsilon
  );
};
HeadingPitchRoll.prototype.clone = function(result) {
  return HeadingPitchRoll.clone(this, result);
};
HeadingPitchRoll.prototype.equals = function(right) {
  return HeadingPitchRoll.equals(this, right);
};
HeadingPitchRoll.prototype.equalsEpsilon = function(right, relativeEpsilon, absoluteEpsilon) {
  return HeadingPitchRoll.equalsEpsilon(
    this,
    right,
    relativeEpsilon,
    absoluteEpsilon
  );
};
HeadingPitchRoll.prototype.toString = function() {
  return `(${this.heading}, ${this.pitch}, ${this.roll})`;
};
var HeadingPitchRoll_default = HeadingPitchRoll;

// packages/engine/Source/Core/buildModuleUrl.js
var cesiumScriptRegex = /((?:.*\/)|^)Cesium\.js(?:\?|\#|$)/;
function getBaseUrlFromCesiumScript() {
  const scripts = document.getElementsByTagName("script");
  for (let i = 0, len = scripts.length; i < len; ++i) {
    const src = scripts[i].getAttribute("src");
    const result = cesiumScriptRegex.exec(src);
    if (result !== null) {
      return result[1];
    }
  }
  return void 0;
}
var a2;
function tryMakeAbsolute(url) {
  if (typeof document === "undefined") {
    return url;
  }
  if (!defined_default(a2)) {
    a2 = document.createElement("a");
  }
  a2.href = url;
  return a2.href;
}
var baseResource;
function getCesiumBaseUrl() {
  if (defined_default(baseResource)) {
    return baseResource;
  }
  let baseUrlString;
  if (typeof CESIUM_BASE_URL !== "undefined") {
    baseUrlString = CESIUM_BASE_URL;
  } else if (defined_default(import.meta?.url)) {
    baseUrlString = getAbsoluteUri_default(".", import.meta.url);
  } else if (typeof define === "object" && defined_default(define.amd) && !define.amd.toUrlUndefined && defined_default(__require.toUrl)) {
    baseUrlString = getAbsoluteUri_default(
      "..",
      buildModuleUrl("Core/buildModuleUrl.js")
    );
  } else {
    baseUrlString = getBaseUrlFromCesiumScript();
  }
  if (!defined_default(baseUrlString)) {
    throw new DeveloperError_default(
      "Unable to determine Cesium base URL automatically, try defining a global variable called CESIUM_BASE_URL."
    );
  }
  baseResource = new Resource_default({
    url: tryMakeAbsolute(baseUrlString)
  });
  baseResource.appendForwardSlash();
  return baseResource;
}
function buildModuleUrlFromRequireToUrl(moduleID) {
  return tryMakeAbsolute(__require.toUrl(`../${moduleID}`));
}
function buildModuleUrlFromBaseUrl(moduleID) {
  const resource = getCesiumBaseUrl().getDerivedResource({
    url: moduleID
  });
  return resource.url;
}
var implementation;
function buildModuleUrl(relativeUrl) {
  if (!defined_default(implementation)) {
    if (typeof define === "object" && defined_default(define.amd) && !define.amd.toUrlUndefined && defined_default(__require.toUrl)) {
      implementation = buildModuleUrlFromRequireToUrl;
    } else {
      implementation = buildModuleUrlFromBaseUrl;
    }
  }
  const url = implementation(relativeUrl);
  return url;
}
buildModuleUrl._cesiumScriptRegex = cesiumScriptRegex;
buildModuleUrl._buildModuleUrlFromBaseUrl = buildModuleUrlFromBaseUrl;
buildModuleUrl._clearBaseResource = function() {
  baseResource = void 0;
};
buildModuleUrl.setBaseUrl = function(value) {
  baseResource = Resource_default.DEFAULT.getDerivedResource({
    url: value
  });
};
buildModuleUrl.getCesiumBaseUrl = getCesiumBaseUrl;
var buildModuleUrl_default = buildModuleUrl;

// packages/engine/Source/Core/Iau2006XysSample.js
function Iau2006XysSample(x, y, s) {
  this.x = x;
  this.y = y;
  this.s = s;
}
var Iau2006XysSample_default = Iau2006XysSample;

// packages/engine/Source/Core/Iau2006XysData.js
function Iau2006XysData(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  this._xysFileUrlTemplate = Resource_default.createIfNeeded(
    options.xysFileUrlTemplate
  );
  this._interpolationOrder = defaultValue_default(options.interpolationOrder, 9);
  this._sampleZeroJulianEphemerisDate = defaultValue_default(
    options.sampleZeroJulianEphemerisDate,
    24423965e-1
  );
  this._sampleZeroDateTT = new JulianDate_default(
    this._sampleZeroJulianEphemerisDate,
    0,
    TimeStandard_default.TAI
  );
  this._stepSizeDays = defaultValue_default(options.stepSizeDays, 1);
  this._samplesPerXysFile = defaultValue_default(options.samplesPerXysFile, 1e3);
  this._totalSamples = defaultValue_default(options.totalSamples, 27426);
  this._samples = new Array(this._totalSamples * 3);
  this._chunkDownloadsInProgress = [];
  const order = this._interpolationOrder;
  const denom = this._denominators = new Array(order + 1);
  const xTable = this._xTable = new Array(order + 1);
  const stepN = Math.pow(this._stepSizeDays, order);
  for (let i = 0; i <= order; ++i) {
    denom[i] = stepN;
    xTable[i] = i * this._stepSizeDays;
    for (let j = 0; j <= order; ++j) {
      if (j !== i) {
        denom[i] *= i - j;
      }
    }
    denom[i] = 1 / denom[i];
  }
  this._work = new Array(order + 1);
  this._coef = new Array(order + 1);
}
var julianDateScratch = new JulianDate_default(0, 0, TimeStandard_default.TAI);
function getDaysSinceEpoch(xys, dayTT, secondTT) {
  const dateTT = julianDateScratch;
  dateTT.dayNumber = dayTT;
  dateTT.secondsOfDay = secondTT;
  return JulianDate_default.daysDifference(dateTT, xys._sampleZeroDateTT);
}
Iau2006XysData.prototype.preload = function(startDayTT, startSecondTT, stopDayTT, stopSecondTT) {
  const startDaysSinceEpoch = getDaysSinceEpoch(
    this,
    startDayTT,
    startSecondTT
  );
  const stopDaysSinceEpoch = getDaysSinceEpoch(this, stopDayTT, stopSecondTT);
  let startIndex = startDaysSinceEpoch / this._stepSizeDays - this._interpolationOrder / 2 | 0;
  if (startIndex < 0) {
    startIndex = 0;
  }
  let stopIndex = stopDaysSinceEpoch / this._stepSizeDays - this._interpolationOrder / 2 | 0 + this._interpolationOrder;
  if (stopIndex >= this._totalSamples) {
    stopIndex = this._totalSamples - 1;
  }
  const startChunk = startIndex / this._samplesPerXysFile | 0;
  const stopChunk = stopIndex / this._samplesPerXysFile | 0;
  const promises = [];
  for (let i = startChunk; i <= stopChunk; ++i) {
    promises.push(requestXysChunk(this, i));
  }
  return Promise.all(promises);
};
Iau2006XysData.prototype.computeXysRadians = function(dayTT, secondTT, result) {
  const daysSinceEpoch = getDaysSinceEpoch(this, dayTT, secondTT);
  if (daysSinceEpoch < 0) {
    return void 0;
  }
  const centerIndex = daysSinceEpoch / this._stepSizeDays | 0;
  if (centerIndex >= this._totalSamples) {
    return void 0;
  }
  const degree = this._interpolationOrder;
  let firstIndex = centerIndex - (degree / 2 | 0);
  if (firstIndex < 0) {
    firstIndex = 0;
  }
  let lastIndex = firstIndex + degree;
  if (lastIndex >= this._totalSamples) {
    lastIndex = this._totalSamples - 1;
    firstIndex = lastIndex - degree;
    if (firstIndex < 0) {
      firstIndex = 0;
    }
  }
  let isDataMissing = false;
  const samples = this._samples;
  if (!defined_default(samples[firstIndex * 3])) {
    requestXysChunk(this, firstIndex / this._samplesPerXysFile | 0);
    isDataMissing = true;
  }
  if (!defined_default(samples[lastIndex * 3])) {
    requestXysChunk(this, lastIndex / this._samplesPerXysFile | 0);
    isDataMissing = true;
  }
  if (isDataMissing) {
    return void 0;
  }
  if (!defined_default(result)) {
    result = new Iau2006XysSample_default(0, 0, 0);
  } else {
    result.x = 0;
    result.y = 0;
    result.s = 0;
  }
  const x = daysSinceEpoch - firstIndex * this._stepSizeDays;
  const work = this._work;
  const denom = this._denominators;
  const coef = this._coef;
  const xTable = this._xTable;
  let i, j;
  for (i = 0; i <= degree; ++i) {
    work[i] = x - xTable[i];
  }
  for (i = 0; i <= degree; ++i) {
    coef[i] = 1;
    for (j = 0; j <= degree; ++j) {
      if (j !== i) {
        coef[i] *= work[j];
      }
    }
    coef[i] *= denom[i];
    let sampleIndex = (firstIndex + i) * 3;
    result.x += coef[i] * samples[sampleIndex++];
    result.y += coef[i] * samples[sampleIndex++];
    result.s += coef[i] * samples[sampleIndex];
  }
  return result;
};
function requestXysChunk(xysData, chunkIndex) {
  if (xysData._chunkDownloadsInProgress[chunkIndex]) {
    return xysData._chunkDownloadsInProgress[chunkIndex];
  }
  let chunkUrl;
  const xysFileUrlTemplate = xysData._xysFileUrlTemplate;
  if (defined_default(xysFileUrlTemplate)) {
    chunkUrl = xysFileUrlTemplate.getDerivedResource({
      templateValues: {
        0: chunkIndex
      }
    });
  } else {
    chunkUrl = new Resource_default({
      url: buildModuleUrl_default(`Assets/IAU2006_XYS/IAU2006_XYS_${chunkIndex}.json`)
    });
  }
  const promise = chunkUrl.fetchJson().then(function(chunk) {
    xysData._chunkDownloadsInProgress[chunkIndex] = false;
    const samples = xysData._samples;
    const newSamples = chunk.samples;
    const startIndex = chunkIndex * xysData._samplesPerXysFile * 3;
    for (let i = 0, len = newSamples.length; i < len; ++i) {
      samples[startIndex + i] = newSamples[i];
    }
  });
  xysData._chunkDownloadsInProgress[chunkIndex] = promise;
  return promise;
}
var Iau2006XysData_default = Iau2006XysData;

// packages/engine/Source/Core/Fullscreen.js
var _supportsFullscreen;
var _names = {
  requestFullscreen: void 0,
  exitFullscreen: void 0,
  fullscreenEnabled: void 0,
  fullscreenElement: void 0,
  fullscreenchange: void 0,
  fullscreenerror: void 0
};
var Fullscreen = {};
Object.defineProperties(Fullscreen, {
  /**
   * The element that is currently fullscreen, if any.  To simply check if the
   * browser is in fullscreen mode or not, use {@link Fullscreen#fullscreen}.
   * @memberof Fullscreen
   * @type {object}
   * @readonly
   */
  element: {
    get: function() {
      if (!Fullscreen.supportsFullscreen()) {
        return void 0;
      }
      return document[_names.fullscreenElement];
    }
  },
  /**
   * The name of the event on the document that is fired when fullscreen is
   * entered or exited.  This event name is intended for use with addEventListener.
   * In your event handler, to determine if the browser is in fullscreen mode or not,
   * use {@link Fullscreen#fullscreen}.
   * @memberof Fullscreen
   * @type {string}
   * @readonly
   */
  changeEventName: {
    get: function() {
      if (!Fullscreen.supportsFullscreen()) {
        return void 0;
      }
      return _names.fullscreenchange;
    }
  },
  /**
   * The name of the event that is fired when a fullscreen error
   * occurs.  This event name is intended for use with addEventListener.
   * @memberof Fullscreen
   * @type {string}
   * @readonly
   */
  errorEventName: {
    get: function() {
      if (!Fullscreen.supportsFullscreen()) {
        return void 0;
      }
      return _names.fullscreenerror;
    }
  },
  /**
   * Determine whether the browser will allow an element to be made fullscreen, or not.
   * For example, by default, iframes cannot go fullscreen unless the containing page
   * adds an "allowfullscreen" attribute (or prefixed equivalent).
   * @memberof Fullscreen
   * @type {boolean}
   * @readonly
   */
  enabled: {
    get: function() {
      if (!Fullscreen.supportsFullscreen()) {
        return void 0;
      }
      return document[_names.fullscreenEnabled];
    }
  },
  /**
   * Determines if the browser is currently in fullscreen mode.
   * @memberof Fullscreen
   * @type {boolean}
   * @readonly
   */
  fullscreen: {
    get: function() {
      if (!Fullscreen.supportsFullscreen()) {
        return void 0;
      }
      return Fullscreen.element !== null;
    }
  }
});
Fullscreen.supportsFullscreen = function() {
  if (defined_default(_supportsFullscreen)) {
    return _supportsFullscreen;
  }
  _supportsFullscreen = false;
  const body = document.body;
  if (typeof body.requestFullscreen === "function") {
    _names.requestFullscreen = "requestFullscreen";
    _names.exitFullscreen = "exitFullscreen";
    _names.fullscreenEnabled = "fullscreenEnabled";
    _names.fullscreenElement = "fullscreenElement";
    _names.fullscreenchange = "fullscreenchange";
    _names.fullscreenerror = "fullscreenerror";
    _supportsFullscreen = true;
    return _supportsFullscreen;
  }
  const prefixes = ["webkit", "moz", "o", "ms", "khtml"];
  let name;
  for (let i = 0, len = prefixes.length; i < len; ++i) {
    const prefix = prefixes[i];
    name = `${prefix}RequestFullscreen`;
    if (typeof body[name] === "function") {
      _names.requestFullscreen = name;
      _supportsFullscreen = true;
    } else {
      name = `${prefix}RequestFullScreen`;
      if (typeof body[name] === "function") {
        _names.requestFullscreen = name;
        _supportsFullscreen = true;
      }
    }
    name = `${prefix}ExitFullscreen`;
    if (typeof document[name] === "function") {
      _names.exitFullscreen = name;
    } else {
      name = `${prefix}CancelFullScreen`;
      if (typeof document[name] === "function") {
        _names.exitFullscreen = name;
      }
    }
    name = `${prefix}FullscreenEnabled`;
    if (document[name] !== void 0) {
      _names.fullscreenEnabled = name;
    } else {
      name = `${prefix}FullScreenEnabled`;
      if (document[name] !== void 0) {
        _names.fullscreenEnabled = name;
      }
    }
    name = `${prefix}FullscreenElement`;
    if (document[name] !== void 0) {
      _names.fullscreenElement = name;
    } else {
      name = `${prefix}FullScreenElement`;
      if (document[name] !== void 0) {
        _names.fullscreenElement = name;
      }
    }
    name = `${prefix}fullscreenchange`;
    if (document[`on${name}`] !== void 0) {
      if (prefix === "ms") {
        name = "MSFullscreenChange";
      }
      _names.fullscreenchange = name;
    }
    name = `${prefix}fullscreenerror`;
    if (document[`on${name}`] !== void 0) {
      if (prefix === "ms") {
        name = "MSFullscreenError";
      }
      _names.fullscreenerror = name;
    }
  }
  return _supportsFullscreen;
};
Fullscreen.requestFullscreen = function(element, vrDevice) {
  if (!Fullscreen.supportsFullscreen()) {
    return;
  }
  element[_names.requestFullscreen]({ vrDisplay: vrDevice });
};
Fullscreen.exitFullscreen = function() {
  if (!Fullscreen.supportsFullscreen()) {
    return;
  }
  document[_names.exitFullscreen]();
};
Fullscreen._names = _names;
var Fullscreen_default = Fullscreen;

// packages/engine/Source/Core/FeatureDetection.js
var theNavigator;
if (typeof navigator !== "undefined") {
  theNavigator = navigator;
} else {
  theNavigator = {};
}
function extractVersion(versionString) {
  const parts = versionString.split(".");
  for (let i = 0, len = parts.length; i < len; ++i) {
    parts[i] = parseInt(parts[i], 10);
  }
  return parts;
}
var isChromeResult;
var chromeVersionResult;
function isChrome() {
  if (!defined_default(isChromeResult)) {
    isChromeResult = false;
    if (!isEdge()) {
      const fields = / Chrome\/([\.0-9]+)/.exec(theNavigator.userAgent);
      if (fields !== null) {
        isChromeResult = true;
        chromeVersionResult = extractVersion(fields[1]);
      }
    }
  }
  return isChromeResult;
}
function chromeVersion() {
  return isChrome() && chromeVersionResult;
}
var isSafariResult;
var safariVersionResult;
function isSafari() {
  if (!defined_default(isSafariResult)) {
    isSafariResult = false;
    if (!isChrome() && !isEdge() && / Safari\/[\.0-9]+/.test(theNavigator.userAgent)) {
      const fields = / Version\/([\.0-9]+)/.exec(theNavigator.userAgent);
      if (fields !== null) {
        isSafariResult = true;
        safariVersionResult = extractVersion(fields[1]);
      }
    }
  }
  return isSafariResult;
}
function safariVersion() {
  return isSafari() && safariVersionResult;
}
var isWebkitResult;
var webkitVersionResult;
function isWebkit() {
  if (!defined_default(isWebkitResult)) {
    isWebkitResult = false;
    const fields = / AppleWebKit\/([\.0-9]+)(\+?)/.exec(theNavigator.userAgent);
    if (fields !== null) {
      isWebkitResult = true;
      webkitVersionResult = extractVersion(fields[1]);
      webkitVersionResult.isNightly = !!fields[2];
    }
  }
  return isWebkitResult;
}
function webkitVersion() {
  return isWebkit() && webkitVersionResult;
}
var isInternetExplorerResult;
var internetExplorerVersionResult;
function isInternetExplorer() {
  if (!defined_default(isInternetExplorerResult)) {
    isInternetExplorerResult = false;
    let fields;
    if (theNavigator.appName === "Microsoft Internet Explorer") {
      fields = /MSIE ([0-9]{1,}[\.0-9]{0,})/.exec(theNavigator.userAgent);
      if (fields !== null) {
        isInternetExplorerResult = true;
        internetExplorerVersionResult = extractVersion(fields[1]);
      }
    } else if (theNavigator.appName === "Netscape") {
      fields = /Trident\/.*rv:([0-9]{1,}[\.0-9]{0,})/.exec(
        theNavigator.userAgent
      );
      if (fields !== null) {
        isInternetExplorerResult = true;
        internetExplorerVersionResult = extractVersion(fields[1]);
      }
    }
  }
  return isInternetExplorerResult;
}
function internetExplorerVersion() {
  return isInternetExplorer() && internetExplorerVersionResult;
}
var isEdgeResult;
var edgeVersionResult;
function isEdge() {
  if (!defined_default(isEdgeResult)) {
    isEdgeResult = false;
    const fields = / Edg\/([\.0-9]+)/.exec(theNavigator.userAgent);
    if (fields !== null) {
      isEdgeResult = true;
      edgeVersionResult = extractVersion(fields[1]);
    }
  }
  return isEdgeResult;
}
function edgeVersion() {
  return isEdge() && edgeVersionResult;
}
var isFirefoxResult;
var firefoxVersionResult;
function isFirefox() {
  if (!defined_default(isFirefoxResult)) {
    isFirefoxResult = false;
    const fields = /Firefox\/([\.0-9]+)/.exec(theNavigator.userAgent);
    if (fields !== null) {
      isFirefoxResult = true;
      firefoxVersionResult = extractVersion(fields[1]);
    }
  }
  return isFirefoxResult;
}
var isWindowsResult;
function isWindows() {
  if (!defined_default(isWindowsResult)) {
    isWindowsResult = /Windows/i.test(theNavigator.appVersion);
  }
  return isWindowsResult;
}
var isIPadOrIOSResult;
function isIPadOrIOS() {
  if (!defined_default(isIPadOrIOSResult)) {
    isIPadOrIOSResult = navigator.platform === "iPhone" || navigator.platform === "iPod" || navigator.platform === "iPad";
  }
  return isIPadOrIOSResult;
}
function firefoxVersion() {
  return isFirefox() && firefoxVersionResult;
}
var hasPointerEvents;
function supportsPointerEvents() {
  if (!defined_default(hasPointerEvents)) {
    hasPointerEvents = !isFirefox() && typeof PointerEvent !== "undefined" && (!defined_default(theNavigator.pointerEnabled) || theNavigator.pointerEnabled);
  }
  return hasPointerEvents;
}
var imageRenderingValueResult;
var supportsImageRenderingPixelatedResult;
function supportsImageRenderingPixelated() {
  if (!defined_default(supportsImageRenderingPixelatedResult)) {
    const canvas = document.createElement("canvas");
    canvas.setAttribute(
      "style",
      "image-rendering: -moz-crisp-edges;image-rendering: pixelated;"
    );
    const tmp = canvas.style.imageRendering;
    supportsImageRenderingPixelatedResult = defined_default(tmp) && tmp !== "";
    if (supportsImageRenderingPixelatedResult) {
      imageRenderingValueResult = tmp;
    }
  }
  return supportsImageRenderingPixelatedResult;
}
function imageRenderingValue() {
  return supportsImageRenderingPixelated() ? imageRenderingValueResult : void 0;
}
function supportsWebP() {
  if (!supportsWebP.initialized) {
    throw new DeveloperError_default(
      "You must call FeatureDetection.supportsWebP.initialize and wait for the promise to resolve before calling FeatureDetection.supportsWebP"
    );
  }
  return supportsWebP._result;
}
supportsWebP._promise = void 0;
supportsWebP._result = void 0;
supportsWebP.initialize = function() {
  if (defined_default(supportsWebP._promise)) {
    return supportsWebP._promise;
  }
  supportsWebP._promise = new Promise((resolve) => {
    const image = new Image();
    image.onload = function() {
      supportsWebP._result = image.width > 0 && image.height > 0;
      resolve(supportsWebP._result);
    };
    image.onerror = function() {
      supportsWebP._result = false;
      resolve(supportsWebP._result);
    };
    image.src = "data:image/webp;base64,UklGRiIAAABXRUJQVlA4IBYAAAAwAQCdASoBAAEADsD+JaQAA3AAAAAA";
  });
  return supportsWebP._promise;
};
Object.defineProperties(supportsWebP, {
  initialized: {
    get: function() {
      return defined_default(supportsWebP._result);
    }
  }
});
var typedArrayTypes = [];
if (typeof ArrayBuffer !== "undefined") {
  typedArrayTypes.push(
    Int8Array,
    Uint8Array,
    Int16Array,
    Uint16Array,
    Int32Array,
    Uint32Array,
    Float32Array,
    Float64Array
  );
  if (typeof Uint8ClampedArray !== "undefined") {
    typedArrayTypes.push(Uint8ClampedArray);
  }
  if (typeof Uint8ClampedArray !== "undefined") {
    typedArrayTypes.push(Uint8ClampedArray);
  }
  if (typeof BigInt64Array !== "undefined") {
    typedArrayTypes.push(BigInt64Array);
  }
  if (typeof BigUint64Array !== "undefined") {
    typedArrayTypes.push(BigUint64Array);
  }
}
var FeatureDetection = {
  isChrome,
  chromeVersion,
  isSafari,
  safariVersion,
  isWebkit,
  webkitVersion,
  isInternetExplorer,
  internetExplorerVersion,
  isEdge,
  edgeVersion,
  isFirefox,
  firefoxVersion,
  isWindows,
  isIPadOrIOS,
  hardwareConcurrency: defaultValue_default(theNavigator.hardwareConcurrency, 3),
  supportsPointerEvents,
  supportsImageRenderingPixelated,
  supportsWebP,
  imageRenderingValue,
  typedArrayTypes
};
FeatureDetection.supportsBasis = function(scene) {
  return FeatureDetection.supportsWebAssembly() && scene.context.supportsBasis;
};
FeatureDetection.supportsFullscreen = function() {
  return Fullscreen_default.supportsFullscreen();
};
FeatureDetection.supportsTypedArrays = function() {
  return typeof ArrayBuffer !== "undefined";
};
FeatureDetection.supportsBigInt64Array = function() {
  return typeof BigInt64Array !== "undefined";
};
FeatureDetection.supportsBigUint64Array = function() {
  return typeof BigUint64Array !== "undefined";
};
FeatureDetection.supportsBigInt = function() {
  return typeof BigInt !== "undefined";
};
FeatureDetection.supportsWebWorkers = function() {
  return typeof Worker !== "undefined";
};
FeatureDetection.supportsWebAssembly = function() {
  return typeof WebAssembly !== "undefined";
};
FeatureDetection.supportsWebgl2 = function(scene) {
  Check_default.defined("scene", scene);
  return scene.context.webgl2;
};
FeatureDetection.supportsEsmWebWorkers = function() {
  return !isFirefox() || parseInt(firefoxVersionResult) >= 114;
};
var FeatureDetection_default = FeatureDetection;

// packages/engine/Source/Core/Quaternion.js
function Quaternion(x, y, z, w) {
  this.x = defaultValue_default(x, 0);
  this.y = defaultValue_default(y, 0);
  this.z = defaultValue_default(z, 0);
  this.w = defaultValue_default(w, 0);
}
var fromAxisAngleScratch = new Cartesian3_default();
Quaternion.fromAxisAngle = function(axis, angle, result) {
  Check_default.typeOf.object("axis", axis);
  Check_default.typeOf.number("angle", angle);
  const halfAngle = angle / 2;
  const s = Math.sin(halfAngle);
  fromAxisAngleScratch = Cartesian3_default.normalize(axis, fromAxisAngleScratch);
  const x = fromAxisAngleScratch.x * s;
  const y = fromAxisAngleScratch.y * s;
  const z = fromAxisAngleScratch.z * s;
  const w = Math.cos(halfAngle);
  if (!defined_default(result)) {
    return new Quaternion(x, y, z, w);
  }
  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};
var fromRotationMatrixNext = [1, 2, 0];
var fromRotationMatrixQuat = new Array(3);
Quaternion.fromRotationMatrix = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  let root;
  let x;
  let y;
  let z;
  let w;
  const m00 = matrix[Matrix3_default.COLUMN0ROW0];
  const m11 = matrix[Matrix3_default.COLUMN1ROW1];
  const m22 = matrix[Matrix3_default.COLUMN2ROW2];
  const trace = m00 + m11 + m22;
  if (trace > 0) {
    root = Math.sqrt(trace + 1);
    w = 0.5 * root;
    root = 0.5 / root;
    x = (matrix[Matrix3_default.COLUMN1ROW2] - matrix[Matrix3_default.COLUMN2ROW1]) * root;
    y = (matrix[Matrix3_default.COLUMN2ROW0] - matrix[Matrix3_default.COLUMN0ROW2]) * root;
    z = (matrix[Matrix3_default.COLUMN0ROW1] - matrix[Matrix3_default.COLUMN1ROW0]) * root;
  } else {
    const next = fromRotationMatrixNext;
    let i = 0;
    if (m11 > m00) {
      i = 1;
    }
    if (m22 > m00 && m22 > m11) {
      i = 2;
    }
    const j = next[i];
    const k = next[j];
    root = Math.sqrt(
      matrix[Matrix3_default.getElementIndex(i, i)] - matrix[Matrix3_default.getElementIndex(j, j)] - matrix[Matrix3_default.getElementIndex(k, k)] + 1
    );
    const quat = fromRotationMatrixQuat;
    quat[i] = 0.5 * root;
    root = 0.5 / root;
    w = (matrix[Matrix3_default.getElementIndex(k, j)] - matrix[Matrix3_default.getElementIndex(j, k)]) * root;
    quat[j] = (matrix[Matrix3_default.getElementIndex(j, i)] + matrix[Matrix3_default.getElementIndex(i, j)]) * root;
    quat[k] = (matrix[Matrix3_default.getElementIndex(k, i)] + matrix[Matrix3_default.getElementIndex(i, k)]) * root;
    x = -quat[0];
    y = -quat[1];
    z = -quat[2];
  }
  if (!defined_default(result)) {
    return new Quaternion(x, y, z, w);
  }
  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};
var scratchHPRQuaternion = new Quaternion();
var scratchHeadingQuaternion = new Quaternion();
var scratchPitchQuaternion = new Quaternion();
var scratchRollQuaternion = new Quaternion();
Quaternion.fromHeadingPitchRoll = function(headingPitchRoll, result) {
  Check_default.typeOf.object("headingPitchRoll", headingPitchRoll);
  scratchRollQuaternion = Quaternion.fromAxisAngle(
    Cartesian3_default.UNIT_X,
    headingPitchRoll.roll,
    scratchHPRQuaternion
  );
  scratchPitchQuaternion = Quaternion.fromAxisAngle(
    Cartesian3_default.UNIT_Y,
    -headingPitchRoll.pitch,
    result
  );
  result = Quaternion.multiply(
    scratchPitchQuaternion,
    scratchRollQuaternion,
    scratchPitchQuaternion
  );
  scratchHeadingQuaternion = Quaternion.fromAxisAngle(
    Cartesian3_default.UNIT_Z,
    -headingPitchRoll.heading,
    scratchHPRQuaternion
  );
  return Quaternion.multiply(scratchHeadingQuaternion, result, result);
};
var sampledQuaternionAxis = new Cartesian3_default();
var sampledQuaternionRotation = new Cartesian3_default();
var sampledQuaternionTempQuaternion = new Quaternion();
var sampledQuaternionQuaternion0 = new Quaternion();
var sampledQuaternionQuaternion0Conjugate = new Quaternion();
Quaternion.packedLength = 4;
Quaternion.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value.x;
  array[startingIndex++] = value.y;
  array[startingIndex++] = value.z;
  array[startingIndex] = value.w;
  return array;
};
Quaternion.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Quaternion();
  }
  result.x = array[startingIndex];
  result.y = array[startingIndex + 1];
  result.z = array[startingIndex + 2];
  result.w = array[startingIndex + 3];
  return result;
};
Quaternion.packedInterpolationLength = 3;
Quaternion.convertPackedArrayForInterpolation = function(packedArray, startingIndex, lastIndex, result) {
  Quaternion.unpack(
    packedArray,
    lastIndex * 4,
    sampledQuaternionQuaternion0Conjugate
  );
  Quaternion.conjugate(
    sampledQuaternionQuaternion0Conjugate,
    sampledQuaternionQuaternion0Conjugate
  );
  for (let i = 0, len = lastIndex - startingIndex + 1; i < len; i++) {
    const offset = i * 3;
    Quaternion.unpack(
      packedArray,
      (startingIndex + i) * 4,
      sampledQuaternionTempQuaternion
    );
    Quaternion.multiply(
      sampledQuaternionTempQuaternion,
      sampledQuaternionQuaternion0Conjugate,
      sampledQuaternionTempQuaternion
    );
    if (sampledQuaternionTempQuaternion.w < 0) {
      Quaternion.negate(
        sampledQuaternionTempQuaternion,
        sampledQuaternionTempQuaternion
      );
    }
    Quaternion.computeAxis(
      sampledQuaternionTempQuaternion,
      sampledQuaternionAxis
    );
    const angle = Quaternion.computeAngle(sampledQuaternionTempQuaternion);
    if (!defined_default(result)) {
      result = [];
    }
    result[offset] = sampledQuaternionAxis.x * angle;
    result[offset + 1] = sampledQuaternionAxis.y * angle;
    result[offset + 2] = sampledQuaternionAxis.z * angle;
  }
};
Quaternion.unpackInterpolationResult = function(array, sourceArray, firstIndex, lastIndex, result) {
  if (!defined_default(result)) {
    result = new Quaternion();
  }
  Cartesian3_default.fromArray(array, 0, sampledQuaternionRotation);
  const magnitude = Cartesian3_default.magnitude(sampledQuaternionRotation);
  Quaternion.unpack(sourceArray, lastIndex * 4, sampledQuaternionQuaternion0);
  if (magnitude === 0) {
    Quaternion.clone(Quaternion.IDENTITY, sampledQuaternionTempQuaternion);
  } else {
    Quaternion.fromAxisAngle(
      sampledQuaternionRotation,
      magnitude,
      sampledQuaternionTempQuaternion
    );
  }
  return Quaternion.multiply(
    sampledQuaternionTempQuaternion,
    sampledQuaternionQuaternion0,
    result
  );
};
Quaternion.clone = function(quaternion, result) {
  if (!defined_default(quaternion)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Quaternion(
      quaternion.x,
      quaternion.y,
      quaternion.z,
      quaternion.w
    );
  }
  result.x = quaternion.x;
  result.y = quaternion.y;
  result.z = quaternion.z;
  result.w = quaternion.w;
  return result;
};
Quaternion.conjugate = function(quaternion, result) {
  Check_default.typeOf.object("quaternion", quaternion);
  Check_default.typeOf.object("result", result);
  result.x = -quaternion.x;
  result.y = -quaternion.y;
  result.z = -quaternion.z;
  result.w = quaternion.w;
  return result;
};
Quaternion.magnitudeSquared = function(quaternion) {
  Check_default.typeOf.object("quaternion", quaternion);
  return quaternion.x * quaternion.x + quaternion.y * quaternion.y + quaternion.z * quaternion.z + quaternion.w * quaternion.w;
};
Quaternion.magnitude = function(quaternion) {
  return Math.sqrt(Quaternion.magnitudeSquared(quaternion));
};
Quaternion.normalize = function(quaternion, result) {
  Check_default.typeOf.object("result", result);
  const inverseMagnitude = 1 / Quaternion.magnitude(quaternion);
  const x = quaternion.x * inverseMagnitude;
  const y = quaternion.y * inverseMagnitude;
  const z = quaternion.z * inverseMagnitude;
  const w = quaternion.w * inverseMagnitude;
  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};
Quaternion.inverse = function(quaternion, result) {
  Check_default.typeOf.object("result", result);
  const magnitudeSquared = Quaternion.magnitudeSquared(quaternion);
  result = Quaternion.conjugate(quaternion, result);
  return Quaternion.multiplyByScalar(result, 1 / magnitudeSquared, result);
};
Quaternion.add = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x + right.x;
  result.y = left.y + right.y;
  result.z = left.z + right.z;
  result.w = left.w + right.w;
  return result;
};
Quaternion.subtract = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x - right.x;
  result.y = left.y - right.y;
  result.z = left.z - right.z;
  result.w = left.w - right.w;
  return result;
};
Quaternion.negate = function(quaternion, result) {
  Check_default.typeOf.object("quaternion", quaternion);
  Check_default.typeOf.object("result", result);
  result.x = -quaternion.x;
  result.y = -quaternion.y;
  result.z = -quaternion.z;
  result.w = -quaternion.w;
  return result;
};
Quaternion.dot = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  return left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w;
};
Quaternion.multiply = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  const leftX = left.x;
  const leftY = left.y;
  const leftZ = left.z;
  const leftW = left.w;
  const rightX = right.x;
  const rightY = right.y;
  const rightZ = right.z;
  const rightW = right.w;
  const x = leftW * rightX + leftX * rightW + leftY * rightZ - leftZ * rightY;
  const y = leftW * rightY - leftX * rightZ + leftY * rightW + leftZ * rightX;
  const z = leftW * rightZ + leftX * rightY - leftY * rightX + leftZ * rightW;
  const w = leftW * rightW - leftX * rightX - leftY * rightY - leftZ * rightZ;
  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};
Quaternion.multiplyByScalar = function(quaternion, scalar, result) {
  Check_default.typeOf.object("quaternion", quaternion);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.x = quaternion.x * scalar;
  result.y = quaternion.y * scalar;
  result.z = quaternion.z * scalar;
  result.w = quaternion.w * scalar;
  return result;
};
Quaternion.divideByScalar = function(quaternion, scalar, result) {
  Check_default.typeOf.object("quaternion", quaternion);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.x = quaternion.x / scalar;
  result.y = quaternion.y / scalar;
  result.z = quaternion.z / scalar;
  result.w = quaternion.w / scalar;
  return result;
};
Quaternion.computeAxis = function(quaternion, result) {
  Check_default.typeOf.object("quaternion", quaternion);
  Check_default.typeOf.object("result", result);
  const w = quaternion.w;
  if (Math.abs(w - 1) < Math_default.EPSILON6) {
    result.x = result.y = result.z = 0;
    return result;
  }
  const scalar = 1 / Math.sqrt(1 - w * w);
  result.x = quaternion.x * scalar;
  result.y = quaternion.y * scalar;
  result.z = quaternion.z * scalar;
  return result;
};
Quaternion.computeAngle = function(quaternion) {
  Check_default.typeOf.object("quaternion", quaternion);
  if (Math.abs(quaternion.w - 1) < Math_default.EPSILON6) {
    return 0;
  }
  return 2 * Math.acos(quaternion.w);
};
var lerpScratch = new Quaternion();
Quaternion.lerp = function(start, end, t, result) {
  Check_default.typeOf.object("start", start);
  Check_default.typeOf.object("end", end);
  Check_default.typeOf.number("t", t);
  Check_default.typeOf.object("result", result);
  lerpScratch = Quaternion.multiplyByScalar(end, t, lerpScratch);
  result = Quaternion.multiplyByScalar(start, 1 - t, result);
  return Quaternion.add(lerpScratch, result, result);
};
var slerpEndNegated = new Quaternion();
var slerpScaledP = new Quaternion();
var slerpScaledR = new Quaternion();
Quaternion.slerp = function(start, end, t, result) {
  Check_default.typeOf.object("start", start);
  Check_default.typeOf.object("end", end);
  Check_default.typeOf.number("t", t);
  Check_default.typeOf.object("result", result);
  let dot = Quaternion.dot(start, end);
  let r = end;
  if (dot < 0) {
    dot = -dot;
    r = slerpEndNegated = Quaternion.negate(end, slerpEndNegated);
  }
  if (1 - dot < Math_default.EPSILON6) {
    return Quaternion.lerp(start, r, t, result);
  }
  const theta = Math.acos(dot);
  slerpScaledP = Quaternion.multiplyByScalar(
    start,
    Math.sin((1 - t) * theta),
    slerpScaledP
  );
  slerpScaledR = Quaternion.multiplyByScalar(
    r,
    Math.sin(t * theta),
    slerpScaledR
  );
  result = Quaternion.add(slerpScaledP, slerpScaledR, result);
  return Quaternion.multiplyByScalar(result, 1 / Math.sin(theta), result);
};
Quaternion.log = function(quaternion, result) {
  Check_default.typeOf.object("quaternion", quaternion);
  Check_default.typeOf.object("result", result);
  const theta = Math_default.acosClamped(quaternion.w);
  let thetaOverSinTheta = 0;
  if (theta !== 0) {
    thetaOverSinTheta = theta / Math.sin(theta);
  }
  return Cartesian3_default.multiplyByScalar(quaternion, thetaOverSinTheta, result);
};
Quaternion.exp = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const theta = Cartesian3_default.magnitude(cartesian);
  let sinThetaOverTheta = 0;
  if (theta !== 0) {
    sinThetaOverTheta = Math.sin(theta) / theta;
  }
  result.x = cartesian.x * sinThetaOverTheta;
  result.y = cartesian.y * sinThetaOverTheta;
  result.z = cartesian.z * sinThetaOverTheta;
  result.w = Math.cos(theta);
  return result;
};
var squadScratchCartesian0 = new Cartesian3_default();
var squadScratchCartesian1 = new Cartesian3_default();
var squadScratchQuaternion0 = new Quaternion();
var squadScratchQuaternion1 = new Quaternion();
Quaternion.computeInnerQuadrangle = function(q0, q1, q2, result) {
  Check_default.typeOf.object("q0", q0);
  Check_default.typeOf.object("q1", q1);
  Check_default.typeOf.object("q2", q2);
  Check_default.typeOf.object("result", result);
  const qInv = Quaternion.conjugate(q1, squadScratchQuaternion0);
  Quaternion.multiply(qInv, q2, squadScratchQuaternion1);
  const cart0 = Quaternion.log(squadScratchQuaternion1, squadScratchCartesian0);
  Quaternion.multiply(qInv, q0, squadScratchQuaternion1);
  const cart1 = Quaternion.log(squadScratchQuaternion1, squadScratchCartesian1);
  Cartesian3_default.add(cart0, cart1, cart0);
  Cartesian3_default.multiplyByScalar(cart0, 0.25, cart0);
  Cartesian3_default.negate(cart0, cart0);
  Quaternion.exp(cart0, squadScratchQuaternion0);
  return Quaternion.multiply(q1, squadScratchQuaternion0, result);
};
Quaternion.squad = function(q0, q1, s0, s1, t, result) {
  Check_default.typeOf.object("q0", q0);
  Check_default.typeOf.object("q1", q1);
  Check_default.typeOf.object("s0", s0);
  Check_default.typeOf.object("s1", s1);
  Check_default.typeOf.number("t", t);
  Check_default.typeOf.object("result", result);
  const slerp0 = Quaternion.slerp(q0, q1, t, squadScratchQuaternion0);
  const slerp1 = Quaternion.slerp(s0, s1, t, squadScratchQuaternion1);
  return Quaternion.slerp(slerp0, slerp1, 2 * t * (1 - t), result);
};
var fastSlerpScratchQuaternion = new Quaternion();
var opmu = 1.9011074535173003;
var u = FeatureDetection_default.supportsTypedArrays() ? new Float32Array(8) : [];
var v = FeatureDetection_default.supportsTypedArrays() ? new Float32Array(8) : [];
var bT = FeatureDetection_default.supportsTypedArrays() ? new Float32Array(8) : [];
var bD = FeatureDetection_default.supportsTypedArrays() ? new Float32Array(8) : [];
for (let i = 0; i < 7; ++i) {
  const s = i + 1;
  const t = 2 * s + 1;
  u[i] = 1 / (s * t);
  v[i] = s / t;
}
u[7] = opmu / (8 * 17);
v[7] = opmu * 8 / 17;
Quaternion.fastSlerp = function(start, end, t, result) {
  Check_default.typeOf.object("start", start);
  Check_default.typeOf.object("end", end);
  Check_default.typeOf.number("t", t);
  Check_default.typeOf.object("result", result);
  let x = Quaternion.dot(start, end);
  let sign;
  if (x >= 0) {
    sign = 1;
  } else {
    sign = -1;
    x = -x;
  }
  const xm1 = x - 1;
  const d = 1 - t;
  const sqrT = t * t;
  const sqrD = d * d;
  for (let i = 7; i >= 0; --i) {
    bT[i] = (u[i] * sqrT - v[i]) * xm1;
    bD[i] = (u[i] * sqrD - v[i]) * xm1;
  }
  const cT = sign * t * (1 + bT[0] * (1 + bT[1] * (1 + bT[2] * (1 + bT[3] * (1 + bT[4] * (1 + bT[5] * (1 + bT[6] * (1 + bT[7]))))))));
  const cD = d * (1 + bD[0] * (1 + bD[1] * (1 + bD[2] * (1 + bD[3] * (1 + bD[4] * (1 + bD[5] * (1 + bD[6] * (1 + bD[7]))))))));
  const temp = Quaternion.multiplyByScalar(
    start,
    cD,
    fastSlerpScratchQuaternion
  );
  Quaternion.multiplyByScalar(end, cT, result);
  return Quaternion.add(temp, result, result);
};
Quaternion.fastSquad = function(q0, q1, s0, s1, t, result) {
  Check_default.typeOf.object("q0", q0);
  Check_default.typeOf.object("q1", q1);
  Check_default.typeOf.object("s0", s0);
  Check_default.typeOf.object("s1", s1);
  Check_default.typeOf.number("t", t);
  Check_default.typeOf.object("result", result);
  const slerp0 = Quaternion.fastSlerp(q0, q1, t, squadScratchQuaternion0);
  const slerp1 = Quaternion.fastSlerp(s0, s1, t, squadScratchQuaternion1);
  return Quaternion.fastSlerp(slerp0, slerp1, 2 * t * (1 - t), result);
};
Quaternion.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left.x === right.x && left.y === right.y && left.z === right.z && left.w === right.w;
};
Quaternion.equalsEpsilon = function(left, right, epsilon) {
  epsilon = defaultValue_default(epsilon, 0);
  return left === right || defined_default(left) && defined_default(right) && Math.abs(left.x - right.x) <= epsilon && Math.abs(left.y - right.y) <= epsilon && Math.abs(left.z - right.z) <= epsilon && Math.abs(left.w - right.w) <= epsilon;
};
Quaternion.ZERO = Object.freeze(new Quaternion(0, 0, 0, 0));
Quaternion.IDENTITY = Object.freeze(new Quaternion(0, 0, 0, 1));
Quaternion.prototype.clone = function(result) {
  return Quaternion.clone(this, result);
};
Quaternion.prototype.equals = function(right) {
  return Quaternion.equals(this, right);
};
Quaternion.prototype.equalsEpsilon = function(right, epsilon) {
  return Quaternion.equalsEpsilon(this, right, epsilon);
};
Quaternion.prototype.toString = function() {
  return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
};
var Quaternion_default = Quaternion;

// packages/engine/Source/Core/Transforms.js
var Transforms = {};
var vectorProductLocalFrame = {
  up: {
    south: "east",
    north: "west",
    west: "south",
    east: "north"
  },
  down: {
    south: "west",
    north: "east",
    west: "north",
    east: "south"
  },
  south: {
    up: "west",
    down: "east",
    west: "down",
    east: "up"
  },
  north: {
    up: "east",
    down: "west",
    west: "up",
    east: "down"
  },
  west: {
    up: "north",
    down: "south",
    north: "down",
    south: "up"
  },
  east: {
    up: "south",
    down: "north",
    north: "up",
    south: "down"
  }
};
var degeneratePositionLocalFrame = {
  north: [-1, 0, 0],
  east: [0, 1, 0],
  up: [0, 0, 1],
  south: [1, 0, 0],
  west: [0, -1, 0],
  down: [0, 0, -1]
};
var localFrameToFixedFrameCache = {};
var scratchCalculateCartesian = {
  east: new Cartesian3_default(),
  north: new Cartesian3_default(),
  up: new Cartesian3_default(),
  west: new Cartesian3_default(),
  south: new Cartesian3_default(),
  down: new Cartesian3_default()
};
var scratchFirstCartesian = new Cartesian3_default();
var scratchSecondCartesian = new Cartesian3_default();
var scratchThirdCartesian = new Cartesian3_default();
Transforms.localFrameToFixedFrameGenerator = function(firstAxis, secondAxis) {
  if (!vectorProductLocalFrame.hasOwnProperty(firstAxis) || !vectorProductLocalFrame[firstAxis].hasOwnProperty(secondAxis)) {
    throw new DeveloperError_default(
      "firstAxis and secondAxis must be east, north, up, west, south or down."
    );
  }
  const thirdAxis = vectorProductLocalFrame[firstAxis][secondAxis];
  let resultat;
  const hashAxis = firstAxis + secondAxis;
  if (defined_default(localFrameToFixedFrameCache[hashAxis])) {
    resultat = localFrameToFixedFrameCache[hashAxis];
  } else {
    resultat = function(origin, ellipsoid, result) {
      if (!defined_default(origin)) {
        throw new DeveloperError_default("origin is required.");
      }
      if (!defined_default(result)) {
        result = new Matrix4_default();
      }
      if (Cartesian3_default.equalsEpsilon(origin, Cartesian3_default.ZERO, Math_default.EPSILON14)) {
        Cartesian3_default.unpack(
          degeneratePositionLocalFrame[firstAxis],
          0,
          scratchFirstCartesian
        );
        Cartesian3_default.unpack(
          degeneratePositionLocalFrame[secondAxis],
          0,
          scratchSecondCartesian
        );
        Cartesian3_default.unpack(
          degeneratePositionLocalFrame[thirdAxis],
          0,
          scratchThirdCartesian
        );
      } else if (Math_default.equalsEpsilon(origin.x, 0, Math_default.EPSILON14) && Math_default.equalsEpsilon(origin.y, 0, Math_default.EPSILON14)) {
        const sign = Math_default.sign(origin.z);
        Cartesian3_default.unpack(
          degeneratePositionLocalFrame[firstAxis],
          0,
          scratchFirstCartesian
        );
        if (firstAxis !== "east" && firstAxis !== "west") {
          Cartesian3_default.multiplyByScalar(
            scratchFirstCartesian,
            sign,
            scratchFirstCartesian
          );
        }
        Cartesian3_default.unpack(
          degeneratePositionLocalFrame[secondAxis],
          0,
          scratchSecondCartesian
        );
        if (secondAxis !== "east" && secondAxis !== "west") {
          Cartesian3_default.multiplyByScalar(
            scratchSecondCartesian,
            sign,
            scratchSecondCartesian
          );
        }
        Cartesian3_default.unpack(
          degeneratePositionLocalFrame[thirdAxis],
          0,
          scratchThirdCartesian
        );
        if (thirdAxis !== "east" && thirdAxis !== "west") {
          Cartesian3_default.multiplyByScalar(
            scratchThirdCartesian,
            sign,
            scratchThirdCartesian
          );
        }
      } else {
        ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84);
        ellipsoid.geodeticSurfaceNormal(origin, scratchCalculateCartesian.up);
        const up = scratchCalculateCartesian.up;
        const east = scratchCalculateCartesian.east;
        east.x = -origin.y;
        east.y = origin.x;
        east.z = 0;
        Cartesian3_default.normalize(east, scratchCalculateCartesian.east);
        Cartesian3_default.cross(up, east, scratchCalculateCartesian.north);
        Cartesian3_default.multiplyByScalar(
          scratchCalculateCartesian.up,
          -1,
          scratchCalculateCartesian.down
        );
        Cartesian3_default.multiplyByScalar(
          scratchCalculateCartesian.east,
          -1,
          scratchCalculateCartesian.west
        );
        Cartesian3_default.multiplyByScalar(
          scratchCalculateCartesian.north,
          -1,
          scratchCalculateCartesian.south
        );
        scratchFirstCartesian = scratchCalculateCartesian[firstAxis];
        scratchSecondCartesian = scratchCalculateCartesian[secondAxis];
        scratchThirdCartesian = scratchCalculateCartesian[thirdAxis];
      }
      result[0] = scratchFirstCartesian.x;
      result[1] = scratchFirstCartesian.y;
      result[2] = scratchFirstCartesian.z;
      result[3] = 0;
      result[4] = scratchSecondCartesian.x;
      result[5] = scratchSecondCartesian.y;
      result[6] = scratchSecondCartesian.z;
      result[7] = 0;
      result[8] = scratchThirdCartesian.x;
      result[9] = scratchThirdCartesian.y;
      result[10] = scratchThirdCartesian.z;
      result[11] = 0;
      result[12] = origin.x;
      result[13] = origin.y;
      result[14] = origin.z;
      result[15] = 1;
      return result;
    };
    localFrameToFixedFrameCache[hashAxis] = resultat;
  }
  return resultat;
};
Transforms.eastNorthUpToFixedFrame = Transforms.localFrameToFixedFrameGenerator(
  "east",
  "north"
);
Transforms.northEastDownToFixedFrame = Transforms.localFrameToFixedFrameGenerator(
  "north",
  "east"
);
Transforms.northUpEastToFixedFrame = Transforms.localFrameToFixedFrameGenerator(
  "north",
  "up"
);
Transforms.northWestUpToFixedFrame = Transforms.localFrameToFixedFrameGenerator(
  "north",
  "west"
);
var scratchHPRQuaternion2 = new Quaternion_default();
var scratchScale = new Cartesian3_default(1, 1, 1);
var scratchHPRMatrix4 = new Matrix4_default();
Transforms.headingPitchRollToFixedFrame = function(origin, headingPitchRoll, ellipsoid, fixedFrameTransform, result) {
  Check_default.typeOf.object("HeadingPitchRoll", headingPitchRoll);
  fixedFrameTransform = defaultValue_default(
    fixedFrameTransform,
    Transforms.eastNorthUpToFixedFrame
  );
  const hprQuaternion = Quaternion_default.fromHeadingPitchRoll(
    headingPitchRoll,
    scratchHPRQuaternion2
  );
  const hprMatrix = Matrix4_default.fromTranslationQuaternionRotationScale(
    Cartesian3_default.ZERO,
    hprQuaternion,
    scratchScale,
    scratchHPRMatrix4
  );
  result = fixedFrameTransform(origin, ellipsoid, result);
  return Matrix4_default.multiply(result, hprMatrix, result);
};
var scratchENUMatrix4 = new Matrix4_default();
var scratchHPRMatrix3 = new Matrix3_default();
Transforms.headingPitchRollQuaternion = function(origin, headingPitchRoll, ellipsoid, fixedFrameTransform, result) {
  Check_default.typeOf.object("HeadingPitchRoll", headingPitchRoll);
  const transform = Transforms.headingPitchRollToFixedFrame(
    origin,
    headingPitchRoll,
    ellipsoid,
    fixedFrameTransform,
    scratchENUMatrix4
  );
  const rotation = Matrix4_default.getMatrix3(transform, scratchHPRMatrix3);
  return Quaternion_default.fromRotationMatrix(rotation, result);
};
var noScale = new Cartesian3_default(1, 1, 1);
var hprCenterScratch = new Cartesian3_default();
var ffScratch = new Matrix4_default();
var hprTransformScratch = new Matrix4_default();
var hprRotationScratch = new Matrix3_default();
var hprQuaternionScratch = new Quaternion_default();
Transforms.fixedFrameToHeadingPitchRoll = function(transform, ellipsoid, fixedFrameTransform, result) {
  Check_default.defined("transform", transform);
  ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84);
  fixedFrameTransform = defaultValue_default(
    fixedFrameTransform,
    Transforms.eastNorthUpToFixedFrame
  );
  if (!defined_default(result)) {
    result = new HeadingPitchRoll_default();
  }
  const center = Matrix4_default.getTranslation(transform, hprCenterScratch);
  if (Cartesian3_default.equals(center, Cartesian3_default.ZERO)) {
    result.heading = 0;
    result.pitch = 0;
    result.roll = 0;
    return result;
  }
  let toFixedFrame = Matrix4_default.inverseTransformation(
    fixedFrameTransform(center, ellipsoid, ffScratch),
    ffScratch
  );
  let transformCopy = Matrix4_default.setScale(transform, noScale, hprTransformScratch);
  transformCopy = Matrix4_default.setTranslation(
    transformCopy,
    Cartesian3_default.ZERO,
    transformCopy
  );
  toFixedFrame = Matrix4_default.multiply(toFixedFrame, transformCopy, toFixedFrame);
  let quaternionRotation = Quaternion_default.fromRotationMatrix(
    Matrix4_default.getMatrix3(toFixedFrame, hprRotationScratch),
    hprQuaternionScratch
  );
  quaternionRotation = Quaternion_default.normalize(
    quaternionRotation,
    quaternionRotation
  );
  return HeadingPitchRoll_default.fromQuaternion(quaternionRotation, result);
};
var gmstConstant0 = 6 * 3600 + 41 * 60 + 50.54841;
var gmstConstant1 = 8640184812866e-6;
var gmstConstant2 = 0.093104;
var gmstConstant3 = -62e-7;
var rateCoef = 11772758384668e-32;
var wgs84WRPrecessing = 72921158553e-15;
var twoPiOverSecondsInDay = Math_default.TWO_PI / 86400;
var dateInUtc = new JulianDate_default();
Transforms.computeTemeToPseudoFixedMatrix = function(date, result) {
  if (!defined_default(date)) {
    throw new DeveloperError_default("date is required.");
  }
  dateInUtc = JulianDate_default.addSeconds(
    date,
    -JulianDate_default.computeTaiMinusUtc(date),
    dateInUtc
  );
  const utcDayNumber = dateInUtc.dayNumber;
  const utcSecondsIntoDay = dateInUtc.secondsOfDay;
  let t;
  const diffDays = utcDayNumber - 2451545;
  if (utcSecondsIntoDay >= 43200) {
    t = (diffDays + 0.5) / TimeConstants_default.DAYS_PER_JULIAN_CENTURY;
  } else {
    t = (diffDays - 0.5) / TimeConstants_default.DAYS_PER_JULIAN_CENTURY;
  }
  const gmst0 = gmstConstant0 + t * (gmstConstant1 + t * (gmstConstant2 + t * gmstConstant3));
  const angle = gmst0 * twoPiOverSecondsInDay % Math_default.TWO_PI;
  const ratio = wgs84WRPrecessing + rateCoef * (utcDayNumber - 24515455e-1);
  const secondsSinceMidnight = (utcSecondsIntoDay + TimeConstants_default.SECONDS_PER_DAY * 0.5) % TimeConstants_default.SECONDS_PER_DAY;
  const gha = angle + ratio * secondsSinceMidnight;
  const cosGha = Math.cos(gha);
  const sinGha = Math.sin(gha);
  if (!defined_default(result)) {
    return new Matrix3_default(
      cosGha,
      sinGha,
      0,
      -sinGha,
      cosGha,
      0,
      0,
      0,
      1
    );
  }
  result[0] = cosGha;
  result[1] = -sinGha;
  result[2] = 0;
  result[3] = sinGha;
  result[4] = cosGha;
  result[5] = 0;
  result[6] = 0;
  result[7] = 0;
  result[8] = 1;
  return result;
};
Transforms.iau2006XysData = new Iau2006XysData_default();
Transforms.earthOrientationParameters = EarthOrientationParameters_default.NONE;
var ttMinusTai = 32.184;
var j2000ttDays = 2451545;
Transforms.preloadIcrfFixed = function(timeInterval) {
  const startDayTT = timeInterval.start.dayNumber;
  const startSecondTT = timeInterval.start.secondsOfDay + ttMinusTai;
  const stopDayTT = timeInterval.stop.dayNumber;
  const stopSecondTT = timeInterval.stop.secondsOfDay + ttMinusTai;
  return Transforms.iau2006XysData.preload(
    startDayTT,
    startSecondTT,
    stopDayTT,
    stopSecondTT
  );
};
Transforms.computeIcrfToFixedMatrix = function(date, result) {
  if (!defined_default(date)) {
    throw new DeveloperError_default("date is required.");
  }
  if (!defined_default(result)) {
    result = new Matrix3_default();
  }
  const fixedToIcrfMtx = Transforms.computeFixedToIcrfMatrix(date, result);
  if (!defined_default(fixedToIcrfMtx)) {
    return void 0;
  }
  return Matrix3_default.transpose(fixedToIcrfMtx, result);
};
var xysScratch = new Iau2006XysSample_default(0, 0, 0);
var eopScratch = new EarthOrientationParametersSample_default(
  0,
  0,
  0,
  0,
  0,
  0
);
var rotation1Scratch = new Matrix3_default();
var rotation2Scratch = new Matrix3_default();
Transforms.computeFixedToIcrfMatrix = function(date, result) {
  if (!defined_default(date)) {
    throw new DeveloperError_default("date is required.");
  }
  if (!defined_default(result)) {
    result = new Matrix3_default();
  }
  const eop = Transforms.earthOrientationParameters.compute(date, eopScratch);
  if (!defined_default(eop)) {
    return void 0;
  }
  const dayTT = date.dayNumber;
  const secondTT = date.secondsOfDay + ttMinusTai;
  const xys = Transforms.iau2006XysData.computeXysRadians(
    dayTT,
    secondTT,
    xysScratch
  );
  if (!defined_default(xys)) {
    return void 0;
  }
  const x = xys.x + eop.xPoleOffset;
  const y = xys.y + eop.yPoleOffset;
  const a3 = 1 / (1 + Math.sqrt(1 - x * x - y * y));
  const rotation1 = rotation1Scratch;
  rotation1[0] = 1 - a3 * x * x;
  rotation1[3] = -a3 * x * y;
  rotation1[6] = x;
  rotation1[1] = -a3 * x * y;
  rotation1[4] = 1 - a3 * y * y;
  rotation1[7] = y;
  rotation1[2] = -x;
  rotation1[5] = -y;
  rotation1[8] = 1 - a3 * (x * x + y * y);
  const rotation2 = Matrix3_default.fromRotationZ(-xys.s, rotation2Scratch);
  const matrixQ = Matrix3_default.multiply(rotation1, rotation2, rotation1Scratch);
  const dateUt1day = date.dayNumber;
  const dateUt1sec = date.secondsOfDay - JulianDate_default.computeTaiMinusUtc(date) + eop.ut1MinusUtc;
  const daysSinceJ2000 = dateUt1day - 2451545;
  const fractionOfDay = dateUt1sec / TimeConstants_default.SECONDS_PER_DAY;
  let era = 0.779057273264 + fractionOfDay + 0.00273781191135448 * (daysSinceJ2000 + fractionOfDay);
  era = era % 1 * Math_default.TWO_PI;
  const earthRotation = Matrix3_default.fromRotationZ(era, rotation2Scratch);
  const pfToIcrf = Matrix3_default.multiply(matrixQ, earthRotation, rotation1Scratch);
  const cosxp = Math.cos(eop.xPoleWander);
  const cosyp = Math.cos(eop.yPoleWander);
  const sinxp = Math.sin(eop.xPoleWander);
  const sinyp = Math.sin(eop.yPoleWander);
  let ttt = dayTT - j2000ttDays + secondTT / TimeConstants_default.SECONDS_PER_DAY;
  ttt /= 36525;
  const sp = -47e-6 * ttt * Math_default.RADIANS_PER_DEGREE / 3600;
  const cossp = Math.cos(sp);
  const sinsp = Math.sin(sp);
  const fToPfMtx = rotation2Scratch;
  fToPfMtx[0] = cosxp * cossp;
  fToPfMtx[1] = cosxp * sinsp;
  fToPfMtx[2] = sinxp;
  fToPfMtx[3] = -cosyp * sinsp + sinyp * sinxp * cossp;
  fToPfMtx[4] = cosyp * cossp + sinyp * sinxp * sinsp;
  fToPfMtx[5] = -sinyp * cosxp;
  fToPfMtx[6] = -sinyp * sinsp - cosyp * sinxp * cossp;
  fToPfMtx[7] = sinyp * cossp - cosyp * sinxp * sinsp;
  fToPfMtx[8] = cosyp * cosxp;
  return Matrix3_default.multiply(pfToIcrf, fToPfMtx, result);
};
var pointToWindowCoordinatesTemp = new Cartesian4_default();
Transforms.pointToWindowCoordinates = function(modelViewProjectionMatrix, viewportTransformation, point, result) {
  result = Transforms.pointToGLWindowCoordinates(
    modelViewProjectionMatrix,
    viewportTransformation,
    point,
    result
  );
  result.y = 2 * viewportTransformation[5] - result.y;
  return result;
};
Transforms.pointToGLWindowCoordinates = function(modelViewProjectionMatrix, viewportTransformation, point, result) {
  if (!defined_default(modelViewProjectionMatrix)) {
    throw new DeveloperError_default("modelViewProjectionMatrix is required.");
  }
  if (!defined_default(viewportTransformation)) {
    throw new DeveloperError_default("viewportTransformation is required.");
  }
  if (!defined_default(point)) {
    throw new DeveloperError_default("point is required.");
  }
  if (!defined_default(result)) {
    result = new Cartesian2_default();
  }
  const tmp = pointToWindowCoordinatesTemp;
  Matrix4_default.multiplyByVector(
    modelViewProjectionMatrix,
    Cartesian4_default.fromElements(point.x, point.y, point.z, 1, tmp),
    tmp
  );
  Cartesian4_default.multiplyByScalar(tmp, 1 / tmp.w, tmp);
  Matrix4_default.multiplyByVector(viewportTransformation, tmp, tmp);
  return Cartesian2_default.fromCartesian4(tmp, result);
};
var normalScratch = new Cartesian3_default();
var rightScratch = new Cartesian3_default();
var upScratch = new Cartesian3_default();
Transforms.rotationMatrixFromPositionVelocity = function(position, velocity, ellipsoid, result) {
  if (!defined_default(position)) {
    throw new DeveloperError_default("position is required.");
  }
  if (!defined_default(velocity)) {
    throw new DeveloperError_default("velocity is required.");
  }
  const normal = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84).geodeticSurfaceNormal(
    position,
    normalScratch
  );
  let right = Cartesian3_default.cross(velocity, normal, rightScratch);
  if (Cartesian3_default.equalsEpsilon(right, Cartesian3_default.ZERO, Math_default.EPSILON6)) {
    right = Cartesian3_default.clone(Cartesian3_default.UNIT_X, right);
  }
  const up = Cartesian3_default.cross(right, velocity, upScratch);
  Cartesian3_default.normalize(up, up);
  Cartesian3_default.cross(velocity, up, right);
  Cartesian3_default.negate(right, right);
  Cartesian3_default.normalize(right, right);
  if (!defined_default(result)) {
    result = new Matrix3_default();
  }
  result[0] = velocity.x;
  result[1] = velocity.y;
  result[2] = velocity.z;
  result[3] = right.x;
  result[4] = right.y;
  result[5] = right.z;
  result[6] = up.x;
  result[7] = up.y;
  result[8] = up.z;
  return result;
};
var swizzleMatrix = new Matrix4_default(
  0,
  0,
  1,
  0,
  1,
  0,
  0,
  0,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  1
);
var scratchCartographic = new Cartographic_default();
var scratchCartesian3Projection = new Cartesian3_default();
var scratchCenter = new Cartesian3_default();
var scratchRotation = new Matrix3_default();
var scratchFromENU = new Matrix4_default();
var scratchToENU = new Matrix4_default();
Transforms.basisTo2D = function(projection, matrix, result) {
  if (!defined_default(projection)) {
    throw new DeveloperError_default("projection is required.");
  }
  if (!defined_default(matrix)) {
    throw new DeveloperError_default("matrix is required.");
  }
  if (!defined_default(result)) {
    throw new DeveloperError_default("result is required.");
  }
  const rtcCenter = Matrix4_default.getTranslation(matrix, scratchCenter);
  const ellipsoid = projection.ellipsoid;
  const cartographic = ellipsoid.cartesianToCartographic(
    rtcCenter,
    scratchCartographic
  );
  const projectedPosition = projection.project(
    cartographic,
    scratchCartesian3Projection
  );
  Cartesian3_default.fromElements(
    projectedPosition.z,
    projectedPosition.x,
    projectedPosition.y,
    projectedPosition
  );
  const fromENU = Transforms.eastNorthUpToFixedFrame(
    rtcCenter,
    ellipsoid,
    scratchFromENU
  );
  const toENU = Matrix4_default.inverseTransformation(fromENU, scratchToENU);
  const rotation = Matrix4_default.getMatrix3(matrix, scratchRotation);
  const local = Matrix4_default.multiplyByMatrix3(toENU, rotation, result);
  Matrix4_default.multiply(swizzleMatrix, local, result);
  Matrix4_default.setTranslation(result, projectedPosition, result);
  return result;
};
Transforms.wgs84To2DModelMatrix = function(projection, center, result) {
  if (!defined_default(projection)) {
    throw new DeveloperError_default("projection is required.");
  }
  if (!defined_default(center)) {
    throw new DeveloperError_default("center is required.");
  }
  if (!defined_default(result)) {
    throw new DeveloperError_default("result is required.");
  }
  const ellipsoid = projection.ellipsoid;
  const fromENU = Transforms.eastNorthUpToFixedFrame(
    center,
    ellipsoid,
    scratchFromENU
  );
  const toENU = Matrix4_default.inverseTransformation(fromENU, scratchToENU);
  const cartographic = ellipsoid.cartesianToCartographic(
    center,
    scratchCartographic
  );
  const projectedPosition = projection.project(
    cartographic,
    scratchCartesian3Projection
  );
  Cartesian3_default.fromElements(
    projectedPosition.z,
    projectedPosition.x,
    projectedPosition.y,
    projectedPosition
  );
  const translation = Matrix4_default.fromTranslation(
    projectedPosition,
    scratchFromENU
  );
  Matrix4_default.multiply(swizzleMatrix, toENU, result);
  Matrix4_default.multiply(translation, result, result);
  return result;
};
var Transforms_default = Transforms;

export {
  GeographicProjection_default,
  Intersect_default,
  Interval_default,
  BoundingSphere_default,
  FeatureDetection_default,
  Quaternion_default,
  Resource_default,
  buildModuleUrl_default,
  Transforms_default
};
