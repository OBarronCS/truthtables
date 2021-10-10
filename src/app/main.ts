import { CheckedResult, ErrorResult, ValidResult } from "./result";

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
    END_PAREN
}

class Token {

    constructor(public type: TokenType, public word: string){}

    toString(): string {
        if(this.word === "") return TokenType[this.type];
        return TokenType[this.type] + " " + this.word;
    }
}




editor.addEventListener("keyup",e => {
    // Two steps: first turn into a format we can understand, then evaluate it
    const text = editor.value;
    



    const scanner = new Scanner(text);

    const result = scanner.parseAllTokens();

    const t = document.getElementById("test");

    switch(result.success){
        case true: {
            t.innerHTML = result.value.map(t => t.map(e => e.toString()) + "\n").toString()

            const lines = result.value;

            const p = new TokenParser(lines[0]);

            const program = p.parse();
        
            console.log("PROGRAM START")

            const truth_table = program.run_program();

            console.log("PROGRAM DONE")

            const html_t = document.getElementById("truth");
            html_t.innerHTML = ""

            const thr = document.createElement('tr');
            for (let i = 0; i < truth_table.variables.length; i++) {
                console.log("Var " + i)
                const header = document.createElement('th');
                header.style.border = "1px solid black"
                header.textContent = truth_table.variables[i];
                // header.appendChild(document.createTextNode()
                thr.appendChild(header);
            }

            // Final thing
            const header = document.createElement('th');
            header.style.border = "1px solid black"
            header.textContent = text;
            thr.appendChild(header);



            html_t.appendChild(thr);

            for(const element of truth_table.truth_value){
                const total = element[0];
                const indivual = element[1];

                console.log(indivual)

                const thr = document.createElement('tr');
                
                for(const t of indivual){
                    const slot = document.createElement('td');
                    slot.appendChild(document.createTextNode(t ? "T" : "F"));

                    thr.appendChild(slot);
                }

                const header = document.createElement('th');
                header.textContent = total ? "T" : "F";
                thr.appendChild(header);

                
                html_t.appendChild(thr);
            }
            


            console.log("TREE: " + JSON.stringify(program.tree))

            // Create a tree with the data

            break;
        }
        case false: {
            t.innerHTML = result.error.map(t => t + "\n").toString()
        }
    }




});



class Scanner {
    
    public text: string;

    public current: number;
    public end: number;
    public line = 0;

    private hasError = false;
    private errors: string[][] = [[]];
    private tokens: Token[][] = [[]];

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
        this.tokens.push([]);
        this.errors.push([]);
    }

    addToken(t: TokenType, name: string = ""){
        this.tokens[this.line].push(new Token(t,name));
    }

    addError(str: string){
        this.errors[this.line].push(str);
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

   

    parseAllTokens(): CheckedResult<Token[][],string[][]> {

        while(this.hasMore()){

            const char = this.advance();

            switch(char){
                case " ": break;

                case "!": this.addToken(TokenType.NOT); break;
                case "(": this.addToken(TokenType.START_PAREN); break;
                case ")": this.addToken(TokenType.END_PAREN); break;
                case "-": {
                    if(this.ifNextIs(">")){
                        this.addToken(TokenType.CONDITIONAL); break;
                    } else {
                        this.addError("Expecting > after -")
                    }
                    break;
                }
                case "\n": {
                    this.newLine();
                    break;
                }
                case "=": {
                    if(this.ifNextIs(">")){
                        this.addToken(TokenType.CONDITIONAL); break;
                    }
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
                case "A": {
                    if(this.text[this.current] === "N" && this.text[this.current + 1] === "D"){
                        this.addToken(TokenType.AND)
                        this.current += 2;
                    }
                    break;
                }

                case "O": {
                    if(this.text[this.current] === "R"){
                        this.addToken(TokenType.OR)
                        this.current += 1;
                    }
                    break;
                }

                default: {
                    // is valid variable name
                    if(/[a-z]/.test(char)) {
                        // If thats it!
                        if(!this.hasMore() || (this.peek() === " " || this.peek() === ")" || this.peek() === "\n")){
                            this.addToken(TokenType.VARIABLE, char);
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
    negate: ExpressionType
}

interface ComparisonExpr extends Expression {
    type: "comparison",
    comparison: Token
    left: ExpressionType
    right: ExpressionType
}

interface GroupExpr extends Expression {
    type: "group",
    expr: ExpressionType
}

type ExpressionType = VariableExpr | NegationExpr | ComparisonExpr | GroupExpr;





class TokenParser {
    public current: number;
    public end: number;

    private hasError = false;
    private errors: string[][] = [[]];
    private tokens: Token[] = [];

    public hasMore(){
        return this.current !== this.end;
    }

    constructor(tokens: Token[]){
        this.tokens = tokens;
        this.current = 0;
        this.end = tokens.length;
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

    peek(): Token {
        return this.tokens[this.current];
    }

    advance(): Token {
        return this.tokens[this.current++];
    }

    previous(){
        return this.tokens[this.current - 1];
    }


    // parses and expression given a left hand guy
    parseExpression(): ExpressionType {
        let left = this.parseProp();

        while(this.ifNextIs(TokenType.AND, TokenType.OR, TokenType.CONDITIONAL, TokenType.BICONDITIONAL)){
            const operator = this.previous();
            const right = this.parseProp();
            
            left = {
                type:"comparison",
                comparison:operator,
                left:left,
                right:right,
            }
        }

        return left;
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

    private parseProp(): ExpressionType {

        if(this.ifNextIs(TokenType.NOT)){
            return {
                type:"negation",
                negate: this.parseProp()
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
            const expr_in_group = this.parseExpression();
        
            if(this.ifNextIs(TokenType.END_PAREN)){

                return {
                    type:"group",
                    expr: expr_in_group
                }
            } else {
                throw new Error("NEED")
            }
        }

        throw new Error("idk dawg")
    }

    parse(): ProgramInfo {
        const expr = this.parseExpression();
        const p = new ProgramInfo(expr,this.idToString)
        return p;
    }
}

class ProgramInfo {
    tree: ExpressionType;
    
    // Index is id, element is current value
    variables: boolean[] = [];

    // Index is id, element is string repr
    private idToString: string[] = [];

    constructor(tree: ExpressionType, idToString: string[]){
        this.tree = tree;

        this.idToString = idToString;
        
        this.variables = this.idToString.map(t => true);
    }
    
    private varValue(id: number){
        return this.variables[id];
    }


    // Returns the value of the proposition at this truth value
    private EvaluateProposition(expr: ExpressionType): boolean {

        switch(expr.type){
            case "group": {
                return this.EvaluateProposition(expr.expr);
            }
            case "comparison": {
                const left = this.EvaluateProposition(expr.left);
                const right = this.EvaluateProposition(expr.right);
    
                switch(expr.comparison.type){
                    case TokenType.AND: {
                        return left && right;
                    }
                    case TokenType.OR: {
                        return left || right;
                    }
                    case TokenType.CONDITIONAL: {
                        return (!left || right)
                    }
                    case TokenType.BICONDITIONAL: {
                        return (!left || right) && (!right || left)
                    }

                    default: {
                        throw new Error("How" + expr.comparison.toString())
                    }
                    
                }
            }
            case "negation": {
                return !this.EvaluateProposition(expr);
            }
            case "variable": {
                return this.varValue(expr.uniqueID);
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

    run_program(){

        console.log("Number of variables:" + this.variables.length)

        const truth_value: [boolean, boolean[]][] = [];

        do {
            const truth_row = this.EvaluateProposition(this.tree);
            truth_value.push([truth_row, [...this.variables]]);
        } while(this.permuteVars());

        return {
            variables: this.idToString,
            truth_value: truth_value
        }

        
    }

}


