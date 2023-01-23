
import * as Transaction from '../transaction.js'

var componentViewModels = {};
var names = 'ps-table ps-table-row search-result transaction'.split(' ');
_.each(names, (name) =>{
  console.log('register', name);
  ko.components.register(name, {
    viewModel: _.get(PS.componentViewModels,name),//{require:name},
    template: {fromUrl:`${name}.html`, maxCacheAge:4000}
  })
})

var templateFromUrlLoader = {
    loadTemplate: function(name, templateConfig, callback) {
        if (templateConfig.fromUrl) {
            // Uses jQuery's ajax facility to load the markup from a file
            var fullUrl = '/' + templateConfig.fromUrl + '?cacheAge=' + templateConfig.maxCacheAge;
            $.get(fullUrl, function(markupString) {
                // We need an array of DOM nodes, not a string.
                // We can use the default loader to convert to the
                // required format.
                ko.components.defaultLoader.loadTemplate(name, markupString, callback);
            });
        } else {
            // Unrecognized config format. Let another loader handle it.
            callback(null);
        }
    }
};

// Register it
ko.components.loaders.unshift(templateFromUrlLoader);
