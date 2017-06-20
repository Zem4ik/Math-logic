'use strict';
/**
 * Created by Vlad on 13.06.2017.
 */

const inputFile = process.argv[2];
const outputFile = process.argv[3];
const mode = process.argv[4];

if (inputFile === undefined || outputFile === undefined || mode === undefined) {
    throw new Error("Not enough arguments");
}


const VARIABLE_SIGN = "variable";
const PREDICATE_SIGN = "predicate";
const MULTIPLY_SIGN = "multiply";
const CONST_SIGN = "const";


const fs = require('fs');

function println(string) {
    console.log(string);
}

function replace(string, map) {
    let result = "";
    for (let i = 0; i < string.length; ++i) {
        if (map[string[i]] !== undefined) {
            result += map[string[i]];
        } else {
            result += string[i];
        }
    }
    return result;
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
                        this.string += ",";
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

class Parser {
    parse(expression) {
        this.expression = expression.replace(/\s+/g, "");
        this.position = 0;
        return this.parseExpression();
    }

    parseBinary(sign, firstFunction, secondFunction) {
        if (this.position >= this.expression.length) {
            throw new Error(`Error while parsing '${sign}': ${this.expression}`);
        }
        let result = firstFunction.call(this);
        while (this.expression.startsWith(sign, this.position)) {
            this.position += sign.length;
            result = new Vertex(sign, null, result, secondFunction.call(this), null);
        }
        return result;
    }

    parseExpression() {
        return this.parseBinary("->", this.parseDisjunction, this.parseExpression);
    }

    parseDisjunction() {
        return this.parseBinary("|", this.parseConjunction, this.parseConjunction);
    }

    parseConjunction() {
        return this.parseBinary("&", this.parseUnary, this.parseUnary);
    }

    parseUnary() {
        if (this.expression.startsWith("!", this.position)) {
            this.position++;
            return new Vertex("!", null, this.parseUnary(), null, null);
        } else if (this.expression.startsWith("(", this.position)) {
            let i = this.position + 1;
            let balance = 1;
            for (; balance !== 0 && i < this.expression.length; ++i) {
                if (this.expression[i] === "(") balance++;
                if (this.expression[i] === ")") balance--;
            }
            if (i < this.expression.length && /^[=+*'’]/.test(this.expression[i])) {
                return this.parsePredicate();
            }

            this.position++;
            let result = this.parseExpression();
            if (this.expression.startsWith(")", this.position)) {
                this.position++;
                return result;
            } else {
                throw new Error(`Parentheses not closed: ${this.expression}`);
            }
        } else if (/^[@?]/.test(this.expression[this.position])) {
            let sign = this.expression[this.position++];
            let variable = this.parseVariable();
            return new Vertex(sign, variable.variable, this.parseUnary(), null, null);
        } else {
            return this.parsePredicate();
        }
    }

    parseVariable() {
        let variable = this.expression[this.position];
        if (/^[a-z]/.test(this.expression[this.position])) {
            ++this.position;
            while (/^[0-9]/.test(this.expression[this.position])) {
                variable += this.expression[this.position++];
            }
        } else {
            throw new Error(`Error while parsing variable: ${this.expression}`);
        }
        return new Vertex(VARIABLE_SIGN, variable, null, null, null);
    }

    parsePredicate() {
        let variable = this.expression[this.position];
        if (/^[A-Z]/.test(this.expression[this.position])) {
            this.position++;
            while (/^[0-9]/.test(this.expression[this.position])) {
                variable += this.expression[this.position++];
            }
            if (this.expression[this.position] === "(") {
                this.position++;
                let terms = [this.parseAdd()];
                while (this.expression[this.position] === ",") {
                    this.position++;
                    terms.push(this.parseAdd());
                }
                if (this.expression[this.position] === ")") {
                    this.position++;
                    return new Vertex(PREDICATE_SIGN, variable, null, null, terms);
                } else {
                    throw   new Error(`Parentheses not closed: ${this.expression}`);
                }
            } else {
                return new Vertex(VARIABLE_SIGN, variable, null, null, null);
            }
        } else {
            let first = this.parseAdd();
            if (this.expression[this.position] !== "=") throw new Error(`Equals sign expected: ${this.expression}`);
            this.position++;
            return new Vertex("=", null, first, this.parseAdd(), null);
        }
    }

    parseAdd() {
        return this.parseBinary("+", this.parseMultiply, this.parseMultiply);
    }

    parseMultiply() {
        return this.parseBinary("*", this.parseInc, this.parseInc);
    }

    parseInc() {
        let term = this.parseTerm();
        let counter = 0;
        while (/^[’']/.test(this.expression[this.position])) {
            this.position++;
            term = new Vertex("'", null, term, null, null);
        }
        return term;
    }

    parseTerm() {
        let variable = this.expression[this.position];
        if (/^[a-z]/.test(this.expression[this.position])) {
            this.position++;
            while (/^[0-9]/.test(this.expression[this.position])) {
                variable += this.expression[this.position++];
            }
            if (this.expression[this.position] === "(") {
                this.position++;
                let terms = [this.parseAdd()];
                while (this.expression[this.position] === ",") {
                    this.position++;
                    terms.push(this.parseAdd());
                }
                if (this.expression[this.position] === ")") {
                    this.position++;
                    return new Vertex(MULTIPLY_SIGN, variable, null, null, terms);
                } else {
                    throw new Error(`Parentheses not closed: ${this.expression}`);
                }
            } else {
                return new Vertex(VARIABLE_SIGN, variable, null, null, null);
            }
        } else if (this.expression[this.position] === "(") {
            this.position++;
            let expression = this.parseAdd();
            if (this.expression[this.position] === ")") {
                this.position++;
                return expression;
            } else {
                throw new Error(`Parentheses not closed: ${this.expression}`);
            }
        } else if (this.expression[this.position] === "0") {
            this.position++;
            return new Vertex(CONST_SIGN, "0", null, null, null);
        } else {
            throw new Error(`Can't parse: ${this.expression}`);
        }
    }
}

class Checker {

    constructor(inputStrings, hypothesisStrings) {
        let parser = new Parser();
        this.inputStrings = inputStrings;
        this.hypothesisStrings = hypothesisStrings;
        this.trees = inputStrings.map(x => parser.parse(x));
        this.hypothesisTrees = hypothesisStrings.map(x => parser.parse(x));
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
        ].map(x => parser.parse(x));
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
        ].map(x => parser.parse(x));
    }

    checkAll(checkDeduction = false) {
        let result = "";
        for (let i = 0; i < this.trees.length; ++i) {
            //result += `(${i + 1}) ${this.inputStrings[i]} `;
            result += this.trees[i].string;
            let temp;
            try {
                temp = this.checkExpression(i, checkDeduction);
            } catch (error) {
                this.errors.push(`(${i + 1}) ${error.message}`);
                temp = error.message;
            }
            //result += `(${temp})\n`;
            result += '\n';
        }
        return result;
    }

    deduce() {
        let result = "";
        for (let i = 0; i < this.hypothesisTrees.length - 1; ++i) {
            result += `${this.hypothesisTrees[i].string}`;
            if (i !== this.hypothesisTrees.length - 2) {
                result += ",";
            }
        }
        result += `|-${this.hypothesisTrees[this.hypothesisTrees.length - 1].string}->${this.trees[this.trees.length - 1].string}\n`;
        let alpha = this.hypothesisTrees[this.hypothesisTrees.length - 1].string;
        for (let i = 0; i < this.trees.length; ++i) {
            let temp;
            try {
                temp = this.checkExpression(i);
            } catch (error) {
                this.errors.push(`(${i + 1}) ${error.message}`);
                temp = error.message;
            }
            if (alpha === this.trees[i].string) {
                result += replace(this.selfDeduction, {"H": alpha});
            } else if (temp.startsWith("Сх. акс.") || temp.startsWith("Предп.")) {
                result += replace(this.axiomDeduction, {"A": this.trees[i].string, "H": alpha});
            } else if (temp.startsWith("Modus Ponens ")) {
                temp = temp.split(/[\s,]/);
                let dj = this.trees[temp[2] - 1].string;
                let di = this.trees[i].string;
                result += replace(this.modusPonensDeduction, {"A": dj, "H": alpha, "B": di});
            } else if (temp.startsWith("Правило вывода для квантора всеобщности")) {
                result += replace(this.anyDeduction, {
                    "A": this.trees[i].left.string,
                    "H": alpha,
                    "B": this.trees[i].right.left.string,
                    "x": this.trees[i].right.variable
                });
            } else if (temp.startsWith("Правило вывода для квантора существования")) {
                result += replace(this.existsDeduction, {
                    "A": this.trees[i].left.left.string,
                    "H": alpha,
                    "B": this.trees[i].right.string,
                    "x": this.trees[i].left.variable
                });
            }
            result += "\n";
        }
        return result;
    }

    checkExpression(k, checkDeduction = false) {
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

        let error;
        try {
            if (this.checkAxiom_11(k)) return `Сх. акс. 11`;
        } catch (e) {
            error = e;
        }

        try {
            if (this.checkAxiom_12(k)) return `Сх. акс. 12`;
        } catch (e) {
            error = e;
        }

        try {
            if (this.checkAxiom_A9(k)) return `Сх. акс. A9`;
        } catch (e) {
            error = e;
        }


        if (this.hypothesisExpressionsMap[this.trees[k].string] !== undefined) return `Предп. ${this.hypothesisExpressionsMap[this.trees[k].string] + 1}`;

        let boundedVariables = this.findBoundVariables(this.trees[k]);
        for (let variable in boundedVariables) {
            if (this.bannedVariablesMap[variable] && checkDeduction) throw new Error(`используется правило с кванторов по переменной ${variable},
             входящей свободно в допущение ${this.hypothesisStrings[this.hypothesisTrees.length - 1]}`);
        }

        try {
            temp = this.universalQuantifierRule(k);
            if (temp !== false) return `Правило вывода для квантора всеобщности ${temp + 1}`;
        } catch (e) {
            error = e;
        }

        try {
            temp = this.existentialQuantifierRule(k);
            if (temp !== false) return `Правило вывода для квантора существования ${temp + 1}`;
        } catch (e) {
            error = e;
        }

        if (error !== undefined) throw error;
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

    universalQuantifierRule(k, checkDeduction = false) {
        if (this.trees[k].sign !== "->" || this.trees[k].right.sign !== "@") return false;
        let ancestor = "(" + this.trees[k].left.string + "->" + this.trees[k].right.left.string + ")";
        let leftFreeVariables = this.findFreeVariables(this.trees[k].left);
        let variable = this.trees[k].right.variable;
        if (leftFreeVariables[variable] !== undefined)
            throw new Error(`Переменная ${variable} входит свободно в формулу ${this.trees[k].left.string}`);
        if (this.globalExpressionsMap[ancestor] === undefined || this.globalExpressionsMap[ancestor] > k) {
            return false;
        } else {
            return this.globalExpressionsMap[ancestor];
        }
    }

    existentialQuantifierRule(k, checkDeduction = false) {
        if (this.trees[k].sign !== "->" || this.trees[k].left.sign !== "?") return false;
        let ancestor = "(" + this.trees[k].left.left.string + "->" + this.trees[k].right.string + ")";
        let rightFreeVariables = this.findFreeVariables(this.trees[k].right);
        let variable = this.trees[k].left.variable;
        if (rightFreeVariables[variable] !== undefined)
            throw new Error(`Переменная ${variable} входит свободно в формулу ${this.trees[k].right.string}`);
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
        if (freeVariables[variable] === undefined)
            throw new Error(`переменная ${variable} не входит свободно в формулу ${expression.string}`);
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
        for (let x in variables) {
            if (!freeVariables[x[0]]) boundVariables[x[0]] = true;
        }
        // Object.entries(variables).forEach(x => {
        //     if (!freeVariables[x[0]]) boundVariables[x[0]] = true;
        //     return x
        // });

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

function parseInputFile(strings) {
    strings = strings.split("\n").map(x => x.replace(/\s+/g, ""));
    let hypothesisStrings = [];
    let firstString;
    let finalExpression;

    if (strings[0].includes("|-")) {
        firstString = strings.shift();
        let headlineStrings = split(firstString);

        //checking if there are noo hypothesises or last string is empty
        if (headlineStrings[0] === "") headlineStrings.shift();
        if (strings[strings.length - 1] === "") delete strings.pop();

        for (let i = 0; i < (headlineStrings.length - 1); ++i) {
            hypothesisStrings.push(headlineStrings[i]);
        }
        finalExpression = headlineStrings[headlineStrings.length - 1];
    } else {
        throw new Error("Can't parse first string");
    }
    return [hypothesisStrings, firstString, strings, finalExpression]
}

function check(strings, mode = "check", checkDeduction = false) {
    let parser = new Parser();
    let hypothesisStrings, firstString, finalExpression;

    [hypothesisStrings, firstString, strings, finalExpression] = parseInputFile(strings);

    let finalTree = parser.parse(finalExpression);
    console.time("Parsing");
    let checker = new Checker(strings, hypothesisStrings);
    console.timeEnd("Parsing");
    let result;

    console.time("проверка");
    result = firstString + "\n" + checker.checkAll();
    console.timeEnd("проверка");

    if (finalTree.string !== checker.trees[checker.trees.length - 1].string) {
        checker.errors.push("Доказано не то, что требовалось")
    }

    println(`   Количество ошибок: ${checker.errors.length}`);
    checker.errors.forEach(x => println(x));

    return [result, checker];
}


function start() {
    let strings = fs.readFileSync(inputFile, 'utf8');
    if (mode === "check") {
        let result;
        [result, ] = check(strings);
        fs.writeFileSync(outputFile, result);
    } else if (mode === "deduction") {
        let checker;
        [ , checker] = check(strings);

        if (checker.errors.length !== 0) {
            println(`   Во входном файле присутствуют ошибки!`);
        } else {
            println("Ошибок нет");

            checker.anyDeduction = fs.readFileSync("any.proof", 'utf8');
            checker.existsDeduction = fs.readFileSync("exists.proof", 'utf8');
            checker.selfDeduction = fs.readFileSync("self.proof", 'utf8');
            checker.modusPonensDeduction = fs.readFileSync("modusponens.proof", 'utf8');
            checker.axiomDeduction = fs.readFileSync("axiom.proof", 'utf8');

            console.time("Дедуция");
            let result;
            result = checker.deduce();
            console.timeEnd("Дедуция");

            // let hypothesisStrings, firstString, finalExpression, deduction_strings;
            // [hypothesisStrings, firstString, deduction_strings, finalExpression] = parseInputFile(result);
            // checker = new Checker(deduction_strings, hypothesisStrings);
            //
            // console.time("проверка после дедукции");
            // checker.checkAll();
            // console.timeEnd("проверка после дедукции");
            //
            // println(`   Количество ошибок: ${checker.errors.length}`);
            // checker.errors.forEach(x => println(x));
            fs.writeFileSync(outputFile, result);
        }
    } else {
        throw new Error("invalid mode");
    }
}

console.time("Время работы");
start();
console.timeEnd("Время работы");

