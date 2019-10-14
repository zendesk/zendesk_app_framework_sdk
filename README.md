*Use of this software is subject to important terms and conditions as set forth in the License file*

Zendesk App Framework SDK
=========================

[![Build Status](https://travis-ci.org/zendesk/zendesk_app_framework_sdk.svg?branch=master)](https://travis-ci.org/zendesk/zendesk_app_framework_sdk)
[![FOSSA Status](https://app.fossa.io/api/projects/custom%2B4071%2Fgithub.com%2Fzendesk%2Fzendesk_app_framework_sdk.svg?type=shield)](https://app.fossa.io/projects/custom%2B4071%2Fgithub.com%2Fzendesk%2Fzendesk_app_framework_sdk?ref=badge_shield)


## What is it?

The Zendesk App Framework (ZAF) SDK is a JavaScript library that simplifies cross-frame communication between iframed apps and [ZAF](https://developer.zendesk.com/apps/docs/core-api/client_api). See [App Framework v2](https://developer.zendesk.com/apps/docs/apps-v2/getting_started) to learn more.

## For development...

You will need:

* [Node.js](http://nodejs.org/)
* [npm](https://www.npmjs.org/)

Then run:

`npm install` - Install dependencies
`npm run build` - Build production
`npm run build:dev` - Build development version of the SDK, omitting minification
`npm run server` - Serve the [public](./public) directory at [http://localhost:9001](http://localhost:9001)

#### Linting

`npm run lint`

#### Stats

`npm run stats`

#### Testing

`npm run test`

#### Version bumping

`npm run bump` - Bump patch version, e.g. `1.1.1 => 1.1.2`
`npm run bump:minor`
`npm run bump:major`

## Copyright and license

Copyright 2014 Zendesk

Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License.

You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0
Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
