const fs = require('fs');
const { execSync } = require('child_process');

const content = fs.readFileSync('c:\\Users\\adm-09\\Desktop\\Geminis\\Antigravity\\analizador-de-datos\\components\\DataTable.tsx', 'utf8');
const lines = content.split('\n');

function checkLines(endLine) {
    const testLines = lines.slice(0, endLine);
    testLines.push('    return null;');
    testLines.push('};');
    fs.writeFileSync('c:\\Users\\adm-09\\Desktop\\Geminis\\Antigravity\\analizador-de-datos\\components\\DataTable_test.tsx', testLines.join('\n'));
    try {
        execSync('npx tsc components/DataTable_test.tsx --noEmit --jsx react-jsx --skipLibCheck --esModuleInterop', { stdio: 'ignore' });
        return true; // Success! No missing braces in the first `endLine` lines.
    } catch (e) {
        return false; // Failed! The missing brace is within `endLine` lines.
    }
}

// Keep the import statements and the component declaration, let's say up to line 500
console.log('Checking up to line 500:', checkLines(500) ? 'OK' : 'FAIL');
console.log('Checking up to line 1030:', checkLines(1030) ? 'OK' : 'FAIL');
console.log('Checking up to line 1500:', checkLines(1500) ? 'OK' : 'FAIL');
console.log('Checking up to line 2000:', checkLines(2000) ? 'OK' : 'FAIL');
