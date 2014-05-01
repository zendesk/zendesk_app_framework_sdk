## Zendesk App Framework (ZAF) SDK

When you include the ZAF SDK on your website you get access to the `ZAFClient` object.

### ZAFClient API

#### ZAFClient.init([callback(context)])

Returns a [`client`](#client-object) object

##### Arguments

  * `callback(context)` a function that will get called as soon as communication with the Zendesk app is estabilished. This callback will be passed a context object with data related to the Zendesk app, including `currentAccount`, `currentUser` and `location`.

Example:

```javascript
var client = ZAFClient.init(function(context) {
  var currentUser = context.currentUser;
  console.log('Hi ' + currentUser.name);
});
```

### Client API

#### client.postMessage(message, [data])

##### Arguments

  * `message` the name of the message event. This will determine the name of the iframe event your app will receive. i.e. if you set this to 'hello', you app will receive the event 'iframe.hello'.
  * `data` (optional) a JSON object with any data that you want to pass along with the event.

```javascript
var client = ZAFClient.init();
client.postMessage('hello', { awesome: true });
```

#### client.on(eventName, handler, [context])

Allows you to add handlers to a framework event. You can add as many handler as you wish. They will be executed in the order they were added.

##### Arguments

  * `eventName` the name of the framework event you want to listen to. This can be framework, request, custom or hook events. Your can listen to any events your app receives, apart from DOM events. You don't need to register these events on app first.
  * `handler` a function to be called when this event fires. You can expect to receive the same event object your app would receive, parsed as JSON.
  * `context` (optional) the value of `this` within your handler.

```javascript
var client = ZAFClient.init();
client.on('app.activated', function(e) {
  // go nuts
});
```

#### client.off(eventName, handler)

Allows you to remove a handler for a framework event.

##### Arguments

  * `eventName` the name of the event.
  * `handler` the function you attached earlier with `on`

```javascript
var client = ZAFClient.init();

client.on('app.activated', function appActivated(e) {
  // do stuff then remove the handler
  client.off('app.activated', appActivated);
});
```

#### client.has(eventName, handler)

Returns whether or not an event has the specified handler attached to it.

##### Arguments

  * `eventName` the name of the event.
  * `handler` the handler you want to test

```javascript
var client = ZAFClient.init();

client.on('app.activated', function appActivated(e) {
  // do stuff
});

client.has('app.activated', appActivated);   // true
client.has('app.deactivated', appActivated); // false
```

#### client.trigger(eventName, [data])

Triggers the specified event on the client.

##### Arguments

  * `eventName` the name of the event you want to trigger
  * `data` (optional) data you want to pass to the handler

```javascript
var client = ZAFClient.init();

client.on('activation', function {
  console.log('activating!')
});

client.trigger('activation') // activating!
```
