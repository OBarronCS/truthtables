import { Scanner } from "./lexer";
import { ExpressionType, TokenParser } from "./parser";
import { AssertUnreachable } from "./result";

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
            html_t.innerHTML = "";

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

           

            // // Drawing the syntax tree

            // const draw_tree = (function(){

            //     let i = 0;
            //     function traverse(expr: ExpressionType, depth: number){

            //         switch(expr.type){
            //             case "comparison": {
                            
            //                 const subnodes: (ExpressionType & { x: number, y: number})[] = [];

            //                 for(let i = 0; i < Math.floor(expr.toCompare.length / 2); i++){
            //                     subnodes.push(traverse(expr.toCompare[i], depth + 1));
            //                 }

            //                 const x = i++;

            //                 for(let i = Math.floor(expr.toCompare.length / 2); i < expr.toCompare.length; i++){
            //                     subnodes.push(traverse(expr.toCompare[i], depth + 1));
            //                 }


            //                 return {...expr, toCompare: subnodes, x, y: depth}
            //             }
            //             case "boolean": {
            //                 return {...expr, x: i++, y: depth}
            //             }
            //             case "group": {
            //                 return {...expr, x: i++, y: depth}
            //             }
            //             case "negation": {
            //                 return {...expr, x: i++, y: depth}
            //             }
            //             case "variable": {
            //                 return {...expr, x: i++, y: depth}
            //             }
            //             default: AssertUnreachable(expr);
            //         }                    
            //     }
                
            //     return traverse(program.trees[0],0);
            // })()

            // // Drawing the search tree
            // const c = document.getElementById("canvas") as HTMLCanvasElement;
            // const ctx = c.getContext("2d");
            // console.log("clearing");

            // ctx.clearRect(0, 0, c.width, c.height);

            // // ctx.rect(10,10,10,10);
            // // ctx.moveTo(0,0);
            // // ctx.lineTo(200,1000);
            // // ctx.stroke();

            // function draw(expr: typeof draw_tree){

            //     const x = expr.x * 20;
            //     const y = (expr.y + 1) * 20;

            //     switch(expr.type){
            //         case "comparison": {
            //             ctx.fillText(`(${program["traverseTreeForNames"](expr,[])})`, x,y);
            //             //@ts-expect-error
            //             for(const edge of expr.toCompare) draw(edge);
            //             break;
                        
            //         }
            //         case "boolean": {
            //             ctx.fillText("boolean", x,y);
            //             break;
            //         }
            //         case "group": {
            //             ctx.fillText(`(${program["traverseTreeForNames"](expr.expr,[])})`, x,y);
            //             break;
            //         }
            //         case "negation": {
            //             ctx.fillText("!", x,y);
            //             break;
            //         }
            //         case "variable": {
            //             ctx.fillText(`${expr.name}`, x,y);
            //             break;
            //         }
            //         default: AssertUnreachable(expr);
            //     }
                
            // }

            // draw(draw_tree);
            

            break;
        }
        case false: {
            t.innerHTML = "Lexer error: " + result.error.map(t => t + "\n").toString()
        }
    }




});




