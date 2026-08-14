const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('src/app', function(filePath) {
    if (!filePath.endsWith('.tsx')) return;
    
    // Auth pages are entirely dark mode, skip them
    if (filePath.includes('(auth)')) return;

    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // 1. Fix isDark ternaries where light mode is text-zinc-500
    // e.g. isDark ? "text-zinc-400" : "text-zinc-500"
    content = content.replace(/(\?\s*['"][^'"]+['"]\s*:\s*['"][^'"]*?)text-zinc-500([^'"]*?['"])/g, "$1text-zinc-600$2");
    
    // 2. Fix isDark ternaries where light mode is text-zinc-400
    content = content.replace(/(\?\s*['"][^'"]+['"]\s*:\s*['"][^'"]*?)text-zinc-400([^'"]*?['"])/g, "$1text-zinc-600$2");

    // 3. For Settings and Profile pages, fix the hardcoded white text on light card
    if (filePath.includes('SettingsContent.tsx') || filePath.includes('profile')) {
        // Headings
        content = content.replace(/(<h[1-6][^>]*?)text-white([^>]*?>)/g, "$1text-zinc-900 dark:text-white$2");

        // Paragraphs, divs, spans
        content = content.replace(/(<[p|div|span][^>]*?)text-zinc-400([^>]*?>)/g, (match, p1, p2) => {
            if (match.includes("bg-")) return match; // skip if it has a hardcoded background
            return `${p1}text-zinc-600 dark:text-zinc-400${p2}`;
        });

        // Icons
        content = content.replace(/(<[A-Z][a-zA-Z]*[^>]*?)text-zinc-400([^>]*?\/>)/g, (match, p1, p2) => {
            if (match.includes("bg-")) return match;
            return `${p1}text-zinc-600 dark:text-zinc-400${p2}`;
        });
        
        // Also fix some text-zinc-500 that might be hardcoded in profile pages
        content = content.replace(/(<[p|div|span][^>]*?)text-zinc-500([^>]*?>)/g, (match, p1, p2) => {
            if (match.includes("bg-")) return match;
            return `${p1}text-zinc-600 dark:text-zinc-500${p2}`;
        });
    }

    if (content !== original) {
        fs.writeFileSync(filePath, content);
        console.log("Fixed", filePath);
    }
});
