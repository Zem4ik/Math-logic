'use strict';
/**
 * Created by Vlad on 12.06.2017.
 */

let fs = require('fs');

let firstString = "|-(a+0')*(a+0')=(a*a)+(0''*a)+0'";
let lastStrings = [];

lastStrings.push("@a((a+0')*(a+0')=(a*a)+(0''*a)+0')->");
lastStrings.push("((a+0')*(a+0')=(a*a)+(0''*a)+0')");
lastStrings.push("((a+0')*(a+0')=(a*a)+(0''*a)+0')");

let count = fs.readFileSync('input.txt', 'utf8');
let formattedNumber = "0";
for (let i = 0; i < count; ++i) {
    formattedNumber += '\'';
}

let proof = firstString.replace(/a/g, formattedNumber) + '\n';
proof += count + '\n';
proof += lastStrings[0] ;
proof += lastStrings[1].replace(/a/g, formattedNumber) + '\n';
proof += lastStrings[2].replace(/a/g, formattedNumber);

fs.writeFileSync("result.txt", proof);