const _ = require ('lodash');

module.exports = function(context, pattern, options) {
  if (context && _.isFunction(context.match)) {
    var match = context.match(new RegExp(pattern));
    return match ? options.fn(match.groups ? match.groups : { }) : null;
  }
}