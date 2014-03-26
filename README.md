Zendesk App Framework SDK
=========================

## What is it?

The Zendesk App Framework (ZAF) SDK is a JavaScript micro-library that simplifies cross-frame communication between iframed apps and [ZAF](http://developer.zendesk.com/documentation/apps/).

## How does it work?

### app.js
```js
events: {
  'app.activated': 'appActivated'
},

appActivated: function(e) {
  if (e.firstLoad) {
    this.registerIframe('iframe:first', 'https://dashboard.myapp.com');
  }
}
```


### Iframed website
```html
<script type="text/javascript" src="vendor/zaf_client.js"></script>
<script>
  var app = window.ZAFClient.init(function() {
    this.postMessage('hello app', { awesome: true });
  });

  app.on('app.activated', function(data) {
    // go nuts
  });

  app.on('app.willDestroy', function(data) {
    // clean up your mess
  });
</script>
```
