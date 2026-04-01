const fs = require('fs');
const path = require('path');

const appPath = path.join(__dirname, '..', 'src', 'app', 'App.tsx');
let content = fs.readFileSync(appPath, 'utf8');

// The file sizes might be slightly different. Let's find exactly the blocks.
const pStart = content.indexOf('const palette = {');
const pEnd = content.indexOf('};', pStart) + 2;
const sStart = content.indexOf('const styles = StyleSheet.create({');
let sEnd = content.lastIndexOf('});');
if (sEnd === -1) sEnd = content.lastIndexOf('});\n');
if (sEnd !== -1) sEnd += 3;

if (pStart === -1 || sStart === -1 || pEnd === -1 || sEnd === -1) {
  console.log('Could not find boundaries.');
  process.exit(1);
}

const themeContent = `import { StyleSheet } from "react-native";

export ` + content.slice(pStart, pEnd) + '\n\nexport ' + content.slice(sStart, sEnd) + '\n';

const themePath = path.join(__dirname, '..', 'src', 'ui', 'theme.ts');
fs.writeFileSync(themePath, themeContent);
console.log('theme.ts written.');

// remove them from App.tsx
content = content.slice(0, pStart) + content.slice(pEnd, sStart) + content.slice(sEnd);

// Instead of rewriting all of App.tsx right now and breaking it, let's keep going.
fs.writeFileSync(appPath, content);
console.log('App.tsx stripped and updated.');
