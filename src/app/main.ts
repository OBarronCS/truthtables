import { CheckedResult, ErrorResult, IErrorResult, ValidResult } from "./result";

const editor = document.getElementById("editor") as HTMLTextAreaElement;

editor.style.backgroundColor = "#ffffcc"

// const ALPHABET_LOWERCASE = "abcdefghijklmnopqrstuvwxyz";

enum TokenType {
    VARIABLE,
    AND,
    OR,
    // XOR,
    NOT,
    CONDITIONAL,
    BICONDITIONAL,
    START_PAREN,
    END_PAREN,
    END_OF_FILE,
    NEW_LINE
}

class Token {

    constructor(public type: TokenType, public word: string){}

    toString(): string {
        if(this.word === "") return TokenType[this.type];
        return `${TokenType[this.type]}(${this.word})`;
    }
}


let lastText = "";

editor.addEventListener("keyup",e => {
    // Two steps: first turn into a format we can understand, then evaluate it

    const text = editor.value;
    
    // If nothing change, don't recompute
    if(text === lastText) return;

    lastText = text;
    
    console.log("********************");

    // console.log([...text].map(e => e.charCodeAt(0)))

    const scanner = new Scanner(text);

    const result = scanner.parseAllTokens();

    const t = document.getElementById("errors");


    switch(result.success){
        // Lexer has no errors
        case true: {
            // Array of lists of tokens
            const tokens = result.value;

            t.innerHTML = tokens.map(t => t.toString()).toString()

            

            const p = new TokenParser(tokens);


            let program_result = p.parse();

            if(program_result.success === false) {
                console.log("Token parsing error")
                console.log(program_result.error);
                break;
            }

            const program = program_result.value;
            

            console.log(program.trees);


            // Evaluate the expressions
            const truth_table = program.run_program();

            // Display the truth table
            const html_t = document.getElementById("truth") as HTMLTableElement;
            html_t.innerHTML = ""

            const thr = document.createElement('tr');
            for (let i = 0; i < truth_table.variables.length; i++) {
                // console.log("Var " + i)
                const header = document.createElement('th');
                header.style.border = "1px solid black"
                header.textContent = truth_table.variables[i];
                // header.appendChild(document.createTextNode()
                thr.appendChild(header);
            }

            html_t.appendChild(thr);

            for(const permutation of truth_table.truth_value){

                const thr = document.createElement('tr');
                
                for(const t of permutation){
                    const slot = document.createElement('td');
                    slot.style.borderLeft = "1px solid black"
                    slot.style.borderRight = "1px solid black"
                    slot.appendChild(document.createTextNode(t ? "T" : "F"));

                    thr.appendChild(slot);
                }

                html_t.appendChild(thr);
            }

            break;
        }
        case false: {
            t.innerHTML = "Lexer error: " + result.error.map(t => t + "\n").toString()
        }
    }




});


// Turns raw text into flat stream of tokens
class Scanner {
    
    public text: string;

    public current: number;
    public end: number;
    public line = 0;

    private hasError = false;
    private errors: string[] = [];
    private tokens: Token[] = [];

    public hasMore(){
        return this.current !== this.end;
    }

    constructor(text: string){
        this.text = text;
        this.current = 0;
        this.end = this.text.length;
    }
    
    newLine(){
        this.line++;
    }

    addToken(t: TokenType, name: string = ""){
        this.tokens.push(new Token(t,name));
    }

    addError(str: string){
        this.errors.push(str);
        this.hasError = true;
    }


    ifNextIs(char: string): boolean {
        if(!this.hasMore()) return false;

        if(this.peek() !== char){
            return false;
        }

        this.current++;

        return true;
    }

    peek(){
        return this.text[this.current];
    }

    advance(): string {
        return this.text[this.current++];
    }


    private suggestCorrection(input: string): string {
        if(input.toUpperCase() === "AND"){
            return "AND";
        }
        
        if(input.toUpperCase() === "OR"){
            return "OR"
        }

        if(input.toUpperCase() === "RO"){
            return "OR"
        }

        return "";
    }

   

    parseAllTokens(): CheckedResult<Token[],string[]> {

        while(this.hasMore()){

            const char = this.advance();

            switch(char){
                case " ": break;
                case "!": this.addToken(TokenType.NOT); break;
                case "(": this.addToken(TokenType.START_PAREN); break;
                case ")": this.addToken(TokenType.END_PAREN); break;
                case "-": {
                    if(this.ifNextIs(">")){
                        this.addToken(TokenType.CONDITIONAL);
                    } else {
                        this.addError("Expecting > after -")
                    }
                    break;
                }
                case "=": {
                    if(this.ifNextIs(">")){
                        this.addToken(TokenType.CONDITIONAL); 
                    } else {
                        this.addError("Expecting > after =")
                    }
                    break;
                }
                case "\r":{
                    // Ignore a carriage return. Should always be followed by a \n. 
                    break;
                }
                case "\n": {
                    this.addToken(TokenType.NEW_LINE);
                    this.newLine();
                    break;
                }
                case "<": {
                    if((this.text[this.current] === "-" || this.text[this.current] === "=") && this.text[this.current + 1] === ">"){
                        this.addToken(TokenType.BICONDITIONAL);
                        this.current += 2;
                    } else {
                        this.addError("Expecting -> or => after <")
                    }
                    break;
                }
                default: {

                    if(/[a-zA-Z]/.test(char)) {
                        let str = char;
                        
                        //Keep parsing will valid identifier
                        while(this.hasMore() && /[a-zA-Z]/.test(this.peek())) { 
                            str += this.peek();
                            this.advance();
                        }

                        // If its a propositional variable
                        if(str.length === 1 && /[a-z]/.test(str)){
                            this.addToken(TokenType.VARIABLE, char);
                            break;
                        } else {
                            if(str == "OR"){
                                this.addToken(TokenType.OR);
                            } else if (str === "AND") {
                                this.addToken(TokenType.AND);
                            } else {
                                const correction = this.suggestCorrection(str)

                                const err_str = correction === "" ? "Unknown identifier '" + str + "'" : "Unknown identifier '" + str + "'. Did you mean '" + correction + "'?"

                                this.addError(err_str);
                            }
                        } 

                    } else if(/[a-z]/.test(char)) {
                        // is valid variable name

                        // If thats it!
                        if(!this.hasMore() || (this.peek() === " " || this.peek() === ")" || this.peek() === "\n")){
                            
                        } else {
                            this.addError("Variables can only be one character long: " + char);
                        }

                    } else {
                        // console.error("Unknown token: " + value);
                        this.addError("Unknown token: " + char);
                    }
                }
            }
        }

        this.addToken(TokenType.END_OF_FILE);

        if(this.hasError) return ErrorResult(this.errors);

        return ValidResult(this.tokens);

    }

}


type ExprType = "variable" | "negation" | "comparison" | "group";

interface Expression {
    type: ExprType
}

interface VariableExpr extends Expression {
    type: "variable",
    name: string,
    uniqueID: number,
}

interface NegationExpr extends Expression {
    type: "negation",
    toNegate: ExpressionType
}

interface ComparisonExpr extends Expression {
    type: "comparison",
    comparison: Token;
    toCompare: ExpressionType[]
    // left: ExpressionType
    // right: ExpressionType
}

interface GroupExpr extends Expression {
    type: "group",
    expr: ExpressionType
}

type ExpressionType = VariableExpr | NegationExpr | ComparisonExpr | GroupExpr;


class ParseError extends Error {
    constructor(msg: string){
        super(msg);
    }
}

// Turns tokens into tree structure
class TokenParser {
    public current: number;
    public end: number;

    private hasError = false;
    private errors: ParseError[] = [];
    private tokens: Token[] = [];

    constructor(tokens: Token[]){
        this.tokens = tokens;
        this.current = 0;
        this.end = tokens.length;
    }

    hasMore(): boolean {
        return this.current !== this.end && this.peek().type !== TokenType.END_OF_FILE; //
    }

    peek(): Token {
        return this.tokens[this.current];
    }

    advance(): Token {
        return this.tokens[this.current++];
    }

    previous(){
        return this.tokens[this.current - 1];
    }

    ifNextIs(...t: TokenType[]): boolean {
        if(!this.hasMore()) return false;

        for(const _ of t){
            if(this.peek().type === _){
                this.current++;
                return true;
            }
        }

        return false;
    }

    addError(msg: string): ParseError {
        const err = new ParseError(msg);

        this.errors.push(err);

        this.hasError = true;

        return err;
    }

    


    private varIDS = new Map<string,number>();
    private nextVarID = 0;
    private idToString: string[] = [];

    makeVariableID(literal: string): number {
        const v = this.varIDS.get(literal);
        if(v === undefined) {
            const id = this.nextVarID++;
            this.varIDS.set(literal, id);
            this.idToString.push(literal);
            return id;
        }

        return v;
    }

    parse(): CheckedResult<ProgramInfo, string[]> {
        const propositions: ExpressionType[] = [];

        while(this.hasMore()){
            try {
                const expr = this.parseLogic();
                
                propositions.push(expr);

                while(this.ifNextIs(TokenType.NEW_LINE)){
                    // Consumes new lines
                }
        
                if(this.ifNextIs(TokenType.END_OF_FILE)){
                    break;
                }

            } catch {
                this.sync();
            }
        }

        if(!this.hasError){
            const p = new ProgramInfo(propositions,this.idToString);
            return ValidResult(p);
        } else {
            return ErrorResult(this.errors.map(e => e.message));
        }
    }

    private sync(){
        while(this.hasMore()){
            if(this.advance().type === TokenType.NEW_LINE){
                return;
            }
        }
    }
    
    /** Error handling
     *      Only LOG an error if not propagating it
     *     
     *  If you encounter an error, can either return an error or try to fix the stream by skipping forward
     *  
     * 
     *  Order of operations:
     *      !    AND    OR   ->   <-> 
     */

    private parseLogic(): ExpressionType {

        const left = this.parseBICONDITIONAL();
        return left;
    }

    
    parseBICONDITIONAL(): ExpressionType{
        let left = this.parseCONDITIONAL();

        const ands: ExpressionType[] = [left];

        while(this.ifNextIs(TokenType.BICONDITIONAL)){
            const operator = this.previous();
            const right = this.parseCONDITIONAL();

            ands.push(right)
       
            left = {
                type:"comparison",
                comparison:operator,
                toCompare: ands
                // left:left,
                // right:right,
            }
        }

        return left;
    }
   
    parseCONDITIONAL(): ExpressionType{
        let left = this.parseOR();

        const ands: ExpressionType[] = [left];

        while(this.ifNextIs(TokenType.CONDITIONAL)){
            const operator = this.previous();
            const right = this.parseOR();

            ands.push(right)
       
            left = {
                type:"comparison",
                comparison:operator,
                toCompare: ands
                // left:left,
                // right:right,
            }
        }

        return left;
    }

    parseOR(): ExpressionType{
        let left = this.parseAND();

        const ands: ExpressionType[] = [left];

        while(this.ifNextIs(TokenType.OR)){
            const operator = this.previous();
            const right = this.parseAND();

            ands.push(right)
       
            left = {
                type:"comparison",
                comparison:operator,
                toCompare: ands
                // left:left,
                // right:right,
            }
        }

        return left;
    }

    parseAND(): ExpressionType{

        let left = this.parseProp();

        const ands: ExpressionType[] = [left];

        while(this.ifNextIs(TokenType.AND)){
            const operator = this.previous();
            const right = this.parseProp();

            ands.push(right)
       
            left = {
                type:"comparison",
                comparison:operator,
                toCompare: ands
                // left:left,
                // right:right,
            }
        }

        return left;
    }

    private parseProp(): ExpressionType {

        if(this.ifNextIs(TokenType.NOT)){

            const toNegate = this.parseProp();

            return {
                type:"negation",
                toNegate:toNegate
            }
        }

        if (this.ifNextIs(TokenType.VARIABLE)) {
            return {
                type:"variable",
                name: this.previous().word,
                uniqueID: this.makeVariableID(this.previous().word)
            }
        }

        if(this.ifNextIs(TokenType.START_PAREN)){
            const expr_in_group = this.parseLogic();

            if(this.ifNextIs(TokenType.END_PAREN)){

                return {
                    type:"group",
                    expr: expr_in_group
                }
            }
        }

        // There is no token here, but we are expecting one
        // Peek so we don't consume it
        if(this.peek().type === TokenType.NEW_LINE){
            throw this.addError("Expecting token but reached end of line");
        }


        if(this.ifNextIs(TokenType.END_OF_FILE)){
            throw this.addError("Expecting token but reached end of file");
        }

    
        throw this.addError("Unexpected end of expression");
    }

    
}

class ProgramInfo {
    trees: ExpressionType[];
    
    // Index is id, element is current value
    variables: boolean[] = [];

    // Index is id, element is string repr
    private idToString: string[] = [];

    constructor(trees: ExpressionType[], idToString: string[]){
        this.trees = trees;

        this.idToString = idToString;
        
        console.log("Propositional variables: " + this.idToString.toString())

        this.variables = this.idToString.map(t => true);
    }
    
    private varValue(id: number){
        return this.variables[id];
    }


    // Returns the value of the proposition at this truth value
    private EvaluateProposition(expr: ExpressionType, subp_values: boolean[]): boolean {

        //subp_values is used to keep track of the truth values of all compound propositions


        switch(expr.type){
            case "group": {
                return this.EvaluateProposition(expr.expr, subp_values);
            }
            case "comparison": {    
                let result: boolean;
                
                outer:
                switch(expr.comparison.type){
                    case TokenType.AND: {

                        const evals: boolean[] = []

                        for(const value of expr.toCompare){
                            evals.push(this.EvaluateProposition(value, subp_values));
                        }

                        for(const val of evals){
                            if(val === false){
                                result = false;
                                break outer;
                            }
                        }
                        
                        result = true;
                        break;
                    }
                    case TokenType.OR: {

                        const evals: boolean[] = []

                        for(const value of expr.toCompare){
                            evals.push(this.EvaluateProposition(value, subp_values));
                        }

                        for(const val of evals){
                            if(val === true){
                                result = true;
                                break outer;
                            }
                        }
                        
                        result = false;
                        break;
                    }
                    case TokenType.CONDITIONAL: {
                        const first = this.EvaluateProposition(expr.toCompare[0], subp_values);
                        const second = this.EvaluateProposition(expr.toCompare[1], subp_values);

                        let _result = !first || second; 

                        for(let i = 2; i < expr.toCompare.length; i++){
                            const prop = this.EvaluateProposition(expr.toCompare[i], subp_values);
                            _result = (!_result ||  prop); 
                        }

                        result = _result
                        break;
                    }
                    case TokenType.BICONDITIONAL: {
                        const first = this.EvaluateProposition(expr.toCompare[0], subp_values);
                        const second = this.EvaluateProposition(expr.toCompare[1], subp_values);
                        let _result = (!first || second) && (!second || first); 

                        for(let i = 2; i < expr.toCompare.length; i++){
                            const newest = this.EvaluateProposition(expr.toCompare[i], subp_values)
                            _result = (!_result || newest) && (!newest || _result); 
                        }

                        result = _result
                        break;
                    }
                    default: {
                        throw new Error("How?? " + expr.comparison.toString())
                    }
                };
                subp_values.push(result);
                return result;
            }
            case "negation": {
                const negation = !this.EvaluateProposition(expr.toNegate, subp_values);
                subp_values.push(negation)
                return negation;
            }
            case "variable": {
                const val = this.varValue(expr.uniqueID);
                return val;
            }
        }
    }

    private permuteVars(): boolean {

        let i = this.variables.length - 1;
        for(i;i >= 0 && this.variables[i] === false; i -= 1){}
        
        // DONE
        if(i === -1) return false;

        this.variables[i] = false;

        for(let j = i + 1; j < this.variables.length; j++){
            this.variables[j] = true;
        }

        
        return true;
    }

    private allPropositionStrings(): string[] {
        const p = [...this.idToString];

        // Traverse the tree and add to list in order to encountering.
        for(const line of this.trees){
            this.traverseTreeForNames(line, p);
        }
        

        return p;
    }

    private traverseTreeForNames(expr: ExpressionType, names: string[]): string {

        switch(expr.type){
            case "group": {
                const result = "(" + this.traverseTreeForNames(expr.expr, names) + ")";
                // names.push(result);
                return result;
            }
            case "comparison": {
                let result: string;

                switch(expr.comparison.type){
                    case TokenType.AND: {
                        result = this.traverseTreeForNames(expr.toCompare[0], names)
                        for(let i = 1; i < expr.toCompare.length; i++){
                            const name = this.traverseTreeForNames(expr.toCompare[i], names);
                                
                            result = `${result} ∧ ${name}`
                        }
                        result = "(" + result + ")"
                        // result = left + " ∧ " + right;
                        break;
                    }
                    case TokenType.OR: {
                        result = this.traverseTreeForNames(expr.toCompare[0], names)
                        for(let i = 1; i < expr.toCompare.length; i++){
                            const name = this.traverseTreeForNames(expr.toCompare[i], names);
                                
                            result = `${result} ∨ ${name}`
                        }
                        result = "(" + result + ")"
                        // result = left + " ∨ " + right;
                        break;
                    }
                    case TokenType.CONDITIONAL: {
                        result = this.traverseTreeForNames(expr.toCompare[0], names)
                        for(let i = 1; i < expr.toCompare.length; i++){
                            const name = this.traverseTreeForNames(expr.toCompare[i], names);
                                
                            result = `${result} ⇒ ${name}`
                        }
                        result = "(" + result + ")"
                        break;
                    }
                    case TokenType.BICONDITIONAL: {
                        result = this.traverseTreeForNames(expr.toCompare[0], names)
                        for(let i = 1; i < expr.toCompare.length; i++){
                            const name = this.traverseTreeForNames(expr.toCompare[i], names);
                                
                            result = `${result} ⇔ ${name}`
                        }
                        result = "(" + result + ")"
                        //result = left + " ⇔ " + right;
                        break;
                    }
                    default: {
                        throw new Error("How?? " + expr.comparison.toString())
                    }
                }

                names.push(result);
                return result;
            }
            case "negation": {
                const negation = this.traverseTreeForNames(expr.toNegate, names);
                names.push("¬" + negation);
                return "¬" + negation;
            }
            case "variable": {
                return expr.name;
            }
        }
    }

    run_program(): {
        // Formated strings of the propositions names. Indices line up with those in the truthvalue second value.
        variables: string[];
        // Tuple of values for each unique set of proposition values. 1 value is value of final expression. Other is of the individual expressions
        truth_value: boolean[][];
    }{
        // []
        const truth_value: boolean[][] = [];

        do {
            // For each permutation of variable values, run each expression
            const subvalues: boolean[] = [];
            for(const line of this.trees){

                const truth_row = this.EvaluateProposition(line, subvalues);
    
                // this.variables is the values of the raw propositional variables. p,q,r,s
                // Subvalues is the truth value of the compound propositions
                // truth_value.push([...this.variables, ...subvalues]);
            }

            truth_value.push([...this.variables, ...subvalues]);
            
        } while(this.permuteVars());

        console.log("All names: " + this.allPropositionStrings())

        return {
            variables: this.allPropositionStrings(),
            truth_value: truth_value
        }

        
    }

}


