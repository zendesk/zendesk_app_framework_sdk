## IFrames in Apps

Apps can use iframes to embed external websites within Zendesk. In order for your external website to interact with your app, the framework provides a set of APIs that allow you to post and receive messages both from your external website and your app.

### Introducing the Zendesk App Framework (ZAF) SDK

ZAF SDK is a JavaScript library that simplifies cross-frame communication between an external website and the Zendesk app containing it.

### Getting Started

You can start by adding the following code to your website:

#### External website, e.g. "https://dashboard.myapp.com"
```html
<script type="text/javascript" src="https://assets.zendesk.com/apps/sdk/zaf_sdk.js"></script>
<script>
  var app = window.ZAFClient.init();

  app.postMessage('hello', { awesome: true }); // post the message 'hello' to the Zendesk app

  app.on('app.activated', function(data) { // listen to the 'app.activated' Framework event
    // go nuts
  });
</script>
```

The `src` attribute in the `<script>` element must point to a copy of [zaf_sdk.js](https://assets.zendesk.com/apps/sdk/zaf_sdk.js). Click [here](https://assets.zendesk.com/apps/sdk/zaf_sdk.js) to download it now or copy the above link to our CDN.

Note: In order to benefit from automatic updates and caching we recommend you to always link to our CDN rather than including your own copy.

Once you've included the SDK on your page you can call `ZAFClient.init()`, which will return a [ZAF SDK client](./reference/sdk.html#client-object) object. The ZAF SDK client allows you to post and receive framework events on your external website. To learn more about what you can do with the ZAF SDK please see [Reference: Zendesk App Framework (ZAF) SDK](./reference/sdk.html).

#### App

Once you have your website ready, you must load it from within your app using the ZAF Handlebars `iframe` helper. This will enable the communication between the app and the SDK.

##### iframe_template.hdbs
```html
{{iframe "https://dashboard.myapp.com"}}
```

As soon as you switch to that template your app can start receiving `iframe` events and also posting messages back to the iframe.

##### app.js
```js
events: {
  'app.created':  'init',
  'iframe.hello': 'handleHello'
},

init: function() {
  this.switchTo('iframe_template');
},

handleHello: function(data) {
  if (data.awesome) {
    this.postMessage('hello to you too iframe friend!');
  }
}
```

To learn more about `iframe` events and the `postMessage` API please see [Reference: Events](./reference/events.html).
