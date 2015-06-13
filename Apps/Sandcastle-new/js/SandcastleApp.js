define(['react', 'pubsub', 'CodeMirror/lib/codemirror','CodeMirror/addon/hint/show-hint','CodeMirror/addon/hint/javascript-hint','CodeMirror/mode/javascript/javascript','CodeMirror/mode/css/css','CodeMirror/mode/xml/xml','CodeMirror/mode/htmlmixed/htmlmixed'], function(React, PubSub, CodeMirror){

  window.PubSub = PubSub;

  var SandcastleCodeTabs = React.createClass({
    render: function(){
      return (
        <ul className="nav nav-tabs hidden-xs" id="codeContainerTabs" role="tablist">
          <li role="presentation" className="active"><a href="#jsContainer" aria-controls="jsContainer" role="tab" data-toggle="tab">Javascript code</a></li>
          <li role="presentation"><a href="#htmlContainer" aria-controls="htmlContainer" role="tab" data-toggle="tab">HTML</a></li>
          <li role="presentation"><a href="#cssContainer" aria-controls="cssContainer" role="tab" data-toggle="tab">CSS</a></li>
        </ul>
      );
    }
  });

  var SandcastleJSCode = React.createClass({
    getInitialState: function () {
      return{
        src: '// Select a demo from the gallery to load.\n'
      };
    },

    handleJSCode: function(msg, data){
      this.setState({src: data});
    },

    componentDidMount: function(){
      PubSub.subscribe('JS CODE', this.handleJSCode);
    },

    render: function(){
      return (
        <div role="tabpanel" className="tab-pane active codeContainer" id="jsContainer">
          <SandcastleCodeMirrorEditor style={{height: 95 + '%'}} textAreaClassName='form-control' defaultValue={this.state.src} mode="javascript" lineWrapping={true} lineNumbers={true} gutters ={['hintGutter', 'errorGutter', 'searchGutter', 'highlightGutter']} matchBrackets={true} indentUnit={4} extraKeys={{'Ctrl-Space': 'autocomplete', 'F8': 'runCesium', 'Tab': 'indentMore', 'Shift-Tab': 'indentLess'}}/>
        </div>
      );
    }
  });

  var SandcastleCodeMirrorEditor = React.createClass({

    componentDidMount: function() {
      var isTextArea = this.props.forceTextArea;
      if (!isTextArea) {
        this.editor = CodeMirror.fromTextArea(this.refs.editor.getDOMNode(), this.props);
        this.editor.on('change', this.handleChange);
        if(this.props.mode === 'javascript')
        {
          this.editor.on('cursorActivity', this.onCursorActivity);
          this.errorLines = [];
          this.highlightLines = [];
          PubSub.subscribe('MARK LINE', this.markLine);
          PubSub.subscribe('SUGGEST', this.autocomplete);
          PubSub.subscribe('SHOW JS CODE', this.refreshEditor);
        }
      }

      var editor = this.editor;
      $('#codeContainerTabs a[data-toggle="tab"]').on('shown.bs.tab', function(e){
          editor.refresh();
          editor.focus();
      });

      PubSub.subscribe('RELOAD FRAME', this.getData);

    },

    clearErrorsAddHints: function(){
      var line;
      var i;
      var len;
      hintTimer = undefined;
      this.editor.clearGutter('hintGutter');
      this.editor.clearGutter('highlightGutter');
      this.editor.clearGutter('errorGutter');
      this.editor.clearGutter('searchGutter');
      while (this.errorLines.length > 0) {
        line = this.errorLines.pop();
        this.editor.removeLineClass(line, 'text');
      }
      while (this.highlightLines.length > 0) {
        line = this.highlightLines.pop();
        this.editor.removeLineClass(line, 'text');
      }
      var options = JSON.parse(JSON.stringify(sandcastleJsHintOptions));
      if (!JSHINT(this.editor.getValue(), options)) {
        var hints = JSHINT.errors;
        for (i = 0, len = hints.length; i < len; ++i) {
          var hint = hints[i];
          if (hint !== null && hint.reason !== undefined && hint.line > 0) {
            line = this.editor.setGutterMarker(hint.line-1, 'hintGutter', this.makeLabel(hint.reason, 'hintMarker'));
            this.editor.addLineClass(line, 'text', 'hintLine');
            this.errorLines.push(line);
          }
        }
      }
    },

    getData: function(){
      if(this.props.mode === 'javascript')
      {
        this.clearErrorsAddHints();
        PubSub.publish('UPDATE JS', this.editor.getValue());
      }
      else if(this.props.mode === 'text/html')
      {
        PubSub.publish('UPDATE HTML', this.editor.getValue());
      }
      else
      {
        PubSub.publish('UPDATE CSS', this.editor.getValue());
      }
    },

    refreshEditor: function(){
      this.editor.refresh();
      this.editor.focus();
    },

    autocomplete: function(){
      CodeMirror.commands.autocomplete(this.editor);
    },

    makeLabel: function(msg, className){
      var element = document.createElement('abbr');
      element.className = className;
      switch(className){
        case 'hintMarker':
          element.innerHTML = '<span class="glyphicon glyphicon-warning-sign" aria-hidden="true"></span>'
          break;
        case 'errorMarker':
          element.innerHTML = '<span class="glyphicon glyphicon-exclamation-sign" aria-hidden="true"></span>';
          break;
        default:
          element.innerHTML = '&#9654;';
      }
      element.title = msg;
      return element;
    },

    markLine: function(msg, data){
      var line = this.editor.setGutterMarker(data.line-1, 'errorGutter', this.makeLabel(data.error, 'errorMarker'));
      this.editor.addLineClass(line, 'text', 'errorLine');
      this.errorLines.push(line);
    },

    openDocTab: function(title, link){
      // Bootstrap doesn't play nice with periods in tab IDs.
      var escapeTitle = title.replace('.','_');
      var data = {};
      data.title = escapeTitle;
      data.link = link;
      PubSub.publish('OPEN DOC',data);
    },

    showDocPopup: function(){
      var selectedText = this.editor.getSelection();
      var lowerText = selectedText.toLowerCase();
      var docNode = $('#docPopup');
      var docMessage = $('#docPopupMessage');
      var that = this;

      var onDocClick = function() {
          that.openDocTab(this.textContent, this.href);
          return false;
      };

      this.docTimer = undefined;
      if (lowerText && lowerText in this.docTypes && typeof this.docTypes[lowerText].push === 'function') {
        docMessage.text('');
        for (var i = 0, len = this.docTypes[lowerText].length; i < len; ++i) {
          var member = this.docTypes[lowerText][i];
          var ele = document.createElement('a');
          ele.target = '_blank';
          ele.textContent = member.replace('.html', '').replace('module-', '').replace('#', '.');
          ele.href = '../../Build/Documentation/' + member;
          ele.onclick = onDocClick;
          docMessage.append(ele);
        }
        this.editor.addWidget(this.editor.getCursor(true), docNode.get(0));
        docNode.css('top', (parseInt(docNode.css('top'), 10) - 5) + 'px');
        $('#docPopup').tooltip('show');
      }
    },

    onCursorActivity: function(){
      var pos = {};
      pos.left = -999;
      $('#docPopup').css('left', '-999px');
      PubSub.publish('DOC POSITION', pos);
      if(this.docTimer !== undefined){
        window.clearTimeout(this.docTimer);
      }

      this.docTimer = window.setTimeout(this.showDocPopup, 500);
    },

    handleChange: function() {
      if (this.editor) {
        var value = this.editor.getValue();
        if (value !== this.props.value) {
          if (this.editor.getValue() !== this.props.value) {
            this.props.value = value;
          }
        }
        if(this.props.mode === 'javascript'){
          if(this.hintTimer !== undefined){
            window.clearTimeout(this.hintTimer);
          }
          this.hintTimer = setTimeout(this.clearErrorsAddHints, 550);
        }
      }
    },

    componentWillUpdate: function(nextProps, nextState){
      // Update with new value from demo
      this.editor.setValue(nextProps.defaultValue);
    },

    componentWillMount: function(){
      var that = this;
      $.ajax({
        url : '../../Build/Documentation/types.txt',
        dataType : 'json',
        error : function(error) {
          console.log("no docs found");
            docError = true;
        }
      }).done(function(value) {
        that.docTypes = value;
      });
    },

    render: function(){
      var editor = React.createElement('textarea', {
        ref: 'editor',
        value: this.props.value,
        defaultValue: this.props.defaultValue,
        readOnly: this.props.readOnly,
        onChange: this.props.onChange,
        style: this.props.textAreaStyle,
        className: this.props.textAreaClassName || this.props.textAreaClass
      });

      return editor;
    }
  });

  var SandcastleHTMLCode = React.createClass({
    getInitialState: function () {
      return {
        src: '<!-- Select a demo from the gallery to load. -->\n'
      };
    },

    handleHTMLCode: function(msg, data){
     this.setState({src: data});
    },

    componentDidMount: function(){
      PubSub.subscribe('HTML CODE', this.handleHTMLCode);
    },
    
    render: function(){
      return (
        <div role="tabpanel" className="tab-pane codeContainer" id="htmlContainer">
            <SandcastleCodeMirrorEditor style={{height: 100 + '%'}} textAreaClassName='form-control' defaultValue={this.state.src} mode="text/html" lineNumbers={true} matchBrackets={true} indentUnit={4}/>
        </div>
      );
    }
  });

  var SandcastleCSSCode = React.createClass({
    getInitialState: function () {
      return {
        src: '/* Select a demo from the gallery to load */\n'
      };
    },

    handleCSSCode: function(msg, data){
     this.setState({src: data});
    },

    componentDidMount: function(){
      PubSub.subscribe('CSS CODE', this.handleCSSCode);
    },

    render: function(){
      return (
        <div role="tabpanel" className="tab-pane codeContainer" id="cssContainer">
            <SandcastleCodeMirrorEditor style={{height: 100 + '%'}} textAreaClassName='form-control' defaultValue={this.state.src} mode="text/css" lineNumbers={true} matchBrackets={true} indentUnit={4}/>
        </div>
      );
    }
  });

  var SandcastleCode = React.createClass({
    getInitialState: function(){
      var classes = {"hidden-xs": true, "col-sm-5": true};
      return {
        classes: classes
      };
    },

    componentWillMount: function(){
      PubSub.subscribe('SHOW PREVIEW', this.handleNavigation);
      PubSub.subscribe('SHOW JS CODE', this.handleNavigation);
      PubSub.subscribe('SHOW HTML CODE', this.handleNavigation);
    },

    handleNavigation: function(msg, data){
      var classes = this.state.classes;
      switch(msg){
        case 'SHOW PREVIEW':
          classes['hidden-xs'] = true;
          break;
        case 'SHOW JS CODE':
          classes['hidden-xs'] = false;
          break;
        case 'SHOW HTML CODE':
          classes['hidden-xs'] = false;
          break;
      }
      this.setState({classes: classes});
    },

    render: function(){
      var printClasses = function(obj){
        var classes = '';
        for(type in obj){
          if(obj[type])
            classes += type;
            classes += ' ';
        }
        return classes;
      };

      return (
        <div id="codeColumn" className={printClasses(this.state.classes)}>
          <div role="tabpanel">
            <SandcastleCodeTabs />
            <div className="tab-content">
              <SandcastleJSCode />
              <SandcastleHTMLCode />
              <SandcastleCSSCode />
            </div>
          </div>
        </div>
      );
    }
  });

  var SandcastleCesiumTabs = React.createClass({
    getInitialState: function(){
      return {tabs: ["Cesium Sandcastle"]};
    },

    componentWillMount: function(){
      PubSub.subscribe('OPEN DOC', this.openDocTab);
    },

    openDocTab: function(msg, data){
      var tabs = this.state.tabs;
      if(tabs.indexOf(data.title) == -1)
      {
        tabs.push(data.title);
        this.setState({tabs: tabs});
      }
    },

    handleClose: function(e){
      $('#cesiumTabs a[href="#bucketPane"]').tab('show');
      var title = e.target.parentNode.getAttribute('data-doc-name');
      PubSub.publish('CLOSE TAB', title);
      var tabs = this.state.tabs;
      var index = tabs.indexOf(title);
      tabs.splice(index, 1);
      this.setState({tabs: tabs});
    },

    render: function(){
      var that = this;
      var createItem = function(itemText, index){
        if(itemText === "Cesium Sandcastle")
        {
          return <li key="cesiumTab" role="presentation" className="active"><a href="#bucketPane" aria-controls="bucketPane" role="tab" data-toggle="tab">Cesium</a></li>
        }
        else
        {
          return <li key={index+itemText} role="presentation"><a href={"#"+ itemText+"Pane"} data-doc-name={itemText} className="docTab" aria-controls={itemText + "Pane"} role="tab" data-toggle="tab">{itemText}<span className="close" onClick={that.handleClose}>x</span></a></li>
        }
      };

      return (
        <ul className="nav nav-tabs hidden-xs" id="cesiumTabs" role="tablist">
            {this.state.tabs.map(createItem)}
        </ul>
      );
    }
  });

  var SandcastleCesiumFrame = React.createClass({
    componentDidMount: function(){
    },

    getScriptFromEditor: function(addExtra, jsCode){
      return 'function startup(Cesium) {\n' +
       '    "use strict";\n' +
       '//Sandcastle_Begin\n' +
       (addExtra ? '\n' : '') +
       jsCode +
       '//Sandcastle_End\n' +
       '    Sandcastle.finishedLoading();\n' +
       '}\n' +
       'if (typeof Cesium !== "undefined") {\n' +
       '    startup(Cesium);\n' +
       '} else if (typeof require === "function") {\n' +
       '    require(["Cesium"], startup);\n' +
       '}\n';
    },

    componentWillMount: function(){
      // Subscribe to events
      PubSub.subscribe('LOAD FRAME', this.loadFrame);
    },

    openNewWindow: function(msg, data){
      var baseHref = window.location.href;
      var pos = baseHref.lastIndexOf('/');
      baseHref = baseHref.substring(0, pos) + '/';
      var frameDoc = this.getDOMNode().contentWindow.document;
      var baseElement = frameDoc.createElement('base');
      baseElement.setAttribute("href", baseHref);
      frameDoc.head.appendChild(baseElement);

      var htmlBlob = new Blob([frameDoc.children[0].outerHTML], {
            'type' : 'text/html;charset=utf-8',
            'endings' : 'native'
      });
      var htmlBlobURL = URL.createObjectURL(htmlBlob);
      window.open(htmlBlobURL);
      window.focus();
    },

    refreshFrame: function(){
      this.getDOMNode().contentWindow.location.reload();
      var doc = '<html><head><script src="../../Build/Cesium/Cesium.js"></script><script type="text/javascript" src="./Sandcastle-header.js"></script><style>@import url(../../Build/Cesium/Widgets/widgets.css);\nhtml, body, #cesiumContainer {width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden;}\n</style><base href="http://localhost:3000/Apps/Sandcastle-new/"></base></head><body class="sandcastle-loading"><script type="text/javascript" src="./Sandcastle-client.js"></script></body></html>';
      this.getDOMNode().contentWindow.document.open();
      this.getDOMNode().contentWindow.document.write(doc);
      this.getDOMNode().contentWindow.document.close();
    },

    loadDocument: function(data){
      var frameDoc = this.getDOMNode().contentWindow.document;
      if(frameDoc.readyState === 'complete'){
        var htmlCode = data.html;
        var htmlElement = frameDoc.createElement('div');
        htmlElement.innerHTML = htmlCode;
        frameDoc.body.appendChild(htmlElement);
        var scriptElement = frameDoc.createElement('script');
        scriptElement.setAttribute('id', 'sandcastleCode');
        scriptElement.textContent = data.js;
        frameDoc.body.appendChild(scriptElement);
      }
      else{
        var that = this;
        setTimeout(function(){
          that.loadDocument(data)
        }, 0);
      }
    },

    loadFrame: function(msg, data){
      this.refreshFrame();
      this.loadDocument(data);
    },

    render: function(){
      this.cesiumFrame = React.createElement('iframe', {
        frameBorder:'0',
        className:'fullFrame',
        id:'bucketFrame',
      });
      return this.cesiumFrame;
    }
  });

  var SandcastleCesiumContainer = React.createClass({
    getInitialState: function(){
      return {tabs: [{title: 'Cesium', link: undefined}]};
    },

    componentWillMount: function(){
      PubSub.subscribe('OPEN DOC', this.openDocTab);
      PubSub.subscribe('CLOSE TAB', this.closeDocTab);
    },

    openDocTab: function(msg, data){
      var tabs = this.state.tabs;
      var exists = false;
      for(var i = tabs.length-1; i >= 0; i--)
      {
        if(tabs[i].title === data.title)
        {
          exists = true;
          break;
        }
      }
      if(!exists)
      {
        var tab = {};
        tab.title = data.title;
        tab.link = data.link;
        tabs.push(tab);
        this.setState({tabs: tabs});
      }
      $('#cesiumTabs a[href="#'+data.title+'Pane"]').tab('show');
    },

    closeDocTab: function(msg, data){
      console.log("closing doc tab");
      var tabs = this.state.tabs;
      for(var i = tabs.length-1; i>=0; i--)
      {
        if(tabs[i].title === data)
        {
          tabs.splice(i, 1);
          break;
        }
      }
      this.setState({tabs: tabs});
    },

    render: function(){
      var createItem = function(item, index){
        if(item.title === 'Cesium' && item.link === undefined)
        {
          return <div key="sandcastlecesium" role="tabpanel" className="tab-pane active" id="bucketPane"><SandcastleCesiumFrame /></div>
        }
        else
        {
          return <div key={index+item.title} role="tabpanel" className="tab-pane" id={item.title+ "Pane"}><iframe frameBorder="0" className="fullFrame" src={item.link}></iframe></div>
        }
      };

      return (
        <div id="cesiumFrame" className="tab-content">
          {this.state.tabs.map(createItem)}
        </div>
      );
    }
  });

  var SandcastleCesium = React.createClass({
    getInitialState: function(){
      var classes = {'col-xs-12': true, 'col-sm-7': true};
      return{
        classes: classes
      };
    },

    componentWillMount: function(){
      PubSub.subscribe('SHOW PREVIEW', this.handleNavigation);
      PubSub.subscribe('SHOW JS CODE', this.handleNavigation);
      PubSub.subscribe('SHOW HTML CODE', this.handleNavigation);
    },

    handleNavigation: function(msg, data){
      var classes = this.state.classes;
      switch(msg){
        case 'SHOW PREVIEW':
          classes['hidden-xs'] = false;
          break;
        case 'SHOW JS CODE':
          classes['hidden-xs'] = true;
          break;
        case 'SHOW HTML CODE':
          classes['hidden-xs'] = true;
          break;
      }
      this.setState({classes: classes});
    },

    render: function(){
      var printClasses = function(obj){
        var classes = '';
        for(type in obj){
          if(obj[type])
            classes += type;
            classes += ' ';
        }
        return classes;
      };

      return (
        <div id="cesiumColumn" className={printClasses(this.state.classes)}>
          <div role="tabpanel">
            <SandcastleCesiumTabs />
            <SandcastleCesiumContainer />
          </div>
        </div>
      );
    }
  });

  var SandcastleConsole = React.createClass({
    getInitialState: function(){
      return {
        messages: [],
        msgNum: 0
      };
    },

    componentWillMount: function(){
      PubSub.subscribe('CONSOLE LOG', this.printLog);
      PubSub.subscribe('CONSOLE WARN', this.printWarning);
      PubSub.subscribe('CONSOLE ERROR', this.printError);
      PubSub.subscribe('LOAD FRAME', this.newDemo);
      PubSub.subscribe('RELOAD FRAME', this.newDemo);
    },

    componentDidMount: function(){
      var that = this;
      $('#consoleLog').on('shown.bs.collapse', function(){
        that.setState({msgNum: 0});
      });
    },

    newDemo: function(){
      this.setState({messages: [], msgNum: 0});
    },

    printLog: function(msg,data){
      this.setState({msgNum: this.state.msgNum+1});
      var newMsg = {};
      newMsg.type = '';
      newMsg.text = data;
      var newMessages = this.state.messages.concat([newMsg]);
      this.setState({messages: newMessages});
      // $('.panel-body').append('<p>' + data + '</p>');
    },

    printWarning: function(msg,data){
      this.setState({msgNum: this.state.msgNum+1});
      var newMsg = {};
      newMsg.type = 'text-warning';
      newMsg.text = data;
      var newMessages = this.state.messages.concat([newMsg]);
      this.setState({messages: newMessages});
    },

    scriptLineToEditorLine: function(line){
      var isFirefox = navigator.userAgent.indexOf('Firefox/') >= 0;
      return isFirefox? line - 4 : line-3;
    },

    printError: function(msg,data){
      this.setState({msgNum: this.state.msgNum+1});
      var message = data.data;
      if(data.lineNum !== undefined)
      {
        message += ' (on line ';
        if(data.url)
        {
          message += this.scriptLineToEditorLine(data.lineNum) + ' of ' + data.url + ')';
        }
        else
        {
          message += this.scriptLineToEditorLine(data.lineNum) + ')';
        }
        var sendMsg = {};
        sendMsg.line = this.scriptLineToEditorLine(data.lineNum);
        sendMsg.error = data.data;
        PubSub.publish('MARK LINE', sendMsg);
      }
      var newMsg = {};
      newMsg.type = 'text-danger';
      newMsg.text = message;
      var newMessages = this.state.messages.concat([newMsg]);
      this.setState({messages: newMessages});
    },

    render: function(){
      var createMsg = function(item, index){
        return <p key={index} className={item.type}>{item.text}</p>;
      };

      return (
        <div className="col-md-4 col-xs-12">
          <div className="panel panel-default">
            <div className="panel-heading hidden-xs"><a data-toggle="collapse" href="#consoleLog" aria-expanded="false" aria-controls="consoleLog">Console ({this.state.msgNum})</a></div>
            <div id="consoleLog" className="panel-collapse collapse" aria-labelledby="consoleLog">
              <div className="panel-body">
              {this.state.messages.map(createMsg)}
              </div>
            </div>
          </div>
        </div>
      );
    }
  })

  var SandcastleBody = React.createClass({
    getInitialState: function(){
      var consoleClasses = {'hidden-xs': true, 'row': true};
      var bodyClasses = {'row': true};
      return {
        consoleClasses: consoleClasses,
        bodyClasses: bodyClasses
      }
    },

    loadDemoCode: function(){
      // fetch the html and css files
      var demo = gallery[this.props.demo];
      var id = demo.id;
      var htmlText = '';
      var cssText = '';
      var jsText = '';
      var that = this;
      var data = {};
      this.requestDemo(id + '/' + id + '.html').done(function(value){
        htmlText += value;
        that.requestDemo(id + '/' + id + '.css').done(function(value){
          // Surround the css with style tags
          var code = '<style>' + value + '</style>\n';
          // Append the html
          code += htmlText;
          cssText += value;
          data.html = htmlText;
          that.htmlCode = htmlText;
          data.css = cssText;
          that.cssCode = cssText;
          PubSub.publish('HTML CODE', htmlText);
          PubSub.publish('CSS CODE', data.css);
          //fetch the js
          var jsText = '';
          that.requestDemo(id + '/' + id + '.json').done(function(value){
            jsText += value.js;
            var isFirefox = navigator.userAgent.indexOf('Firefox/') >= 0;
            data.js = that.getScriptFromEditor(isFirefox, jsText);
            that.jsCode = jsText;
            PubSub.publish('JS CODE', jsText);
            // Combine and send to iframe
            PubSub.publish('LOAD FRAME', data);
          });
        });
      });
    },

    getScriptFromEditor: function(addExtra, jsCode){
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
    },

    handleNewDemo: function(){
      // Fetch the hello world demo
      var demoName = "Hello World";
      var demo = gallery[demoName];
      var id = demo.id;
      var htmlText = '';
      var cssText = '';
      var jsText = '';
      var that = this;
      var data = {};
      this.requestDemo(id + '/' + id + '.html').done(function(value){
        htmlText += value;
        that.requestDemo(id + '/' + id + '.css').done(function(value){
          // Surround the css with style tags
          var code = '<style>' + value + '</style>\n';
          // Append the html
          code += htmlText;
          cssText += value;
          data.html = htmlText;
          that.htmlCode = htmlText;
          data.css = cssText;
          that.cssCode = cssText;
          PubSub.publish('HTML CODE', htmlText);
          PubSub.publish('CSS CODE', data.css);
          //fetch the js
          var jsText = '';
          that.requestDemo(id + '/' + id + '.json').done(function(value){
            jsText += value.js;
            var isFirefox = navigator.userAgent.indexOf('Firefox/') >= 0;
            data.js = that.getScriptFromEditor(isFirefox, jsText);
            PubSub.publish('JS CODE', jsText);
            PubSub.publish('LOAD FRAME', data);
          });
        });
      });
    },

    handleNavigation: function(msg, data){
      var consoleClasses = this.state.consoleClasses;
      var bodyClasses = this.state.bodyClasses;
      switch(msg){
        case 'SHOW PREVIEW':
          consoleClasses['hidden-xs'] = true;
          bodyClasses['hidden-xs'] = false;
          break;
        case 'SHOW JS CODE':
          consoleClasses['hidden-xs'] = true;
          bodyClasses['hidden-xs'] = false;
          break;
        case 'SHOW HTML CODE':
          consoleClasses['hidden-xs'] = true;
          bodyClasses['hidden-xs'] = false;
          break;
        case 'SHOW CONSOLE':
          consoleClasses['hidden-xs'] = false;
          bodyClasses['hidden-xs'] = true;
          break;
      }
      this.setState({bodyClasses: bodyClasses, consoleClasses: consoleClasses});
    },

    loadUserCode: function(msg, data){
      if(msg === 'UPDATE JS')
      {
        this.jsCode = data;
      }
      else if(msg === 'UPDATE HTML')
      {
        this.htmlCode = data;
      }
      else
      {
        this.cssCode = data;
      }

      if(this.jsCode !== '' && this.htmlCode !== '' && this.cssCode !== '')
      {
        var sendData = {};
        sendData.html = '<style>' + this.cssCode + '</style>';
        sendData.html += this.htmlCode;
        var isFirefox = navigator.userAgent.indexOf('Firefox/') >= 0;
        sendData.js = this.getScriptFromEditor(isFirefox, this.jsCode);
        PubSub.publish('LOAD FRAME', sendData);
      }
    },

    refreshData: function(){
      this.htmlCode = '';
      this.jsCode = '';
      this.cssCode = '';
    },

    getDemoHTML: function(){
      var isFirefox = navigator.userAgent.indexOf('Firefox/') >= 0;
      var baseHref = window.location.href;
      var pos = baseHref.lastIndexOf('/');
      baseHref = baseHref.substring(0, pos) + '/';
      return '<html>' + '\n'
            + '<head>' + '\n'
            + '<base href="' + baseHref + '"></base>' + '\n'
            + '<script src="../../Build/Cesium/Cesium.js"></script>' + '\n'
            + '<script type="text/javascript" src="./Sandcastle-header.js"></script>' + '\n'
            + '<style>@import url(../../Build/Cesium/Widgets/widgets.css);\nhtml, body, #cesiumContainer {width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden;}\n</style>' + '\n'
            + '</head><body class="sandcastle-loading">' + '\n'
            + '<style>' + '\n'
            + this.cssCode + '\n'
            + '</style>' + '\n'
            + this.htmlCode + '\n'
            + '<script type="text/javascript">' + '\n'
            + this.getScriptFromEditor(isFirefox, this.jsCode) + '\n'
            + '</script></body></html';
    },

    exportStandalone: function(){
      var data;
      var link = document.createElement('a');
      data = this.getDemoHTML();
      link.setAttribute('href', 'data:text/html;charset=utf-8', encodeURIComponent(data));
      link.setAttribute('download', 'export.html');
      if (document.createEvent) {
        var event = document.createEvent('MouseEvents');
        event.initEvent('click', true, true);
        link.dispatchEvent(event);
      }
      else {
        link.click();
      }
      var octetBlob = new Blob([data], {
        'type': 'application/octet-stream',
        'endings': 'native'
      });
      var octetBlobURL = URL.createObjectURL(octetBlob);
      // window.open(octetBlobURL);
    },

    openNewWindow: function(){
      var data;
      data = this.getDemoHTML();
      var htmlBlob = new Blob([data], {
        'type': 'text/html;charset=utf-8',
        'endings': 'native'
      });
      var htmlBlobURL = URL.createObjectURL(htmlBlob);
      window.open(htmlBlobURL, '_blank');
      window.focus();
    },

    componentWillMount: function(){
      PubSub.subscribe('RELOAD FRAME', this.refreshData);
      PubSub.subscribe('SHOW PREVIEW', this.handleNavigation);
      PubSub.subscribe('SHOW JS CODE', this.handleNavigation);
      PubSub.subscribe('SHOW HTML CODE', this.handleNavigation);
      PubSub.subscribe('SHOW CONSOLE', this.handleNavigation);
      PubSub.subscribe('UPDATE JS', this.loadUserCode);
      PubSub.subscribe('UPDATE HTML', this.loadUserCode);
      PubSub.subscribe('UPDATE CSS', this.loadUserCode);
      PubSub.subscribe('EXPORT STANDALONE', this.exportStandalone);
      PubSub.subscribe('NEW WINDOW', this.openNewWindow);
    },

    componentDidMount: function(){
      this.loadDemoCode();
      PubSub.subscribe('NEW DEMO', this.handleNewDemo);
    },

    requestDemo: function(file){
      return $.ajax({
        url: 'gallery/' + file,
        handleAs: 'text',
        fail: function(error) {
          console.log(error);
        }
      });
    },

    render: function(){
      var printClasses = function(obj){
        var classes = '';
        for(type in obj){
          if(obj[type])
            classes += type;
            classes += ' ';
        }
        return classes;
      };

      return (
        <div id="bodyContainer" className="container-fluid">
          <div id="bodyRow" className={printClasses(this.state.bodyClasses)}>
            <SandcastleCode />
            <SandcastleCesium/>
          </div>
          <div id="consoleRow" className={printClasses(this.state.consoleClasses)}>
            <SandcastleConsole />
          </div>
        </div>
      );
    }
  });

  var SandcastleDocs = React.createClass({
    getInitialState: function(){
      return {
        top: 0,
        left: -999
      };
    },

    updatePosition: function(msg, data){
      if(data.top !== undefined)
      {
        this.setState({top: data.top});
      }
      if(data.left !== undefined)
      {
        this.setState({left: data.left});
      }
    },

    componentWillMount: function(){
      PubSub.subscribe('DOC POSITION', this.updatePosition);
    },

    render: function(){
      return (
        <div style={{top:this.state.top + 'px', left:this.state.left + 'px'}} className="tooltip bottom" id="docPopup" role="tooltip">
          <div className="tooltip-arrow"></div>
          <div className="tooltip-inner" id="docPopupMessage">
          </div>
        </div>
      )
    }
  });

  var SandcastleApp = React.createClass({
    componentWillMount: function(){
      if(window.location.search)
      {
        var query = window.location.search.substring(1).split('&');
        for (var i = 0; i < query.length; ++i) {
          var tags = query[i].split('=');
          queryParams[tags[0]] = tags[1];
          if(tags[0] == "src")
          {
            // Set the current demo
            this.demoName = tags[1];
          }
        }
        if(!this.demoName)
        {
          // Set the demo name to hello world
          this.demoName = "Hello World";
        }
      }
      else
      {
        //No query parameters. set demo name
        this.demoName = "Hello World";
      }
    },

    render: function(){
      return (
        <div style={{height: 100 + '%'}}>
          <SandcastleHeader />
          <SandcastleBody demo={this.demoName}/>
          <SandcastleDocs />
        </div>
      );
    }
  });

  var SandcastleHeader = React.createClass({
    newDemo: function(){
      $(".navbar-collapse").collapse('hide');
      // Open the preview screen else Cesium returns an error
      this.showPreview();
      PubSub.publish('NEW DEMO', '');
    },

    runDemo: function(){
      PubSub.publish('RELOAD FRAME', '');
    },

    runSuggest: function(){
      PubSub.publish('SUGGEST', '');
    },

    newWindow: function(){
      PubSub.publish('NEW WINDOW', '');
    },

    showPreview: function(){
      $(".navbar-collapse").collapse('hide');
      PubSub.publish('SHOW PREVIEW', '');
    },

    showJSCode: function(){
      $(".navbar-collapse").collapse('hide');
      PubSub.publish('SHOW JS CODE', '');
      $('#codeContainerTabs a[href="#jsContainer"]').tab('show');
    },

    showHTMLCode: function(){
      $(".navbar-collapse").collapse('hide');
      PubSub.publish('SHOW HTML CODE', '');
      $('#codeContainerTabs a[href="#htmlContainer"]').tab('show');
    },

    showConsole: function(){
      $(".navbar-collapse").collapse('hide');
      PubSub.publish('SHOW CONSOLE', '');
      $('#consoleLog').addClass('in');
    },

    exportStandalone: function(){
      PubSub.publish('EXPORT STANDALONE', '');
    },

    render: function(){
      return (
        <nav className="navbar navbar-default" id="toolbar">
          <div className="container-fluid">
            <div className="navbar-header">
              <button type="button" className="navbar-toggle collapsed" data-toggle="collapse" data-target="#toolbar-extend">
                <span className="sr-only">Toggle navigation</span>
                <span className="icon-bar"></span>
                <span className="icon-bar"></span>
                <span className="icon-bar"></span>
              </button>
              <a className="navbar-brand" href="http://cesiumjs.org/" target="_blank"><img src="./img/Cesium_Logo_Color_Overlay.png" style={{width: 118 + 'px'}}/></a>
            </div>


            <div className="collapse navbar-collapse" id="toolbar-extend">
              <ul className="nav navbar-nav">
                  <li id="buttonNew"><a href="#" onClick={this.newDemo}>New</a></li>
                  <li className="hidden-xs" id="buttonRun"><a href="#" onClick={this.runDemo}>Run (F8)</a></li>
                  <li className="hidden-xs" id="buttonSuggest" onClick={this.runSuggest}><a href="#">Suggest (Ctrl-Space)</a></li>
                  <li className="hidden-xs" id="buttonNewWindow" onClick={this.newWindow}><a href="#">Open in New Window</a></li>
                  <li id="buttonCesium" className="visible-xs-block"><a href="#" onClick={this.showPreview}>Preview</a></li>
                  <li id="buttonJSCode" className="visible-xs-block"><a href="#" onClick={this.showJSCode}>View JS Code</a></li>
                  <li id="buttonHTMLCode" className="visible-xs-block"><a href="#" onClick={this.showHTMLCode}>View HTML Code</a></li>
                  <li id="buttonConsole" className="visible-xs-block"><a href="#" onClick={this.showConsole}>Console</a></li>
                  <li className="dropdown" id="buttonShare">
                    <a href="#" className="dropdown-toggle" data-toggle="dropdown" role="button" aria-expanded="false">Share <span className="caret"></span></a>
                    <ul className="dropdown-menu" role="menu">
                      <li><a href="#" onClick={this.exportStandalone}>Export as standalone</a></li>
                    </ul>
                  </li>
                  <li id="buttonGallery"><a href="#">Gallery</a></li>
              </ul>
            </div>
          </div>
        </nav>
      );
    }
  });

  return SandcastleApp;
});