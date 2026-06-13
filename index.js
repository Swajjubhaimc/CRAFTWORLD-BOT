const dgram = require('dgram');
const express = require('express');

// ========== CONFIGURATION ==========
const SERVER_IP = '142.132.203.47';
const SERVER_PORT = 15475;
// ===================================

const MAGIC = Buffer.from([0x00, 0xff, 0xff, 0x00, 0xfe, 0xfe, 0xfe, 0xfe, 0xfd, 0xfd, 0xfd, 0xfd, 0x12, 0x34, 0x56, 0x78]);

const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m'
};

function log(message, color = 'reset') {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`${colors[color]}[${timestamp}] ${message}${colors.reset}`);
}

function sendPing() {
    const client = dgram.createSocket('udp4');
    let isResolved = false;
    
    const timeout = setTimeout(() => {
        if (!isResolved) {
            isResolved = true;
            log(`Ping timeout - server at ${SERVER_IP}:${SERVER_PORT} is not responding.`, 'yellow');
            client.close();
            setTimeout(() => sendPing(), 30000);
        }
    }, 5000);

    const packet = Buffer.alloc(25);
    let offset = 0;
    
    packet.writeUInt8(0x01, offset); offset++;
    packet.writeBigUInt64LE(BigInt(Date.now()), offset); offset += 8;
    MAGIC.copy(packet, offset); offset += MAGIC.length;
    packet.writeBigUInt64LE(0n, offset);

    client.on('error', (err) => {
        if (!isResolved) {
            isResolved = true;
            clearTimeout(timeout);
            log(`Socket error: ${err.message}`, 'red');
            client.close();
            setTimeout(() => sendPing(), 60000);
        }
    });

    client.on('message', (msg) => {
        if (msg.length > 0 && msg.readUInt8(0) === 0x1C) {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(timeout);
                log(`✓ Server is ONLINE. Keeping connection alive.`, 'green');
                client.close();
                setTimeout(() => sendPing(), 240000);
            }
        }
    });

    client.send(packet, 0, packet.length, SERVER_PORT, SERVER_IP, (err) => {
        if (err) {
            if (!isResolved) {
                isResolved = true;
                clearTimeout(timeout);
                log(`Failed to send ping: ${err.message}`, 'red');
                client.close();
                setTimeout(() => sendPing(), 60000);
            }
        } else {
            log(`Pinging ${SERVER_IP}:${SERVER_PORT}...`, 'blue');
        }
    });
}

const app = express();
app.get('/', (req, res) => {
    res.send('Craft World Keep-Alive Bot is running!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    log(`Web server running on port ${port}`, 'green');
    log(`========================================`, 'green');
    log(`   Craft World Server Keep-Alive Bot`, 'green');
    log(`========================================`, 'green');
    log(`Target: ${SERVER_IP}:${SERVER_PORT}`, 'blue');
    log(`Ping Interval: 4 minutes`, 'blue');
    log(`Status: RUNNING`, 'green');
    log(`========================================`, 'green');
    sendPing();
});
