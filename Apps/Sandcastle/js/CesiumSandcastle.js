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
  var docTimer;
  var demoTitle;
  var demoDesc;
  var demoLabels;
  var runDisabled = false;
  var isMobile = $(window).width() < 768? "nocursor": false;
  var docTypes;
  var docTabs = ko.observableArray();
  var docContainers = ko.observableArray();
  var errorLines = [];
  var highlightLines = [];
  var scriptCodeRegex = /\/\/Sandcastle_Begin\s*([\s\S]*)\/\/Sandcastle_End/;
  var consoleMessages = ko.observableArray();
  var searchTerm = '';

  // Fetch the documentation keywords
  $.ajax({
    'url': '../../Build/Documentation/types.txt',
    'dataType': 'json',
    'fail': function(error){
      console.log("No docs found");
    }
  }).done(function(value){
    docTypes = value;
  });

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
  jsEditor.on('cursorActivity', onCursorActivity);

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
    consoleMessages.removeAll();
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

  function scriptLineToEditorLine(line){
    // editor lines are zero-indexed, plus 3 lines of boilerplate
    return line - 4;
  }

  function makeLineLabel(msg, className){
    var element = document.createElement('abbr');
    element.className = className;
    switch(className){
      case 'hintMarker':
        element.innerHTML = '<span class="glyphicon glyphicon-warning-sign" aria-hidden="true"></span>'
        break;
      case 'errorMarker':
        element.innerHTML = '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>';
        break;
      case 'searchMarker':
        element.innerHTML = '<span class="glyphicon glyphicon-info-sign" aria-hidden="true"></span>';
        break;
      default:
        element.innerHTML = '&#9654;';
    }
    element.title = msg;
    return element;
  }

  function clearErrorsAddHints(){
    var line;
    var i;
    var len;
    hintTimer = undefined;
    jsEditor.clearGutter('hintGutter');
    jsEditor.clearGutter('highlightGutter');
    jsEditor.clearGutter('errorGutter');
    jsEditor.clearGutter('searchGutter');
    while(errorLines.length > 0){
      line = errorLines.pop();
      jsEditor.removeLineClass(line, 'text');
    }
    while(highlightLines.length > 0){
      line = highlightLines.pop();
      jsEditor.removeLineClass(line, 'text');
    }
    if(searchTerm !== ''){
      runSearch();
    }
    var options = JSON.parse(JSON.stringify(sandcastleJsHintOptions));
    if (!JSHINT(getScriptFromEditor(false), options)) {
        var hints = JSHINT.errors;
        for (i = 0, len = hints.length; i < len; ++i) {
            var hint = hints[i];
            if (hint !== null && defined(hint.reason) && hint.line > 0) {
                line = jsEditor.setGutterMarker(scriptLineToEditorLine(hint.line), 'hintGutter', makeLineLabel(hint.reason, 'hintMarker'));
                jsEditor.addLineClass(line, 'text', 'hintLine');
                errorLines.push(line);
            }
        }
    }
  }

  function scheduleHint(){
    if(defined(hintTimer)){
      window.clearTimeout(hintTimer);
    }
    hintTimer = setTimeout(clearErrorsAddHints, 500);
  }

  function scrollToLine(lineNumber) {
    if (defined(lineNumber)) {
      jsEditor.setCursor(lineNumber);
      // set selection twice in order to force the editor to scroll
      // to this location if the cursor is already there
      jsEditor.setSelection({
          line : lineNumber - 1,
          ch : 0
      }, {
          line : lineNumber - 1,
          ch : 0
      });
      jsEditor.focus();
      jsEditor.setSelection({
          line : lineNumber,
          ch : 0
      }, {
          line : lineNumber,
          ch : 0
      });
    }
  }

  function openDocTab(title, link){
    // Bootstrap doesn't play nice with periods in tab IDs.
    var escapeTitle = title.replace('.','_');
    console.log('opening doc tab');
    var data = {};
    data.title = escapeTitle;
    data.link = link;
    if(docTabs.indexOf(escapeTitle) == -1)
    {
      // Add the doc tab only if it does not already exist
      docTabs.push(escapeTitle);
      docContainers.push(data);
    }
    $('#cesiumTabs a[href="#'+escapeTitle+'Pane"]').tab('show');
  }
  function showDocPopup(){
    var selectedText = jsEditor.getSelection();
    var lowerText = selectedText.toLowerCase();
    var docNode = $('#docPopup');
    var docMessage = $('#docPopupMessage');
    var onDocClick = function(){
      openDocTab(this.textContent, this.href);
      return false;
    }

    docTimer = undefined;
    if(lowerText && lowerText in docTypes && typeof docTypes[lowerText].push === 'function'){
      docMessage.text('');
      for(var i = 0, len = docTypes[lowerText].length; i<len; ++i){
        var member = docTypes[lowerText][i];
        var ele = document.createElement('a');
        ele.target = '_blank';
        ele.textContent = member.replace('.html', '').replace('module-', '').replace('#', '.');
        ele.href = '../../Build/Documentation/' + member;
        ele.onclick = onDocClick;
        docMessage.append(ele);
      }
      jsEditor.addWidget(jsEditor.getCursor(true), docNode.get(0));
      docNode.css('top', (parseInt(docNode.css('top'), 10) - 5) + 'px');
      $('#docPopup').tooltip('show');
    }
  }

  function onCursorActivity(){
    $('#docPopup').css('left', '-999px');
    if(docTimer !== undefined){
      window.clearTimeout(docTimer);
    }

    docTimer = window.setTimeout(showDocPopup, 500);
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

  function getScriptFromEditor(addExtra)
  {
    return 'function startup(Cesium) {\n' +
     '    "use strict";\n' +
     '//Sandcastle_Begin\n' +
     (addExtra ? '\n' : '') +
     jsEditor.getValue() + '\n' + 
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
    $('#cesiumTabs a[href="#bucketPane"]').tab('show');
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

        scriptElement.textContent = getScriptFromEditor(isFirefox);
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
    for(i = gallery_demos.length-1; i>= 0; i--){
      if(gallery_demos[i].name === demoName)
        break;
    }
    var demo = gallery_demos[i];
    // Set values of save modal
    $('#titleText').val(demo.name);
    $('#descriptionText').val(demo.description);
    $('#labelText').val(demo.labels);
    requestDemo(demo.name + '.html').done(function(value){
      var code = value;
      var parser = new DOMParser();
      var doc = parser.parseFromString(code, 'text/html');
      var script = doc.querySelector('script[id="cesium_sandcastle_script"]');
      if (!script) {
          console.log('Error reading source file: ');
          return;
      }
      var scriptMatch = scriptCodeRegex.exec(script.textContent);
      if (!scriptMatch) {
          console.log('Error reading source file: ');
          return;
      }

      var scriptCode = scriptMatch[1];
      jsEditor.setValue(scriptCode);
      jsEditor.clearHistory();

      var htmlText = '';
      var cssText = '';
      var childIndex = 0;
      var childNode = doc.body.childNodes[childIndex];
      while (childIndex < doc.body.childNodes.length && childNode !== script){
        if(childNode.nodeName == 'STYLE')
        {
          cssText += childNode.innerHTML;
          childNode = doc.body.childNodes[++childIndex];
        }
        else{
          htmlText += childNode.nodeType === 1 ? childNode.outerHTML : childNode.nodeValue;
          childNode = doc.body.childNodes[++childIndex];
        }
      }
      htmlText = htmlText.replace(/^\s+/, '');
      htmlEditor.setValue(htmlText);
      htmlEditor.clearHistory();
      cssText = cssText.replace(/^\s+/, '');
      cssEditor.setValue(cssText);
      cssEditor.clearHistory();
    });
    consoleMessages.removeAll();
    // Load the iframe with demo code
    loadCesiumFrame();
  }
  loadDemoCode();

  function getDemoHTML(title, desc, labels){
    var description = desc?desc: 'Cesium Demo';
    var demoName = title?title: 'Cesium Demo';
    return '<!DOCTYPE html>' + '\n'
          + '<html lang="en">' + '\n'
          + '<head>' + '\n'
          + '<meta charset="utf-8">' + '\n'
          + '<meta http-equiv="X-UA-Compatible" content="IE=Edge,chrome=1">  <!-- Use Chrome Frame in IE -->' + '\n'
          + '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, minimum-scale=1, user-scalable=no">' + '\n'
          + '<meta name ="description" content="' + description + '">' + '\n'
          + '<meta name ="cesium-sandcastle-labels" content="' + labels + '">' + '\n'
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
          + '<script id="cesium_sandcastle_script" type="text/javascript">' + '\n'
          + getScriptFromEditor(isFirefox) + '\n'
          + '</script></body></html>';
  }

  function appendConsole(className, message){
    var msg = {};
    switch(className){
      case 'consoleLog':
        msg.msgClass='';
        msg.msg = message;
        break;
      case 'consoleError':
        msg.msgClass="text-danger";
        msg.msg = message;
        break;
      case 'consoleWarn':
        msg.msgClass="text-warning";
        msg.msg = message;
        break;
    }
    consoleMessages.push(msg);
  }

  window.addEventListener('message', function(e) {
    var line;
    if (defined(e.data.log)) {
      // Console log messages from the iframe display in Sandcastle.
      appendConsole('consoleLog', e.data.log, false);
    } else if (defined(e.data.error)) {
      // Console error messages from the iframe display in Sandcastle
      var errorMsg = e.data.error;
      var lineNumber = e.data.lineNumber;
      if (defined(lineNumber)) {
          errorMsg += ' (on line ';

          if (e.data.url) {
              errorMsg += lineNumber + ' of ' + e.data.url + ')';
          } else {
              lineNumber = scriptLineToEditorLine(lineNumber);
              errorMsg += (lineNumber + 1) + ')';
              line = jsEditor.setGutterMarker(lineNumber, 'errorGutter', makeLineLabel(e.data.error, 'errorMarker'));
              jsEditor.addLineClass(line, 'text', 'errorLine');
              errorLines.push(line);
              scrollToLine(lineNumber);
          }
      }
      appendConsole('consoleError', errorMsg, true);
    } else if (defined(e.data.warn)) {
      // Console warning messages from the iframe display in Sandcastle.
      appendConsole('consoleWarn', e.data.warn, true);
    } else if (defined(e.data.highlight)) {
      // Hovering objects in the embedded Cesium window.
      highlightLine(e.data.highlight);
    }
  }, true);

  // Resizable code editor
  
  var resize = false;
  var mouseDown = false;
  var lastX;
  $('#codeColumn').mousedown(function(e){
    mouseDown = true;
    if(resize)
    {
      lastX = e.pageX;
      $('iframe').addClass('disableFrame');
    }
  })
  $('#codeColumn').mouseup(function(e){
    mouseDown =false;
    $('iframe').removeClass('disableFrame');
  });
  $('#bodyRow').mousemove(function(e){
    var divX = $('#codeColumn').offset().left + $('#codeColumn').width();
    if(divX - e.pageX <= 10)
    {
      // change the cursor
      $('#codeColumn').addClass('resize');
      resize = true;
    }
    else
    {
      if(!mouseDown)
      {
        $('#codeColumn').removeClass('resize');
        resize = false;
      }
    }

    if(resize && mouseDown){
      // Check that the final width of code column does not go below 390px
      if($('#codeColumn').width() + (e.pageX - lastX) >= 390 && $('#cesiumColumn').width() - (e.pageX - lastX) >= 50 && $('#codeColumn').width() + (e.pageX - lastX) <= $('#bodyRow').width())
      {
        $('#codeColumn').width($('#codeColumn').width() + (e.pageX - lastX));
        $('#cesiumColumn').width($('#cesiumColumn').width() - (e.pageX - lastX));
        lastX = e.pageX;
      }
      else
      {
        mouseDown = false;
      }
    }
  });

  // Code search
  $('#searchBox').keyup(function() {
    searchTerm = $('#searchBox').val();
    runSearch();
  });

  function runSearch(){
    var len,i, line, searchRegExp;
    jsEditor.clearGutter('searchGutter');
    while (errorLines.length > 0) {
      line = errorLines.pop();
      jsEditor.removeLineClass(line, 'text');
    }
    searchRegExp = new RegExp(searchTerm, 'i');
    var code = jsEditor.getValue();
    if (searchTerm !== '') {
      var codeLines = code.split('\n');
      for (i = 0, len = codeLines.length; i < len; ++i) {
        if (searchRegExp.test(codeLines[i])) {
          line = jsEditor.setGutterMarker(i, 'searchGutter', makeLineLabel('Search: ' + searchTerm, 'searchMarker'));
          jsEditor.addLineClass(line, 'text', 'searchLine');
          errorLines.push(line);
        }
      }
    }
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
      consoleMessages.removeAll();
      runDisabled = false;
      loadCesiumFrame();
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
      var labels = $('#labelText').val();
      var html = getDemoHTML(title,desc,labels);
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

    this.docTabs = docTabs;
    this.docContainers = docContainers;

    this.consoleMessages = consoleMessages;

    this.closeTab = function(tab){
      docTabs.remove(tab);
      for(var i = docContainers().length-1; i >= 0; i--)
      {
        if(docContainers()[i].title === tab)
        {
          break;
        }
      }
      docContainers.remove(docContainers()[i]);
      // Make cesium tab active
      $('#cesiumTabs a[href="#bucketPane"]').tab('show');
    }

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
      $(".navbar-collapse").collapse('hide');
      $('#bodyRow').addClass('hidden-xs');
      $('#consoleRow').removeClass('hidden-xs');
    };
  }


  ko.applyBindings(new SandcastleViewModel());
});