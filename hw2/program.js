'use strict';
/**
 * Created by Vlad on 13.06.2017.
 */

const VARIABLE_SIGN = "variable";
const PREDICATE_SIGN = "predicate";
const MULTIPLY_SIGN = "multiply";
const CONST_SIGN = "const";

const inputFile = "correct15.in";
const outputFile = "output.txt";

const fs = require('fs');

function println(string) {
    console.log(string);
}

function split(inputString) {
    let answerArray = [];
    for (let i = 0, lastBorder = 0, counter = 0; i < inputString.length; ++i) {
        switch (inputString[i]) {
            case "(": {
                ++counter;
                break;
            }
            case ")": {
                --counter;
                break;
            }
            case ",": {
                if (counter !== 0) break;
                answerArray.push(inputString.substring(lastBorder, i));
                lastBorder = i + 1;
                break;
            }
            case "|": {
                if (counter !== 0 || inputString.substring(i, i + 2) !== "|-") break;
                answerArray.push(inputString.substring(lastBorder, i));
                lastBorder = i + 2;
                break;
            }
        }
        if (i === inputString.length - 1) {
            answerArray.push(inputString.substring(lastBorder, inputString.length));
        }
    }
    return answerArray;
}

class Vertex {
    constructor(sign, variable, left, right, terms) {
        this.sign = sign;
        this.variable = variable;
        this.left = left;
        this.right = right;
        this.terms = terms;
        switch (sign) {
            case "->":
            case "|":
            case "&":
            case "=":
            case "+":
            case "*":
                this.string = Vertex.putInBrackets(left.string + sign + right.string);
                break;
            case "!":
                this.string = Vertex.putInBrackets(sign + left.string);
                break;
            case "@":
            case "?":
                this.string = Vertex.putInBrackets(sign + variable + left.string);
                break;
            case MULTIPLY_SIGN:
            case PREDICATE_SIGN: {
                this.string = variable;
                if (terms !== null) {
                    this.string += "(" + terms[0].string;
                    for (let i = 1; i < terms.length; ++i) {
                        this.string += terms[i].string;
                    }
                    this.string += ")";
                }
                this.string = Vertex.putInBrackets(this.string);
                break;
            }
            case CONST_SIGN:
            case VARIABLE_SIGN:
                this.string = variable;
                break;
            case "'":
                this.string = left.string + "'";
        }
    }

    static putInBrackets(inputString) {
        return "(" + inputString + ")";
    }
}

class ConstructionParser {

    static parseBinary(inputString, sign, parseFunction0, parseFunction1, parseFunction2, leftOrder) {
        let counter = 0;
        if (leftOrder) {
            const symbol = sign[0];
            for (let i = 0; i < inputString.length; ++i) {
                if (i === inputString.length - 1) {
                    return parseFunction0(inputString);
                }
                switch (inputString[i]) {
                    case '(': {
                        ++counter;
                        break;
                    }
                    case ')': {
                        --counter;
                        break;
                    }
                    case symbol: {
                        if (inputString.substr(i, i + sign.length)) {
                            if (counter !== 0) break;
                            return new Vertex(sign, null, parseFunction1(inputString.substring(0, i)), parseFunction2(inputString.substr(i + sign.length, inputString.length)), null);
                        }
                    }
                }
            }
        } else {
            const symbol = sign[sign.length - 1];
            for (let i = inputString.length - 1; i >= 0; --i) {
                if (i === 0) {
                    return parseFunction0(inputString);
                }
                switch (inputString[i]) {
                    case ')': {
                        ++counter;
                        break;
                    }
                    case '(': {
                        --counter;
                        break;
                    }
                    case symbol: {
                        if (inputString.substr(i - sign.length + 1, i + 1)) {
                            if (counter !== 0) break;
                            return new Vertex(sign, null, parseFunction1(inputString.substring(0, i - sign.length + 1)), parseFunction2(inputString.substr(i + 1, inputString.length)), null);
                        }
                    }
                }
            }
        }
    }

    static parseConjunction(inputString) {
        return ConstructionParser.parseBinary(inputString, "&", ConstructionParser.parseUnary, ConstructionParser.parseConjunction, ConstructionParser.parseUnary, false);
    }

    static parseDisjunction(inputString) {
        return ConstructionParser.parseBinary(inputString, "|", ConstructionParser.parseConjunction, ConstructionParser.parseDisjunction, ConstructionParser.parseConjunction, false);
    }

    static parseExpression(inputString) {
        return ConstructionParser.parseBinary(inputString, "->", ConstructionParser.parseDisjunction, ConstructionParser.parseDisjunction, ConstructionParser.parseExpression, true);
    }

    static parseUnary(inputString) {
        try {
            return ConstructionParser.parsePredicate(inputString);
        } catch (error) {
        }
        switch (inputString[0]) {
            case '!': {
                return new Vertex("!", null, ConstructionParser.parseUnary(inputString.substring(1, inputString.length)), null, null);
            }
            case '(': {
                return ConstructionParser.parseExpression(inputString.substring(1, inputString.length - 1));
            }
            case '@':
            case '?': {
                let variable;
                let i;
                if (/^[a-z]/.test(inputString.substring(1, inputString.length))) {
                    for (i = 2; /^[0-9]/.test(inputString.substring(i, inputString.length)); ++i) {
                    }
                    variable = inputString.substring(1, i);
                }
                return new Vertex(inputString[0], variable, ConstructionParser.parseUnary(inputString.substring(i, inputString.length)), null, null);
            }
        }
    }

    static parseVariable(inputString) {
        if (/^[a-z]/.test(inputString)) {
            let i;
            for (i = 1; i < inputString.length && /[0-9]/.test(inputString[i]); ++i) {
            }
            if (i === inputString.length) {
                return new Vertex(VARIABLE_SIGN, inputString, null, null, null);
            }
        }
        throw new Error("[parseVariable] can't parse: " + inputString);
    }

    static parsePredicate(inputString) {
        if (/^[A-Z]/.test(inputString.substring(0, inputString.length))) {
            let i;
            for (i = 1; i < inputString.length && /[0-9]/.test(inputString[i]); ++i) {
            }
            if (i === inputString.length) {
                return new Vertex(PREDICATE_SIGN, inputString, null, null, null);
            }
            let variable = inputString.substring(0, i);
            if (inputString[i] === "(" && inputString[inputString.length - 1] === ")") {
                let terms = split(inputString.substring(i + 1, inputString.length - 1));
                terms = terms.map(ConstructionParser.parseTerm);
                return new Vertex(PREDICATE_SIGN, variable, null, null, terms);
            }
        }
        return ConstructionParser.parseBinary(inputString, "=", null, ConstructionParser.parseTerm, ConstructionParser.parseTerm, true)
    }

    static parseTerm(inputString) {
        return ConstructionParser.parseBinary(inputString, "+", ConstructionParser.parseAdd, ConstructionParser.parseTerm, ConstructionParser.parseAdd, false);
    }

    static parseAdd(inputString) {
        return ConstructionParser.parseBinary(inputString, "*", ConstructionParser.parseMultiply, ConstructionParser.parseAdd, ConstructionParser.parseMultiply, false);
    }

    static parseMultiply(inputString) {
        if (/^[a-z]/.test(inputString.substring(0, inputString.length))) {
            let i;
            for (i = 1; i < inputString.length && /[0-9]/.test(inputString[i]); ++i) {
            }
            if (i === inputString.length) {
                return new Vertex(VARIABLE_SIGN, inputString, null, null, null);
            }
            let variable = inputString.substring(0, i);
            if (inputString[i] === "(" && inputString[inputString.length - 1] === ")") {
                let terms = inputString.substring(i + 1, inputString.length - 1).split(',');
                terms = terms.map(ConstructionParser.parseTerm);
                return new Vertex(MULTIPLY_SIGN, variable, null, null, terms);
            }
        }
        if (inputString[0] === "(" && inputString[inputString.length - 1] === ")") {
            return ConstructionParser.parseTerm(inputString.substring(1, inputString.length - 1));
        }
        if (inputString[inputString.length - 1] === "'") {
            return new Vertex("'", null, ConstructionParser.parseMultiply(inputString.substring(0, inputString.length - 1)), null, null);
        }
        if (inputString === "0") {
            return new Vertex(CONST_SIGN, "0", null, null, null);
        }
        return ConstructionParser.parseVariable(inputString);
    }

}

class Checker {

    constructor(inputStrings, hypothesisStrings) {
        this.inputStrings = inputStrings;
        this.hypothesisStrings = hypothesisStrings;
        this.trees = inputStrings.map(ConstructionParser.parseExpression);
        this.hypothesisTrees = hypothesisStrings.map(ConstructionParser.parseExpression);
        this.globalExpressionsMap = {};
        this.hypothesisExpressionsMap = {};
        this.rightExpressionsMap = {};
        this.bannedVariablesMap = this.hypothesisTrees.length > 0 ? this.findFreeVariables(this.hypothesisTrees[this.hypothesisTrees.length - 1]) : {};

        this.trees.forEach((x, i) => {
            if (this.globalExpressionsMap[x.string] === undefined) {
                this.globalExpressionsMap[x.string] = i;
            }
            this.globalExpressionsMap[x.string] = this.globalExpressionsMap[x.string] < i ? this.globalExpressionsMap[x.string] : i;
            if (x.sign === "->") {
                if (this.rightExpressionsMap[x.right.string] === undefined) {
                    this.rightExpressionsMap[x.right.string] = [];
                }
                this.rightExpressionsMap[x.right.string].push(i);
            }
        });
        this.hypothesisTrees.forEach((x, i) => this.hypothesisExpressionsMap[x.string] = i);
        this.errors = [];
        this.axioms = [
            //basis axioms
            "A->B->A",                    // 1
            "(A->B)->(A->B->C)->(A->C)",  // 2
            "A->B->A&B",                  // 3
            "A&B->A",                     // 4
            "A&B->B",                     // 5
            "A->A|B",                     // 6
            "B->A|B",                     // 7
            "(A->C)->(B->C)->(A|B->C)",   // 8
            "(A->B)->(A->!B)->!A",        // 9
            "!!A->A"                      // 10
        ].map(ConstructionParser.parseExpression);
        //formal system axioms
        this.mathAxioms = [
            "a=b->a'=b'",                 // 1
            "(a=b)->(a=c)->(b=c)",        // 2
            "a'=b'->a=b",                 // 3
            "!a'=0",                      // 4
            "a+b'=(a+b)'",                // 5
            "a+0=a",                      // 6
            "a*0=0",                      // 7
            "a*b'=a*b+a"                  // 8
        ].map(ConstructionParser.parseExpression);
    }

    checkAll() {
        let result = "";
        for (let i = 0; i < this.trees.length; ++i) {
            result += `(${i + 1}) ${this.inputStrings[i]} `;
            let temp;
            try {
                temp = this.checkExpression(i);
            } catch (error) {
                this.errors.push(`(${i + 1}) ${error.message}`);
                temp = error.message;
            }
            result += `(${temp})\n`;
        }
        return result;
    }

    checkExpression(k) {
        for (let i = 0; i < this.axioms.length; ++i) {
            let variables = {};
            if (this.compareTrees(this.trees[k], this.axioms[i], variables)) return `Сх. акс. ${i + 1}`
        }
        for (let i = 0; i < this.mathAxioms.length; ++i) {
            let variables = {};
            if (this.compareTrees(this.trees[k], this.mathAxioms[i], variables)) return `Сх. акс. A${i + 1}`
        }

        let temp = this.modusPonens(k);
        if (temp) return `Modus Ponens ${temp.i + 1}, ${temp.j + 1}`;
        if (this.checkAxiom_11(k)) return `Сх. акс. 11`;
        if (this.checkAxiom_12(k)) return `Сх. акс. 12`;
        if (this.checkAxiom_A9(k)) return `Сх. акс. A9`;
        if (this.hypothesisExpressionsMap[this.trees[k].string] !== undefined) return `Предп. ${this.hypothesisExpressionsMap[this.trees[k].string] + 1}`;

        let boundedVariables = this.findBoundVariables(this.trees[k]);
        for (let variable in boundedVariables) {
            if (this.bannedVariablesMap[variable]) throw new Error(`используется правило с кванторов по переменной ${variable},
             входящей свободно в допущение ${this.hypothesisStrings[this.hypothesisTrees.length - 1]}`);
        }

        temp = this.universalQuantifierRule(k);
        if (temp !== false) return `Правило вывода для квантора всеобщности ${temp + 1}`;
        temp = this.existentialQuantifierRule(k);
        if (temp !== false) return `Правило вывода для квантора существования ${temp + 1}`;
        throw new Error(`Не доказано`);
    }

    //three rules
    modusPonens(k) {
        for (let j in this.rightExpressionsMap[this.trees[k].string]) {
            let index = this.rightExpressionsMap[this.trees[k].string][j];
            if (parseInt(index) < parseInt(k)) {
                let leftTree = this.trees[index].left;
                if (this.globalExpressionsMap[leftTree.string] !== undefined && parseInt(this.globalExpressionsMap[leftTree.string]) < parseInt(k)) {
                    return {
                        i: parseInt(this.globalExpressionsMap[leftTree.string]),
                        j: parseInt(index)
                    }
                }
            }
        }
        return false;
    }

    universalQuantifierRule(k) {
        if (this.trees[k].sign !== "->" || this.trees[k].right.sign !== "@") return false;
        let ancestor = "(" + this.trees[k].left.string + "->" + this.trees[k].right.left.string + ")";
        let leftFreeVariables = this.findFreeVariables(this.trees[k].left);
        let variable = this.trees[k].right.variable;
        if(leftFreeVariables[variable] !== undefined) throw new Error(`Переменная ${variable} входит свободно в формулу ${this.trees[k].right.string}`);
        if (this.globalExpressionsMap[ancestor] === undefined || this.globalExpressionsMap[ancestor] > k) {
            return false;
        } else {
            return this.globalExpressionsMap[ancestor];
        }
    }

    existentialQuantifierRule(k) {
        if (this.trees[k].sign !== "->" || this.trees[k].left.sign !== "?") return false;
        let ancestor = "(" + this.trees[k].left.left.string + "->" + this.trees[k].right.string + ")";
        let rightFreeVariables = this.findFreeVariables(this.trees[k].right);
        let variable = this.trees[k].left.variable;
        if(rightFreeVariables[variable] !== undefined) throw new Error(`Переменная ${variable} входит свободно в формулу ${this.trees[k].left.string}`);
        if (this.globalExpressionsMap[ancestor] === undefined || this.globalExpressionsMap[ancestor] > k) {
            return false;
        } else {
            return this.globalExpressionsMap[ancestor];
        }
    }

    //checking axioms
    compareTrees(vertex, axiomVertex, variables) {
        if (axiomVertex.sign === PREDICATE_SIGN && axiomVertex.variable !== undefined || axiomVertex.sign === VARIABLE_SIGN) {
            if (variables[axiomVertex.variable] === undefined) variables[axiomVertex.variable] = vertex.string;
            return variables[axiomVertex.variable] === vertex.string;
        }
        if (axiomVertex.sign !== vertex.sign) return false;
        let left = true;
        let right = true;
        if (axiomVertex.left !== null) {
            left = this.compareTrees(vertex.left, axiomVertex.left, variables);
        }
        if (axiomVertex.right !== null) {
            right = this.compareTrees(vertex.right, axiomVertex.right, variables);
        }
        return left && right;
    }

    checkAxiom_11(k) {
        if (this.trees[k].sign !== "->" || this.trees[k].left.sign !== "@") return false;
        let left = this.trees[k].left.left;
        let right = this.trees[k].right;
        return this.checkSubstitution(left, right, this.trees[k].left.variable);
    }

    checkAxiom_12(k) {
        if (this.trees[k].sign !== "->" || this.trees[k].right.sign !== "?") return false;
        let left = this.trees[k].left;
        let right = this.trees[k].right.left;
        return this.checkSubstitution(right, left, this.trees[k].right.variable);
    }

    checkAxiom_A9(k) {
        if (this.trees[k].sign !== "->" || this.trees[k].left.sign !== "&" || this.trees[k].left.right.sign !== "@" || this.trees[k].left.right.left.sign !== "->") return false;
        let variable = this.trees[k].left.right.variable;
        let expression = this.trees[k].right;
        let freeVariables = this.findFreeVariables(expression);
        if (freeVariables[variable] === undefined) throw new Error(`переменная ${variable} входит свободно в формулу ${expression.string}`);
        return !(this.trees[k].left.left.string !== expression.string.replace(new RegExp(variable, 'g'), "0") &&
        this.trees[k].left.right.left.left.string !== expression.string &&
        this.trees[k].left.right.left.right.string !== expression.string.replace(new RegExp(variable, 'g'), variable + "'"));

    }

    //first tree - with x and second tree - with substitution
    checkSubstitution(firstTree, secondTree, variable) {
        let freeVariables = {};
        let quantifiers = {};
        let substitution;
        try {
            substitution = this.substitution(firstTree, secondTree, variable);
        } catch (error) {
            return false;
        }

        if (substitution === false) return true;
        if (substitution === null) return false;
        freeVariables = this.findFreeVariables(substitution);
        let flag = this.checkIfBecameBounded(firstTree, secondTree, variable, quantifiers, freeVariables);

        if (!flag)
            throw new Error(`терм ${substitution.string} не свободен для подстановки в формулу ${secondTree.string} вместо переменной ${variable}`);
        return flag;
    }

    substitution(vertex1, vertex2, variable) {
        if ((vertex1.sign === "@" || vertex1.sign === "?") && vertex1.variable === variable) {
            if (vertex1.string !== vertex2.string) {
                return null;
            } else {
                return false;
            }
        }
        if (vertex1.variable === variable && vertex1.sign === VARIABLE_SIGN) {
            return vertex2;
        }
        let left = false;
        let right = false;
        let terms = false;
        if (vertex1.left !== null) {
            left = this.substitution(vertex1.left, vertex2.left, variable);
        }
        if (vertex1.right !== null) {
            right = this.substitution(vertex1.right, vertex2.right, variable);
        }
        if (vertex1.terms !== null) {
            for (let i = 0; i < vertex1.terms.length; ++i) {
                let temp = this.substitution(vertex1.terms[i], vertex2.terms[i], variable);
                if (temp === null) return null;
                if (temp && terms) {
                    if (temp.string !== terms.string) {
                        return null;
                    }
                }
                terms = terms || temp;
            }
        }
        if (left === null || right === null) return null;
        if (left && right) {
            if (left.string !== right.string) {
                return null;
            }
        }
        return left || right || terms;
    }

    checkIfBecameBounded(vertex1, vertex2, variable, quantifiers, freeVariables) {
        if ((vertex1.sign === "@" || vertex1.sign === "?") && vertex1.variable === variable) {
            return true;
        }
        if (vertex1.variable === variable && vertex1.sign === VARIABLE_SIGN) {
            for (let i in freeVariables) {
                if (quantifiers[i] !== undefined && quantifiers[i] > 0)
                    return false;
            }
            return true;
        } else {
            let flag = true;
            quantifiers[vertex2.variable] = quantifiers[vertex2.variable] || 0;
            if (vertex2.sign === "@" || vertex2.sign === "?") {
                ++quantifiers[vertex2.variable];
            }
            if (vertex2.left !== null) {
                flag &= this.checkIfBecameBounded(vertex1.left, vertex2.left, variable, quantifiers, freeVariables);
            }
            if (vertex2.right !== null) {
                flag &= this.checkIfBecameBounded(vertex1.right, vertex2.right, variable, quantifiers, freeVariables);
            }
            if (vertex2.terms !== null) {
                for (let i = 0; i < vertex2.terms.length; ++i) {
                    flag &= this.checkIfBecameBounded(vertex1.terms[i], vertex2.terms[i], variable, quantifiers, freeVariables);
                }
            }
            if (vertex2.sign === "@" || vertex2.sign === "?") {
                --quantifiers[vertex2.variable];
            }
            return flag;
        }
    }

    findFreeVariables(tree) {
        let variables = {};
        let quantifiers = {};
        let freeVariables = {};

        this.checkForVariables(tree, variables, quantifiers, freeVariables);

        return freeVariables;

    }

    findBoundVariables(tree) {
        let variables = {};
        let quantifiers = {};
        let freeVariables = {};
        let boundVariables = {};

        this.checkForVariables(tree, variables, quantifiers, freeVariables);
        Object.entries(variables).forEach(x => {
            if (!freeVariables[x[0]]) boundVariables[x[0]] = true;
            return x
        });

        return boundVariables;
    }

    checkForVariables(vertex, variables, quantifiers, freeVariables) {
        quantifiers[vertex.variable] = quantifiers[vertex.variable] || 0;
        if (vertex.sign === "@" || vertex.sign === "?") {
            ++quantifiers[vertex.variable];
        }
        if (vertex.left !== null) {
            this.checkForVariables(vertex.left, variables, quantifiers, freeVariables);
        }
        if (vertex.right !== null) {
            this.checkForVariables(vertex.right, variables, quantifiers, freeVariables);
        }
        if (vertex.terms !== null) {
            for (let i = 0; i < vertex.terms.length; ++i) {
                this.checkForVariables(vertex.terms[i], variables, quantifiers, freeVariables);
            }
        }
        if (vertex.sign === VARIABLE_SIGN) {
            variables[vertex.variable] = true;
        }
        if (quantifiers[vertex.variable] === 0) {
            freeVariables[vertex.variable] = true;
        }
        if (vertex.sign === "@" || vertex.sign === "?") {
            --quantifiers[vertex.variable];
        }
    }

}

function start() {
    let strings = fs.readFileSync(inputFile, 'utf8').split("\n");
    strings = strings.map(x => x.replace(/\s+/g, ""));
    let hypothesisStrings = [];

    let firstString;
    let headlineStrings;
    let finalExpression;
    if (strings[0].includes("|-")) {
        firstString = strings.shift();
        headlineStrings = split(firstString);
        if (headlineStrings[0] === "") headlineStrings.shift();
        if(strings[strings.length - 1] === "") delete strings.pop();
        for (let i = 0; i < (headlineStrings.length - 1); ++i) {
            hypothesisStrings.push(headlineStrings[i]);
        }
        finalExpression = headlineStrings[headlineStrings.length - 1];
    } else {
        throw new Error("can't parse first string");
    }

    let finalTree = ConstructionParser.parseExpression(finalExpression);

    let checker = new Checker(strings, hypothesisStrings);
    let result = firstString + "\n" + checker.checkAll();

    if (finalTree.string !== checker.trees[checker.trees.length - 1].string) {
        checker.errors.push("Доказано не то, что требовалось")
    }
    fs.writeFileSync(outputFile, result);

    println(`   Количество ошибок: ${checker.errors.length}`);
    checker.errors.forEach(x => println(x));
}

console.time("Время работы");
start();
console.timeEnd("Время работы");