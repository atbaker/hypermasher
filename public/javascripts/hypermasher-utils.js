// Utils for Hypermasher

// Prototype for making metadata "ago" statements more readable
Number.prototype.toReadableInterval = function () {
    var days    = Math.floor(this / 86400);
    var hours   = Math.floor((this - (days * 86400)) / 3600);
    var minutes = Math.floor((this - (days * 86400) - (hours * 3600)) / 60);

    var interval = '';

    if (days === 1)
        interval = interval + days + " day ";
    else if (days > 0)
        interval = interval + days + " days ";

    if (hours === 1)
        interval = interval + hours + " hour ";
    else if (hours > 0)
        interval = interval + hours + " hours ";

    if (minutes === 1)
        interval = interval + minutes + " minute ";
    else if (minutes > 0)
        interval = interval + minutes + " minutes ";

    if (interval === '')
        return 'Less than a minute ago';
    else
        return interval + 'ago';
};

// Helper function for shuffling videos when we have to fill time with some old ones
function shuffle(array) {
  var currentIndex = array.length, temporaryValue, randomIndex;

  while (0 !== currentIndex) {

    randomIndex = Math.floor(Math.random() * currentIndex);
    currentIndex -= 1;

    temporaryValue = array[currentIndex];
    array[currentIndex] = array[randomIndex];
    array[randomIndex] = temporaryValue;
  }

  return array;
}

// Helper function for extracting querystring parameters 
function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
}
