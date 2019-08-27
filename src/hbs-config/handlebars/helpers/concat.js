module.exports = function (...args) {
  let outStr = '';
  for (const i in args) {
    if(typeof args[i]!='object'){
      outStr += args[i];
    }
  }
  return outStr;
}