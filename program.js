/**
 * Created by Влад on 16.10.2016.
 */
function vertexConstruction(sign, left, right) {
    return {
        sign: sign,
        left: left,
        right: right
    }
}

function listConstruction(variable) {
    return {
        sign: undefined,
        variable: variable,
        string: variable
    }
}

function parserConstructor(sign, parseFunction) {
    return function func(inputString) {
        var counter = 0;
        var symbol = sign == '->' ? '-' : sign;
        for (var i = 0; i < inputString.length; ++i) {
            if (i == inputString.length - 1) {
                return parseFunction(inputString);
            }
            switch (inputString[i]) {
                case '(':
                    ++counter;
                    break;
                case ')':
                    --counter;
                    break;
                case symbol:
                    if (counter != 0) break;
                    var root = vertexConstruction(sign,
                        (sign != '->' ? func(inputString.substring(0, i)) : parseFunction(inputString.substring(0, i))),
                        (sign != '->' ? parseFunction(inputString.substring(i + 1, inputString.length)) : func(inputString.substring(i + 2, inputString.length))));
                    root.string = '(' + root.left.string + sign + root.right.string + ')';
                    return root;
            }
        }
    }
}


function parseNegation(inputString) {
    var root;
    switch (inputString[0]) {
        case '!':
            root = vertexConstruction('!', parseNegation(inputString.substring(1, inputString.length)), undefined);
            root.string = '!' + root.left.string;
            return root;
        case '(':
            root = parseExpression(inputString.substring(1, inputString.length - 1));
            return root;
        default:
            return listConstruction(inputString);
    }
}

var parseConjunction = parserConstructor('&', parseNegation);
var parseDisjunction = parserConstructor('|', parseConjunction);
var parseExpression = parserConstructor('->', parseDisjunction);

var axioms = {
    1: function (root) {
        if (root.sign === '->' && root.right.sign === '->') {
            return root.left.string === root.right.right.string;
        }
        return false;
    },
    2: function (root) {
        if (root.sign === '->' && root.left.sign === '->' && root.right.sign === '->' && root.right.left.sign === '->' && root.right.right.sign === '->' && root.right.left.right.sign === '->') {
            return (root.left.left.string === root.right.left.left.string) && (root.left.left.string === root.right.right.left.string) &&
                (root.left.right.string === root.right.left.right.left.string) && (root.right.left.right.right.string === root.right.right.right.string);
        }
        return false;
    },
    3: function (root) {
        if (root.sign === '->' && root.right.sign === '->' && root.right.right.sign === '&') {
            return (root.left.string === root.right.right.left.string) && (root.right.left.string === root.right.right.right.string);
        }
        return false;
    },
    4: function (root) {
        if (root.sign === '->' && root.left.sign === '&') {
            return (root.left.left.string === root.right.string);
        }
        return false;
    },
    5: function (root) {
        if (root.sign === '->' && root.left.sign === '&') {
            return (root.left.right.string === root.right.string);
        }
        return false;
    },
    6: function (root) {
        if (root.sign === '->' && root.right.sign === '|') {
            return (root.left.string === root.right.left.string);
        }
        return false;
    },
    7: function (root) {
        if (root.sign === '->' && root.right.sign === '|') {
            return (root.left.string === root.right.right.string);
        }
        return false;
    },
    8: function (root) {
        if (root.sign === '->' && root.left.sign === '->' && root.right.sign === '->' && root.right.left.sign === '->' && root.right.right.sign === '->' && root.right.right.left.sign === '|') {
            return (root.left.left.string === root.right.right.left.left.string) && (root.left.right.string === root.right.left.right.string)
                && (root.left.right.string === root.right.right.right.string) && (root.right.left.left.string === root.right.right.left.right.string);
        }
        return false;
    },
    9: function (root) {
        if (root.sign === '->' && root.left.sign === '->' && root.right.sign === '->' && root.right.left.sign === '->' && root.right.right.sign === '!' && root.right.left.right.sign === '!') {
            return (root.left.left.string === root.right.left.left.string) && (root.left.left.string === root.right.right.left.string)
                && (root.left.right.string === root.right.left.right.left.string);
        }
        return false;
    },
    10: function (root) {
        if (root.sign === '->' && root.left.sign === '!' && root.left.left.sign === '!') {
            return (root.right.string === root.left.left.left.string);
        }
        return false;
    }
};

function checkAxioms(root) {
    for (l in axioms) {
        if (axioms[l](root)) {
            return l;
        }
    }
    return -1;
}

var trees = [];
var allMap = {};
var rightMap = {};
var hypothesisMap = {};

var fs = require('fs');
var contents = fs.readFileSync('input.in', 'utf8');

var strings = contents.split('\n');
if (strings[0].includes('|-')) {
    var firstString = strings.shift();
    firstString = firstString.replace(/[\s\r]/g, '');
    var headlineStrings = firstString.split(/,|\|-/);
    for (var i = 0; i < (headlineStrings.length - 1); ++i) {
        var tree = parseExpression(headlineStrings[i]);
        hypothesisMap[tree.string] = i + 1;
    }
}
for (var i = 0; i < strings.length; ++i) {
    strings[i] = strings[i].replace(/[\s\r]/g, '');
    trees.push(parseExpression(strings[i]));
    if (allMap[trees[i].string] === undefined) {
        allMap[trees[i].string] = i;
    }
    if (trees[i].sign === '->') {
        if (rightMap[trees[i].right.string] !== undefined) {
            rightMap[trees[i].right.string].push(i);
        } else {
            var arr = [];
            arr.push(i);
            rightMap[trees[i].right.string] = arr;
        }
    }
}

function modusPonens(k) {
    for (j in rightMap[trees[k].string]) {
        var index = rightMap[trees[k].string][j];
        if (parseInt(index) < parseInt(k)) {
            var leftTree = trees[index].left;
            if (allMap[leftTree.string] !== undefined && parseInt(allMap[leftTree.string]) < parseInt(k)) {
                return {
                    i: parseInt(allMap[leftTree.string]) + 1,
                    j: parseInt(index) + 1
                }
            }
        }
    }
    return undefined;
}

var outString = '';
for (m in trees) {
    outString += '(' + (parseInt(m) + 1) + ')';
    outString += strings[m];
    var result = checkAxioms(trees[m]);
    if (result != -1) {
        outString += '(' + 'Сх. акс. ' + result + ')\n';
        continue;
    }
    result = hypothesisMap[trees[m].string];
    if (result !== undefined) {
        outString += '(' + 'Предп. ' + result + ')\n';
        continue;
    }
    result = modusPonens(m);
    if (result != undefined) {
        outString += '(' + 'M.P.' + result.i + ',' + result.j + ')\n';
        continue;
    }
    outString += '(Не Доказано)\n';
}

fs.writeFileSync('output.out', outString);
