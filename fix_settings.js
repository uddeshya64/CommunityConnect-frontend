const fs = require('fs');

const path = 'src/app/settings/SettingsContent.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace text-zinc-500 with text-zinc-600 globally because zinc-500 on white is 4.54:1 (borderline) 
// but on zinc-50 it's 4.38:1 (fails). zinc-600 on zinc-950 is bad, but usually text-zinc-500 is in isDark ternaries 
// as the light mode option.
// Let's manually replace the known bad ones.

// 1. Headings in SettingsContent.tsx that are hardcoded to text-white.
// Example: <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
content = content.replace(/(<h[1-6][^>]*?)text-white([^>]*?>)/g, "$1text-zinc-900 dark:text-white$2");

// 2. Paragraphs and spans that are text-zinc-400
// Example: <p className="text-sm text-zinc-400 mt-1">
content = content.replace(/(<p[^>]*?)text-zinc-400([^>]*?>)/g, "$1text-zinc-600 dark:text-zinc-400$2");
content = content.replace(/(<div[^>]*?)text-zinc-400([^>]*?>)/g, (match, p1, p2) => {
    if (match.includes("bg-")) return match;
    return `${p1}text-zinc-600 dark:text-zinc-400${p2}`;
});
content = content.replace(/(<span[^>]*?)text-zinc-400([^>]*?>)/g, (match, p1, p2) => {
    if (match.includes("bg-")) return match;
    return `${p1}text-zinc-600 dark:text-zinc-400${p2}`;
});

// 3. Icons that are text-zinc-400
content = content.replace(/(<[A-Z][a-zA-Z]*[^>]*?)text-zinc-400([^>]*?\/>)/g, (match, p1, p2) => {
    if (match.includes("bg-")) return match;
    return `${p1}text-zinc-600 dark:text-zinc-400${p2}`;
});

fs.writeFileSync(path, content);
console.log("Updated SettingsContent.tsx");
