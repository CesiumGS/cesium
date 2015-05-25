/**
 * @license The MIT License (MIT)
 *
 * Copyright (c) 2014 Felipe O. Carvalho
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */
define(['JSXTransformer', 'text'], function (JSXTransformer, text) {

  'use strict';

  var buildMap = {};

  var jsx = {
    version: '0.6.0',

    load: function (name, req, onLoadNative, config) {
      var jsxOptions = config.jsx || {};
      var fileExtension = jsxOptions.fileExtension || '.js';

      var transformOptions = {
        harmony: !!jsxOptions.harmony,
        stripTypes: !!jsxOptions.stripTypes
      };

      var onLoad = function(content) {
        try {
          content = JSXTransformer.transform(content, transformOptions).code;
        } catch (err) {
          onLoadNative.error(err);
        }

        if (config.isBuild) {
          buildMap[name] = content;
        } else if (typeof location !== 'undefined') { // Do not create sourcemap when loaded in Node
          content += '\n//# sourceURL=' + location.protocol + '//' + location.hostname +
            config.baseUrl + name + fileExtension;
        }

        onLoadNative.fromText(content);
      };

      onLoad.error = function(err) {
        onLoadNative.error(err);
      };

      text.load(name + fileExtension, req, onLoad, config);
    },

    write: function (pluginName, moduleName, write) {
      if (buildMap.hasOwnProperty(moduleName)) {
        var content = buildMap[moduleName];
        write.asModule(pluginName + '!' + moduleName, content);
      }
    }
  };

  return jsx;
});
