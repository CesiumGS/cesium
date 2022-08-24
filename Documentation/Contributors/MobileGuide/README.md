# Mobile Guide

## Supported mobile platforms

CesiumJS relies on WebGL, which is supported on [nearly all major mobile hardware platforms and browsers](https://caniuse.com/webgl). However, WebGL may be unavailable on some older devices.

## Debugging on Mobile

- If using Sandcastle, use the standalone viewer to ensure that the UI elements do not force the creation of a very small canvas. You can get there by clicking on the "Open In New Window" button on the Sandcastle toolbar.
- Use [WebGL Report](https://webglreport.com/) to gather information about the Web GL implementation on the device you are testing.
- Remote debugging can be done via USB connection. Use the official instructions for [Chrome](https://developer.chrome.com/docs/devtools/remote-debugging/) or [Firefox](https://firefox-source-docs.mozilla.org/devtools-user/about_colon_debugging/index.html) to connect the debugger tools on your computer to the browser on your phone.
- It is possible to debug over WiFi on Android, however, the resiliency of this method may depend on the type of network the devices are on and certain device permissions. Follow this guide to debug [Chrome](https://cybercafe.dev/debug-android-chrome-wirelessly-from-macbook/) over WiFi.
- [Follow this guide](https://frontaid.io/blog/wireless-remote-debugging-with-safari-on-ios/) to setup remote debugging (USB or WiFi) for Safari on your iOS device.
