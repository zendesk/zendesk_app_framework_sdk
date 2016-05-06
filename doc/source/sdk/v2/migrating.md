## Migrating to v2
The first step to migrate your legacy app to the Zendesk App Framework (ZAF) v2 is to clone or fork the [Iframe App Template](https://github.com/zendesk/iframe_app_template). This template contains a very simple example app and includes build tools to support some features previously provided by ZAF v1, such as jQuery, Bootstrap 2.3, Handlebars and underscore. It also includes a library of shims for some legacy v1 functions, such as `renderTemplate`, `switchTo` and `setting`. The Iframe App Template also serves as an adaptor for your legacy app, so that your `events` and `requests` definitions can be translated to work with ZAF SDK v2.

### How does it work?
ZAF v1 had a strict folder structure and very limited support for external libraries and modules. In contrast, ZAF v2 allows you to structure your files and folders in whichever way you like. You are also free to include external libraries and third-party modules. In order to make this possible, ZAF v2 delegates some responsibilities to the app developer. For example, the Iframe App Template uses webpack to compile Handlebars templates, SCSS stylesheets and CommonJS modules. If you'd like to use any other technologies you're welcome to do so, but you may need to re-configure the build process yourself.

### Folder structure

#### dist
The dist directory is the folder you will need to package when submitting your app to the marketplace. It is also the folder you will have to serve when using ZAT. It includes your app's manifest.json file, an assets folder with all your compiled JavaScript and CSS as well as HTML and images.

#### src
The src directory is where your raw source code lives. The Iframe App Template includes different directories for javascripts, stylesheets and templates.

#### .eslintrc
eslintrc is a configuration file for [ESLint](http://eslint.org). ESLint is a linting utility for JavaScript. For more information on how to configure ESLint see [Configuring ESLint](http://eslint.org/docs/user-guide/configuring).

#### package.json
package.json is a configuration file for [NPM](https://www.npmjs.com). NPM is a package manager for JavaScript. This file includes information about your project and its dependencies. For more information on how to configure this file see [package.json](https://docs.npmjs.com/files/package.json).

#### webpack.config.js
webpack.config.js is a configuration file for [webpack](https://webpack.github.io/). Webpack is a JavaScript module bundler. For more information about webpack and how to configure it see [What is webpack](http://webpack.github.io/docs/what-is-webpack.html).

### Getting Started
The following sections will explain the steps to migrate your existing app to work with the Iframe App Template.

#### Setup
1. Clone of fork the [Iframe App Template](https://github.com/zendesk/iframe_app_template) repo.
2. Run `npm install`

#### Running locally
In order to run your app within Zendesk you will need the [Zendesk Apps Tools (ZAT)](https://github.com/zendesk/zendesk_apps_tools). Once you've installed ZAT you will need two separate terminal tabs, one to watch and build this project and another serve it using ZAT:

- `webpack --watch`
- `zat server --path=./dist`

#### Migrating your templates
Copy your existing app's templates into src/templates.

e.g.
- `cd iframe_app_template`
- `cp ../legacy_app/templates/* src/templates/`

#### Migrating your app.css
Copy your app.css into src/stylesheets with a new name and import it into app.scss.

e.g.
- `cd iframe_app_template`
- `cp ../legacy_app/app.css src/stylesheets/common.scss`
- `echo "@import './common.scss';" >> src/stylesheets/app.scss`

#### Migrating your app.js
Copy your app.js to src/javascripts with a new name and update its structure.

e.g.
- `cd iframe_app_template`
- `cp ../legacy_app/app.js src/javascripts/legacy_app.js`

##### Updating the structure
Because your app is now compiled by webpack you will need to update its structure. Rather than returning the app object from an anonymous function you will need to export it using ES2015 syntax.

e.g.
Before:
```js
(function() {

  return {
    events: {
      'app.created': function() {
        this.switchTo('main');
      }
    }
  };

}());
```

After:
```js
import BaseApp from './base_app'; // ZAF v1 shims

var App = {
  events: {
    'app.created': function() {
      this.switchTo('main');
    }
  }
};

export default BaseApp.extend(App);
```

#### Copying your manifest.json
Copy your manifest.json to dist/manifest.json and update the locations object.

e.g.
- `cd iframe_app_template`
- `cp ../legacy_app/manifest.json dist/manifest.json`

##### Updating locations
In ZAF v2 your locations object needs to define url paths that point to HTML files. When migrating you can point all your locations to the same HTML.

e.g.
Before:
```json
{
  "location": ["ticket_sidebar", "new_ticket_sidebar"]
}
```

After:
```json
{
  "location": {
    "zendesk": {
      "ticket_sidebar":     "assets/iframe.html",
      "new_ticket_sidebar": "assets/iframe.html",
    }
  }
}
```

#### Now what?
If you're incredibly lucky your app may just work after following these steps. However, more likely you will need to update your code to use the new ZAF SDK v2 APIs. See [ZAF SDK v2](./zaf_v2#getting-started) for some examples on how the new APIs work. Additionally, you may need to rewrite some functionality, which may be missing from the Iframe App Template or simply not present in ZAF v2. In any case, this guide should give you a good starting point to get your app ready for the future. If you get stuck please don't hesitate to ask for help. You can reach us at support@zendesk.com.
