import fs from 'fs';

const filepath = 'C:\\Users\\adm-09\\.gemini\\antigravity-ide\\brain\\9063f215-4ead-43e3-8f7d-1a570507e9c5\\app_icon_transparent_1780661685154.png';

try {
    const buffer = fs.readFileSync(filepath);
    console.log('File size:', buffer.length);
    console.log('First 16 bytes:', buffer.slice(0, 16).toString('hex'));
    
    // Check magic bytes
    if (buffer.slice(0, 8).toString('hex') === '89504e470d0a1a0a') {
        console.log('Magic bytes match PNG!');
    } else if (buffer.slice(0, 4).toString('ascii') === 'RIFF' && buffer.slice(8, 12).toString('ascii') === 'WEBP') {
        console.log('Magic bytes match WEBP!');
    } else if (buffer.slice(0, 3).toString('hex') === 'ffd8ff') {
        console.log('Magic bytes match JPEG!');
    } else {
        console.log('Unknown format.');
    }
} catch (e) {
    console.error('Error reading file:', e);
}
