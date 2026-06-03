const fs = require('fs');
const content = fs.readFileSync('c:\\Users\\adm-09\\Desktop\\Geminis\\Antigravity\\analizador-de-datos\\components\\DataTable.tsx', 'utf8');

const openTags = [];
let lines = content.split('\n');

const tagRegex = /<\/?([a-zA-Z0-9]+)[^>]*>/g;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Ignore comments
    if (line.trim().startsWith('//')) continue;
    // Ignore very simple multi-line comment indicators
    if (line.trim().startsWith('/*') || line.trim().startsWith('*')) continue;

    let match;
    while ((match = tagRegex.exec(line)) !== null) {
        let tagString = match[0];
        let tagName = match[1];

        // Self-closing tags
        if (tagString.endsWith('/>')) continue;
        
        // Exclude specific non-paired tags usually seen as components but wait, React needs all closed.
        // Let's exclude common HTML void elements if used without /> (though in JSX they should have />)
        const voidElements = ['input', 'img', 'br', 'hr', 'path', 'svg'];
        if (voidElements.includes(tagName)) {
             // For SVG path
             if (tagName === 'path' && tagString.endsWith('/>')) continue;
        }

        if (tagString.startsWith('</')) {
            if (openTags.length > 0 && openTags[openTags.length - 1].name === tagName) {
                openTags.pop();
            } else {
                console.log(`Mismatch or Extra closing tag: </${tagName}> at line ${i + 1}`);
            }
        } else if (tagString.startsWith('<')) {
            // It's an opening tag
            openTags.push({ name: tagName, line: i + 1, text: tagString });
        }
    }
}

console.log("\nUnclosed tags remaining:");
openTags.forEach(tag => {
    console.log(`Line ${tag.line}: <${tag.name}>  ... ${tag.text}`);
});
