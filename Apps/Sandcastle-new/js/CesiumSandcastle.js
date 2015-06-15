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
    bootstrap: '../../ThirdParty/bootstrap-3.3.2/js/bootstrap.min',
    pubsub: 'js/vendor/pubsub',
    react: '//fb.me/react-with-addons-0.13.3',
    JSXTransformer: '//fb.me/JSXTransformer-0.13.3',
    text: 'js/text',
    jsx: 'js/jsx'
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
  'react',
  'jsx!js/SandcastleApp',
  'jquery',
  'Source/Cesium',
  'pubsub',
  'CodeMirror/lib/codemirror',
  'CodeMirror/addon/hint/show-hint',
  'CodeMirror/addon/hint/javascript-hint',
  'CodeMirror/mode/javascript/javascript',
  'CodeMirror/mode/css/css',
  'CodeMirror/mode/xml/xml',
  'CodeMirror/mode/htmlmixed/htmlmixed',
  'bootstrap'
], function(
  React,
  SandcastleApp,
  $,
  Cesium,
  PubSub,
  CodeMirror) {
  "use strict";

  //In order for CodeMirror auto-complete to work, Cesium needs to be defined as a global.
  window.Cesium = Cesium;

  React.render(
    React.createElement(SandcastleApp, null),
    document.getElementById('appLayout')
  );

  CodeMirror.commands.runCesium = function(cm) {
    PubSub.publish('RELOAD FRAME', '');
  }

});