
const browserify = require('browserify');
const path = require('path');
const fs = require('fs');
const _ = require('lodash');
const bundleOutputPath = path.resolve(__dirname, '../public/js/build/bundle.js');
const componentOutputPath = path.resolve(__dirname, '../public/js/build/bundle-components.js');

module.exports = (componentsPath, bundlePath) => {

  // BUILD STEP
  var browserifyComponents = browserify();

  var components = _.filter(fs.readdirSync(componentsPath), f => {
    return _.endsWith(f, '.js');
  });

  _.each(components, c => {
    var moduleName = _.trimEnd(c, '.js');
    //  console.log(c, moduleName);
    browserifyComponents.require(
      path.join(componentsPath, c),
      { expose: moduleName }
    );
  })

  browserifyComponents.bundle().pipe(
    fs.createWriteStream(componentOutputPath)
  );

  var browserifyBundle = browserify(
    {
      standalone: 'PS'
    });

  browserifyBundle.add(bundlePath);

  browserifyBundle.bundle().pipe(
    fs.createWriteStream(bundleOutputPath)
  );

  console.log(`wrote to ${bundleOutputPath} and ${componentOutputPath}`)

}