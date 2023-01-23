module.exports = function(params) {
    // Data: value is either null, 'like', or 'dislike'
    this.ticker = ko.observable(params.tickerInit);

    // Behaviors
    this.refresh = function() { console.log('refreshing'); }.bind(this);
    return this;
}
