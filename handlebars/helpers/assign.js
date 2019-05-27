
module.exports = function (varName, options) {
    const finalValue = options.fn(this);
    if (!options.data.root) {
        options.data.root = {};
    }
    options.data.root[varName] = finalValue.toString().trim();
}