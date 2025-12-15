import { networkInterfaces } from 'os';

const nets = networkInterfaces();
const results = {};

for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
        // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
        if (net.family === 'IPv4' && !net.internal) {
            if (!results[name]) {
                results[name] = [];
            }
            results[name].push(net.address);
        }
    }
}

console.log('\n\x1b[32m====================================================\x1b[0m');
console.log('\x1b[32m🚀 Local Network Access (Click to open):\x1b[0m');
Object.keys(results).forEach((name) => {
    results[name].forEach((ip) => {
        console.log(`   \x1b[36mhttp://${ip}:3000\x1b[0m`);
    });
});
console.log('\x1b[32m====================================================\x1b[0m\n');
