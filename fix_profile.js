const fs = require('fs');

const files = [
    'src/app/profile/page.tsx',
    'src/app/profile/edit/page.tsx',
    'src/app/profile/[id]/page.tsx'
];

files.forEach(path => {
    if (!fs.existsSync(path)) return;
    let content = fs.readFileSync(path, 'utf8');

    // Headings
    content = content.replace(/(<h[1-6][^>]*?)text-white([^>]*?>)/g, "$1text-zinc-900 dark:text-white$2");

    // Paragraphs and spans and divs with text-zinc-400
    content = content.replace(/(<p[^>]*?)text-zinc-400([^>]*?>)/g, "$1text-zinc-600 dark:text-zinc-400$2");
    content = content.replace(/(<div[^>]*?)text-zinc-400([^>]*?>)/g, (match, p1, p2) => {
        if (match.includes("bg-")) return match;
        return `${p1}text-zinc-600 dark:text-zinc-400${p2}`;
    });
    content = content.replace(/(<span[^>]*?)text-zinc-400([^>]*?>)/g, (match, p1, p2) => {
        if (match.includes("bg-")) return match;
        return `${p1}text-zinc-600 dark:text-zinc-400${p2}`;
    });

    // Icons with text-zinc-400
    content = content.replace(/(<[A-Z][a-zA-Z]*[^>]*?)text-zinc-400([^>]*?\/>)/g, (match, p1, p2) => {
        if (match.includes("bg-")) return match;
        return `${p1}text-zinc-600 dark:text-zinc-400${p2}`;
    });

    fs.writeFileSync(path, content);
    console.log("Updated", path);
});
