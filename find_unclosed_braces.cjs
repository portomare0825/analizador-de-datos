const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\adm-09\\Desktop\\Geminis\\Antigravity\\analizador-de-datos\\components\\DataTable.tsx', 'utf8');

let stack = [];
let inString = false;
let stringChar = '';
let inComment = false;
let inBlockComment = false;

let lines = content.split('\n');
let lineNumber = 1;

for (let i = 0; i < content.length; i++) {
    const c = content[i];
    const next = content[i+1];

    if (c === '\n') {
        lineNumber++;
    }

    if (inBlockComment) {
        if (c === '*' && next === '/') {
            inBlockComment = false;
            i++;
        }
        continue;
    }

    if (inComment) {
        if (c === '\n') inComment = false;
        continue;
    }

    if (inString) {
        if (c === stringChar && content[i-1] !== '\\') inString = false;
        continue;
    }

    if (c === '/' && next === '/') {
        inComment = true;
        i++;
        continue;
    }

    if (c === '/' && next === '*') {
        inBlockComment = true;
        i++;
        continue;
    }

    if (c === '"' || c === "'" || c === '`') {
        inString = true;
        stringChar = c;
        continue;
    }

    if (c === '{') {
        stack.push({ line: lineNumber, pos: i });
    } else if (c === '}') {
        if (stack.length > 0) {
            stack.pop();
        } else {
            console.log(`Extra closing brace found at line ${lineNumber}`);
        }
    }
}

console.log('Unclosed opening braces:');
stack.forEach(brace => {
    let lineText = lines[brace.line - 1].trim();
    console.log(`Line ${brace.line}: ${lineText}`);
});
