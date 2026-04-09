const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\adm-09\\Desktop\\Geminis\\Antigravity\\analizador-de-datos\\components\\DataTable.tsx', 'utf8');

function count(char, str) {
    let count = 0;
    let inString = false;
    let stringChar = '';
    let inComment = false;
    let inBlockComment = false;

    for (let i = 0; i < str.length; i++) {
        const c = str[i];
        const next = str[i+1];

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
            if (c === stringChar && str[i-1] !== '\\') inString = false;
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

        if (c === char) count++;
    }
    return count;
}

console.log('{ count:', count('{', content));
console.log('} count:', count('}', content));
console.log('( count:', count('(', content));
console.log(') count:', count(')', content));
console.log('< count:', count('<', content));
console.log('> count:', count('>', content));
// Also check JSX specifically, e.g. `<` and `>` which can sometimes be incorrectly paired depending on content.
