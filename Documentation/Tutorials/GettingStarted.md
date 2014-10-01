This tutorial will get developers of all skill levels up and running with their first Cesium application.

### Making sure that your browser is Cesium-ready
The easiest way to verify that Cesium works in your web browser is to run the Hello World example by 
<a href="../HelloWorld.html" target="_blank">clicking here</a> (opens a new window). If you see something like the below image, congratulations, your system can run Cesium and you can safely skip to the next section; otherwise, continue reading.

<p class="center">
<a href="../HelloWorld.html"><img src="Images/Tutorials/GettingStarted/HelloWorld.png"/></a>
</p>

</br>
Cesium is built on several new HTML5 technologies, the most important of which is [WebGL](http://en.wikipedia.org/wiki/WebGL).  Even though these new standards are quickly becoming widely adopted, some browsers and systems need to be updated to support them. If the example application doesn't work for you, here are a few things to try.

1. Update your web browser.  Most of the Cesium team uses Google Chrome, but Firefox, Internet Explorer 11, and Opera will also work.  If you're already using one of the above browsers, make sure it's updated to the latest version.
2. Update your video card driver to better support 3D.  If you know what type of video card you have, you can check the vendor web site for updates.  The three most popular are: [Nvidia](http://www.nvidia.com/drivers), [AMD](http://www.amd.com/drivers), and [Intel](https://downloadcenter.intel.com/default.aspx).
3. If you're still having problems, try visiting <a href="http://get.webgl.org/">http://get.webgl.org/</a>, which offers additional trouble-shooting advice.  You can also ask for help on the [Cesium forum]({{ BASE_PATH }}/forum.html).

### Selecting an editor or IDE

If you're already a seasoned developer, you most likely have a favorite editor or development environment; for example, most of the Cesium team uses [Eclipse](http://www.eclipse.org/).  If you're just starting out, a great free and open-source editor is Notepad++, which you can download from [their website](http://notepad-plus-plus.org/).  Ultimately any text editor will do, so go with the one that you are most comfortable with.

### Downloading a Cesium release
{% capture first_release_name %}{{ site.releases | map: 'name' | first }}{% endcapture %}
Assuming you haven't already done so, click this button to grab the latest Cesium release:
<a class="btn btn-primary btn-small downloadButton"
    href="{{BASE_PATH}}/releases/Cesium-{{ first_release_name }}.zip"
    onClick='trackReleaseDownload("{{ first_release_name }}-tutorial");'>
    Cesium-{{ first_release_name }}.zip</a>

Once downloaded, extract the zip file into a new directory of your choice, I'll refer to this throughout the tutorial as the Cesium `root` directory.  The contents should look something like the below.

<p class="center">
<img src="Images/Tutorials/GettingStarted/CesiumContents.png"/>
</p>

It may be tempting to double-click on `index.html`, but we'll only be greeted with disappointment.  In order for the application to actually work, it needs to run within a web server.

### Setting up a web server

In order to run Cesium applications, we'll need a local web server to host our files.  We'll be using Node.js for this and other tutorials.  If you already have a web server that you want to use, that's fine too, just be sure to host the root directory that we created in the previous section.  Cesium has no server requirements; it is completely client side.  This means any web server that can host static content can also host Cesium.

Setting up a web server with Node.js is easy and only takes 3 steps.
1. Install Node.js from their [website](http://nodejs.org/), you can use the default install settings.
2. Open a command shell in the Cesium root directory and download/install the required modules by executing `npm install`.  This will create a 'node_modules' directory in the root directory.
3. Finally, start your web server by executing `node server.js` in the root directory.
4. You should see something like the below

<p class="center">
<img src="Images/Tutorials/GettingStarted/ServerRunning.png"/>
</p>
 
### Hello (again) world!
Now that we have a web server up and running, we can launch a browser and navigate to <a href="http://localhost:8080/Apps/HelloWorld.html">http://localhost:8080/Apps/HelloWorld.html</a>.  This is the same Hello World application we used to test WebGL at the beginning of the tutorial, but now it's running on your own system instead of the Cesium website.  If we open up `HelloWorld.html` in an editor, we'll find the following simple application.
    
<pre><code>&lt;!DOCTYPE html&gt;
&lt;html lang=&quot;en&quot;&gt;
  &lt;head&gt;
    &lt;title&gt;Hello World!&lt;/title&gt;
    &lt;script src=&quot;Cesium/Cesium.js&quot;&gt;&lt;/script&gt;
    &lt;style&gt;
      @import url(Cesium/Widgets/widgets.css);
      #cesiumContainer {
        position: absolute;
        top: 0;
        left: 0;
        height: 100%;
        width: 100%;
        margin: 0;
        overflow: hidden;
        padding: 0;
        font-family: sans-serif;
      }
      
      html {
        height: 100%;
      }

      body {
        padding: 0;
        margin: 0;
        overflow: hidden;
        height: 100%;
      }
    &lt;/style&gt;
  &lt;/head&gt;
&lt;body&gt;
  &lt;div id=&quot;cesiumContainer&quot;&gt;&lt;/div&gt;
  &lt;script&gt;
    var viewer = new Cesium.Viewer(&#39;cesiumContainer&#39;);
  &lt;/script&gt;
&lt;/body&gt;
&lt;/html&gt;</code></pre>

While the application is small, it has everything we need to begin a larger one.  We'll break down the four most important lines.

1. The first step is to include `Cesium.js` in a script tag.  This defines the `Cesium` object, which contains everything we need.
<pre><code>&lt;script src=&quot;Cesium/Cesium.js&quot;&gt;&lt;/script&gt;</code></pre>
2. In order to use the Cesium Viewer widget, we need to include its CSS.
<pre><code>@import url(Cesium/Widgets/widgets.css);</code></pre>
3. In the HTML body, we create a div for the viewer to live.
<pre><code>&lt;div id=&quot;cesiumContainer&quot;&gt;&lt;/div&gt;</code></pre>
4. Finally, we create an instance of viewer.
<pre><code>var viewer = new Cesium.CesiumViewer(&#39;cesiumContainer&#39;);</code></pre>

### Where to go from here
Congratulations, you are up and running with Cesium and ready to start writing your own Cesium applications and web pages.  Depending on the type of learner you are, you may be interested in checking out the other <a href="{{BASE_PATH}}/tutorials.html">tutorials</a>, which introduce the major Cesium features.  If you're a tinkerer, then <a href="/Cesium/Apps/Sandcastle/index.html" target="_blank">Cesium Sandcastle</a> is a live coding application that will allow you to not only view dozens of examples, but view and edit their source code, running with your updated changes from within the application.  Finally, no matter how you learn, the <a href="{{BASE_PATH}}/Cesium/Build/Documentation/">reference documentation</a> contains details on the API and is an invaluable resource for everyone.
