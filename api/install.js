const { Client } = require('ssh2');
const crypto = require('crypto');

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { ipvps, password, domainpnl, domainnode, ramvps } = req.body;

    const connSettings = {
        host: ipvps,
        port: '22',
        username: 'root',
        password: password
    };

    const panelPassword = generateRandomPassword();
    const conn = new Client();

    conn.on('ready', () => {
        console.log('SSH Connected');
        executePanelInstallation(conn, domainpnl, panelPassword);
        res.status(200).json({ message: 'Instalasi dimulai! Periksa console server untuk progres.' });
    }).on('error', (err) => {
        console.error('SSH Error:', err);
        res.status(500).json({ error: 'Gagal terhubung ke server' });
    }).connect(connSettings);
};

function generateRandomPassword(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from(crypto.randomFillSync(new Uint32Array(length)))
        .map((x) => chars[x % chars.length])
        .join('');
}

function executePanelInstallation(conn, domain, password) {
    const command = 'bash <(curl -s https://pterodactyl-installer.se)';

    conn.exec(command, (err, stream) => {
        if (err) throw err;

        stream.on('data', (data) => {
            handleInstallationPrompt(data, stream, domain, password);
        }).stderr.on('data', (data) => {
            console.error('STDERR:', data.toString());
        });
    });
}

function handleInstallationPrompt(data, stream, domain, password) {
    const output = data.toString();

    if (output.includes('Enter your email')) {
        stream.write('admin@example.com\n');
    }
    if (output.includes('Enter a password')) {
        stream.write(password + '\n');
    }
    if (output.includes('Enter your domain')) {
        stream.write(domain + '\n');
    }
}
