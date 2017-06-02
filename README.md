*Use of this software is subject to important terms and conditions as set forth in the License file*

Zendesk App Framework SDK
=========================

[![Build Status](https://travis-ci.org/zendesk/zendesk_app_framework_sdk.svg?branch=master)](https://travis-ci.org/zendesk/zendesk_app_framework_sdk)

## What is it?

The Zendesk App Framework (ZAF) SDK is a JavaScript micro-library that simplifies cross-frame communication between iframed apps and [ZAF](http://developer.zendesk.com/documentation/apps/). See [Iframes in Apps](https://developer.zendesk.com/apps/docs/agent/iframes_in_apps) to learn more.

## How does it work?

### iframed website
```html
<script type="text/javascript" src="http://assets.zendesk.com/apps/sdk/1.0/zaf_sdk.js"></script>
<script>
  var app = window.ZAFClient.init(function(context) {
    var currentUser = context.currentUser;
    console.log('Hi ' + currentUser.name);
  });

  app.on('helloIframe', function(data) {
    if (data.omg) {
      console.log('app says hello');
    }
  });

  app.postMessage('helloApp', { awesome: true });
</script>
```

### iframe.hdbs
```html
{{iframe "https://dashboard.myapp.com"}}
```

### app.js
```js
events: {
  'app.created':     'init',
  'app.registered':  'onAppRegistered',
  'iframe.helloApp': 'handleHello'
},

init: function() {
  this.switchTo('iframe');
},

onAppRegistered: function() {
  this.postMessage('helloIframe', { omg: true })
},

handleHello: function(data) {
  if (data.awesome) {
    console.log('iframe says hello');
  }
}
```

## For development...

You will need:

* [Node.js](http://nodejs.org/)
* [npm](https://www.npmjs.org/)
* [Grunt](http://gruntjs.com/) - `npm install -g grunt-cli`

Then run:

`npm install` - Install dependencies

`grunt server` - Serve the [public](./public) directory at [http://localhost:9001](http://localhost:9001)

## Copyright and license

Copyright 2014 Zendesk

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.

You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
