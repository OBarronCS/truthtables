
import { TokenType,  Token } from "./lexer";
import { CheckedResult, ValidResult, ErrorResult, AssertUnreachable } from "./result";


export type ExprType = "variable" | "negation" | "comparison" | "group" | "boolean";


export interface Expression {
    type: ExprType
}

export interface BooleanLiteralExpr extends Expression {
    type: "boolean"
    bool: boolean
}

export interface VariableExpr extends Expression {
    type: "variable",
    name: string,
    uniqueID: number,
}

export interface NegationExpr extends Expression {
    type: "negation",
    toNegate: ExpressionType
}

export interface ComparisonExpr extends Expression {
    type: "comparison",
    comparison: Token;
    toCompare: ExpressionType[]
    // left: ExpressionType
    // right: ExpressionType
}

export interface GroupExpr extends Expression {
    type: "group",
    expr: ExpressionType
}

export type ExpressionType = VariableExpr | NegationExpr | ComparisonExpr | GroupExpr | BooleanLiteralExpr;


export class ParseError extends Error {
    constructor(msg: string){
        super(msg);
    }
}

// Turns tokens into tree structure
export class TokenParser {
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

        while(this.ifNextIs(TokenType.NEW_LINE)){}

        if(this.ifNextIs(TokenType.END_OF_FILE)){
            return ValidResult(new ProgramInfo([], []));
        }

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

        if(this.ifNextIs(TokenType.TRUE_LITERAL)){
            return {
                type:"boolean",
                bool: true
            }
        }

        if(this.ifNextIs(TokenType.FALSE_LITERAL)){
            return {
                type:"boolean",
                bool: false
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



export class ProgramInfo {
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
            case "boolean": {
                const value = expr.bool;

                return value;
            }
            default: AssertUnreachable(expr)
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
            case "boolean": {
                return expr.bool ? "T" : "F"
            }
            default: AssertUnreachable(expr)
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







