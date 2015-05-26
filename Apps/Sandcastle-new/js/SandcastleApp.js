define(['react', 'CodeMirror/lib/codemirror','CodeMirror/addon/hint/show-hint','CodeMirror/addon/hint/javascript-hint','CodeMirror/mode/javascript/javascript','CodeMirror/mode/css/css','CodeMirror/mode/xml/xml','CodeMirror/mode/htmlmixed/htmlmixed'], function(React, CodeMirror){
  var SandcastleCodeTabs = React.createClass({
    render: function(){
      return (
        <ul className="nav nav-tabs" id="codeContainerTabs" role="tablist">
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

    loadDemoCode: function(){
      // fetch the data for the demo
      var scriptCodeRegex = /\/\/Sandcastle_Begin\s*([\s\S]*)\/\/Sandcastle_End/;
      var code;
      var that = this;
      this.requestDemo().then(function(value){
        code = value;
        var parser = new DOMParser();
        var doc = parser.parseFromString(code, 'text/html');

        var script = doc.querySelector('script[id="cesium_sandcastle_script"]');
        if (!script) {
          console.log('Error reading source file: ' + this.props.demo);
          return;
        }
        var scriptMatch = scriptCodeRegex.exec(script.textContent);
        if (!scriptMatch) {
          console.log('Error reading source file: ' + this.props.demo);
          return;
        }
        code = scriptMatch[1];
        that.setState({src: code});
      });
    },

    componentDidMount: function(){
      this.loadDemoCode();
    },

    requestDemo: function(){
      return $.ajax({
        url: 'gallery/' + this.props.demo + '.html',
        handleAs: 'text',
        sync: true,
        error: function(error) {
          console.log(error);
        }
      });
    },

    render: function(){
      return (
        <div role="tabpanel" className="tab-pane active codeContainer" id="jsContainer">
          <SandcastleCodeMirrorEditor style={{height: 95 + '%'}} textAreaClassName='form-control' defaultValue={this.state.src} mode="javascript" lineNumbers={true} gutters ={['hintGutter', 'errorGutter', 'searchGutter', 'highlightGutter']} matchBrackets={true} indentUnit={4} />
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
        src: '&lt;!-- Select a demo from the gallery to load. --&gt;\n'
      };
    },

    loadDemoCode: function(){
      // fetch the data for the demo
      var scriptCodeRegex = /\/\/Sandcastle_Begin\s*([\s\S]*)\/\/Sandcastle_End/;
      var that = this;
      this.requestDemo().then(function(value){
        code = value;
        var parser = new DOMParser();
        var doc = parser.parseFromString(code, 'text/html');
        var script = doc.querySelector('script[id="cesium_sandcastle_script"]');
        var htmlText = '';
        var childIndex = 0;
        var childNode = doc.body.childNodes[childIndex];
        while (childIndex < doc.body.childNodes.length && childNode !== script) {
          htmlText += childNode.nodeType === 1 ? childNode.outerHTML : childNode.nodeValue;
          childNode = doc.body.childNodes[++childIndex];
        }
        htmlText = htmlText.replace(/^\s+/, '');
        that.setState({src: htmlText});
      });
    },

    componentDidMount: function(){
      this.loadDemoCode();
    },

    requestDemo: function(){
      return $.ajax({
        url: 'gallery/' + this.props.demo + '.html',
        handleAs: 'text',
        sync: true,
        error: function(error) {
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
        <div id="codeColumn" className="col-md-5">
          <div role="tabpanel">
            <SandcastleCodeTabs />
            <div className="tab-content">
              <SandcastleJSCode demo={this.props.demo}/>
              <SandcastleHTMLCode demo={this.props.demo}/>
            </div>
          </div>
        </div>
      );
    }
  });

  var SandcastleCesiumTabs = React.createClass({
    render: function(){
      return (
        <ul className="nav nav-tabs" id="cesiumTabs" role="tablist">
            <li role="presentation" className="active"><a href="#bucketPane" aria-controls="bucketPane" role="tab" data-toggle="tab">Cesium</a></li>
        </ul>
      );
    }
  });

  var SandcastleCesiumContainer = React.createClass({
    getInitialState: function(){
      this.emptyDoc = $('#bucketFrame').contentDocument;
      this.defaultHeaders = '<html><head></head><body data-sandcastle-bucket-loaded="no">';
      return null;
    },

    componentDidMount: function(){
      // Load the bucket with demo code
      this.loadBucket();
    },

    loadBucket: function(){
      // Save a reference to the current object.
      var that = this;
      this.requestDemo().then(function(value){
        var parser = new DOMParser();
        var doc = parser.parseFromString(value, 'text/html');

        var bucket = doc.body.getAttribute('data-sandcastle-bucket');
        bucket = bucket ? bucket : 'bucket-requirejs.html';
        $.ajax({
          url: 'templates/' + bucket,
          dataType: 'text'
        }).done(function(value) {
          var pos = value.indexOf('<body');
          pos = value.indexOf('>', pos);
          bucketTypes = value.substring(0, pos + 1);
          that.defaultHeaders = bucketTypes;
          that.applyBucket();
        });
      });
    },

    applyBucket: function(){
      // TODO: come up with better way to do this
      var bucketDoc = document.getElementById("bucketFrame").contentDocument;
      var bodyAttributes = this.defaultHeaders.match(/<body([^>]*?)>/)[1];
      var attributeRegex = /([-a-z_]+)\s*="([^"]*?)"/ig;
      var attributeMatch;
      while ((attributeMatch = attributeRegex.exec(bodyAttributes)) !== null) {
        var attributeName = attributeMatch[1];
        var attributeValue = attributeMatch[2];
        if (attributeName === 'class') {
          bucketDoc.body.className = attributeValue;
        } else {
          bucketDoc.body.setAttribute(attributeName, attributeValue);
        }
      }

      var pos = this.defaultHeaders.indexOf('</head>');
      var extraHeaders = this.defaultHeaders.substring(this.emptyDoc.length, pos);
      bucketDoc.head.innerHTML += extraHeaders;
    },

    requestDemo: function(){
      return $.ajax({
        url: 'gallery/' + this.props.demo + '.html',
        handleAs: 'text',
        sync: true,
        error: function(error) {
          console.log(error);
        }
      });
    },

    render: function(){
      return (
        <div id="cesiumContainer" className="tab-content">
          <div role="tabpanel" className="tab-pane active" id="bucketPane">
              <iframe id="bucketFrame" src="templates/bucket.html" className="fullFrame" allowFullScreen mozallowfullscreen webkitallowfullscreen></iframe>
          </div>
        </div>
      );
    }
  });

  var SandcastleCesium = React.createClass({
    render: function(){
      return (
        <div id="cesiumColumn" className="col-md-7">
          <div role="tabpanel">
            <SandcastleCesiumTabs />
            <SandcastleCesiumContainer demo={this.props.demo}/>
          </div>
        </div>
      );
    }
  });

  var SandcastleBody = React.createClass({
    render: function(){
      return (
        <div id="bodyContainer" className="container-fluid">
          <div id="bodyRow" className="row">
            <SandcastleCode demo={this.props.demo}/>
            <SandcastleCesium demo={this.props.demo}/>
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
                  <li id="buttonNew"><a href="#">New</a></li>
                  <li id="buttonRun"><a href="#">Run (F8)</a></li>
                  <li id="buttonSuggest"><a href="#">Suggest (Ctrl-Space)</a></li>
                  <li id="buttonNewWindow"><a href="#">Open in New Window</a></li>
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