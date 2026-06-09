const fs = require('fs');
const path = require('path');

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
    console.error('No ANTHROPIC_API_KEY found');
    process.exit(1);
}

const dir = '/Users/quan/Desktop/OpenPress/framework/openpress/apps/web/src/content/docs/ja/';

function getFiles(dirPath, filesList = []) {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            getFiles(fullPath, filesList);
        } else if (fullPath.endsWith('.md')) {
            filesList.push(fullPath);
        }
    }
    return filesList;
}

const allFiles = getFiles(dir);

async function translateFile(filePath) {
    console.log(`Translating ${filePath}...`);
    const content = fs.readFileSync(filePath, 'utf-8');
    
    const prompt = `You are a technical translator. Translate the following markdown file from English to Japanese (ja). 
    
CRITICAL INSTRUCTIONS:
1. Keep the frontmatter keys (title, eyebrow, description) exactly as they are in English, but translate their values into Japanese.
2. Keep technical terms like 'MDX', 'Press', 'Workspace', 'CLI' in English. Do not translate them into Japanese katakana or kanji.
3. Return ONLY the translated markdown file. No explanations, no markdown code blocks wrapping the output.
4. Keep all markdown structure, code blocks, and HTML tags exactly as they are, just translate the text.

File Content:
---
${content}
---`;

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
                'content-type': 'application/json'
            },
            body: JSON.stringify({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 8192,
                messages: [
                    { role: 'user', content: prompt }
                ]
            })
        });

        if (!response.ok) {
            const error = await response.text();
            throw new Error(`API Error: ${response.status} ${error}`);
        }

        const data = await response.json();
        let translated = data.content[0].text;
        
        // Remove markdown wrapper if Claude added one accidentally
        if (translated.startsWith('```markdown')) {
            translated = translated.replace(/^```markdown\n/, '').replace(/\n```$/, '');
        }

        fs.writeFileSync(filePath, translated, 'utf-8');
        console.log(`Successfully translated ${filePath}`);
    } catch (e) {
        console.error(`Failed to translate ${filePath}:`, e);
    }
}

async function main() {
    for (const file of allFiles) {
        await translateFile(file);
    }
    console.log('All done!');
}

main();
