const { parseFont, parseFontFamily } = require('css-font-parser');

console.log(parseFont('15px sans-serif'));
console.log(parseFont("Inter Variable 11"));