Zendesk App Framework SDK
=========================

## What is it?

The Zendesk App Framework (ZAF) SDK is a JavaScript micro-library that simplifies cross-frame communication between iframed apps and [ZAF](http://developer.zendesk.com/documentation/apps/).

## How does it work?

### iframe.hdbs
{{iframe "https://dashboard.myapp.com"}}

### app.js
```js
events: {
  'app.created': 'init'
},

init: function() {
  this.switchTo('iframe');
}
```


### Iframed website
```html
<script type="text/javascript" src="vendor/zaf_client.js"></script>
<script>
  var app = window.ZAFClient.init(function(context) {
    var currentUser = context.currentUser;
    console.log('Hi ' + currentUser.name);
  });

  app.postMessage('hello app', { awesome: true });

  app.on('app.activated', function(data) {
    // go nuts
  });

  app.on('app.willDestroy', function(data) {
    // clean up your mess
  });
</script>
```
