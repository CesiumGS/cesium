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
    knockout: '../../ThirdParty/knockout-3.3.0'
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
  'knockout',
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
  ko,
  Cesium,
  CodeMirror) {
  "use strict";

  //In order for CodeMirror auto-complete to work, Cesium needs to be defined as a global.
  window.Cesium = Cesium;
  $('#loading').addClass('hidden');

  function defined(value) {
      return value !== undefined;
  }

  var demoName;
  var cesiumFrame = $('#bucketFrame');
  var isFirefox = navigator.userAgent.indexOf('Firefox/') >= 0;
  var hintTimer;
  var runDisabled = false;
  var isMobile = $(window).width() < 768? "nocursor": false;

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
    },
    readOnly: isMobile
  });

  jsEditor.on('change', scheduleHint);

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
    },
    readOnly: isMobile
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
    },
    readOnly: isMobile
  });

  $('#codeContainerTabs a[data-toggle="tab"]').on('shown.bs.tab', function(e){
      if($(e.target).attr("href") === "#htmlContainer")
      {
          htmlEditor.refresh();
          htmlEditor.focus();
          $('#buttonSuggest').addClass('disabled');
      }
      else if($(e.target).attr("href") === "#cssContainer")
      {
          cssEditor.refresh();
          cssEditor.focus();
          $('#buttonSuggest').addClass('disabled');
      }
      else
      {
        jsEditor.refresh();
        jsEditor.focus();
        $('#buttonSuggest').removeClass('disabled');
      }
  });

  CodeMirror.commands.runCesium = function(cm) {
    loadCesiumFrame();
  }
  
  if(window.location.search)
  {
    var queryParams;
    var query = window.location.search.substring(1).split('&');
    for(var i = 0;i<query.length; ++i)
    {
      var tags = query[i].split('=');
      if(tags[0] == "src")
      {
        demoName = decodeURIComponent(tags[1]);
      }
    }
    if(!demoName)
    {
      demoName = "Hello World";
    }
  }
  else
  {
    demoName = "Hello World";
  }

  function scheduleHint(){
    if(defined(hintTimer)){
      window.clearTimeout(hintTimer);
    }
    // hintTimer = setTimeout(clearErrorsAddHints, 500);
    highlightRun();
  }

  function highlightRun(){
    // We don't want the run button to be enabled when the demo code is fetched in the beginning.
    if(runDisabled)
    {
      $('#buttonRun').removeClass('disabled');
    }
    else
    {
      runDisabled = true;
    }
  }

  function clearRun(){
    $('#buttonRun').addClass('disabled');
  }

  function requestDemo(file){
    return $.ajax({
      url: 'gallery/' + file,
      handleAs: 'text',
      fail: function(error) {
        console.log(error);
      }
    });
  }

  function getScriptFromEditor(jsCode, addExtra)
  {
    return 'function startup(Cesium) {\n' +
     '    "use strict";\n' +
     '//Sandcastle_Begin\n' +
     (addExtra ? '\n' : '') +
     jsCode + '\n' + 
     '//Sandcastle_End\n' +
     '    Sandcastle.finishedLoading();\n' +
     '}\n' +
     'if (typeof Cesium !== "undefined") {\n' +
     '    startup(Cesium);\n' +
     '} else if (typeof require === "function") {\n' +
     '    require(["Cesium"], startup);\n' +
     '}\n';
  }

  function loadCesiumFrame(){
    cesiumFrame.get(0).contentWindow.location.reload();
    var doc = '<html><head><script src="../../Build/Cesium/Cesium.js"></script><script type="text/javascript" src="./Sandcastle-header.js"></script><style>@import url(../../Build/Cesium/Widgets/widgets.css);\nhtml, body, #cesiumContainer {width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden;}\n</style></head><body class="sandcastle-loading"><script type="text/javascript" src="./Sandcastle-client.js"></script></body></html>';
    cesiumFrame.get(0).contentWindow.document.open();
    cesiumFrame.get(0).contentWindow.document.write(doc);
    cesiumFrame.get(0).contentWindow.document.close();
    var frameDoc = cesiumFrame.get(0).contentWindow.document;
    function updateFrame(){
      if(frameDoc.readyState == 'complete'){
        var styleElement = frameDoc.createElement('style');
        styleElement.textContent = cssEditor.getValue();
        frameDoc.body.appendChild(styleElement);
        var htmlElement = frameDoc.createElement('div');
        htmlElement.innerHTML = htmlEditor.getValue();
        frameDoc.body.appendChild(htmlElement);
        var scriptElement = frameDoc.createElement('script');
        scriptElement.setAttribute('id', 'sandcastleCode');

        scriptElement.textContent = getScriptFromEditor(jsEditor.getValue(),isFirefox);
        frameDoc.body.appendChild(scriptElement);
      }
      else
      {
        setTimeout(function(){
          updateFrame();
        }, 0);
      }
    }
    updateFrame();
  }

  // Load the demo code
  function loadDemoCode(){
    var demo = gallery[demoName];
    var id = demo.id;
    requestDemo(id + '/' + id + '.html').done(function(value){
      htmlEditor.setValue(value);
      htmlEditor.clearHistory();
    });
    requestDemo(id + '/' + id + '.css').done(function(value){
      cssEditor.setValue(value);
      cssEditor.clearHistory();
    });
    requestDemo(id + '/' + id + '.txt').done(function(value){
      jsEditor.setValue(value);
      jsEditor.clearHistory()
    });
    // Load the iframe with demo code
    loadCesiumFrame();
  }
  loadDemoCode();

  function getDemoHTML(title, desc){
    var description = desc?desc: 'Cesium Demo';
    var demoName = title?title: 'Cesium Demo';
    return '<html>' + '\n'
          + '<head>' + '\n'
          + '<meta name ="description" content="' + description + '">' + '\n'
          + '<title>' + demoName + '</title>' + '\n'
          + '<script type="text/javascript" src="./Sandcastle-header.js"></script>' + '\n'
          + '<script type="text/javascript" src="../../ThirdParty/requirejs-2.1.9/require.js"></script>' + '\n'
          + '<script type="text/javascript">' + '\n'
          + 'require.config({' + '\n'
          + '   baseUrl: \'../../Source\',' + '\n'
          + '   waitSeconds: 60' + '\n'
          + '});' + '\n'
          + '</script>' + '\n'
          + '<style>@import url(../../Build/Cesium/Widgets/widgets.css);\nhtml, body, #cesiumContainer {width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden;}\n</style>' + '\n'
          + '</head><body class="sandcastle-loading">' + '\n'
          + '<style>' + '\n'
          + cssEditor.getValue() + '\n'
          + '</style>' + '\n'
          + htmlEditor.getValue() + '\n'
          + '<script type="text/javascript">' + '\n'
          + getScriptFromEditor(jsEditor.getValue(), isFirefox) + '\n'
          + '</script></body></html>';
  }

  // The Knockout viewmodel
  function SandcastleViewModel(){
    this.newDemo = function(){
      // For mobile views
      $(".navbar-collapse").collapse('hide');
      this.showPreview();
      // Fetch the hello world demo
      demoName = 'Hello World';
      runDisabled = false;
      loadDemoCode();
    };

    this.runDemo = function(){
      $(".navbar-collapse").collapse('hide');
      // Reload the cesium frame with the new code only if run button is not disabled
      if(!($('#buttonRun').hasClass('disabled')))
      {
        loadCesiumFrame();
      }
    };

    this.runSuggest = function(){
      if(!($('#buttonSuggest').hasClass('disabled')))
      {
        // Run autocomplete only if button is not disabled
        CodeMirror.commands.autocomplete(jsEditor);
      }
    };

    this.newWindow = function(){
      var data = getDemoHTML();
      var baseHref = window.location.href;
      var pos = baseHref.lastIndexOf('/');
      baseHref = baseHref.substring(0, pos) + '/';
      data = data.replace('<head>', '<head>\n   <base href="' + baseHref + '"></base>');
      var htmlBlob = new Blob([data], {
        'type': 'text/html;charset=utf-8',
        'endings': 'native'
      });
      var htmlBlobURL = URL.createObjectURL(htmlBlob);
      window.open(htmlBlobURL, '_blank');
      window.focus();
    };

    this.exportHTML = function(){
      var title = $('#titleText').val();
      var desc = $('#descriptionText').val();
      var html = getDemoHTML(title,desc);
      var link = document.createElement('a');
      link.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(html));
      link.setAttribute('download', title + '.html');
      link.style.display = 'none';
      document.body.appendChild(link);
      if(document.createEvent){
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        link.dispatchEvent(event);
      }
      else {
        link.click();
      }
    };

    this.showPreview = function(){
      $(".navbar-collapse").collapse('hide');
      $('#bodyRow').removeClass('hidden-xs');
      $('#codeColumn').addClass('hidden-xs');
      $('#cesiumColumn').removeClass('hidden-xs');
      $('#consoleRow').addClass('hidden-xs');
    };

    this.showJSCode = function(){
      $(".navbar-collapse").collapse('hide');
      $('#bodyRow').removeClass('hidden-xs');
      $('#codeColumn').removeClass('hidden-xs');
      $('#cesiumColumn').addClass('hidden-xs');
      $('#consoleRow').addClass('hidden-xs');
      $('#codeContainerTabs a[href="#jsContainer"]').tab('show');
      // Since the js editor is active by default, it does not show up on mobile devices when clicked for the first time. Force it
      jsEditor.focus();
      jsEditor.refresh();
    };

    this.showHTMLCode = function(){
      $(".navbar-collapse").collapse('hide');
      $('#bodyRow').removeClass('hidden-xs');
      $('#codeColumn').removeClass('hidden-xs');
      $('#cesiumColumn').addClass('hidden-xs');
      $('#consoleRow').addClass('hidden-xs');
      $('#codeContainerTabs a[href="#htmlContainer"]').tab('show');
    };

    this.showCSSCode = function(){
      $(".navbar-collapse").collapse('hide');
      $('#bodyRow').removeClass('hidden-xs');
      $('#codeColumn').removeClass('hidden-xs');
      $('#cesiumColumn').addClass('hidden-xs');
      $('#consoleRow').addClass('hidden-xs');
      $('#codeContainerTabs a[href="#cssContainer"]').tab('show');
    };

    this.showConsole = function(){
      console.log('show console');
      $(".navbar-collapse").collapse('hide');
      $('#bodyRow').addClass('hidden-xs');
      $('#consoleRow').removeClass('hidden-xs');
    };
  }


  ko.applyBindings(new SandcastleViewModel());
});