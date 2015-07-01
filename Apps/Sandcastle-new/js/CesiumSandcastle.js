/*global require,Blob,CodeMirror,JSHINT*/
/*global gallery_demos*/ // defined by gallery/gallery-index.js, created by build
/*global sandcastleJsHintOptions*/ // defined by jsHintOptions.js, created by build
require({
  baseUrl: '.',
  shim: {
    bootstrap: {
      "deps": ['jquery']
    }
  },
  paths: {
    jquery: '//code.jquery.com/jquery-1.11.2.min',
    bootstrap: '../../ThirdParty/bootstrap-3.3.2/js/bootstrap.min'
  },
  // jsx: {
  // fileExtension: '.jsx',
  // harmony: true,
  // stripTypes: true
  // },
  packages: [{
    name: 'bootstrap',
    location: '../../ThirdParty/bootstrap-3.3.2/js'
  }, {
    name: 'Source',
    location: '../../Source'
  }, {
    name: 'CodeMirror',
    location: '../../ThirdParty/codemirror-4.6'
  }]
}, [
  'jquery',
  'Source/Cesium',
  'CodeMirror/lib/codemirror',
  'CodeMirror/addon/hint/show-hint',
  'CodeMirror/addon/hint/javascript-hint',
  'CodeMirror/mode/javascript/javascript',
  'CodeMirror/mode/css/css',
  'CodeMirror/mode/xml/xml',
  'CodeMirror/mode/htmlmixed/htmlmixed',
  'bootstrap'
], function(
  $,
  Cesium,
  CodeMirror) {
  "use strict";

  //In order for CodeMirror auto-complete to work, Cesium needs to be defined as a global.
  window.Cesium = Cesium;
  $('#loading').addClass('hidden');

  var jsEditor = CodeMirror.fromTextArea($('#jsEditor').get(0), {
    mode: 'javascript',
    gutters: ['hintGutter', 'errorGutter', 'searchGutter', 'highlightGutter'],
    lineNumbers: true,
    matchBrackets: true,
    indentUnit: 4,
    extraKeys: {
      'Ctrl-Space': 'autocomplete',
      'F8': 'runCesium',
      'Tab': 'indentMore',
      'Shift-Tab': 'indentLess'
    }
  });

  var htmlEditor = CodeMirror.fromTextArea($('#htmlEditor').get(0), {
    mode: 'text/html',
    lineNumbers: true,
    matchBrackets: true,
    indentUnit: 4,
    extraKeys: {
      'Ctrl-Space': 'autocomplete',
      'F8': 'runCesium',
      'Tab': 'indentMore',
      'Shift-Tab': 'indentLess'
    }
  });

  var cssEditor = CodeMirror.fromTextArea($('#cssEditor').get(0), {
    mode: 'text/css',
    lineNumbers: true,
    matchBrackets: true,
    indentUnit: 4,
    extraKeys: {
      'Ctrl-Space': 'autocomplete',
      'F8': 'runCesium',
      'Tab': 'indentMore',
      'Shift-Tab': 'indentLess'
    }
  });

  $('#codeContainerTabs a[data-toggle="tab"]').on('shown.bs.tab', function(e){
      if($(e.target).attr("href") === "#htmlContainer")
      {
          htmlEditor.refresh();
          htmlEditor.focus();
      }
      else if($(e.target).attr("href") === "#cssContainer")
      {
          cssEditor.refresh();
          cssEditor.focus();
      }
      else
      {
        jsEditor.refresh();
        jsEditor.focus();
      }
  });
  // CodeMirror.commands.runCesium = function(cm) {
  //   PubSub.publish('RELOAD FRAME', '');
  // }

});