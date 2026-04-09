const fs = require('fs');
const { execSync } = require('child_process');

let originalContent = fs.readFileSync('c:\\Users\\adm-09\\Desktop\\Geminis\\Antigravity\\analizador-de-datos\\components\\DataTable.tsx', 'utf8');

function testContent(modifiedContent) {
    fs.writeFileSync('c:\\Users\\adm-09\\Desktop\\Geminis\\Antigravity\\analizador-de-datos\\components\\DataTable_temp.tsx', modifiedContent);
    try {
        execSync(`npx prettier --check components/DataTable_temp.tsx`, { stdio: 'ignore' });
        return true; 
    } catch {
        return false;
    }
}

// Bisect by deleting ranges
let lines = originalContent.split('\n');
console.log(`Total lines: ${lines.length}`);

// We know the file currently has a syntax error
let step = 100;
for(let start = 0; start < lines.length; start += step) {
    let end = Math.min(start + step, lines.length);
    // Erase lines start to end
    let testLines = [...lines];
    for(let i = start; i < end; i++) {
        testLines[i] = ''; // blank line to keep numbering
    }
    
    // Check if error went away
    let isFixed = testContent(testLines.join('\n'));
    if (isFixed) {
         console.log(`Syntax error goes away when removing lines ${start} to ${end}!`);
         // We can be more granular now
         for (let j = start; j < end; j++) {
             let finerLines = [...lines];
             finerLines[j] = '';
             if (testContent(finerLines.join('\n'))) {
                 console.log(`  -> Specific line causing error: ${j + 1}`);
             }
         }
    }
}
// Clean up
if (fs.existsSync('c:\\Users\\adm-09\\Desktop\\Geminis\\Antigravity\\analizador-de-datos\\components\\DataTable_temp.tsx')) {
    fs.unlinkSync('c:\\Users\\adm-09\\Desktop\\Geminis\\Antigravity\\analizador-de-datos\\components\\DataTable_temp.tsx');
}
console.log('Search complete.');
