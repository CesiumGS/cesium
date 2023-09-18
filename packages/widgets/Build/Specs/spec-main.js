var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a3, b) => (typeof require !== "undefined" ? require : a3)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined")
    return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/mersenne-twister/src/mersenne-twister.js
var require_mersenne_twister = __commonJS({
  "node_modules/mersenne-twister/src/mersenne-twister.js"(exports, module) {
    var MersenneTwister2 = function(seed) {
      if (seed == void 0) {
        seed = (/* @__PURE__ */ new Date()).getTime();
      }
      this.N = 624;
      this.M = 397;
      this.MATRIX_A = 2567483615;
      this.UPPER_MASK = 2147483648;
      this.LOWER_MASK = 2147483647;
      this.mt = new Array(this.N);
      this.mti = this.N + 1;
      if (seed.constructor == Array) {
        this.init_by_array(seed, seed.length);
      } else {
        this.init_seed(seed);
      }
    };
    MersenneTwister2.prototype.init_seed = function(s) {
      this.mt[0] = s >>> 0;
      for (this.mti = 1; this.mti < this.N; this.mti++) {
        var s = this.mt[this.mti - 1] ^ this.mt[this.mti - 1] >>> 30;
        this.mt[this.mti] = (((s & 4294901760) >>> 16) * 1812433253 << 16) + (s & 65535) * 1812433253 + this.mti;
        this.mt[this.mti] >>>= 0;
      }
    };
    MersenneTwister2.prototype.init_by_array = function(init_key, key_length) {
      var i, j, k;
      this.init_seed(19650218);
      i = 1;
      j = 0;
      k = this.N > key_length ? this.N : key_length;
      for (; k; k--) {
        var s = this.mt[i - 1] ^ this.mt[i - 1] >>> 30;
        this.mt[i] = (this.mt[i] ^ (((s & 4294901760) >>> 16) * 1664525 << 16) + (s & 65535) * 1664525) + init_key[j] + j;
        this.mt[i] >>>= 0;
        i++;
        j++;
        if (i >= this.N) {
          this.mt[0] = this.mt[this.N - 1];
          i = 1;
        }
        if (j >= key_length)
          j = 0;
      }
      for (k = this.N - 1; k; k--) {
        var s = this.mt[i - 1] ^ this.mt[i - 1] >>> 30;
        this.mt[i] = (this.mt[i] ^ (((s & 4294901760) >>> 16) * 1566083941 << 16) + (s & 65535) * 1566083941) - i;
        this.mt[i] >>>= 0;
        i++;
        if (i >= this.N) {
          this.mt[0] = this.mt[this.N - 1];
          i = 1;
        }
      }
      this.mt[0] = 2147483648;
    };
    MersenneTwister2.prototype.random_int = function() {
      var y;
      var mag01 = new Array(0, this.MATRIX_A);
      if (this.mti >= this.N) {
        var kk;
        if (this.mti == this.N + 1)
          this.init_seed(5489);
        for (kk = 0; kk < this.N - this.M; kk++) {
          y = this.mt[kk] & this.UPPER_MASK | this.mt[kk + 1] & this.LOWER_MASK;
          this.mt[kk] = this.mt[kk + this.M] ^ y >>> 1 ^ mag01[y & 1];
        }
        for (; kk < this.N - 1; kk++) {
          y = this.mt[kk] & this.UPPER_MASK | this.mt[kk + 1] & this.LOWER_MASK;
          this.mt[kk] = this.mt[kk + (this.M - this.N)] ^ y >>> 1 ^ mag01[y & 1];
        }
        y = this.mt[this.N - 1] & this.UPPER_MASK | this.mt[0] & this.LOWER_MASK;
        this.mt[this.N - 1] = this.mt[this.M - 1] ^ y >>> 1 ^ mag01[y & 1];
        this.mti = 0;
      }
      y = this.mt[this.mti++];
      y ^= y >>> 11;
      y ^= y << 7 & 2636928640;
      y ^= y << 15 & 4022730752;
      y ^= y >>> 18;
      return y >>> 0;
    };
    MersenneTwister2.prototype.random_int31 = function() {
      return this.random_int() >>> 1;
    };
    MersenneTwister2.prototype.random_incl = function() {
      return this.random_int() * (1 / 4294967295);
    };
    MersenneTwister2.prototype.random = function() {
      return this.random_int() * (1 / 4294967296);
    };
    MersenneTwister2.prototype.random_excl = function() {
      return (this.random_int() + 0.5) * (1 / 4294967296);
    };
    MersenneTwister2.prototype.random_long = function() {
      var a3 = this.random_int() >>> 5, b = this.random_int() >>> 6;
      return (a3 * 67108864 + b) * (1 / 9007199254740992);
    };
    module.exports = MersenneTwister2;
  }
});

// node_modules/urijs/src/punycode.js
var require_punycode = __commonJS({
  "node_modules/urijs/src/punycode.js"(exports, module) {
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

// packages/engine/Source/Core/defined.js
function defined(value) {
  return value !== void 0 && value !== null;
}
var defined_default = defined;

// packages/engine/Source/Core/DeveloperError.js
function DeveloperError(message) {
  this.name = "DeveloperError";
  this.message = message;
  let stack;
  try {
    throw new Error();
  } catch (e) {
    stack = e.stack;
  }
  this.stack = stack;
}
if (defined_default(Object.create)) {
  DeveloperError.prototype = Object.create(Error.prototype);
  DeveloperError.prototype.constructor = DeveloperError;
}
DeveloperError.prototype.toString = function() {
  let str = `${this.name}: ${this.message}`;
  if (defined_default(this.stack)) {
    str += `
${this.stack.toString()}`;
  }
  return str;
};
DeveloperError.throwInstantiationError = function() {
  throw new DeveloperError(
    "This function defines an interface and should not be called directly."
  );
};
var DeveloperError_default = DeveloperError;

// packages/engine/Source/Core/Check.js
var Check = {};
Check.typeOf = {};
function getUndefinedErrorMessage(name) {
  return `${name} is required, actual value was undefined`;
}
function getFailedTypeErrorMessage(actual, expected, name) {
  return `Expected ${name} to be typeof ${expected}, actual typeof was ${actual}`;
}
Check.defined = function(name, test) {
  if (!defined_default(test)) {
    throw new DeveloperError_default(getUndefinedErrorMessage(name));
  }
};
Check.typeOf.func = function(name, test) {
  if (typeof test !== "function") {
    throw new DeveloperError_default(
      getFailedTypeErrorMessage(typeof test, "function", name)
    );
  }
};
Check.typeOf.string = function(name, test) {
  if (typeof test !== "string") {
    throw new DeveloperError_default(
      getFailedTypeErrorMessage(typeof test, "string", name)
    );
  }
};
Check.typeOf.number = function(name, test) {
  if (typeof test !== "number") {
    throw new DeveloperError_default(
      getFailedTypeErrorMessage(typeof test, "number", name)
    );
  }
};
Check.typeOf.number.lessThan = function(name, test, limit) {
  Check.typeOf.number(name, test);
  if (test >= limit) {
    throw new DeveloperError_default(
      `Expected ${name} to be less than ${limit}, actual value was ${test}`
    );
  }
};
Check.typeOf.number.lessThanOrEquals = function(name, test, limit) {
  Check.typeOf.number(name, test);
  if (test > limit) {
    throw new DeveloperError_default(
      `Expected ${name} to be less than or equal to ${limit}, actual value was ${test}`
    );
  }
};
Check.typeOf.number.greaterThan = function(name, test, limit) {
  Check.typeOf.number(name, test);
  if (test <= limit) {
    throw new DeveloperError_default(
      `Expected ${name} to be greater than ${limit}, actual value was ${test}`
    );
  }
};
Check.typeOf.number.greaterThanOrEquals = function(name, test, limit) {
  Check.typeOf.number(name, test);
  if (test < limit) {
    throw new DeveloperError_default(
      `Expected ${name} to be greater than or equal to ${limit}, actual value was ${test}`
    );
  }
};
Check.typeOf.object = function(name, test) {
  if (typeof test !== "object") {
    throw new DeveloperError_default(
      getFailedTypeErrorMessage(typeof test, "object", name)
    );
  }
};
Check.typeOf.bool = function(name, test) {
  if (typeof test !== "boolean") {
    throw new DeveloperError_default(
      getFailedTypeErrorMessage(typeof test, "boolean", name)
    );
  }
};
Check.typeOf.bigint = function(name, test) {
  if (typeof test !== "bigint") {
    throw new DeveloperError_default(
      getFailedTypeErrorMessage(typeof test, "bigint", name)
    );
  }
};
Check.typeOf.number.equals = function(name1, name2, test1, test2) {
  Check.typeOf.number(name1, test1);
  Check.typeOf.number(name2, test2);
  if (test1 !== test2) {
    throw new DeveloperError_default(
      `${name1} must be equal to ${name2}, the actual values are ${test1} and ${test2}`
    );
  }
};
var Check_default = Check;

// packages/engine/Source/Core/defaultValue.js
function defaultValue(a3, b) {
  if (a3 !== void 0 && a3 !== null) {
    return a3;
  }
  return b;
}
defaultValue.EMPTY_OBJECT = Object.freeze({});
var defaultValue_default = defaultValue;

// packages/engine/Source/Core/Math.js
var import_mersenne_twister = __toESM(require_mersenne_twister(), 1);
var CesiumMath = {};
CesiumMath.EPSILON1 = 0.1;
CesiumMath.EPSILON2 = 0.01;
CesiumMath.EPSILON3 = 1e-3;
CesiumMath.EPSILON4 = 1e-4;
CesiumMath.EPSILON5 = 1e-5;
CesiumMath.EPSILON6 = 1e-6;
CesiumMath.EPSILON7 = 1e-7;
CesiumMath.EPSILON8 = 1e-8;
CesiumMath.EPSILON9 = 1e-9;
CesiumMath.EPSILON10 = 1e-10;
CesiumMath.EPSILON11 = 1e-11;
CesiumMath.EPSILON12 = 1e-12;
CesiumMath.EPSILON13 = 1e-13;
CesiumMath.EPSILON14 = 1e-14;
CesiumMath.EPSILON15 = 1e-15;
CesiumMath.EPSILON16 = 1e-16;
CesiumMath.EPSILON17 = 1e-17;
CesiumMath.EPSILON18 = 1e-18;
CesiumMath.EPSILON19 = 1e-19;
CesiumMath.EPSILON20 = 1e-20;
CesiumMath.EPSILON21 = 1e-21;
CesiumMath.GRAVITATIONALPARAMETER = 3986004418e5;
CesiumMath.SOLAR_RADIUS = 6955e5;
CesiumMath.LUNAR_RADIUS = 1737400;
CesiumMath.SIXTY_FOUR_KILOBYTES = 64 * 1024;
CesiumMath.FOUR_GIGABYTES = 4 * 1024 * 1024 * 1024;
CesiumMath.sign = defaultValue_default(Math.sign, function sign(value) {
  value = +value;
  if (value === 0 || value !== value) {
    return value;
  }
  return value > 0 ? 1 : -1;
});
CesiumMath.signNotZero = function(value) {
  return value < 0 ? -1 : 1;
};
CesiumMath.toSNorm = function(value, rangeMaximum) {
  rangeMaximum = defaultValue_default(rangeMaximum, 255);
  return Math.round(
    (CesiumMath.clamp(value, -1, 1) * 0.5 + 0.5) * rangeMaximum
  );
};
CesiumMath.fromSNorm = function(value, rangeMaximum) {
  rangeMaximum = defaultValue_default(rangeMaximum, 255);
  return CesiumMath.clamp(value, 0, rangeMaximum) / rangeMaximum * 2 - 1;
};
CesiumMath.normalize = function(value, rangeMinimum, rangeMaximum) {
  rangeMaximum = Math.max(rangeMaximum - rangeMinimum, 0);
  return rangeMaximum === 0 ? 0 : CesiumMath.clamp((value - rangeMinimum) / rangeMaximum, 0, 1);
};
CesiumMath.sinh = defaultValue_default(Math.sinh, function sinh(value) {
  return (Math.exp(value) - Math.exp(-value)) / 2;
});
CesiumMath.cosh = defaultValue_default(Math.cosh, function cosh(value) {
  return (Math.exp(value) + Math.exp(-value)) / 2;
});
CesiumMath.lerp = function(p, q, time) {
  return (1 - time) * p + time * q;
};
CesiumMath.PI = Math.PI;
CesiumMath.ONE_OVER_PI = 1 / Math.PI;
CesiumMath.PI_OVER_TWO = Math.PI / 2;
CesiumMath.PI_OVER_THREE = Math.PI / 3;
CesiumMath.PI_OVER_FOUR = Math.PI / 4;
CesiumMath.PI_OVER_SIX = Math.PI / 6;
CesiumMath.THREE_PI_OVER_TWO = 3 * Math.PI / 2;
CesiumMath.TWO_PI = 2 * Math.PI;
CesiumMath.ONE_OVER_TWO_PI = 1 / (2 * Math.PI);
CesiumMath.RADIANS_PER_DEGREE = Math.PI / 180;
CesiumMath.DEGREES_PER_RADIAN = 180 / Math.PI;
CesiumMath.RADIANS_PER_ARCSECOND = CesiumMath.RADIANS_PER_DEGREE / 3600;
CesiumMath.toRadians = function(degrees) {
  if (!defined_default(degrees)) {
    throw new DeveloperError_default("degrees is required.");
  }
  return degrees * CesiumMath.RADIANS_PER_DEGREE;
};
CesiumMath.toDegrees = function(radians) {
  if (!defined_default(radians)) {
    throw new DeveloperError_default("radians is required.");
  }
  return radians * CesiumMath.DEGREES_PER_RADIAN;
};
CesiumMath.convertLongitudeRange = function(angle) {
  if (!defined_default(angle)) {
    throw new DeveloperError_default("angle is required.");
  }
  const twoPi = CesiumMath.TWO_PI;
  const simplified = angle - Math.floor(angle / twoPi) * twoPi;
  if (simplified < -Math.PI) {
    return simplified + twoPi;
  }
  if (simplified >= Math.PI) {
    return simplified - twoPi;
  }
  return simplified;
};
CesiumMath.clampToLatitudeRange = function(angle) {
  if (!defined_default(angle)) {
    throw new DeveloperError_default("angle is required.");
  }
  return CesiumMath.clamp(
    angle,
    -1 * CesiumMath.PI_OVER_TWO,
    CesiumMath.PI_OVER_TWO
  );
};
CesiumMath.negativePiToPi = function(angle) {
  if (!defined_default(angle)) {
    throw new DeveloperError_default("angle is required.");
  }
  if (angle >= -CesiumMath.PI && angle <= CesiumMath.PI) {
    return angle;
  }
  return CesiumMath.zeroToTwoPi(angle + CesiumMath.PI) - CesiumMath.PI;
};
CesiumMath.zeroToTwoPi = function(angle) {
  if (!defined_default(angle)) {
    throw new DeveloperError_default("angle is required.");
  }
  if (angle >= 0 && angle <= CesiumMath.TWO_PI) {
    return angle;
  }
  const mod = CesiumMath.mod(angle, CesiumMath.TWO_PI);
  if (Math.abs(mod) < CesiumMath.EPSILON14 && Math.abs(angle) > CesiumMath.EPSILON14) {
    return CesiumMath.TWO_PI;
  }
  return mod;
};
CesiumMath.mod = function(m, n) {
  if (!defined_default(m)) {
    throw new DeveloperError_default("m is required.");
  }
  if (!defined_default(n)) {
    throw new DeveloperError_default("n is required.");
  }
  if (n === 0) {
    throw new DeveloperError_default("divisor cannot be 0.");
  }
  if (CesiumMath.sign(m) === CesiumMath.sign(n) && Math.abs(m) < Math.abs(n)) {
    return m;
  }
  return (m % n + n) % n;
};
CesiumMath.equalsEpsilon = function(left, right, relativeEpsilon, absoluteEpsilon) {
  if (!defined_default(left)) {
    throw new DeveloperError_default("left is required.");
  }
  if (!defined_default(right)) {
    throw new DeveloperError_default("right is required.");
  }
  relativeEpsilon = defaultValue_default(relativeEpsilon, 0);
  absoluteEpsilon = defaultValue_default(absoluteEpsilon, relativeEpsilon);
  const absDiff = Math.abs(left - right);
  return absDiff <= absoluteEpsilon || absDiff <= relativeEpsilon * Math.max(Math.abs(left), Math.abs(right));
};
CesiumMath.lessThan = function(left, right, absoluteEpsilon) {
  if (!defined_default(left)) {
    throw new DeveloperError_default("first is required.");
  }
  if (!defined_default(right)) {
    throw new DeveloperError_default("second is required.");
  }
  if (!defined_default(absoluteEpsilon)) {
    throw new DeveloperError_default("absoluteEpsilon is required.");
  }
  return left - right < -absoluteEpsilon;
};
CesiumMath.lessThanOrEquals = function(left, right, absoluteEpsilon) {
  if (!defined_default(left)) {
    throw new DeveloperError_default("first is required.");
  }
  if (!defined_default(right)) {
    throw new DeveloperError_default("second is required.");
  }
  if (!defined_default(absoluteEpsilon)) {
    throw new DeveloperError_default("absoluteEpsilon is required.");
  }
  return left - right < absoluteEpsilon;
};
CesiumMath.greaterThan = function(left, right, absoluteEpsilon) {
  if (!defined_default(left)) {
    throw new DeveloperError_default("first is required.");
  }
  if (!defined_default(right)) {
    throw new DeveloperError_default("second is required.");
  }
  if (!defined_default(absoluteEpsilon)) {
    throw new DeveloperError_default("absoluteEpsilon is required.");
  }
  return left - right > absoluteEpsilon;
};
CesiumMath.greaterThanOrEquals = function(left, right, absoluteEpsilon) {
  if (!defined_default(left)) {
    throw new DeveloperError_default("first is required.");
  }
  if (!defined_default(right)) {
    throw new DeveloperError_default("second is required.");
  }
  if (!defined_default(absoluteEpsilon)) {
    throw new DeveloperError_default("absoluteEpsilon is required.");
  }
  return left - right > -absoluteEpsilon;
};
var factorials = [1];
CesiumMath.factorial = function(n) {
  if (typeof n !== "number" || n < 0) {
    throw new DeveloperError_default(
      "A number greater than or equal to 0 is required."
    );
  }
  const length = factorials.length;
  if (n >= length) {
    let sum = factorials[length - 1];
    for (let i = length; i <= n; i++) {
      const next = sum * i;
      factorials.push(next);
      sum = next;
    }
  }
  return factorials[n];
};
CesiumMath.incrementWrap = function(n, maximumValue, minimumValue) {
  minimumValue = defaultValue_default(minimumValue, 0);
  if (!defined_default(n)) {
    throw new DeveloperError_default("n is required.");
  }
  if (maximumValue <= minimumValue) {
    throw new DeveloperError_default("maximumValue must be greater than minimumValue.");
  }
  ++n;
  if (n > maximumValue) {
    n = minimumValue;
  }
  return n;
};
CesiumMath.isPowerOfTwo = function(n) {
  if (typeof n !== "number" || n < 0 || n > 4294967295) {
    throw new DeveloperError_default("A number between 0 and (2^32)-1 is required.");
  }
  return n !== 0 && (n & n - 1) === 0;
};
CesiumMath.nextPowerOfTwo = function(n) {
  if (typeof n !== "number" || n < 0 || n > 2147483648) {
    throw new DeveloperError_default("A number between 0 and 2^31 is required.");
  }
  --n;
  n |= n >> 1;
  n |= n >> 2;
  n |= n >> 4;
  n |= n >> 8;
  n |= n >> 16;
  ++n;
  return n;
};
CesiumMath.previousPowerOfTwo = function(n) {
  if (typeof n !== "number" || n < 0 || n > 4294967295) {
    throw new DeveloperError_default("A number between 0 and (2^32)-1 is required.");
  }
  n |= n >> 1;
  n |= n >> 2;
  n |= n >> 4;
  n |= n >> 8;
  n |= n >> 16;
  n |= n >> 32;
  n = (n >>> 0) - (n >>> 1);
  return n;
};
CesiumMath.clamp = function(value, min, max) {
  Check_default.typeOf.number("value", value);
  Check_default.typeOf.number("min", min);
  Check_default.typeOf.number("max", max);
  return value < min ? min : value > max ? max : value;
};
var randomNumberGenerator = new import_mersenne_twister.default();
CesiumMath.setRandomNumberSeed = function(seed) {
  if (!defined_default(seed)) {
    throw new DeveloperError_default("seed is required.");
  }
  randomNumberGenerator = new import_mersenne_twister.default(seed);
};
CesiumMath.nextRandomNumber = function() {
  return randomNumberGenerator.random();
};
CesiumMath.randomBetween = function(min, max) {
  return CesiumMath.nextRandomNumber() * (max - min) + min;
};
CesiumMath.acosClamped = function(value) {
  if (!defined_default(value)) {
    throw new DeveloperError_default("value is required.");
  }
  return Math.acos(CesiumMath.clamp(value, -1, 1));
};
CesiumMath.asinClamped = function(value) {
  if (!defined_default(value)) {
    throw new DeveloperError_default("value is required.");
  }
  return Math.asin(CesiumMath.clamp(value, -1, 1));
};
CesiumMath.chordLength = function(angle, radius) {
  if (!defined_default(angle)) {
    throw new DeveloperError_default("angle is required.");
  }
  if (!defined_default(radius)) {
    throw new DeveloperError_default("radius is required.");
  }
  return 2 * radius * Math.sin(angle * 0.5);
};
CesiumMath.logBase = function(number, base) {
  if (!defined_default(number)) {
    throw new DeveloperError_default("number is required.");
  }
  if (!defined_default(base)) {
    throw new DeveloperError_default("base is required.");
  }
  return Math.log(number) / Math.log(base);
};
CesiumMath.cbrt = defaultValue_default(Math.cbrt, function cbrt(number) {
  const result = Math.pow(Math.abs(number), 1 / 3);
  return number < 0 ? -result : result;
});
CesiumMath.log2 = defaultValue_default(Math.log2, function log2(number) {
  return Math.log(number) * Math.LOG2E;
});
CesiumMath.fog = function(distanceToCamera, density) {
  const scalar = distanceToCamera * density;
  return 1 - Math.exp(-(scalar * scalar));
};
CesiumMath.fastApproximateAtan = function(x) {
  Check_default.typeOf.number("x", x);
  return x * (-0.1784 * Math.abs(x) - 0.0663 * x * x + 1.0301);
};
CesiumMath.fastApproximateAtan2 = function(x, y) {
  Check_default.typeOf.number("x", x);
  Check_default.typeOf.number("y", y);
  let opposite;
  let t = Math.abs(x);
  opposite = Math.abs(y);
  const adjacent = Math.max(t, opposite);
  opposite = Math.min(t, opposite);
  const oppositeOverAdjacent = opposite / adjacent;
  if (isNaN(oppositeOverAdjacent)) {
    throw new DeveloperError_default("either x or y must be nonzero");
  }
  t = CesiumMath.fastApproximateAtan(oppositeOverAdjacent);
  t = Math.abs(y) > Math.abs(x) ? CesiumMath.PI_OVER_TWO - t : t;
  t = x < 0 ? CesiumMath.PI - t : t;
  t = y < 0 ? -t : t;
  return t;
};
var Math_default = CesiumMath;

// packages/engine/Source/Core/Cartesian3.js
function Cartesian3(x, y, z) {
  this.x = defaultValue_default(x, 0);
  this.y = defaultValue_default(y, 0);
  this.z = defaultValue_default(z, 0);
}
Cartesian3.fromSpherical = function(spherical, result) {
  Check_default.typeOf.object("spherical", spherical);
  if (!defined_default(result)) {
    result = new Cartesian3();
  }
  const clock = spherical.clock;
  const cone = spherical.cone;
  const magnitude = defaultValue_default(spherical.magnitude, 1);
  const radial = magnitude * Math.sin(cone);
  result.x = radial * Math.cos(clock);
  result.y = radial * Math.sin(clock);
  result.z = magnitude * Math.cos(cone);
  return result;
};
Cartesian3.fromElements = function(x, y, z, result) {
  if (!defined_default(result)) {
    return new Cartesian3(x, y, z);
  }
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
Cartesian3.clone = function(cartesian, result) {
  if (!defined_default(cartesian)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Cartesian3(cartesian.x, cartesian.y, cartesian.z);
  }
  result.x = cartesian.x;
  result.y = cartesian.y;
  result.z = cartesian.z;
  return result;
};
Cartesian3.fromCartesian4 = Cartesian3.clone;
Cartesian3.packedLength = 3;
Cartesian3.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value.x;
  array[startingIndex++] = value.y;
  array[startingIndex] = value.z;
  return array;
};
Cartesian3.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Cartesian3();
  }
  result.x = array[startingIndex++];
  result.y = array[startingIndex++];
  result.z = array[startingIndex];
  return result;
};
Cartesian3.packArray = function(array, result) {
  Check_default.defined("array", array);
  const length = array.length;
  const resultLength = length * 3;
  if (!defined_default(result)) {
    result = new Array(resultLength);
  } else if (!Array.isArray(result) && result.length !== resultLength) {
    throw new DeveloperError_default(
      "If result is a typed array, it must have exactly array.length * 3 elements"
    );
  } else if (result.length !== resultLength) {
    result.length = resultLength;
  }
  for (let i = 0; i < length; ++i) {
    Cartesian3.pack(array[i], result, i * 3);
  }
  return result;
};
Cartesian3.unpackArray = function(array, result) {
  Check_default.defined("array", array);
  Check_default.typeOf.number.greaterThanOrEquals("array.length", array.length, 3);
  if (array.length % 3 !== 0) {
    throw new DeveloperError_default("array length must be a multiple of 3.");
  }
  const length = array.length;
  if (!defined_default(result)) {
    result = new Array(length / 3);
  } else {
    result.length = length / 3;
  }
  for (let i = 0; i < length; i += 3) {
    const index = i / 3;
    result[index] = Cartesian3.unpack(array, i, result[index]);
  }
  return result;
};
Cartesian3.fromArray = Cartesian3.unpack;
Cartesian3.maximumComponent = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return Math.max(cartesian.x, cartesian.y, cartesian.z);
};
Cartesian3.minimumComponent = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return Math.min(cartesian.x, cartesian.y, cartesian.z);
};
Cartesian3.minimumByComponent = function(first, second, result) {
  Check_default.typeOf.object("first", first);
  Check_default.typeOf.object("second", second);
  Check_default.typeOf.object("result", result);
  result.x = Math.min(first.x, second.x);
  result.y = Math.min(first.y, second.y);
  result.z = Math.min(first.z, second.z);
  return result;
};
Cartesian3.maximumByComponent = function(first, second, result) {
  Check_default.typeOf.object("first", first);
  Check_default.typeOf.object("second", second);
  Check_default.typeOf.object("result", result);
  result.x = Math.max(first.x, second.x);
  result.y = Math.max(first.y, second.y);
  result.z = Math.max(first.z, second.z);
  return result;
};
Cartesian3.clamp = function(value, min, max, result) {
  Check_default.typeOf.object("value", value);
  Check_default.typeOf.object("min", min);
  Check_default.typeOf.object("max", max);
  Check_default.typeOf.object("result", result);
  const x = Math_default.clamp(value.x, min.x, max.x);
  const y = Math_default.clamp(value.y, min.y, max.y);
  const z = Math_default.clamp(value.z, min.z, max.z);
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
Cartesian3.magnitudeSquared = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return cartesian.x * cartesian.x + cartesian.y * cartesian.y + cartesian.z * cartesian.z;
};
Cartesian3.magnitude = function(cartesian) {
  return Math.sqrt(Cartesian3.magnitudeSquared(cartesian));
};
var distanceScratch = new Cartesian3();
Cartesian3.distance = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Cartesian3.subtract(left, right, distanceScratch);
  return Cartesian3.magnitude(distanceScratch);
};
Cartesian3.distanceSquared = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Cartesian3.subtract(left, right, distanceScratch);
  return Cartesian3.magnitudeSquared(distanceScratch);
};
Cartesian3.normalize = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const magnitude = Cartesian3.magnitude(cartesian);
  result.x = cartesian.x / magnitude;
  result.y = cartesian.y / magnitude;
  result.z = cartesian.z / magnitude;
  if (isNaN(result.x) || isNaN(result.y) || isNaN(result.z)) {
    throw new DeveloperError_default("normalized result is not a number");
  }
  return result;
};
Cartesian3.dot = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  return left.x * right.x + left.y * right.y + left.z * right.z;
};
Cartesian3.multiplyComponents = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x * right.x;
  result.y = left.y * right.y;
  result.z = left.z * right.z;
  return result;
};
Cartesian3.divideComponents = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x / right.x;
  result.y = left.y / right.y;
  result.z = left.z / right.z;
  return result;
};
Cartesian3.add = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x + right.x;
  result.y = left.y + right.y;
  result.z = left.z + right.z;
  return result;
};
Cartesian3.subtract = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x - right.x;
  result.y = left.y - right.y;
  result.z = left.z - right.z;
  return result;
};
Cartesian3.multiplyByScalar = function(cartesian, scalar, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.x = cartesian.x * scalar;
  result.y = cartesian.y * scalar;
  result.z = cartesian.z * scalar;
  return result;
};
Cartesian3.divideByScalar = function(cartesian, scalar, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.x = cartesian.x / scalar;
  result.y = cartesian.y / scalar;
  result.z = cartesian.z / scalar;
  return result;
};
Cartesian3.negate = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result.x = -cartesian.x;
  result.y = -cartesian.y;
  result.z = -cartesian.z;
  return result;
};
Cartesian3.abs = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result.x = Math.abs(cartesian.x);
  result.y = Math.abs(cartesian.y);
  result.z = Math.abs(cartesian.z);
  return result;
};
var lerpScratch = new Cartesian3();
Cartesian3.lerp = function(start, end, t, result) {
  Check_default.typeOf.object("start", start);
  Check_default.typeOf.object("end", end);
  Check_default.typeOf.number("t", t);
  Check_default.typeOf.object("result", result);
  Cartesian3.multiplyByScalar(end, t, lerpScratch);
  result = Cartesian3.multiplyByScalar(start, 1 - t, result);
  return Cartesian3.add(lerpScratch, result, result);
};
var angleBetweenScratch = new Cartesian3();
var angleBetweenScratch2 = new Cartesian3();
Cartesian3.angleBetween = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Cartesian3.normalize(left, angleBetweenScratch);
  Cartesian3.normalize(right, angleBetweenScratch2);
  const cosine = Cartesian3.dot(angleBetweenScratch, angleBetweenScratch2);
  const sine = Cartesian3.magnitude(
    Cartesian3.cross(
      angleBetweenScratch,
      angleBetweenScratch2,
      angleBetweenScratch
    )
  );
  return Math.atan2(sine, cosine);
};
var mostOrthogonalAxisScratch = new Cartesian3();
Cartesian3.mostOrthogonalAxis = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const f = Cartesian3.normalize(cartesian, mostOrthogonalAxisScratch);
  Cartesian3.abs(f, f);
  if (f.x <= f.y) {
    if (f.x <= f.z) {
      result = Cartesian3.clone(Cartesian3.UNIT_X, result);
    } else {
      result = Cartesian3.clone(Cartesian3.UNIT_Z, result);
    }
  } else if (f.y <= f.z) {
    result = Cartesian3.clone(Cartesian3.UNIT_Y, result);
  } else {
    result = Cartesian3.clone(Cartesian3.UNIT_Z, result);
  }
  return result;
};
Cartesian3.projectVector = function(a3, b, result) {
  Check_default.defined("a", a3);
  Check_default.defined("b", b);
  Check_default.defined("result", result);
  const scalar = Cartesian3.dot(a3, b) / Cartesian3.dot(b, b);
  return Cartesian3.multiplyByScalar(b, scalar, result);
};
Cartesian3.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left.x === right.x && left.y === right.y && left.z === right.z;
};
Cartesian3.equalsArray = function(cartesian, array, offset) {
  return cartesian.x === array[offset] && cartesian.y === array[offset + 1] && cartesian.z === array[offset + 2];
};
Cartesian3.equalsEpsilon = function(left, right, relativeEpsilon, absoluteEpsilon) {
  return left === right || defined_default(left) && defined_default(right) && Math_default.equalsEpsilon(
    left.x,
    right.x,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    left.y,
    right.y,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    left.z,
    right.z,
    relativeEpsilon,
    absoluteEpsilon
  );
};
Cartesian3.cross = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  const leftX = left.x;
  const leftY = left.y;
  const leftZ = left.z;
  const rightX = right.x;
  const rightY = right.y;
  const rightZ = right.z;
  const x = leftY * rightZ - leftZ * rightY;
  const y = leftZ * rightX - leftX * rightZ;
  const z = leftX * rightY - leftY * rightX;
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
Cartesian3.midpoint = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = (left.x + right.x) * 0.5;
  result.y = (left.y + right.y) * 0.5;
  result.z = (left.z + right.z) * 0.5;
  return result;
};
Cartesian3.fromDegrees = function(longitude, latitude, height, ellipsoid, result) {
  Check_default.typeOf.number("longitude", longitude);
  Check_default.typeOf.number("latitude", latitude);
  longitude = Math_default.toRadians(longitude);
  latitude = Math_default.toRadians(latitude);
  return Cartesian3.fromRadians(longitude, latitude, height, ellipsoid, result);
};
var scratchN = new Cartesian3();
var scratchK = new Cartesian3();
var wgs84RadiiSquared = new Cartesian3(
  6378137 * 6378137,
  6378137 * 6378137,
  6356752314245179e-9 * 6356752314245179e-9
);
Cartesian3.fromRadians = function(longitude, latitude, height, ellipsoid, result) {
  Check_default.typeOf.number("longitude", longitude);
  Check_default.typeOf.number("latitude", latitude);
  height = defaultValue_default(height, 0);
  const radiiSquared = defined_default(ellipsoid) ? ellipsoid.radiiSquared : wgs84RadiiSquared;
  const cosLatitude = Math.cos(latitude);
  scratchN.x = cosLatitude * Math.cos(longitude);
  scratchN.y = cosLatitude * Math.sin(longitude);
  scratchN.z = Math.sin(latitude);
  scratchN = Cartesian3.normalize(scratchN, scratchN);
  Cartesian3.multiplyComponents(radiiSquared, scratchN, scratchK);
  const gamma = Math.sqrt(Cartesian3.dot(scratchN, scratchK));
  scratchK = Cartesian3.divideByScalar(scratchK, gamma, scratchK);
  scratchN = Cartesian3.multiplyByScalar(scratchN, height, scratchN);
  if (!defined_default(result)) {
    result = new Cartesian3();
  }
  return Cartesian3.add(scratchK, scratchN, result);
};
Cartesian3.fromDegreesArray = function(coordinates, ellipsoid, result) {
  Check_default.defined("coordinates", coordinates);
  if (coordinates.length < 2 || coordinates.length % 2 !== 0) {
    throw new DeveloperError_default(
      "the number of coordinates must be a multiple of 2 and at least 2"
    );
  }
  const length = coordinates.length;
  if (!defined_default(result)) {
    result = new Array(length / 2);
  } else {
    result.length = length / 2;
  }
  for (let i = 0; i < length; i += 2) {
    const longitude = coordinates[i];
    const latitude = coordinates[i + 1];
    const index = i / 2;
    result[index] = Cartesian3.fromDegrees(
      longitude,
      latitude,
      0,
      ellipsoid,
      result[index]
    );
  }
  return result;
};
Cartesian3.fromRadiansArray = function(coordinates, ellipsoid, result) {
  Check_default.defined("coordinates", coordinates);
  if (coordinates.length < 2 || coordinates.length % 2 !== 0) {
    throw new DeveloperError_default(
      "the number of coordinates must be a multiple of 2 and at least 2"
    );
  }
  const length = coordinates.length;
  if (!defined_default(result)) {
    result = new Array(length / 2);
  } else {
    result.length = length / 2;
  }
  for (let i = 0; i < length; i += 2) {
    const longitude = coordinates[i];
    const latitude = coordinates[i + 1];
    const index = i / 2;
    result[index] = Cartesian3.fromRadians(
      longitude,
      latitude,
      0,
      ellipsoid,
      result[index]
    );
  }
  return result;
};
Cartesian3.fromDegreesArrayHeights = function(coordinates, ellipsoid, result) {
  Check_default.defined("coordinates", coordinates);
  if (coordinates.length < 3 || coordinates.length % 3 !== 0) {
    throw new DeveloperError_default(
      "the number of coordinates must be a multiple of 3 and at least 3"
    );
  }
  const length = coordinates.length;
  if (!defined_default(result)) {
    result = new Array(length / 3);
  } else {
    result.length = length / 3;
  }
  for (let i = 0; i < length; i += 3) {
    const longitude = coordinates[i];
    const latitude = coordinates[i + 1];
    const height = coordinates[i + 2];
    const index = i / 3;
    result[index] = Cartesian3.fromDegrees(
      longitude,
      latitude,
      height,
      ellipsoid,
      result[index]
    );
  }
  return result;
};
Cartesian3.fromRadiansArrayHeights = function(coordinates, ellipsoid, result) {
  Check_default.defined("coordinates", coordinates);
  if (coordinates.length < 3 || coordinates.length % 3 !== 0) {
    throw new DeveloperError_default(
      "the number of coordinates must be a multiple of 3 and at least 3"
    );
  }
  const length = coordinates.length;
  if (!defined_default(result)) {
    result = new Array(length / 3);
  } else {
    result.length = length / 3;
  }
  for (let i = 0; i < length; i += 3) {
    const longitude = coordinates[i];
    const latitude = coordinates[i + 1];
    const height = coordinates[i + 2];
    const index = i / 3;
    result[index] = Cartesian3.fromRadians(
      longitude,
      latitude,
      height,
      ellipsoid,
      result[index]
    );
  }
  return result;
};
Cartesian3.ZERO = Object.freeze(new Cartesian3(0, 0, 0));
Cartesian3.ONE = Object.freeze(new Cartesian3(1, 1, 1));
Cartesian3.UNIT_X = Object.freeze(new Cartesian3(1, 0, 0));
Cartesian3.UNIT_Y = Object.freeze(new Cartesian3(0, 1, 0));
Cartesian3.UNIT_Z = Object.freeze(new Cartesian3(0, 0, 1));
Cartesian3.prototype.clone = function(result) {
  return Cartesian3.clone(this, result);
};
Cartesian3.prototype.equals = function(right) {
  return Cartesian3.equals(this, right);
};
Cartesian3.prototype.equalsEpsilon = function(right, relativeEpsilon, absoluteEpsilon) {
  return Cartesian3.equalsEpsilon(
    this,
    right,
    relativeEpsilon,
    absoluteEpsilon
  );
};
Cartesian3.prototype.toString = function() {
  return `(${this.x}, ${this.y}, ${this.z})`;
};
var Cartesian3_default = Cartesian3;

// packages/engine/Source/Core/Cartesian4.js
function Cartesian4(x, y, z, w) {
  this.x = defaultValue_default(x, 0);
  this.y = defaultValue_default(y, 0);
  this.z = defaultValue_default(z, 0);
  this.w = defaultValue_default(w, 0);
}
Cartesian4.fromElements = function(x, y, z, w, result) {
  if (!defined_default(result)) {
    return new Cartesian4(x, y, z, w);
  }
  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};
Cartesian4.fromColor = function(color, result) {
  Check_default.typeOf.object("color", color);
  if (!defined_default(result)) {
    return new Cartesian4(color.red, color.green, color.blue, color.alpha);
  }
  result.x = color.red;
  result.y = color.green;
  result.z = color.blue;
  result.w = color.alpha;
  return result;
};
Cartesian4.clone = function(cartesian, result) {
  if (!defined_default(cartesian)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Cartesian4(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
  }
  result.x = cartesian.x;
  result.y = cartesian.y;
  result.z = cartesian.z;
  result.w = cartesian.w;
  return result;
};
Cartesian4.packedLength = 4;
Cartesian4.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value.x;
  array[startingIndex++] = value.y;
  array[startingIndex++] = value.z;
  array[startingIndex] = value.w;
  return array;
};
Cartesian4.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Cartesian4();
  }
  result.x = array[startingIndex++];
  result.y = array[startingIndex++];
  result.z = array[startingIndex++];
  result.w = array[startingIndex];
  return result;
};
Cartesian4.packArray = function(array, result) {
  Check_default.defined("array", array);
  const length = array.length;
  const resultLength = length * 4;
  if (!defined_default(result)) {
    result = new Array(resultLength);
  } else if (!Array.isArray(result) && result.length !== resultLength) {
    throw new DeveloperError_default(
      "If result is a typed array, it must have exactly array.length * 4 elements"
    );
  } else if (result.length !== resultLength) {
    result.length = resultLength;
  }
  for (let i = 0; i < length; ++i) {
    Cartesian4.pack(array[i], result, i * 4);
  }
  return result;
};
Cartesian4.unpackArray = function(array, result) {
  Check_default.defined("array", array);
  Check_default.typeOf.number.greaterThanOrEquals("array.length", array.length, 4);
  if (array.length % 4 !== 0) {
    throw new DeveloperError_default("array length must be a multiple of 4.");
  }
  const length = array.length;
  if (!defined_default(result)) {
    result = new Array(length / 4);
  } else {
    result.length = length / 4;
  }
  for (let i = 0; i < length; i += 4) {
    const index = i / 4;
    result[index] = Cartesian4.unpack(array, i, result[index]);
  }
  return result;
};
Cartesian4.fromArray = Cartesian4.unpack;
Cartesian4.maximumComponent = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return Math.max(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
};
Cartesian4.minimumComponent = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return Math.min(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
};
Cartesian4.minimumByComponent = function(first, second, result) {
  Check_default.typeOf.object("first", first);
  Check_default.typeOf.object("second", second);
  Check_default.typeOf.object("result", result);
  result.x = Math.min(first.x, second.x);
  result.y = Math.min(first.y, second.y);
  result.z = Math.min(first.z, second.z);
  result.w = Math.min(first.w, second.w);
  return result;
};
Cartesian4.maximumByComponent = function(first, second, result) {
  Check_default.typeOf.object("first", first);
  Check_default.typeOf.object("second", second);
  Check_default.typeOf.object("result", result);
  result.x = Math.max(first.x, second.x);
  result.y = Math.max(first.y, second.y);
  result.z = Math.max(first.z, second.z);
  result.w = Math.max(first.w, second.w);
  return result;
};
Cartesian4.clamp = function(value, min, max, result) {
  Check_default.typeOf.object("value", value);
  Check_default.typeOf.object("min", min);
  Check_default.typeOf.object("max", max);
  Check_default.typeOf.object("result", result);
  const x = Math_default.clamp(value.x, min.x, max.x);
  const y = Math_default.clamp(value.y, min.y, max.y);
  const z = Math_default.clamp(value.z, min.z, max.z);
  const w = Math_default.clamp(value.w, min.w, max.w);
  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};
Cartesian4.magnitudeSquared = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return cartesian.x * cartesian.x + cartesian.y * cartesian.y + cartesian.z * cartesian.z + cartesian.w * cartesian.w;
};
Cartesian4.magnitude = function(cartesian) {
  return Math.sqrt(Cartesian4.magnitudeSquared(cartesian));
};
var distanceScratch2 = new Cartesian4();
Cartesian4.distance = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Cartesian4.subtract(left, right, distanceScratch2);
  return Cartesian4.magnitude(distanceScratch2);
};
Cartesian4.distanceSquared = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Cartesian4.subtract(left, right, distanceScratch2);
  return Cartesian4.magnitudeSquared(distanceScratch2);
};
Cartesian4.normalize = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const magnitude = Cartesian4.magnitude(cartesian);
  result.x = cartesian.x / magnitude;
  result.y = cartesian.y / magnitude;
  result.z = cartesian.z / magnitude;
  result.w = cartesian.w / magnitude;
  if (isNaN(result.x) || isNaN(result.y) || isNaN(result.z) || isNaN(result.w)) {
    throw new DeveloperError_default("normalized result is not a number");
  }
  return result;
};
Cartesian4.dot = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  return left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w;
};
Cartesian4.multiplyComponents = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x * right.x;
  result.y = left.y * right.y;
  result.z = left.z * right.z;
  result.w = left.w * right.w;
  return result;
};
Cartesian4.divideComponents = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x / right.x;
  result.y = left.y / right.y;
  result.z = left.z / right.z;
  result.w = left.w / right.w;
  return result;
};
Cartesian4.add = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x + right.x;
  result.y = left.y + right.y;
  result.z = left.z + right.z;
  result.w = left.w + right.w;
  return result;
};
Cartesian4.subtract = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x - right.x;
  result.y = left.y - right.y;
  result.z = left.z - right.z;
  result.w = left.w - right.w;
  return result;
};
Cartesian4.multiplyByScalar = function(cartesian, scalar, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.x = cartesian.x * scalar;
  result.y = cartesian.y * scalar;
  result.z = cartesian.z * scalar;
  result.w = cartesian.w * scalar;
  return result;
};
Cartesian4.divideByScalar = function(cartesian, scalar, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.x = cartesian.x / scalar;
  result.y = cartesian.y / scalar;
  result.z = cartesian.z / scalar;
  result.w = cartesian.w / scalar;
  return result;
};
Cartesian4.negate = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result.x = -cartesian.x;
  result.y = -cartesian.y;
  result.z = -cartesian.z;
  result.w = -cartesian.w;
  return result;
};
Cartesian4.abs = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result.x = Math.abs(cartesian.x);
  result.y = Math.abs(cartesian.y);
  result.z = Math.abs(cartesian.z);
  result.w = Math.abs(cartesian.w);
  return result;
};
var lerpScratch2 = new Cartesian4();
Cartesian4.lerp = function(start, end, t, result) {
  Check_default.typeOf.object("start", start);
  Check_default.typeOf.object("end", end);
  Check_default.typeOf.number("t", t);
  Check_default.typeOf.object("result", result);
  Cartesian4.multiplyByScalar(end, t, lerpScratch2);
  result = Cartesian4.multiplyByScalar(start, 1 - t, result);
  return Cartesian4.add(lerpScratch2, result, result);
};
var mostOrthogonalAxisScratch2 = new Cartesian4();
Cartesian4.mostOrthogonalAxis = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const f = Cartesian4.normalize(cartesian, mostOrthogonalAxisScratch2);
  Cartesian4.abs(f, f);
  if (f.x <= f.y) {
    if (f.x <= f.z) {
      if (f.x <= f.w) {
        result = Cartesian4.clone(Cartesian4.UNIT_X, result);
      } else {
        result = Cartesian4.clone(Cartesian4.UNIT_W, result);
      }
    } else if (f.z <= f.w) {
      result = Cartesian4.clone(Cartesian4.UNIT_Z, result);
    } else {
      result = Cartesian4.clone(Cartesian4.UNIT_W, result);
    }
  } else if (f.y <= f.z) {
    if (f.y <= f.w) {
      result = Cartesian4.clone(Cartesian4.UNIT_Y, result);
    } else {
      result = Cartesian4.clone(Cartesian4.UNIT_W, result);
    }
  } else if (f.z <= f.w) {
    result = Cartesian4.clone(Cartesian4.UNIT_Z, result);
  } else {
    result = Cartesian4.clone(Cartesian4.UNIT_W, result);
  }
  return result;
};
Cartesian4.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left.x === right.x && left.y === right.y && left.z === right.z && left.w === right.w;
};
Cartesian4.equalsArray = function(cartesian, array, offset) {
  return cartesian.x === array[offset] && cartesian.y === array[offset + 1] && cartesian.z === array[offset + 2] && cartesian.w === array[offset + 3];
};
Cartesian4.equalsEpsilon = function(left, right, relativeEpsilon, absoluteEpsilon) {
  return left === right || defined_default(left) && defined_default(right) && Math_default.equalsEpsilon(
    left.x,
    right.x,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    left.y,
    right.y,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    left.z,
    right.z,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    left.w,
    right.w,
    relativeEpsilon,
    absoluteEpsilon
  );
};
Cartesian4.ZERO = Object.freeze(new Cartesian4(0, 0, 0, 0));
Cartesian4.ONE = Object.freeze(new Cartesian4(1, 1, 1, 1));
Cartesian4.UNIT_X = Object.freeze(new Cartesian4(1, 0, 0, 0));
Cartesian4.UNIT_Y = Object.freeze(new Cartesian4(0, 1, 0, 0));
Cartesian4.UNIT_Z = Object.freeze(new Cartesian4(0, 0, 1, 0));
Cartesian4.UNIT_W = Object.freeze(new Cartesian4(0, 0, 0, 1));
Cartesian4.prototype.clone = function(result) {
  return Cartesian4.clone(this, result);
};
Cartesian4.prototype.equals = function(right) {
  return Cartesian4.equals(this, right);
};
Cartesian4.prototype.equalsEpsilon = function(right, relativeEpsilon, absoluteEpsilon) {
  return Cartesian4.equalsEpsilon(
    this,
    right,
    relativeEpsilon,
    absoluteEpsilon
  );
};
Cartesian4.prototype.toString = function() {
  return `(${this.x}, ${this.y}, ${this.z}, ${this.w})`;
};
var scratchF32Array = new Float32Array(1);
var scratchU8Array = new Uint8Array(scratchF32Array.buffer);
var testU32 = new Uint32Array([287454020]);
var testU8 = new Uint8Array(testU32.buffer);
var littleEndian = testU8[0] === 68;
Cartesian4.packFloat = function(value, result) {
  Check_default.typeOf.number("value", value);
  if (!defined_default(result)) {
    result = new Cartesian4();
  }
  scratchF32Array[0] = value;
  if (littleEndian) {
    result.x = scratchU8Array[0];
    result.y = scratchU8Array[1];
    result.z = scratchU8Array[2];
    result.w = scratchU8Array[3];
  } else {
    result.x = scratchU8Array[3];
    result.y = scratchU8Array[2];
    result.z = scratchU8Array[1];
    result.w = scratchU8Array[0];
  }
  return result;
};
Cartesian4.unpackFloat = function(packedFloat) {
  Check_default.typeOf.object("packedFloat", packedFloat);
  if (littleEndian) {
    scratchU8Array[0] = packedFloat.x;
    scratchU8Array[1] = packedFloat.y;
    scratchU8Array[2] = packedFloat.z;
    scratchU8Array[3] = packedFloat.w;
  } else {
    scratchU8Array[0] = packedFloat.w;
    scratchU8Array[1] = packedFloat.z;
    scratchU8Array[2] = packedFloat.y;
    scratchU8Array[3] = packedFloat.x;
  }
  return scratchF32Array[0];
};
var Cartesian4_default = Cartesian4;

// packages/engine/Source/Core/Matrix3.js
function Matrix3(column0Row0, column1Row0, column2Row0, column0Row1, column1Row1, column2Row1, column0Row2, column1Row2, column2Row2) {
  this[0] = defaultValue_default(column0Row0, 0);
  this[1] = defaultValue_default(column0Row1, 0);
  this[2] = defaultValue_default(column0Row2, 0);
  this[3] = defaultValue_default(column1Row0, 0);
  this[4] = defaultValue_default(column1Row1, 0);
  this[5] = defaultValue_default(column1Row2, 0);
  this[6] = defaultValue_default(column2Row0, 0);
  this[7] = defaultValue_default(column2Row1, 0);
  this[8] = defaultValue_default(column2Row2, 0);
}
Matrix3.packedLength = 9;
Matrix3.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value[0];
  array[startingIndex++] = value[1];
  array[startingIndex++] = value[2];
  array[startingIndex++] = value[3];
  array[startingIndex++] = value[4];
  array[startingIndex++] = value[5];
  array[startingIndex++] = value[6];
  array[startingIndex++] = value[7];
  array[startingIndex++] = value[8];
  return array;
};
Matrix3.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Matrix3();
  }
  result[0] = array[startingIndex++];
  result[1] = array[startingIndex++];
  result[2] = array[startingIndex++];
  result[3] = array[startingIndex++];
  result[4] = array[startingIndex++];
  result[5] = array[startingIndex++];
  result[6] = array[startingIndex++];
  result[7] = array[startingIndex++];
  result[8] = array[startingIndex++];
  return result;
};
Matrix3.packArray = function(array, result) {
  Check_default.defined("array", array);
  const length = array.length;
  const resultLength = length * 9;
  if (!defined_default(result)) {
    result = new Array(resultLength);
  } else if (!Array.isArray(result) && result.length !== resultLength) {
    throw new DeveloperError_default(
      "If result is a typed array, it must have exactly array.length * 9 elements"
    );
  } else if (result.length !== resultLength) {
    result.length = resultLength;
  }
  for (let i = 0; i < length; ++i) {
    Matrix3.pack(array[i], result, i * 9);
  }
  return result;
};
Matrix3.unpackArray = function(array, result) {
  Check_default.defined("array", array);
  Check_default.typeOf.number.greaterThanOrEquals("array.length", array.length, 9);
  if (array.length % 9 !== 0) {
    throw new DeveloperError_default("array length must be a multiple of 9.");
  }
  const length = array.length;
  if (!defined_default(result)) {
    result = new Array(length / 9);
  } else {
    result.length = length / 9;
  }
  for (let i = 0; i < length; i += 9) {
    const index = i / 9;
    result[index] = Matrix3.unpack(array, i, result[index]);
  }
  return result;
};
Matrix3.clone = function(matrix, result) {
  if (!defined_default(matrix)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Matrix3(
      matrix[0],
      matrix[3],
      matrix[6],
      matrix[1],
      matrix[4],
      matrix[7],
      matrix[2],
      matrix[5],
      matrix[8]
    );
  }
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  result[4] = matrix[4];
  result[5] = matrix[5];
  result[6] = matrix[6];
  result[7] = matrix[7];
  result[8] = matrix[8];
  return result;
};
Matrix3.fromArray = Matrix3.unpack;
Matrix3.fromColumnMajorArray = function(values, result) {
  Check_default.defined("values", values);
  return Matrix3.clone(values, result);
};
Matrix3.fromRowMajorArray = function(values, result) {
  Check_default.defined("values", values);
  if (!defined_default(result)) {
    return new Matrix3(
      values[0],
      values[1],
      values[2],
      values[3],
      values[4],
      values[5],
      values[6],
      values[7],
      values[8]
    );
  }
  result[0] = values[0];
  result[1] = values[3];
  result[2] = values[6];
  result[3] = values[1];
  result[4] = values[4];
  result[5] = values[7];
  result[6] = values[2];
  result[7] = values[5];
  result[8] = values[8];
  return result;
};
Matrix3.fromQuaternion = function(quaternion, result) {
  Check_default.typeOf.object("quaternion", quaternion);
  const x2 = quaternion.x * quaternion.x;
  const xy = quaternion.x * quaternion.y;
  const xz = quaternion.x * quaternion.z;
  const xw = quaternion.x * quaternion.w;
  const y2 = quaternion.y * quaternion.y;
  const yz = quaternion.y * quaternion.z;
  const yw = quaternion.y * quaternion.w;
  const z2 = quaternion.z * quaternion.z;
  const zw = quaternion.z * quaternion.w;
  const w2 = quaternion.w * quaternion.w;
  const m00 = x2 - y2 - z2 + w2;
  const m01 = 2 * (xy - zw);
  const m02 = 2 * (xz + yw);
  const m10 = 2 * (xy + zw);
  const m11 = -x2 + y2 - z2 + w2;
  const m12 = 2 * (yz - xw);
  const m20 = 2 * (xz - yw);
  const m21 = 2 * (yz + xw);
  const m22 = -x2 - y2 + z2 + w2;
  if (!defined_default(result)) {
    return new Matrix3(m00, m01, m02, m10, m11, m12, m20, m21, m22);
  }
  result[0] = m00;
  result[1] = m10;
  result[2] = m20;
  result[3] = m01;
  result[4] = m11;
  result[5] = m21;
  result[6] = m02;
  result[7] = m12;
  result[8] = m22;
  return result;
};
Matrix3.fromHeadingPitchRoll = function(headingPitchRoll, result) {
  Check_default.typeOf.object("headingPitchRoll", headingPitchRoll);
  const cosTheta = Math.cos(-headingPitchRoll.pitch);
  const cosPsi = Math.cos(-headingPitchRoll.heading);
  const cosPhi = Math.cos(headingPitchRoll.roll);
  const sinTheta = Math.sin(-headingPitchRoll.pitch);
  const sinPsi = Math.sin(-headingPitchRoll.heading);
  const sinPhi = Math.sin(headingPitchRoll.roll);
  const m00 = cosTheta * cosPsi;
  const m01 = -cosPhi * sinPsi + sinPhi * sinTheta * cosPsi;
  const m02 = sinPhi * sinPsi + cosPhi * sinTheta * cosPsi;
  const m10 = cosTheta * sinPsi;
  const m11 = cosPhi * cosPsi + sinPhi * sinTheta * sinPsi;
  const m12 = -sinPhi * cosPsi + cosPhi * sinTheta * sinPsi;
  const m20 = -sinTheta;
  const m21 = sinPhi * cosTheta;
  const m22 = cosPhi * cosTheta;
  if (!defined_default(result)) {
    return new Matrix3(m00, m01, m02, m10, m11, m12, m20, m21, m22);
  }
  result[0] = m00;
  result[1] = m10;
  result[2] = m20;
  result[3] = m01;
  result[4] = m11;
  result[5] = m21;
  result[6] = m02;
  result[7] = m12;
  result[8] = m22;
  return result;
};
Matrix3.fromScale = function(scale, result) {
  Check_default.typeOf.object("scale", scale);
  if (!defined_default(result)) {
    return new Matrix3(scale.x, 0, 0, 0, scale.y, 0, 0, 0, scale.z);
  }
  result[0] = scale.x;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = scale.y;
  result[5] = 0;
  result[6] = 0;
  result[7] = 0;
  result[8] = scale.z;
  return result;
};
Matrix3.fromUniformScale = function(scale, result) {
  Check_default.typeOf.number("scale", scale);
  if (!defined_default(result)) {
    return new Matrix3(scale, 0, 0, 0, scale, 0, 0, 0, scale);
  }
  result[0] = scale;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = scale;
  result[5] = 0;
  result[6] = 0;
  result[7] = 0;
  result[8] = scale;
  return result;
};
Matrix3.fromCrossProduct = function(vector, result) {
  Check_default.typeOf.object("vector", vector);
  if (!defined_default(result)) {
    return new Matrix3(
      0,
      -vector.z,
      vector.y,
      vector.z,
      0,
      -vector.x,
      -vector.y,
      vector.x,
      0
    );
  }
  result[0] = 0;
  result[1] = vector.z;
  result[2] = -vector.y;
  result[3] = -vector.z;
  result[4] = 0;
  result[5] = vector.x;
  result[6] = vector.y;
  result[7] = -vector.x;
  result[8] = 0;
  return result;
};
Matrix3.fromRotationX = function(angle, result) {
  Check_default.typeOf.number("angle", angle);
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  if (!defined_default(result)) {
    return new Matrix3(
      1,
      0,
      0,
      0,
      cosAngle,
      -sinAngle,
      0,
      sinAngle,
      cosAngle
    );
  }
  result[0] = 1;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = cosAngle;
  result[5] = sinAngle;
  result[6] = 0;
  result[7] = -sinAngle;
  result[8] = cosAngle;
  return result;
};
Matrix3.fromRotationY = function(angle, result) {
  Check_default.typeOf.number("angle", angle);
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  if (!defined_default(result)) {
    return new Matrix3(
      cosAngle,
      0,
      sinAngle,
      0,
      1,
      0,
      -sinAngle,
      0,
      cosAngle
    );
  }
  result[0] = cosAngle;
  result[1] = 0;
  result[2] = -sinAngle;
  result[3] = 0;
  result[4] = 1;
  result[5] = 0;
  result[6] = sinAngle;
  result[7] = 0;
  result[8] = cosAngle;
  return result;
};
Matrix3.fromRotationZ = function(angle, result) {
  Check_default.typeOf.number("angle", angle);
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  if (!defined_default(result)) {
    return new Matrix3(
      cosAngle,
      -sinAngle,
      0,
      sinAngle,
      cosAngle,
      0,
      0,
      0,
      1
    );
  }
  result[0] = cosAngle;
  result[1] = sinAngle;
  result[2] = 0;
  result[3] = -sinAngle;
  result[4] = cosAngle;
  result[5] = 0;
  result[6] = 0;
  result[7] = 0;
  result[8] = 1;
  return result;
};
Matrix3.toArray = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  if (!defined_default(result)) {
    return [
      matrix[0],
      matrix[1],
      matrix[2],
      matrix[3],
      matrix[4],
      matrix[5],
      matrix[6],
      matrix[7],
      matrix[8]
    ];
  }
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  result[4] = matrix[4];
  result[5] = matrix[5];
  result[6] = matrix[6];
  result[7] = matrix[7];
  result[8] = matrix[8];
  return result;
};
Matrix3.getElementIndex = function(column, row) {
  Check_default.typeOf.number.greaterThanOrEquals("row", row, 0);
  Check_default.typeOf.number.lessThanOrEquals("row", row, 2);
  Check_default.typeOf.number.greaterThanOrEquals("column", column, 0);
  Check_default.typeOf.number.lessThanOrEquals("column", column, 2);
  return column * 3 + row;
};
Matrix3.getColumn = function(matrix, index, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 2);
  Check_default.typeOf.object("result", result);
  const startIndex = index * 3;
  const x = matrix[startIndex];
  const y = matrix[startIndex + 1];
  const z = matrix[startIndex + 2];
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
Matrix3.setColumn = function(matrix, index, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 2);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result = Matrix3.clone(matrix, result);
  const startIndex = index * 3;
  result[startIndex] = cartesian.x;
  result[startIndex + 1] = cartesian.y;
  result[startIndex + 2] = cartesian.z;
  return result;
};
Matrix3.getRow = function(matrix, index, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 2);
  Check_default.typeOf.object("result", result);
  const x = matrix[index];
  const y = matrix[index + 3];
  const z = matrix[index + 6];
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
Matrix3.setRow = function(matrix, index, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 2);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result = Matrix3.clone(matrix, result);
  result[index] = cartesian.x;
  result[index + 3] = cartesian.y;
  result[index + 6] = cartesian.z;
  return result;
};
var scaleScratch1 = new Cartesian3_default();
Matrix3.setScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("scale", scale);
  Check_default.typeOf.object("result", result);
  const existingScale = Matrix3.getScale(matrix, scaleScratch1);
  const scaleRatioX = scale.x / existingScale.x;
  const scaleRatioY = scale.y / existingScale.y;
  const scaleRatioZ = scale.z / existingScale.z;
  result[0] = matrix[0] * scaleRatioX;
  result[1] = matrix[1] * scaleRatioX;
  result[2] = matrix[2] * scaleRatioX;
  result[3] = matrix[3] * scaleRatioY;
  result[4] = matrix[4] * scaleRatioY;
  result[5] = matrix[5] * scaleRatioY;
  result[6] = matrix[6] * scaleRatioZ;
  result[7] = matrix[7] * scaleRatioZ;
  result[8] = matrix[8] * scaleRatioZ;
  return result;
};
var scaleScratch2 = new Cartesian3_default();
Matrix3.setUniformScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scale", scale);
  Check_default.typeOf.object("result", result);
  const existingScale = Matrix3.getScale(matrix, scaleScratch2);
  const scaleRatioX = scale / existingScale.x;
  const scaleRatioY = scale / existingScale.y;
  const scaleRatioZ = scale / existingScale.z;
  result[0] = matrix[0] * scaleRatioX;
  result[1] = matrix[1] * scaleRatioX;
  result[2] = matrix[2] * scaleRatioX;
  result[3] = matrix[3] * scaleRatioY;
  result[4] = matrix[4] * scaleRatioY;
  result[5] = matrix[5] * scaleRatioY;
  result[6] = matrix[6] * scaleRatioZ;
  result[7] = matrix[7] * scaleRatioZ;
  result[8] = matrix[8] * scaleRatioZ;
  return result;
};
var scratchColumn = new Cartesian3_default();
Matrix3.getScale = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result.x = Cartesian3_default.magnitude(
    Cartesian3_default.fromElements(matrix[0], matrix[1], matrix[2], scratchColumn)
  );
  result.y = Cartesian3_default.magnitude(
    Cartesian3_default.fromElements(matrix[3], matrix[4], matrix[5], scratchColumn)
  );
  result.z = Cartesian3_default.magnitude(
    Cartesian3_default.fromElements(matrix[6], matrix[7], matrix[8], scratchColumn)
  );
  return result;
};
var scaleScratch3 = new Cartesian3_default();
Matrix3.getMaximumScale = function(matrix) {
  Matrix3.getScale(matrix, scaleScratch3);
  return Cartesian3_default.maximumComponent(scaleScratch3);
};
var scaleScratch4 = new Cartesian3_default();
Matrix3.setRotation = function(matrix, rotation, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const scale = Matrix3.getScale(matrix, scaleScratch4);
  result[0] = rotation[0] * scale.x;
  result[1] = rotation[1] * scale.x;
  result[2] = rotation[2] * scale.x;
  result[3] = rotation[3] * scale.y;
  result[4] = rotation[4] * scale.y;
  result[5] = rotation[5] * scale.y;
  result[6] = rotation[6] * scale.z;
  result[7] = rotation[7] * scale.z;
  result[8] = rotation[8] * scale.z;
  return result;
};
var scaleScratch5 = new Cartesian3_default();
Matrix3.getRotation = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const scale = Matrix3.getScale(matrix, scaleScratch5);
  result[0] = matrix[0] / scale.x;
  result[1] = matrix[1] / scale.x;
  result[2] = matrix[2] / scale.x;
  result[3] = matrix[3] / scale.y;
  result[4] = matrix[4] / scale.y;
  result[5] = matrix[5] / scale.y;
  result[6] = matrix[6] / scale.z;
  result[7] = matrix[7] / scale.z;
  result[8] = matrix[8] / scale.z;
  return result;
};
Matrix3.multiply = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  const column0Row0 = left[0] * right[0] + left[3] * right[1] + left[6] * right[2];
  const column0Row1 = left[1] * right[0] + left[4] * right[1] + left[7] * right[2];
  const column0Row2 = left[2] * right[0] + left[5] * right[1] + left[8] * right[2];
  const column1Row0 = left[0] * right[3] + left[3] * right[4] + left[6] * right[5];
  const column1Row1 = left[1] * right[3] + left[4] * right[4] + left[7] * right[5];
  const column1Row2 = left[2] * right[3] + left[5] * right[4] + left[8] * right[5];
  const column2Row0 = left[0] * right[6] + left[3] * right[7] + left[6] * right[8];
  const column2Row1 = left[1] * right[6] + left[4] * right[7] + left[7] * right[8];
  const column2Row2 = left[2] * right[6] + left[5] * right[7] + left[8] * right[8];
  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column0Row2;
  result[3] = column1Row0;
  result[4] = column1Row1;
  result[5] = column1Row2;
  result[6] = column2Row0;
  result[7] = column2Row1;
  result[8] = column2Row2;
  return result;
};
Matrix3.add = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result[0] = left[0] + right[0];
  result[1] = left[1] + right[1];
  result[2] = left[2] + right[2];
  result[3] = left[3] + right[3];
  result[4] = left[4] + right[4];
  result[5] = left[5] + right[5];
  result[6] = left[6] + right[6];
  result[7] = left[7] + right[7];
  result[8] = left[8] + right[8];
  return result;
};
Matrix3.subtract = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result[0] = left[0] - right[0];
  result[1] = left[1] - right[1];
  result[2] = left[2] - right[2];
  result[3] = left[3] - right[3];
  result[4] = left[4] - right[4];
  result[5] = left[5] - right[5];
  result[6] = left[6] - right[6];
  result[7] = left[7] - right[7];
  result[8] = left[8] - right[8];
  return result;
};
Matrix3.multiplyByVector = function(matrix, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const vX = cartesian.x;
  const vY = cartesian.y;
  const vZ = cartesian.z;
  const x = matrix[0] * vX + matrix[3] * vY + matrix[6] * vZ;
  const y = matrix[1] * vX + matrix[4] * vY + matrix[7] * vZ;
  const z = matrix[2] * vX + matrix[5] * vY + matrix[8] * vZ;
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
Matrix3.multiplyByScalar = function(matrix, scalar, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0] * scalar;
  result[1] = matrix[1] * scalar;
  result[2] = matrix[2] * scalar;
  result[3] = matrix[3] * scalar;
  result[4] = matrix[4] * scalar;
  result[5] = matrix[5] * scalar;
  result[6] = matrix[6] * scalar;
  result[7] = matrix[7] * scalar;
  result[8] = matrix[8] * scalar;
  return result;
};
Matrix3.multiplyByScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("scale", scale);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0] * scale.x;
  result[1] = matrix[1] * scale.x;
  result[2] = matrix[2] * scale.x;
  result[3] = matrix[3] * scale.y;
  result[4] = matrix[4] * scale.y;
  result[5] = matrix[5] * scale.y;
  result[6] = matrix[6] * scale.z;
  result[7] = matrix[7] * scale.z;
  result[8] = matrix[8] * scale.z;
  return result;
};
Matrix3.multiplyByUniformScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scale", scale);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0] * scale;
  result[1] = matrix[1] * scale;
  result[2] = matrix[2] * scale;
  result[3] = matrix[3] * scale;
  result[4] = matrix[4] * scale;
  result[5] = matrix[5] * scale;
  result[6] = matrix[6] * scale;
  result[7] = matrix[7] * scale;
  result[8] = matrix[8] * scale;
  return result;
};
Matrix3.negate = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result[0] = -matrix[0];
  result[1] = -matrix[1];
  result[2] = -matrix[2];
  result[3] = -matrix[3];
  result[4] = -matrix[4];
  result[5] = -matrix[5];
  result[6] = -matrix[6];
  result[7] = -matrix[7];
  result[8] = -matrix[8];
  return result;
};
Matrix3.transpose = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const column0Row0 = matrix[0];
  const column0Row1 = matrix[3];
  const column0Row2 = matrix[6];
  const column1Row0 = matrix[1];
  const column1Row1 = matrix[4];
  const column1Row2 = matrix[7];
  const column2Row0 = matrix[2];
  const column2Row1 = matrix[5];
  const column2Row2 = matrix[8];
  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column0Row2;
  result[3] = column1Row0;
  result[4] = column1Row1;
  result[5] = column1Row2;
  result[6] = column2Row0;
  result[7] = column2Row1;
  result[8] = column2Row2;
  return result;
};
function computeFrobeniusNorm(matrix) {
  let norm = 0;
  for (let i = 0; i < 9; ++i) {
    const temp = matrix[i];
    norm += temp * temp;
  }
  return Math.sqrt(norm);
}
var rowVal = [1, 0, 0];
var colVal = [2, 2, 1];
function offDiagonalFrobeniusNorm(matrix) {
  let norm = 0;
  for (let i = 0; i < 3; ++i) {
    const temp = matrix[Matrix3.getElementIndex(colVal[i], rowVal[i])];
    norm += 2 * temp * temp;
  }
  return Math.sqrt(norm);
}
function shurDecomposition(matrix, result) {
  const tolerance = Math_default.EPSILON15;
  let maxDiagonal = 0;
  let rotAxis = 1;
  for (let i = 0; i < 3; ++i) {
    const temp = Math.abs(
      matrix[Matrix3.getElementIndex(colVal[i], rowVal[i])]
    );
    if (temp > maxDiagonal) {
      rotAxis = i;
      maxDiagonal = temp;
    }
  }
  let c = 1;
  let s = 0;
  const p = rowVal[rotAxis];
  const q = colVal[rotAxis];
  if (Math.abs(matrix[Matrix3.getElementIndex(q, p)]) > tolerance) {
    const qq = matrix[Matrix3.getElementIndex(q, q)];
    const pp = matrix[Matrix3.getElementIndex(p, p)];
    const qp = matrix[Matrix3.getElementIndex(q, p)];
    const tau = (qq - pp) / 2 / qp;
    let t;
    if (tau < 0) {
      t = -1 / (-tau + Math.sqrt(1 + tau * tau));
    } else {
      t = 1 / (tau + Math.sqrt(1 + tau * tau));
    }
    c = 1 / Math.sqrt(1 + t * t);
    s = t * c;
  }
  result = Matrix3.clone(Matrix3.IDENTITY, result);
  result[Matrix3.getElementIndex(p, p)] = result[Matrix3.getElementIndex(q, q)] = c;
  result[Matrix3.getElementIndex(q, p)] = s;
  result[Matrix3.getElementIndex(p, q)] = -s;
  return result;
}
var jMatrix = new Matrix3();
var jMatrixTranspose = new Matrix3();
Matrix3.computeEigenDecomposition = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  const tolerance = Math_default.EPSILON20;
  const maxSweeps = 10;
  let count = 0;
  let sweep = 0;
  if (!defined_default(result)) {
    result = {};
  }
  const unitaryMatrix = result.unitary = Matrix3.clone(
    Matrix3.IDENTITY,
    result.unitary
  );
  const diagMatrix = result.diagonal = Matrix3.clone(matrix, result.diagonal);
  const epsilon = tolerance * computeFrobeniusNorm(diagMatrix);
  while (sweep < maxSweeps && offDiagonalFrobeniusNorm(diagMatrix) > epsilon) {
    shurDecomposition(diagMatrix, jMatrix);
    Matrix3.transpose(jMatrix, jMatrixTranspose);
    Matrix3.multiply(diagMatrix, jMatrix, diagMatrix);
    Matrix3.multiply(jMatrixTranspose, diagMatrix, diagMatrix);
    Matrix3.multiply(unitaryMatrix, jMatrix, unitaryMatrix);
    if (++count > 2) {
      ++sweep;
      count = 0;
    }
  }
  return result;
};
Matrix3.abs = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result[0] = Math.abs(matrix[0]);
  result[1] = Math.abs(matrix[1]);
  result[2] = Math.abs(matrix[2]);
  result[3] = Math.abs(matrix[3]);
  result[4] = Math.abs(matrix[4]);
  result[5] = Math.abs(matrix[5]);
  result[6] = Math.abs(matrix[6]);
  result[7] = Math.abs(matrix[7]);
  result[8] = Math.abs(matrix[8]);
  return result;
};
Matrix3.determinant = function(matrix) {
  Check_default.typeOf.object("matrix", matrix);
  const m11 = matrix[0];
  const m21 = matrix[3];
  const m31 = matrix[6];
  const m12 = matrix[1];
  const m22 = matrix[4];
  const m32 = matrix[7];
  const m13 = matrix[2];
  const m23 = matrix[5];
  const m33 = matrix[8];
  return m11 * (m22 * m33 - m23 * m32) + m12 * (m23 * m31 - m21 * m33) + m13 * (m21 * m32 - m22 * m31);
};
Matrix3.inverse = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const m11 = matrix[0];
  const m21 = matrix[1];
  const m31 = matrix[2];
  const m12 = matrix[3];
  const m22 = matrix[4];
  const m32 = matrix[5];
  const m13 = matrix[6];
  const m23 = matrix[7];
  const m33 = matrix[8];
  const determinant = Matrix3.determinant(matrix);
  if (Math.abs(determinant) <= Math_default.EPSILON15) {
    throw new DeveloperError_default("matrix is not invertible");
  }
  result[0] = m22 * m33 - m23 * m32;
  result[1] = m23 * m31 - m21 * m33;
  result[2] = m21 * m32 - m22 * m31;
  result[3] = m13 * m32 - m12 * m33;
  result[4] = m11 * m33 - m13 * m31;
  result[5] = m12 * m31 - m11 * m32;
  result[6] = m12 * m23 - m13 * m22;
  result[7] = m13 * m21 - m11 * m23;
  result[8] = m11 * m22 - m12 * m21;
  const scale = 1 / determinant;
  return Matrix3.multiplyByScalar(result, scale, result);
};
var scratchTransposeMatrix = new Matrix3();
Matrix3.inverseTranspose = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  return Matrix3.inverse(
    Matrix3.transpose(matrix, scratchTransposeMatrix),
    result
  );
};
Matrix3.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left[0] === right[0] && left[1] === right[1] && left[2] === right[2] && left[3] === right[3] && left[4] === right[4] && left[5] === right[5] && left[6] === right[6] && left[7] === right[7] && left[8] === right[8];
};
Matrix3.equalsEpsilon = function(left, right, epsilon) {
  epsilon = defaultValue_default(epsilon, 0);
  return left === right || defined_default(left) && defined_default(right) && Math.abs(left[0] - right[0]) <= epsilon && Math.abs(left[1] - right[1]) <= epsilon && Math.abs(left[2] - right[2]) <= epsilon && Math.abs(left[3] - right[3]) <= epsilon && Math.abs(left[4] - right[4]) <= epsilon && Math.abs(left[5] - right[5]) <= epsilon && Math.abs(left[6] - right[6]) <= epsilon && Math.abs(left[7] - right[7]) <= epsilon && Math.abs(left[8] - right[8]) <= epsilon;
};
Matrix3.IDENTITY = Object.freeze(
  new Matrix3(1, 0, 0, 0, 1, 0, 0, 0, 1)
);
Matrix3.ZERO = Object.freeze(
  new Matrix3(0, 0, 0, 0, 0, 0, 0, 0, 0)
);
Matrix3.COLUMN0ROW0 = 0;
Matrix3.COLUMN0ROW1 = 1;
Matrix3.COLUMN0ROW2 = 2;
Matrix3.COLUMN1ROW0 = 3;
Matrix3.COLUMN1ROW1 = 4;
Matrix3.COLUMN1ROW2 = 5;
Matrix3.COLUMN2ROW0 = 6;
Matrix3.COLUMN2ROW1 = 7;
Matrix3.COLUMN2ROW2 = 8;
Object.defineProperties(Matrix3.prototype, {
  /**
   * Gets the number of items in the collection.
   * @memberof Matrix3.prototype
   *
   * @type {number}
   */
  length: {
    get: function() {
      return Matrix3.packedLength;
    }
  }
});
Matrix3.prototype.clone = function(result) {
  return Matrix3.clone(this, result);
};
Matrix3.prototype.equals = function(right) {
  return Matrix3.equals(this, right);
};
Matrix3.equalsArray = function(matrix, array, offset) {
  return matrix[0] === array[offset] && matrix[1] === array[offset + 1] && matrix[2] === array[offset + 2] && matrix[3] === array[offset + 3] && matrix[4] === array[offset + 4] && matrix[5] === array[offset + 5] && matrix[6] === array[offset + 6] && matrix[7] === array[offset + 7] && matrix[8] === array[offset + 8];
};
Matrix3.prototype.equalsEpsilon = function(right, epsilon) {
  return Matrix3.equalsEpsilon(this, right, epsilon);
};
Matrix3.prototype.toString = function() {
  return `(${this[0]}, ${this[3]}, ${this[6]})
(${this[1]}, ${this[4]}, ${this[7]})
(${this[2]}, ${this[5]}, ${this[8]})`;
};
var Matrix3_default = Matrix3;

// packages/engine/Source/Core/RuntimeError.js
function RuntimeError(message) {
  this.name = "RuntimeError";
  this.message = message;
  let stack;
  try {
    throw new Error();
  } catch (e) {
    stack = e.stack;
  }
  this.stack = stack;
}
if (defined_default(Object.create)) {
  RuntimeError.prototype = Object.create(Error.prototype);
  RuntimeError.prototype.constructor = RuntimeError;
}
RuntimeError.prototype.toString = function() {
  let str = `${this.name}: ${this.message}`;
  if (defined_default(this.stack)) {
    str += `
${this.stack.toString()}`;
  }
  return str;
};
var RuntimeError_default = RuntimeError;

// packages/engine/Source/Core/Matrix4.js
function Matrix4(column0Row0, column1Row0, column2Row0, column3Row0, column0Row1, column1Row1, column2Row1, column3Row1, column0Row2, column1Row2, column2Row2, column3Row2, column0Row3, column1Row3, column2Row3, column3Row3) {
  this[0] = defaultValue_default(column0Row0, 0);
  this[1] = defaultValue_default(column0Row1, 0);
  this[2] = defaultValue_default(column0Row2, 0);
  this[3] = defaultValue_default(column0Row3, 0);
  this[4] = defaultValue_default(column1Row0, 0);
  this[5] = defaultValue_default(column1Row1, 0);
  this[6] = defaultValue_default(column1Row2, 0);
  this[7] = defaultValue_default(column1Row3, 0);
  this[8] = defaultValue_default(column2Row0, 0);
  this[9] = defaultValue_default(column2Row1, 0);
  this[10] = defaultValue_default(column2Row2, 0);
  this[11] = defaultValue_default(column2Row3, 0);
  this[12] = defaultValue_default(column3Row0, 0);
  this[13] = defaultValue_default(column3Row1, 0);
  this[14] = defaultValue_default(column3Row2, 0);
  this[15] = defaultValue_default(column3Row3, 0);
}
Matrix4.packedLength = 16;
Matrix4.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value[0];
  array[startingIndex++] = value[1];
  array[startingIndex++] = value[2];
  array[startingIndex++] = value[3];
  array[startingIndex++] = value[4];
  array[startingIndex++] = value[5];
  array[startingIndex++] = value[6];
  array[startingIndex++] = value[7];
  array[startingIndex++] = value[8];
  array[startingIndex++] = value[9];
  array[startingIndex++] = value[10];
  array[startingIndex++] = value[11];
  array[startingIndex++] = value[12];
  array[startingIndex++] = value[13];
  array[startingIndex++] = value[14];
  array[startingIndex] = value[15];
  return array;
};
Matrix4.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Matrix4();
  }
  result[0] = array[startingIndex++];
  result[1] = array[startingIndex++];
  result[2] = array[startingIndex++];
  result[3] = array[startingIndex++];
  result[4] = array[startingIndex++];
  result[5] = array[startingIndex++];
  result[6] = array[startingIndex++];
  result[7] = array[startingIndex++];
  result[8] = array[startingIndex++];
  result[9] = array[startingIndex++];
  result[10] = array[startingIndex++];
  result[11] = array[startingIndex++];
  result[12] = array[startingIndex++];
  result[13] = array[startingIndex++];
  result[14] = array[startingIndex++];
  result[15] = array[startingIndex];
  return result;
};
Matrix4.packArray = function(array, result) {
  Check_default.defined("array", array);
  const length = array.length;
  const resultLength = length * 16;
  if (!defined_default(result)) {
    result = new Array(resultLength);
  } else if (!Array.isArray(result) && result.length !== resultLength) {
    throw new DeveloperError_default(
      "If result is a typed array, it must have exactly array.length * 16 elements"
    );
  } else if (result.length !== resultLength) {
    result.length = resultLength;
  }
  for (let i = 0; i < length; ++i) {
    Matrix4.pack(array[i], result, i * 16);
  }
  return result;
};
Matrix4.unpackArray = function(array, result) {
  Check_default.defined("array", array);
  Check_default.typeOf.number.greaterThanOrEquals("array.length", array.length, 16);
  if (array.length % 16 !== 0) {
    throw new DeveloperError_default("array length must be a multiple of 16.");
  }
  const length = array.length;
  if (!defined_default(result)) {
    result = new Array(length / 16);
  } else {
    result.length = length / 16;
  }
  for (let i = 0; i < length; i += 16) {
    const index = i / 16;
    result[index] = Matrix4.unpack(array, i, result[index]);
  }
  return result;
};
Matrix4.clone = function(matrix, result) {
  if (!defined_default(matrix)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Matrix4(
      matrix[0],
      matrix[4],
      matrix[8],
      matrix[12],
      matrix[1],
      matrix[5],
      matrix[9],
      matrix[13],
      matrix[2],
      matrix[6],
      matrix[10],
      matrix[14],
      matrix[3],
      matrix[7],
      matrix[11],
      matrix[15]
    );
  }
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  result[4] = matrix[4];
  result[5] = matrix[5];
  result[6] = matrix[6];
  result[7] = matrix[7];
  result[8] = matrix[8];
  result[9] = matrix[9];
  result[10] = matrix[10];
  result[11] = matrix[11];
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};
Matrix4.fromArray = Matrix4.unpack;
Matrix4.fromColumnMajorArray = function(values, result) {
  Check_default.defined("values", values);
  return Matrix4.clone(values, result);
};
Matrix4.fromRowMajorArray = function(values, result) {
  Check_default.defined("values", values);
  if (!defined_default(result)) {
    return new Matrix4(
      values[0],
      values[1],
      values[2],
      values[3],
      values[4],
      values[5],
      values[6],
      values[7],
      values[8],
      values[9],
      values[10],
      values[11],
      values[12],
      values[13],
      values[14],
      values[15]
    );
  }
  result[0] = values[0];
  result[1] = values[4];
  result[2] = values[8];
  result[3] = values[12];
  result[4] = values[1];
  result[5] = values[5];
  result[6] = values[9];
  result[7] = values[13];
  result[8] = values[2];
  result[9] = values[6];
  result[10] = values[10];
  result[11] = values[14];
  result[12] = values[3];
  result[13] = values[7];
  result[14] = values[11];
  result[15] = values[15];
  return result;
};
Matrix4.fromRotationTranslation = function(rotation, translation, result) {
  Check_default.typeOf.object("rotation", rotation);
  translation = defaultValue_default(translation, Cartesian3_default.ZERO);
  if (!defined_default(result)) {
    return new Matrix4(
      rotation[0],
      rotation[3],
      rotation[6],
      translation.x,
      rotation[1],
      rotation[4],
      rotation[7],
      translation.y,
      rotation[2],
      rotation[5],
      rotation[8],
      translation.z,
      0,
      0,
      0,
      1
    );
  }
  result[0] = rotation[0];
  result[1] = rotation[1];
  result[2] = rotation[2];
  result[3] = 0;
  result[4] = rotation[3];
  result[5] = rotation[4];
  result[6] = rotation[5];
  result[7] = 0;
  result[8] = rotation[6];
  result[9] = rotation[7];
  result[10] = rotation[8];
  result[11] = 0;
  result[12] = translation.x;
  result[13] = translation.y;
  result[14] = translation.z;
  result[15] = 1;
  return result;
};
Matrix4.fromTranslationQuaternionRotationScale = function(translation, rotation, scale, result) {
  Check_default.typeOf.object("translation", translation);
  Check_default.typeOf.object("rotation", rotation);
  Check_default.typeOf.object("scale", scale);
  if (!defined_default(result)) {
    result = new Matrix4();
  }
  const scaleX = scale.x;
  const scaleY = scale.y;
  const scaleZ = scale.z;
  const x2 = rotation.x * rotation.x;
  const xy = rotation.x * rotation.y;
  const xz = rotation.x * rotation.z;
  const xw = rotation.x * rotation.w;
  const y2 = rotation.y * rotation.y;
  const yz = rotation.y * rotation.z;
  const yw = rotation.y * rotation.w;
  const z2 = rotation.z * rotation.z;
  const zw = rotation.z * rotation.w;
  const w2 = rotation.w * rotation.w;
  const m00 = x2 - y2 - z2 + w2;
  const m01 = 2 * (xy - zw);
  const m02 = 2 * (xz + yw);
  const m10 = 2 * (xy + zw);
  const m11 = -x2 + y2 - z2 + w2;
  const m12 = 2 * (yz - xw);
  const m20 = 2 * (xz - yw);
  const m21 = 2 * (yz + xw);
  const m22 = -x2 - y2 + z2 + w2;
  result[0] = m00 * scaleX;
  result[1] = m10 * scaleX;
  result[2] = m20 * scaleX;
  result[3] = 0;
  result[4] = m01 * scaleY;
  result[5] = m11 * scaleY;
  result[6] = m21 * scaleY;
  result[7] = 0;
  result[8] = m02 * scaleZ;
  result[9] = m12 * scaleZ;
  result[10] = m22 * scaleZ;
  result[11] = 0;
  result[12] = translation.x;
  result[13] = translation.y;
  result[14] = translation.z;
  result[15] = 1;
  return result;
};
Matrix4.fromTranslationRotationScale = function(translationRotationScale, result) {
  Check_default.typeOf.object("translationRotationScale", translationRotationScale);
  return Matrix4.fromTranslationQuaternionRotationScale(
    translationRotationScale.translation,
    translationRotationScale.rotation,
    translationRotationScale.scale,
    result
  );
};
Matrix4.fromTranslation = function(translation, result) {
  Check_default.typeOf.object("translation", translation);
  return Matrix4.fromRotationTranslation(Matrix3_default.IDENTITY, translation, result);
};
Matrix4.fromScale = function(scale, result) {
  Check_default.typeOf.object("scale", scale);
  if (!defined_default(result)) {
    return new Matrix4(
      scale.x,
      0,
      0,
      0,
      0,
      scale.y,
      0,
      0,
      0,
      0,
      scale.z,
      0,
      0,
      0,
      0,
      1
    );
  }
  result[0] = scale.x;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = 0;
  result[5] = scale.y;
  result[6] = 0;
  result[7] = 0;
  result[8] = 0;
  result[9] = 0;
  result[10] = scale.z;
  result[11] = 0;
  result[12] = 0;
  result[13] = 0;
  result[14] = 0;
  result[15] = 1;
  return result;
};
Matrix4.fromUniformScale = function(scale, result) {
  Check_default.typeOf.number("scale", scale);
  if (!defined_default(result)) {
    return new Matrix4(
      scale,
      0,
      0,
      0,
      0,
      scale,
      0,
      0,
      0,
      0,
      scale,
      0,
      0,
      0,
      0,
      1
    );
  }
  result[0] = scale;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = 0;
  result[5] = scale;
  result[6] = 0;
  result[7] = 0;
  result[8] = 0;
  result[9] = 0;
  result[10] = scale;
  result[11] = 0;
  result[12] = 0;
  result[13] = 0;
  result[14] = 0;
  result[15] = 1;
  return result;
};
Matrix4.fromRotation = function(rotation, result) {
  Check_default.typeOf.object("rotation", rotation);
  if (!defined_default(result)) {
    result = new Matrix4();
  }
  result[0] = rotation[0];
  result[1] = rotation[1];
  result[2] = rotation[2];
  result[3] = 0;
  result[4] = rotation[3];
  result[5] = rotation[4];
  result[6] = rotation[5];
  result[7] = 0;
  result[8] = rotation[6];
  result[9] = rotation[7];
  result[10] = rotation[8];
  result[11] = 0;
  result[12] = 0;
  result[13] = 0;
  result[14] = 0;
  result[15] = 1;
  return result;
};
var fromCameraF = new Cartesian3_default();
var fromCameraR = new Cartesian3_default();
var fromCameraU = new Cartesian3_default();
Matrix4.fromCamera = function(camera, result) {
  Check_default.typeOf.object("camera", camera);
  const position = camera.position;
  const direction = camera.direction;
  const up = camera.up;
  Check_default.typeOf.object("camera.position", position);
  Check_default.typeOf.object("camera.direction", direction);
  Check_default.typeOf.object("camera.up", up);
  Cartesian3_default.normalize(direction, fromCameraF);
  Cartesian3_default.normalize(
    Cartesian3_default.cross(fromCameraF, up, fromCameraR),
    fromCameraR
  );
  Cartesian3_default.normalize(
    Cartesian3_default.cross(fromCameraR, fromCameraF, fromCameraU),
    fromCameraU
  );
  const sX = fromCameraR.x;
  const sY = fromCameraR.y;
  const sZ = fromCameraR.z;
  const fX = fromCameraF.x;
  const fY = fromCameraF.y;
  const fZ = fromCameraF.z;
  const uX = fromCameraU.x;
  const uY = fromCameraU.y;
  const uZ = fromCameraU.z;
  const positionX = position.x;
  const positionY = position.y;
  const positionZ = position.z;
  const t0 = sX * -positionX + sY * -positionY + sZ * -positionZ;
  const t1 = uX * -positionX + uY * -positionY + uZ * -positionZ;
  const t2 = fX * positionX + fY * positionY + fZ * positionZ;
  if (!defined_default(result)) {
    return new Matrix4(
      sX,
      sY,
      sZ,
      t0,
      uX,
      uY,
      uZ,
      t1,
      -fX,
      -fY,
      -fZ,
      t2,
      0,
      0,
      0,
      1
    );
  }
  result[0] = sX;
  result[1] = uX;
  result[2] = -fX;
  result[3] = 0;
  result[4] = sY;
  result[5] = uY;
  result[6] = -fY;
  result[7] = 0;
  result[8] = sZ;
  result[9] = uZ;
  result[10] = -fZ;
  result[11] = 0;
  result[12] = t0;
  result[13] = t1;
  result[14] = t2;
  result[15] = 1;
  return result;
};
Matrix4.computePerspectiveFieldOfView = function(fovY, aspectRatio, near, far, result) {
  Check_default.typeOf.number.greaterThan("fovY", fovY, 0);
  Check_default.typeOf.number.lessThan("fovY", fovY, Math.PI);
  Check_default.typeOf.number.greaterThan("near", near, 0);
  Check_default.typeOf.number.greaterThan("far", far, 0);
  Check_default.typeOf.object("result", result);
  const bottom = Math.tan(fovY * 0.5);
  const column1Row1 = 1 / bottom;
  const column0Row0 = column1Row1 / aspectRatio;
  const column2Row2 = (far + near) / (near - far);
  const column3Row2 = 2 * far * near / (near - far);
  result[0] = column0Row0;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = 0;
  result[5] = column1Row1;
  result[6] = 0;
  result[7] = 0;
  result[8] = 0;
  result[9] = 0;
  result[10] = column2Row2;
  result[11] = -1;
  result[12] = 0;
  result[13] = 0;
  result[14] = column3Row2;
  result[15] = 0;
  return result;
};
Matrix4.computeOrthographicOffCenter = function(left, right, bottom, top, near, far, result) {
  Check_default.typeOf.number("left", left);
  Check_default.typeOf.number("right", right);
  Check_default.typeOf.number("bottom", bottom);
  Check_default.typeOf.number("top", top);
  Check_default.typeOf.number("near", near);
  Check_default.typeOf.number("far", far);
  Check_default.typeOf.object("result", result);
  let a3 = 1 / (right - left);
  let b = 1 / (top - bottom);
  let c = 1 / (far - near);
  const tx = -(right + left) * a3;
  const ty = -(top + bottom) * b;
  const tz = -(far + near) * c;
  a3 *= 2;
  b *= 2;
  c *= -2;
  result[0] = a3;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = 0;
  result[5] = b;
  result[6] = 0;
  result[7] = 0;
  result[8] = 0;
  result[9] = 0;
  result[10] = c;
  result[11] = 0;
  result[12] = tx;
  result[13] = ty;
  result[14] = tz;
  result[15] = 1;
  return result;
};
Matrix4.computePerspectiveOffCenter = function(left, right, bottom, top, near, far, result) {
  Check_default.typeOf.number("left", left);
  Check_default.typeOf.number("right", right);
  Check_default.typeOf.number("bottom", bottom);
  Check_default.typeOf.number("top", top);
  Check_default.typeOf.number("near", near);
  Check_default.typeOf.number("far", far);
  Check_default.typeOf.object("result", result);
  const column0Row0 = 2 * near / (right - left);
  const column1Row1 = 2 * near / (top - bottom);
  const column2Row0 = (right + left) / (right - left);
  const column2Row1 = (top + bottom) / (top - bottom);
  const column2Row2 = -(far + near) / (far - near);
  const column2Row3 = -1;
  const column3Row2 = -2 * far * near / (far - near);
  result[0] = column0Row0;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = 0;
  result[5] = column1Row1;
  result[6] = 0;
  result[7] = 0;
  result[8] = column2Row0;
  result[9] = column2Row1;
  result[10] = column2Row2;
  result[11] = column2Row3;
  result[12] = 0;
  result[13] = 0;
  result[14] = column3Row2;
  result[15] = 0;
  return result;
};
Matrix4.computeInfinitePerspectiveOffCenter = function(left, right, bottom, top, near, result) {
  Check_default.typeOf.number("left", left);
  Check_default.typeOf.number("right", right);
  Check_default.typeOf.number("bottom", bottom);
  Check_default.typeOf.number("top", top);
  Check_default.typeOf.number("near", near);
  Check_default.typeOf.object("result", result);
  const column0Row0 = 2 * near / (right - left);
  const column1Row1 = 2 * near / (top - bottom);
  const column2Row0 = (right + left) / (right - left);
  const column2Row1 = (top + bottom) / (top - bottom);
  const column2Row2 = -1;
  const column2Row3 = -1;
  const column3Row2 = -2 * near;
  result[0] = column0Row0;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = 0;
  result[5] = column1Row1;
  result[6] = 0;
  result[7] = 0;
  result[8] = column2Row0;
  result[9] = column2Row1;
  result[10] = column2Row2;
  result[11] = column2Row3;
  result[12] = 0;
  result[13] = 0;
  result[14] = column3Row2;
  result[15] = 0;
  return result;
};
Matrix4.computeViewportTransformation = function(viewport, nearDepthRange, farDepthRange, result) {
  if (!defined_default(result)) {
    result = new Matrix4();
  }
  viewport = defaultValue_default(viewport, defaultValue_default.EMPTY_OBJECT);
  const x = defaultValue_default(viewport.x, 0);
  const y = defaultValue_default(viewport.y, 0);
  const width = defaultValue_default(viewport.width, 0);
  const height = defaultValue_default(viewport.height, 0);
  nearDepthRange = defaultValue_default(nearDepthRange, 0);
  farDepthRange = defaultValue_default(farDepthRange, 1);
  const halfWidth = width * 0.5;
  const halfHeight = height * 0.5;
  const halfDepth = (farDepthRange - nearDepthRange) * 0.5;
  const column0Row0 = halfWidth;
  const column1Row1 = halfHeight;
  const column2Row2 = halfDepth;
  const column3Row0 = x + halfWidth;
  const column3Row1 = y + halfHeight;
  const column3Row2 = nearDepthRange + halfDepth;
  const column3Row3 = 1;
  result[0] = column0Row0;
  result[1] = 0;
  result[2] = 0;
  result[3] = 0;
  result[4] = 0;
  result[5] = column1Row1;
  result[6] = 0;
  result[7] = 0;
  result[8] = 0;
  result[9] = 0;
  result[10] = column2Row2;
  result[11] = 0;
  result[12] = column3Row0;
  result[13] = column3Row1;
  result[14] = column3Row2;
  result[15] = column3Row3;
  return result;
};
Matrix4.computeView = function(position, direction, up, right, result) {
  Check_default.typeOf.object("position", position);
  Check_default.typeOf.object("direction", direction);
  Check_default.typeOf.object("up", up);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result[0] = right.x;
  result[1] = up.x;
  result[2] = -direction.x;
  result[3] = 0;
  result[4] = right.y;
  result[5] = up.y;
  result[6] = -direction.y;
  result[7] = 0;
  result[8] = right.z;
  result[9] = up.z;
  result[10] = -direction.z;
  result[11] = 0;
  result[12] = -Cartesian3_default.dot(right, position);
  result[13] = -Cartesian3_default.dot(up, position);
  result[14] = Cartesian3_default.dot(direction, position);
  result[15] = 1;
  return result;
};
Matrix4.toArray = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  if (!defined_default(result)) {
    return [
      matrix[0],
      matrix[1],
      matrix[2],
      matrix[3],
      matrix[4],
      matrix[5],
      matrix[6],
      matrix[7],
      matrix[8],
      matrix[9],
      matrix[10],
      matrix[11],
      matrix[12],
      matrix[13],
      matrix[14],
      matrix[15]
    ];
  }
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  result[4] = matrix[4];
  result[5] = matrix[5];
  result[6] = matrix[6];
  result[7] = matrix[7];
  result[8] = matrix[8];
  result[9] = matrix[9];
  result[10] = matrix[10];
  result[11] = matrix[11];
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};
Matrix4.getElementIndex = function(column, row) {
  Check_default.typeOf.number.greaterThanOrEquals("row", row, 0);
  Check_default.typeOf.number.lessThanOrEquals("row", row, 3);
  Check_default.typeOf.number.greaterThanOrEquals("column", column, 0);
  Check_default.typeOf.number.lessThanOrEquals("column", column, 3);
  return column * 4 + row;
};
Matrix4.getColumn = function(matrix, index, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 3);
  Check_default.typeOf.object("result", result);
  const startIndex = index * 4;
  const x = matrix[startIndex];
  const y = matrix[startIndex + 1];
  const z = matrix[startIndex + 2];
  const w = matrix[startIndex + 3];
  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};
Matrix4.setColumn = function(matrix, index, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 3);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result = Matrix4.clone(matrix, result);
  const startIndex = index * 4;
  result[startIndex] = cartesian.x;
  result[startIndex + 1] = cartesian.y;
  result[startIndex + 2] = cartesian.z;
  result[startIndex + 3] = cartesian.w;
  return result;
};
Matrix4.getRow = function(matrix, index, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 3);
  Check_default.typeOf.object("result", result);
  const x = matrix[index];
  const y = matrix[index + 4];
  const z = matrix[index + 8];
  const w = matrix[index + 12];
  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};
Matrix4.setRow = function(matrix, index, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 3);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result = Matrix4.clone(matrix, result);
  result[index] = cartesian.x;
  result[index + 4] = cartesian.y;
  result[index + 8] = cartesian.z;
  result[index + 12] = cartesian.w;
  return result;
};
Matrix4.setTranslation = function(matrix, translation, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("translation", translation);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  result[4] = matrix[4];
  result[5] = matrix[5];
  result[6] = matrix[6];
  result[7] = matrix[7];
  result[8] = matrix[8];
  result[9] = matrix[9];
  result[10] = matrix[10];
  result[11] = matrix[11];
  result[12] = translation.x;
  result[13] = translation.y;
  result[14] = translation.z;
  result[15] = matrix[15];
  return result;
};
var scaleScratch12 = new Cartesian3_default();
Matrix4.setScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("scale", scale);
  Check_default.typeOf.object("result", result);
  const existingScale = Matrix4.getScale(matrix, scaleScratch12);
  const scaleRatioX = scale.x / existingScale.x;
  const scaleRatioY = scale.y / existingScale.y;
  const scaleRatioZ = scale.z / existingScale.z;
  result[0] = matrix[0] * scaleRatioX;
  result[1] = matrix[1] * scaleRatioX;
  result[2] = matrix[2] * scaleRatioX;
  result[3] = matrix[3];
  result[4] = matrix[4] * scaleRatioY;
  result[5] = matrix[5] * scaleRatioY;
  result[6] = matrix[6] * scaleRatioY;
  result[7] = matrix[7];
  result[8] = matrix[8] * scaleRatioZ;
  result[9] = matrix[9] * scaleRatioZ;
  result[10] = matrix[10] * scaleRatioZ;
  result[11] = matrix[11];
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};
var scaleScratch22 = new Cartesian3_default();
Matrix4.setUniformScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scale", scale);
  Check_default.typeOf.object("result", result);
  const existingScale = Matrix4.getScale(matrix, scaleScratch22);
  const scaleRatioX = scale / existingScale.x;
  const scaleRatioY = scale / existingScale.y;
  const scaleRatioZ = scale / existingScale.z;
  result[0] = matrix[0] * scaleRatioX;
  result[1] = matrix[1] * scaleRatioX;
  result[2] = matrix[2] * scaleRatioX;
  result[3] = matrix[3];
  result[4] = matrix[4] * scaleRatioY;
  result[5] = matrix[5] * scaleRatioY;
  result[6] = matrix[6] * scaleRatioY;
  result[7] = matrix[7];
  result[8] = matrix[8] * scaleRatioZ;
  result[9] = matrix[9] * scaleRatioZ;
  result[10] = matrix[10] * scaleRatioZ;
  result[11] = matrix[11];
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};
var scratchColumn2 = new Cartesian3_default();
Matrix4.getScale = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result.x = Cartesian3_default.magnitude(
    Cartesian3_default.fromElements(matrix[0], matrix[1], matrix[2], scratchColumn2)
  );
  result.y = Cartesian3_default.magnitude(
    Cartesian3_default.fromElements(matrix[4], matrix[5], matrix[6], scratchColumn2)
  );
  result.z = Cartesian3_default.magnitude(
    Cartesian3_default.fromElements(matrix[8], matrix[9], matrix[10], scratchColumn2)
  );
  return result;
};
var scaleScratch32 = new Cartesian3_default();
Matrix4.getMaximumScale = function(matrix) {
  Matrix4.getScale(matrix, scaleScratch32);
  return Cartesian3_default.maximumComponent(scaleScratch32);
};
var scaleScratch42 = new Cartesian3_default();
Matrix4.setRotation = function(matrix, rotation, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const scale = Matrix4.getScale(matrix, scaleScratch42);
  result[0] = rotation[0] * scale.x;
  result[1] = rotation[1] * scale.x;
  result[2] = rotation[2] * scale.x;
  result[3] = matrix[3];
  result[4] = rotation[3] * scale.y;
  result[5] = rotation[4] * scale.y;
  result[6] = rotation[5] * scale.y;
  result[7] = matrix[7];
  result[8] = rotation[6] * scale.z;
  result[9] = rotation[7] * scale.z;
  result[10] = rotation[8] * scale.z;
  result[11] = matrix[11];
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};
var scaleScratch52 = new Cartesian3_default();
Matrix4.getRotation = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const scale = Matrix4.getScale(matrix, scaleScratch52);
  result[0] = matrix[0] / scale.x;
  result[1] = matrix[1] / scale.x;
  result[2] = matrix[2] / scale.x;
  result[3] = matrix[4] / scale.y;
  result[4] = matrix[5] / scale.y;
  result[5] = matrix[6] / scale.y;
  result[6] = matrix[8] / scale.z;
  result[7] = matrix[9] / scale.z;
  result[8] = matrix[10] / scale.z;
  return result;
};
Matrix4.multiply = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  const left0 = left[0];
  const left1 = left[1];
  const left2 = left[2];
  const left3 = left[3];
  const left4 = left[4];
  const left5 = left[5];
  const left6 = left[6];
  const left7 = left[7];
  const left8 = left[8];
  const left9 = left[9];
  const left10 = left[10];
  const left11 = left[11];
  const left12 = left[12];
  const left13 = left[13];
  const left14 = left[14];
  const left15 = left[15];
  const right0 = right[0];
  const right1 = right[1];
  const right2 = right[2];
  const right3 = right[3];
  const right4 = right[4];
  const right5 = right[5];
  const right6 = right[6];
  const right7 = right[7];
  const right8 = right[8];
  const right9 = right[9];
  const right10 = right[10];
  const right11 = right[11];
  const right12 = right[12];
  const right13 = right[13];
  const right14 = right[14];
  const right15 = right[15];
  const column0Row0 = left0 * right0 + left4 * right1 + left8 * right2 + left12 * right3;
  const column0Row1 = left1 * right0 + left5 * right1 + left9 * right2 + left13 * right3;
  const column0Row2 = left2 * right0 + left6 * right1 + left10 * right2 + left14 * right3;
  const column0Row3 = left3 * right0 + left7 * right1 + left11 * right2 + left15 * right3;
  const column1Row0 = left0 * right4 + left4 * right5 + left8 * right6 + left12 * right7;
  const column1Row1 = left1 * right4 + left5 * right5 + left9 * right6 + left13 * right7;
  const column1Row2 = left2 * right4 + left6 * right5 + left10 * right6 + left14 * right7;
  const column1Row3 = left3 * right4 + left7 * right5 + left11 * right6 + left15 * right7;
  const column2Row0 = left0 * right8 + left4 * right9 + left8 * right10 + left12 * right11;
  const column2Row1 = left1 * right8 + left5 * right9 + left9 * right10 + left13 * right11;
  const column2Row2 = left2 * right8 + left6 * right9 + left10 * right10 + left14 * right11;
  const column2Row3 = left3 * right8 + left7 * right9 + left11 * right10 + left15 * right11;
  const column3Row0 = left0 * right12 + left4 * right13 + left8 * right14 + left12 * right15;
  const column3Row1 = left1 * right12 + left5 * right13 + left9 * right14 + left13 * right15;
  const column3Row2 = left2 * right12 + left6 * right13 + left10 * right14 + left14 * right15;
  const column3Row3 = left3 * right12 + left7 * right13 + left11 * right14 + left15 * right15;
  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column0Row2;
  result[3] = column0Row3;
  result[4] = column1Row0;
  result[5] = column1Row1;
  result[6] = column1Row2;
  result[7] = column1Row3;
  result[8] = column2Row0;
  result[9] = column2Row1;
  result[10] = column2Row2;
  result[11] = column2Row3;
  result[12] = column3Row0;
  result[13] = column3Row1;
  result[14] = column3Row2;
  result[15] = column3Row3;
  return result;
};
Matrix4.add = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result[0] = left[0] + right[0];
  result[1] = left[1] + right[1];
  result[2] = left[2] + right[2];
  result[3] = left[3] + right[3];
  result[4] = left[4] + right[4];
  result[5] = left[5] + right[5];
  result[6] = left[6] + right[6];
  result[7] = left[7] + right[7];
  result[8] = left[8] + right[8];
  result[9] = left[9] + right[9];
  result[10] = left[10] + right[10];
  result[11] = left[11] + right[11];
  result[12] = left[12] + right[12];
  result[13] = left[13] + right[13];
  result[14] = left[14] + right[14];
  result[15] = left[15] + right[15];
  return result;
};
Matrix4.subtract = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result[0] = left[0] - right[0];
  result[1] = left[1] - right[1];
  result[2] = left[2] - right[2];
  result[3] = left[3] - right[3];
  result[4] = left[4] - right[4];
  result[5] = left[5] - right[5];
  result[6] = left[6] - right[6];
  result[7] = left[7] - right[7];
  result[8] = left[8] - right[8];
  result[9] = left[9] - right[9];
  result[10] = left[10] - right[10];
  result[11] = left[11] - right[11];
  result[12] = left[12] - right[12];
  result[13] = left[13] - right[13];
  result[14] = left[14] - right[14];
  result[15] = left[15] - right[15];
  return result;
};
Matrix4.multiplyTransformation = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  const left0 = left[0];
  const left1 = left[1];
  const left2 = left[2];
  const left4 = left[4];
  const left5 = left[5];
  const left6 = left[6];
  const left8 = left[8];
  const left9 = left[9];
  const left10 = left[10];
  const left12 = left[12];
  const left13 = left[13];
  const left14 = left[14];
  const right0 = right[0];
  const right1 = right[1];
  const right2 = right[2];
  const right4 = right[4];
  const right5 = right[5];
  const right6 = right[6];
  const right8 = right[8];
  const right9 = right[9];
  const right10 = right[10];
  const right12 = right[12];
  const right13 = right[13];
  const right14 = right[14];
  const column0Row0 = left0 * right0 + left4 * right1 + left8 * right2;
  const column0Row1 = left1 * right0 + left5 * right1 + left9 * right2;
  const column0Row2 = left2 * right0 + left6 * right1 + left10 * right2;
  const column1Row0 = left0 * right4 + left4 * right5 + left8 * right6;
  const column1Row1 = left1 * right4 + left5 * right5 + left9 * right6;
  const column1Row2 = left2 * right4 + left6 * right5 + left10 * right6;
  const column2Row0 = left0 * right8 + left4 * right9 + left8 * right10;
  const column2Row1 = left1 * right8 + left5 * right9 + left9 * right10;
  const column2Row2 = left2 * right8 + left6 * right9 + left10 * right10;
  const column3Row0 = left0 * right12 + left4 * right13 + left8 * right14 + left12;
  const column3Row1 = left1 * right12 + left5 * right13 + left9 * right14 + left13;
  const column3Row2 = left2 * right12 + left6 * right13 + left10 * right14 + left14;
  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column0Row2;
  result[3] = 0;
  result[4] = column1Row0;
  result[5] = column1Row1;
  result[6] = column1Row2;
  result[7] = 0;
  result[8] = column2Row0;
  result[9] = column2Row1;
  result[10] = column2Row2;
  result[11] = 0;
  result[12] = column3Row0;
  result[13] = column3Row1;
  result[14] = column3Row2;
  result[15] = 1;
  return result;
};
Matrix4.multiplyByMatrix3 = function(matrix, rotation, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("rotation", rotation);
  Check_default.typeOf.object("result", result);
  const left0 = matrix[0];
  const left1 = matrix[1];
  const left2 = matrix[2];
  const left4 = matrix[4];
  const left5 = matrix[5];
  const left6 = matrix[6];
  const left8 = matrix[8];
  const left9 = matrix[9];
  const left10 = matrix[10];
  const right0 = rotation[0];
  const right1 = rotation[1];
  const right2 = rotation[2];
  const right4 = rotation[3];
  const right5 = rotation[4];
  const right6 = rotation[5];
  const right8 = rotation[6];
  const right9 = rotation[7];
  const right10 = rotation[8];
  const column0Row0 = left0 * right0 + left4 * right1 + left8 * right2;
  const column0Row1 = left1 * right0 + left5 * right1 + left9 * right2;
  const column0Row2 = left2 * right0 + left6 * right1 + left10 * right2;
  const column1Row0 = left0 * right4 + left4 * right5 + left8 * right6;
  const column1Row1 = left1 * right4 + left5 * right5 + left9 * right6;
  const column1Row2 = left2 * right4 + left6 * right5 + left10 * right6;
  const column2Row0 = left0 * right8 + left4 * right9 + left8 * right10;
  const column2Row1 = left1 * right8 + left5 * right9 + left9 * right10;
  const column2Row2 = left2 * right8 + left6 * right9 + left10 * right10;
  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column0Row2;
  result[3] = 0;
  result[4] = column1Row0;
  result[5] = column1Row1;
  result[6] = column1Row2;
  result[7] = 0;
  result[8] = column2Row0;
  result[9] = column2Row1;
  result[10] = column2Row2;
  result[11] = 0;
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};
Matrix4.multiplyByTranslation = function(matrix, translation, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("translation", translation);
  Check_default.typeOf.object("result", result);
  const x = translation.x;
  const y = translation.y;
  const z = translation.z;
  const tx = x * matrix[0] + y * matrix[4] + z * matrix[8] + matrix[12];
  const ty = x * matrix[1] + y * matrix[5] + z * matrix[9] + matrix[13];
  const tz = x * matrix[2] + y * matrix[6] + z * matrix[10] + matrix[14];
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  result[4] = matrix[4];
  result[5] = matrix[5];
  result[6] = matrix[6];
  result[7] = matrix[7];
  result[8] = matrix[8];
  result[9] = matrix[9];
  result[10] = matrix[10];
  result[11] = matrix[11];
  result[12] = tx;
  result[13] = ty;
  result[14] = tz;
  result[15] = matrix[15];
  return result;
};
Matrix4.multiplyByScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("scale", scale);
  Check_default.typeOf.object("result", result);
  const scaleX = scale.x;
  const scaleY = scale.y;
  const scaleZ = scale.z;
  if (scaleX === 1 && scaleY === 1 && scaleZ === 1) {
    return Matrix4.clone(matrix, result);
  }
  result[0] = scaleX * matrix[0];
  result[1] = scaleX * matrix[1];
  result[2] = scaleX * matrix[2];
  result[3] = matrix[3];
  result[4] = scaleY * matrix[4];
  result[5] = scaleY * matrix[5];
  result[6] = scaleY * matrix[6];
  result[7] = matrix[7];
  result[8] = scaleZ * matrix[8];
  result[9] = scaleZ * matrix[9];
  result[10] = scaleZ * matrix[10];
  result[11] = matrix[11];
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};
Matrix4.multiplyByUniformScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scale", scale);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0] * scale;
  result[1] = matrix[1] * scale;
  result[2] = matrix[2] * scale;
  result[3] = matrix[3];
  result[4] = matrix[4] * scale;
  result[5] = matrix[5] * scale;
  result[6] = matrix[6] * scale;
  result[7] = matrix[7];
  result[8] = matrix[8] * scale;
  result[9] = matrix[9] * scale;
  result[10] = matrix[10] * scale;
  result[11] = matrix[11];
  result[12] = matrix[12];
  result[13] = matrix[13];
  result[14] = matrix[14];
  result[15] = matrix[15];
  return result;
};
Matrix4.multiplyByVector = function(matrix, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const vX = cartesian.x;
  const vY = cartesian.y;
  const vZ = cartesian.z;
  const vW = cartesian.w;
  const x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12] * vW;
  const y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13] * vW;
  const z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14] * vW;
  const w = matrix[3] * vX + matrix[7] * vY + matrix[11] * vZ + matrix[15] * vW;
  result.x = x;
  result.y = y;
  result.z = z;
  result.w = w;
  return result;
};
Matrix4.multiplyByPointAsVector = function(matrix, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const vX = cartesian.x;
  const vY = cartesian.y;
  const vZ = cartesian.z;
  const x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ;
  const y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ;
  const z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ;
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
Matrix4.multiplyByPoint = function(matrix, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const vX = cartesian.x;
  const vY = cartesian.y;
  const vZ = cartesian.z;
  const x = matrix[0] * vX + matrix[4] * vY + matrix[8] * vZ + matrix[12];
  const y = matrix[1] * vX + matrix[5] * vY + matrix[9] * vZ + matrix[13];
  const z = matrix[2] * vX + matrix[6] * vY + matrix[10] * vZ + matrix[14];
  result.x = x;
  result.y = y;
  result.z = z;
  return result;
};
Matrix4.multiplyByScalar = function(matrix, scalar, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0] * scalar;
  result[1] = matrix[1] * scalar;
  result[2] = matrix[2] * scalar;
  result[3] = matrix[3] * scalar;
  result[4] = matrix[4] * scalar;
  result[5] = matrix[5] * scalar;
  result[6] = matrix[6] * scalar;
  result[7] = matrix[7] * scalar;
  result[8] = matrix[8] * scalar;
  result[9] = matrix[9] * scalar;
  result[10] = matrix[10] * scalar;
  result[11] = matrix[11] * scalar;
  result[12] = matrix[12] * scalar;
  result[13] = matrix[13] * scalar;
  result[14] = matrix[14] * scalar;
  result[15] = matrix[15] * scalar;
  return result;
};
Matrix4.negate = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result[0] = -matrix[0];
  result[1] = -matrix[1];
  result[2] = -matrix[2];
  result[3] = -matrix[3];
  result[4] = -matrix[4];
  result[5] = -matrix[5];
  result[6] = -matrix[6];
  result[7] = -matrix[7];
  result[8] = -matrix[8];
  result[9] = -matrix[9];
  result[10] = -matrix[10];
  result[11] = -matrix[11];
  result[12] = -matrix[12];
  result[13] = -matrix[13];
  result[14] = -matrix[14];
  result[15] = -matrix[15];
  return result;
};
Matrix4.transpose = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const matrix1 = matrix[1];
  const matrix2 = matrix[2];
  const matrix3 = matrix[3];
  const matrix6 = matrix[6];
  const matrix7 = matrix[7];
  const matrix11 = matrix[11];
  result[0] = matrix[0];
  result[1] = matrix[4];
  result[2] = matrix[8];
  result[3] = matrix[12];
  result[4] = matrix1;
  result[5] = matrix[5];
  result[6] = matrix[9];
  result[7] = matrix[13];
  result[8] = matrix2;
  result[9] = matrix6;
  result[10] = matrix[10];
  result[11] = matrix[14];
  result[12] = matrix3;
  result[13] = matrix7;
  result[14] = matrix11;
  result[15] = matrix[15];
  return result;
};
Matrix4.abs = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result[0] = Math.abs(matrix[0]);
  result[1] = Math.abs(matrix[1]);
  result[2] = Math.abs(matrix[2]);
  result[3] = Math.abs(matrix[3]);
  result[4] = Math.abs(matrix[4]);
  result[5] = Math.abs(matrix[5]);
  result[6] = Math.abs(matrix[6]);
  result[7] = Math.abs(matrix[7]);
  result[8] = Math.abs(matrix[8]);
  result[9] = Math.abs(matrix[9]);
  result[10] = Math.abs(matrix[10]);
  result[11] = Math.abs(matrix[11]);
  result[12] = Math.abs(matrix[12]);
  result[13] = Math.abs(matrix[13]);
  result[14] = Math.abs(matrix[14]);
  result[15] = Math.abs(matrix[15]);
  return result;
};
Matrix4.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && // Translation
  left[12] === right[12] && left[13] === right[13] && left[14] === right[14] && // Rotation/scale
  left[0] === right[0] && left[1] === right[1] && left[2] === right[2] && left[4] === right[4] && left[5] === right[5] && left[6] === right[6] && left[8] === right[8] && left[9] === right[9] && left[10] === right[10] && // Bottom row
  left[3] === right[3] && left[7] === right[7] && left[11] === right[11] && left[15] === right[15];
};
Matrix4.equalsEpsilon = function(left, right, epsilon) {
  epsilon = defaultValue_default(epsilon, 0);
  return left === right || defined_default(left) && defined_default(right) && Math.abs(left[0] - right[0]) <= epsilon && Math.abs(left[1] - right[1]) <= epsilon && Math.abs(left[2] - right[2]) <= epsilon && Math.abs(left[3] - right[3]) <= epsilon && Math.abs(left[4] - right[4]) <= epsilon && Math.abs(left[5] - right[5]) <= epsilon && Math.abs(left[6] - right[6]) <= epsilon && Math.abs(left[7] - right[7]) <= epsilon && Math.abs(left[8] - right[8]) <= epsilon && Math.abs(left[9] - right[9]) <= epsilon && Math.abs(left[10] - right[10]) <= epsilon && Math.abs(left[11] - right[11]) <= epsilon && Math.abs(left[12] - right[12]) <= epsilon && Math.abs(left[13] - right[13]) <= epsilon && Math.abs(left[14] - right[14]) <= epsilon && Math.abs(left[15] - right[15]) <= epsilon;
};
Matrix4.getTranslation = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result.x = matrix[12];
  result.y = matrix[13];
  result.z = matrix[14];
  return result;
};
Matrix4.getMatrix3 = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[4];
  result[4] = matrix[5];
  result[5] = matrix[6];
  result[6] = matrix[8];
  result[7] = matrix[9];
  result[8] = matrix[10];
  return result;
};
var scratchInverseRotation = new Matrix3_default();
var scratchMatrix3Zero = new Matrix3_default();
var scratchBottomRow = new Cartesian4_default();
var scratchExpectedBottomRow = new Cartesian4_default(0, 0, 0, 1);
Matrix4.inverse = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const src0 = matrix[0];
  const src1 = matrix[4];
  const src2 = matrix[8];
  const src3 = matrix[12];
  const src4 = matrix[1];
  const src5 = matrix[5];
  const src6 = matrix[9];
  const src7 = matrix[13];
  const src8 = matrix[2];
  const src9 = matrix[6];
  const src10 = matrix[10];
  const src11 = matrix[14];
  const src12 = matrix[3];
  const src13 = matrix[7];
  const src14 = matrix[11];
  const src15 = matrix[15];
  let tmp0 = src10 * src15;
  let tmp1 = src11 * src14;
  let tmp2 = src9 * src15;
  let tmp3 = src11 * src13;
  let tmp4 = src9 * src14;
  let tmp5 = src10 * src13;
  let tmp6 = src8 * src15;
  let tmp7 = src11 * src12;
  let tmp8 = src8 * src14;
  let tmp9 = src10 * src12;
  let tmp10 = src8 * src13;
  let tmp11 = src9 * src12;
  const dst0 = tmp0 * src5 + tmp3 * src6 + tmp4 * src7 - (tmp1 * src5 + tmp2 * src6 + tmp5 * src7);
  const dst1 = tmp1 * src4 + tmp6 * src6 + tmp9 * src7 - (tmp0 * src4 + tmp7 * src6 + tmp8 * src7);
  const dst2 = tmp2 * src4 + tmp7 * src5 + tmp10 * src7 - (tmp3 * src4 + tmp6 * src5 + tmp11 * src7);
  const dst3 = tmp5 * src4 + tmp8 * src5 + tmp11 * src6 - (tmp4 * src4 + tmp9 * src5 + tmp10 * src6);
  const dst4 = tmp1 * src1 + tmp2 * src2 + tmp5 * src3 - (tmp0 * src1 + tmp3 * src2 + tmp4 * src3);
  const dst5 = tmp0 * src0 + tmp7 * src2 + tmp8 * src3 - (tmp1 * src0 + tmp6 * src2 + tmp9 * src3);
  const dst6 = tmp3 * src0 + tmp6 * src1 + tmp11 * src3 - (tmp2 * src0 + tmp7 * src1 + tmp10 * src3);
  const dst7 = tmp4 * src0 + tmp9 * src1 + tmp10 * src2 - (tmp5 * src0 + tmp8 * src1 + tmp11 * src2);
  tmp0 = src2 * src7;
  tmp1 = src3 * src6;
  tmp2 = src1 * src7;
  tmp3 = src3 * src5;
  tmp4 = src1 * src6;
  tmp5 = src2 * src5;
  tmp6 = src0 * src7;
  tmp7 = src3 * src4;
  tmp8 = src0 * src6;
  tmp9 = src2 * src4;
  tmp10 = src0 * src5;
  tmp11 = src1 * src4;
  const dst8 = tmp0 * src13 + tmp3 * src14 + tmp4 * src15 - (tmp1 * src13 + tmp2 * src14 + tmp5 * src15);
  const dst9 = tmp1 * src12 + tmp6 * src14 + tmp9 * src15 - (tmp0 * src12 + tmp7 * src14 + tmp8 * src15);
  const dst10 = tmp2 * src12 + tmp7 * src13 + tmp10 * src15 - (tmp3 * src12 + tmp6 * src13 + tmp11 * src15);
  const dst11 = tmp5 * src12 + tmp8 * src13 + tmp11 * src14 - (tmp4 * src12 + tmp9 * src13 + tmp10 * src14);
  const dst12 = tmp2 * src10 + tmp5 * src11 + tmp1 * src9 - (tmp4 * src11 + tmp0 * src9 + tmp3 * src10);
  const dst13 = tmp8 * src11 + tmp0 * src8 + tmp7 * src10 - (tmp6 * src10 + tmp9 * src11 + tmp1 * src8);
  const dst14 = tmp6 * src9 + tmp11 * src11 + tmp3 * src8 - (tmp10 * src11 + tmp2 * src8 + tmp7 * src9);
  const dst15 = tmp10 * src10 + tmp4 * src8 + tmp9 * src9 - (tmp8 * src9 + tmp11 * src10 + tmp5 * src8);
  let det = src0 * dst0 + src1 * dst1 + src2 * dst2 + src3 * dst3;
  if (Math.abs(det) < Math_default.EPSILON21) {
    if (Matrix3_default.equalsEpsilon(
      Matrix4.getMatrix3(matrix, scratchInverseRotation),
      scratchMatrix3Zero,
      Math_default.EPSILON7
    ) && Cartesian4_default.equals(
      Matrix4.getRow(matrix, 3, scratchBottomRow),
      scratchExpectedBottomRow
    )) {
      result[0] = 0;
      result[1] = 0;
      result[2] = 0;
      result[3] = 0;
      result[4] = 0;
      result[5] = 0;
      result[6] = 0;
      result[7] = 0;
      result[8] = 0;
      result[9] = 0;
      result[10] = 0;
      result[11] = 0;
      result[12] = -matrix[12];
      result[13] = -matrix[13];
      result[14] = -matrix[14];
      result[15] = 1;
      return result;
    }
    throw new RuntimeError_default(
      "matrix is not invertible because its determinate is zero."
    );
  }
  det = 1 / det;
  result[0] = dst0 * det;
  result[1] = dst1 * det;
  result[2] = dst2 * det;
  result[3] = dst3 * det;
  result[4] = dst4 * det;
  result[5] = dst5 * det;
  result[6] = dst6 * det;
  result[7] = dst7 * det;
  result[8] = dst8 * det;
  result[9] = dst9 * det;
  result[10] = dst10 * det;
  result[11] = dst11 * det;
  result[12] = dst12 * det;
  result[13] = dst13 * det;
  result[14] = dst14 * det;
  result[15] = dst15 * det;
  return result;
};
Matrix4.inverseTransformation = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const matrix0 = matrix[0];
  const matrix1 = matrix[1];
  const matrix2 = matrix[2];
  const matrix4 = matrix[4];
  const matrix5 = matrix[5];
  const matrix6 = matrix[6];
  const matrix8 = matrix[8];
  const matrix9 = matrix[9];
  const matrix10 = matrix[10];
  const vX = matrix[12];
  const vY = matrix[13];
  const vZ = matrix[14];
  const x = -matrix0 * vX - matrix1 * vY - matrix2 * vZ;
  const y = -matrix4 * vX - matrix5 * vY - matrix6 * vZ;
  const z = -matrix8 * vX - matrix9 * vY - matrix10 * vZ;
  result[0] = matrix0;
  result[1] = matrix4;
  result[2] = matrix8;
  result[3] = 0;
  result[4] = matrix1;
  result[5] = matrix5;
  result[6] = matrix9;
  result[7] = 0;
  result[8] = matrix2;
  result[9] = matrix6;
  result[10] = matrix10;
  result[11] = 0;
  result[12] = x;
  result[13] = y;
  result[14] = z;
  result[15] = 1;
  return result;
};
var scratchTransposeMatrix2 = new Matrix4();
Matrix4.inverseTranspose = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  return Matrix4.inverse(
    Matrix4.transpose(matrix, scratchTransposeMatrix2),
    result
  );
};
Matrix4.IDENTITY = Object.freeze(
  new Matrix4(
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
    1,
    0,
    0,
    0,
    0,
    1
  )
);
Matrix4.ZERO = Object.freeze(
  new Matrix4(
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0
  )
);
Matrix4.COLUMN0ROW0 = 0;
Matrix4.COLUMN0ROW1 = 1;
Matrix4.COLUMN0ROW2 = 2;
Matrix4.COLUMN0ROW3 = 3;
Matrix4.COLUMN1ROW0 = 4;
Matrix4.COLUMN1ROW1 = 5;
Matrix4.COLUMN1ROW2 = 6;
Matrix4.COLUMN1ROW3 = 7;
Matrix4.COLUMN2ROW0 = 8;
Matrix4.COLUMN2ROW1 = 9;
Matrix4.COLUMN2ROW2 = 10;
Matrix4.COLUMN2ROW3 = 11;
Matrix4.COLUMN3ROW0 = 12;
Matrix4.COLUMN3ROW1 = 13;
Matrix4.COLUMN3ROW2 = 14;
Matrix4.COLUMN3ROW3 = 15;
Object.defineProperties(Matrix4.prototype, {
  /**
   * Gets the number of items in the collection.
   * @memberof Matrix4.prototype
   *
   * @type {number}
   */
  length: {
    get: function() {
      return Matrix4.packedLength;
    }
  }
});
Matrix4.prototype.clone = function(result) {
  return Matrix4.clone(this, result);
};
Matrix4.prototype.equals = function(right) {
  return Matrix4.equals(this, right);
};
Matrix4.equalsArray = function(matrix, array, offset) {
  return matrix[0] === array[offset] && matrix[1] === array[offset + 1] && matrix[2] === array[offset + 2] && matrix[3] === array[offset + 3] && matrix[4] === array[offset + 4] && matrix[5] === array[offset + 5] && matrix[6] === array[offset + 6] && matrix[7] === array[offset + 7] && matrix[8] === array[offset + 8] && matrix[9] === array[offset + 9] && matrix[10] === array[offset + 10] && matrix[11] === array[offset + 11] && matrix[12] === array[offset + 12] && matrix[13] === array[offset + 13] && matrix[14] === array[offset + 14] && matrix[15] === array[offset + 15];
};
Matrix4.prototype.equalsEpsilon = function(right, epsilon) {
  return Matrix4.equalsEpsilon(this, right, epsilon);
};
Matrix4.prototype.toString = function() {
  return `(${this[0]}, ${this[4]}, ${this[8]}, ${this[12]})
(${this[1]}, ${this[5]}, ${this[9]}, ${this[13]})
(${this[2]}, ${this[6]}, ${this[10]}, ${this[14]})
(${this[3]}, ${this[7]}, ${this[11]}, ${this[15]})`;
};
var Matrix4_default = Matrix4;

// packages/engine/Source/Core/WebGLConstants.js
var WebGLConstants = {
  DEPTH_BUFFER_BIT: 256,
  STENCIL_BUFFER_BIT: 1024,
  COLOR_BUFFER_BIT: 16384,
  POINTS: 0,
  LINES: 1,
  LINE_LOOP: 2,
  LINE_STRIP: 3,
  TRIANGLES: 4,
  TRIANGLE_STRIP: 5,
  TRIANGLE_FAN: 6,
  ZERO: 0,
  ONE: 1,
  SRC_COLOR: 768,
  ONE_MINUS_SRC_COLOR: 769,
  SRC_ALPHA: 770,
  ONE_MINUS_SRC_ALPHA: 771,
  DST_ALPHA: 772,
  ONE_MINUS_DST_ALPHA: 773,
  DST_COLOR: 774,
  ONE_MINUS_DST_COLOR: 775,
  SRC_ALPHA_SATURATE: 776,
  FUNC_ADD: 32774,
  BLEND_EQUATION: 32777,
  BLEND_EQUATION_RGB: 32777,
  // same as BLEND_EQUATION
  BLEND_EQUATION_ALPHA: 34877,
  FUNC_SUBTRACT: 32778,
  FUNC_REVERSE_SUBTRACT: 32779,
  BLEND_DST_RGB: 32968,
  BLEND_SRC_RGB: 32969,
  BLEND_DST_ALPHA: 32970,
  BLEND_SRC_ALPHA: 32971,
  CONSTANT_COLOR: 32769,
  ONE_MINUS_CONSTANT_COLOR: 32770,
  CONSTANT_ALPHA: 32771,
  ONE_MINUS_CONSTANT_ALPHA: 32772,
  BLEND_COLOR: 32773,
  ARRAY_BUFFER: 34962,
  ELEMENT_ARRAY_BUFFER: 34963,
  ARRAY_BUFFER_BINDING: 34964,
  ELEMENT_ARRAY_BUFFER_BINDING: 34965,
  STREAM_DRAW: 35040,
  STATIC_DRAW: 35044,
  DYNAMIC_DRAW: 35048,
  BUFFER_SIZE: 34660,
  BUFFER_USAGE: 34661,
  CURRENT_VERTEX_ATTRIB: 34342,
  FRONT: 1028,
  BACK: 1029,
  FRONT_AND_BACK: 1032,
  CULL_FACE: 2884,
  BLEND: 3042,
  DITHER: 3024,
  STENCIL_TEST: 2960,
  DEPTH_TEST: 2929,
  SCISSOR_TEST: 3089,
  POLYGON_OFFSET_FILL: 32823,
  SAMPLE_ALPHA_TO_COVERAGE: 32926,
  SAMPLE_COVERAGE: 32928,
  NO_ERROR: 0,
  INVALID_ENUM: 1280,
  INVALID_VALUE: 1281,
  INVALID_OPERATION: 1282,
  OUT_OF_MEMORY: 1285,
  CW: 2304,
  CCW: 2305,
  LINE_WIDTH: 2849,
  ALIASED_POINT_SIZE_RANGE: 33901,
  ALIASED_LINE_WIDTH_RANGE: 33902,
  CULL_FACE_MODE: 2885,
  FRONT_FACE: 2886,
  DEPTH_RANGE: 2928,
  DEPTH_WRITEMASK: 2930,
  DEPTH_CLEAR_VALUE: 2931,
  DEPTH_FUNC: 2932,
  STENCIL_CLEAR_VALUE: 2961,
  STENCIL_FUNC: 2962,
  STENCIL_FAIL: 2964,
  STENCIL_PASS_DEPTH_FAIL: 2965,
  STENCIL_PASS_DEPTH_PASS: 2966,
  STENCIL_REF: 2967,
  STENCIL_VALUE_MASK: 2963,
  STENCIL_WRITEMASK: 2968,
  STENCIL_BACK_FUNC: 34816,
  STENCIL_BACK_FAIL: 34817,
  STENCIL_BACK_PASS_DEPTH_FAIL: 34818,
  STENCIL_BACK_PASS_DEPTH_PASS: 34819,
  STENCIL_BACK_REF: 36003,
  STENCIL_BACK_VALUE_MASK: 36004,
  STENCIL_BACK_WRITEMASK: 36005,
  VIEWPORT: 2978,
  SCISSOR_BOX: 3088,
  COLOR_CLEAR_VALUE: 3106,
  COLOR_WRITEMASK: 3107,
  UNPACK_ALIGNMENT: 3317,
  PACK_ALIGNMENT: 3333,
  MAX_TEXTURE_SIZE: 3379,
  MAX_VIEWPORT_DIMS: 3386,
  SUBPIXEL_BITS: 3408,
  RED_BITS: 3410,
  GREEN_BITS: 3411,
  BLUE_BITS: 3412,
  ALPHA_BITS: 3413,
  DEPTH_BITS: 3414,
  STENCIL_BITS: 3415,
  POLYGON_OFFSET_UNITS: 10752,
  POLYGON_OFFSET_FACTOR: 32824,
  TEXTURE_BINDING_2D: 32873,
  SAMPLE_BUFFERS: 32936,
  SAMPLES: 32937,
  SAMPLE_COVERAGE_VALUE: 32938,
  SAMPLE_COVERAGE_INVERT: 32939,
  COMPRESSED_TEXTURE_FORMATS: 34467,
  DONT_CARE: 4352,
  FASTEST: 4353,
  NICEST: 4354,
  GENERATE_MIPMAP_HINT: 33170,
  BYTE: 5120,
  UNSIGNED_BYTE: 5121,
  SHORT: 5122,
  UNSIGNED_SHORT: 5123,
  INT: 5124,
  UNSIGNED_INT: 5125,
  FLOAT: 5126,
  DEPTH_COMPONENT: 6402,
  ALPHA: 6406,
  RGB: 6407,
  RGBA: 6408,
  LUMINANCE: 6409,
  LUMINANCE_ALPHA: 6410,
  UNSIGNED_SHORT_4_4_4_4: 32819,
  UNSIGNED_SHORT_5_5_5_1: 32820,
  UNSIGNED_SHORT_5_6_5: 33635,
  FRAGMENT_SHADER: 35632,
  VERTEX_SHADER: 35633,
  MAX_VERTEX_ATTRIBS: 34921,
  MAX_VERTEX_UNIFORM_VECTORS: 36347,
  MAX_VARYING_VECTORS: 36348,
  MAX_COMBINED_TEXTURE_IMAGE_UNITS: 35661,
  MAX_VERTEX_TEXTURE_IMAGE_UNITS: 35660,
  MAX_TEXTURE_IMAGE_UNITS: 34930,
  MAX_FRAGMENT_UNIFORM_VECTORS: 36349,
  SHADER_TYPE: 35663,
  DELETE_STATUS: 35712,
  LINK_STATUS: 35714,
  VALIDATE_STATUS: 35715,
  ATTACHED_SHADERS: 35717,
  ACTIVE_UNIFORMS: 35718,
  ACTIVE_ATTRIBUTES: 35721,
  SHADING_LANGUAGE_VERSION: 35724,
  CURRENT_PROGRAM: 35725,
  NEVER: 512,
  LESS: 513,
  EQUAL: 514,
  LEQUAL: 515,
  GREATER: 516,
  NOTEQUAL: 517,
  GEQUAL: 518,
  ALWAYS: 519,
  KEEP: 7680,
  REPLACE: 7681,
  INCR: 7682,
  DECR: 7683,
  INVERT: 5386,
  INCR_WRAP: 34055,
  DECR_WRAP: 34056,
  VENDOR: 7936,
  RENDERER: 7937,
  VERSION: 7938,
  NEAREST: 9728,
  LINEAR: 9729,
  NEAREST_MIPMAP_NEAREST: 9984,
  LINEAR_MIPMAP_NEAREST: 9985,
  NEAREST_MIPMAP_LINEAR: 9986,
  LINEAR_MIPMAP_LINEAR: 9987,
  TEXTURE_MAG_FILTER: 10240,
  TEXTURE_MIN_FILTER: 10241,
  TEXTURE_WRAP_S: 10242,
  TEXTURE_WRAP_T: 10243,
  TEXTURE_2D: 3553,
  TEXTURE: 5890,
  TEXTURE_CUBE_MAP: 34067,
  TEXTURE_BINDING_CUBE_MAP: 34068,
  TEXTURE_CUBE_MAP_POSITIVE_X: 34069,
  TEXTURE_CUBE_MAP_NEGATIVE_X: 34070,
  TEXTURE_CUBE_MAP_POSITIVE_Y: 34071,
  TEXTURE_CUBE_MAP_NEGATIVE_Y: 34072,
  TEXTURE_CUBE_MAP_POSITIVE_Z: 34073,
  TEXTURE_CUBE_MAP_NEGATIVE_Z: 34074,
  MAX_CUBE_MAP_TEXTURE_SIZE: 34076,
  TEXTURE0: 33984,
  TEXTURE1: 33985,
  TEXTURE2: 33986,
  TEXTURE3: 33987,
  TEXTURE4: 33988,
  TEXTURE5: 33989,
  TEXTURE6: 33990,
  TEXTURE7: 33991,
  TEXTURE8: 33992,
  TEXTURE9: 33993,
  TEXTURE10: 33994,
  TEXTURE11: 33995,
  TEXTURE12: 33996,
  TEXTURE13: 33997,
  TEXTURE14: 33998,
  TEXTURE15: 33999,
  TEXTURE16: 34e3,
  TEXTURE17: 34001,
  TEXTURE18: 34002,
  TEXTURE19: 34003,
  TEXTURE20: 34004,
  TEXTURE21: 34005,
  TEXTURE22: 34006,
  TEXTURE23: 34007,
  TEXTURE24: 34008,
  TEXTURE25: 34009,
  TEXTURE26: 34010,
  TEXTURE27: 34011,
  TEXTURE28: 34012,
  TEXTURE29: 34013,
  TEXTURE30: 34014,
  TEXTURE31: 34015,
  ACTIVE_TEXTURE: 34016,
  REPEAT: 10497,
  CLAMP_TO_EDGE: 33071,
  MIRRORED_REPEAT: 33648,
  FLOAT_VEC2: 35664,
  FLOAT_VEC3: 35665,
  FLOAT_VEC4: 35666,
  INT_VEC2: 35667,
  INT_VEC3: 35668,
  INT_VEC4: 35669,
  BOOL: 35670,
  BOOL_VEC2: 35671,
  BOOL_VEC3: 35672,
  BOOL_VEC4: 35673,
  FLOAT_MAT2: 35674,
  FLOAT_MAT3: 35675,
  FLOAT_MAT4: 35676,
  SAMPLER_2D: 35678,
  SAMPLER_CUBE: 35680,
  VERTEX_ATTRIB_ARRAY_ENABLED: 34338,
  VERTEX_ATTRIB_ARRAY_SIZE: 34339,
  VERTEX_ATTRIB_ARRAY_STRIDE: 34340,
  VERTEX_ATTRIB_ARRAY_TYPE: 34341,
  VERTEX_ATTRIB_ARRAY_NORMALIZED: 34922,
  VERTEX_ATTRIB_ARRAY_POINTER: 34373,
  VERTEX_ATTRIB_ARRAY_BUFFER_BINDING: 34975,
  IMPLEMENTATION_COLOR_READ_TYPE: 35738,
  IMPLEMENTATION_COLOR_READ_FORMAT: 35739,
  COMPILE_STATUS: 35713,
  LOW_FLOAT: 36336,
  MEDIUM_FLOAT: 36337,
  HIGH_FLOAT: 36338,
  LOW_INT: 36339,
  MEDIUM_INT: 36340,
  HIGH_INT: 36341,
  FRAMEBUFFER: 36160,
  RENDERBUFFER: 36161,
  RGBA4: 32854,
  RGB5_A1: 32855,
  RGB565: 36194,
  DEPTH_COMPONENT16: 33189,
  STENCIL_INDEX: 6401,
  STENCIL_INDEX8: 36168,
  DEPTH_STENCIL: 34041,
  RENDERBUFFER_WIDTH: 36162,
  RENDERBUFFER_HEIGHT: 36163,
  RENDERBUFFER_INTERNAL_FORMAT: 36164,
  RENDERBUFFER_RED_SIZE: 36176,
  RENDERBUFFER_GREEN_SIZE: 36177,
  RENDERBUFFER_BLUE_SIZE: 36178,
  RENDERBUFFER_ALPHA_SIZE: 36179,
  RENDERBUFFER_DEPTH_SIZE: 36180,
  RENDERBUFFER_STENCIL_SIZE: 36181,
  FRAMEBUFFER_ATTACHMENT_OBJECT_TYPE: 36048,
  FRAMEBUFFER_ATTACHMENT_OBJECT_NAME: 36049,
  FRAMEBUFFER_ATTACHMENT_TEXTURE_LEVEL: 36050,
  FRAMEBUFFER_ATTACHMENT_TEXTURE_CUBE_MAP_FACE: 36051,
  COLOR_ATTACHMENT0: 36064,
  DEPTH_ATTACHMENT: 36096,
  STENCIL_ATTACHMENT: 36128,
  DEPTH_STENCIL_ATTACHMENT: 33306,
  NONE: 0,
  FRAMEBUFFER_COMPLETE: 36053,
  FRAMEBUFFER_INCOMPLETE_ATTACHMENT: 36054,
  FRAMEBUFFER_INCOMPLETE_MISSING_ATTACHMENT: 36055,
  FRAMEBUFFER_INCOMPLETE_DIMENSIONS: 36057,
  FRAMEBUFFER_UNSUPPORTED: 36061,
  FRAMEBUFFER_BINDING: 36006,
  RENDERBUFFER_BINDING: 36007,
  MAX_RENDERBUFFER_SIZE: 34024,
  INVALID_FRAMEBUFFER_OPERATION: 1286,
  UNPACK_FLIP_Y_WEBGL: 37440,
  UNPACK_PREMULTIPLY_ALPHA_WEBGL: 37441,
  CONTEXT_LOST_WEBGL: 37442,
  UNPACK_COLORSPACE_CONVERSION_WEBGL: 37443,
  BROWSER_DEFAULT_WEBGL: 37444,
  // WEBGL_compressed_texture_s3tc
  COMPRESSED_RGB_S3TC_DXT1_EXT: 33776,
  COMPRESSED_RGBA_S3TC_DXT1_EXT: 33777,
  COMPRESSED_RGBA_S3TC_DXT3_EXT: 33778,
  COMPRESSED_RGBA_S3TC_DXT5_EXT: 33779,
  // WEBGL_compressed_texture_pvrtc
  COMPRESSED_RGB_PVRTC_4BPPV1_IMG: 35840,
  COMPRESSED_RGB_PVRTC_2BPPV1_IMG: 35841,
  COMPRESSED_RGBA_PVRTC_4BPPV1_IMG: 35842,
  COMPRESSED_RGBA_PVRTC_2BPPV1_IMG: 35843,
  // WEBGL_compressed_texture_astc
  COMPRESSED_RGBA_ASTC_4x4_WEBGL: 37808,
  // WEBGL_compressed_texture_etc1
  COMPRESSED_RGB_ETC1_WEBGL: 36196,
  // EXT_texture_compression_bptc
  COMPRESSED_RGBA_BPTC_UNORM: 36492,
  // EXT_color_buffer_half_float
  HALF_FLOAT_OES: 36193,
  // Desktop OpenGL
  DOUBLE: 5130,
  // WebGL 2
  READ_BUFFER: 3074,
  UNPACK_ROW_LENGTH: 3314,
  UNPACK_SKIP_ROWS: 3315,
  UNPACK_SKIP_PIXELS: 3316,
  PACK_ROW_LENGTH: 3330,
  PACK_SKIP_ROWS: 3331,
  PACK_SKIP_PIXELS: 3332,
  COLOR: 6144,
  DEPTH: 6145,
  STENCIL: 6146,
  RED: 6403,
  RGB8: 32849,
  RGBA8: 32856,
  RGB10_A2: 32857,
  TEXTURE_BINDING_3D: 32874,
  UNPACK_SKIP_IMAGES: 32877,
  UNPACK_IMAGE_HEIGHT: 32878,
  TEXTURE_3D: 32879,
  TEXTURE_WRAP_R: 32882,
  MAX_3D_TEXTURE_SIZE: 32883,
  UNSIGNED_INT_2_10_10_10_REV: 33640,
  MAX_ELEMENTS_VERTICES: 33e3,
  MAX_ELEMENTS_INDICES: 33001,
  TEXTURE_MIN_LOD: 33082,
  TEXTURE_MAX_LOD: 33083,
  TEXTURE_BASE_LEVEL: 33084,
  TEXTURE_MAX_LEVEL: 33085,
  MIN: 32775,
  MAX: 32776,
  DEPTH_COMPONENT24: 33190,
  MAX_TEXTURE_LOD_BIAS: 34045,
  TEXTURE_COMPARE_MODE: 34892,
  TEXTURE_COMPARE_FUNC: 34893,
  CURRENT_QUERY: 34917,
  QUERY_RESULT: 34918,
  QUERY_RESULT_AVAILABLE: 34919,
  STREAM_READ: 35041,
  STREAM_COPY: 35042,
  STATIC_READ: 35045,
  STATIC_COPY: 35046,
  DYNAMIC_READ: 35049,
  DYNAMIC_COPY: 35050,
  MAX_DRAW_BUFFERS: 34852,
  DRAW_BUFFER0: 34853,
  DRAW_BUFFER1: 34854,
  DRAW_BUFFER2: 34855,
  DRAW_BUFFER3: 34856,
  DRAW_BUFFER4: 34857,
  DRAW_BUFFER5: 34858,
  DRAW_BUFFER6: 34859,
  DRAW_BUFFER7: 34860,
  DRAW_BUFFER8: 34861,
  DRAW_BUFFER9: 34862,
  DRAW_BUFFER10: 34863,
  DRAW_BUFFER11: 34864,
  DRAW_BUFFER12: 34865,
  DRAW_BUFFER13: 34866,
  DRAW_BUFFER14: 34867,
  DRAW_BUFFER15: 34868,
  MAX_FRAGMENT_UNIFORM_COMPONENTS: 35657,
  MAX_VERTEX_UNIFORM_COMPONENTS: 35658,
  SAMPLER_3D: 35679,
  SAMPLER_2D_SHADOW: 35682,
  FRAGMENT_SHADER_DERIVATIVE_HINT: 35723,
  PIXEL_PACK_BUFFER: 35051,
  PIXEL_UNPACK_BUFFER: 35052,
  PIXEL_PACK_BUFFER_BINDING: 35053,
  PIXEL_UNPACK_BUFFER_BINDING: 35055,
  FLOAT_MAT2x3: 35685,
  FLOAT_MAT2x4: 35686,
  FLOAT_MAT3x2: 35687,
  FLOAT_MAT3x4: 35688,
  FLOAT_MAT4x2: 35689,
  FLOAT_MAT4x3: 35690,
  SRGB: 35904,
  SRGB8: 35905,
  SRGB8_ALPHA8: 35907,
  COMPARE_REF_TO_TEXTURE: 34894,
  RGBA32F: 34836,
  RGB32F: 34837,
  RGBA16F: 34842,
  RGB16F: 34843,
  VERTEX_ATTRIB_ARRAY_INTEGER: 35069,
  MAX_ARRAY_TEXTURE_LAYERS: 35071,
  MIN_PROGRAM_TEXEL_OFFSET: 35076,
  MAX_PROGRAM_TEXEL_OFFSET: 35077,
  MAX_VARYING_COMPONENTS: 35659,
  TEXTURE_2D_ARRAY: 35866,
  TEXTURE_BINDING_2D_ARRAY: 35869,
  R11F_G11F_B10F: 35898,
  UNSIGNED_INT_10F_11F_11F_REV: 35899,
  RGB9_E5: 35901,
  UNSIGNED_INT_5_9_9_9_REV: 35902,
  TRANSFORM_FEEDBACK_BUFFER_MODE: 35967,
  MAX_TRANSFORM_FEEDBACK_SEPARATE_COMPONENTS: 35968,
  TRANSFORM_FEEDBACK_VARYINGS: 35971,
  TRANSFORM_FEEDBACK_BUFFER_START: 35972,
  TRANSFORM_FEEDBACK_BUFFER_SIZE: 35973,
  TRANSFORM_FEEDBACK_PRIMITIVES_WRITTEN: 35976,
  RASTERIZER_DISCARD: 35977,
  MAX_TRANSFORM_FEEDBACK_INTERLEAVED_COMPONENTS: 35978,
  MAX_TRANSFORM_FEEDBACK_SEPARATE_ATTRIBS: 35979,
  INTERLEAVED_ATTRIBS: 35980,
  SEPARATE_ATTRIBS: 35981,
  TRANSFORM_FEEDBACK_BUFFER: 35982,
  TRANSFORM_FEEDBACK_BUFFER_BINDING: 35983,
  RGBA32UI: 36208,
  RGB32UI: 36209,
  RGBA16UI: 36214,
  RGB16UI: 36215,
  RGBA8UI: 36220,
  RGB8UI: 36221,
  RGBA32I: 36226,
  RGB32I: 36227,
  RGBA16I: 36232,
  RGB16I: 36233,
  RGBA8I: 36238,
  RGB8I: 36239,
  RED_INTEGER: 36244,
  RGB_INTEGER: 36248,
  RGBA_INTEGER: 36249,
  SAMPLER_2D_ARRAY: 36289,
  SAMPLER_2D_ARRAY_SHADOW: 36292,
  SAMPLER_CUBE_SHADOW: 36293,
  UNSIGNED_INT_VEC2: 36294,
  UNSIGNED_INT_VEC3: 36295,
  UNSIGNED_INT_VEC4: 36296,
  INT_SAMPLER_2D: 36298,
  INT_SAMPLER_3D: 36299,
  INT_SAMPLER_CUBE: 36300,
  INT_SAMPLER_2D_ARRAY: 36303,
  UNSIGNED_INT_SAMPLER_2D: 36306,
  UNSIGNED_INT_SAMPLER_3D: 36307,
  UNSIGNED_INT_SAMPLER_CUBE: 36308,
  UNSIGNED_INT_SAMPLER_2D_ARRAY: 36311,
  DEPTH_COMPONENT32F: 36012,
  DEPTH32F_STENCIL8: 36013,
  FLOAT_32_UNSIGNED_INT_24_8_REV: 36269,
  FRAMEBUFFER_ATTACHMENT_COLOR_ENCODING: 33296,
  FRAMEBUFFER_ATTACHMENT_COMPONENT_TYPE: 33297,
  FRAMEBUFFER_ATTACHMENT_RED_SIZE: 33298,
  FRAMEBUFFER_ATTACHMENT_GREEN_SIZE: 33299,
  FRAMEBUFFER_ATTACHMENT_BLUE_SIZE: 33300,
  FRAMEBUFFER_ATTACHMENT_ALPHA_SIZE: 33301,
  FRAMEBUFFER_ATTACHMENT_DEPTH_SIZE: 33302,
  FRAMEBUFFER_ATTACHMENT_STENCIL_SIZE: 33303,
  FRAMEBUFFER_DEFAULT: 33304,
  UNSIGNED_INT_24_8: 34042,
  DEPTH24_STENCIL8: 35056,
  UNSIGNED_NORMALIZED: 35863,
  DRAW_FRAMEBUFFER_BINDING: 36006,
  // Same as FRAMEBUFFER_BINDING
  READ_FRAMEBUFFER: 36008,
  DRAW_FRAMEBUFFER: 36009,
  READ_FRAMEBUFFER_BINDING: 36010,
  RENDERBUFFER_SAMPLES: 36011,
  FRAMEBUFFER_ATTACHMENT_TEXTURE_LAYER: 36052,
  MAX_COLOR_ATTACHMENTS: 36063,
  COLOR_ATTACHMENT1: 36065,
  COLOR_ATTACHMENT2: 36066,
  COLOR_ATTACHMENT3: 36067,
  COLOR_ATTACHMENT4: 36068,
  COLOR_ATTACHMENT5: 36069,
  COLOR_ATTACHMENT6: 36070,
  COLOR_ATTACHMENT7: 36071,
  COLOR_ATTACHMENT8: 36072,
  COLOR_ATTACHMENT9: 36073,
  COLOR_ATTACHMENT10: 36074,
  COLOR_ATTACHMENT11: 36075,
  COLOR_ATTACHMENT12: 36076,
  COLOR_ATTACHMENT13: 36077,
  COLOR_ATTACHMENT14: 36078,
  COLOR_ATTACHMENT15: 36079,
  FRAMEBUFFER_INCOMPLETE_MULTISAMPLE: 36182,
  MAX_SAMPLES: 36183,
  HALF_FLOAT: 5131,
  RG: 33319,
  RG_INTEGER: 33320,
  R8: 33321,
  RG8: 33323,
  R16F: 33325,
  R32F: 33326,
  RG16F: 33327,
  RG32F: 33328,
  R8I: 33329,
  R8UI: 33330,
  R16I: 33331,
  R16UI: 33332,
  R32I: 33333,
  R32UI: 33334,
  RG8I: 33335,
  RG8UI: 33336,
  RG16I: 33337,
  RG16UI: 33338,
  RG32I: 33339,
  RG32UI: 33340,
  VERTEX_ARRAY_BINDING: 34229,
  R8_SNORM: 36756,
  RG8_SNORM: 36757,
  RGB8_SNORM: 36758,
  RGBA8_SNORM: 36759,
  SIGNED_NORMALIZED: 36764,
  COPY_READ_BUFFER: 36662,
  COPY_WRITE_BUFFER: 36663,
  COPY_READ_BUFFER_BINDING: 36662,
  // Same as COPY_READ_BUFFER
  COPY_WRITE_BUFFER_BINDING: 36663,
  // Same as COPY_WRITE_BUFFER
  UNIFORM_BUFFER: 35345,
  UNIFORM_BUFFER_BINDING: 35368,
  UNIFORM_BUFFER_START: 35369,
  UNIFORM_BUFFER_SIZE: 35370,
  MAX_VERTEX_UNIFORM_BLOCKS: 35371,
  MAX_FRAGMENT_UNIFORM_BLOCKS: 35373,
  MAX_COMBINED_UNIFORM_BLOCKS: 35374,
  MAX_UNIFORM_BUFFER_BINDINGS: 35375,
  MAX_UNIFORM_BLOCK_SIZE: 35376,
  MAX_COMBINED_VERTEX_UNIFORM_COMPONENTS: 35377,
  MAX_COMBINED_FRAGMENT_UNIFORM_COMPONENTS: 35379,
  UNIFORM_BUFFER_OFFSET_ALIGNMENT: 35380,
  ACTIVE_UNIFORM_BLOCKS: 35382,
  UNIFORM_TYPE: 35383,
  UNIFORM_SIZE: 35384,
  UNIFORM_BLOCK_INDEX: 35386,
  UNIFORM_OFFSET: 35387,
  UNIFORM_ARRAY_STRIDE: 35388,
  UNIFORM_MATRIX_STRIDE: 35389,
  UNIFORM_IS_ROW_MAJOR: 35390,
  UNIFORM_BLOCK_BINDING: 35391,
  UNIFORM_BLOCK_DATA_SIZE: 35392,
  UNIFORM_BLOCK_ACTIVE_UNIFORMS: 35394,
  UNIFORM_BLOCK_ACTIVE_UNIFORM_INDICES: 35395,
  UNIFORM_BLOCK_REFERENCED_BY_VERTEX_SHADER: 35396,
  UNIFORM_BLOCK_REFERENCED_BY_FRAGMENT_SHADER: 35398,
  INVALID_INDEX: 4294967295,
  MAX_VERTEX_OUTPUT_COMPONENTS: 37154,
  MAX_FRAGMENT_INPUT_COMPONENTS: 37157,
  MAX_SERVER_WAIT_TIMEOUT: 37137,
  OBJECT_TYPE: 37138,
  SYNC_CONDITION: 37139,
  SYNC_STATUS: 37140,
  SYNC_FLAGS: 37141,
  SYNC_FENCE: 37142,
  SYNC_GPU_COMMANDS_COMPLETE: 37143,
  UNSIGNALED: 37144,
  SIGNALED: 37145,
  ALREADY_SIGNALED: 37146,
  TIMEOUT_EXPIRED: 37147,
  CONDITION_SATISFIED: 37148,
  WAIT_FAILED: 37149,
  SYNC_FLUSH_COMMANDS_BIT: 1,
  VERTEX_ATTRIB_ARRAY_DIVISOR: 35070,
  ANY_SAMPLES_PASSED: 35887,
  ANY_SAMPLES_PASSED_CONSERVATIVE: 36202,
  SAMPLER_BINDING: 35097,
  RGB10_A2UI: 36975,
  INT_2_10_10_10_REV: 36255,
  TRANSFORM_FEEDBACK: 36386,
  TRANSFORM_FEEDBACK_PAUSED: 36387,
  TRANSFORM_FEEDBACK_ACTIVE: 36388,
  TRANSFORM_FEEDBACK_BINDING: 36389,
  COMPRESSED_R11_EAC: 37488,
  COMPRESSED_SIGNED_R11_EAC: 37489,
  COMPRESSED_RG11_EAC: 37490,
  COMPRESSED_SIGNED_RG11_EAC: 37491,
  COMPRESSED_RGB8_ETC2: 37492,
  COMPRESSED_SRGB8_ETC2: 37493,
  COMPRESSED_RGB8_PUNCHTHROUGH_ALPHA1_ETC2: 37494,
  COMPRESSED_SRGB8_PUNCHTHROUGH_ALPHA1_ETC2: 37495,
  COMPRESSED_RGBA8_ETC2_EAC: 37496,
  COMPRESSED_SRGB8_ALPHA8_ETC2_EAC: 37497,
  TEXTURE_IMMUTABLE_FORMAT: 37167,
  MAX_ELEMENT_INDEX: 36203,
  TEXTURE_IMMUTABLE_LEVELS: 33503,
  // Extensions
  MAX_TEXTURE_MAX_ANISOTROPY_EXT: 34047
};
var WebGLConstants_default = Object.freeze(WebGLConstants);

// packages/engine/Source/Renderer/AutomaticUniforms.js
var viewerPositionWCScratch = new Cartesian3_default();
function AutomaticUniform(options) {
  this._size = options.size;
  this._datatype = options.datatype;
  this.getValue = options.getValue;
}
var datatypeToGlsl = {};
datatypeToGlsl[WebGLConstants_default.FLOAT] = "float";
datatypeToGlsl[WebGLConstants_default.FLOAT_VEC2] = "vec2";
datatypeToGlsl[WebGLConstants_default.FLOAT_VEC3] = "vec3";
datatypeToGlsl[WebGLConstants_default.FLOAT_VEC4] = "vec4";
datatypeToGlsl[WebGLConstants_default.INT] = "int";
datatypeToGlsl[WebGLConstants_default.INT_VEC2] = "ivec2";
datatypeToGlsl[WebGLConstants_default.INT_VEC3] = "ivec3";
datatypeToGlsl[WebGLConstants_default.INT_VEC4] = "ivec4";
datatypeToGlsl[WebGLConstants_default.BOOL] = "bool";
datatypeToGlsl[WebGLConstants_default.BOOL_VEC2] = "bvec2";
datatypeToGlsl[WebGLConstants_default.BOOL_VEC3] = "bvec3";
datatypeToGlsl[WebGLConstants_default.BOOL_VEC4] = "bvec4";
datatypeToGlsl[WebGLConstants_default.FLOAT_MAT2] = "mat2";
datatypeToGlsl[WebGLConstants_default.FLOAT_MAT3] = "mat3";
datatypeToGlsl[WebGLConstants_default.FLOAT_MAT4] = "mat4";
datatypeToGlsl[WebGLConstants_default.SAMPLER_2D] = "sampler2D";
datatypeToGlsl[WebGLConstants_default.SAMPLER_CUBE] = "samplerCube";
AutomaticUniform.prototype.getDeclaration = function(name) {
  let declaration = `uniform ${datatypeToGlsl[this._datatype]} ${name}`;
  const size = this._size;
  if (size === 1) {
    declaration += ";";
  } else {
    declaration += `[${size.toString()}];`;
  }
  return declaration;
};
var AutomaticUniforms = {
  /**
   * An automatic GLSL uniform containing the viewport's <code>x</code>, <code>y</code>, <code>width</code>,
   * and <code>height</code> properties in an <code>vec4</code>'s <code>x</code>, <code>y</code>, <code>z</code>,
   * and <code>w</code> components, respectively.
   *
   * @example
   * // GLSL declaration
   * uniform vec4 czm_viewport;
   *
   * // Scale the window coordinate components to [0, 1] by dividing
   * // by the viewport's width and height.
   * vec2 v = gl_FragCoord.xy / czm_viewport.zw;
   *
   * @see Context#getViewport
   */
  czm_viewport: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC4,
    getValue: function(uniformState) {
      return uniformState.viewportCartesian4;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 orthographic projection matrix that
   * transforms window coordinates to clip coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.
   * <br /><br />
   * This transform is useful when a vertex shader inputs or manipulates window coordinates
   * as done by {@link BillboardCollection}.
   * <br /><br />
   * Do not confuse {@link czm_viewportTransformation} with <code>czm_viewportOrthographic</code>.
   * The former transforms from normalized device coordinates to window coordinates; the later transforms
   * from window coordinates to clip coordinates, and is often used to assign to <code>gl_Position</code>.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_viewportOrthographic;
   *
   * // Example
   * gl_Position = czm_viewportOrthographic * vec4(windowPosition, 0.0, 1.0);
   *
   * @see UniformState#viewportOrthographic
   * @see czm_viewport
   * @see czm_viewportTransformation
   * @see BillboardCollection
   */
  czm_viewportOrthographic: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.viewportOrthographic;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 transformation matrix that
   * transforms normalized device coordinates to window coordinates.  The context's
   * full viewport is used, and the depth range is assumed to be <code>near = 0</code>
   * and <code>far = 1</code>.
   * <br /><br />
   * This transform is useful when there is a need to manipulate window coordinates
   * in a vertex shader as done by {@link BillboardCollection}.  In many cases,
   * this matrix will not be used directly; instead, {@link czm_modelToWindowCoordinates}
   * will be used to transform directly from model to window coordinates.
   * <br /><br />
   * Do not confuse <code>czm_viewportTransformation</code> with {@link czm_viewportOrthographic}.
   * The former transforms from normalized device coordinates to window coordinates; the later transforms
   * from window coordinates to clip coordinates, and is often used to assign to <code>gl_Position</code>.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_viewportTransformation;
   *
   * // Use czm_viewportTransformation as part of the
   * // transform from model to window coordinates.
   * vec4 q = czm_modelViewProjection * positionMC;               // model to clip coordinates
   * q.xyz /= q.w;                                                // clip to normalized device coordinates (ndc)
   * q.xyz = (czm_viewportTransformation * vec4(q.xyz, 1.0)).xyz; // ndc to window coordinates
   *
   * @see UniformState#viewportTransformation
   * @see czm_viewport
   * @see czm_viewportOrthographic
   * @see czm_modelToWindowCoordinates
   * @see BillboardCollection
   */
  czm_viewportTransformation: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.viewportTransformation;
    }
  }),
  /**
   * An automatic GLSL uniform representing the depth of the scene
   * after the globe pass and then updated after the 3D Tiles pass.
   * The depth is packed into an RGBA texture.
   *
   * @example
   * // GLSL declaration
   * uniform sampler2D czm_globeDepthTexture;
   *
   * // Get the depth at the current fragment
   * vec2 coords = gl_FragCoord.xy / czm_viewport.zw;
   * float depth = czm_unpackDepth(texture(czm_globeDepthTexture, coords));
   */
  czm_globeDepthTexture: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.SAMPLER_2D,
    getValue: function(uniformState) {
      return uniformState.globeDepthTexture;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 model transformation matrix that
   * transforms model coordinates to world coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_model;
   *
   * // Example
   * vec4 worldPosition = czm_model * modelPosition;
   *
   * @see UniformState#model
   * @see czm_inverseModel
   * @see czm_modelView
   * @see czm_modelViewProjection
   */
  czm_model: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.model;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 model transformation matrix that
   * transforms world coordinates to model coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_inverseModel;
   *
   * // Example
   * vec4 modelPosition = czm_inverseModel * worldPosition;
   *
   * @see UniformState#inverseModel
   * @see czm_model
   * @see czm_inverseModelView
   */
  czm_inverseModel: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.inverseModel;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 view transformation matrix that
   * transforms world coordinates to eye coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_view;
   *
   * // Example
   * vec4 eyePosition = czm_view * worldPosition;
   *
   * @see UniformState#view
   * @see czm_viewRotation
   * @see czm_modelView
   * @see czm_viewProjection
   * @see czm_modelViewProjection
   * @see czm_inverseView
   */
  czm_view: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.view;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 view transformation matrix that
   * transforms 3D world coordinates to eye coordinates.  In 3D mode, this is identical to
   * {@link czm_view}, but in 2D and Columbus View it represents the view matrix
   * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
   * 2D and Columbus View in the same way that 3D is lit.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_view3D;
   *
   * // Example
   * vec4 eyePosition3D = czm_view3D * worldPosition3D;
   *
   * @see UniformState#view3D
   * @see czm_view
   */
  czm_view3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.view3D;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 3x3 view rotation matrix that
   * transforms vectors in world coordinates to eye coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform mat3 czm_viewRotation;
   *
   * // Example
   * vec3 eyeVector = czm_viewRotation * worldVector;
   *
   * @see UniformState#viewRotation
   * @see czm_view
   * @see czm_inverseView
   * @see czm_inverseViewRotation
   */
  czm_viewRotation: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT3,
    getValue: function(uniformState) {
      return uniformState.viewRotation;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 3x3 view rotation matrix that
   * transforms vectors in 3D world coordinates to eye coordinates.  In 3D mode, this is identical to
   * {@link czm_viewRotation}, but in 2D and Columbus View it represents the view matrix
   * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
   * 2D and Columbus View in the same way that 3D is lit.
   *
   * @example
   * // GLSL declaration
   * uniform mat3 czm_viewRotation3D;
   *
   * // Example
   * vec3 eyeVector = czm_viewRotation3D * worldVector;
   *
   * @see UniformState#viewRotation3D
   * @see czm_viewRotation
   */
  czm_viewRotation3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT3,
    getValue: function(uniformState) {
      return uniformState.viewRotation3D;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 transformation matrix that
   * transforms from eye coordinates to world coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_inverseView;
   *
   * // Example
   * vec4 worldPosition = czm_inverseView * eyePosition;
   *
   * @see UniformState#inverseView
   * @see czm_view
   * @see czm_inverseNormal
   */
  czm_inverseView: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.inverseView;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 transformation matrix that
   * transforms from 3D eye coordinates to world coordinates.  In 3D mode, this is identical to
   * {@link czm_inverseView}, but in 2D and Columbus View it represents the inverse view matrix
   * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
   * 2D and Columbus View in the same way that 3D is lit.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_inverseView3D;
   *
   * // Example
   * vec4 worldPosition = czm_inverseView3D * eyePosition;
   *
   * @see UniformState#inverseView3D
   * @see czm_inverseView
   */
  czm_inverseView3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.inverseView3D;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 3x3 rotation matrix that
   * transforms vectors from eye coordinates to world coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform mat3 czm_inverseViewRotation;
   *
   * // Example
   * vec4 worldVector = czm_inverseViewRotation * eyeVector;
   *
   * @see UniformState#inverseView
   * @see czm_view
   * @see czm_viewRotation
   * @see czm_inverseViewRotation
   */
  czm_inverseViewRotation: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT3,
    getValue: function(uniformState) {
      return uniformState.inverseViewRotation;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 3x3 rotation matrix that
   * transforms vectors from 3D eye coordinates to world coordinates.  In 3D mode, this is identical to
   * {@link czm_inverseViewRotation}, but in 2D and Columbus View it represents the inverse view matrix
   * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
   * 2D and Columbus View in the same way that 3D is lit.
   *
   * @example
   * // GLSL declaration
   * uniform mat3 czm_inverseViewRotation3D;
   *
   * // Example
   * vec4 worldVector = czm_inverseViewRotation3D * eyeVector;
   *
   * @see UniformState#inverseView3D
   * @see czm_inverseViewRotation
   */
  czm_inverseViewRotation3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT3,
    getValue: function(uniformState) {
      return uniformState.inverseViewRotation3D;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 projection transformation matrix that
   * transforms eye coordinates to clip coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_projection;
   *
   * // Example
   * gl_Position = czm_projection * eyePosition;
   *
   * @see UniformState#projection
   * @see czm_viewProjection
   * @see czm_modelViewProjection
   * @see czm_infiniteProjection
   */
  czm_projection: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.projection;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 inverse projection transformation matrix that
   * transforms from clip coordinates to eye coordinates. Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_inverseProjection;
   *
   * // Example
   * vec4 eyePosition = czm_inverseProjection * clipPosition;
   *
   * @see UniformState#inverseProjection
   * @see czm_projection
   */
  czm_inverseProjection: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.inverseProjection;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 projection transformation matrix with the far plane at infinity,
   * that transforms eye coordinates to clip coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.  An infinite far plane is used
   * in algorithms like shadow volumes and GPU ray casting with proxy geometry to ensure that triangles
   * are not clipped by the far plane.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_infiniteProjection;
   *
   * // Example
   * gl_Position = czm_infiniteProjection * eyePosition;
   *
   * @see UniformState#infiniteProjection
   * @see czm_projection
   * @see czm_modelViewInfiniteProjection
   */
  czm_infiniteProjection: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.infiniteProjection;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 model-view transformation matrix that
   * transforms model coordinates to eye coordinates.
   * <br /><br />
   * Positions should be transformed to eye coordinates using <code>czm_modelView</code> and
   * normals should be transformed using {@link czm_normal}.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_modelView;
   *
   * // Example
   * vec4 eyePosition = czm_modelView * modelPosition;
   *
   * // The above is equivalent to, but more efficient than:
   * vec4 eyePosition = czm_view * czm_model * modelPosition;
   *
   * @see UniformState#modelView
   * @see czm_model
   * @see czm_view
   * @see czm_modelViewProjection
   * @see czm_normal
   */
  czm_modelView: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.modelView;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 model-view transformation matrix that
   * transforms 3D model coordinates to eye coordinates.  In 3D mode, this is identical to
   * {@link czm_modelView}, but in 2D and Columbus View it represents the model-view matrix
   * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
   * 2D and Columbus View in the same way that 3D is lit.
   * <br /><br />
   * Positions should be transformed to eye coordinates using <code>czm_modelView3D</code> and
   * normals should be transformed using {@link czm_normal3D}.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_modelView3D;
   *
   * // Example
   * vec4 eyePosition = czm_modelView3D * modelPosition;
   *
   * // The above is equivalent to, but more efficient than:
   * vec4 eyePosition = czm_view3D * czm_model * modelPosition;
   *
   * @see UniformState#modelView3D
   * @see czm_modelView
   */
  czm_modelView3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.modelView3D;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 model-view transformation matrix that
   * transforms model coordinates, relative to the eye, to eye coordinates.  This is used
   * in conjunction with {@link czm_translateRelativeToEye}.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_modelViewRelativeToEye;
   *
   * // Example
   * attribute vec3 positionHigh;
   * attribute vec3 positionLow;
   *
   * void main()
   * {
   *   vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
   *   gl_Position = czm_projection * (czm_modelViewRelativeToEye * p);
   * }
   *
   * @see czm_modelViewProjectionRelativeToEye
   * @see czm_translateRelativeToEye
   * @see EncodedCartesian3
   */
  czm_modelViewRelativeToEye: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.modelViewRelativeToEye;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 transformation matrix that
   * transforms from eye coordinates to model coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_inverseModelView;
   *
   * // Example
   * vec4 modelPosition = czm_inverseModelView * eyePosition;
   *
   * @see UniformState#inverseModelView
   * @see czm_modelView
   */
  czm_inverseModelView: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.inverseModelView;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 transformation matrix that
   * transforms from eye coordinates to 3D model coordinates.  In 3D mode, this is identical to
   * {@link czm_inverseModelView}, but in 2D and Columbus View it represents the inverse model-view matrix
   * as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
   * 2D and Columbus View in the same way that 3D is lit.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_inverseModelView3D;
   *
   * // Example
   * vec4 modelPosition = czm_inverseModelView3D * eyePosition;
   *
   * @see UniformState#inverseModelView
   * @see czm_inverseModelView
   * @see czm_modelView3D
   */
  czm_inverseModelView3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.inverseModelView3D;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 view-projection transformation matrix that
   * transforms world coordinates to clip coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_viewProjection;
   *
   * // Example
   * vec4 gl_Position = czm_viewProjection * czm_model * modelPosition;
   *
   * // The above is equivalent to, but more efficient than:
   * gl_Position = czm_projection * czm_view * czm_model * modelPosition;
   *
   * @see UniformState#viewProjection
   * @see czm_view
   * @see czm_projection
   * @see czm_modelViewProjection
   * @see czm_inverseViewProjection
   */
  czm_viewProjection: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.viewProjection;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 view-projection transformation matrix that
   * transforms clip coordinates to world coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_inverseViewProjection;
   *
   * // Example
   * vec4 worldPosition = czm_inverseViewProjection * clipPosition;
   *
   * @see UniformState#inverseViewProjection
   * @see czm_viewProjection
   */
  czm_inverseViewProjection: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.inverseViewProjection;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 model-view-projection transformation matrix that
   * transforms model coordinates to clip coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_modelViewProjection;
   *
   * // Example
   * vec4 gl_Position = czm_modelViewProjection * modelPosition;
   *
   * // The above is equivalent to, but more efficient than:
   * gl_Position = czm_projection * czm_view * czm_model * modelPosition;
   *
   * @see UniformState#modelViewProjection
   * @see czm_model
   * @see czm_view
   * @see czm_projection
   * @see czm_modelView
   * @see czm_viewProjection
   * @see czm_modelViewInfiniteProjection
   * @see czm_inverseModelViewProjection
   */
  czm_modelViewProjection: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.modelViewProjection;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 inverse model-view-projection transformation matrix that
   * transforms clip coordinates to model coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_inverseModelViewProjection;
   *
   * // Example
   * vec4 modelPosition = czm_inverseModelViewProjection * clipPosition;
   *
   * @see UniformState#modelViewProjection
   * @see czm_modelViewProjection
   */
  czm_inverseModelViewProjection: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.inverseModelViewProjection;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 model-view-projection transformation matrix that
   * transforms model coordinates, relative to the eye, to clip coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.  This is used in
   * conjunction with {@link czm_translateRelativeToEye}.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_modelViewProjectionRelativeToEye;
   *
   * // Example
   * attribute vec3 positionHigh;
   * attribute vec3 positionLow;
   *
   * void main()
   * {
   *   vec4 p = czm_translateRelativeToEye(positionHigh, positionLow);
   *   gl_Position = czm_modelViewProjectionRelativeToEye * p;
   * }
   *
   * @see czm_modelViewRelativeToEye
   * @see czm_translateRelativeToEye
   * @see EncodedCartesian3
   */
  czm_modelViewProjectionRelativeToEye: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.modelViewProjectionRelativeToEye;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 4x4 model-view-projection transformation matrix that
   * transforms model coordinates to clip coordinates.  Clip coordinates is the
   * coordinate system for a vertex shader's <code>gl_Position</code> output.  The projection matrix places
   * the far plane at infinity.  This is useful in algorithms like shadow volumes and GPU ray casting with
   * proxy geometry to ensure that triangles are not clipped by the far plane.
   *
   * @example
   * // GLSL declaration
   * uniform mat4 czm_modelViewInfiniteProjection;
   *
   * // Example
   * vec4 gl_Position = czm_modelViewInfiniteProjection * modelPosition;
   *
   * // The above is equivalent to, but more efficient than:
   * gl_Position = czm_infiniteProjection * czm_view * czm_model * modelPosition;
   *
   * @see UniformState#modelViewInfiniteProjection
   * @see czm_model
   * @see czm_view
   * @see czm_infiniteProjection
   * @see czm_modelViewProjection
   */
  czm_modelViewInfiniteProjection: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT4,
    getValue: function(uniformState) {
      return uniformState.modelViewInfiniteProjection;
    }
  }),
  /**
   * An automatic GLSL uniform that indicates if the current camera is orthographic in 3D.
   *
   * @see UniformState#orthographicIn3D
   */
  czm_orthographicIn3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT,
    getValue: function(uniformState) {
      return uniformState.orthographicIn3D ? 1 : 0;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 3x3 normal transformation matrix that
   * transforms normal vectors in model coordinates to eye coordinates.
   * <br /><br />
   * Positions should be transformed to eye coordinates using {@link czm_modelView} and
   * normals should be transformed using <code>czm_normal</code>.
   *
   * @example
   * // GLSL declaration
   * uniform mat3 czm_normal;
   *
   * // Example
   * vec3 eyeNormal = czm_normal * normal;
   *
   * @see UniformState#normal
   * @see czm_inverseNormal
   * @see czm_modelView
   */
  czm_normal: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT3,
    getValue: function(uniformState) {
      return uniformState.normal;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 3x3 normal transformation matrix that
   * transforms normal vectors in 3D model coordinates to eye coordinates.
   * In 3D mode, this is identical to
   * {@link czm_normal}, but in 2D and Columbus View it represents the normal transformation
   * matrix as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
   * 2D and Columbus View in the same way that 3D is lit.
   * <br /><br />
   * Positions should be transformed to eye coordinates using {@link czm_modelView3D} and
   * normals should be transformed using <code>czm_normal3D</code>.
   *
   * @example
   * // GLSL declaration
   * uniform mat3 czm_normal3D;
   *
   * // Example
   * vec3 eyeNormal = czm_normal3D * normal;
   *
   * @see UniformState#normal3D
   * @see czm_normal
   */
  czm_normal3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT3,
    getValue: function(uniformState) {
      return uniformState.normal3D;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 3x3 normal transformation matrix that
   * transforms normal vectors in eye coordinates to model coordinates.  This is
   * the opposite of the transform provided by {@link czm_normal}.
   *
   * @example
   * // GLSL declaration
   * uniform mat3 czm_inverseNormal;
   *
   * // Example
   * vec3 normalMC = czm_inverseNormal * normalEC;
   *
   * @see UniformState#inverseNormal
   * @see czm_normal
   * @see czm_modelView
   * @see czm_inverseView
   */
  czm_inverseNormal: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT3,
    getValue: function(uniformState) {
      return uniformState.inverseNormal;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 3x3 normal transformation matrix that
   * transforms normal vectors in eye coordinates to 3D model coordinates.  This is
   * the opposite of the transform provided by {@link czm_normal}.
   * In 3D mode, this is identical to
   * {@link czm_inverseNormal}, but in 2D and Columbus View it represents the inverse normal transformation
   * matrix as if the camera were at an equivalent location in 3D mode.  This is useful for lighting
   * 2D and Columbus View in the same way that 3D is lit.
   *
   * @example
   * // GLSL declaration
   * uniform mat3 czm_inverseNormal3D;
   *
   * // Example
   * vec3 normalMC = czm_inverseNormal3D * normalEC;
   *
   * @see UniformState#inverseNormal3D
   * @see czm_inverseNormal
   */
  czm_inverseNormal3D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT3,
    getValue: function(uniformState) {
      return uniformState.inverseNormal3D;
    }
  }),
  /**
   * An automatic GLSL uniform containing the height in meters of the
   * eye (camera) above or below the ellipsoid.
   *
   * @see UniformState#eyeHeight
   */
  czm_eyeHeight: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT,
    getValue: function(uniformState) {
      return uniformState.eyeHeight;
    }
  }),
  /**
   * An automatic GLSL uniform containing height (<code>x</code>) and height squared (<code>y</code>)
   * in meters of the eye (camera) above the 2D world plane. This uniform is only valid
   * when the {@link SceneMode} is <code>SCENE2D</code>.
   *
   * @see UniformState#eyeHeight2D
   */
  czm_eyeHeight2D: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC2,
    getValue: function(uniformState) {
      return uniformState.eyeHeight2D;
    }
  }),
  /**
   * An automatic GLSL uniform containing the near distance (<code>x</code>) and the far distance (<code>y</code>)
   * of the frustum defined by the camera.  This is the largest possible frustum, not an individual
   * frustum used for multi-frustum rendering.
   *
   * @example
   * // GLSL declaration
   * uniform vec2 czm_entireFrustum;
   *
   * // Example
   * float frustumLength = czm_entireFrustum.y - czm_entireFrustum.x;
   *
   * @see UniformState#entireFrustum
   * @see czm_currentFrustum
   */
  czm_entireFrustum: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC2,
    getValue: function(uniformState) {
      return uniformState.entireFrustum;
    }
  }),
  /**
   * An automatic GLSL uniform containing the near distance (<code>x</code>) and the far distance (<code>y</code>)
   * of the frustum defined by the camera.  This is the individual
   * frustum used for multi-frustum rendering.
   *
   * @example
   * // GLSL declaration
   * uniform vec2 czm_currentFrustum;
   *
   * // Example
   * float frustumLength = czm_currentFrustum.y - czm_currentFrustum.x;
   *
   * @see UniformState#currentFrustum
   * @see czm_entireFrustum
   */
  czm_currentFrustum: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC2,
    getValue: function(uniformState) {
      return uniformState.currentFrustum;
    }
  }),
  /**
   * The distances to the frustum planes. The top, bottom, left and right distances are
   * the x, y, z, and w components, respectively.
   */
  czm_frustumPlanes: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC4,
    getValue: function(uniformState) {
      return uniformState.frustumPlanes;
    }
  }),
  /**
   * Gets the far plane's distance from the near plane, plus 1.0.
   */
  czm_farDepthFromNearPlusOne: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT,
    getValue: function(uniformState) {
      return uniformState.farDepthFromNearPlusOne;
    }
  }),
  /**
   * Gets the log2 of {@link AutomaticUniforms#czm_farDepthFromNearPlusOne}.
   */
  czm_log2FarDepthFromNearPlusOne: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT,
    getValue: function(uniformState) {
      return uniformState.log2FarDepthFromNearPlusOne;
    }
  }),
  /**
   * Gets 1.0 divided by {@link AutomaticUniforms#czm_log2FarDepthFromNearPlusOne}.
   */
  czm_oneOverLog2FarDepthFromNearPlusOne: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT,
    getValue: function(uniformState) {
      return uniformState.oneOverLog2FarDepthFromNearPlusOne;
    }
  }),
  /**
   * An automatic GLSL uniform representing the sun position in world coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_sunPositionWC;
   *
   * @see UniformState#sunPositionWC
   * @see czm_sunPositionColumbusView
   * @see czm_sunDirectionWC
   */
  czm_sunPositionWC: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC3,
    getValue: function(uniformState) {
      return uniformState.sunPositionWC;
    }
  }),
  /**
   * An automatic GLSL uniform representing the sun position in Columbus view world coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_sunPositionColumbusView;
   *
   * @see UniformState#sunPositionColumbusView
   * @see czm_sunPositionWC
   */
  czm_sunPositionColumbusView: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC3,
    getValue: function(uniformState) {
      return uniformState.sunPositionColumbusView;
    }
  }),
  /**
   * An automatic GLSL uniform representing the normalized direction to the sun in eye coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_sunDirectionEC;
   *
   * // Example
   * float diffuse = max(dot(czm_sunDirectionEC, normalEC), 0.0);
   *
   * @see UniformState#sunDirectionEC
   * @see czm_moonDirectionEC
   * @see czm_sunDirectionWC
   */
  czm_sunDirectionEC: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC3,
    getValue: function(uniformState) {
      return uniformState.sunDirectionEC;
    }
  }),
  /**
   * An automatic GLSL uniform representing the normalized direction to the sun in world coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_sunDirectionWC;
   *
   * // Example
   * float diffuse = max(dot(czm_sunDirectionWC, normalWC), 0.0);
   *
   * @see UniformState#sunDirectionWC
   * @see czm_sunPositionWC
   * @see czm_sunDirectionEC
   */
  czm_sunDirectionWC: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC3,
    getValue: function(uniformState) {
      return uniformState.sunDirectionWC;
    }
  }),
  /**
   * An automatic GLSL uniform representing the normalized direction to the moon in eye coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_moonDirectionEC;
   *
   * // Example
   * float diffuse = max(dot(czm_moonDirectionEC, normalEC), 0.0);
   *
   * @see UniformState#moonDirectionEC
   * @see czm_sunDirectionEC
   */
  czm_moonDirectionEC: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC3,
    getValue: function(uniformState) {
      return uniformState.moonDirectionEC;
    }
  }),
  /**
   * An automatic GLSL uniform representing the normalized direction to the scene's light source in eye coordinates.
   * This is commonly used for directional lighting computations.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_lightDirectionEC;
   *
   * // Example
   * float diffuse = max(dot(czm_lightDirectionEC, normalEC), 0.0);
   *
   * @see UniformState#lightDirectionEC
   * @see czm_lightDirectionWC
   */
  czm_lightDirectionEC: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC3,
    getValue: function(uniformState) {
      return uniformState.lightDirectionEC;
    }
  }),
  /**
   * An automatic GLSL uniform representing the normalized direction to the scene's light source in world coordinates.
   * This is commonly used for directional lighting computations.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_lightDirectionWC;
   *
   * // Example
   * float diffuse = max(dot(czm_lightDirectionWC, normalWC), 0.0);
   *
   * @see UniformState#lightDirectionWC
   * @see czm_lightDirectionEC
   */
  czm_lightDirectionWC: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC3,
    getValue: function(uniformState) {
      return uniformState.lightDirectionWC;
    }
  }),
  /**
   * An automatic GLSL uniform that represents the color of light emitted by the scene's light source. This
   * is equivalent to the light color multiplied by the light intensity limited to a maximum luminance of 1.0
   * suitable for non-HDR lighting.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_lightColor;
   *
   * // Example
   * vec3 diffuseColor = czm_lightColor * max(dot(czm_lightDirectionWC, normalWC), 0.0);
   *
   * @see UniformState#lightColor
   * @see czm_lightColorHdr
   */
  czm_lightColor: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC3,
    getValue: function(uniformState) {
      return uniformState.lightColor;
    }
  }),
  /**
   * An automatic GLSL uniform that represents the high dynamic range color of light emitted by the scene's light
   * source. This is equivalent to the light color multiplied by the light intensity suitable for HDR lighting.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_lightColorHdr;
   *
   * // Example
   * vec3 diffuseColor = czm_lightColorHdr * max(dot(czm_lightDirectionWC, normalWC), 0.0);
   *
   * @see UniformState#lightColorHdr
   * @see czm_lightColor
   */
  czm_lightColorHdr: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC3,
    getValue: function(uniformState) {
      return uniformState.lightColorHdr;
    }
  }),
  /**
   * An automatic GLSL uniform representing the high bits of the camera position in model
   * coordinates.  This is used for GPU RTE to eliminate jittering artifacts when rendering
   * as described in {@link http://help.agi.com/AGIComponents/html/BlogPrecisionsPrecisions.htm|Precisions, Precisions}.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_encodedCameraPositionMCHigh;
   *
   * @see czm_encodedCameraPositionMCLow
   * @see czm_modelViewRelativeToEye
   * @see czm_modelViewProjectionRelativeToEye
   */
  czm_encodedCameraPositionMCHigh: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC3,
    getValue: function(uniformState) {
      return uniformState.encodedCameraPositionMCHigh;
    }
  }),
  /**
   * An automatic GLSL uniform representing the low bits of the camera position in model
   * coordinates.  This is used for GPU RTE to eliminate jittering artifacts when rendering
   * as described in {@linkhttp://help.agi.com/AGIComponents/html/BlogPrecisionsPrecisions.htm|Precisions, Precisions}.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_encodedCameraPositionMCLow;
   *
   * @see czm_encodedCameraPositionMCHigh
   * @see czm_modelViewRelativeToEye
   * @see czm_modelViewProjectionRelativeToEye
   */
  czm_encodedCameraPositionMCLow: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC3,
    getValue: function(uniformState) {
      return uniformState.encodedCameraPositionMCLow;
    }
  }),
  /**
   * An automatic GLSL uniform representing the position of the viewer (camera) in world coordinates.
   *
   * @example
   * // GLSL declaration
   * uniform vec3 czm_viewerPositionWC;
   */
  czm_viewerPositionWC: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC3,
    getValue: function(uniformState) {
      return Matrix4_default.getTranslation(
        uniformState.inverseView,
        viewerPositionWCScratch
      );
    }
  }),
  /**
   * An automatic GLSL uniform representing the frame number. This uniform is automatically incremented
   * every frame.
   *
   * @example
   * // GLSL declaration
   * uniform float czm_frameNumber;
   */
  czm_frameNumber: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT,
    getValue: function(uniformState) {
      return uniformState.frameState.frameNumber;
    }
  }),
  /**
   * An automatic GLSL uniform representing the current morph transition time between
   * 2D/Columbus View and 3D, with 0.0 being 2D or Columbus View and 1.0 being 3D.
   *
   * @example
   * // GLSL declaration
   * uniform float czm_morphTime;
   *
   * // Example
   * vec4 p = czm_columbusViewMorph(position2D, position3D, czm_morphTime);
   */
  czm_morphTime: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT,
    getValue: function(uniformState) {
      return uniformState.frameState.morphTime;
    }
  }),
  /**
   * An automatic GLSL uniform representing the current {@link SceneMode}, expressed
   * as a float.
   *
   * @example
   * // GLSL declaration
   * uniform float czm_sceneMode;
   *
   * // Example
   * if (czm_sceneMode == czm_sceneMode2D)
   * {
   *     eyeHeightSq = czm_eyeHeight2D.y;
   * }
   *
   * @see czm_sceneMode2D
   * @see czm_sceneModeColumbusView
   * @see czm_sceneMode3D
   * @see czm_sceneModeMorphing
   */
  czm_sceneMode: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT,
    getValue: function(uniformState) {
      return uniformState.frameState.mode;
    }
  }),
  /**
   * An automatic GLSL uniform representing the current rendering pass.
   *
   * @example
   * // GLSL declaration
   * uniform float czm_pass;
   *
   * // Example
   * if ((czm_pass == czm_passTranslucent) && isOpaque())
   * {
   *     gl_Position *= 0.0; // Cull opaque geometry in the translucent pass
   * }
   */
  czm_pass: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT,
    getValue: function(uniformState) {
      return uniformState.pass;
    }
  }),
  /**
   * An automatic GLSL uniform representing the current scene background color.
   *
   * @example
   * // GLSL declaration
   * uniform vec4 czm_backgroundColor;
   *
   * // Example: If the given color's RGB matches the background color, invert it.
   * vec4 adjustColorForContrast(vec4 color)
   * {
   *     if (czm_backgroundColor.rgb == color.rgb)
   *     {
   *         color.rgb = vec3(1.0) - color.rgb;
   *     }
   *
   *     return color;
   * }
   */
  czm_backgroundColor: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC4,
    getValue: function(uniformState) {
      return uniformState.backgroundColor;
    }
  }),
  /**
   * An automatic GLSL uniform containing the BRDF look up texture used for image-based lighting computations.
   *
   * @example
   * // GLSL declaration
   * uniform sampler2D czm_brdfLut;
   *
   * // Example: For a given roughness and NdotV value, find the material's BRDF information in the red and green channels
   * float roughness = 0.5;
   * float NdotV = dot(normal, view);
   * vec2 brdfLut = texture(czm_brdfLut, vec2(NdotV, 1.0 - roughness)).rg;
   */
  czm_brdfLut: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.SAMPLER_2D,
    getValue: function(uniformState) {
      return uniformState.brdfLut;
    }
  }),
  /**
   * An automatic GLSL uniform containing the environment map used within the scene.
   *
   * @example
   * // GLSL declaration
   * uniform samplerCube czm_environmentMap;
   *
   * // Example: Create a perfect reflection of the environment map on a  model
   * float reflected = reflect(view, normal);
   * vec4 reflectedColor = texture(czm_environmentMap, reflected);
   */
  czm_environmentMap: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.SAMPLER_CUBE,
    getValue: function(uniformState) {
      return uniformState.environmentMap;
    }
  }),
  /**
   * An automatic GLSL uniform containing the specular environment map atlas used within the scene.
   *
   * @example
   * // GLSL declaration
   * uniform sampler2D czm_specularEnvironmentMaps;
   */
  czm_specularEnvironmentMaps: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.SAMPLER_2D,
    getValue: function(uniformState) {
      return uniformState.specularEnvironmentMaps;
    }
  }),
  /**
   * An automatic GLSL uniform containing the size of the specular environment map atlas used within the scene.
   *
   * @example
   * // GLSL declaration
   * uniform vec2 czm_specularEnvironmentMapSize;
   */
  czm_specularEnvironmentMapSize: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC2,
    getValue: function(uniformState) {
      return uniformState.specularEnvironmentMapsDimensions;
    }
  }),
  /**
   * An automatic GLSL uniform containing the maximum level-of-detail of the specular environment map atlas used within the scene.
   *
   * @example
   * // GLSL declaration
   * uniform float czm_specularEnvironmentMapsMaximumLOD;
   */
  czm_specularEnvironmentMapsMaximumLOD: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT,
    getValue: function(uniformState) {
      return uniformState.specularEnvironmentMapsMaximumLOD;
    }
  }),
  /**
   * An automatic GLSL uniform containing the spherical harmonic coefficients used within the scene.
   *
   * @example
   * // GLSL declaration
   * uniform vec3[9] czm_sphericalHarmonicCoefficients;
   */
  czm_sphericalHarmonicCoefficients: new AutomaticUniform({
    size: 9,
    datatype: WebGLConstants_default.FLOAT_VEC3,
    getValue: function(uniformState) {
      return uniformState.sphericalHarmonicCoefficients;
    }
  }),
  /**
   * An automatic GLSL uniform representing a 3x3 rotation matrix that transforms
   * from True Equator Mean Equinox (TEME) axes to the pseudo-fixed axes at the current scene time.
   *
   * @example
   * // GLSL declaration
   * uniform mat3 czm_temeToPseudoFixed;
   *
   * // Example
   * vec3 pseudoFixed = czm_temeToPseudoFixed * teme;
   *
   * @see UniformState#temeToPseudoFixedMatrix
   * @see Transforms.computeTemeToPseudoFixedMatrix
   */
  czm_temeToPseudoFixed: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_MAT3,
    getValue: function(uniformState) {
      return uniformState.temeToPseudoFixedMatrix;
    }
  }),
  /**
   * An automatic GLSL uniform representing the ratio of canvas coordinate space to canvas pixel space.
   *
   * @example
   * uniform float czm_pixelRatio;
   */
  czm_pixelRatio: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT,
    getValue: function(uniformState) {
      return uniformState.pixelRatio;
    }
  }),
  /**
   * An automatic GLSL uniform scalar used to mix a color with the fog color based on the distance to the camera.
   *
   * @see czm_fog
   */
  czm_fogDensity: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT,
    getValue: function(uniformState) {
      return uniformState.fogDensity;
    }
  }),
  /**
   * An automatic GLSL uniform representing the splitter position to use when rendering with a splitter.
   * This will be in pixel coordinates relative to the canvas.
   *
   * @example
   * // GLSL declaration
   * uniform float czm_splitPosition;
   */
  czm_splitPosition: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT,
    getValue: function(uniformState) {
      return uniformState.splitPosition;
    }
  }),
  /**
   * An automatic GLSL uniform scalar representing the geometric tolerance per meter
   */
  czm_geometricToleranceOverMeter: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT,
    getValue: function(uniformState) {
      return uniformState.geometricToleranceOverMeter;
    }
  }),
  /**
   * An automatic GLSL uniform representing the distance from the camera at which to disable the depth test of billboards, labels and points
   * to, for example, prevent clipping against terrain. When set to zero, the depth test should always be applied. When less than zero,
   * the depth test should never be applied.
   */
  czm_minimumDisableDepthTestDistance: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT,
    getValue: function(uniformState) {
      return uniformState.minimumDisableDepthTestDistance;
    }
  }),
  /**
   * An automatic GLSL uniform that will be the highlight color of unclassified 3D Tiles.
   */
  czm_invertClassificationColor: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC4,
    getValue: function(uniformState) {
      return uniformState.invertClassificationColor;
    }
  }),
  /**
   * An automatic GLSL uniform that is used for gamma correction.
   */
  czm_gamma: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT,
    getValue: function(uniformState) {
      return uniformState.gamma;
    }
  }),
  /**
   * An automatic GLSL uniform that stores the ellipsoid radii.
   */
  czm_ellipsoidRadii: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC3,
    getValue: function(uniformState) {
      return uniformState.ellipsoid.radii;
    }
  }),
  /**
   * An automatic GLSL uniform that stores the ellipsoid inverse radii.
   */
  czm_ellipsoidInverseRadii: new AutomaticUniform({
    size: 1,
    datatype: WebGLConstants_default.FLOAT_VEC3,
    getValue: function(uniformState) {
      return uniformState.ellipsoid.oneOverRadii;
    }
  })
};
var AutomaticUniforms_default = AutomaticUniforms;

// packages/engine/Source/Core/createGuid.js
function createGuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v2 = c === "x" ? r : r & 3 | 8;
    return v2.toString(16);
  });
}
var createGuid_default = createGuid;

// packages/engine/Source/Core/destroyObject.js
function returnTrue() {
  return true;
}
function destroyObject(object, message) {
  message = defaultValue_default(
    message,
    "This object was destroyed, i.e., destroy() was called."
  );
  function throwOnDestroyed() {
    throw new DeveloperError_default(message);
  }
  for (const key in object) {
    if (typeof object[key] === "function") {
      object[key] = throwOnDestroyed;
    }
  }
  object.isDestroyed = returnTrue;
  return void 0;
}
var destroyObject_default = destroyObject;

// packages/engine/Source/Core/IndexDatatype.js
var IndexDatatype = {
  /**
   * 8-bit unsigned byte corresponding to <code>UNSIGNED_BYTE</code> and the type
   * of an element in <code>Uint8Array</code>.
   *
   * @type {number}
   * @constant
   */
  UNSIGNED_BYTE: WebGLConstants_default.UNSIGNED_BYTE,
  /**
   * 16-bit unsigned short corresponding to <code>UNSIGNED_SHORT</code> and the type
   * of an element in <code>Uint16Array</code>.
   *
   * @type {number}
   * @constant
   */
  UNSIGNED_SHORT: WebGLConstants_default.UNSIGNED_SHORT,
  /**
   * 32-bit unsigned int corresponding to <code>UNSIGNED_INT</code> and the type
   * of an element in <code>Uint32Array</code>.
   *
   * @type {number}
   * @constant
   */
  UNSIGNED_INT: WebGLConstants_default.UNSIGNED_INT
};
IndexDatatype.getSizeInBytes = function(indexDatatype) {
  switch (indexDatatype) {
    case IndexDatatype.UNSIGNED_BYTE:
      return Uint8Array.BYTES_PER_ELEMENT;
    case IndexDatatype.UNSIGNED_SHORT:
      return Uint16Array.BYTES_PER_ELEMENT;
    case IndexDatatype.UNSIGNED_INT:
      return Uint32Array.BYTES_PER_ELEMENT;
  }
  throw new DeveloperError_default(
    "indexDatatype is required and must be a valid IndexDatatype constant."
  );
};
IndexDatatype.fromSizeInBytes = function(sizeInBytes) {
  switch (sizeInBytes) {
    case 2:
      return IndexDatatype.UNSIGNED_SHORT;
    case 4:
      return IndexDatatype.UNSIGNED_INT;
    case 1:
      return IndexDatatype.UNSIGNED_BYTE;
    default:
      throw new DeveloperError_default(
        "Size in bytes cannot be mapped to an IndexDatatype"
      );
  }
};
IndexDatatype.validate = function(indexDatatype) {
  return defined_default(indexDatatype) && (indexDatatype === IndexDatatype.UNSIGNED_BYTE || indexDatatype === IndexDatatype.UNSIGNED_SHORT || indexDatatype === IndexDatatype.UNSIGNED_INT);
};
IndexDatatype.createTypedArray = function(numberOfVertices, indicesLengthOrArray) {
  if (!defined_default(numberOfVertices)) {
    throw new DeveloperError_default("numberOfVertices is required.");
  }
  if (numberOfVertices >= Math_default.SIXTY_FOUR_KILOBYTES) {
    return new Uint32Array(indicesLengthOrArray);
  }
  return new Uint16Array(indicesLengthOrArray);
};
IndexDatatype.createTypedArrayFromArrayBuffer = function(numberOfVertices, sourceArray, byteOffset, length) {
  if (!defined_default(numberOfVertices)) {
    throw new DeveloperError_default("numberOfVertices is required.");
  }
  if (!defined_default(sourceArray)) {
    throw new DeveloperError_default("sourceArray is required.");
  }
  if (!defined_default(byteOffset)) {
    throw new DeveloperError_default("byteOffset is required.");
  }
  if (numberOfVertices >= Math_default.SIXTY_FOUR_KILOBYTES) {
    return new Uint32Array(sourceArray, byteOffset, length);
  }
  return new Uint16Array(sourceArray, byteOffset, length);
};
IndexDatatype.fromTypedArray = function(array) {
  if (array instanceof Uint8Array) {
    return IndexDatatype.UNSIGNED_BYTE;
  }
  if (array instanceof Uint16Array) {
    return IndexDatatype.UNSIGNED_SHORT;
  }
  if (array instanceof Uint32Array) {
    return IndexDatatype.UNSIGNED_INT;
  }
  throw new DeveloperError_default(
    "array must be a Uint8Array, Uint16Array, or Uint32Array."
  );
};
var IndexDatatype_default = Object.freeze(IndexDatatype);

// packages/engine/Source/Renderer/BufferUsage.js
var BufferUsage = {
  STREAM_DRAW: WebGLConstants_default.STREAM_DRAW,
  STATIC_DRAW: WebGLConstants_default.STATIC_DRAW,
  DYNAMIC_DRAW: WebGLConstants_default.DYNAMIC_DRAW,
  validate: function(bufferUsage) {
    return bufferUsage === BufferUsage.STREAM_DRAW || bufferUsage === BufferUsage.STATIC_DRAW || bufferUsage === BufferUsage.DYNAMIC_DRAW;
  }
};
var BufferUsage_default = Object.freeze(BufferUsage);

// packages/engine/Source/Renderer/Buffer.js
function Buffer2(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  Check_default.defined("options.context", options.context);
  if (!defined_default(options.typedArray) && !defined_default(options.sizeInBytes)) {
    throw new DeveloperError_default(
      "Either options.sizeInBytes or options.typedArray is required."
    );
  }
  if (defined_default(options.typedArray) && defined_default(options.sizeInBytes)) {
    throw new DeveloperError_default(
      "Cannot pass in both options.sizeInBytes and options.typedArray."
    );
  }
  if (defined_default(options.typedArray)) {
    Check_default.typeOf.object("options.typedArray", options.typedArray);
    Check_default.typeOf.number(
      "options.typedArray.byteLength",
      options.typedArray.byteLength
    );
  }
  if (!BufferUsage_default.validate(options.usage)) {
    throw new DeveloperError_default("usage is invalid.");
  }
  const gl = options.context._gl;
  const bufferTarget = options.bufferTarget;
  const typedArray = options.typedArray;
  let sizeInBytes = options.sizeInBytes;
  const usage = options.usage;
  const hasArray = defined_default(typedArray);
  if (hasArray) {
    sizeInBytes = typedArray.byteLength;
  }
  Check_default.typeOf.number.greaterThan("sizeInBytes", sizeInBytes, 0);
  const buffer = gl.createBuffer();
  gl.bindBuffer(bufferTarget, buffer);
  gl.bufferData(bufferTarget, hasArray ? typedArray : sizeInBytes, usage);
  gl.bindBuffer(bufferTarget, null);
  this._id = createGuid_default();
  this._gl = gl;
  this._webgl2 = options.context._webgl2;
  this._bufferTarget = bufferTarget;
  this._sizeInBytes = sizeInBytes;
  this._usage = usage;
  this._buffer = buffer;
  this.vertexArrayDestroyable = true;
}
Buffer2.createVertexBuffer = function(options) {
  Check_default.defined("options.context", options.context);
  return new Buffer2({
    context: options.context,
    bufferTarget: WebGLConstants_default.ARRAY_BUFFER,
    typedArray: options.typedArray,
    sizeInBytes: options.sizeInBytes,
    usage: options.usage
  });
};
Buffer2.createIndexBuffer = function(options) {
  Check_default.defined("options.context", options.context);
  if (!IndexDatatype_default.validate(options.indexDatatype)) {
    throw new DeveloperError_default("Invalid indexDatatype.");
  }
  if (options.indexDatatype === IndexDatatype_default.UNSIGNED_INT && !options.context.elementIndexUint) {
    throw new DeveloperError_default(
      "IndexDatatype.UNSIGNED_INT requires OES_element_index_uint, which is not supported on this system.  Check context.elementIndexUint."
    );
  }
  const context = options.context;
  const indexDatatype = options.indexDatatype;
  const bytesPerIndex = IndexDatatype_default.getSizeInBytes(indexDatatype);
  const buffer = new Buffer2({
    context,
    bufferTarget: WebGLConstants_default.ELEMENT_ARRAY_BUFFER,
    typedArray: options.typedArray,
    sizeInBytes: options.sizeInBytes,
    usage: options.usage
  });
  const numberOfIndices = buffer.sizeInBytes / bytesPerIndex;
  Object.defineProperties(buffer, {
    indexDatatype: {
      get: function() {
        return indexDatatype;
      }
    },
    bytesPerIndex: {
      get: function() {
        return bytesPerIndex;
      }
    },
    numberOfIndices: {
      get: function() {
        return numberOfIndices;
      }
    }
  });
  return buffer;
};
Object.defineProperties(Buffer2.prototype, {
  sizeInBytes: {
    get: function() {
      return this._sizeInBytes;
    }
  },
  usage: {
    get: function() {
      return this._usage;
    }
  }
});
Buffer2.prototype._getBuffer = function() {
  return this._buffer;
};
Buffer2.prototype.copyFromArrayView = function(arrayView, offsetInBytes) {
  offsetInBytes = defaultValue_default(offsetInBytes, 0);
  Check_default.defined("arrayView", arrayView);
  Check_default.typeOf.number.lessThanOrEquals(
    "offsetInBytes + arrayView.byteLength",
    offsetInBytes + arrayView.byteLength,
    this._sizeInBytes
  );
  const gl = this._gl;
  const target = this._bufferTarget;
  gl.bindBuffer(target, this._buffer);
  gl.bufferSubData(target, offsetInBytes, arrayView);
  gl.bindBuffer(target, null);
};
Buffer2.prototype.copyFromBuffer = function(readBuffer, readOffset, writeOffset, sizeInBytes) {
  if (!this._webgl2) {
    throw new DeveloperError_default("A WebGL 2 context is required.");
  }
  if (!defined_default(readBuffer)) {
    throw new DeveloperError_default("readBuffer must be defined.");
  }
  if (!defined_default(sizeInBytes) || sizeInBytes <= 0) {
    throw new DeveloperError_default(
      "sizeInBytes must be defined and be greater than zero."
    );
  }
  if (!defined_default(readOffset) || readOffset < 0 || readOffset + sizeInBytes > readBuffer._sizeInBytes) {
    throw new DeveloperError_default(
      "readOffset must be greater than or equal to zero and readOffset + sizeInBytes must be less than of equal to readBuffer.sizeInBytes."
    );
  }
  if (!defined_default(writeOffset) || writeOffset < 0 || writeOffset + sizeInBytes > this._sizeInBytes) {
    throw new DeveloperError_default(
      "writeOffset must be greater than or equal to zero and writeOffset + sizeInBytes must be less than of equal to this.sizeInBytes."
    );
  }
  if (this._buffer === readBuffer._buffer && (writeOffset >= readOffset && writeOffset < readOffset + sizeInBytes || readOffset > writeOffset && readOffset < writeOffset + sizeInBytes)) {
    throw new DeveloperError_default(
      "When readBuffer is equal to this, the ranges [readOffset + sizeInBytes) and [writeOffset, writeOffset + sizeInBytes) must not overlap."
    );
  }
  if (this._bufferTarget === WebGLConstants_default.ELEMENT_ARRAY_BUFFER && readBuffer._bufferTarget !== WebGLConstants_default.ELEMENT_ARRAY_BUFFER || this._bufferTarget !== WebGLConstants_default.ELEMENT_ARRAY_BUFFER && readBuffer._bufferTarget === WebGLConstants_default.ELEMENT_ARRAY_BUFFER) {
    throw new DeveloperError_default(
      "Can not copy an index buffer into another buffer type."
    );
  }
  const readTarget = WebGLConstants_default.COPY_READ_BUFFER;
  const writeTarget = WebGLConstants_default.COPY_WRITE_BUFFER;
  const gl = this._gl;
  gl.bindBuffer(writeTarget, this._buffer);
  gl.bindBuffer(readTarget, readBuffer._buffer);
  gl.copyBufferSubData(
    readTarget,
    writeTarget,
    readOffset,
    writeOffset,
    sizeInBytes
  );
  gl.bindBuffer(writeTarget, null);
  gl.bindBuffer(readTarget, null);
};
Buffer2.prototype.getBufferData = function(arrayView, sourceOffset, destinationOffset, length) {
  sourceOffset = defaultValue_default(sourceOffset, 0);
  destinationOffset = defaultValue_default(destinationOffset, 0);
  if (!this._webgl2) {
    throw new DeveloperError_default("A WebGL 2 context is required.");
  }
  if (!defined_default(arrayView)) {
    throw new DeveloperError_default("arrayView is required.");
  }
  let copyLength;
  let elementSize;
  let arrayLength = arrayView.byteLength;
  if (!defined_default(length)) {
    if (defined_default(arrayLength)) {
      copyLength = arrayLength - destinationOffset;
      elementSize = 1;
    } else {
      arrayLength = arrayView.length;
      copyLength = arrayLength - destinationOffset;
      elementSize = arrayView.BYTES_PER_ELEMENT;
    }
  } else {
    copyLength = length;
    if (defined_default(arrayLength)) {
      elementSize = 1;
    } else {
      arrayLength = arrayView.length;
      elementSize = arrayView.BYTES_PER_ELEMENT;
    }
  }
  if (destinationOffset < 0 || destinationOffset > arrayLength) {
    throw new DeveloperError_default(
      "destinationOffset must be greater than zero and less than the arrayView length."
    );
  }
  if (destinationOffset + copyLength > arrayLength) {
    throw new DeveloperError_default(
      "destinationOffset + length must be less than or equal to the arrayViewLength."
    );
  }
  if (sourceOffset < 0 || sourceOffset > this._sizeInBytes) {
    throw new DeveloperError_default(
      "sourceOffset must be greater than zero and less than the buffers size."
    );
  }
  if (sourceOffset + copyLength * elementSize > this._sizeInBytes) {
    throw new DeveloperError_default(
      "sourceOffset + length must be less than the buffers size."
    );
  }
  const gl = this._gl;
  const target = WebGLConstants_default.COPY_READ_BUFFER;
  gl.bindBuffer(target, this._buffer);
  gl.getBufferSubData(
    target,
    sourceOffset,
    arrayView,
    destinationOffset,
    length
  );
  gl.bindBuffer(target, null);
};
Buffer2.prototype.isDestroyed = function() {
  return false;
};
Buffer2.prototype.destroy = function() {
  this._gl.deleteBuffer(this._buffer);
  return destroyObject_default(this);
};
var Buffer_default = Buffer2;

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

// packages/engine/Source/Core/Color.js
function hue2rgb(m1, m2, h) {
  if (h < 0) {
    h += 1;
  }
  if (h > 1) {
    h -= 1;
  }
  if (h * 6 < 1) {
    return m1 + (m2 - m1) * 6 * h;
  }
  if (h * 2 < 1) {
    return m2;
  }
  if (h * 3 < 2) {
    return m1 + (m2 - m1) * (2 / 3 - h) * 6;
  }
  return m1;
}
function Color(red, green, blue, alpha) {
  this.red = defaultValue_default(red, 1);
  this.green = defaultValue_default(green, 1);
  this.blue = defaultValue_default(blue, 1);
  this.alpha = defaultValue_default(alpha, 1);
}
Color.fromCartesian4 = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  if (!defined_default(result)) {
    return new Color(cartesian.x, cartesian.y, cartesian.z, cartesian.w);
  }
  result.red = cartesian.x;
  result.green = cartesian.y;
  result.blue = cartesian.z;
  result.alpha = cartesian.w;
  return result;
};
Color.fromBytes = function(red, green, blue, alpha, result) {
  red = Color.byteToFloat(defaultValue_default(red, 255));
  green = Color.byteToFloat(defaultValue_default(green, 255));
  blue = Color.byteToFloat(defaultValue_default(blue, 255));
  alpha = Color.byteToFloat(defaultValue_default(alpha, 255));
  if (!defined_default(result)) {
    return new Color(red, green, blue, alpha);
  }
  result.red = red;
  result.green = green;
  result.blue = blue;
  result.alpha = alpha;
  return result;
};
Color.fromAlpha = function(color, alpha, result) {
  Check_default.typeOf.object("color", color);
  Check_default.typeOf.number("alpha", alpha);
  if (!defined_default(result)) {
    return new Color(color.red, color.green, color.blue, alpha);
  }
  result.red = color.red;
  result.green = color.green;
  result.blue = color.blue;
  result.alpha = alpha;
  return result;
};
var scratchArrayBuffer;
var scratchUint32Array;
var scratchUint8Array;
if (FeatureDetection_default.supportsTypedArrays()) {
  scratchArrayBuffer = new ArrayBuffer(4);
  scratchUint32Array = new Uint32Array(scratchArrayBuffer);
  scratchUint8Array = new Uint8Array(scratchArrayBuffer);
}
Color.fromRgba = function(rgba, result) {
  scratchUint32Array[0] = rgba;
  return Color.fromBytes(
    scratchUint8Array[0],
    scratchUint8Array[1],
    scratchUint8Array[2],
    scratchUint8Array[3],
    result
  );
};
Color.fromHsl = function(hue, saturation, lightness, alpha, result) {
  hue = defaultValue_default(hue, 0) % 1;
  saturation = defaultValue_default(saturation, 0);
  lightness = defaultValue_default(lightness, 0);
  alpha = defaultValue_default(alpha, 1);
  let red = lightness;
  let green = lightness;
  let blue = lightness;
  if (saturation !== 0) {
    let m2;
    if (lightness < 0.5) {
      m2 = lightness * (1 + saturation);
    } else {
      m2 = lightness + saturation - lightness * saturation;
    }
    const m1 = 2 * lightness - m2;
    red = hue2rgb(m1, m2, hue + 1 / 3);
    green = hue2rgb(m1, m2, hue);
    blue = hue2rgb(m1, m2, hue - 1 / 3);
  }
  if (!defined_default(result)) {
    return new Color(red, green, blue, alpha);
  }
  result.red = red;
  result.green = green;
  result.blue = blue;
  result.alpha = alpha;
  return result;
};
Color.fromRandom = function(options, result) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  let red = options.red;
  if (!defined_default(red)) {
    const minimumRed = defaultValue_default(options.minimumRed, 0);
    const maximumRed = defaultValue_default(options.maximumRed, 1);
    Check_default.typeOf.number.lessThanOrEquals("minimumRed", minimumRed, maximumRed);
    red = minimumRed + Math_default.nextRandomNumber() * (maximumRed - minimumRed);
  }
  let green = options.green;
  if (!defined_default(green)) {
    const minimumGreen = defaultValue_default(options.minimumGreen, 0);
    const maximumGreen = defaultValue_default(options.maximumGreen, 1);
    Check_default.typeOf.number.lessThanOrEquals(
      "minimumGreen",
      minimumGreen,
      maximumGreen
    );
    green = minimumGreen + Math_default.nextRandomNumber() * (maximumGreen - minimumGreen);
  }
  let blue = options.blue;
  if (!defined_default(blue)) {
    const minimumBlue = defaultValue_default(options.minimumBlue, 0);
    const maximumBlue = defaultValue_default(options.maximumBlue, 1);
    Check_default.typeOf.number.lessThanOrEquals(
      "minimumBlue",
      minimumBlue,
      maximumBlue
    );
    blue = minimumBlue + Math_default.nextRandomNumber() * (maximumBlue - minimumBlue);
  }
  let alpha = options.alpha;
  if (!defined_default(alpha)) {
    const minimumAlpha = defaultValue_default(options.minimumAlpha, 0);
    const maximumAlpha = defaultValue_default(options.maximumAlpha, 1);
    Check_default.typeOf.number.lessThanOrEquals(
      "minumumAlpha",
      minimumAlpha,
      maximumAlpha
    );
    alpha = minimumAlpha + Math_default.nextRandomNumber() * (maximumAlpha - minimumAlpha);
  }
  if (!defined_default(result)) {
    return new Color(red, green, blue, alpha);
  }
  result.red = red;
  result.green = green;
  result.blue = blue;
  result.alpha = alpha;
  return result;
};
var rgbaMatcher = /^#([0-9a-f])([0-9a-f])([0-9a-f])([0-9a-f])?$/i;
var rrggbbaaMatcher = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})?$/i;
var rgbParenthesesMatcher = /^rgba?\s*\(\s*([0-9.]+%?)\s*[,\s]+\s*([0-9.]+%?)\s*[,\s]+\s*([0-9.]+%?)(?:\s*[,\s/]+\s*([0-9.]+))?\s*\)$/i;
var hslParenthesesMatcher = /^hsla?\s*\(\s*([0-9.]+)\s*[,\s]+\s*([0-9.]+%)\s*[,\s]+\s*([0-9.]+%)(?:\s*[,\s/]+\s*([0-9.]+))?\s*\)$/i;
Color.fromCssColorString = function(color, result) {
  Check_default.typeOf.string("color", color);
  if (!defined_default(result)) {
    result = new Color();
  }
  color = color.trim();
  const namedColor = Color[color.toUpperCase()];
  if (defined_default(namedColor)) {
    Color.clone(namedColor, result);
    return result;
  }
  let matches = rgbaMatcher.exec(color);
  if (matches !== null) {
    result.red = parseInt(matches[1], 16) / 15;
    result.green = parseInt(matches[2], 16) / 15;
    result.blue = parseInt(matches[3], 16) / 15;
    result.alpha = parseInt(defaultValue_default(matches[4], "f"), 16) / 15;
    return result;
  }
  matches = rrggbbaaMatcher.exec(color);
  if (matches !== null) {
    result.red = parseInt(matches[1], 16) / 255;
    result.green = parseInt(matches[2], 16) / 255;
    result.blue = parseInt(matches[3], 16) / 255;
    result.alpha = parseInt(defaultValue_default(matches[4], "ff"), 16) / 255;
    return result;
  }
  matches = rgbParenthesesMatcher.exec(color);
  if (matches !== null) {
    result.red = parseFloat(matches[1]) / ("%" === matches[1].substr(-1) ? 100 : 255);
    result.green = parseFloat(matches[2]) / ("%" === matches[2].substr(-1) ? 100 : 255);
    result.blue = parseFloat(matches[3]) / ("%" === matches[3].substr(-1) ? 100 : 255);
    result.alpha = parseFloat(defaultValue_default(matches[4], "1.0"));
    return result;
  }
  matches = hslParenthesesMatcher.exec(color);
  if (matches !== null) {
    return Color.fromHsl(
      parseFloat(matches[1]) / 360,
      parseFloat(matches[2]) / 100,
      parseFloat(matches[3]) / 100,
      parseFloat(defaultValue_default(matches[4], "1.0")),
      result
    );
  }
  result = void 0;
  return result;
};
Color.packedLength = 4;
Color.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value.red;
  array[startingIndex++] = value.green;
  array[startingIndex++] = value.blue;
  array[startingIndex] = value.alpha;
  return array;
};
Color.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Color();
  }
  result.red = array[startingIndex++];
  result.green = array[startingIndex++];
  result.blue = array[startingIndex++];
  result.alpha = array[startingIndex];
  return result;
};
Color.byteToFloat = function(number) {
  return number / 255;
};
Color.floatToByte = function(number) {
  return number === 1 ? 255 : number * 256 | 0;
};
Color.clone = function(color, result) {
  if (!defined_default(color)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Color(color.red, color.green, color.blue, color.alpha);
  }
  result.red = color.red;
  result.green = color.green;
  result.blue = color.blue;
  result.alpha = color.alpha;
  return result;
};
Color.equals = function(left, right) {
  return left === right || //
  defined_default(left) && //
  defined_default(right) && //
  left.red === right.red && //
  left.green === right.green && //
  left.blue === right.blue && //
  left.alpha === right.alpha;
};
Color.equalsArray = function(color, array, offset) {
  return color.red === array[offset] && color.green === array[offset + 1] && color.blue === array[offset + 2] && color.alpha === array[offset + 3];
};
Color.prototype.clone = function(result) {
  return Color.clone(this, result);
};
Color.prototype.equals = function(other) {
  return Color.equals(this, other);
};
Color.prototype.equalsEpsilon = function(other, epsilon) {
  return this === other || //
  defined_default(other) && //
  Math.abs(this.red - other.red) <= epsilon && //
  Math.abs(this.green - other.green) <= epsilon && //
  Math.abs(this.blue - other.blue) <= epsilon && //
  Math.abs(this.alpha - other.alpha) <= epsilon;
};
Color.prototype.toString = function() {
  return `(${this.red}, ${this.green}, ${this.blue}, ${this.alpha})`;
};
Color.prototype.toCssColorString = function() {
  const red = Color.floatToByte(this.red);
  const green = Color.floatToByte(this.green);
  const blue = Color.floatToByte(this.blue);
  if (this.alpha === 1) {
    return `rgb(${red},${green},${blue})`;
  }
  return `rgba(${red},${green},${blue},${this.alpha})`;
};
Color.prototype.toCssHexString = function() {
  let r = Color.floatToByte(this.red).toString(16);
  if (r.length < 2) {
    r = `0${r}`;
  }
  let g = Color.floatToByte(this.green).toString(16);
  if (g.length < 2) {
    g = `0${g}`;
  }
  let b = Color.floatToByte(this.blue).toString(16);
  if (b.length < 2) {
    b = `0${b}`;
  }
  if (this.alpha < 1) {
    let hexAlpha = Color.floatToByte(this.alpha).toString(16);
    if (hexAlpha.length < 2) {
      hexAlpha = `0${hexAlpha}`;
    }
    return `#${r}${g}${b}${hexAlpha}`;
  }
  return `#${r}${g}${b}`;
};
Color.prototype.toBytes = function(result) {
  const red = Color.floatToByte(this.red);
  const green = Color.floatToByte(this.green);
  const blue = Color.floatToByte(this.blue);
  const alpha = Color.floatToByte(this.alpha);
  if (!defined_default(result)) {
    return [red, green, blue, alpha];
  }
  result[0] = red;
  result[1] = green;
  result[2] = blue;
  result[3] = alpha;
  return result;
};
Color.prototype.toRgba = function() {
  scratchUint8Array[0] = Color.floatToByte(this.red);
  scratchUint8Array[1] = Color.floatToByte(this.green);
  scratchUint8Array[2] = Color.floatToByte(this.blue);
  scratchUint8Array[3] = Color.floatToByte(this.alpha);
  return scratchUint32Array[0];
};
Color.prototype.brighten = function(magnitude, result) {
  Check_default.typeOf.number("magnitude", magnitude);
  Check_default.typeOf.number.greaterThanOrEquals("magnitude", magnitude, 0);
  Check_default.typeOf.object("result", result);
  magnitude = 1 - magnitude;
  result.red = 1 - (1 - this.red) * magnitude;
  result.green = 1 - (1 - this.green) * magnitude;
  result.blue = 1 - (1 - this.blue) * magnitude;
  result.alpha = this.alpha;
  return result;
};
Color.prototype.darken = function(magnitude, result) {
  Check_default.typeOf.number("magnitude", magnitude);
  Check_default.typeOf.number.greaterThanOrEquals("magnitude", magnitude, 0);
  Check_default.typeOf.object("result", result);
  magnitude = 1 - magnitude;
  result.red = this.red * magnitude;
  result.green = this.green * magnitude;
  result.blue = this.blue * magnitude;
  result.alpha = this.alpha;
  return result;
};
Color.prototype.withAlpha = function(alpha, result) {
  return Color.fromAlpha(this, alpha, result);
};
Color.add = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.red = left.red + right.red;
  result.green = left.green + right.green;
  result.blue = left.blue + right.blue;
  result.alpha = left.alpha + right.alpha;
  return result;
};
Color.subtract = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.red = left.red - right.red;
  result.green = left.green - right.green;
  result.blue = left.blue - right.blue;
  result.alpha = left.alpha - right.alpha;
  return result;
};
Color.multiply = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.red = left.red * right.red;
  result.green = left.green * right.green;
  result.blue = left.blue * right.blue;
  result.alpha = left.alpha * right.alpha;
  return result;
};
Color.divide = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.red = left.red / right.red;
  result.green = left.green / right.green;
  result.blue = left.blue / right.blue;
  result.alpha = left.alpha / right.alpha;
  return result;
};
Color.mod = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.red = left.red % right.red;
  result.green = left.green % right.green;
  result.blue = left.blue % right.blue;
  result.alpha = left.alpha % right.alpha;
  return result;
};
Color.lerp = function(start, end, t, result) {
  Check_default.typeOf.object("start", start);
  Check_default.typeOf.object("end", end);
  Check_default.typeOf.number("t", t);
  Check_default.typeOf.object("result", result);
  result.red = Math_default.lerp(start.red, end.red, t);
  result.green = Math_default.lerp(start.green, end.green, t);
  result.blue = Math_default.lerp(start.blue, end.blue, t);
  result.alpha = Math_default.lerp(start.alpha, end.alpha, t);
  return result;
};
Color.multiplyByScalar = function(color, scalar, result) {
  Check_default.typeOf.object("color", color);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.red = color.red * scalar;
  result.green = color.green * scalar;
  result.blue = color.blue * scalar;
  result.alpha = color.alpha * scalar;
  return result;
};
Color.divideByScalar = function(color, scalar, result) {
  Check_default.typeOf.object("color", color);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.red = color.red / scalar;
  result.green = color.green / scalar;
  result.blue = color.blue / scalar;
  result.alpha = color.alpha / scalar;
  return result;
};
Color.ALICEBLUE = Object.freeze(Color.fromCssColorString("#F0F8FF"));
Color.ANTIQUEWHITE = Object.freeze(Color.fromCssColorString("#FAEBD7"));
Color.AQUA = Object.freeze(Color.fromCssColorString("#00FFFF"));
Color.AQUAMARINE = Object.freeze(Color.fromCssColorString("#7FFFD4"));
Color.AZURE = Object.freeze(Color.fromCssColorString("#F0FFFF"));
Color.BEIGE = Object.freeze(Color.fromCssColorString("#F5F5DC"));
Color.BISQUE = Object.freeze(Color.fromCssColorString("#FFE4C4"));
Color.BLACK = Object.freeze(Color.fromCssColorString("#000000"));
Color.BLANCHEDALMOND = Object.freeze(Color.fromCssColorString("#FFEBCD"));
Color.BLUE = Object.freeze(Color.fromCssColorString("#0000FF"));
Color.BLUEVIOLET = Object.freeze(Color.fromCssColorString("#8A2BE2"));
Color.BROWN = Object.freeze(Color.fromCssColorString("#A52A2A"));
Color.BURLYWOOD = Object.freeze(Color.fromCssColorString("#DEB887"));
Color.CADETBLUE = Object.freeze(Color.fromCssColorString("#5F9EA0"));
Color.CHARTREUSE = Object.freeze(Color.fromCssColorString("#7FFF00"));
Color.CHOCOLATE = Object.freeze(Color.fromCssColorString("#D2691E"));
Color.CORAL = Object.freeze(Color.fromCssColorString("#FF7F50"));
Color.CORNFLOWERBLUE = Object.freeze(Color.fromCssColorString("#6495ED"));
Color.CORNSILK = Object.freeze(Color.fromCssColorString("#FFF8DC"));
Color.CRIMSON = Object.freeze(Color.fromCssColorString("#DC143C"));
Color.CYAN = Object.freeze(Color.fromCssColorString("#00FFFF"));
Color.DARKBLUE = Object.freeze(Color.fromCssColorString("#00008B"));
Color.DARKCYAN = Object.freeze(Color.fromCssColorString("#008B8B"));
Color.DARKGOLDENROD = Object.freeze(Color.fromCssColorString("#B8860B"));
Color.DARKGRAY = Object.freeze(Color.fromCssColorString("#A9A9A9"));
Color.DARKGREEN = Object.freeze(Color.fromCssColorString("#006400"));
Color.DARKGREY = Color.DARKGRAY;
Color.DARKKHAKI = Object.freeze(Color.fromCssColorString("#BDB76B"));
Color.DARKMAGENTA = Object.freeze(Color.fromCssColorString("#8B008B"));
Color.DARKOLIVEGREEN = Object.freeze(Color.fromCssColorString("#556B2F"));
Color.DARKORANGE = Object.freeze(Color.fromCssColorString("#FF8C00"));
Color.DARKORCHID = Object.freeze(Color.fromCssColorString("#9932CC"));
Color.DARKRED = Object.freeze(Color.fromCssColorString("#8B0000"));
Color.DARKSALMON = Object.freeze(Color.fromCssColorString("#E9967A"));
Color.DARKSEAGREEN = Object.freeze(Color.fromCssColorString("#8FBC8F"));
Color.DARKSLATEBLUE = Object.freeze(Color.fromCssColorString("#483D8B"));
Color.DARKSLATEGRAY = Object.freeze(Color.fromCssColorString("#2F4F4F"));
Color.DARKSLATEGREY = Color.DARKSLATEGRAY;
Color.DARKTURQUOISE = Object.freeze(Color.fromCssColorString("#00CED1"));
Color.DARKVIOLET = Object.freeze(Color.fromCssColorString("#9400D3"));
Color.DEEPPINK = Object.freeze(Color.fromCssColorString("#FF1493"));
Color.DEEPSKYBLUE = Object.freeze(Color.fromCssColorString("#00BFFF"));
Color.DIMGRAY = Object.freeze(Color.fromCssColorString("#696969"));
Color.DIMGREY = Color.DIMGRAY;
Color.DODGERBLUE = Object.freeze(Color.fromCssColorString("#1E90FF"));
Color.FIREBRICK = Object.freeze(Color.fromCssColorString("#B22222"));
Color.FLORALWHITE = Object.freeze(Color.fromCssColorString("#FFFAF0"));
Color.FORESTGREEN = Object.freeze(Color.fromCssColorString("#228B22"));
Color.FUCHSIA = Object.freeze(Color.fromCssColorString("#FF00FF"));
Color.GAINSBORO = Object.freeze(Color.fromCssColorString("#DCDCDC"));
Color.GHOSTWHITE = Object.freeze(Color.fromCssColorString("#F8F8FF"));
Color.GOLD = Object.freeze(Color.fromCssColorString("#FFD700"));
Color.GOLDENROD = Object.freeze(Color.fromCssColorString("#DAA520"));
Color.GRAY = Object.freeze(Color.fromCssColorString("#808080"));
Color.GREEN = Object.freeze(Color.fromCssColorString("#008000"));
Color.GREENYELLOW = Object.freeze(Color.fromCssColorString("#ADFF2F"));
Color.GREY = Color.GRAY;
Color.HONEYDEW = Object.freeze(Color.fromCssColorString("#F0FFF0"));
Color.HOTPINK = Object.freeze(Color.fromCssColorString("#FF69B4"));
Color.INDIANRED = Object.freeze(Color.fromCssColorString("#CD5C5C"));
Color.INDIGO = Object.freeze(Color.fromCssColorString("#4B0082"));
Color.IVORY = Object.freeze(Color.fromCssColorString("#FFFFF0"));
Color.KHAKI = Object.freeze(Color.fromCssColorString("#F0E68C"));
Color.LAVENDER = Object.freeze(Color.fromCssColorString("#E6E6FA"));
Color.LAVENDAR_BLUSH = Object.freeze(Color.fromCssColorString("#FFF0F5"));
Color.LAWNGREEN = Object.freeze(Color.fromCssColorString("#7CFC00"));
Color.LEMONCHIFFON = Object.freeze(Color.fromCssColorString("#FFFACD"));
Color.LIGHTBLUE = Object.freeze(Color.fromCssColorString("#ADD8E6"));
Color.LIGHTCORAL = Object.freeze(Color.fromCssColorString("#F08080"));
Color.LIGHTCYAN = Object.freeze(Color.fromCssColorString("#E0FFFF"));
Color.LIGHTGOLDENRODYELLOW = Object.freeze(Color.fromCssColorString("#FAFAD2"));
Color.LIGHTGRAY = Object.freeze(Color.fromCssColorString("#D3D3D3"));
Color.LIGHTGREEN = Object.freeze(Color.fromCssColorString("#90EE90"));
Color.LIGHTGREY = Color.LIGHTGRAY;
Color.LIGHTPINK = Object.freeze(Color.fromCssColorString("#FFB6C1"));
Color.LIGHTSEAGREEN = Object.freeze(Color.fromCssColorString("#20B2AA"));
Color.LIGHTSKYBLUE = Object.freeze(Color.fromCssColorString("#87CEFA"));
Color.LIGHTSLATEGRAY = Object.freeze(Color.fromCssColorString("#778899"));
Color.LIGHTSLATEGREY = Color.LIGHTSLATEGRAY;
Color.LIGHTSTEELBLUE = Object.freeze(Color.fromCssColorString("#B0C4DE"));
Color.LIGHTYELLOW = Object.freeze(Color.fromCssColorString("#FFFFE0"));
Color.LIME = Object.freeze(Color.fromCssColorString("#00FF00"));
Color.LIMEGREEN = Object.freeze(Color.fromCssColorString("#32CD32"));
Color.LINEN = Object.freeze(Color.fromCssColorString("#FAF0E6"));
Color.MAGENTA = Object.freeze(Color.fromCssColorString("#FF00FF"));
Color.MAROON = Object.freeze(Color.fromCssColorString("#800000"));
Color.MEDIUMAQUAMARINE = Object.freeze(Color.fromCssColorString("#66CDAA"));
Color.MEDIUMBLUE = Object.freeze(Color.fromCssColorString("#0000CD"));
Color.MEDIUMORCHID = Object.freeze(Color.fromCssColorString("#BA55D3"));
Color.MEDIUMPURPLE = Object.freeze(Color.fromCssColorString("#9370DB"));
Color.MEDIUMSEAGREEN = Object.freeze(Color.fromCssColorString("#3CB371"));
Color.MEDIUMSLATEBLUE = Object.freeze(Color.fromCssColorString("#7B68EE"));
Color.MEDIUMSPRINGGREEN = Object.freeze(Color.fromCssColorString("#00FA9A"));
Color.MEDIUMTURQUOISE = Object.freeze(Color.fromCssColorString("#48D1CC"));
Color.MEDIUMVIOLETRED = Object.freeze(Color.fromCssColorString("#C71585"));
Color.MIDNIGHTBLUE = Object.freeze(Color.fromCssColorString("#191970"));
Color.MINTCREAM = Object.freeze(Color.fromCssColorString("#F5FFFA"));
Color.MISTYROSE = Object.freeze(Color.fromCssColorString("#FFE4E1"));
Color.MOCCASIN = Object.freeze(Color.fromCssColorString("#FFE4B5"));
Color.NAVAJOWHITE = Object.freeze(Color.fromCssColorString("#FFDEAD"));
Color.NAVY = Object.freeze(Color.fromCssColorString("#000080"));
Color.OLDLACE = Object.freeze(Color.fromCssColorString("#FDF5E6"));
Color.OLIVE = Object.freeze(Color.fromCssColorString("#808000"));
Color.OLIVEDRAB = Object.freeze(Color.fromCssColorString("#6B8E23"));
Color.ORANGE = Object.freeze(Color.fromCssColorString("#FFA500"));
Color.ORANGERED = Object.freeze(Color.fromCssColorString("#FF4500"));
Color.ORCHID = Object.freeze(Color.fromCssColorString("#DA70D6"));
Color.PALEGOLDENROD = Object.freeze(Color.fromCssColorString("#EEE8AA"));
Color.PALEGREEN = Object.freeze(Color.fromCssColorString("#98FB98"));
Color.PALETURQUOISE = Object.freeze(Color.fromCssColorString("#AFEEEE"));
Color.PALEVIOLETRED = Object.freeze(Color.fromCssColorString("#DB7093"));
Color.PAPAYAWHIP = Object.freeze(Color.fromCssColorString("#FFEFD5"));
Color.PEACHPUFF = Object.freeze(Color.fromCssColorString("#FFDAB9"));
Color.PERU = Object.freeze(Color.fromCssColorString("#CD853F"));
Color.PINK = Object.freeze(Color.fromCssColorString("#FFC0CB"));
Color.PLUM = Object.freeze(Color.fromCssColorString("#DDA0DD"));
Color.POWDERBLUE = Object.freeze(Color.fromCssColorString("#B0E0E6"));
Color.PURPLE = Object.freeze(Color.fromCssColorString("#800080"));
Color.RED = Object.freeze(Color.fromCssColorString("#FF0000"));
Color.ROSYBROWN = Object.freeze(Color.fromCssColorString("#BC8F8F"));
Color.ROYALBLUE = Object.freeze(Color.fromCssColorString("#4169E1"));
Color.SADDLEBROWN = Object.freeze(Color.fromCssColorString("#8B4513"));
Color.SALMON = Object.freeze(Color.fromCssColorString("#FA8072"));
Color.SANDYBROWN = Object.freeze(Color.fromCssColorString("#F4A460"));
Color.SEAGREEN = Object.freeze(Color.fromCssColorString("#2E8B57"));
Color.SEASHELL = Object.freeze(Color.fromCssColorString("#FFF5EE"));
Color.SIENNA = Object.freeze(Color.fromCssColorString("#A0522D"));
Color.SILVER = Object.freeze(Color.fromCssColorString("#C0C0C0"));
Color.SKYBLUE = Object.freeze(Color.fromCssColorString("#87CEEB"));
Color.SLATEBLUE = Object.freeze(Color.fromCssColorString("#6A5ACD"));
Color.SLATEGRAY = Object.freeze(Color.fromCssColorString("#708090"));
Color.SLATEGREY = Color.SLATEGRAY;
Color.SNOW = Object.freeze(Color.fromCssColorString("#FFFAFA"));
Color.SPRINGGREEN = Object.freeze(Color.fromCssColorString("#00FF7F"));
Color.STEELBLUE = Object.freeze(Color.fromCssColorString("#4682B4"));
Color.TAN = Object.freeze(Color.fromCssColorString("#D2B48C"));
Color.TEAL = Object.freeze(Color.fromCssColorString("#008080"));
Color.THISTLE = Object.freeze(Color.fromCssColorString("#D8BFD8"));
Color.TOMATO = Object.freeze(Color.fromCssColorString("#FF6347"));
Color.TURQUOISE = Object.freeze(Color.fromCssColorString("#40E0D0"));
Color.VIOLET = Object.freeze(Color.fromCssColorString("#EE82EE"));
Color.WHEAT = Object.freeze(Color.fromCssColorString("#F5DEB3"));
Color.WHITE = Object.freeze(Color.fromCssColorString("#FFFFFF"));
Color.WHITESMOKE = Object.freeze(Color.fromCssColorString("#F5F5F5"));
Color.YELLOW = Object.freeze(Color.fromCssColorString("#FFFF00"));
Color.YELLOWGREEN = Object.freeze(Color.fromCssColorString("#9ACD32"));
Color.TRANSPARENT = Object.freeze(new Color(0, 0, 0, 0));
var Color_default = Color;

// packages/engine/Source/Renderer/ClearCommand.js
function ClearCommand(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  this.color = options.color;
  this.depth = options.depth;
  this.stencil = options.stencil;
  this.renderState = options.renderState;
  this.framebuffer = options.framebuffer;
  this.owner = options.owner;
  this.pass = options.pass;
}
ClearCommand.ALL = Object.freeze(
  new ClearCommand({
    color: new Color_default(0, 0, 0, 0),
    depth: 1,
    stencil: 0
  })
);
ClearCommand.prototype.execute = function(context, passState) {
  context.clear(this, passState);
};
var ClearCommand_default = ClearCommand;

// packages/engine/Source/Core/Cartesian2.js
function Cartesian2(x, y) {
  this.x = defaultValue_default(x, 0);
  this.y = defaultValue_default(y, 0);
}
Cartesian2.fromElements = function(x, y, result) {
  if (!defined_default(result)) {
    return new Cartesian2(x, y);
  }
  result.x = x;
  result.y = y;
  return result;
};
Cartesian2.clone = function(cartesian, result) {
  if (!defined_default(cartesian)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Cartesian2(cartesian.x, cartesian.y);
  }
  result.x = cartesian.x;
  result.y = cartesian.y;
  return result;
};
Cartesian2.fromCartesian3 = Cartesian2.clone;
Cartesian2.fromCartesian4 = Cartesian2.clone;
Cartesian2.packedLength = 2;
Cartesian2.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value.x;
  array[startingIndex] = value.y;
  return array;
};
Cartesian2.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Cartesian2();
  }
  result.x = array[startingIndex++];
  result.y = array[startingIndex];
  return result;
};
Cartesian2.packArray = function(array, result) {
  Check_default.defined("array", array);
  const length = array.length;
  const resultLength = length * 2;
  if (!defined_default(result)) {
    result = new Array(resultLength);
  } else if (!Array.isArray(result) && result.length !== resultLength) {
    throw new DeveloperError_default(
      "If result is a typed array, it must have exactly array.length * 2 elements"
    );
  } else if (result.length !== resultLength) {
    result.length = resultLength;
  }
  for (let i = 0; i < length; ++i) {
    Cartesian2.pack(array[i], result, i * 2);
  }
  return result;
};
Cartesian2.unpackArray = function(array, result) {
  Check_default.defined("array", array);
  Check_default.typeOf.number.greaterThanOrEquals("array.length", array.length, 2);
  if (array.length % 2 !== 0) {
    throw new DeveloperError_default("array length must be a multiple of 2.");
  }
  const length = array.length;
  if (!defined_default(result)) {
    result = new Array(length / 2);
  } else {
    result.length = length / 2;
  }
  for (let i = 0; i < length; i += 2) {
    const index = i / 2;
    result[index] = Cartesian2.unpack(array, i, result[index]);
  }
  return result;
};
Cartesian2.fromArray = Cartesian2.unpack;
Cartesian2.maximumComponent = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return Math.max(cartesian.x, cartesian.y);
};
Cartesian2.minimumComponent = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return Math.min(cartesian.x, cartesian.y);
};
Cartesian2.minimumByComponent = function(first, second, result) {
  Check_default.typeOf.object("first", first);
  Check_default.typeOf.object("second", second);
  Check_default.typeOf.object("result", result);
  result.x = Math.min(first.x, second.x);
  result.y = Math.min(first.y, second.y);
  return result;
};
Cartesian2.maximumByComponent = function(first, second, result) {
  Check_default.typeOf.object("first", first);
  Check_default.typeOf.object("second", second);
  Check_default.typeOf.object("result", result);
  result.x = Math.max(first.x, second.x);
  result.y = Math.max(first.y, second.y);
  return result;
};
Cartesian2.clamp = function(value, min, max, result) {
  Check_default.typeOf.object("value", value);
  Check_default.typeOf.object("min", min);
  Check_default.typeOf.object("max", max);
  Check_default.typeOf.object("result", result);
  const x = Math_default.clamp(value.x, min.x, max.x);
  const y = Math_default.clamp(value.y, min.y, max.y);
  result.x = x;
  result.y = y;
  return result;
};
Cartesian2.magnitudeSquared = function(cartesian) {
  Check_default.typeOf.object("cartesian", cartesian);
  return cartesian.x * cartesian.x + cartesian.y * cartesian.y;
};
Cartesian2.magnitude = function(cartesian) {
  return Math.sqrt(Cartesian2.magnitudeSquared(cartesian));
};
var distanceScratch3 = new Cartesian2();
Cartesian2.distance = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Cartesian2.subtract(left, right, distanceScratch3);
  return Cartesian2.magnitude(distanceScratch3);
};
Cartesian2.distanceSquared = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Cartesian2.subtract(left, right, distanceScratch3);
  return Cartesian2.magnitudeSquared(distanceScratch3);
};
Cartesian2.normalize = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const magnitude = Cartesian2.magnitude(cartesian);
  result.x = cartesian.x / magnitude;
  result.y = cartesian.y / magnitude;
  if (isNaN(result.x) || isNaN(result.y)) {
    throw new DeveloperError_default("normalized result is not a number");
  }
  return result;
};
Cartesian2.dot = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  return left.x * right.x + left.y * right.y;
};
Cartesian2.cross = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  return left.x * right.y - left.y * right.x;
};
Cartesian2.multiplyComponents = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x * right.x;
  result.y = left.y * right.y;
  return result;
};
Cartesian2.divideComponents = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x / right.x;
  result.y = left.y / right.y;
  return result;
};
Cartesian2.add = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x + right.x;
  result.y = left.y + right.y;
  return result;
};
Cartesian2.subtract = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result.x = left.x - right.x;
  result.y = left.y - right.y;
  return result;
};
Cartesian2.multiplyByScalar = function(cartesian, scalar, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.x = cartesian.x * scalar;
  result.y = cartesian.y * scalar;
  return result;
};
Cartesian2.divideByScalar = function(cartesian, scalar, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result.x = cartesian.x / scalar;
  result.y = cartesian.y / scalar;
  return result;
};
Cartesian2.negate = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result.x = -cartesian.x;
  result.y = -cartesian.y;
  return result;
};
Cartesian2.abs = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result.x = Math.abs(cartesian.x);
  result.y = Math.abs(cartesian.y);
  return result;
};
var lerpScratch3 = new Cartesian2();
Cartesian2.lerp = function(start, end, t, result) {
  Check_default.typeOf.object("start", start);
  Check_default.typeOf.object("end", end);
  Check_default.typeOf.number("t", t);
  Check_default.typeOf.object("result", result);
  Cartesian2.multiplyByScalar(end, t, lerpScratch3);
  result = Cartesian2.multiplyByScalar(start, 1 - t, result);
  return Cartesian2.add(lerpScratch3, result, result);
};
var angleBetweenScratch3 = new Cartesian2();
var angleBetweenScratch22 = new Cartesian2();
Cartesian2.angleBetween = function(left, right) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Cartesian2.normalize(left, angleBetweenScratch3);
  Cartesian2.normalize(right, angleBetweenScratch22);
  return Math_default.acosClamped(
    Cartesian2.dot(angleBetweenScratch3, angleBetweenScratch22)
  );
};
var mostOrthogonalAxisScratch3 = new Cartesian2();
Cartesian2.mostOrthogonalAxis = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const f = Cartesian2.normalize(cartesian, mostOrthogonalAxisScratch3);
  Cartesian2.abs(f, f);
  if (f.x <= f.y) {
    result = Cartesian2.clone(Cartesian2.UNIT_X, result);
  } else {
    result = Cartesian2.clone(Cartesian2.UNIT_Y, result);
  }
  return result;
};
Cartesian2.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left.x === right.x && left.y === right.y;
};
Cartesian2.equalsArray = function(cartesian, array, offset) {
  return cartesian.x === array[offset] && cartesian.y === array[offset + 1];
};
Cartesian2.equalsEpsilon = function(left, right, relativeEpsilon, absoluteEpsilon) {
  return left === right || defined_default(left) && defined_default(right) && Math_default.equalsEpsilon(
    left.x,
    right.x,
    relativeEpsilon,
    absoluteEpsilon
  ) && Math_default.equalsEpsilon(
    left.y,
    right.y,
    relativeEpsilon,
    absoluteEpsilon
  );
};
Cartesian2.ZERO = Object.freeze(new Cartesian2(0, 0));
Cartesian2.ONE = Object.freeze(new Cartesian2(1, 1));
Cartesian2.UNIT_X = Object.freeze(new Cartesian2(1, 0));
Cartesian2.UNIT_Y = Object.freeze(new Cartesian2(0, 1));
Cartesian2.prototype.clone = function(result) {
  return Cartesian2.clone(this, result);
};
Cartesian2.prototype.equals = function(right) {
  return Cartesian2.equals(this, right);
};
Cartesian2.prototype.equalsEpsilon = function(right, relativeEpsilon, absoluteEpsilon) {
  return Cartesian2.equalsEpsilon(
    this,
    right,
    relativeEpsilon,
    absoluteEpsilon
  );
};
Cartesian2.prototype.toString = function() {
  return `(${this.x}, ${this.y})`;
};
var Cartesian2_default = Cartesian2;

// packages/engine/Source/Core/scaleToGeodeticSurface.js
var scaleToGeodeticSurfaceIntersection = new Cartesian3_default();
var scaleToGeodeticSurfaceGradient = new Cartesian3_default();
function scaleToGeodeticSurface(cartesian, oneOverRadii, oneOverRadiiSquared, centerToleranceSquared, result) {
  if (!defined_default(cartesian)) {
    throw new DeveloperError_default("cartesian is required.");
  }
  if (!defined_default(oneOverRadii)) {
    throw new DeveloperError_default("oneOverRadii is required.");
  }
  if (!defined_default(oneOverRadiiSquared)) {
    throw new DeveloperError_default("oneOverRadiiSquared is required.");
  }
  if (!defined_default(centerToleranceSquared)) {
    throw new DeveloperError_default("centerToleranceSquared is required.");
  }
  const positionX = cartesian.x;
  const positionY = cartesian.y;
  const positionZ = cartesian.z;
  const oneOverRadiiX = oneOverRadii.x;
  const oneOverRadiiY = oneOverRadii.y;
  const oneOverRadiiZ = oneOverRadii.z;
  const x2 = positionX * positionX * oneOverRadiiX * oneOverRadiiX;
  const y2 = positionY * positionY * oneOverRadiiY * oneOverRadiiY;
  const z2 = positionZ * positionZ * oneOverRadiiZ * oneOverRadiiZ;
  const squaredNorm = x2 + y2 + z2;
  const ratio = Math.sqrt(1 / squaredNorm);
  const intersection = Cartesian3_default.multiplyByScalar(
    cartesian,
    ratio,
    scaleToGeodeticSurfaceIntersection
  );
  if (squaredNorm < centerToleranceSquared) {
    return !isFinite(ratio) ? void 0 : Cartesian3_default.clone(intersection, result);
  }
  const oneOverRadiiSquaredX = oneOverRadiiSquared.x;
  const oneOverRadiiSquaredY = oneOverRadiiSquared.y;
  const oneOverRadiiSquaredZ = oneOverRadiiSquared.z;
  const gradient = scaleToGeodeticSurfaceGradient;
  gradient.x = intersection.x * oneOverRadiiSquaredX * 2;
  gradient.y = intersection.y * oneOverRadiiSquaredY * 2;
  gradient.z = intersection.z * oneOverRadiiSquaredZ * 2;
  let lambda = (1 - ratio) * Cartesian3_default.magnitude(cartesian) / (0.5 * Cartesian3_default.magnitude(gradient));
  let correction = 0;
  let func;
  let denominator;
  let xMultiplier;
  let yMultiplier;
  let zMultiplier;
  let xMultiplier2;
  let yMultiplier2;
  let zMultiplier2;
  let xMultiplier3;
  let yMultiplier3;
  let zMultiplier3;
  do {
    lambda -= correction;
    xMultiplier = 1 / (1 + lambda * oneOverRadiiSquaredX);
    yMultiplier = 1 / (1 + lambda * oneOverRadiiSquaredY);
    zMultiplier = 1 / (1 + lambda * oneOverRadiiSquaredZ);
    xMultiplier2 = xMultiplier * xMultiplier;
    yMultiplier2 = yMultiplier * yMultiplier;
    zMultiplier2 = zMultiplier * zMultiplier;
    xMultiplier3 = xMultiplier2 * xMultiplier;
    yMultiplier3 = yMultiplier2 * yMultiplier;
    zMultiplier3 = zMultiplier2 * zMultiplier;
    func = x2 * xMultiplier2 + y2 * yMultiplier2 + z2 * zMultiplier2 - 1;
    denominator = x2 * xMultiplier3 * oneOverRadiiSquaredX + y2 * yMultiplier3 * oneOverRadiiSquaredY + z2 * zMultiplier3 * oneOverRadiiSquaredZ;
    const derivative = -2 * denominator;
    correction = func / derivative;
  } while (Math.abs(func) > Math_default.EPSILON12);
  if (!defined_default(result)) {
    return new Cartesian3_default(
      positionX * xMultiplier,
      positionY * yMultiplier,
      positionZ * zMultiplier
    );
  }
  result.x = positionX * xMultiplier;
  result.y = positionY * yMultiplier;
  result.z = positionZ * zMultiplier;
  return result;
}
var scaleToGeodeticSurface_default = scaleToGeodeticSurface;

// packages/engine/Source/Core/Cartographic.js
function Cartographic(longitude, latitude, height) {
  this.longitude = defaultValue_default(longitude, 0);
  this.latitude = defaultValue_default(latitude, 0);
  this.height = defaultValue_default(height, 0);
}
Cartographic.fromRadians = function(longitude, latitude, height, result) {
  Check_default.typeOf.number("longitude", longitude);
  Check_default.typeOf.number("latitude", latitude);
  height = defaultValue_default(height, 0);
  if (!defined_default(result)) {
    return new Cartographic(longitude, latitude, height);
  }
  result.longitude = longitude;
  result.latitude = latitude;
  result.height = height;
  return result;
};
Cartographic.fromDegrees = function(longitude, latitude, height, result) {
  Check_default.typeOf.number("longitude", longitude);
  Check_default.typeOf.number("latitude", latitude);
  longitude = Math_default.toRadians(longitude);
  latitude = Math_default.toRadians(latitude);
  return Cartographic.fromRadians(longitude, latitude, height, result);
};
var cartesianToCartographicN = new Cartesian3_default();
var cartesianToCartographicP = new Cartesian3_default();
var cartesianToCartographicH = new Cartesian3_default();
var wgs84OneOverRadii = new Cartesian3_default(
  1 / 6378137,
  1 / 6378137,
  1 / 6356752314245179e-9
);
var wgs84OneOverRadiiSquared = new Cartesian3_default(
  1 / (6378137 * 6378137),
  1 / (6378137 * 6378137),
  1 / (6356752314245179e-9 * 6356752314245179e-9)
);
var wgs84CenterToleranceSquared = Math_default.EPSILON1;
Cartographic.fromCartesian = function(cartesian, ellipsoid, result) {
  const oneOverRadii = defined_default(ellipsoid) ? ellipsoid.oneOverRadii : wgs84OneOverRadii;
  const oneOverRadiiSquared = defined_default(ellipsoid) ? ellipsoid.oneOverRadiiSquared : wgs84OneOverRadiiSquared;
  const centerToleranceSquared = defined_default(ellipsoid) ? ellipsoid._centerToleranceSquared : wgs84CenterToleranceSquared;
  const p = scaleToGeodeticSurface_default(
    cartesian,
    oneOverRadii,
    oneOverRadiiSquared,
    centerToleranceSquared,
    cartesianToCartographicP
  );
  if (!defined_default(p)) {
    return void 0;
  }
  let n = Cartesian3_default.multiplyComponents(
    p,
    oneOverRadiiSquared,
    cartesianToCartographicN
  );
  n = Cartesian3_default.normalize(n, n);
  const h = Cartesian3_default.subtract(cartesian, p, cartesianToCartographicH);
  const longitude = Math.atan2(n.y, n.x);
  const latitude = Math.asin(n.z);
  const height = Math_default.sign(Cartesian3_default.dot(h, cartesian)) * Cartesian3_default.magnitude(h);
  if (!defined_default(result)) {
    return new Cartographic(longitude, latitude, height);
  }
  result.longitude = longitude;
  result.latitude = latitude;
  result.height = height;
  return result;
};
Cartographic.toCartesian = function(cartographic, ellipsoid, result) {
  Check_default.defined("cartographic", cartographic);
  return Cartesian3_default.fromRadians(
    cartographic.longitude,
    cartographic.latitude,
    cartographic.height,
    ellipsoid,
    result
  );
};
Cartographic.clone = function(cartographic, result) {
  if (!defined_default(cartographic)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Cartographic(
      cartographic.longitude,
      cartographic.latitude,
      cartographic.height
    );
  }
  result.longitude = cartographic.longitude;
  result.latitude = cartographic.latitude;
  result.height = cartographic.height;
  return result;
};
Cartographic.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left.longitude === right.longitude && left.latitude === right.latitude && left.height === right.height;
};
Cartographic.equalsEpsilon = function(left, right, epsilon) {
  epsilon = defaultValue_default(epsilon, 0);
  return left === right || defined_default(left) && defined_default(right) && Math.abs(left.longitude - right.longitude) <= epsilon && Math.abs(left.latitude - right.latitude) <= epsilon && Math.abs(left.height - right.height) <= epsilon;
};
Cartographic.ZERO = Object.freeze(new Cartographic(0, 0, 0));
Cartographic.prototype.clone = function(result) {
  return Cartographic.clone(this, result);
};
Cartographic.prototype.equals = function(right) {
  return Cartographic.equals(this, right);
};
Cartographic.prototype.equalsEpsilon = function(right, epsilon) {
  return Cartographic.equalsEpsilon(this, right, epsilon);
};
Cartographic.prototype.toString = function() {
  return `(${this.longitude}, ${this.latitude}, ${this.height})`;
};
var Cartographic_default = Cartographic;

// packages/engine/Source/Core/Ellipsoid.js
function initialize(ellipsoid, x, y, z) {
  x = defaultValue_default(x, 0);
  y = defaultValue_default(y, 0);
  z = defaultValue_default(z, 0);
  Check_default.typeOf.number.greaterThanOrEquals("x", x, 0);
  Check_default.typeOf.number.greaterThanOrEquals("y", y, 0);
  Check_default.typeOf.number.greaterThanOrEquals("z", z, 0);
  ellipsoid._radii = new Cartesian3_default(x, y, z);
  ellipsoid._radiiSquared = new Cartesian3_default(x * x, y * y, z * z);
  ellipsoid._radiiToTheFourth = new Cartesian3_default(
    x * x * x * x,
    y * y * y * y,
    z * z * z * z
  );
  ellipsoid._oneOverRadii = new Cartesian3_default(
    x === 0 ? 0 : 1 / x,
    y === 0 ? 0 : 1 / y,
    z === 0 ? 0 : 1 / z
  );
  ellipsoid._oneOverRadiiSquared = new Cartesian3_default(
    x === 0 ? 0 : 1 / (x * x),
    y === 0 ? 0 : 1 / (y * y),
    z === 0 ? 0 : 1 / (z * z)
  );
  ellipsoid._minimumRadius = Math.min(x, y, z);
  ellipsoid._maximumRadius = Math.max(x, y, z);
  ellipsoid._centerToleranceSquared = Math_default.EPSILON1;
  if (ellipsoid._radiiSquared.z !== 0) {
    ellipsoid._squaredXOverSquaredZ = ellipsoid._radiiSquared.x / ellipsoid._radiiSquared.z;
  }
}
function Ellipsoid(x, y, z) {
  this._radii = void 0;
  this._radiiSquared = void 0;
  this._radiiToTheFourth = void 0;
  this._oneOverRadii = void 0;
  this._oneOverRadiiSquared = void 0;
  this._minimumRadius = void 0;
  this._maximumRadius = void 0;
  this._centerToleranceSquared = void 0;
  this._squaredXOverSquaredZ = void 0;
  initialize(this, x, y, z);
}
Object.defineProperties(Ellipsoid.prototype, {
  /**
   * Gets the radii of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {Cartesian3}
   * @readonly
   */
  radii: {
    get: function() {
      return this._radii;
    }
  },
  /**
   * Gets the squared radii of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {Cartesian3}
   * @readonly
   */
  radiiSquared: {
    get: function() {
      return this._radiiSquared;
    }
  },
  /**
   * Gets the radii of the ellipsoid raise to the fourth power.
   * @memberof Ellipsoid.prototype
   * @type {Cartesian3}
   * @readonly
   */
  radiiToTheFourth: {
    get: function() {
      return this._radiiToTheFourth;
    }
  },
  /**
   * Gets one over the radii of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {Cartesian3}
   * @readonly
   */
  oneOverRadii: {
    get: function() {
      return this._oneOverRadii;
    }
  },
  /**
   * Gets one over the squared radii of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {Cartesian3}
   * @readonly
   */
  oneOverRadiiSquared: {
    get: function() {
      return this._oneOverRadiiSquared;
    }
  },
  /**
   * Gets the minimum radius of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {number}
   * @readonly
   */
  minimumRadius: {
    get: function() {
      return this._minimumRadius;
    }
  },
  /**
   * Gets the maximum radius of the ellipsoid.
   * @memberof Ellipsoid.prototype
   * @type {number}
   * @readonly
   */
  maximumRadius: {
    get: function() {
      return this._maximumRadius;
    }
  }
});
Ellipsoid.clone = function(ellipsoid, result) {
  if (!defined_default(ellipsoid)) {
    return void 0;
  }
  const radii = ellipsoid._radii;
  if (!defined_default(result)) {
    return new Ellipsoid(radii.x, radii.y, radii.z);
  }
  Cartesian3_default.clone(radii, result._radii);
  Cartesian3_default.clone(ellipsoid._radiiSquared, result._radiiSquared);
  Cartesian3_default.clone(ellipsoid._radiiToTheFourth, result._radiiToTheFourth);
  Cartesian3_default.clone(ellipsoid._oneOverRadii, result._oneOverRadii);
  Cartesian3_default.clone(ellipsoid._oneOverRadiiSquared, result._oneOverRadiiSquared);
  result._minimumRadius = ellipsoid._minimumRadius;
  result._maximumRadius = ellipsoid._maximumRadius;
  result._centerToleranceSquared = ellipsoid._centerToleranceSquared;
  return result;
};
Ellipsoid.fromCartesian3 = function(cartesian, result) {
  if (!defined_default(result)) {
    result = new Ellipsoid();
  }
  if (!defined_default(cartesian)) {
    return result;
  }
  initialize(result, cartesian.x, cartesian.y, cartesian.z);
  return result;
};
Ellipsoid.WGS84 = Object.freeze(
  new Ellipsoid(6378137, 6378137, 6356752314245179e-9)
);
Ellipsoid.UNIT_SPHERE = Object.freeze(new Ellipsoid(1, 1, 1));
Ellipsoid.MOON = Object.freeze(
  new Ellipsoid(
    Math_default.LUNAR_RADIUS,
    Math_default.LUNAR_RADIUS,
    Math_default.LUNAR_RADIUS
  )
);
Ellipsoid.prototype.clone = function(result) {
  return Ellipsoid.clone(this, result);
};
Ellipsoid.packedLength = Cartesian3_default.packedLength;
Ellipsoid.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  Cartesian3_default.pack(value._radii, array, startingIndex);
  return array;
};
Ellipsoid.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  const radii = Cartesian3_default.unpack(array, startingIndex);
  return Ellipsoid.fromCartesian3(radii, result);
};
Ellipsoid.prototype.geocentricSurfaceNormal = Cartesian3_default.normalize;
Ellipsoid.prototype.geodeticSurfaceNormalCartographic = function(cartographic, result) {
  Check_default.typeOf.object("cartographic", cartographic);
  const longitude = cartographic.longitude;
  const latitude = cartographic.latitude;
  const cosLatitude = Math.cos(latitude);
  const x = cosLatitude * Math.cos(longitude);
  const y = cosLatitude * Math.sin(longitude);
  const z = Math.sin(latitude);
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  result.x = x;
  result.y = y;
  result.z = z;
  return Cartesian3_default.normalize(result, result);
};
Ellipsoid.prototype.geodeticSurfaceNormal = function(cartesian, result) {
  if (Cartesian3_default.equalsEpsilon(cartesian, Cartesian3_default.ZERO, Math_default.EPSILON14)) {
    return void 0;
  }
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  result = Cartesian3_default.multiplyComponents(
    cartesian,
    this._oneOverRadiiSquared,
    result
  );
  return Cartesian3_default.normalize(result, result);
};
var cartographicToCartesianNormal = new Cartesian3_default();
var cartographicToCartesianK = new Cartesian3_default();
Ellipsoid.prototype.cartographicToCartesian = function(cartographic, result) {
  const n = cartographicToCartesianNormal;
  const k = cartographicToCartesianK;
  this.geodeticSurfaceNormalCartographic(cartographic, n);
  Cartesian3_default.multiplyComponents(this._radiiSquared, n, k);
  const gamma = Math.sqrt(Cartesian3_default.dot(n, k));
  Cartesian3_default.divideByScalar(k, gamma, k);
  Cartesian3_default.multiplyByScalar(n, cartographic.height, n);
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  return Cartesian3_default.add(k, n, result);
};
Ellipsoid.prototype.cartographicArrayToCartesianArray = function(cartographics, result) {
  Check_default.defined("cartographics", cartographics);
  const length = cartographics.length;
  if (!defined_default(result)) {
    result = new Array(length);
  } else {
    result.length = length;
  }
  for (let i = 0; i < length; i++) {
    result[i] = this.cartographicToCartesian(cartographics[i], result[i]);
  }
  return result;
};
var cartesianToCartographicN2 = new Cartesian3_default();
var cartesianToCartographicP2 = new Cartesian3_default();
var cartesianToCartographicH2 = new Cartesian3_default();
Ellipsoid.prototype.cartesianToCartographic = function(cartesian, result) {
  const p = this.scaleToGeodeticSurface(cartesian, cartesianToCartographicP2);
  if (!defined_default(p)) {
    return void 0;
  }
  const n = this.geodeticSurfaceNormal(p, cartesianToCartographicN2);
  const h = Cartesian3_default.subtract(cartesian, p, cartesianToCartographicH2);
  const longitude = Math.atan2(n.y, n.x);
  const latitude = Math.asin(n.z);
  const height = Math_default.sign(Cartesian3_default.dot(h, cartesian)) * Cartesian3_default.magnitude(h);
  if (!defined_default(result)) {
    return new Cartographic_default(longitude, latitude, height);
  }
  result.longitude = longitude;
  result.latitude = latitude;
  result.height = height;
  return result;
};
Ellipsoid.prototype.cartesianArrayToCartographicArray = function(cartesians, result) {
  Check_default.defined("cartesians", cartesians);
  const length = cartesians.length;
  if (!defined_default(result)) {
    result = new Array(length);
  } else {
    result.length = length;
  }
  for (let i = 0; i < length; ++i) {
    result[i] = this.cartesianToCartographic(cartesians[i], result[i]);
  }
  return result;
};
Ellipsoid.prototype.scaleToGeodeticSurface = function(cartesian, result) {
  return scaleToGeodeticSurface_default(
    cartesian,
    this._oneOverRadii,
    this._oneOverRadiiSquared,
    this._centerToleranceSquared,
    result
  );
};
Ellipsoid.prototype.scaleToGeocentricSurface = function(cartesian, result) {
  Check_default.typeOf.object("cartesian", cartesian);
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  const positionX = cartesian.x;
  const positionY = cartesian.y;
  const positionZ = cartesian.z;
  const oneOverRadiiSquared = this._oneOverRadiiSquared;
  const beta = 1 / Math.sqrt(
    positionX * positionX * oneOverRadiiSquared.x + positionY * positionY * oneOverRadiiSquared.y + positionZ * positionZ * oneOverRadiiSquared.z
  );
  return Cartesian3_default.multiplyByScalar(cartesian, beta, result);
};
Ellipsoid.prototype.transformPositionToScaledSpace = function(position, result) {
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  return Cartesian3_default.multiplyComponents(position, this._oneOverRadii, result);
};
Ellipsoid.prototype.transformPositionFromScaledSpace = function(position, result) {
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  return Cartesian3_default.multiplyComponents(position, this._radii, result);
};
Ellipsoid.prototype.equals = function(right) {
  return this === right || defined_default(right) && Cartesian3_default.equals(this._radii, right._radii);
};
Ellipsoid.prototype.toString = function() {
  return this._radii.toString();
};
Ellipsoid.prototype.getSurfaceNormalIntersectionWithZAxis = function(position, buffer, result) {
  Check_default.typeOf.object("position", position);
  if (!Math_default.equalsEpsilon(
    this._radii.x,
    this._radii.y,
    Math_default.EPSILON15
  )) {
    throw new DeveloperError_default(
      "Ellipsoid must be an ellipsoid of revolution (radii.x == radii.y)"
    );
  }
  Check_default.typeOf.number.greaterThan("Ellipsoid.radii.z", this._radii.z, 0);
  buffer = defaultValue_default(buffer, 0);
  const squaredXOverSquaredZ = this._squaredXOverSquaredZ;
  if (!defined_default(result)) {
    result = new Cartesian3_default();
  }
  result.x = 0;
  result.y = 0;
  result.z = position.z * (1 - squaredXOverSquaredZ);
  if (Math.abs(result.z) >= this._radii.z - buffer) {
    return void 0;
  }
  return result;
};
var abscissas = [
  0.14887433898163,
  0.43339539412925,
  0.67940956829902,
  0.86506336668898,
  0.97390652851717,
  0
];
var weights = [
  0.29552422471475,
  0.26926671930999,
  0.21908636251598,
  0.14945134915058,
  0.066671344308684,
  0
];
function gaussLegendreQuadrature(a3, b, func) {
  Check_default.typeOf.number("a", a3);
  Check_default.typeOf.number("b", b);
  Check_default.typeOf.func("func", func);
  const xMean = 0.5 * (b + a3);
  const xRange = 0.5 * (b - a3);
  let sum = 0;
  for (let i = 0; i < 5; i++) {
    const dx = xRange * abscissas[i];
    sum += weights[i] * (func(xMean + dx) + func(xMean - dx));
  }
  sum *= xRange;
  return sum;
}
Ellipsoid.prototype.surfaceArea = function(rectangle) {
  Check_default.typeOf.object("rectangle", rectangle);
  const minLongitude = rectangle.west;
  let maxLongitude = rectangle.east;
  const minLatitude = rectangle.south;
  const maxLatitude = rectangle.north;
  while (maxLongitude < minLongitude) {
    maxLongitude += Math_default.TWO_PI;
  }
  const radiiSquared = this._radiiSquared;
  const a22 = radiiSquared.x;
  const b2 = radiiSquared.y;
  const c2 = radiiSquared.z;
  const a2b2 = a22 * b2;
  return gaussLegendreQuadrature(minLatitude, maxLatitude, function(lat) {
    const sinPhi = Math.cos(lat);
    const cosPhi = Math.sin(lat);
    return Math.cos(lat) * gaussLegendreQuadrature(minLongitude, maxLongitude, function(lon) {
      const cosTheta = Math.cos(lon);
      const sinTheta = Math.sin(lon);
      return Math.sqrt(
        a2b2 * cosPhi * cosPhi + c2 * (b2 * cosTheta * cosTheta + a22 * sinTheta * sinTheta) * sinPhi * sinPhi
      );
    });
  });
};
var Ellipsoid_default = Ellipsoid;

// packages/engine/Source/Core/Rectangle.js
function Rectangle(west, south, east, north) {
  this.west = defaultValue_default(west, 0);
  this.south = defaultValue_default(south, 0);
  this.east = defaultValue_default(east, 0);
  this.north = defaultValue_default(north, 0);
}
Object.defineProperties(Rectangle.prototype, {
  /**
   * Gets the width of the rectangle in radians.
   * @memberof Rectangle.prototype
   * @type {number}
   * @readonly
   */
  width: {
    get: function() {
      return Rectangle.computeWidth(this);
    }
  },
  /**
   * Gets the height of the rectangle in radians.
   * @memberof Rectangle.prototype
   * @type {number}
   * @readonly
   */
  height: {
    get: function() {
      return Rectangle.computeHeight(this);
    }
  }
});
Rectangle.packedLength = 4;
Rectangle.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value.west;
  array[startingIndex++] = value.south;
  array[startingIndex++] = value.east;
  array[startingIndex] = value.north;
  return array;
};
Rectangle.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Rectangle();
  }
  result.west = array[startingIndex++];
  result.south = array[startingIndex++];
  result.east = array[startingIndex++];
  result.north = array[startingIndex];
  return result;
};
Rectangle.computeWidth = function(rectangle) {
  Check_default.typeOf.object("rectangle", rectangle);
  let east = rectangle.east;
  const west = rectangle.west;
  if (east < west) {
    east += Math_default.TWO_PI;
  }
  return east - west;
};
Rectangle.computeHeight = function(rectangle) {
  Check_default.typeOf.object("rectangle", rectangle);
  return rectangle.north - rectangle.south;
};
Rectangle.fromDegrees = function(west, south, east, north, result) {
  west = Math_default.toRadians(defaultValue_default(west, 0));
  south = Math_default.toRadians(defaultValue_default(south, 0));
  east = Math_default.toRadians(defaultValue_default(east, 0));
  north = Math_default.toRadians(defaultValue_default(north, 0));
  if (!defined_default(result)) {
    return new Rectangle(west, south, east, north);
  }
  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};
Rectangle.fromRadians = function(west, south, east, north, result) {
  if (!defined_default(result)) {
    return new Rectangle(west, south, east, north);
  }
  result.west = defaultValue_default(west, 0);
  result.south = defaultValue_default(south, 0);
  result.east = defaultValue_default(east, 0);
  result.north = defaultValue_default(north, 0);
  return result;
};
Rectangle.fromCartographicArray = function(cartographics, result) {
  Check_default.defined("cartographics", cartographics);
  let west = Number.MAX_VALUE;
  let east = -Number.MAX_VALUE;
  let westOverIDL = Number.MAX_VALUE;
  let eastOverIDL = -Number.MAX_VALUE;
  let south = Number.MAX_VALUE;
  let north = -Number.MAX_VALUE;
  for (let i = 0, len = cartographics.length; i < len; i++) {
    const position = cartographics[i];
    west = Math.min(west, position.longitude);
    east = Math.max(east, position.longitude);
    south = Math.min(south, position.latitude);
    north = Math.max(north, position.latitude);
    const lonAdjusted = position.longitude >= 0 ? position.longitude : position.longitude + Math_default.TWO_PI;
    westOverIDL = Math.min(westOverIDL, lonAdjusted);
    eastOverIDL = Math.max(eastOverIDL, lonAdjusted);
  }
  if (east - west > eastOverIDL - westOverIDL) {
    west = westOverIDL;
    east = eastOverIDL;
    if (east > Math_default.PI) {
      east = east - Math_default.TWO_PI;
    }
    if (west > Math_default.PI) {
      west = west - Math_default.TWO_PI;
    }
  }
  if (!defined_default(result)) {
    return new Rectangle(west, south, east, north);
  }
  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};
Rectangle.fromCartesianArray = function(cartesians, ellipsoid, result) {
  Check_default.defined("cartesians", cartesians);
  ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84);
  let west = Number.MAX_VALUE;
  let east = -Number.MAX_VALUE;
  let westOverIDL = Number.MAX_VALUE;
  let eastOverIDL = -Number.MAX_VALUE;
  let south = Number.MAX_VALUE;
  let north = -Number.MAX_VALUE;
  for (let i = 0, len = cartesians.length; i < len; i++) {
    const position = ellipsoid.cartesianToCartographic(cartesians[i]);
    west = Math.min(west, position.longitude);
    east = Math.max(east, position.longitude);
    south = Math.min(south, position.latitude);
    north = Math.max(north, position.latitude);
    const lonAdjusted = position.longitude >= 0 ? position.longitude : position.longitude + Math_default.TWO_PI;
    westOverIDL = Math.min(westOverIDL, lonAdjusted);
    eastOverIDL = Math.max(eastOverIDL, lonAdjusted);
  }
  if (east - west > eastOverIDL - westOverIDL) {
    west = westOverIDL;
    east = eastOverIDL;
    if (east > Math_default.PI) {
      east = east - Math_default.TWO_PI;
    }
    if (west > Math_default.PI) {
      west = west - Math_default.TWO_PI;
    }
  }
  if (!defined_default(result)) {
    return new Rectangle(west, south, east, north);
  }
  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};
Rectangle.clone = function(rectangle, result) {
  if (!defined_default(rectangle)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Rectangle(
      rectangle.west,
      rectangle.south,
      rectangle.east,
      rectangle.north
    );
  }
  result.west = rectangle.west;
  result.south = rectangle.south;
  result.east = rectangle.east;
  result.north = rectangle.north;
  return result;
};
Rectangle.equalsEpsilon = function(left, right, absoluteEpsilon) {
  absoluteEpsilon = defaultValue_default(absoluteEpsilon, 0);
  return left === right || defined_default(left) && defined_default(right) && Math.abs(left.west - right.west) <= absoluteEpsilon && Math.abs(left.south - right.south) <= absoluteEpsilon && Math.abs(left.east - right.east) <= absoluteEpsilon && Math.abs(left.north - right.north) <= absoluteEpsilon;
};
Rectangle.prototype.clone = function(result) {
  return Rectangle.clone(this, result);
};
Rectangle.prototype.equals = function(other) {
  return Rectangle.equals(this, other);
};
Rectangle.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left.west === right.west && left.south === right.south && left.east === right.east && left.north === right.north;
};
Rectangle.prototype.equalsEpsilon = function(other, epsilon) {
  return Rectangle.equalsEpsilon(this, other, epsilon);
};
Rectangle.validate = function(rectangle) {
  Check_default.typeOf.object("rectangle", rectangle);
  const north = rectangle.north;
  Check_default.typeOf.number.greaterThanOrEquals(
    "north",
    north,
    -Math_default.PI_OVER_TWO
  );
  Check_default.typeOf.number.lessThanOrEquals("north", north, Math_default.PI_OVER_TWO);
  const south = rectangle.south;
  Check_default.typeOf.number.greaterThanOrEquals(
    "south",
    south,
    -Math_default.PI_OVER_TWO
  );
  Check_default.typeOf.number.lessThanOrEquals("south", south, Math_default.PI_OVER_TWO);
  const west = rectangle.west;
  Check_default.typeOf.number.greaterThanOrEquals("west", west, -Math.PI);
  Check_default.typeOf.number.lessThanOrEquals("west", west, Math.PI);
  const east = rectangle.east;
  Check_default.typeOf.number.greaterThanOrEquals("east", east, -Math.PI);
  Check_default.typeOf.number.lessThanOrEquals("east", east, Math.PI);
};
Rectangle.southwest = function(rectangle, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  if (!defined_default(result)) {
    return new Cartographic_default(rectangle.west, rectangle.south);
  }
  result.longitude = rectangle.west;
  result.latitude = rectangle.south;
  result.height = 0;
  return result;
};
Rectangle.northwest = function(rectangle, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  if (!defined_default(result)) {
    return new Cartographic_default(rectangle.west, rectangle.north);
  }
  result.longitude = rectangle.west;
  result.latitude = rectangle.north;
  result.height = 0;
  return result;
};
Rectangle.northeast = function(rectangle, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  if (!defined_default(result)) {
    return new Cartographic_default(rectangle.east, rectangle.north);
  }
  result.longitude = rectangle.east;
  result.latitude = rectangle.north;
  result.height = 0;
  return result;
};
Rectangle.southeast = function(rectangle, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  if (!defined_default(result)) {
    return new Cartographic_default(rectangle.east, rectangle.south);
  }
  result.longitude = rectangle.east;
  result.latitude = rectangle.south;
  result.height = 0;
  return result;
};
Rectangle.center = function(rectangle, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  let east = rectangle.east;
  const west = rectangle.west;
  if (east < west) {
    east += Math_default.TWO_PI;
  }
  const longitude = Math_default.negativePiToPi((west + east) * 0.5);
  const latitude = (rectangle.south + rectangle.north) * 0.5;
  if (!defined_default(result)) {
    return new Cartographic_default(longitude, latitude);
  }
  result.longitude = longitude;
  result.latitude = latitude;
  result.height = 0;
  return result;
};
Rectangle.intersection = function(rectangle, otherRectangle, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  Check_default.typeOf.object("otherRectangle", otherRectangle);
  let rectangleEast = rectangle.east;
  let rectangleWest = rectangle.west;
  let otherRectangleEast = otherRectangle.east;
  let otherRectangleWest = otherRectangle.west;
  if (rectangleEast < rectangleWest && otherRectangleEast > 0) {
    rectangleEast += Math_default.TWO_PI;
  } else if (otherRectangleEast < otherRectangleWest && rectangleEast > 0) {
    otherRectangleEast += Math_default.TWO_PI;
  }
  if (rectangleEast < rectangleWest && otherRectangleWest < 0) {
    otherRectangleWest += Math_default.TWO_PI;
  } else if (otherRectangleEast < otherRectangleWest && rectangleWest < 0) {
    rectangleWest += Math_default.TWO_PI;
  }
  const west = Math_default.negativePiToPi(
    Math.max(rectangleWest, otherRectangleWest)
  );
  const east = Math_default.negativePiToPi(
    Math.min(rectangleEast, otherRectangleEast)
  );
  if ((rectangle.west < rectangle.east || otherRectangle.west < otherRectangle.east) && east <= west) {
    return void 0;
  }
  const south = Math.max(rectangle.south, otherRectangle.south);
  const north = Math.min(rectangle.north, otherRectangle.north);
  if (south >= north) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Rectangle(west, south, east, north);
  }
  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};
Rectangle.simpleIntersection = function(rectangle, otherRectangle, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  Check_default.typeOf.object("otherRectangle", otherRectangle);
  const west = Math.max(rectangle.west, otherRectangle.west);
  const south = Math.max(rectangle.south, otherRectangle.south);
  const east = Math.min(rectangle.east, otherRectangle.east);
  const north = Math.min(rectangle.north, otherRectangle.north);
  if (south >= north || west >= east) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Rectangle(west, south, east, north);
  }
  result.west = west;
  result.south = south;
  result.east = east;
  result.north = north;
  return result;
};
Rectangle.union = function(rectangle, otherRectangle, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  Check_default.typeOf.object("otherRectangle", otherRectangle);
  if (!defined_default(result)) {
    result = new Rectangle();
  }
  let rectangleEast = rectangle.east;
  let rectangleWest = rectangle.west;
  let otherRectangleEast = otherRectangle.east;
  let otherRectangleWest = otherRectangle.west;
  if (rectangleEast < rectangleWest && otherRectangleEast > 0) {
    rectangleEast += Math_default.TWO_PI;
  } else if (otherRectangleEast < otherRectangleWest && rectangleEast > 0) {
    otherRectangleEast += Math_default.TWO_PI;
  }
  if (rectangleEast < rectangleWest && otherRectangleWest < 0) {
    otherRectangleWest += Math_default.TWO_PI;
  } else if (otherRectangleEast < otherRectangleWest && rectangleWest < 0) {
    rectangleWest += Math_default.TWO_PI;
  }
  const west = Math_default.negativePiToPi(
    Math.min(rectangleWest, otherRectangleWest)
  );
  const east = Math_default.negativePiToPi(
    Math.max(rectangleEast, otherRectangleEast)
  );
  result.west = west;
  result.south = Math.min(rectangle.south, otherRectangle.south);
  result.east = east;
  result.north = Math.max(rectangle.north, otherRectangle.north);
  return result;
};
Rectangle.expand = function(rectangle, cartographic, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  Check_default.typeOf.object("cartographic", cartographic);
  if (!defined_default(result)) {
    result = new Rectangle();
  }
  result.west = Math.min(rectangle.west, cartographic.longitude);
  result.south = Math.min(rectangle.south, cartographic.latitude);
  result.east = Math.max(rectangle.east, cartographic.longitude);
  result.north = Math.max(rectangle.north, cartographic.latitude);
  return result;
};
Rectangle.contains = function(rectangle, cartographic) {
  Check_default.typeOf.object("rectangle", rectangle);
  Check_default.typeOf.object("cartographic", cartographic);
  let longitude = cartographic.longitude;
  const latitude = cartographic.latitude;
  const west = rectangle.west;
  let east = rectangle.east;
  if (east < west) {
    east += Math_default.TWO_PI;
    if (longitude < 0) {
      longitude += Math_default.TWO_PI;
    }
  }
  return (longitude > west || Math_default.equalsEpsilon(longitude, west, Math_default.EPSILON14)) && (longitude < east || Math_default.equalsEpsilon(longitude, east, Math_default.EPSILON14)) && latitude >= rectangle.south && latitude <= rectangle.north;
};
var subsampleLlaScratch = new Cartographic_default();
Rectangle.subsample = function(rectangle, ellipsoid, surfaceHeight, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  ellipsoid = defaultValue_default(ellipsoid, Ellipsoid_default.WGS84);
  surfaceHeight = defaultValue_default(surfaceHeight, 0);
  if (!defined_default(result)) {
    result = [];
  }
  let length = 0;
  const north = rectangle.north;
  const south = rectangle.south;
  const east = rectangle.east;
  const west = rectangle.west;
  const lla = subsampleLlaScratch;
  lla.height = surfaceHeight;
  lla.longitude = west;
  lla.latitude = north;
  result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
  length++;
  lla.longitude = east;
  result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
  length++;
  lla.latitude = south;
  result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
  length++;
  lla.longitude = west;
  result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
  length++;
  if (north < 0) {
    lla.latitude = north;
  } else if (south > 0) {
    lla.latitude = south;
  } else {
    lla.latitude = 0;
  }
  for (let i = 1; i < 8; ++i) {
    lla.longitude = -Math.PI + i * Math_default.PI_OVER_TWO;
    if (Rectangle.contains(rectangle, lla)) {
      result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
      length++;
    }
  }
  if (lla.latitude === 0) {
    lla.longitude = west;
    result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
    length++;
    lla.longitude = east;
    result[length] = ellipsoid.cartographicToCartesian(lla, result[length]);
    length++;
  }
  result.length = length;
  return result;
};
Rectangle.subsection = function(rectangle, westLerp, southLerp, eastLerp, northLerp, result) {
  Check_default.typeOf.object("rectangle", rectangle);
  Check_default.typeOf.number.greaterThanOrEquals("westLerp", westLerp, 0);
  Check_default.typeOf.number.lessThanOrEquals("westLerp", westLerp, 1);
  Check_default.typeOf.number.greaterThanOrEquals("southLerp", southLerp, 0);
  Check_default.typeOf.number.lessThanOrEquals("southLerp", southLerp, 1);
  Check_default.typeOf.number.greaterThanOrEquals("eastLerp", eastLerp, 0);
  Check_default.typeOf.number.lessThanOrEquals("eastLerp", eastLerp, 1);
  Check_default.typeOf.number.greaterThanOrEquals("northLerp", northLerp, 0);
  Check_default.typeOf.number.lessThanOrEquals("northLerp", northLerp, 1);
  Check_default.typeOf.number.lessThanOrEquals("westLerp", westLerp, eastLerp);
  Check_default.typeOf.number.lessThanOrEquals("southLerp", southLerp, northLerp);
  if (!defined_default(result)) {
    result = new Rectangle();
  }
  if (rectangle.west <= rectangle.east) {
    const width = rectangle.east - rectangle.west;
    result.west = rectangle.west + westLerp * width;
    result.east = rectangle.west + eastLerp * width;
  } else {
    const width = Math_default.TWO_PI + rectangle.east - rectangle.west;
    result.west = Math_default.negativePiToPi(rectangle.west + westLerp * width);
    result.east = Math_default.negativePiToPi(rectangle.west + eastLerp * width);
  }
  const height = rectangle.north - rectangle.south;
  result.south = rectangle.south + southLerp * height;
  result.north = rectangle.south + northLerp * height;
  if (westLerp === 1) {
    result.west = rectangle.east;
  }
  if (eastLerp === 1) {
    result.east = rectangle.east;
  }
  if (southLerp === 1) {
    result.south = rectangle.north;
  }
  if (northLerp === 1) {
    result.north = rectangle.north;
  }
  return result;
};
Rectangle.MAX_VALUE = Object.freeze(
  new Rectangle(
    -Math.PI,
    -Math_default.PI_OVER_TWO,
    Math.PI,
    Math_default.PI_OVER_TWO
  )
);
var Rectangle_default = Rectangle;

// packages/engine/Source/Core/PrimitiveType.js
var PrimitiveType = {
  /**
   * Points primitive where each vertex (or index) is a separate point.
   *
   * @type {number}
   * @constant
   */
  POINTS: WebGLConstants_default.POINTS,
  /**
   * Lines primitive where each two vertices (or indices) is a line segment.  Line segments are not necessarily connected.
   *
   * @type {number}
   * @constant
   */
  LINES: WebGLConstants_default.LINES,
  /**
   * Line loop primitive where each vertex (or index) after the first connects a line to
   * the previous vertex, and the last vertex implicitly connects to the first.
   *
   * @type {number}
   * @constant
   */
  LINE_LOOP: WebGLConstants_default.LINE_LOOP,
  /**
   * Line strip primitive where each vertex (or index) after the first connects a line to the previous vertex.
   *
   * @type {number}
   * @constant
   */
  LINE_STRIP: WebGLConstants_default.LINE_STRIP,
  /**
   * Triangles primitive where each three vertices (or indices) is a triangle.  Triangles do not necessarily share edges.
   *
   * @type {number}
   * @constant
   */
  TRIANGLES: WebGLConstants_default.TRIANGLES,
  /**
   * Triangle strip primitive where each vertex (or index) after the first two connect to
   * the previous two vertices forming a triangle.  For example, this can be used to model a wall.
   *
   * @type {number}
   * @constant
   */
  TRIANGLE_STRIP: WebGLConstants_default.TRIANGLE_STRIP,
  /**
   * Triangle fan primitive where each vertex (or index) after the first two connect to
   * the previous vertex and the first vertex forming a triangle.  For example, this can be used
   * to model a cone or circle.
   *
   * @type {number}
   * @constant
   */
  TRIANGLE_FAN: WebGLConstants_default.TRIANGLE_FAN
};
PrimitiveType.isLines = function(primitiveType) {
  return primitiveType === PrimitiveType.LINES || primitiveType === PrimitiveType.LINE_LOOP || primitiveType === PrimitiveType.LINE_STRIP;
};
PrimitiveType.isTriangles = function(primitiveType) {
  return primitiveType === PrimitiveType.TRIANGLES || primitiveType === PrimitiveType.TRIANGLE_STRIP || primitiveType === PrimitiveType.TRIANGLE_FAN;
};
PrimitiveType.validate = function(primitiveType) {
  return primitiveType === PrimitiveType.POINTS || primitiveType === PrimitiveType.LINES || primitiveType === PrimitiveType.LINE_LOOP || primitiveType === PrimitiveType.LINE_STRIP || primitiveType === PrimitiveType.TRIANGLES || primitiveType === PrimitiveType.TRIANGLE_STRIP || primitiveType === PrimitiveType.TRIANGLE_FAN;
};
var PrimitiveType_default = Object.freeze(PrimitiveType);

// packages/engine/Source/Renderer/DrawCommand.js
var Flags = {
  CULL: 1,
  OCCLUDE: 2,
  EXECUTE_IN_CLOSEST_FRUSTUM: 4,
  DEBUG_SHOW_BOUNDING_VOLUME: 8,
  CAST_SHADOWS: 16,
  RECEIVE_SHADOWS: 32,
  PICK_ONLY: 64,
  DEPTH_FOR_TRANSLUCENT_CLASSIFICATION: 128
};
function DrawCommand(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  this._boundingVolume = options.boundingVolume;
  this._orientedBoundingBox = options.orientedBoundingBox;
  this._modelMatrix = options.modelMatrix;
  this._primitiveType = defaultValue_default(
    options.primitiveType,
    PrimitiveType_default.TRIANGLES
  );
  this._vertexArray = options.vertexArray;
  this._count = options.count;
  this._offset = defaultValue_default(options.offset, 0);
  this._instanceCount = defaultValue_default(options.instanceCount, 0);
  this._shaderProgram = options.shaderProgram;
  this._uniformMap = options.uniformMap;
  this._renderState = options.renderState;
  this._framebuffer = options.framebuffer;
  this._pass = options.pass;
  this._owner = options.owner;
  this._debugOverlappingFrustums = 0;
  this._pickId = options.pickId;
  this._flags = 0;
  this.cull = defaultValue_default(options.cull, true);
  this.occlude = defaultValue_default(options.occlude, true);
  this.executeInClosestFrustum = defaultValue_default(
    options.executeInClosestFrustum,
    false
  );
  this.debugShowBoundingVolume = defaultValue_default(
    options.debugShowBoundingVolume,
    false
  );
  this.castShadows = defaultValue_default(options.castShadows, false);
  this.receiveShadows = defaultValue_default(options.receiveShadows, false);
  this.pickOnly = defaultValue_default(options.pickOnly, false);
  this.depthForTranslucentClassification = defaultValue_default(
    options.depthForTranslucentClassification,
    false
  );
  this.dirty = true;
  this.lastDirtyTime = 0;
  this.derivedCommands = {};
}
function hasFlag(command, flag) {
  return (command._flags & flag) === flag;
}
function setFlag(command, flag, value) {
  if (value) {
    command._flags |= flag;
  } else {
    command._flags &= ~flag;
  }
}
Object.defineProperties(DrawCommand.prototype, {
  /**
   * The bounding volume of the geometry in world space.  This is used for culling and frustum selection.
   * <p>
   * For best rendering performance, use the tightest possible bounding volume.  Although
   * <code>undefined</code> is allowed, always try to provide a bounding volume to
   * allow the tightest possible near and far planes to be computed for the scene, and
   * minimize the number of frustums needed.
   * </p>
   *
   * @memberof DrawCommand.prototype
   * @type {object}
   * @default undefined
   *
   * @see DrawCommand#debugShowBoundingVolume
   */
  boundingVolume: {
    get: function() {
      return this._boundingVolume;
    },
    set: function(value) {
      if (this._boundingVolume !== value) {
        this._boundingVolume = value;
        this.dirty = true;
      }
    }
  },
  /**
   * The oriented bounding box of the geometry in world space. If this is defined, it is used instead of
   * {@link DrawCommand#boundingVolume} for plane intersection testing.
   *
   * @memberof DrawCommand.prototype
   * @type {OrientedBoundingBox}
   * @default undefined
   *
   * @see DrawCommand#debugShowBoundingVolume
   */
  orientedBoundingBox: {
    get: function() {
      return this._orientedBoundingBox;
    },
    set: function(value) {
      if (this._orientedBoundingBox !== value) {
        this._orientedBoundingBox = value;
        this.dirty = true;
      }
    }
  },
  /**
   * When <code>true</code>, the renderer frustum and horizon culls the command based on its {@link DrawCommand#boundingVolume}.
   * If the command was already culled, set this to <code>false</code> for a performance improvement.
   *
   * @memberof DrawCommand.prototype
   * @type {boolean}
   * @default true
   */
  cull: {
    get: function() {
      return hasFlag(this, Flags.CULL);
    },
    set: function(value) {
      if (hasFlag(this, Flags.CULL) !== value) {
        setFlag(this, Flags.CULL, value);
        this.dirty = true;
      }
    }
  },
  /**
   * When <code>true</code>, the horizon culls the command based on its {@link DrawCommand#boundingVolume}.
   * {@link DrawCommand#cull} must also be <code>true</code> in order for the command to be culled.
   *
   * @memberof DrawCommand.prototype
   * @type {boolean}
   * @default true
   */
  occlude: {
    get: function() {
      return hasFlag(this, Flags.OCCLUDE);
    },
    set: function(value) {
      if (hasFlag(this, Flags.OCCLUDE) !== value) {
        setFlag(this, Flags.OCCLUDE, value);
        this.dirty = true;
      }
    }
  },
  /**
   * The transformation from the geometry in model space to world space.
   * <p>
   * When <code>undefined</code>, the geometry is assumed to be defined in world space.
   * </p>
   *
   * @memberof DrawCommand.prototype
   * @type {Matrix4}
   * @default undefined
   */
  modelMatrix: {
    get: function() {
      return this._modelMatrix;
    },
    set: function(value) {
      if (this._modelMatrix !== value) {
        this._modelMatrix = value;
        this.dirty = true;
      }
    }
  },
  /**
   * The type of geometry in the vertex array.
   *
   * @memberof DrawCommand.prototype
   * @type {PrimitiveType}
   * @default PrimitiveType.TRIANGLES
   */
  primitiveType: {
    get: function() {
      return this._primitiveType;
    },
    set: function(value) {
      if (this._primitiveType !== value) {
        this._primitiveType = value;
        this.dirty = true;
      }
    }
  },
  /**
   * The vertex array.
   *
   * @memberof DrawCommand.prototype
   * @type {VertexArray}
   * @default undefined
   */
  vertexArray: {
    get: function() {
      return this._vertexArray;
    },
    set: function(value) {
      if (this._vertexArray !== value) {
        this._vertexArray = value;
        this.dirty = true;
      }
    }
  },
  /**
   * The number of vertices to draw in the vertex array.
   *
   * @memberof DrawCommand.prototype
   * @type {number}
   * @default undefined
   */
  count: {
    get: function() {
      return this._count;
    },
    set: function(value) {
      if (this._count !== value) {
        this._count = value;
        this.dirty = true;
      }
    }
  },
  /**
   * The offset to start drawing in the vertex array.
   *
   * @memberof DrawCommand.prototype
   * @type {number}
   * @default 0
   */
  offset: {
    get: function() {
      return this._offset;
    },
    set: function(value) {
      if (this._offset !== value) {
        this._offset = value;
        this.dirty = true;
      }
    }
  },
  /**
   * The number of instances to draw.
   *
   * @memberof DrawCommand.prototype
   * @type {number}
   * @default 0
   */
  instanceCount: {
    get: function() {
      return this._instanceCount;
    },
    set: function(value) {
      if (this._instanceCount !== value) {
        this._instanceCount = value;
        this.dirty = true;
      }
    }
  },
  /**
   * The shader program to apply.
   *
   * @memberof DrawCommand.prototype
   * @type {ShaderProgram}
   * @default undefined
   */
  shaderProgram: {
    get: function() {
      return this._shaderProgram;
    },
    set: function(value) {
      if (this._shaderProgram !== value) {
        this._shaderProgram = value;
        this.dirty = true;
      }
    }
  },
  /**
   * Whether this command should cast shadows when shadowing is enabled.
   *
   * @memberof DrawCommand.prototype
   * @type {boolean}
   * @default false
   */
  castShadows: {
    get: function() {
      return hasFlag(this, Flags.CAST_SHADOWS);
    },
    set: function(value) {
      if (hasFlag(this, Flags.CAST_SHADOWS) !== value) {
        setFlag(this, Flags.CAST_SHADOWS, value);
        this.dirty = true;
      }
    }
  },
  /**
   * Whether this command should receive shadows when shadowing is enabled.
   *
   * @memberof DrawCommand.prototype
   * @type {boolean}
   * @default false
   */
  receiveShadows: {
    get: function() {
      return hasFlag(this, Flags.RECEIVE_SHADOWS);
    },
    set: function(value) {
      if (hasFlag(this, Flags.RECEIVE_SHADOWS) !== value) {
        setFlag(this, Flags.RECEIVE_SHADOWS, value);
        this.dirty = true;
      }
    }
  },
  /**
   * An object with functions whose names match the uniforms in the shader program
   * and return values to set those uniforms.
   *
   * @memberof DrawCommand.prototype
   * @type {object}
   * @default undefined
   */
  uniformMap: {
    get: function() {
      return this._uniformMap;
    },
    set: function(value) {
      if (this._uniformMap !== value) {
        this._uniformMap = value;
        this.dirty = true;
      }
    }
  },
  /**
   * The render state.
   *
   * @memberof DrawCommand.prototype
   * @type {RenderState}
   * @default undefined
   */
  renderState: {
    get: function() {
      return this._renderState;
    },
    set: function(value) {
      if (this._renderState !== value) {
        this._renderState = value;
        this.dirty = true;
      }
    }
  },
  /**
   * The framebuffer to draw to.
   *
   * @memberof DrawCommand.prototype
   * @type {Framebuffer}
   * @default undefined
   */
  framebuffer: {
    get: function() {
      return this._framebuffer;
    },
    set: function(value) {
      if (this._framebuffer !== value) {
        this._framebuffer = value;
        this.dirty = true;
      }
    }
  },
  /**
   * The pass when to render.
   *
   * @memberof DrawCommand.prototype
   * @type {Pass}
   * @default undefined
   */
  pass: {
    get: function() {
      return this._pass;
    },
    set: function(value) {
      if (this._pass !== value) {
        this._pass = value;
        this.dirty = true;
      }
    }
  },
  /**
   * Specifies if this command is only to be executed in the frustum closest
   * to the eye containing the bounding volume. Defaults to <code>false</code>.
   *
   * @memberof DrawCommand.prototype
   * @type {boolean}
   * @default false
   */
  executeInClosestFrustum: {
    get: function() {
      return hasFlag(this, Flags.EXECUTE_IN_CLOSEST_FRUSTUM);
    },
    set: function(value) {
      if (hasFlag(this, Flags.EXECUTE_IN_CLOSEST_FRUSTUM) !== value) {
        setFlag(this, Flags.EXECUTE_IN_CLOSEST_FRUSTUM, value);
        this.dirty = true;
      }
    }
  },
  /**
   * The object who created this command.  This is useful for debugging command
   * execution; it allows us to see who created a command when we only have a
   * reference to the command, and can be used to selectively execute commands
   * with {@link Scene#debugCommandFilter}.
   *
   * @memberof DrawCommand.prototype
   * @type {object}
   * @default undefined
   *
   * @see Scene#debugCommandFilter
   */
  owner: {
    get: function() {
      return this._owner;
    },
    set: function(value) {
      if (this._owner !== value) {
        this._owner = value;
        this.dirty = true;
      }
    }
  },
  /**
   * This property is for debugging only; it is not for production use nor is it optimized.
   * <p>
   * Draws the {@link DrawCommand#boundingVolume} for this command, assuming it is a sphere, when the command executes.
   * </p>
   *
   * @memberof DrawCommand.prototype
   * @type {boolean}
   * @default false
   *
   * @see DrawCommand#boundingVolume
   */
  debugShowBoundingVolume: {
    get: function() {
      return hasFlag(this, Flags.DEBUG_SHOW_BOUNDING_VOLUME);
    },
    set: function(value) {
      if (hasFlag(this, Flags.DEBUG_SHOW_BOUNDING_VOLUME) !== value) {
        setFlag(this, Flags.DEBUG_SHOW_BOUNDING_VOLUME, value);
        this.dirty = true;
      }
    }
  },
  /**
   * Used to implement Scene.debugShowFrustums.
   * @private
   */
  debugOverlappingFrustums: {
    get: function() {
      return this._debugOverlappingFrustums;
    },
    set: function(value) {
      if (this._debugOverlappingFrustums !== value) {
        this._debugOverlappingFrustums = value;
        this.dirty = true;
      }
    }
  },
  /**
   * A GLSL string that will evaluate to a pick id. When <code>undefined</code>, the command will only draw depth
   * during the pick pass.
   *
   * @memberof DrawCommand.prototype
   * @type {string}
   * @default undefined
   */
  pickId: {
    get: function() {
      return this._pickId;
    },
    set: function(value) {
      if (this._pickId !== value) {
        this._pickId = value;
        this.dirty = true;
      }
    }
  },
  /**
   * Whether this command should be executed in the pick pass only.
   *
   * @memberof DrawCommand.prototype
   * @type {boolean}
   * @default false
   */
  pickOnly: {
    get: function() {
      return hasFlag(this, Flags.PICK_ONLY);
    },
    set: function(value) {
      if (hasFlag(this, Flags.PICK_ONLY) !== value) {
        setFlag(this, Flags.PICK_ONLY, value);
        this.dirty = true;
      }
    }
  },
  /**
   * Whether this command should be derived to draw depth for classification of translucent primitives.
   *
   * @memberof DrawCommand.prototype
   * @type {boolean}
   * @default false
   */
  depthForTranslucentClassification: {
    get: function() {
      return hasFlag(this, Flags.DEPTH_FOR_TRANSLUCENT_CLASSIFICATION);
    },
    set: function(value) {
      if (hasFlag(this, Flags.DEPTH_FOR_TRANSLUCENT_CLASSIFICATION) !== value) {
        setFlag(this, Flags.DEPTH_FOR_TRANSLUCENT_CLASSIFICATION, value);
        this.dirty = true;
      }
    }
  }
});
DrawCommand.shallowClone = function(command, result) {
  if (!defined_default(command)) {
    return void 0;
  }
  if (!defined_default(result)) {
    result = new DrawCommand();
  }
  result._boundingVolume = command._boundingVolume;
  result._orientedBoundingBox = command._orientedBoundingBox;
  result._modelMatrix = command._modelMatrix;
  result._primitiveType = command._primitiveType;
  result._vertexArray = command._vertexArray;
  result._count = command._count;
  result._offset = command._offset;
  result._instanceCount = command._instanceCount;
  result._shaderProgram = command._shaderProgram;
  result._uniformMap = command._uniformMap;
  result._renderState = command._renderState;
  result._framebuffer = command._framebuffer;
  result._pass = command._pass;
  result._owner = command._owner;
  result._debugOverlappingFrustums = command._debugOverlappingFrustums;
  result._pickId = command._pickId;
  result._flags = command._flags;
  result.dirty = true;
  result.lastDirtyTime = 0;
  return result;
};
DrawCommand.prototype.execute = function(context, passState) {
  context.draw(this, passState);
};
var DrawCommand_default = DrawCommand;

// packages/engine/Source/Renderer/ContextLimits.js
var ContextLimits = {
  _maximumCombinedTextureImageUnits: 0,
  _maximumCubeMapSize: 0,
  _maximumFragmentUniformVectors: 0,
  _maximumTextureImageUnits: 0,
  _maximumRenderbufferSize: 0,
  _maximumTextureSize: 0,
  _maximumVaryingVectors: 0,
  _maximumVertexAttributes: 0,
  _maximumVertexTextureImageUnits: 0,
  _maximumVertexUniformVectors: 0,
  _minimumAliasedLineWidth: 0,
  _maximumAliasedLineWidth: 0,
  _minimumAliasedPointSize: 0,
  _maximumAliasedPointSize: 0,
  _maximumViewportWidth: 0,
  _maximumViewportHeight: 0,
  _maximumTextureFilterAnisotropy: 0,
  _maximumDrawBuffers: 0,
  _maximumColorAttachments: 0,
  _maximumSamples: 0,
  _highpFloatSupported: false,
  _highpIntSupported: false
};
Object.defineProperties(ContextLimits, {
  /**
   * The maximum number of texture units that can be used from the vertex and fragment
   * shader with this WebGL implementation.  The minimum is eight.  If both shaders access the
   * same texture unit, this counts as two texture units.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_COMBINED_TEXTURE_IMAGE_UNITS</code>.
   */
  maximumCombinedTextureImageUnits: {
    get: function() {
      return ContextLimits._maximumCombinedTextureImageUnits;
    }
  },
  /**
   * The approximate maximum cube mape width and height supported by this WebGL implementation.
   * The minimum is 16, but most desktop and laptop implementations will support much larger sizes like 8,192.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_CUBE_MAP_TEXTURE_SIZE</code>.
   */
  maximumCubeMapSize: {
    get: function() {
      return ContextLimits._maximumCubeMapSize;
    }
  },
  /**
   * The maximum number of <code>vec4</code>, <code>ivec4</code>, and <code>bvec4</code>
   * uniforms that can be used by a fragment shader with this WebGL implementation.  The minimum is 16.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_FRAGMENT_UNIFORM_VECTORS</code>.
   */
  maximumFragmentUniformVectors: {
    get: function() {
      return ContextLimits._maximumFragmentUniformVectors;
    }
  },
  /**
   * The maximum number of texture units that can be used from the fragment shader with this WebGL implementation.  The minimum is eight.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_TEXTURE_IMAGE_UNITS</code>.
   */
  maximumTextureImageUnits: {
    get: function() {
      return ContextLimits._maximumTextureImageUnits;
    }
  },
  /**
   * The maximum renderbuffer width and height supported by this WebGL implementation.
   * The minimum is 16, but most desktop and laptop implementations will support much larger sizes like 8,192.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_RENDERBUFFER_SIZE</code>.
   */
  maximumRenderbufferSize: {
    get: function() {
      return ContextLimits._maximumRenderbufferSize;
    }
  },
  /**
   * The approximate maximum texture width and height supported by this WebGL implementation.
   * The minimum is 64, but most desktop and laptop implementations will support much larger sizes like 8,192.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_TEXTURE_SIZE</code>.
   */
  maximumTextureSize: {
    get: function() {
      return ContextLimits._maximumTextureSize;
    }
  },
  /**
   * The maximum number of <code>vec4</code> varying variables supported by this WebGL implementation.
   * The minimum is eight.  Matrices and arrays count as multiple <code>vec4</code>s.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VARYING_VECTORS</code>.
   */
  maximumVaryingVectors: {
    get: function() {
      return ContextLimits._maximumVaryingVectors;
    }
  },
  /**
   * The maximum number of <code>vec4</code> vertex attributes supported by this WebGL implementation.  The minimum is eight.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VERTEX_ATTRIBS</code>.
   */
  maximumVertexAttributes: {
    get: function() {
      return ContextLimits._maximumVertexAttributes;
    }
  },
  /**
   * The maximum number of texture units that can be used from the vertex shader with this WebGL implementation.
   * The minimum is zero, which means the GL does not support vertex texture fetch.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VERTEX_TEXTURE_IMAGE_UNITS</code>.
   */
  maximumVertexTextureImageUnits: {
    get: function() {
      return ContextLimits._maximumVertexTextureImageUnits;
    }
  },
  /**
   * The maximum number of <code>vec4</code>, <code>ivec4</code>, and <code>bvec4</code>
   * uniforms that can be used by a vertex shader with this WebGL implementation.  The minimum is 16.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VERTEX_UNIFORM_VECTORS</code>.
   */
  maximumVertexUniformVectors: {
    get: function() {
      return ContextLimits._maximumVertexUniformVectors;
    }
  },
  /**
   * The minimum aliased line width, in pixels, supported by this WebGL implementation.  It will be at most one.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_LINE_WIDTH_RANGE</code>.
   */
  minimumAliasedLineWidth: {
    get: function() {
      return ContextLimits._minimumAliasedLineWidth;
    }
  },
  /**
   * The maximum aliased line width, in pixels, supported by this WebGL implementation.  It will be at least one.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_LINE_WIDTH_RANGE</code>.
   */
  maximumAliasedLineWidth: {
    get: function() {
      return ContextLimits._maximumAliasedLineWidth;
    }
  },
  /**
   * The minimum aliased point size, in pixels, supported by this WebGL implementation.  It will be at most one.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_POINT_SIZE_RANGE</code>.
   */
  minimumAliasedPointSize: {
    get: function() {
      return ContextLimits._minimumAliasedPointSize;
    }
  },
  /**
   * The maximum aliased point size, in pixels, supported by this WebGL implementation.  It will be at least one.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>ALIASED_POINT_SIZE_RANGE</code>.
   */
  maximumAliasedPointSize: {
    get: function() {
      return ContextLimits._maximumAliasedPointSize;
    }
  },
  /**
   * The maximum supported width of the viewport.  It will be at least as large as the visible width of the associated canvas.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VIEWPORT_DIMS</code>.
   */
  maximumViewportWidth: {
    get: function() {
      return ContextLimits._maximumViewportWidth;
    }
  },
  /**
   * The maximum supported height of the viewport.  It will be at least as large as the visible height of the associated canvas.
   * @memberof ContextLimits
   * @type {number}
   * @see {@link https://www.khronos.org/opengles/sdk/docs/man/xhtml/glGet.xml|glGet} with <code>MAX_VIEWPORT_DIMS</code>.
   */
  maximumViewportHeight: {
    get: function() {
      return ContextLimits._maximumViewportHeight;
    }
  },
  /**
   * The maximum degree of anisotropy for texture filtering
   * @memberof ContextLimits
   * @type {number}
   */
  maximumTextureFilterAnisotropy: {
    get: function() {
      return ContextLimits._maximumTextureFilterAnisotropy;
    }
  },
  /**
   * The maximum number of simultaneous outputs that may be written in a fragment shader.
   * @memberof ContextLimits
   * @type {number}
   */
  maximumDrawBuffers: {
    get: function() {
      return ContextLimits._maximumDrawBuffers;
    }
  },
  /**
   * The maximum number of color attachments supported.
   * @memberof ContextLimits
   * @type {number}
   */
  maximumColorAttachments: {
    get: function() {
      return ContextLimits._maximumColorAttachments;
    }
  },
  /**
   * The maximum number of samples supported for multisampling.
   * @memberof ContextLimits
   * @type {number}
   */
  maximumSamples: {
    get: function() {
      return ContextLimits._maximumSamples;
    }
  },
  /**
   * High precision float supported (<code>highp</code>) in fragment shaders.
   * @memberof ContextLimits
   * @type {boolean}
   */
  highpFloatSupported: {
    get: function() {
      return ContextLimits._highpFloatSupported;
    }
  },
  /**
   * High precision int supported (<code>highp</code>) in fragment shaders.
   * @memberof ContextLimits
   * @type {boolean}
   */
  highpIntSupported: {
    get: function() {
      return ContextLimits._highpIntSupported;
    }
  }
});
var ContextLimits_default = ContextLimits;

// packages/engine/Source/Core/Matrix2.js
function Matrix2(column0Row0, column1Row0, column0Row1, column1Row1) {
  this[0] = defaultValue_default(column0Row0, 0);
  this[1] = defaultValue_default(column0Row1, 0);
  this[2] = defaultValue_default(column1Row0, 0);
  this[3] = defaultValue_default(column1Row1, 0);
}
Matrix2.packedLength = 4;
Matrix2.pack = function(value, array, startingIndex) {
  Check_default.typeOf.object("value", value);
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  array[startingIndex++] = value[0];
  array[startingIndex++] = value[1];
  array[startingIndex++] = value[2];
  array[startingIndex++] = value[3];
  return array;
};
Matrix2.unpack = function(array, startingIndex, result) {
  Check_default.defined("array", array);
  startingIndex = defaultValue_default(startingIndex, 0);
  if (!defined_default(result)) {
    result = new Matrix2();
  }
  result[0] = array[startingIndex++];
  result[1] = array[startingIndex++];
  result[2] = array[startingIndex++];
  result[3] = array[startingIndex++];
  return result;
};
Matrix2.packArray = function(array, result) {
  Check_default.defined("array", array);
  const length = array.length;
  const resultLength = length * 4;
  if (!defined_default(result)) {
    result = new Array(resultLength);
  } else if (!Array.isArray(result) && result.length !== resultLength) {
    throw new DeveloperError_default(
      "If result is a typed array, it must have exactly array.length * 4 elements"
    );
  } else if (result.length !== resultLength) {
    result.length = resultLength;
  }
  for (let i = 0; i < length; ++i) {
    Matrix2.pack(array[i], result, i * 4);
  }
  return result;
};
Matrix2.unpackArray = function(array, result) {
  Check_default.defined("array", array);
  Check_default.typeOf.number.greaterThanOrEquals("array.length", array.length, 4);
  if (array.length % 4 !== 0) {
    throw new DeveloperError_default("array length must be a multiple of 4.");
  }
  const length = array.length;
  if (!defined_default(result)) {
    result = new Array(length / 4);
  } else {
    result.length = length / 4;
  }
  for (let i = 0; i < length; i += 4) {
    const index = i / 4;
    result[index] = Matrix2.unpack(array, i, result[index]);
  }
  return result;
};
Matrix2.clone = function(matrix, result) {
  if (!defined_default(matrix)) {
    return void 0;
  }
  if (!defined_default(result)) {
    return new Matrix2(matrix[0], matrix[2], matrix[1], matrix[3]);
  }
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  return result;
};
Matrix2.fromArray = Matrix2.unpack;
Matrix2.fromColumnMajorArray = function(values, result) {
  Check_default.defined("values", values);
  return Matrix2.clone(values, result);
};
Matrix2.fromRowMajorArray = function(values, result) {
  Check_default.defined("values", values);
  if (!defined_default(result)) {
    return new Matrix2(values[0], values[1], values[2], values[3]);
  }
  result[0] = values[0];
  result[1] = values[2];
  result[2] = values[1];
  result[3] = values[3];
  return result;
};
Matrix2.fromScale = function(scale, result) {
  Check_default.typeOf.object("scale", scale);
  if (!defined_default(result)) {
    return new Matrix2(scale.x, 0, 0, scale.y);
  }
  result[0] = scale.x;
  result[1] = 0;
  result[2] = 0;
  result[3] = scale.y;
  return result;
};
Matrix2.fromUniformScale = function(scale, result) {
  Check_default.typeOf.number("scale", scale);
  if (!defined_default(result)) {
    return new Matrix2(scale, 0, 0, scale);
  }
  result[0] = scale;
  result[1] = 0;
  result[2] = 0;
  result[3] = scale;
  return result;
};
Matrix2.fromRotation = function(angle, result) {
  Check_default.typeOf.number("angle", angle);
  const cosAngle = Math.cos(angle);
  const sinAngle = Math.sin(angle);
  if (!defined_default(result)) {
    return new Matrix2(cosAngle, -sinAngle, sinAngle, cosAngle);
  }
  result[0] = cosAngle;
  result[1] = sinAngle;
  result[2] = -sinAngle;
  result[3] = cosAngle;
  return result;
};
Matrix2.toArray = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  if (!defined_default(result)) {
    return [matrix[0], matrix[1], matrix[2], matrix[3]];
  }
  result[0] = matrix[0];
  result[1] = matrix[1];
  result[2] = matrix[2];
  result[3] = matrix[3];
  return result;
};
Matrix2.getElementIndex = function(column, row) {
  Check_default.typeOf.number.greaterThanOrEquals("row", row, 0);
  Check_default.typeOf.number.lessThanOrEquals("row", row, 1);
  Check_default.typeOf.number.greaterThanOrEquals("column", column, 0);
  Check_default.typeOf.number.lessThanOrEquals("column", column, 1);
  return column * 2 + row;
};
Matrix2.getColumn = function(matrix, index, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 1);
  Check_default.typeOf.object("result", result);
  const startIndex = index * 2;
  const x = matrix[startIndex];
  const y = matrix[startIndex + 1];
  result.x = x;
  result.y = y;
  return result;
};
Matrix2.setColumn = function(matrix, index, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 1);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result = Matrix2.clone(matrix, result);
  const startIndex = index * 2;
  result[startIndex] = cartesian.x;
  result[startIndex + 1] = cartesian.y;
  return result;
};
Matrix2.getRow = function(matrix, index, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 1);
  Check_default.typeOf.object("result", result);
  const x = matrix[index];
  const y = matrix[index + 2];
  result.x = x;
  result.y = y;
  return result;
};
Matrix2.setRow = function(matrix, index, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number.greaterThanOrEquals("index", index, 0);
  Check_default.typeOf.number.lessThanOrEquals("index", index, 1);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  result = Matrix2.clone(matrix, result);
  result[index] = cartesian.x;
  result[index + 2] = cartesian.y;
  return result;
};
var scaleScratch13 = new Cartesian2_default();
Matrix2.setScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("scale", scale);
  Check_default.typeOf.object("result", result);
  const existingScale = Matrix2.getScale(matrix, scaleScratch13);
  const scaleRatioX = scale.x / existingScale.x;
  const scaleRatioY = scale.y / existingScale.y;
  result[0] = matrix[0] * scaleRatioX;
  result[1] = matrix[1] * scaleRatioX;
  result[2] = matrix[2] * scaleRatioY;
  result[3] = matrix[3] * scaleRatioY;
  return result;
};
var scaleScratch23 = new Cartesian2_default();
Matrix2.setUniformScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scale", scale);
  Check_default.typeOf.object("result", result);
  const existingScale = Matrix2.getScale(matrix, scaleScratch23);
  const scaleRatioX = scale / existingScale.x;
  const scaleRatioY = scale / existingScale.y;
  result[0] = matrix[0] * scaleRatioX;
  result[1] = matrix[1] * scaleRatioX;
  result[2] = matrix[2] * scaleRatioY;
  result[3] = matrix[3] * scaleRatioY;
  return result;
};
var scratchColumn3 = new Cartesian2_default();
Matrix2.getScale = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result.x = Cartesian2_default.magnitude(
    Cartesian2_default.fromElements(matrix[0], matrix[1], scratchColumn3)
  );
  result.y = Cartesian2_default.magnitude(
    Cartesian2_default.fromElements(matrix[2], matrix[3], scratchColumn3)
  );
  return result;
};
var scaleScratch33 = new Cartesian2_default();
Matrix2.getMaximumScale = function(matrix) {
  Matrix2.getScale(matrix, scaleScratch33);
  return Cartesian2_default.maximumComponent(scaleScratch33);
};
var scaleScratch43 = new Cartesian2_default();
Matrix2.setRotation = function(matrix, rotation, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const scale = Matrix2.getScale(matrix, scaleScratch43);
  result[0] = rotation[0] * scale.x;
  result[1] = rotation[1] * scale.x;
  result[2] = rotation[2] * scale.y;
  result[3] = rotation[3] * scale.y;
  return result;
};
var scaleScratch53 = new Cartesian2_default();
Matrix2.getRotation = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const scale = Matrix2.getScale(matrix, scaleScratch53);
  result[0] = matrix[0] / scale.x;
  result[1] = matrix[1] / scale.x;
  result[2] = matrix[2] / scale.y;
  result[3] = matrix[3] / scale.y;
  return result;
};
Matrix2.multiply = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  const column0Row0 = left[0] * right[0] + left[2] * right[1];
  const column1Row0 = left[0] * right[2] + left[2] * right[3];
  const column0Row1 = left[1] * right[0] + left[3] * right[1];
  const column1Row1 = left[1] * right[2] + left[3] * right[3];
  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column1Row0;
  result[3] = column1Row1;
  return result;
};
Matrix2.add = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result[0] = left[0] + right[0];
  result[1] = left[1] + right[1];
  result[2] = left[2] + right[2];
  result[3] = left[3] + right[3];
  return result;
};
Matrix2.subtract = function(left, right, result) {
  Check_default.typeOf.object("left", left);
  Check_default.typeOf.object("right", right);
  Check_default.typeOf.object("result", result);
  result[0] = left[0] - right[0];
  result[1] = left[1] - right[1];
  result[2] = left[2] - right[2];
  result[3] = left[3] - right[3];
  return result;
};
Matrix2.multiplyByVector = function(matrix, cartesian, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("cartesian", cartesian);
  Check_default.typeOf.object("result", result);
  const x = matrix[0] * cartesian.x + matrix[2] * cartesian.y;
  const y = matrix[1] * cartesian.x + matrix[3] * cartesian.y;
  result.x = x;
  result.y = y;
  return result;
};
Matrix2.multiplyByScalar = function(matrix, scalar, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scalar", scalar);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0] * scalar;
  result[1] = matrix[1] * scalar;
  result[2] = matrix[2] * scalar;
  result[3] = matrix[3] * scalar;
  return result;
};
Matrix2.multiplyByScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("scale", scale);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0] * scale.x;
  result[1] = matrix[1] * scale.x;
  result[2] = matrix[2] * scale.y;
  result[3] = matrix[3] * scale.y;
  return result;
};
Matrix2.multiplyByUniformScale = function(matrix, scale, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.number("scale", scale);
  Check_default.typeOf.object("result", result);
  result[0] = matrix[0] * scale;
  result[1] = matrix[1] * scale;
  result[2] = matrix[2] * scale;
  result[3] = matrix[3] * scale;
  return result;
};
Matrix2.negate = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result[0] = -matrix[0];
  result[1] = -matrix[1];
  result[2] = -matrix[2];
  result[3] = -matrix[3];
  return result;
};
Matrix2.transpose = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  const column0Row0 = matrix[0];
  const column0Row1 = matrix[2];
  const column1Row0 = matrix[1];
  const column1Row1 = matrix[3];
  result[0] = column0Row0;
  result[1] = column0Row1;
  result[2] = column1Row0;
  result[3] = column1Row1;
  return result;
};
Matrix2.abs = function(matrix, result) {
  Check_default.typeOf.object("matrix", matrix);
  Check_default.typeOf.object("result", result);
  result[0] = Math.abs(matrix[0]);
  result[1] = Math.abs(matrix[1]);
  result[2] = Math.abs(matrix[2]);
  result[3] = Math.abs(matrix[3]);
  return result;
};
Matrix2.equals = function(left, right) {
  return left === right || defined_default(left) && defined_default(right) && left[0] === right[0] && left[1] === right[1] && left[2] === right[2] && left[3] === right[3];
};
Matrix2.equalsArray = function(matrix, array, offset) {
  return matrix[0] === array[offset] && matrix[1] === array[offset + 1] && matrix[2] === array[offset + 2] && matrix[3] === array[offset + 3];
};
Matrix2.equalsEpsilon = function(left, right, epsilon) {
  epsilon = defaultValue_default(epsilon, 0);
  return left === right || defined_default(left) && defined_default(right) && Math.abs(left[0] - right[0]) <= epsilon && Math.abs(left[1] - right[1]) <= epsilon && Math.abs(left[2] - right[2]) <= epsilon && Math.abs(left[3] - right[3]) <= epsilon;
};
Matrix2.IDENTITY = Object.freeze(new Matrix2(1, 0, 0, 1));
Matrix2.ZERO = Object.freeze(new Matrix2(0, 0, 0, 0));
Matrix2.COLUMN0ROW0 = 0;
Matrix2.COLUMN0ROW1 = 1;
Matrix2.COLUMN1ROW0 = 2;
Matrix2.COLUMN1ROW1 = 3;
Object.defineProperties(Matrix2.prototype, {
  /**
   * Gets the number of items in the collection.
   * @memberof Matrix2.prototype
   *
   * @type {number}
   */
  length: {
    get: function() {
      return Matrix2.packedLength;
    }
  }
});
Matrix2.prototype.clone = function(result) {
  return Matrix2.clone(this, result);
};
Matrix2.prototype.equals = function(right) {
  return Matrix2.equals(this, right);
};
Matrix2.prototype.equalsEpsilon = function(right, epsilon) {
  return Matrix2.equalsEpsilon(this, right, epsilon);
};
Matrix2.prototype.toString = function() {
  return `(${this[0]}, ${this[2]})
(${this[1]}, ${this[3]})`;
};
var Matrix2_default = Matrix2;

// packages/engine/Source/Renderer/createUniform.js
function createUniform(gl, activeUniform, uniformName, location2) {
  switch (activeUniform.type) {
    case gl.FLOAT:
      return new UniformFloat(gl, activeUniform, uniformName, location2);
    case gl.FLOAT_VEC2:
      return new UniformFloatVec2(gl, activeUniform, uniformName, location2);
    case gl.FLOAT_VEC3:
      return new UniformFloatVec3(gl, activeUniform, uniformName, location2);
    case gl.FLOAT_VEC4:
      return new UniformFloatVec4(gl, activeUniform, uniformName, location2);
    case gl.SAMPLER_2D:
    case gl.SAMPLER_CUBE:
      return new UniformSampler(gl, activeUniform, uniformName, location2);
    case gl.INT:
    case gl.BOOL:
      return new UniformInt(gl, activeUniform, uniformName, location2);
    case gl.INT_VEC2:
    case gl.BOOL_VEC2:
      return new UniformIntVec2(gl, activeUniform, uniformName, location2);
    case gl.INT_VEC3:
    case gl.BOOL_VEC3:
      return new UniformIntVec3(gl, activeUniform, uniformName, location2);
    case gl.INT_VEC4:
    case gl.BOOL_VEC4:
      return new UniformIntVec4(gl, activeUniform, uniformName, location2);
    case gl.FLOAT_MAT2:
      return new UniformMat2(gl, activeUniform, uniformName, location2);
    case gl.FLOAT_MAT3:
      return new UniformMat3(gl, activeUniform, uniformName, location2);
    case gl.FLOAT_MAT4:
      return new UniformMat4(gl, activeUniform, uniformName, location2);
    default:
      throw new RuntimeError_default(
        `Unrecognized uniform type: ${activeUniform.type} for uniform "${uniformName}".`
      );
  }
}
function UniformFloat(gl, activeUniform, uniformName, location2) {
  this.name = uniformName;
  this.value = void 0;
  this._value = 0;
  this._gl = gl;
  this._location = location2;
}
UniformFloat.prototype.set = function() {
  if (this.value !== this._value) {
    this._value = this.value;
    this._gl.uniform1f(this._location, this.value);
  }
};
function UniformFloatVec2(gl, activeUniform, uniformName, location2) {
  this.name = uniformName;
  this.value = void 0;
  this._value = new Cartesian2_default();
  this._gl = gl;
  this._location = location2;
}
UniformFloatVec2.prototype.set = function() {
  const v2 = this.value;
  if (!Cartesian2_default.equals(v2, this._value)) {
    Cartesian2_default.clone(v2, this._value);
    this._gl.uniform2f(this._location, v2.x, v2.y);
  }
};
function UniformFloatVec3(gl, activeUniform, uniformName, location2) {
  this.name = uniformName;
  this.value = void 0;
  this._value = void 0;
  this._gl = gl;
  this._location = location2;
}
UniformFloatVec3.prototype.set = function() {
  const v2 = this.value;
  if (defined_default(v2.red)) {
    if (!Color_default.equals(v2, this._value)) {
      this._value = Color_default.clone(v2, this._value);
      this._gl.uniform3f(this._location, v2.red, v2.green, v2.blue);
    }
  } else if (defined_default(v2.x)) {
    if (!Cartesian3_default.equals(v2, this._value)) {
      this._value = Cartesian3_default.clone(v2, this._value);
      this._gl.uniform3f(this._location, v2.x, v2.y, v2.z);
    }
  } else {
    throw new DeveloperError_default(`Invalid vec3 value for uniform "${this.name}".`);
  }
};
function UniformFloatVec4(gl, activeUniform, uniformName, location2) {
  this.name = uniformName;
  this.value = void 0;
  this._value = void 0;
  this._gl = gl;
  this._location = location2;
}
UniformFloatVec4.prototype.set = function() {
  const v2 = this.value;
  if (defined_default(v2.red)) {
    if (!Color_default.equals(v2, this._value)) {
      this._value = Color_default.clone(v2, this._value);
      this._gl.uniform4f(this._location, v2.red, v2.green, v2.blue, v2.alpha);
    }
  } else if (defined_default(v2.x)) {
    if (!Cartesian4_default.equals(v2, this._value)) {
      this._value = Cartesian4_default.clone(v2, this._value);
      this._gl.uniform4f(this._location, v2.x, v2.y, v2.z, v2.w);
    }
  } else {
    throw new DeveloperError_default(`Invalid vec4 value for uniform "${this.name}".`);
  }
};
function UniformSampler(gl, activeUniform, uniformName, location2) {
  this.name = uniformName;
  this.value = void 0;
  this._gl = gl;
  this._location = location2;
  this.textureUnitIndex = void 0;
}
UniformSampler.prototype.set = function() {
  const gl = this._gl;
  gl.activeTexture(gl.TEXTURE0 + this.textureUnitIndex);
  const v2 = this.value;
  gl.bindTexture(v2._target, v2._texture);
};
UniformSampler.prototype._setSampler = function(textureUnitIndex) {
  this.textureUnitIndex = textureUnitIndex;
  this._gl.uniform1i(this._location, textureUnitIndex);
  return textureUnitIndex + 1;
};
function UniformInt(gl, activeUniform, uniformName, location2) {
  this.name = uniformName;
  this.value = void 0;
  this._value = 0;
  this._gl = gl;
  this._location = location2;
}
UniformInt.prototype.set = function() {
  if (this.value !== this._value) {
    this._value = this.value;
    this._gl.uniform1i(this._location, this.value);
  }
};
function UniformIntVec2(gl, activeUniform, uniformName, location2) {
  this.name = uniformName;
  this.value = void 0;
  this._value = new Cartesian2_default();
  this._gl = gl;
  this._location = location2;
}
UniformIntVec2.prototype.set = function() {
  const v2 = this.value;
  if (!Cartesian2_default.equals(v2, this._value)) {
    Cartesian2_default.clone(v2, this._value);
    this._gl.uniform2i(this._location, v2.x, v2.y);
  }
};
function UniformIntVec3(gl, activeUniform, uniformName, location2) {
  this.name = uniformName;
  this.value = void 0;
  this._value = new Cartesian3_default();
  this._gl = gl;
  this._location = location2;
}
UniformIntVec3.prototype.set = function() {
  const v2 = this.value;
  if (!Cartesian3_default.equals(v2, this._value)) {
    Cartesian3_default.clone(v2, this._value);
    this._gl.uniform3i(this._location, v2.x, v2.y, v2.z);
  }
};
function UniformIntVec4(gl, activeUniform, uniformName, location2) {
  this.name = uniformName;
  this.value = void 0;
  this._value = new Cartesian4_default();
  this._gl = gl;
  this._location = location2;
}
UniformIntVec4.prototype.set = function() {
  const v2 = this.value;
  if (!Cartesian4_default.equals(v2, this._value)) {
    Cartesian4_default.clone(v2, this._value);
    this._gl.uniform4i(this._location, v2.x, v2.y, v2.z, v2.w);
  }
};
var scratchUniformArray = new Float32Array(4);
function UniformMat2(gl, activeUniform, uniformName, location2) {
  this.name = uniformName;
  this.value = void 0;
  this._value = new Matrix2_default();
  this._gl = gl;
  this._location = location2;
}
UniformMat2.prototype.set = function() {
  if (!Matrix2_default.equalsArray(this.value, this._value, 0)) {
    Matrix2_default.clone(this.value, this._value);
    const array = Matrix2_default.toArray(this.value, scratchUniformArray);
    this._gl.uniformMatrix2fv(this._location, false, array);
  }
};
var scratchMat3Array = new Float32Array(9);
function UniformMat3(gl, activeUniform, uniformName, location2) {
  this.name = uniformName;
  this.value = void 0;
  this._value = new Matrix3_default();
  this._gl = gl;
  this._location = location2;
}
UniformMat3.prototype.set = function() {
  if (!Matrix3_default.equalsArray(this.value, this._value, 0)) {
    Matrix3_default.clone(this.value, this._value);
    const array = Matrix3_default.toArray(this.value, scratchMat3Array);
    this._gl.uniformMatrix3fv(this._location, false, array);
  }
};
var scratchMat4Array = new Float32Array(16);
function UniformMat4(gl, activeUniform, uniformName, location2) {
  this.name = uniformName;
  this.value = void 0;
  this._value = new Matrix4_default();
  this._gl = gl;
  this._location = location2;
}
UniformMat4.prototype.set = function() {
  if (!Matrix4_default.equalsArray(this.value, this._value, 0)) {
    Matrix4_default.clone(this.value, this._value);
    const array = Matrix4_default.toArray(this.value, scratchMat4Array);
    this._gl.uniformMatrix4fv(this._location, false, array);
  }
};
var createUniform_default = createUniform;

// packages/engine/Source/Renderer/createUniformArray.js
function createUniformArray(gl, activeUniform, uniformName, locations) {
  switch (activeUniform.type) {
    case gl.FLOAT:
      return new UniformArrayFloat(gl, activeUniform, uniformName, locations);
    case gl.FLOAT_VEC2:
      return new UniformArrayFloatVec2(
        gl,
        activeUniform,
        uniformName,
        locations
      );
    case gl.FLOAT_VEC3:
      return new UniformArrayFloatVec3(
        gl,
        activeUniform,
        uniformName,
        locations
      );
    case gl.FLOAT_VEC4:
      return new UniformArrayFloatVec4(
        gl,
        activeUniform,
        uniformName,
        locations
      );
    case gl.SAMPLER_2D:
    case gl.SAMPLER_CUBE:
      return new UniformArraySampler(gl, activeUniform, uniformName, locations);
    case gl.INT:
    case gl.BOOL:
      return new UniformArrayInt(gl, activeUniform, uniformName, locations);
    case gl.INT_VEC2:
    case gl.BOOL_VEC2:
      return new UniformArrayIntVec2(gl, activeUniform, uniformName, locations);
    case gl.INT_VEC3:
    case gl.BOOL_VEC3:
      return new UniformArrayIntVec3(gl, activeUniform, uniformName, locations);
    case gl.INT_VEC4:
    case gl.BOOL_VEC4:
      return new UniformArrayIntVec4(gl, activeUniform, uniformName, locations);
    case gl.FLOAT_MAT2:
      return new UniformArrayMat2(gl, activeUniform, uniformName, locations);
    case gl.FLOAT_MAT3:
      return new UniformArrayMat3(gl, activeUniform, uniformName, locations);
    case gl.FLOAT_MAT4:
      return new UniformArrayMat4(gl, activeUniform, uniformName, locations);
    default:
      throw new RuntimeError_default(
        `Unrecognized uniform type: ${activeUniform.type} for uniform "${uniformName}".`
      );
  }
}
function UniformArrayFloat(gl, activeUniform, uniformName, locations) {
  const length = locations.length;
  this.name = uniformName;
  this.value = new Array(length);
  this._value = new Float32Array(length);
  this._gl = gl;
  this._location = locations[0];
}
UniformArrayFloat.prototype.set = function() {
  const value = this.value;
  const length = value.length;
  const arraybuffer = this._value;
  let changed = false;
  for (let i = 0; i < length; ++i) {
    const v2 = value[i];
    if (v2 !== arraybuffer[i]) {
      arraybuffer[i] = v2;
      changed = true;
    }
  }
  if (changed) {
    this._gl.uniform1fv(this._location, arraybuffer);
  }
};
function UniformArrayFloatVec2(gl, activeUniform, uniformName, locations) {
  const length = locations.length;
  this.name = uniformName;
  this.value = new Array(length);
  this._value = new Float32Array(length * 2);
  this._gl = gl;
  this._location = locations[0];
}
UniformArrayFloatVec2.prototype.set = function() {
  const value = this.value;
  const length = value.length;
  const arraybuffer = this._value;
  let changed = false;
  let j = 0;
  for (let i = 0; i < length; ++i) {
    const v2 = value[i];
    if (!Cartesian2_default.equalsArray(v2, arraybuffer, j)) {
      Cartesian2_default.pack(v2, arraybuffer, j);
      changed = true;
    }
    j += 2;
  }
  if (changed) {
    this._gl.uniform2fv(this._location, arraybuffer);
  }
};
function UniformArrayFloatVec3(gl, activeUniform, uniformName, locations) {
  const length = locations.length;
  this.name = uniformName;
  this.value = new Array(length);
  this._value = new Float32Array(length * 3);
  this._gl = gl;
  this._location = locations[0];
}
UniformArrayFloatVec3.prototype.set = function() {
  const value = this.value;
  const length = value.length;
  const arraybuffer = this._value;
  let changed = false;
  let j = 0;
  for (let i = 0; i < length; ++i) {
    const v2 = value[i];
    if (defined_default(v2.red)) {
      if (v2.red !== arraybuffer[j] || v2.green !== arraybuffer[j + 1] || v2.blue !== arraybuffer[j + 2]) {
        arraybuffer[j] = v2.red;
        arraybuffer[j + 1] = v2.green;
        arraybuffer[j + 2] = v2.blue;
        changed = true;
      }
    } else if (defined_default(v2.x)) {
      if (!Cartesian3_default.equalsArray(v2, arraybuffer, j)) {
        Cartesian3_default.pack(v2, arraybuffer, j);
        changed = true;
      }
    } else {
      throw new DeveloperError_default("Invalid vec3 value.");
    }
    j += 3;
  }
  if (changed) {
    this._gl.uniform3fv(this._location, arraybuffer);
  }
};
function UniformArrayFloatVec4(gl, activeUniform, uniformName, locations) {
  const length = locations.length;
  this.name = uniformName;
  this.value = new Array(length);
  this._value = new Float32Array(length * 4);
  this._gl = gl;
  this._location = locations[0];
}
UniformArrayFloatVec4.prototype.set = function() {
  const value = this.value;
  const length = value.length;
  const arraybuffer = this._value;
  let changed = false;
  let j = 0;
  for (let i = 0; i < length; ++i) {
    const v2 = value[i];
    if (defined_default(v2.red)) {
      if (!Color_default.equalsArray(v2, arraybuffer, j)) {
        Color_default.pack(v2, arraybuffer, j);
        changed = true;
      }
    } else if (defined_default(v2.x)) {
      if (!Cartesian4_default.equalsArray(v2, arraybuffer, j)) {
        Cartesian4_default.pack(v2, arraybuffer, j);
        changed = true;
      }
    } else {
      throw new DeveloperError_default("Invalid vec4 value.");
    }
    j += 4;
  }
  if (changed) {
    this._gl.uniform4fv(this._location, arraybuffer);
  }
};
function UniformArraySampler(gl, activeUniform, uniformName, locations) {
  const length = locations.length;
  this.name = uniformName;
  this.value = new Array(length);
  this._value = new Float32Array(length);
  this._gl = gl;
  this._locations = locations;
  this.textureUnitIndex = void 0;
}
UniformArraySampler.prototype.set = function() {
  const gl = this._gl;
  const textureUnitIndex = gl.TEXTURE0 + this.textureUnitIndex;
  const value = this.value;
  const length = value.length;
  for (let i = 0; i < length; ++i) {
    const v2 = value[i];
    gl.activeTexture(textureUnitIndex + i);
    gl.bindTexture(v2._target, v2._texture);
  }
};
UniformArraySampler.prototype._setSampler = function(textureUnitIndex) {
  this.textureUnitIndex = textureUnitIndex;
  const locations = this._locations;
  const length = locations.length;
  for (let i = 0; i < length; ++i) {
    const index = textureUnitIndex + i;
    this._gl.uniform1i(locations[i], index);
  }
  return textureUnitIndex + length;
};
function UniformArrayInt(gl, activeUniform, uniformName, locations) {
  const length = locations.length;
  this.name = uniformName;
  this.value = new Array(length);
  this._value = new Int32Array(length);
  this._gl = gl;
  this._location = locations[0];
}
UniformArrayInt.prototype.set = function() {
  const value = this.value;
  const length = value.length;
  const arraybuffer = this._value;
  let changed = false;
  for (let i = 0; i < length; ++i) {
    const v2 = value[i];
    if (v2 !== arraybuffer[i]) {
      arraybuffer[i] = v2;
      changed = true;
    }
  }
  if (changed) {
    this._gl.uniform1iv(this._location, arraybuffer);
  }
};
function UniformArrayIntVec2(gl, activeUniform, uniformName, locations) {
  const length = locations.length;
  this.name = uniformName;
  this.value = new Array(length);
  this._value = new Int32Array(length * 2);
  this._gl = gl;
  this._location = locations[0];
}
UniformArrayIntVec2.prototype.set = function() {
  const value = this.value;
  const length = value.length;
  const arraybuffer = this._value;
  let changed = false;
  let j = 0;
  for (let i = 0; i < length; ++i) {
    const v2 = value[i];
    if (!Cartesian2_default.equalsArray(v2, arraybuffer, j)) {
      Cartesian2_default.pack(v2, arraybuffer, j);
      changed = true;
    }
    j += 2;
  }
  if (changed) {
    this._gl.uniform2iv(this._location, arraybuffer);
  }
};
function UniformArrayIntVec3(gl, activeUniform, uniformName, locations) {
  const length = locations.length;
  this.name = uniformName;
  this.value = new Array(length);
  this._value = new Int32Array(length * 3);
  this._gl = gl;
  this._location = locations[0];
}
UniformArrayIntVec3.prototype.set = function() {
  const value = this.value;
  const length = value.length;
  const arraybuffer = this._value;
  let changed = false;
  let j = 0;
  for (let i = 0; i < length; ++i) {
    const v2 = value[i];
    if (!Cartesian3_default.equalsArray(v2, arraybuffer, j)) {
      Cartesian3_default.pack(v2, arraybuffer, j);
      changed = true;
    }
    j += 3;
  }
  if (changed) {
    this._gl.uniform3iv(this._location, arraybuffer);
  }
};
function UniformArrayIntVec4(gl, activeUniform, uniformName, locations) {
  const length = locations.length;
  this.name = uniformName;
  this.value = new Array(length);
  this._value = new Int32Array(length * 4);
  this._gl = gl;
  this._location = locations[0];
}
UniformArrayIntVec4.prototype.set = function() {
  const value = this.value;
  const length = value.length;
  const arraybuffer = this._value;
  let changed = false;
  let j = 0;
  for (let i = 0; i < length; ++i) {
    const v2 = value[i];
    if (!Cartesian4_default.equalsArray(v2, arraybuffer, j)) {
      Cartesian4_default.pack(v2, arraybuffer, j);
      changed = true;
    }
    j += 4;
  }
  if (changed) {
    this._gl.uniform4iv(this._location, arraybuffer);
  }
};
function UniformArrayMat2(gl, activeUniform, uniformName, locations) {
  const length = locations.length;
  this.name = uniformName;
  this.value = new Array(length);
  this._value = new Float32Array(length * 4);
  this._gl = gl;
  this._location = locations[0];
}
UniformArrayMat2.prototype.set = function() {
  const value = this.value;
  const length = value.length;
  const arraybuffer = this._value;
  let changed = false;
  let j = 0;
  for (let i = 0; i < length; ++i) {
    const v2 = value[i];
    if (!Matrix2_default.equalsArray(v2, arraybuffer, j)) {
      Matrix2_default.pack(v2, arraybuffer, j);
      changed = true;
    }
    j += 4;
  }
  if (changed) {
    this._gl.uniformMatrix2fv(this._location, false, arraybuffer);
  }
};
function UniformArrayMat3(gl, activeUniform, uniformName, locations) {
  const length = locations.length;
  this.name = uniformName;
  this.value = new Array(length);
  this._value = new Float32Array(length * 9);
  this._gl = gl;
  this._location = locations[0];
}
UniformArrayMat3.prototype.set = function() {
  const value = this.value;
  const length = value.length;
  const arraybuffer = this._value;
  let changed = false;
  let j = 0;
  for (let i = 0; i < length; ++i) {
    const v2 = value[i];
    if (!Matrix3_default.equalsArray(v2, arraybuffer, j)) {
      Matrix3_default.pack(v2, arraybuffer, j);
      changed = true;
    }
    j += 9;
  }
  if (changed) {
    this._gl.uniformMatrix3fv(this._location, false, arraybuffer);
  }
};
function UniformArrayMat4(gl, activeUniform, uniformName, locations) {
  const length = locations.length;
  this.name = uniformName;
  this.value = new Array(length);
  this._value = new Float32Array(length * 16);
  this._gl = gl;
  this._location = locations[0];
}
UniformArrayMat4.prototype.set = function() {
  const value = this.value;
  const length = value.length;
  const arraybuffer = this._value;
  let changed = false;
  let j = 0;
  for (let i = 0; i < length; ++i) {
    const v2 = value[i];
    if (!Matrix4_default.equalsArray(v2, arraybuffer, j)) {
      Matrix4_default.pack(v2, arraybuffer, j);
      changed = true;
    }
    j += 16;
  }
  if (changed) {
    this._gl.uniformMatrix4fv(this._location, false, arraybuffer);
  }
};
var createUniformArray_default = createUniformArray;

// packages/engine/Source/Renderer/ShaderProgram.js
var nextShaderProgramId = 0;
function ShaderProgram(options) {
  let vertexShaderText = options.vertexShaderText;
  let fragmentShaderText = options.fragmentShaderText;
  if (typeof spector !== "undefined") {
    vertexShaderText = vertexShaderText.replace(/^#line/gm, "//#line");
    fragmentShaderText = fragmentShaderText.replace(/^#line/gm, "//#line");
  }
  const modifiedFS = handleUniformPrecisionMismatches(
    vertexShaderText,
    fragmentShaderText
  );
  this._gl = options.gl;
  this._logShaderCompilation = options.logShaderCompilation;
  this._debugShaders = options.debugShaders;
  this._attributeLocations = options.attributeLocations;
  this._program = void 0;
  this._numberOfVertexAttributes = void 0;
  this._vertexAttributes = void 0;
  this._uniformsByName = void 0;
  this._uniforms = void 0;
  this._automaticUniforms = void 0;
  this._manualUniforms = void 0;
  this._duplicateUniformNames = modifiedFS.duplicateUniformNames;
  this._cachedShader = void 0;
  this.maximumTextureUnitIndex = void 0;
  this._vertexShaderSource = options.vertexShaderSource;
  this._vertexShaderText = options.vertexShaderText;
  this._fragmentShaderSource = options.fragmentShaderSource;
  this._fragmentShaderText = modifiedFS.fragmentShaderText;
  this.id = nextShaderProgramId++;
}
ShaderProgram.fromCache = function(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  Check_default.defined("options.context", options.context);
  return options.context.shaderCache.getShaderProgram(options);
};
ShaderProgram.replaceCache = function(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  Check_default.defined("options.context", options.context);
  return options.context.shaderCache.replaceShaderProgram(options);
};
Object.defineProperties(ShaderProgram.prototype, {
  /**
   * GLSL source for the shader program's vertex shader.
   * @memberof ShaderProgram.prototype
   *
   * @type {ShaderSource}
   * @readonly
   */
  vertexShaderSource: {
    get: function() {
      return this._vertexShaderSource;
    }
  },
  /**
   * GLSL source for the shader program's fragment shader.
   * @memberof ShaderProgram.prototype
   *
   * @type {ShaderSource}
   * @readonly
   */
  fragmentShaderSource: {
    get: function() {
      return this._fragmentShaderSource;
    }
  },
  vertexAttributes: {
    get: function() {
      initialize2(this);
      return this._vertexAttributes;
    }
  },
  numberOfVertexAttributes: {
    get: function() {
      initialize2(this);
      return this._numberOfVertexAttributes;
    }
  },
  allUniforms: {
    get: function() {
      initialize2(this);
      return this._uniformsByName;
    }
  }
});
function extractUniforms(shaderText) {
  const uniformNames = [];
  const uniformLines = shaderText.match(/uniform.*?(?![^{]*})(?=[=\[;])/g);
  if (defined_default(uniformLines)) {
    const len = uniformLines.length;
    for (let i = 0; i < len; i++) {
      const line = uniformLines[i].trim();
      const name = line.slice(line.lastIndexOf(" ") + 1);
      uniformNames.push(name);
    }
  }
  return uniformNames;
}
function handleUniformPrecisionMismatches(vertexShaderText, fragmentShaderText) {
  const duplicateUniformNames = {};
  if (!ContextLimits_default.highpFloatSupported || !ContextLimits_default.highpIntSupported) {
    let i, j;
    let uniformName;
    let duplicateName;
    const vertexShaderUniforms = extractUniforms(vertexShaderText);
    const fragmentShaderUniforms = extractUniforms(fragmentShaderText);
    const vertexUniformsCount = vertexShaderUniforms.length;
    const fragmentUniformsCount = fragmentShaderUniforms.length;
    for (i = 0; i < vertexUniformsCount; i++) {
      for (j = 0; j < fragmentUniformsCount; j++) {
        if (vertexShaderUniforms[i] === fragmentShaderUniforms[j]) {
          uniformName = vertexShaderUniforms[i];
          duplicateName = `czm_mediump_${uniformName}`;
          const re = new RegExp(`${uniformName}\\b`, "g");
          fragmentShaderText = fragmentShaderText.replace(re, duplicateName);
          duplicateUniformNames[duplicateName] = uniformName;
        }
      }
    }
  }
  return {
    fragmentShaderText,
    duplicateUniformNames
  };
}
var consolePrefix = "[Cesium WebGL] ";
function createAndLinkProgram(gl, shader) {
  const vsSource = shader._vertexShaderText;
  const fsSource = shader._fragmentShaderText;
  const vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vsSource);
  gl.compileShader(vertexShader);
  const fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fsSource);
  gl.compileShader(fragmentShader);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  const attributeLocations = shader._attributeLocations;
  if (defined_default(attributeLocations)) {
    for (const attribute in attributeLocations) {
      if (attributeLocations.hasOwnProperty(attribute)) {
        gl.bindAttribLocation(
          program,
          attributeLocations[attribute],
          attribute
        );
      }
    }
  }
  gl.linkProgram(program);
  let log;
  if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
    if (shader._logShaderCompilation) {
      log = gl.getShaderInfoLog(vertexShader);
      if (defined_default(log) && log.length > 0) {
        console.log(`${consolePrefix}Vertex shader compile log: ${log}`);
      }
      log = gl.getShaderInfoLog(fragmentShader);
      if (defined_default(log) && log.length > 0) {
        console.log(`${consolePrefix}Fragment shader compile log: ${log}`);
      }
      log = gl.getProgramInfoLog(program);
      if (defined_default(log) && log.length > 0) {
        console.log(`${consolePrefix}Shader program link log: ${log}`);
      }
    }
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return program;
  }
  let errorMessage;
  const debugShaders = shader._debugShaders;
  if (!gl.getShaderParameter(fragmentShader, gl.COMPILE_STATUS)) {
    log = gl.getShaderInfoLog(fragmentShader);
    console.error(`${consolePrefix}Fragment shader compile log: ${log}`);
    console.error(`${consolePrefix} Fragment shader source:
${fsSource}`);
    errorMessage = `Fragment shader failed to compile.  Compile log: ${log}`;
  } else if (!gl.getShaderParameter(vertexShader, gl.COMPILE_STATUS)) {
    log = gl.getShaderInfoLog(vertexShader);
    console.error(`${consolePrefix}Vertex shader compile log: ${log}`);
    console.error(`${consolePrefix} Vertex shader source:
${vsSource}`);
    errorMessage = `Vertex shader failed to compile.  Compile log: ${log}`;
  } else {
    log = gl.getProgramInfoLog(program);
    console.error(`${consolePrefix}Shader program link log: ${log}`);
    logTranslatedSource(vertexShader, "vertex");
    logTranslatedSource(fragmentShader, "fragment");
    errorMessage = `Program failed to link.  Link log: ${log}`;
  }
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);
  gl.deleteProgram(program);
  throw new RuntimeError_default(errorMessage);
  function logTranslatedSource(compiledShader, name) {
    if (!defined_default(debugShaders)) {
      return;
    }
    const translation = debugShaders.getTranslatedShaderSource(compiledShader);
    if (translation === "") {
      console.error(`${consolePrefix}${name} shader translation failed.`);
      return;
    }
    console.error(
      `${consolePrefix}Translated ${name} shaderSource:
${translation}`
    );
  }
}
function findVertexAttributes(gl, program, numberOfAttributes) {
  const attributes = {};
  for (let i = 0; i < numberOfAttributes; ++i) {
    const attr = gl.getActiveAttrib(program, i);
    const location2 = gl.getAttribLocation(program, attr.name);
    attributes[attr.name] = {
      name: attr.name,
      type: attr.type,
      index: location2
    };
  }
  return attributes;
}
function findUniforms(gl, program) {
  const uniformsByName = {};
  const uniforms = [];
  const samplerUniforms = [];
  const numberOfUniforms = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < numberOfUniforms; ++i) {
    const activeUniform = gl.getActiveUniform(program, i);
    const suffix = "[0]";
    const uniformName = activeUniform.name.indexOf(
      suffix,
      activeUniform.name.length - suffix.length
    ) !== -1 ? activeUniform.name.slice(0, activeUniform.name.length - 3) : activeUniform.name;
    if (uniformName.indexOf("gl_") !== 0) {
      if (activeUniform.name.indexOf("[") < 0) {
        const location2 = gl.getUniformLocation(program, uniformName);
        if (location2 !== null) {
          const uniform = createUniform_default(
            gl,
            activeUniform,
            uniformName,
            location2
          );
          uniformsByName[uniformName] = uniform;
          uniforms.push(uniform);
          if (uniform._setSampler) {
            samplerUniforms.push(uniform);
          }
        }
      } else {
        let uniformArray;
        let locations;
        let value;
        let loc;
        const indexOfBracket = uniformName.indexOf("[");
        if (indexOfBracket >= 0) {
          uniformArray = uniformsByName[uniformName.slice(0, indexOfBracket)];
          if (!defined_default(uniformArray)) {
            continue;
          }
          locations = uniformArray._locations;
          if (locations.length <= 1) {
            value = uniformArray.value;
            loc = gl.getUniformLocation(program, uniformName);
            if (loc !== null) {
              locations.push(loc);
              value.push(gl.getUniform(program, loc));
            }
          }
        } else {
          locations = [];
          for (let j = 0; j < activeUniform.size; ++j) {
            loc = gl.getUniformLocation(program, `${uniformName}[${j}]`);
            if (loc !== null) {
              locations.push(loc);
            }
          }
          uniformArray = createUniformArray_default(
            gl,
            activeUniform,
            uniformName,
            locations
          );
          uniformsByName[uniformName] = uniformArray;
          uniforms.push(uniformArray);
          if (uniformArray._setSampler) {
            samplerUniforms.push(uniformArray);
          }
        }
      }
    }
  }
  return {
    uniformsByName,
    uniforms,
    samplerUniforms
  };
}
function partitionUniforms(shader, uniforms) {
  const automaticUniforms = [];
  const manualUniforms = [];
  for (const uniform in uniforms) {
    if (uniforms.hasOwnProperty(uniform)) {
      const uniformObject = uniforms[uniform];
      let uniformName = uniform;
      const duplicateUniform = shader._duplicateUniformNames[uniformName];
      if (defined_default(duplicateUniform)) {
        uniformObject.name = duplicateUniform;
        uniformName = duplicateUniform;
      }
      const automaticUniform = AutomaticUniforms_default[uniformName];
      if (defined_default(automaticUniform)) {
        automaticUniforms.push({
          uniform: uniformObject,
          automaticUniform
        });
      } else {
        manualUniforms.push(uniformObject);
      }
    }
  }
  return {
    automaticUniforms,
    manualUniforms
  };
}
function setSamplerUniforms(gl, program, samplerUniforms) {
  gl.useProgram(program);
  let textureUnitIndex = 0;
  const length = samplerUniforms.length;
  for (let i = 0; i < length; ++i) {
    textureUnitIndex = samplerUniforms[i]._setSampler(textureUnitIndex);
  }
  gl.useProgram(null);
  return textureUnitIndex;
}
function initialize2(shader) {
  if (defined_default(shader._program)) {
    return;
  }
  reinitialize(shader);
}
function reinitialize(shader) {
  const oldProgram = shader._program;
  const gl = shader._gl;
  const program = createAndLinkProgram(gl, shader, shader._debugShaders);
  const numberOfVertexAttributes = gl.getProgramParameter(
    program,
    gl.ACTIVE_ATTRIBUTES
  );
  const uniforms = findUniforms(gl, program);
  const partitionedUniforms = partitionUniforms(
    shader,
    uniforms.uniformsByName
  );
  shader._program = program;
  shader._numberOfVertexAttributes = numberOfVertexAttributes;
  shader._vertexAttributes = findVertexAttributes(
    gl,
    program,
    numberOfVertexAttributes
  );
  shader._uniformsByName = uniforms.uniformsByName;
  shader._uniforms = uniforms.uniforms;
  shader._automaticUniforms = partitionedUniforms.automaticUniforms;
  shader._manualUniforms = partitionedUniforms.manualUniforms;
  shader.maximumTextureUnitIndex = setSamplerUniforms(
    gl,
    program,
    uniforms.samplerUniforms
  );
  if (oldProgram) {
    shader._gl.deleteProgram(oldProgram);
  }
  if (typeof spector !== "undefined") {
    shader._program.__SPECTOR_rebuildProgram = function(vertexSourceCode, fragmentSourceCode, onCompiled, onError) {
      const originalVS = shader._vertexShaderText;
      const originalFS = shader._fragmentShaderText;
      const regex = / ! = /g;
      shader._vertexShaderText = vertexSourceCode.replace(regex, " != ");
      shader._fragmentShaderText = fragmentSourceCode.replace(regex, " != ");
      try {
        reinitialize(shader);
        onCompiled(shader._program);
      } catch (e) {
        shader._vertexShaderText = originalVS;
        shader._fragmentShaderText = originalFS;
        const errorMatcher = /(?:Compile|Link) error: ([^]*)/;
        const match = errorMatcher.exec(e.message);
        if (match) {
          onError(match[1]);
        } else {
          onError(e.message);
        }
      }
    };
  }
}
ShaderProgram.prototype._bind = function() {
  initialize2(this);
  this._gl.useProgram(this._program);
};
ShaderProgram.prototype._setUniforms = function(uniformMap, uniformState, validate) {
  let len;
  let i;
  if (defined_default(uniformMap)) {
    const manualUniforms = this._manualUniforms;
    len = manualUniforms.length;
    for (i = 0; i < len; ++i) {
      const mu = manualUniforms[i];
      mu.value = uniformMap[mu.name]();
    }
  }
  const automaticUniforms = this._automaticUniforms;
  len = automaticUniforms.length;
  for (i = 0; i < len; ++i) {
    const au = automaticUniforms[i];
    au.uniform.value = au.automaticUniform.getValue(uniformState);
  }
  const uniforms = this._uniforms;
  len = uniforms.length;
  for (i = 0; i < len; ++i) {
    uniforms[i].set();
  }
  if (validate) {
    const gl = this._gl;
    const program = this._program;
    gl.validateProgram(program);
    if (!gl.getProgramParameter(program, gl.VALIDATE_STATUS)) {
      throw new DeveloperError_default(
        `Program validation failed.  Program info log: ${gl.getProgramInfoLog(
          program
        )}`
      );
    }
  }
};
ShaderProgram.prototype.isDestroyed = function() {
  return false;
};
ShaderProgram.prototype.destroy = function() {
  this._cachedShader.cache.releaseShaderProgram(this);
  return void 0;
};
ShaderProgram.prototype.finalDestroy = function() {
  this._gl.deleteProgram(this._program);
  return destroyObject_default(this);
};
var ShaderProgram_default = ShaderProgram;

// packages/engine/Source/Core/ComponentDatatype.js
var ComponentDatatype = {
  /**
   * 8-bit signed byte corresponding to <code>gl.BYTE</code> and the type
   * of an element in <code>Int8Array</code>.
   *
   * @type {number}
   * @constant
   */
  BYTE: WebGLConstants_default.BYTE,
  /**
   * 8-bit unsigned byte corresponding to <code>UNSIGNED_BYTE</code> and the type
   * of an element in <code>Uint8Array</code>.
   *
   * @type {number}
   * @constant
   */
  UNSIGNED_BYTE: WebGLConstants_default.UNSIGNED_BYTE,
  /**
   * 16-bit signed short corresponding to <code>SHORT</code> and the type
   * of an element in <code>Int16Array</code>.
   *
   * @type {number}
   * @constant
   */
  SHORT: WebGLConstants_default.SHORT,
  /**
   * 16-bit unsigned short corresponding to <code>UNSIGNED_SHORT</code> and the type
   * of an element in <code>Uint16Array</code>.
   *
   * @type {number}
   * @constant
   */
  UNSIGNED_SHORT: WebGLConstants_default.UNSIGNED_SHORT,
  /**
   * 32-bit signed int corresponding to <code>INT</code> and the type
   * of an element in <code>Int32Array</code>.
   *
   * @memberOf ComponentDatatype
   *
   * @type {number}
   * @constant
   */
  INT: WebGLConstants_default.INT,
  /**
   * 32-bit unsigned int corresponding to <code>UNSIGNED_INT</code> and the type
   * of an element in <code>Uint32Array</code>.
   *
   * @memberOf ComponentDatatype
   *
   * @type {number}
   * @constant
   */
  UNSIGNED_INT: WebGLConstants_default.UNSIGNED_INT,
  /**
   * 32-bit floating-point corresponding to <code>FLOAT</code> and the type
   * of an element in <code>Float32Array</code>.
   *
   * @type {number}
   * @constant
   */
  FLOAT: WebGLConstants_default.FLOAT,
  /**
   * 64-bit floating-point corresponding to <code>gl.DOUBLE</code> (in Desktop OpenGL;
   * this is not supported in WebGL, and is emulated in Cesium via {@link GeometryPipeline.encodeAttribute})
   * and the type of an element in <code>Float64Array</code>.
   *
   * @memberOf ComponentDatatype
   *
   * @type {number}
   * @constant
   * @default 0x140A
   */
  DOUBLE: WebGLConstants_default.DOUBLE
};
ComponentDatatype.getSizeInBytes = function(componentDatatype) {
  if (!defined_default(componentDatatype)) {
    throw new DeveloperError_default("value is required.");
  }
  switch (componentDatatype) {
    case ComponentDatatype.BYTE:
      return Int8Array.BYTES_PER_ELEMENT;
    case ComponentDatatype.UNSIGNED_BYTE:
      return Uint8Array.BYTES_PER_ELEMENT;
    case ComponentDatatype.SHORT:
      return Int16Array.BYTES_PER_ELEMENT;
    case ComponentDatatype.UNSIGNED_SHORT:
      return Uint16Array.BYTES_PER_ELEMENT;
    case ComponentDatatype.INT:
      return Int32Array.BYTES_PER_ELEMENT;
    case ComponentDatatype.UNSIGNED_INT:
      return Uint32Array.BYTES_PER_ELEMENT;
    case ComponentDatatype.FLOAT:
      return Float32Array.BYTES_PER_ELEMENT;
    case ComponentDatatype.DOUBLE:
      return Float64Array.BYTES_PER_ELEMENT;
    default:
      throw new DeveloperError_default("componentDatatype is not a valid value.");
  }
};
ComponentDatatype.fromTypedArray = function(array) {
  if (array instanceof Int8Array) {
    return ComponentDatatype.BYTE;
  }
  if (array instanceof Uint8Array) {
    return ComponentDatatype.UNSIGNED_BYTE;
  }
  if (array instanceof Int16Array) {
    return ComponentDatatype.SHORT;
  }
  if (array instanceof Uint16Array) {
    return ComponentDatatype.UNSIGNED_SHORT;
  }
  if (array instanceof Int32Array) {
    return ComponentDatatype.INT;
  }
  if (array instanceof Uint32Array) {
    return ComponentDatatype.UNSIGNED_INT;
  }
  if (array instanceof Float32Array) {
    return ComponentDatatype.FLOAT;
  }
  if (array instanceof Float64Array) {
    return ComponentDatatype.DOUBLE;
  }
  throw new DeveloperError_default(
    "array must be an Int8Array, Uint8Array, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, or Float64Array."
  );
};
ComponentDatatype.validate = function(componentDatatype) {
  return defined_default(componentDatatype) && (componentDatatype === ComponentDatatype.BYTE || componentDatatype === ComponentDatatype.UNSIGNED_BYTE || componentDatatype === ComponentDatatype.SHORT || componentDatatype === ComponentDatatype.UNSIGNED_SHORT || componentDatatype === ComponentDatatype.INT || componentDatatype === ComponentDatatype.UNSIGNED_INT || componentDatatype === ComponentDatatype.FLOAT || componentDatatype === ComponentDatatype.DOUBLE);
};
ComponentDatatype.createTypedArray = function(componentDatatype, valuesOrLength) {
  if (!defined_default(componentDatatype)) {
    throw new DeveloperError_default("componentDatatype is required.");
  }
  if (!defined_default(valuesOrLength)) {
    throw new DeveloperError_default("valuesOrLength is required.");
  }
  switch (componentDatatype) {
    case ComponentDatatype.BYTE:
      return new Int8Array(valuesOrLength);
    case ComponentDatatype.UNSIGNED_BYTE:
      return new Uint8Array(valuesOrLength);
    case ComponentDatatype.SHORT:
      return new Int16Array(valuesOrLength);
    case ComponentDatatype.UNSIGNED_SHORT:
      return new Uint16Array(valuesOrLength);
    case ComponentDatatype.INT:
      return new Int32Array(valuesOrLength);
    case ComponentDatatype.UNSIGNED_INT:
      return new Uint32Array(valuesOrLength);
    case ComponentDatatype.FLOAT:
      return new Float32Array(valuesOrLength);
    case ComponentDatatype.DOUBLE:
      return new Float64Array(valuesOrLength);
    default:
      throw new DeveloperError_default("componentDatatype is not a valid value.");
  }
};
ComponentDatatype.createArrayBufferView = function(componentDatatype, buffer, byteOffset, length) {
  if (!defined_default(componentDatatype)) {
    throw new DeveloperError_default("componentDatatype is required.");
  }
  if (!defined_default(buffer)) {
    throw new DeveloperError_default("buffer is required.");
  }
  byteOffset = defaultValue_default(byteOffset, 0);
  length = defaultValue_default(
    length,
    (buffer.byteLength - byteOffset) / ComponentDatatype.getSizeInBytes(componentDatatype)
  );
  switch (componentDatatype) {
    case ComponentDatatype.BYTE:
      return new Int8Array(buffer, byteOffset, length);
    case ComponentDatatype.UNSIGNED_BYTE:
      return new Uint8Array(buffer, byteOffset, length);
    case ComponentDatatype.SHORT:
      return new Int16Array(buffer, byteOffset, length);
    case ComponentDatatype.UNSIGNED_SHORT:
      return new Uint16Array(buffer, byteOffset, length);
    case ComponentDatatype.INT:
      return new Int32Array(buffer, byteOffset, length);
    case ComponentDatatype.UNSIGNED_INT:
      return new Uint32Array(buffer, byteOffset, length);
    case ComponentDatatype.FLOAT:
      return new Float32Array(buffer, byteOffset, length);
    case ComponentDatatype.DOUBLE:
      return new Float64Array(buffer, byteOffset, length);
    default:
      throw new DeveloperError_default("componentDatatype is not a valid value.");
  }
};
ComponentDatatype.fromName = function(name) {
  switch (name) {
    case "BYTE":
      return ComponentDatatype.BYTE;
    case "UNSIGNED_BYTE":
      return ComponentDatatype.UNSIGNED_BYTE;
    case "SHORT":
      return ComponentDatatype.SHORT;
    case "UNSIGNED_SHORT":
      return ComponentDatatype.UNSIGNED_SHORT;
    case "INT":
      return ComponentDatatype.INT;
    case "UNSIGNED_INT":
      return ComponentDatatype.UNSIGNED_INT;
    case "FLOAT":
      return ComponentDatatype.FLOAT;
    case "DOUBLE":
      return ComponentDatatype.DOUBLE;
    default:
      throw new DeveloperError_default("name is not a valid value.");
  }
};
var ComponentDatatype_default = Object.freeze(ComponentDatatype);

// packages/engine/Source/Core/GeometryType.js
var GeometryType = {
  NONE: 0,
  TRIANGLES: 1,
  LINES: 2,
  POLYLINES: 3
};
var GeometryType_default = Object.freeze(GeometryType);

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
var lerpScratch4 = new Quaternion();
Quaternion.lerp = function(start, end, t, result) {
  Check_default.typeOf.object("start", start);
  Check_default.typeOf.object("end", end);
  Check_default.typeOf.number("t", t);
  Check_default.typeOf.object("result", result);
  lerpScratch4 = Quaternion.multiplyByScalar(end, t, lerpScratch4);
  result = Quaternion.multiplyByScalar(start, 1 - t, result);
  return Quaternion.add(lerpScratch4, result, result);
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
  let sign2;
  if (x >= 0) {
    sign2 = 1;
  } else {
    sign2 = -1;
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
  const cT = sign2 * t * (1 + bT[0] * (1 + bT[1] * (1 + bT[2] * (1 + bT[3] * (1 + bT[4] * (1 + bT[5] * (1 + bT[6] * (1 + bT[7]))))))));
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

// packages/engine/Source/Core/combine.js
function combine(object1, object2, deep) {
  deep = defaultValue_default(deep, false);
  const result = {};
  const object1Defined = defined_default(object1);
  const object2Defined = defined_default(object2);
  let property;
  let object1Value;
  let object2Value;
  if (object1Defined) {
    for (property in object1) {
      if (object1.hasOwnProperty(property)) {
        object1Value = object1[property];
        if (object2Defined && deep && typeof object1Value === "object" && object2.hasOwnProperty(property)) {
          object2Value = object2[property];
          if (typeof object2Value === "object") {
            result[property] = combine(object1Value, object2Value, deep);
          } else {
            result[property] = object1Value;
          }
        } else {
          result[property] = object1Value;
        }
      }
    }
  }
  if (object2Defined) {
    for (property in object2) {
      if (object2.hasOwnProperty(property) && !result.hasOwnProperty(property)) {
        object2Value = object2[property];
        result[property] = object2Value;
      }
    }
  }
  return result;
}
var combine_default = combine;

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
function queryToObject(queryString2) {
  if (!defined_default(queryString2)) {
    throw new DeveloperError_default("queryString is required.");
  }
  const result = {};
  if (queryString2 === "") {
    return result;
  }
  const parts = queryString2.replace(/\+/g, "%20").split(/[&;]/);
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
function defaultClone(value, defaultValue2) {
  return defined_default(value) ? clone_default(value) : defaultValue2;
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
function parseQueryString(queryString2) {
  if (queryString2.length === 0) {
    return {};
  }
  if (queryString2.indexOf("=") === -1) {
    return { [queryString2]: void 0 };
  }
  return queryToObject_default(queryString2);
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
        const sign2 = Math_default.sign(origin.z);
        Cartesian3_default.unpack(
          degeneratePositionLocalFrame[firstAxis],
          0,
          scratchFirstCartesian
        );
        if (firstAxis !== "east" && firstAxis !== "west") {
          Cartesian3_default.multiplyByScalar(
            scratchFirstCartesian,
            sign2,
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
            sign2,
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
            sign2,
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

// packages/engine/Source/Core/Geometry.js
function Geometry(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  Check_default.typeOf.object("options.attributes", options.attributes);
  this.attributes = options.attributes;
  this.indices = options.indices;
  this.primitiveType = defaultValue_default(
    options.primitiveType,
    PrimitiveType_default.TRIANGLES
  );
  this.boundingSphere = options.boundingSphere;
  this.geometryType = defaultValue_default(options.geometryType, GeometryType_default.NONE);
  this.boundingSphereCV = options.boundingSphereCV;
  this.offsetAttribute = options.offsetAttribute;
}
Geometry.computeNumberOfVertices = function(geometry) {
  Check_default.typeOf.object("geometry", geometry);
  let numberOfVertices = -1;
  for (const property in geometry.attributes) {
    if (geometry.attributes.hasOwnProperty(property) && defined_default(geometry.attributes[property]) && defined_default(geometry.attributes[property].values)) {
      const attribute = geometry.attributes[property];
      const num = attribute.values.length / attribute.componentsPerAttribute;
      if (numberOfVertices !== num && numberOfVertices !== -1) {
        throw new DeveloperError_default(
          "All attribute lists must have the same number of attributes."
        );
      }
      numberOfVertices = num;
    }
  }
  return numberOfVertices;
};
var rectangleCenterScratch = new Cartographic_default();
var enuCenterScratch = new Cartesian3_default();
var fixedFrameToEnuScratch = new Matrix4_default();
var boundingRectanglePointsCartographicScratch = [
  new Cartographic_default(),
  new Cartographic_default(),
  new Cartographic_default()
];
var boundingRectanglePointsEnuScratch = [
  new Cartesian2_default(),
  new Cartesian2_default(),
  new Cartesian2_default()
];
var points2DScratch = [new Cartesian2_default(), new Cartesian2_default(), new Cartesian2_default()];
var pointEnuScratch = new Cartesian3_default();
var enuRotationScratch = new Quaternion_default();
var enuRotationMatrixScratch = new Matrix4_default();
var rotation2DScratch = new Matrix2_default();
Geometry._textureCoordinateRotationPoints = function(positions, stRotation, ellipsoid, boundingRectangle) {
  let i;
  const rectangleCenter = Rectangle_default.center(
    boundingRectangle,
    rectangleCenterScratch
  );
  const enuCenter = Cartographic_default.toCartesian(
    rectangleCenter,
    ellipsoid,
    enuCenterScratch
  );
  const enuToFixedFrame = Transforms_default.eastNorthUpToFixedFrame(
    enuCenter,
    ellipsoid,
    fixedFrameToEnuScratch
  );
  const fixedFrameToEnu = Matrix4_default.inverse(
    enuToFixedFrame,
    fixedFrameToEnuScratch
  );
  const boundingPointsEnu = boundingRectanglePointsEnuScratch;
  const boundingPointsCarto = boundingRectanglePointsCartographicScratch;
  boundingPointsCarto[0].longitude = boundingRectangle.west;
  boundingPointsCarto[0].latitude = boundingRectangle.south;
  boundingPointsCarto[1].longitude = boundingRectangle.west;
  boundingPointsCarto[1].latitude = boundingRectangle.north;
  boundingPointsCarto[2].longitude = boundingRectangle.east;
  boundingPointsCarto[2].latitude = boundingRectangle.south;
  let posEnu = pointEnuScratch;
  for (i = 0; i < 3; i++) {
    Cartographic_default.toCartesian(boundingPointsCarto[i], ellipsoid, posEnu);
    posEnu = Matrix4_default.multiplyByPointAsVector(fixedFrameToEnu, posEnu, posEnu);
    boundingPointsEnu[i].x = posEnu.x;
    boundingPointsEnu[i].y = posEnu.y;
  }
  const rotation = Quaternion_default.fromAxisAngle(
    Cartesian3_default.UNIT_Z,
    -stRotation,
    enuRotationScratch
  );
  const textureMatrix = Matrix3_default.fromQuaternion(
    rotation,
    enuRotationMatrixScratch
  );
  const positionsLength = positions.length;
  let enuMinX = Number.POSITIVE_INFINITY;
  let enuMinY = Number.POSITIVE_INFINITY;
  let enuMaxX = Number.NEGATIVE_INFINITY;
  let enuMaxY = Number.NEGATIVE_INFINITY;
  for (i = 0; i < positionsLength; i++) {
    posEnu = Matrix4_default.multiplyByPointAsVector(
      fixedFrameToEnu,
      positions[i],
      posEnu
    );
    posEnu = Matrix3_default.multiplyByVector(textureMatrix, posEnu, posEnu);
    enuMinX = Math.min(enuMinX, posEnu.x);
    enuMinY = Math.min(enuMinY, posEnu.y);
    enuMaxX = Math.max(enuMaxX, posEnu.x);
    enuMaxY = Math.max(enuMaxY, posEnu.y);
  }
  const toDesiredInComputed = Matrix2_default.fromRotation(
    stRotation,
    rotation2DScratch
  );
  const points2D = points2DScratch;
  points2D[0].x = enuMinX;
  points2D[0].y = enuMinY;
  points2D[1].x = enuMinX;
  points2D[1].y = enuMaxY;
  points2D[2].x = enuMaxX;
  points2D[2].y = enuMinY;
  const boundingEnuMin = boundingPointsEnu[0];
  const boundingPointsWidth = boundingPointsEnu[2].x - boundingEnuMin.x;
  const boundingPointsHeight = boundingPointsEnu[1].y - boundingEnuMin.y;
  for (i = 0; i < 3; i++) {
    const point2D = points2D[i];
    Matrix2_default.multiplyByVector(toDesiredInComputed, point2D, point2D);
    point2D.x = (point2D.x - boundingEnuMin.x) / boundingPointsWidth;
    point2D.y = (point2D.y - boundingEnuMin.y) / boundingPointsHeight;
  }
  const minXYCorner = points2D[0];
  const maxYCorner = points2D[1];
  const maxXCorner = points2D[2];
  const result = new Array(6);
  Cartesian2_default.pack(minXYCorner, result);
  Cartesian2_default.pack(maxYCorner, result, 2);
  Cartesian2_default.pack(maxXCorner, result, 4);
  return result;
};
var Geometry_default = Geometry;

// packages/engine/Source/Renderer/VertexArray.js
function addAttribute(attributes, attribute, index, context) {
  const hasVertexBuffer = defined_default(attribute.vertexBuffer);
  const hasValue = defined_default(attribute.value);
  const componentsPerAttribute = attribute.value ? attribute.value.length : attribute.componentsPerAttribute;
  if (!hasVertexBuffer && !hasValue) {
    throw new DeveloperError_default("attribute must have a vertexBuffer or a value.");
  }
  if (hasVertexBuffer && hasValue) {
    throw new DeveloperError_default(
      "attribute cannot have both a vertexBuffer and a value.  It must have either a vertexBuffer property defining per-vertex data or a value property defining data for all vertices."
    );
  }
  if (componentsPerAttribute !== 1 && componentsPerAttribute !== 2 && componentsPerAttribute !== 3 && componentsPerAttribute !== 4) {
    if (hasValue) {
      throw new DeveloperError_default(
        "attribute.value.length must be in the range [1, 4]."
      );
    }
    throw new DeveloperError_default(
      "attribute.componentsPerAttribute must be in the range [1, 4]."
    );
  }
  if (defined_default(attribute.componentDatatype) && !ComponentDatatype_default.validate(attribute.componentDatatype)) {
    throw new DeveloperError_default(
      "attribute must have a valid componentDatatype or not specify it."
    );
  }
  if (defined_default(attribute.strideInBytes) && attribute.strideInBytes > 255) {
    throw new DeveloperError_default(
      "attribute must have a strideInBytes less than or equal to 255 or not specify it."
    );
  }
  if (defined_default(attribute.instanceDivisor) && attribute.instanceDivisor > 0 && !context.instancedArrays) {
    throw new DeveloperError_default("instanced arrays is not supported");
  }
  if (defined_default(attribute.instanceDivisor) && attribute.instanceDivisor < 0) {
    throw new DeveloperError_default(
      "attribute must have an instanceDivisor greater than or equal to zero"
    );
  }
  if (defined_default(attribute.instanceDivisor) && hasValue) {
    throw new DeveloperError_default(
      "attribute cannot have have an instanceDivisor if it is not backed by a buffer"
    );
  }
  if (defined_default(attribute.instanceDivisor) && attribute.instanceDivisor > 0 && attribute.index === 0) {
    throw new DeveloperError_default(
      "attribute zero cannot have an instanceDivisor greater than 0"
    );
  }
  const attr = {
    index: defaultValue_default(attribute.index, index),
    enabled: defaultValue_default(attribute.enabled, true),
    vertexBuffer: attribute.vertexBuffer,
    value: hasValue ? attribute.value.slice(0) : void 0,
    componentsPerAttribute,
    componentDatatype: defaultValue_default(
      attribute.componentDatatype,
      ComponentDatatype_default.FLOAT
    ),
    normalize: defaultValue_default(attribute.normalize, false),
    offsetInBytes: defaultValue_default(attribute.offsetInBytes, 0),
    strideInBytes: defaultValue_default(attribute.strideInBytes, 0),
    instanceDivisor: defaultValue_default(attribute.instanceDivisor, 0)
  };
  if (hasVertexBuffer) {
    attr.vertexAttrib = function(gl) {
      const index2 = this.index;
      gl.bindBuffer(gl.ARRAY_BUFFER, this.vertexBuffer._getBuffer());
      gl.vertexAttribPointer(
        index2,
        this.componentsPerAttribute,
        this.componentDatatype,
        this.normalize,
        this.strideInBytes,
        this.offsetInBytes
      );
      gl.enableVertexAttribArray(index2);
      if (this.instanceDivisor > 0) {
        context.glVertexAttribDivisor(index2, this.instanceDivisor);
        context._vertexAttribDivisors[index2] = this.instanceDivisor;
        context._previousDrawInstanced = true;
      }
    };
    attr.disableVertexAttribArray = function(gl) {
      gl.disableVertexAttribArray(this.index);
      if (this.instanceDivisor > 0) {
        context.glVertexAttribDivisor(index, 0);
      }
    };
  } else {
    switch (attr.componentsPerAttribute) {
      case 1:
        attr.vertexAttrib = function(gl) {
          gl.vertexAttrib1fv(this.index, this.value);
        };
        break;
      case 2:
        attr.vertexAttrib = function(gl) {
          gl.vertexAttrib2fv(this.index, this.value);
        };
        break;
      case 3:
        attr.vertexAttrib = function(gl) {
          gl.vertexAttrib3fv(this.index, this.value);
        };
        break;
      case 4:
        attr.vertexAttrib = function(gl) {
          gl.vertexAttrib4fv(this.index, this.value);
        };
        break;
    }
    attr.disableVertexAttribArray = function(gl) {
    };
  }
  attributes.push(attr);
}
function bind(gl, attributes, indexBuffer) {
  for (let i = 0; i < attributes.length; ++i) {
    const attribute = attributes[i];
    if (attribute.enabled) {
      attribute.vertexAttrib(gl);
    }
  }
  if (defined_default(indexBuffer)) {
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer._getBuffer());
  }
}
function VertexArray(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  Check_default.defined("options.context", options.context);
  Check_default.defined("options.attributes", options.attributes);
  const context = options.context;
  const gl = context._gl;
  const attributes = options.attributes;
  const indexBuffer = options.indexBuffer;
  let i;
  const vaAttributes = [];
  let numberOfVertices = 1;
  let hasInstancedAttributes = false;
  let hasConstantAttributes = false;
  let length = attributes.length;
  for (i = 0; i < length; ++i) {
    addAttribute(vaAttributes, attributes[i], i, context);
  }
  length = vaAttributes.length;
  for (i = 0; i < length; ++i) {
    const attribute = vaAttributes[i];
    if (defined_default(attribute.vertexBuffer) && attribute.instanceDivisor === 0) {
      const bytes = attribute.strideInBytes || attribute.componentsPerAttribute * ComponentDatatype_default.getSizeInBytes(attribute.componentDatatype);
      numberOfVertices = attribute.vertexBuffer.sizeInBytes / bytes;
      break;
    }
  }
  for (i = 0; i < length; ++i) {
    if (vaAttributes[i].instanceDivisor > 0) {
      hasInstancedAttributes = true;
    }
    if (defined_default(vaAttributes[i].value)) {
      hasConstantAttributes = true;
    }
  }
  const uniqueIndices = {};
  for (i = 0; i < length; ++i) {
    const index = vaAttributes[i].index;
    if (uniqueIndices[index]) {
      throw new DeveloperError_default(
        `Index ${index} is used by more than one attribute.`
      );
    }
    uniqueIndices[index] = true;
  }
  let vao;
  if (context.vertexArrayObject) {
    vao = context.glCreateVertexArray();
    context.glBindVertexArray(vao);
    bind(gl, vaAttributes, indexBuffer);
    context.glBindVertexArray(null);
  }
  this._numberOfVertices = numberOfVertices;
  this._hasInstancedAttributes = hasInstancedAttributes;
  this._hasConstantAttributes = hasConstantAttributes;
  this._context = context;
  this._gl = gl;
  this._vao = vao;
  this._attributes = vaAttributes;
  this._indexBuffer = indexBuffer;
}
function computeNumberOfVertices(attribute) {
  return attribute.values.length / attribute.componentsPerAttribute;
}
function computeAttributeSizeInBytes(attribute) {
  return ComponentDatatype_default.getSizeInBytes(attribute.componentDatatype) * attribute.componentsPerAttribute;
}
function interleaveAttributes(attributes) {
  let j;
  let name;
  let attribute;
  const names = [];
  for (name in attributes) {
    if (attributes.hasOwnProperty(name) && defined_default(attributes[name]) && defined_default(attributes[name].values)) {
      names.push(name);
      if (attributes[name].componentDatatype === ComponentDatatype_default.DOUBLE) {
        attributes[name].componentDatatype = ComponentDatatype_default.FLOAT;
        attributes[name].values = ComponentDatatype_default.createTypedArray(
          ComponentDatatype_default.FLOAT,
          attributes[name].values
        );
      }
    }
  }
  let numberOfVertices;
  const namesLength = names.length;
  if (namesLength > 0) {
    numberOfVertices = computeNumberOfVertices(attributes[names[0]]);
    for (j = 1; j < namesLength; ++j) {
      const currentNumberOfVertices = computeNumberOfVertices(
        attributes[names[j]]
      );
      if (currentNumberOfVertices !== numberOfVertices) {
        throw new RuntimeError_default(
          `${"Each attribute list must have the same number of vertices.  Attribute "}${names[j]} has a different number of vertices (${currentNumberOfVertices.toString()}) than attribute ${names[0]} (${numberOfVertices.toString()}).`
        );
      }
    }
  }
  names.sort(function(left, right) {
    return ComponentDatatype_default.getSizeInBytes(attributes[right].componentDatatype) - ComponentDatatype_default.getSizeInBytes(attributes[left].componentDatatype);
  });
  let vertexSizeInBytes = 0;
  const offsetsInBytes = {};
  for (j = 0; j < namesLength; ++j) {
    name = names[j];
    attribute = attributes[name];
    offsetsInBytes[name] = vertexSizeInBytes;
    vertexSizeInBytes += computeAttributeSizeInBytes(attribute);
  }
  if (vertexSizeInBytes > 0) {
    const maxComponentSizeInBytes = ComponentDatatype_default.getSizeInBytes(
      attributes[names[0]].componentDatatype
    );
    const remainder = vertexSizeInBytes % maxComponentSizeInBytes;
    if (remainder !== 0) {
      vertexSizeInBytes += maxComponentSizeInBytes - remainder;
    }
    const vertexBufferSizeInBytes = numberOfVertices * vertexSizeInBytes;
    const buffer = new ArrayBuffer(vertexBufferSizeInBytes);
    const views = {};
    for (j = 0; j < namesLength; ++j) {
      name = names[j];
      const sizeInBytes = ComponentDatatype_default.getSizeInBytes(
        attributes[name].componentDatatype
      );
      views[name] = {
        pointer: ComponentDatatype_default.createTypedArray(
          attributes[name].componentDatatype,
          buffer
        ),
        index: offsetsInBytes[name] / sizeInBytes,
        // Offset in ComponentType
        strideInComponentType: vertexSizeInBytes / sizeInBytes
      };
    }
    for (j = 0; j < numberOfVertices; ++j) {
      for (let n = 0; n < namesLength; ++n) {
        name = names[n];
        attribute = attributes[name];
        const values = attribute.values;
        const view = views[name];
        const pointer = view.pointer;
        const numberOfComponents = attribute.componentsPerAttribute;
        for (let k = 0; k < numberOfComponents; ++k) {
          pointer[view.index + k] = values[j * numberOfComponents + k];
        }
        view.index += view.strideInComponentType;
      }
    }
    return {
      buffer,
      offsetsInBytes,
      vertexSizeInBytes
    };
  }
  return void 0;
}
VertexArray.fromGeometry = function(options) {
  options = defaultValue_default(options, defaultValue_default.EMPTY_OBJECT);
  Check_default.defined("options.context", options.context);
  const context = options.context;
  const geometry = defaultValue_default(options.geometry, defaultValue_default.EMPTY_OBJECT);
  const bufferUsage = defaultValue_default(
    options.bufferUsage,
    BufferUsage_default.DYNAMIC_DRAW
  );
  const attributeLocations = defaultValue_default(
    options.attributeLocations,
    defaultValue_default.EMPTY_OBJECT
  );
  const interleave = defaultValue_default(options.interleave, false);
  const createdVAAttributes = options.vertexArrayAttributes;
  let name;
  let attribute;
  let vertexBuffer;
  const vaAttributes = defined_default(createdVAAttributes) ? createdVAAttributes : [];
  const attributes = geometry.attributes;
  if (interleave) {
    const interleavedAttributes = interleaveAttributes(attributes);
    if (defined_default(interleavedAttributes)) {
      vertexBuffer = Buffer_default.createVertexBuffer({
        context,
        typedArray: interleavedAttributes.buffer,
        usage: bufferUsage
      });
      const offsetsInBytes = interleavedAttributes.offsetsInBytes;
      const strideInBytes = interleavedAttributes.vertexSizeInBytes;
      for (name in attributes) {
        if (attributes.hasOwnProperty(name) && defined_default(attributes[name])) {
          attribute = attributes[name];
          if (defined_default(attribute.values)) {
            vaAttributes.push({
              index: attributeLocations[name],
              vertexBuffer,
              componentDatatype: attribute.componentDatatype,
              componentsPerAttribute: attribute.componentsPerAttribute,
              normalize: attribute.normalize,
              offsetInBytes: offsetsInBytes[name],
              strideInBytes
            });
          } else {
            vaAttributes.push({
              index: attributeLocations[name],
              value: attribute.value,
              componentDatatype: attribute.componentDatatype,
              normalize: attribute.normalize
            });
          }
        }
      }
    }
  } else {
    for (name in attributes) {
      if (attributes.hasOwnProperty(name) && defined_default(attributes[name])) {
        attribute = attributes[name];
        let componentDatatype = attribute.componentDatatype;
        if (componentDatatype === ComponentDatatype_default.DOUBLE) {
          componentDatatype = ComponentDatatype_default.FLOAT;
        }
        vertexBuffer = void 0;
        if (defined_default(attribute.values)) {
          vertexBuffer = Buffer_default.createVertexBuffer({
            context,
            typedArray: ComponentDatatype_default.createTypedArray(
              componentDatatype,
              attribute.values
            ),
            usage: bufferUsage
          });
        }
        vaAttributes.push({
          index: attributeLocations[name],
          vertexBuffer,
          value: attribute.value,
          componentDatatype,
          componentsPerAttribute: attribute.componentsPerAttribute,
          normalize: attribute.normalize
        });
      }
    }
  }
  let indexBuffer;
  const indices = geometry.indices;
  if (defined_default(indices)) {
    if (Geometry_default.computeNumberOfVertices(geometry) >= Math_default.SIXTY_FOUR_KILOBYTES && context.elementIndexUint) {
      indexBuffer = Buffer_default.createIndexBuffer({
        context,
        typedArray: new Uint32Array(indices),
        usage: bufferUsage,
        indexDatatype: IndexDatatype_default.UNSIGNED_INT
      });
    } else {
      indexBuffer = Buffer_default.createIndexBuffer({
        context,
        typedArray: new Uint16Array(indices),
        usage: bufferUsage,
        indexDatatype: IndexDatatype_default.UNSIGNED_SHORT
      });
    }
  }
  return new VertexArray({
    context,
    attributes: vaAttributes,
    indexBuffer
  });
};
Object.defineProperties(VertexArray.prototype, {
  numberOfAttributes: {
    get: function() {
      return this._attributes.length;
    }
  },
  numberOfVertices: {
    get: function() {
      return this._numberOfVertices;
    }
  },
  indexBuffer: {
    get: function() {
      return this._indexBuffer;
    }
  }
});
VertexArray.prototype.getAttribute = function(index) {
  Check_default.defined("index", index);
  return this._attributes[index];
};
function setVertexAttribDivisor(vertexArray) {
  const context = vertexArray._context;
  const hasInstancedAttributes = vertexArray._hasInstancedAttributes;
  if (!hasInstancedAttributes && !context._previousDrawInstanced) {
    return;
  }
  context._previousDrawInstanced = hasInstancedAttributes;
  const divisors = context._vertexAttribDivisors;
  const attributes = vertexArray._attributes;
  const maxAttributes = ContextLimits_default.maximumVertexAttributes;
  let i;
  if (hasInstancedAttributes) {
    const length = attributes.length;
    for (i = 0; i < length; ++i) {
      const attribute = attributes[i];
      if (attribute.enabled) {
        const divisor = attribute.instanceDivisor;
        const index = attribute.index;
        if (divisor !== divisors[index]) {
          context.glVertexAttribDivisor(index, divisor);
          divisors[index] = divisor;
        }
      }
    }
  } else {
    for (i = 0; i < maxAttributes; ++i) {
      if (divisors[i] > 0) {
        context.glVertexAttribDivisor(i, 0);
        divisors[i] = 0;
      }
    }
  }
}
function setConstantAttributes(vertexArray, gl) {
  const attributes = vertexArray._attributes;
  const length = attributes.length;
  for (let i = 0; i < length; ++i) {
    const attribute = attributes[i];
    if (attribute.enabled && defined_default(attribute.value)) {
      attribute.vertexAttrib(gl);
    }
  }
}
VertexArray.prototype._bind = function() {
  if (defined_default(this._vao)) {
    this._context.glBindVertexArray(this._vao);
    if (this._context.instancedArrays) {
      setVertexAttribDivisor(this);
    }
    if (this._hasConstantAttributes) {
      setConstantAttributes(this, this._gl);
    }
  } else {
    bind(this._gl, this._attributes, this._indexBuffer);
  }
};
VertexArray.prototype._unBind = function() {
  if (defined_default(this._vao)) {
    this._context.glBindVertexArray(null);
  } else {
    const attributes = this._attributes;
    const gl = this._gl;
    for (let i = 0; i < attributes.length; ++i) {
      const attribute = attributes[i];
      if (attribute.enabled) {
        attribute.disableVertexAttribArray(gl);
      }
    }
    if (this._indexBuffer) {
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
    }
  }
};
VertexArray.prototype.isDestroyed = function() {
  return false;
};
VertexArray.prototype.destroy = function() {
  const attributes = this._attributes;
  for (let i = 0; i < attributes.length; ++i) {
    const vertexBuffer = attributes[i].vertexBuffer;
    if (defined_default(vertexBuffer) && !vertexBuffer.isDestroyed() && vertexBuffer.vertexArrayDestroyable) {
      vertexBuffer.destroy();
    }
  }
  const indexBuffer = this._indexBuffer;
  if (defined_default(indexBuffer) && !indexBuffer.isDestroyed() && indexBuffer.vertexArrayDestroyable) {
    indexBuffer.destroy();
  }
  if (defined_default(this._vao)) {
    this._context.glDeleteVertexArray(this._vao);
  }
  return destroyObject_default(this);
};
var VertexArray_default = VertexArray;

// packages/engine/index.js
globalThis.CESIUM_VERSION = "1.109";

// Specs/equals.js
function isTypedArray(o) {
  return FeatureDetection_default.typedArrayTypes.some(function(type) {
    return o instanceof type;
  });
}
function typedArrayToArray(array) {
  if (array !== null && typeof array === "object" && isTypedArray(array)) {
    return Array.prototype.slice.call(array, 0);
  }
  return array;
}
function equals(util, a3, b) {
  a3 = typedArrayToArray(a3);
  b = typedArrayToArray(b);
  return util.equals(a3, b);
}
var equals_default = equals;

// Specs/addDefaultMatchers.js
function createMissingFunctionMessageFunction(item, actualPrototype, expectedInterfacePrototype) {
  return function() {
    return `Expected function '${item}' to exist on ${actualPrototype.constructor.name} because it should implement interface ${expectedInterfacePrototype.constructor.name}.`;
  };
}
function makeAsyncThrowFunction(debug, Type, name) {
  if (debug) {
    return function(util) {
      return {
        compare: function(actualPromise, message) {
          if (!defined_default(actualPromise) || !defined_default(actualPromise.then)) {
            throw new Error("Expected function to be called on a promise.");
          }
          return actualPromise.then(() => {
            return {
              pass: false,
              message: "Expected a promise to be rejected but it was resolved."
            };
          }).catch((e) => {
            let result = e instanceof Type || e.name === name;
            if (defined_default(message)) {
              result = result && util.equals(e.message, message);
            }
            return {
              pass: result,
              message: result ? `Expected a promise to be rejected with ${name}.` : `Expected a promise to be rejected with ${defined_default(message) ? `${name}: ${message}` : name}, but it was rejected with ${e}`
            };
          });
        }
      };
    };
  }
  return function() {
    return {
      compare: function(actualPromise) {
        return Promise.resolve(actualPromise).then(() => {
          return { pass: true };
        }).catch((e) => {
          return { pass: true };
        });
      },
      negativeCompare: function(actualPromise) {
        return Promise.resolve(actualPromise).then(() => {
          return { pass: true };
        }).catch((e) => {
          return { pass: true };
        });
      }
    };
  };
}
function makeThrowFunction(debug, Type, name) {
  if (debug) {
    return function(util) {
      return {
        compare: function(actual, expected) {
          let result = false;
          let exception;
          if (typeof actual !== "function") {
            throw new Error("Actual is not a function");
          }
          try {
            actual();
          } catch (e) {
            exception = e;
          }
          if (exception) {
            result = exception instanceof Type || exception.name === name;
          }
          let message;
          if (result) {
            message = [
              `Expected function not to throw ${name} , but it threw`,
              exception.message || exception
            ].join(" ");
          } else {
            message = `Expected function to throw ${name}.`;
          }
          return {
            pass: result,
            message
          };
        }
      };
    };
  }
  return function() {
    return {
      compare: function(actual, expected) {
        return { pass: true };
      },
      negativeCompare: function(actual, expected) {
        return { pass: true };
      }
    };
  };
}
function createDefaultMatchers(debug) {
  return {
    toBeBetween: function(util) {
      return {
        compare: function(actual, lower, upper) {
          if (lower > upper) {
            const tmp = upper;
            upper = lower;
            lower = tmp;
          }
          return { pass: actual >= lower && actual <= upper };
        }
      };
    },
    toStartWith: function(util) {
      return {
        compare: function(actual, expected) {
          return { pass: actual.slice(0, expected.length) === expected };
        }
      };
    },
    toEndWith: function(util) {
      return {
        compare: function(actual, expected) {
          return { pass: actual.slice(-expected.length) === expected };
        }
      };
    },
    toEqual: function(util) {
      return {
        compare: function(actual, expected) {
          return {
            pass: equals_default(util, actual, expected)
          };
        }
      };
    },
    toEqualEpsilon: function(util) {
      return {
        compare: function(actual, expected, epsilon) {
          function equalityTester(a3, b) {
            a3 = typedArrayToArray2(a3);
            b = typedArrayToArray2(b);
            if (Array.isArray(a3) && Array.isArray(b)) {
              if (a3.length !== b.length) {
                return false;
              }
              for (let i = 0; i < a3.length; ++i) {
                if (!equalityTester(a3[i], b[i])) {
                  return false;
                }
              }
              return true;
            }
            let to_run;
            if (defined_default(a3)) {
              if (typeof a3.equalsEpsilon === "function") {
                return a3.equalsEpsilon(b, epsilon);
              } else if (a3 instanceof Object) {
                to_run = Object.getPrototypeOf(a3).constructor.equalsEpsilon;
                if (typeof to_run === "function") {
                  return to_run(a3, b, epsilon);
                }
              }
            }
            if (defined_default(b)) {
              if (typeof b.equalsEpsilon === "function") {
                return b.equalsEpsilon(a3, epsilon);
              } else if (b instanceof Object) {
                to_run = Object.getPrototypeOf(b).constructor.equalsEpsilon;
                if (typeof to_run === "function") {
                  return to_run(b, a3, epsilon);
                }
              }
            }
            if (typeof a3 === "number" || typeof b === "number") {
              return Math.abs(a3 - b) <= epsilon;
            }
            if (defined_default(a3) && defined_default(b)) {
              const keys = Object.keys(a3);
              for (let i = 0; i < keys.length; i++) {
                if (!b.hasOwnProperty(keys[i])) {
                  return false;
                }
                const aVal = a3[keys[i]];
                const bVal = b[keys[i]];
                if (!equalityTester(aVal, bVal)) {
                  return false;
                }
              }
              return true;
            }
            return equals_default(util, a3, b);
          }
          const result = equalityTester(actual, expected);
          return { pass: result };
        }
      };
    },
    toConformToInterface: function(util) {
      return {
        compare: function(actual, expectedInterface) {
          const actualPrototype = actual.prototype;
          const expectedInterfacePrototype = expectedInterface.prototype;
          for (const item in expectedInterfacePrototype) {
            if (expectedInterfacePrototype.hasOwnProperty(item) && typeof expectedInterfacePrototype[item] === "function" && !actualPrototype.hasOwnProperty(item)) {
              return {
                pass: false,
                message: createMissingFunctionMessageFunction(
                  item,
                  actualPrototype,
                  expectedInterfacePrototype
                )
              };
            }
          }
          return { pass: true };
        }
      };
    },
    toRender: function(util) {
      return {
        compare: function(actual, expected) {
          return renderEquals(util, actual, expected, true);
        }
      };
    },
    notToRender: function(util) {
      return {
        compare: function(actual, expected) {
          return renderEquals(util, actual, expected, false);
        }
      };
    },
    toRenderAndCall: function(util) {
      return {
        compare: function(actual, expected) {
          const actualRgba = renderAndReadPixels(actual);
          const webglStub2 = !!window.webglStub;
          if (!webglStub2) {
            const callback = expected;
            callback(actualRgba);
          }
          return {
            pass: true
          };
        }
      };
    },
    toRenderPixelCountAndCall: function(util) {
      return {
        compare: function(actual, expected) {
          const actualRgba = renderAndReadPixels(actual);
          const webglStub2 = !!window.webglStub;
          if (!webglStub2) {
            const callback = expected;
            callback(countRenderedPixels(actualRgba));
          }
          return {
            pass: true
          };
        }
      };
    },
    toPickPrimitive: function(util) {
      return {
        compare: function(actual, expected, x, y, width, height) {
          return pickPrimitiveEquals(actual, expected, x, y, width, height);
        }
      };
    },
    notToPick: function(util) {
      return {
        compare: function(actual, x, y, width, height) {
          return pickPrimitiveEquals(actual, void 0, x, y, width, height);
        }
      };
    },
    toDrillPickPrimitive: function(util) {
      return {
        compare: function(actual, expected, x, y, width, height) {
          return drillPickPrimitiveEquals(actual, 1, x, y, width, height);
        }
      };
    },
    notToDrillPick: function(util) {
      return {
        compare: function(actual, x, y, width, height) {
          return drillPickPrimitiveEquals(actual, 0, x, y, width, height);
        }
      };
    },
    toPickAndCall: function(util) {
      return {
        compare: function(actual, expected, args) {
          const scene = actual;
          const result = scene.pick(defaultValue_default(args, new Cartesian2_default(0, 0)));
          const webglStub2 = !!window.webglStub;
          if (!webglStub2) {
            const callback = expected;
            callback(result);
          }
          return {
            pass: true
          };
        }
      };
    },
    toDrillPickAndCall: function(util) {
      return {
        compare: function(actual, expected, limit) {
          const scene = actual;
          const pickedObjects = scene.drillPick(new Cartesian2_default(0, 0), limit);
          const webglStub2 = !!window.webglStub;
          if (!webglStub2) {
            const callback = expected;
            callback(pickedObjects);
          }
          return {
            pass: true
          };
        }
      };
    },
    toPickFromRayAndCall: function(util) {
      return {
        compare: function(actual, expected, ray, objectsToExclude, width) {
          const scene = actual;
          const result = scene.pickFromRay(ray, objectsToExclude, width);
          const webglStub2 = !!window.webglStub;
          if (!webglStub2) {
            const callback = expected;
            callback(result);
          }
          return {
            pass: true
          };
        }
      };
    },
    toDrillPickFromRayAndCall: function(util) {
      return {
        compare: function(actual, expected, ray, limit, objectsToExclude, width) {
          const scene = actual;
          const results = scene.drillPickFromRay(
            ray,
            limit,
            objectsToExclude,
            width
          );
          const webglStub2 = !!window.webglStub;
          if (!webglStub2) {
            const callback = expected;
            callback(results);
          }
          return {
            pass: true
          };
        }
      };
    },
    toSampleHeightAndCall: function(util) {
      return {
        compare: function(actual, expected, position, objectsToExclude, width) {
          const scene = actual;
          const results = scene.sampleHeight(position, objectsToExclude, width);
          const webglStub2 = !!window.webglStub;
          if (!webglStub2) {
            const callback = expected;
            callback(results);
          }
          return {
            pass: true
          };
        }
      };
    },
    toClampToHeightAndCall: function(util) {
      return {
        compare: function(actual, expected, cartesian, objectsToExclude, width) {
          const scene = actual;
          const results = scene.clampToHeight(
            cartesian,
            objectsToExclude,
            width
          );
          const webglStub2 = !!window.webglStub;
          if (!webglStub2) {
            const callback = expected;
            callback(results);
          }
          return {
            pass: true
          };
        }
      };
    },
    toPickPositionAndCall: function(util) {
      return {
        compare: function(actual, expected, x, y) {
          const scene = actual;
          const canvas = scene.canvas;
          x = defaultValue_default(x, canvas.clientWidth / 2);
          y = defaultValue_default(y, canvas.clientHeight / 2);
          const result = scene.pickPosition(new Cartesian2_default(x, y));
          const webglStub2 = !!window.webglStub;
          if (!webglStub2) {
            const callback = expected;
            callback(result);
          }
          return {
            pass: true
          };
        }
      };
    },
    toReadPixels: function(util) {
      return {
        compare: function(actual, expected) {
          let context;
          let framebuffer;
          let epsilon = 0;
          const options = actual;
          if (defined_default(options.context)) {
            context = options.context;
            framebuffer = options.framebuffer;
            epsilon = defaultValue_default(options.epsilon, epsilon);
          } else {
            context = options;
          }
          const rgba = context.readPixels({
            framebuffer
          });
          let pass = true;
          let message;
          const webglStub2 = !!window.webglStub;
          if (!webglStub2) {
            if (!Math_default.equalsEpsilon(rgba[0], expected[0], 0, epsilon) || !Math_default.equalsEpsilon(rgba[1], expected[1], 0, epsilon) || !Math_default.equalsEpsilon(rgba[2], expected[2], 0, epsilon) || !Math_default.equalsEpsilon(rgba[3], expected[3], 0, epsilon)) {
              pass = false;
              if (epsilon === 0) {
                message = `Expected context to render ${expected}, but rendered: ${rgba}`;
              } else {
                message = `Expected context to render ${expected} with epsilon = ${epsilon}, but rendered: ${rgba}`;
              }
            }
          }
          return {
            pass,
            message
          };
        }
      };
    },
    notToReadPixels: function(util) {
      return {
        compare: function(actual, expected) {
          const context = actual;
          const rgba = context.readPixels();
          let pass = true;
          let message;
          const webglStub2 = !!window.webglStub;
          if (!webglStub2) {
            if (rgba[0] === expected[0] && rgba[1] === expected[1] && rgba[2] === expected[2] && rgba[3] === expected[3]) {
              pass = false;
              message = `Expected context not to render ${expected}, but rendered: ${rgba}`;
            }
          }
          return {
            pass,
            message
          };
        }
      };
    },
    contextToRenderAndCall: function(util) {
      return {
        compare: function(actual, expected) {
          const actualRgba = contextRenderAndReadPixels(actual).color;
          const webglStub2 = !!window.webglStub;
          if (!webglStub2) {
            const callback = expected;
            callback(actualRgba);
          }
          return {
            pass: true
          };
        }
      };
    },
    contextToRender: function(util) {
      return {
        compare: function(actual, expected) {
          return expectContextToRender(actual, expected, true);
        }
      };
    },
    notContextToRender: function(util) {
      return {
        compare: function(actual, expected) {
          return expectContextToRender(actual, expected, false);
        }
      };
    },
    toBeImageOrImageBitmap: function(util) {
      return {
        compare: function(actual) {
          if (typeof createImageBitmap !== "function") {
            return {
              pass: actual instanceof Image
            };
          }
          return {
            pass: actual instanceof ImageBitmap || actual instanceof Image
          };
        }
      };
    },
    toThrowDeveloperError: makeThrowFunction(
      debug,
      DeveloperError_default,
      "DeveloperError"
    )
  };
}
function createDefaultAsyncMatchers(debug) {
  return {
    toBeRejectedWithDeveloperError: makeAsyncThrowFunction(
      debug,
      DeveloperError_default,
      "DeveloperError"
    )
  };
}
function countRenderedPixels(rgba) {
  const pixelCount = rgba.length / 4;
  let count = 0;
  for (let i = 0; i < pixelCount; i++) {
    const index = i * 4;
    if (rgba[index] !== 0 || rgba[index + 1] !== 0 || rgba[index + 2] !== 0 || rgba[index + 3] !== 255) {
      count++;
    }
  }
  return count;
}
function renderAndReadPixels(options) {
  let scene;
  if (defined_default(options.scene)) {
    scene = options.scene;
    const time = options.time;
    scene.initializeFrame();
    if (defined_default(options.primeShadowMap)) {
      scene.render(time);
    }
    scene.render(time);
  } else {
    scene = options;
    scene.initializeFrame();
    scene.render();
  }
  return scene.context.readPixels();
}
function isTypedArray2(o) {
  return FeatureDetection_default.typedArrayTypes.some(function(type) {
    return o instanceof type;
  });
}
function typedArrayToArray2(array) {
  if (isTypedArray2(array)) {
    return Array.prototype.slice.call(array, 0);
  }
  return array;
}
function renderEquals(util, actual, expected, expectEqual) {
  const actualRgba = renderAndReadPixels(actual);
  if (!!window.webglStub) {
    return {
      pass: true
    };
  }
  const eq = equals_default(util, actualRgba, expected);
  const pass = expectEqual ? eq : !eq;
  let message;
  if (!pass) {
    message = `Expected ${expectEqual ? "" : "not "}to render [${typedArrayToArray2(
      expected
    )}], but actually rendered [${typedArrayToArray2(actualRgba)}].`;
  }
  return {
    pass,
    message
  };
}
function pickPrimitiveEquals(actual, expected, x, y, width, height) {
  const scene = actual;
  const windowPosition = new Cartesian2_default(x, y);
  const result = scene.pick(windowPosition, width, height);
  if (!!window.webglStub) {
    return {
      pass: true
    };
  }
  let pass = true;
  let message;
  if (defined_default(expected)) {
    pass = result.primitive === expected;
  } else {
    pass = !defined_default(result);
  }
  if (!pass) {
    message = `Expected to pick ${expected}, but picked: ${result}`;
  }
  return {
    pass,
    message
  };
}
function drillPickPrimitiveEquals(actual, expected, x, y, width, height) {
  const scene = actual;
  const windowPosition = new Cartesian2_default(x, y);
  const result = scene.drillPick(windowPosition, void 0, width, height);
  if (!!window.webglStub) {
    return {
      pass: true
    };
  }
  let pass = true;
  let message;
  if (defined_default(expected)) {
    pass = result.length === expected;
  } else {
    pass = !defined_default(result);
  }
  if (!pass) {
    message = `Expected to pick ${expected}, but picked: ${result}`;
  }
  return {
    pass,
    message
  };
}
function contextRenderAndReadPixels(options) {
  const context = options.context;
  let vs = options.vertexShader;
  const fs = options.fragmentShader;
  let sp = options.shaderProgram;
  const uniformMap = options.uniformMap;
  const modelMatrix = options.modelMatrix;
  const depth = defaultValue_default(options.depth, 0);
  const clear = defaultValue_default(options.clear, true);
  let clearColor;
  if (!defined_default(context)) {
    throw new DeveloperError_default("options.context is required.");
  }
  if (!defined_default(fs) && !defined_default(sp)) {
    throw new DeveloperError_default(
      "options.fragmentShader or options.shaderProgram is required."
    );
  }
  if (defined_default(fs) && defined_default(sp)) {
    throw new DeveloperError_default(
      "Both options.fragmentShader and options.shaderProgram can not be used at the same time."
    );
  }
  if (defined_default(vs) && defined_default(sp)) {
    throw new DeveloperError_default(
      "Both options.vertexShader and options.shaderProgram can not be used at the same time."
    );
  }
  if (!defined_default(sp)) {
    if (!defined_default(vs)) {
      vs = "in vec4 position; void main() { gl_PointSize = 1.0; gl_Position = position; }";
    }
    sp = ShaderProgram_default.fromCache({
      context,
      vertexShaderSource: vs,
      fragmentShaderSource: fs,
      attributeLocations: {
        position: 0
      }
    });
  }
  let va = new VertexArray_default({
    context,
    attributes: [
      {
        index: 0,
        vertexBuffer: Buffer_default.createVertexBuffer({
          context,
          typedArray: new Float32Array([0, 0, depth, 1]),
          usage: BufferUsage_default.STATIC_DRAW
        }),
        componentsPerAttribute: 4
      }
    ]
  });
  if (clear) {
    ClearCommand_default.ALL.execute(context);
    clearColor = context.readPixels();
  }
  const command = new DrawCommand_default({
    primitiveType: PrimitiveType_default.POINTS,
    shaderProgram: sp,
    vertexArray: va,
    uniformMap,
    modelMatrix
  });
  command.execute(context);
  const rgba = context.readPixels();
  sp = sp.destroy();
  va = va.destroy();
  return {
    color: rgba,
    clearColor
  };
}
function expectContextToRender(actual, expected, expectEqual) {
  const options = actual;
  const context = options.context;
  const clear = defaultValue_default(options.clear, true);
  const epsilon = defaultValue_default(options.epsilon, 0);
  if (!defined_default(expected)) {
    expected = [255, 255, 255, 255];
  }
  const webglStub2 = !!window.webglStub;
  const output = contextRenderAndReadPixels(options);
  if (clear) {
    const clearedRgba = output.clearColor;
    if (!webglStub2) {
      const expectedAlpha = context.options.webgl.alpha ? 0 : 255;
      if (clearedRgba[0] !== 0 || clearedRgba[1] !== 0 || clearedRgba[2] !== 0 || clearedRgba[3] !== expectedAlpha) {
        return {
          pass: false,
          message: `After clearing the framebuffer, expected context to render [0, 0, 0, ${expectedAlpha}], but rendered: ${clearedRgba}`
        };
      }
    }
  }
  const rgba = output.color;
  if (!webglStub2) {
    if (expectEqual) {
      if (!Math_default.equalsEpsilon(rgba[0], expected[0], 0, epsilon) || !Math_default.equalsEpsilon(rgba[1], expected[1], 0, epsilon) || !Math_default.equalsEpsilon(rgba[2], expected[2], 0, epsilon) || !Math_default.equalsEpsilon(rgba[3], expected[3], 0, epsilon)) {
        return {
          pass: false,
          message: `Expected context to render ${expected}, but rendered: ${rgba}`
        };
      }
    } else if (Math_default.equalsEpsilon(rgba[0], expected[0], 0, epsilon) && Math_default.equalsEpsilon(rgba[1], expected[1], 0, epsilon) && Math_default.equalsEpsilon(rgba[2], expected[2], 0, epsilon) && Math_default.equalsEpsilon(rgba[3], expected[3], 0, epsilon)) {
      return {
        pass: false,
        message: `Expected context not to render ${expected}, but rendered: ${rgba}`
      };
    }
  }
  return {
    pass: true
  };
}
function addDefaultMatchers(debug) {
  return function() {
    this.addMatchers(createDefaultMatchers(debug));
    this.addAsyncMatchers(createDefaultAsyncMatchers(debug));
  };
}
var addDefaultMatchers_default = addDefaultMatchers;

// Specs/equalsMethodEqualityTester.js
function equalsMethodEqualityTester(a3, b) {
  let to_run;
  if (a3 !== null && defined_default(a3)) {
    if (typeof a3.equals === "function") {
      return a3.equals(b);
    } else if (a3 instanceof Object) {
      to_run = Object.getPrototypeOf(a3).constructor.equals;
      if (typeof to_run === "function") {
        return to_run(a3, b);
      }
    }
  }
  if (b !== null && defined_default(b)) {
    if (typeof b.equals === "function") {
      return b.equals(a3);
    } else if (b instanceof Object) {
      to_run = Object.getPrototypeOf(b).constructor.equals;
      if (typeof to_run === "function") {
        return to_run(b, a3);
      }
    }
  }
  return void 0;
}
var equalsMethodEqualityTester_default = equalsMethodEqualityTester;

// Specs/customizeJasmine.js
function customizeJasmine(env2, includedCategory, excludedCategory, webglValidation2, webglStub2, release2, debugCanvasWidth2, debugCanvasHeight2) {
  window.devicePixelRatio = 1;
  window.specsUsingRelease = release2;
  const originalDescribe = window.describe;
  window.describe = function(name, suite, category) {
    if (includedCategory && includedCategory !== "" && includedCategory !== "none" && category !== includedCategory) {
      window.xdescribe(name, suite);
    } else if (excludedCategory && excludedCategory !== "" && category === excludedCategory) {
      window.xdescribe(name, suite);
    } else {
      originalDescribe(name, suite);
    }
  };
  if (webglValidation2) {
    window.webglValidation = true;
  }
  if (webglStub2) {
    window.webglStub = true;
  }
  window.debugCanvasWidth = debugCanvasWidth2;
  window.debugCanvasHeight = debugCanvasHeight2;
  env2.beforeEach(function() {
    addDefaultMatchers_default(!release2).call(env2);
    env2.addCustomEqualityTester(equalsMethodEqualityTester_default);
  });
}
var customizeJasmine_default = customizeJasmine;

// Specs/spec-main.js
var queryString = queryToObject_default(window.location.search.substring(1));
var webglValidation = false;
var webglStub = false;
var debugCanvasWidth;
var debugCanvasHeight;
var release = window.location.search.indexOf("release") !== -1;
var categoryString = queryString.category;
var excludeCategoryString = queryString.not;
if (defined_default(queryString.webglValidation)) {
  webglValidation = true;
}
if (defined_default(queryString.webglStub)) {
  webglStub = true;
}
if (defined_default(queryString.debugCanvasWidth)) {
  debugCanvasWidth = parseInt(queryString.debugCanvasWidth);
}
if (defined_default(queryString.debugCanvasHeight)) {
  debugCanvasHeight = parseInt(queryString.debugCanvasHeight);
}
if (release) {
  window.CESIUM_BASE_URL = "../Build/Cesium";
} else {
  window.CESIUM_BASE_URL = "../Build/CesiumUnminified";
}
jasmine.DEFAULT_TIMEOUT_INTERVAL = 3e4;
var specFilter = new jasmine.HtmlSpecFilter({
  filterString: function() {
    return queryString.spec;
  }
});
var env = jasmine.getEnv();
env.configure({
  stopSpecOnExpectationFailure: false,
  stopOnSpecFailure: false,
  random: false,
  hideDisabled: true,
  specFilter: function(spec) {
    if (!specFilter.matches(spec.getFullName()) || categoryString === "none" && !defined_default(queryString.spec)) {
      return false;
    }
    return true;
  }
});
customizeJasmine_default(
  env,
  categoryString,
  excludeCategoryString,
  webglValidation,
  webglStub,
  release,
  debugCanvasWidth,
  debugCanvasHeight
);
/*! Bundled license information:

urijs/src/punycode.js:
  (*! https://mths.be/punycode v1.4.0 by @mathias *)

urijs/src/IPv6.js:
  (*!
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
   *)

urijs/src/SecondLevelDomains.js:
  (*!
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
   *)

urijs/src/URI.js:
  (*!
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
   *)
*/
//# sourceMappingURL=spec-main.js.map
