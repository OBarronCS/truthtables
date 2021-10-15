import { Scanner, TokenType } from "./lexer";
import { TokenParser, ExpressionType } from "./parser";
import { AssertUnreachable, CheckedResult, ErrorResult, IErrorResult, ValidResult } from "./result";

const editor = document.getElementById("editor") as HTMLTextAreaElement;

editor.style.backgroundColor = "#ffffcc"

// const ALPHABET_LOWERCASE = "abcdefghijklmnopqrstuvwxyz";



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

            // Headers
            const thr = document.createElement('tr');
            for (let i = 0; i < truth_table.variables.length; i++) {
                // console.log("Var " + i)
                const header = document.createElement('th');
                header.style.border = "1px solid black"
                header.onmouseenter = e => {
                    header.style.backgroundColor = "#cef58c"
                }

                header.onmouseleave = e => {
                    header.style.backgroundColor = "#FFFFFF"
                }

                header.onclick = e => {
   
                }

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




