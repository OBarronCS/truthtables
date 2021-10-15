
import { AssertUnreachable, CheckedResult, ErrorResult, ValidResult } from "./result";


export enum TokenType {
    VARIABLE,
    AND,
    OR,
    // XOR,
    NOT,
    CONDITIONAL,
    BICONDITIONAL,
    TRUE_LITERAL,
    FALSE_LITERAL,
    START_PAREN,
    END_PAREN,
    END_OF_FILE,
    NEW_LINE
}

export class Token {

    constructor(public type: TokenType, public word: string){}

    toString(): string {
        if(this.word === "") return TokenType[this.type];
        return `${TokenType[this.type]}(${this.word})`;
    }
}


// Turns raw text into flat stream of tokens
export class Scanner {
    
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
                            if(str === "T") {
                                this.addToken(TokenType.TRUE_LITERAL);
                                break;
                            } else if(str === "F"){
                                this.addToken(TokenType.FALSE_LITERAL);
                                break;
                            } else if(str == "OR"){
                                this.addToken(TokenType.OR);
                            } else if (str === "AND") {
                                this.addToken(TokenType.AND);
                            } else {
                                const correction = this.suggestCorrection(str)

                                const err_str = correction === "" ? "Unknown identifier '" + str + "'" : "Unknown identifier '" + str + "'. Did you mean '" + correction + "'?"

                                this.addError(err_str);
                            }
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








