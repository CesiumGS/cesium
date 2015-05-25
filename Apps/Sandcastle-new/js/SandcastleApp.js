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
      return {
        src: 'var i = 10;\n'
      };
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
        src: '<p>Hello World</p>\n'
      };
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
              <SandcastleJSCode />
              <SandcastleHTMLCode />
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
            <SandcastleCesiumContainer />
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
            <SandcastleCode />
            <SandcastleCesium />
          </div>
        </div>
      );
    }
  });

  var SandcastleApp = React.createClass({
    render: function(){
      return (
        <div style={{height: 100 + '%'}}>
          <SandcastleHeader />
          <SandcastleBody />
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