function decode(s) {
  return decodeURIComponent((s || '').replace( /\+/g, " " ));
}

function queryParameters(queryString) {
  var result = {},
      keyValuePairs,
      keyAndValue,
      key,
      value;

  queryString = queryString ||
    ( document.location.search || '' ).slice(1);

  if (queryString.length === 0) { return result; }

  keyValuePairs = queryString.split('&');

  for (var i = 0; i < keyValuePairs.length; i++) {
    keyAndValue = keyValuePairs[i].split('=');
    key   = decode(keyAndValue[0]);
    value = decode(keyAndValue[1]) || '';
    result[key] = value;
  }

  return result;
}


module.exports = {
  queryParameters: queryParameters
};
