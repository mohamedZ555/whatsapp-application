const fs = require('fs');
const file = 'd:/whatsapp-application/app/[locale]/(dashboard)/chat/[[...contactId]]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix: change set to native so emojis render using OS native glyphs (same as WhatsApp on that device)
content = content.replace('set="apple"', 'set="native"');
// Also increase perLine for better layout
content = content.replace('perLine={8}', 'perLine={9}');

fs.writeFileSync(file, content, 'utf8');
console.log('Fixed! set=native applied.');
