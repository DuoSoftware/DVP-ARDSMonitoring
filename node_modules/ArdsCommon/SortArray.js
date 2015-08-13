var sortstring = function (a, b) {
    a = a.toLowerCase();
    b = b.toLowerCase();
    if (a < b) return -1;
    if (a > b) return 1;
    return 0;
}

var sortData = function (array) {
    return array.sort(sortstring);
};

module.exports.sortData = sortData;