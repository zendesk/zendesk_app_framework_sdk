## Iframed Apps

Iframed Apps are Apps, which are hosted on an external domain and included on a Zendesk App as an iframe. In order for Iframed Apps to interact with the Framework they may need to post and receive [messages](https://developer.mozilla.org/en-US/docs/Web/API/Window.postMessage) both from the Iframed App and the Zendesk App.

## Introducing the Zendesk App Framework (ZAF) SDK

ZAF SDK is a JavaScript micro-library that simplifies cross-frame communication between Iframed Apps and ZAF.

### How does it work?

You can start by adding the following code to your Iframed website:

#### Iframed website (i.e. https://dashboard.myapp.com)
```html
<script type="text/javascript" src="https://assets.zendesk.com/assets/apps/zaf_client.js"></script>
<script>
  var app = window.ZAFClient.init();

  app.postMessage('hello', { awesome: true }); // post the message 'hello' to the Zendesk App along with some data

  app.on('app.activated', function(data) { // listen to the 'app.activated' Framework event from the iframe
    // go nuts
  });
</script>
```

The `src` attribute in the `<script>` element must point to a copy of [zaf_client.js](). Click [here]() to download it now or copy the above link to our CDN.

Once you've included the SDK on your page you can call `ZAFClient.init()`, which will return a [ZAF SDK client]() object. The ZAF SDK client allows you to post and receive Framework events on your Iframed App, click [here]() to learn more about what you can do with the ZAF SDK client.

#### Zendesk App

Once you have your website ready you will need to include it on one of your Zendesk App's templates using the Framework Handlebars helper `iframe`.

##### iframe_template.hdbs
```html
{{iframe "https://dashboard.myapp.com"}}
```

As soon you switch to that template your Zendesk App can start receiving `iframe` events and also posting messages back to the iframe.

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

To learn more about `iframe` events and the `postMessage` API please see our [reference guide](). Alternatively, if you are an expert and would like to understand how all this magic works click [here]() to see our [Iframed Apps - Technical Overview]() blog post.
