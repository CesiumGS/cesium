define(['react', 'pubsub', 'CodeMirror/lib/codemirror','CodeMirror/addon/hint/show-hint','CodeMirror/addon/hint/javascript-hint','CodeMirror/mode/javascript/javascript','CodeMirror/mode/css/css','CodeMirror/mode/xml/xml','CodeMirror/mode/htmlmixed/htmlmixed'], function(React, PubSub, CodeMirror){
  var SandcastleCodeTabs = React.createClass({
    render: function(){
      return (
        <ul className="nav nav-tabs hidden-xs" id="codeContainerTabs" role="tablist">
          <li role="presentation" className="active"><a href="#jsContainer" aria-controls="jsContainer" role="tab" data-toggle="tab">Javascript code</a></li>
          <li role="presentation"><a href="#htmlContainer" aria-controls="htmlContainer" role="tab" data-toggle="tab">HTML body &amp; CSS</a></li>
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
      }

      // Add listener for tab active
      var editor = this.editor;
      $('#codeContainerTabs a[data-toggle="tab"]').on('shown.bs.tab', function(e){
          if($(e.target).attr("href") === "#htmlContainer")
          {
              editor.refresh();
              editor.focus();
          }
          else
          {
              editor.refresh();
              editor.focus();
          }
      });

      // Subscribe to events
      PubSub.subscribe('SUGGEST', this.autocomplete);
    },

    autocomplete: function(){
      CodeMirror.commands.autocomplete(this.editor);
    },

    handleChange: function() {
      if (this.editor) {
        var value = this.editor.getValue();
        if (value !== this.props.value) {
          if (this.editor.getValue() !== this.props.value) {
            this.props.value = value;
          }
        }
      }
    },

    componentWillUpdate: function(nextProps, nextState){
      // Update with new value from demo
      this.editor.setValue(nextProps.defaultValue);
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
      return (
        <div role="tabpanel" className="tab-pane codeContainer" id="htmlContainer">
            <SandcastleCodeMirrorEditor style={{height: 100 + '%'}} textAreaClassName='form-control' defaultValue={this.state.src} mode="text/html" lineNumbers={true} matchBrackets={true} indentUnit={4}/>
        </div>
      );
    }
  });

  var SandcastleCode = React.createClass({
    render: function(){
      return (
        <div id="codeColumn" className=" col-sm-5">
          <div role="tabpanel">
            <SandcastleCodeTabs />
            <div className="tab-content">
              <SandcastleJSCode jsCode={this.props.jsCode} demo={this.props.demo}/>
              <SandcastleHTMLCode htmlCode={this.props.htmlCode} demo={this.props.demo}/>
            </div>
          </div>
        </div>
      );
    }
  });

  var SandcastleCesiumTabs = React.createClass({
    render: function(){
      return (
        <ul className="nav nav-tabs hidden-xs" id="cesiumTabs" role="tablist">
            <li role="presentation" className="active"><a href="#bucketPane" aria-controls="bucketPane" role="tab" data-toggle="tab">Cesium</a></li>
        </ul>
      );
    }
  });

  var SandcastleCesiumFrame = React.createClass({
    componentDidMount: function(){
      // Create an empty iframe with cesium build
      var doc = '<html><head><script src="../../Build/Cesium/Cesium.js"></script><script type="text/javascript" src="./Sandcastle-header.js"></script><style>@import url(../../Build/Cesium/Widgets/widgets.css);\nhtml, body, #cesiumContainer {width: 100%; height: 100%; margin: 0; padding: 0; overflow: hidden;}\n</style></head><body></body></html>';
      this.getDOMNode().contentWindow.document.open();
      this.getDOMNode().contentWindow.document.write(doc);
      this.getDOMNode().contentWindow.document.close();

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
      PubSub.subscribe('RELOAD FRAME', this.reloadFrame);
      PubSub.subscribe('LOAD FRAME', this.loadFrame);
      PubSub.subscribe('NEW WINDOW', this.openNewWindow);
    },

    openNewWindow: function(msg, data){
      var baseHref = window.location.href;
      var frameDoc = this.getDOMNode().contentWindow.document;
      var baseElement = frameDoc.createElement('base');
      baseElement.setAttribute("href", baseHref);
      frameDoc.head.appendChild(baseElement);
      console.log(frameDoc.children[0].outerHTML);
      var htmlBlob = new Blob([frameDoc.children[0].outerHTML], {
            'type' : 'text/html;charset=utf-8',
            'endings' : 'native'
      });
      var htmlBlobURL = URL.createObjectURL(htmlBlob);
      window.open(htmlBlobURL, '_blank');
      window.focus();
    },

    loadFrame: function(msg, data){
      var frameDoc = this.getDOMNode().contentWindow.document;
      frameDoc.body.innerHTML = "";
      if(frameDoc.readyState === 'complete'){
        var htmlCode = data.html;
        var htmlElement = frameDoc.createElement('div');
        htmlElement.innerHTML = htmlCode;
        frameDoc.body.appendChild(htmlElement);
        var scriptElement = frameDoc.createElement('script');
        scriptElement.textContent = data.js;
        frameDoc.body.appendChild(scriptElement);
      }
      else{
        var that = this;
        setTimeout(function(){
          that.loadFrame(msg, data)
        }, 0);
      }
    },

    reloadFrame: function(){
      // Reload the frame with the new code
      var frameDoc = this.getDOMNode().contentWindow.document;
      frameDoc.body.innerHTML = "";
      // Fetch the code from the code editor
      var htmlEditor = $('#htmlContainer .CodeMirror')[0].CodeMirror;
      var htmlCode = htmlEditor.getValue();
      var htmlElement = frameDoc.createElement('div');
      htmlElement.innerHTML = htmlCode;
      frameDoc.body.appendChild(htmlElement);
      var jsEditor = $('#jsContainer .CodeMirror')[0].CodeMirror;
      var jsCode = jsEditor.getValue();
      var scriptElement = frameDoc.createElement('script');
      var isFirefox = navigator.userAgent.indexOf('Firefox/') >= 0;
      scriptElement.textContent = this.getScriptFromEditor(isFirefox, jsCode);
      frameDoc.body.appendChild(scriptElement);
    },

    render: function(){
      this.cesiumFrame = React.createElement('iframe', {
        frameBorder:'0',
        className:'fullFrame',
        id:'bucketFrame'
      });
      return this.cesiumFrame;
    }
  });

  var SandcastleCesiumContainer = React.createClass({

    render: function(){
      return (
        <div id="cesiumFrame" className="tab-content">
          <div role="tabpanel" className="tab-pane active" id="bucketPane">
            <SandcastleCesiumFrame />
          </div>
        </div>
      );
    }
  });

  var SandcastleCesium = React.createClass({
    render: function(){
      return (
        <div id="cesiumColumn" className=" hidden-xs col-sm-7">
          <div role="tabpanel">
            <SandcastleCesiumTabs />
            <SandcastleCesiumContainer />
          </div>
        </div>
      );
    }
  });

  var SandcastleBody = React.createClass({
    getInitialState: function(){
      return {
        jsCode: '',
        htmlCode: ''
      }
    },

    loadDemoCode: function(){
      // fetch the html and css files
      var demo = gallery[this.props.demo];
      var id = demo.id;
      var htmlText = '';
      var that = this;
      var data = {};
      this.requestDemo(id + '/' + id + '.html').done(function(value){
        htmlText += value;
        that.requestDemo(id + '/' + id + '.css').done(function(value){
          // Surround the css with style tags
          var code = '<style>' + value + '</style>\n';
          // Append the html
          code += htmlText;
          data.html = code;
          that.setState({htmlCode: code});
          PubSub.publish('HTML CODE', code);
          //fetch the js
          var jsText = '';
          that.requestDemo(id + '/' + id + '.json').done(function(value){
            jsText += value.js;
            var isFirefox = navigator.userAgent.indexOf('Firefox/') >= 0;
            data.js = that.getScriptFromEditor(isFirefox, jsText);
            that.setState({jsCode: jsText});
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

    handleNewDemo: function(){
      // Fetch the hello world demo
      var demoName = "Hello World";
      var demo = gallery[this.props.demo];
      var id = demo.id;
      var htmlText = '';
      var that = this;
      var data = {};
      this.requestDemo(id + '/' + id + '.html').done(function(value){
        htmlText += value;
        that.requestDemo(id + '/' + id + '.css').done(function(value){
          // Surround the css with style tags
          var code = '<style>' + value + '</style>\n';
          // Append the html
          code += htmlText;
          data.html = code;
          PubSub.publish('HTML CODE', code);
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

    componentWillMount: function(){
      
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
      return (
        <div id="bodyContainer" className="container-fluid">
          <div id="bodyRow" className="row">
            <SandcastleCode demo={this.props.demo}/>
            <SandcastleCesium/>
          </div>
        </div>
      );
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
        </div>
      );
    }
  });

  var SandcastleHeader = React.createClass({
    newDemo: function(){
      $(".navbar-collapse").collapse('hide');
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
      $('#codeColumn').addClass('hidden-xs');
      $('#cesiumColumn').removeClass('hidden-xs');
    },

    showJSCode: function(){
      $(".navbar-collapse").collapse('hide');
      $('#codeColumn').removeClass('hidden-xs');
      $('#cesiumColumn').addClass('hidden-xs');
      $('#codeContainerTabs a[href="#jsContainer"').tab('show');
    },

    showHTMLCode: function(){
      $(".navbar-collapse").collapse('hide');
      $('#codeColumn').removeClass('hidden-xs');
      $('#cesiumColumn').addClass('hidden-xs');
      $('#codeContainerTabs a[href="#htmlContainer"').tab('show');
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
                  <li id="buttonConsole" className="visible-xs-block"><a href="#">Console</a></li>
                  <li id="buttonShare"><a href="#">Share</a></li>
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