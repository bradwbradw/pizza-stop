
if (!ko || !_ || !moment) {
  var ko = {};
  var _ = {};
  var moment = {};
  console.error("dependencies failed:", ko, _, moment);
}

ko.bindingHandlers.datepicker = {
  init: function(
    element,
    valueAccessor,
    allBindingsAccessor,
    viewModel,
    bindingContext
  ) {
    //initialize datepicker with some optional options
    var options = {
      format: "DD/MM/YYYY HH:mm",
      defaultDate: valueAccessor()()
    };

    if (allBindingsAccessor() !== undefined) {
      if (allBindingsAccessor().datepickerOptions !== undefined) {
        options.format =
          allBindingsAccessor().datepickerOptions.format !== undefined
            ? allBindingsAccessor().datepickerOptions.format
            : options.format;
      }
    }

    $(element).datetimepicker(options);
    var picker = $(element).data("datetimepicker");

    //when a user changes the date, update the view model
    ko.utils.registerEventHandler(element, "dp.change", function(event) {
      var value = valueAccessor();
      if (ko.isObservable(value)) {
        value(event.date);
      }
    });

    var defaultVal = $(element).val();
    var value = valueAccessor();
    value(moment(defaultVal, options.format));
  },
  update: function(element, valueAccessor) {
    var widget = $(element).data("datepicker");
    //when the view model is updated, update the widget
    if (widget) {
      widget.date = ko.utils.unwrapObservable(valueAccessor());
      if (widget.date) {
        widget.setValue();
      }
    }
  }
};


// use for primitives (or objects?)
ko.extenders.save = function(target, key) {
  target.subscribe(function(newValue) {
    console.log(key + ": " + newValue);
    localStorage.setItem(key, ko.toJSON(newValue));
  });
  if (_.isNumber(target)) {
    return target * 1;
  } else {
    return target;
  }
};

