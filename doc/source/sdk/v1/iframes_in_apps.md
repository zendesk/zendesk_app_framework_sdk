## Iframes in Apps

You can embed websites in your apps with iframes. The Apps framework provides a set of APIs that allow you to post and receive messages from both your website and your app.

### Getting Started

Suppose you want to embed the website "https://dashboard.myapp.com" in a Zendesk app. To embed the site, make the following changes to your website and your app.

#### Website

Start by adding the following code to your website:

```html
<script type="text/javascript" src="https://assets.zendesk.com/apps/sdk/latest/zaf_sdk.js"></script>
<script>
  var app = window.ZAFClient.init();

  app.postMessage('hello', { foo: true }); // post the message 'hello' to the Zendesk app

  // listen to the 'app.registered' event, which is fired by the framework once the iframe is registered with the app
  app.on('app.registered', function(data) {
    // go nuts
  });

  app.on('helloIframe', function(data) { // listen to the 'helloIframe' message sent from the app
    if (data.bar) {
      // app says hello
    }
  });
</script>
```

The code imports the Zendesk App Framework (ZAF) SDK. The ZAF SDK is an open-source JavaScript library that simplifies cross-frame communication between an external website and the Zendesk app containing it. You can view and contribute to the source code on [GitHub](https://github.com/zendesk/zendesk_app_framework_sdk).

The `src` attribute in the `<script>` element must point to a copy of [zaf_sdk.js](https://assets.zendesk.com/apps/sdk/latest/zaf_sdk.js) or the minified version [zaf_sdk.min.js](https://assets.zendesk.com/apps/sdk/latest/zaf_sdk.min.js). To benefit from automatic updates and caching, we recommend you always link to our CDN rather than including your own copy.

After importing the SDK, you call `ZAFClient.init()`, which returns a [ZAF SDK client](#zafclient-api) object. The client allows you to post and receive framework events on your external website. See the [Client Object](#client-object) reference below.

#### App

Switch to your app and use the `iframe` template helper to load the website in a template. Example:

##### my_template.hdbs

```html
{{iframe "https://dashboard.myapp.com"}}
```

As soon as you switch to the template, your app can start receiving `iframe` events and posting messages back to the iframe. Example:

##### app.js
```js
events: {
  'app.created':  'init',
  'iframe.hello': 'handleHello'
},

init: function() {
  this.switchTo('my_template');
},

handleHello: function(data) {
  if (data.foo) {
    this.postMessage('helloIframe', { bar: true });
  }
}
```

To learn more about `iframe` events and the `postMessage` API, see the [Events](./events) reference.

@import lib/index.js

@import lib/client.js
