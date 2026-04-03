// server.js - Node.js backend with PostgreSQL for key validation
const express = require('express');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3030;

// IMPORTANT: JWT_SECRET must be set in Render environment variables
// If not set, generates a stable secret based on DATABASE_URL to prevent logout on restart
const JWT_SECRET = process.env.JWT_SECRET || (() => {
    console.warn('⚠️  WARNING: JWT_SECRET not set in environment variables!');
    console.warn('⚠️  Please set JWT_SECRET in Render dashboard to prevent logouts on restart');
    // Generate stable secret from DATABASE_URL if available
    const crypto = require('crypto');
    const base = process.env.DATABASE_URL || 'fallback-secret-key-12345';
    return crypto.createHash('sha256').update(base).digest('hex');
})();

const DATABASE_URL = process.env.DATABASE_URL;

// Trust proxy - important for getting real IP on Render
app.set('trust proxy', true);

// Middleware
app.use(express.json());
app.use(cors());

// Add security headers for Buckshot Roulette (Cross-Origin Isolation)
app.use('/games/buckshotroulette', (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
});

// Maintenance mode middleware
app.use(async (req, res, next) => {
    // Skip API routes and maintenance page itself
    if (req.path.startsWith('/api/') || req.path === '/maintenance.html') return next();

    try {
        const result = await pool.query('SELECT * FROM maintenance WHERE id = 1');
        const m = result.rows[0];
        if (!m || !m.is_active) return next();

        // Check if super owner - allow through
        const authHeader = req.headers.authorization;
        const token = req.cookies?.token || null;
        // Super owners bypass via query param or cookie (set after login)
        // We check via a special bypass token in query string for page loads
        const bypass = req.query._sobypass;
        if (bypass) {
            try {
                const decoded = jwt.verify(bypass, JWT_SECRET);
                if (decoded.isSuperOwner) return next();
            } catch(e) {}
        }

        // Apply maintenance mode
        if (m.mode === 'shutdown') {
            process.exit(0);
        } else if (m.mode === '503') {
            res.status(503).sendFile('maintenance.html', { root: 'public' });
        } else {
            // Default: redirect to maintenance page
            res.redirect('/maintenance.html');
        }
    } catch (err) {
        next(); // If DB error, don't block site
    }
});

app.use(express.static('public')); // Serve static files (index.html, games.html, etc.)

// Initialize PostgreSQL connection
const pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Test connection and create tables
pool.connect((err, client, release) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to PostgreSQL database');
        release();
        initDatabase();
    }
});

// Create tables if they don't exist
async function initDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS access_keys (
                id SERIAL PRIMARY KEY,
                key_code VARCHAR(255) UNIQUE NOT NULL,
                is_admin INTEGER DEFAULT 0,
                is_used INTEGER DEFAULT 0,
                is_revoked INTEGER DEFAULT 0,
                used_at TIMESTAMP,
                used_by_ip VARCHAR(45),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                nickname VARCHAR(100) DEFAULT NULL,
                is_banned INTEGER DEFAULT 0,
                ban_reason TEXT DEFAULT NULL,
                ban_expires_at TIMESTAMP DEFAULT NULL,
                banned_by VARCHAR(255) DEFAULT NULL
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS admin_users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS announcements (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                created_by VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                is_active INTEGER DEFAULT 1
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS bug_reports (
                id SERIAL PRIMARY KEY,
                title VARCHAR(255) NOT NULL,
                description TEXT NOT NULL,
                console_logs TEXT,
                reported_by VARCHAR(255),
                status VARCHAR(50) DEFAULT 'open',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS game_requests (
                id SERIAL PRIMARY KEY,
                game_name VARCHAR(255) NOT NULL,
                reason TEXT,
                requested_by VARCHAR(255),
                status VARCHAR(50) DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS broken_games (
                game_id INTEGER PRIMARY KEY,
                broken_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS maintenance (
                id INTEGER PRIMARY KEY DEFAULT 1,
                is_active INTEGER DEFAULT 0,
                mode VARCHAR(20) DEFAULT 'page',
                message TEXT DEFAULT 'Site is under maintenance. Check back soon!',
                activated_at TIMESTAMP,
                activated_by VARCHAR(255)
            )
        `);

        // Ensure maintenance row exists
        await pool.query(`
            INSERT INTO maintenance (id, is_active) VALUES (1, 0) ON CONFLICT DO NOTHING
        `);

        // Add nickname column if it doesn't exist (for existing databases)
        await pool.query(`
            ALTER TABLE access_keys ADD COLUMN IF NOT EXISTS nickname VARCHAR(100) DEFAULT NULL
        `);
        await pool.query(`ALTER TABLE access_keys ADD COLUMN IF NOT EXISTS is_banned INTEGER DEFAULT 0`);
        await pool.query(`ALTER TABLE access_keys ADD COLUMN IF NOT EXISTS ban_reason TEXT DEFAULT NULL`);
        await pool.query(`ALTER TABLE access_keys ADD COLUMN IF NOT EXISTS ban_expires_at TIMESTAMP DEFAULT NULL`);
        await pool.query(`ALTER TABLE access_keys ADD COLUMN IF NOT EXISTS banned_by VARCHAR(255) DEFAULT NULL`);
        
        // Create a default owner key on first run
        const result = await pool.query('SELECT * FROM access_keys WHERE is_admin = 2');
        
        if (result.rows.length === 0) {
            const ownerKey = generateKey();
            await pool.query('INSERT INTO access_keys (key_code, is_admin) VALUES ($1, 2)', [ownerKey]);
            
            console.log('===========================================');
            console.log('👑 OWNER KEY CREATED:', ownerKey);
            console.log('===========================================');
            console.log('Save this key! Use it to access /admin.html');
            console.log('Owner can: Generate admin/regular keys, revoke/delete any keys');
            console.log('===========================================');
        }
    } catch (err) {
        console.error('Error initializing database:', err);
    }
}

// Rate limiting (simple in-memory store)
const rateLimitStore = new Map();

function checkRateLimit(ip) {
    const now = Date.now();
    const attempts = rateLimitStore.get(ip) || [];
    
    // Remove attempts older than 15 minutes
    const recentAttempts = attempts.filter(timestamp => now - timestamp < 15 * 60 * 1000);
    
    if (recentAttempts.length >= 5) {
        return false; // Too many attempts
    }
    
    recentAttempts.push(now);
    rateLimitStore.set(ip, recentAttempts);
    return true;
}

// API: Validate key
app.post('/api/validate-key', async (req, res) => {
    const { key } = req.body;
    let clientIp = req.ip || req.connection.remoteAddress || req.headers['x-forwarded-for'];
    
    // Clean up IPv6 localhost to IPv4
    if (clientIp === '::1' || clientIp === '::ffff:127.0.0.1') {
        clientIp = '127.0.0.1';
    }
    
    // Extract real IP from x-forwarded-for if behind proxy
    if (clientIp && clientIp.includes(',')) {
        clientIp = clientIp.split(',')[0].trim();
    }

    // Rate limiting
    if (!checkRateLimit(clientIp)) {
        return res.status(429).json({ 
            valid: false, 
            error: 'Too many attempts. Please try again later.' 
        });
    }

    if (!key) {
        return res.status(400).json({ valid: false, error: 'Key is required' });
    }

    try {
        // Check if key exists and is not revoked
        const result = await pool.query(
            'SELECT * FROM access_keys WHERE key_code = $1 AND is_revoked = 0',
            [key.toUpperCase()]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ valid: false, error: 'Invalid or revoked key' });
        }

        const row = result.rows[0];

        // Check if key is banned
        if (row.is_banned && row.ban_expires_at && new Date(row.ban_expires_at) > new Date()) {
            return res.status(403).json({
                valid: false,
                banned: true,
                error: 'Your key has been temporarily banned.',
                reason: row.ban_reason || null,
                expiresAt: row.ban_expires_at
            });
        } else if (row.is_banned && (!row.ban_expires_at || new Date(row.ban_expires_at) <= new Date())) {
            // Ban expired, auto-unban
            await pool.query('UPDATE access_keys SET is_banned = 0, ban_reason = NULL, ban_expires_at = NULL, banned_by = NULL WHERE id = $1', [row.id]);
        }
        const adminLevel = Number(row.is_admin) || 0;

        // Check if this is an admin / owner / super owner key
        if (adminLevel >= 1) {
            // Admin-tier keys are reusable; only track last usage metadata.
            await pool.query(
                'UPDATE access_keys SET used_at = NOW(), used_by_ip = $1 WHERE id = $2',
                [clientIp, row.id]
            );
            
            const token = jwt.sign(
                { 
                    keyId: row.id, 
                    keyCode: row.key_code, 
                    isAdmin: true,
                    isOwner: adminLevel >= 2,
                    isSuperOwner: adminLevel === 3,
                    role: adminLevel === 3 ? 'superowner' : adminLevel === 2 ? 'owner' : 'admin'
                },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            return res.json({
                valid: true,
                token: token,
                isAdmin: true,
                isOwner: adminLevel >= 2,
                isSuperOwner: adminLevel === 3,
                role: adminLevel === 3 ? 'superowner' : adminLevel === 2 ? 'owner' : 'admin',
                message: adminLevel === 3 ? 'Super Owner access granted' : adminLevel === 2 ? 'Owner access granted' : 'Admin access granted',
                redirectTo: '/admin.html'
            });
        }

        // For regular keys, check if already used
        if (row.is_used) {
            return res.status(401).json({ valid: false, error: 'Key has already been used' });
        }

        // Mark regular key as used
        await pool.query(
            'UPDATE access_keys SET is_used = 1, used_at = NOW(), used_by_ip = $1 WHERE id = $2',
            [clientIp, row.id]
        );

        // Generate JWT token
        const token = jwt.sign(
            { keyId: row.id, keyCode: row.key_code, isAdmin: false },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            valid: true,
            token: token,
            isAdmin: false,
            message: 'Access granted',
            redirectTo: '/games.html'
        });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ valid: false, error: 'Server error' });
    }
});

// API: Verify session token
app.get('/api/verify-session', async (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ valid: false });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        
        // Check if the key still exists and is not revoked
        const result = await pool.query(
            'SELECT * FROM access_keys WHERE id = $1 AND is_revoked = 0',
            [decoded.keyId]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ valid: false, error: 'Key has been revoked or deleted' });
        }

        const keyRow = result.rows[0];
        if (keyRow.is_banned && keyRow.ban_expires_at && new Date(keyRow.ban_expires_at) > new Date()) {
            return res.status(403).json({
                valid: false,
                banned: true,
                reason: keyRow.ban_reason || null,
                expiresAt: keyRow.ban_expires_at
            });
        } else if (keyRow.is_banned && (!keyRow.ban_expires_at || new Date(keyRow.ban_expires_at) <= new Date())) {
            await pool.query('UPDATE access_keys SET is_banned = 0, ban_reason = NULL, ban_expires_at = NULL, banned_by = NULL WHERE id = $1', [keyRow.id]);
        }
        
        res.json({
            valid: true,
            keyId: decoded.keyId,
            isAdmin: !!decoded.isAdmin,
            isOwner: !!decoded.isOwner,
            isSuperOwner: !!decoded.isSuperOwner,
            role: decoded.role || (decoded.isSuperOwner ? 'superowner' : decoded.isOwner ? 'owner' : decoded.isAdmin ? 'admin' : 'regular')
        });
    } catch (err) {
        res.status(401).json({ valid: false, error: 'Invalid or expired token' });
    }
});

// API: Get games list (protected)
app.get('/api/games', async (req, res) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);

        // Check key still exists and is not revoked
        const keyCheck = await pool.query(
            'SELECT * FROM access_keys WHERE id = $1 AND is_revoked = 0',
            [decoded.keyId]
        );
        if (keyCheck.rows.length === 0) {
            return res.status(401).json({ error: 'Key has been revoked or deleted' });
        }

        // Get broken game IDs
        const brokenResult = await pool.query('SELECT game_id FROM broken_games');
        const brokenIds = new Set(brokenResult.rows.map(r => r.game_id));

        const allGames = [
                { id: 1, title: 'A Small World Cup', url: '/games/a_small_world_cup/', description: 'Fun soccer game!', thumbnail: '/thumbnails/a-small-world-cup.webp', category: 'Sports' },
                { id: 2, title: 'PolyTrack', url: '/games/polytrack/', description: 'Racing game', thumbnail: '/thumbnails/polytrack.webp', category: 'Driving' },
                { id: 3, title: 'Ragdoll Archers', url: '/games/ragdoll_archers/', description: 'Archery game', thumbnail: '/thumbnails/ragdoll-archers.webp', category: 'Action' },
                { id: 4, title: 'Cookie Clicker', url: '/games/cookie-clicker/', description: 'Click a Cookie!', thumbnail: '/thumbnails/cookie-clicker.webp', category: 'Arcade' },
                { id: 5, title: 'Basket Random', url: '/games/basketrandom/', description: 'Random, Fun, Basketball game!', thumbnail: '/thumbnails/basket-random.webp', category: 'Sports' },
                { id: 6, title: 'Retro Bowl College', url: '/games/retrobowlcollege/', description: 'College Football game!', thumbnail: '/thumbnails/retro-bowl-college.webp', category: 'Sports' },
                { id: 7, title: 'Crossy Road', url: '/games/crossyroad/', description: 'Classic Crossy Road game!', thumbnail: '/thumbnails/crossy-road.webp', category: 'Arcade' },
                { id: 8, title: 'Slow Roads', url: '/games/slowroads/', description: 'Zen Driving game!', thumbnail: '/thumbnails/slow-roads.webp', category: 'Driving' },
                { id: 9, title: 'Friday Night Funkin', url: '/games/fridaynightfunkin/', description: 'Music Battle Game!', thumbnail: '/thumbnails/friday-night-funkin.webp', category: 'Music' },
                { id: 10, title: 'Asteroids', url: '/games/asteroids/', description: 'Classic Asteroids game!', thumbnail: '/thumbnails/asteroids.webp', category: 'Arcade' },
                { id: 11, title: 'Space Invaders', url: '/games/spaceinvaders/', description: 'Classic Space Invaders game!', thumbnail: '/thumbnails/space-invaders.webp', category: 'Arcade' },
                { id: 12, title: 'Buckshot Roulette', url: '/games/buckshotroulette/', description: 'Russian Roulette game with a twist!', thumbnail: '/thumbnails/buckshot-roulette.webp', category: 'Action' },
                { id: 13, title: 'Tap Tap Shots', url: '/games/taptapshots/', description: 'Basketball free throw game!', thumbnail: '/thumbnails/tap-tap-shots.webp', category: 'Sports' },
                { id: 14, title: 'Moto X3M', url: '/games/motox3m/', description: 'Classic motorcycle stunt game!', thumbnail: '/thumbnails/motox3m.webp', category: 'Driving' },
                { id: 15, title: 'Moto X3M 2', url: '/games/motox3m2/', description: 'More motorcycle stunts!', thumbnail: '/thumbnails/motox3m2.webp', category: 'Driving' },
                { id: 16, title: 'Moto X3M 3', url: '/games/motox3m3/', description: 'Even more motorcycle madness!', thumbnail: '/thumbnails/motox3m3.webp', category: 'Driving' },
                { id: 17, title: 'Moto X3M Winter', url: '/games/motox3mwinter/', description: 'Motorcycle stunts in the snow!', thumbnail: '/thumbnails/motox3mwinter.webp', category: 'Driving' },
                { id: 18, title: 'Moto X3M Pool Party', url: '/games/motox3mpoolparty/', description: 'Motorcycle stunts at the pool!', thumbnail: '/thumbnails/motox3mpoolparty.webp', category: 'Driving' },
                { id: 19, title: 'Moto X3M Spooky Land', url: '/games/motox3mspookyland/', description: 'Spooky motorcycle stunts!', thumbnail: '/thumbnails/motox3mspookyland.webp', category: 'Driving' },
                { id: 20, title: '8 Ball Pool', url: '/games/8ballpool/', description: 'Classic 8 ball billiards!', thumbnail: '/thumbnails/8ballpool.webp', category: 'Sports' },
                { id: 21, title: 'Soccer Random', url: '/games/soccerrandom/', description: 'Random, fun soccer game!', thumbnail: '/thumbnails/soccerrandom.webp', category: 'Sports' },
                { id: 22, title: 'Snow Rider', url: '/games/snowrider/', description: 'Sled down snowy slopes!', thumbnail: '/thumbnails/snowrider.webp', category: 'Driving' },
                { id: 23, title: 'Basketball Stars', url: '/games/basketballstars/', description: '1v1 basketball battles!', thumbnail: '/thumbnails/basketballstars.webp', category: 'Sports' },
                { id: 24, title: 'Slope', url: '/games/slope/', description: 'Roll down an endless slope!', thumbnail: '/thumbnails/slope.webp', category: 'Arcade' },
                { id: 25, title: 'Gunspin', url: '/games/gunspin/', description: 'An addictive game where you travel as far as possible by shooting a gun!', thumbnail: '/thumbnails/gunspin.webp', category: 'Action'},
                { id: 26, title: 'Ragdoll Hit', url: '/games/ragdollhit/', description: 'Ragdoll Fighting Game!', thumbnail: '/thumbnails/ragdollhit.webp', category: 'Action'},
                { id: 27, title: 'Soccer Skills Euro Cup', url: '/games/soccerskillseurocup/', description: 'Show off your soccer skills in this fun game!', thumbnail: '/thumbnails/soccerskillseurocup.webp', category: 'Sports' }
            
        ];

        const games = allGames.map(game => ({
            ...game,
            broken: brokenIds.has(game.id)
        }));

        res.json({ games });
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Middleware to check admin access
async function requireAdmin(req, res, next) {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        // Check key still exists and is not revoked (super owners can't be revoked but check anyway)
        const keyCheck = await pool.query(
            'SELECT * FROM access_keys WHERE id = $1 AND is_revoked = 0',
            [decoded.keyId]
        );
        if (keyCheck.rows.length === 0) {
            return res.status(401).json({ error: 'Key has been revoked or deleted' });
        }

        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

async function requireSuperOwner(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.substring(7);
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.isSuperOwner) {
            return res.status(403).json({ error: 'Super Owner access required' });
        }
        const keyCheck = await pool.query('SELECT * FROM access_keys WHERE id = $1', [decoded.keyId]);
        if (keyCheck.rows.length === 0) return res.status(401).json({ error: 'Key not found' });
        req.user = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Invalid token' });
    }
}

// ADMIN API: Generate new keys
app.post('/api/admin/keys/generate', requireAdmin, async (req, res) => {
    const { count = 1, isAdmin = false } = req.body;
    const keys = [];
    
    const { isOwnerKey = false } = req.body;
    // Only super owners can generate owner keys
    if (isOwnerKey && !req.user.isSuperOwner) {
        return res.status(403).json({ error: 'Only super owners can generate owner keys' });
    }
    // Only owners+ can generate admin keys
    if (isAdmin && !req.user.isOwner) {
        return res.status(403).json({ error: 'Only owners can generate admin keys' });
    }

    try {
        for (let i = 0; i < Math.min(count, 100); i++) {
            const key = generateKey();
            keys.push(key);
            
            await pool.query(
                'INSERT INTO access_keys (key_code, is_admin) VALUES ($1, $2)',
                [key, isOwnerKey ? 2 : isAdmin ? 1 : 0]
            );
        }

        res.json({ keys, count: keys.length });
    } catch (err) {
        console.error('Error generating keys:', err);
        res.status(500).json({ error: 'Error generating keys' });
    }
});

// ADMIN API: List all keys
app.get('/api/admin/keys', requireAdmin, async (req, res) => {
    try {
        let query;
        
        // Admins can only see regular and admin keys (not owner keys)
        // Owners can see everything
        if (req.user.isSuperOwner) {
            query = 'SELECT * FROM access_keys ORDER BY created_at DESC';
        } else if (req.user.isOwner) {
            query = 'SELECT * FROM access_keys WHERE is_admin <= 2 ORDER BY created_at DESC';
        } else {
            query = 'SELECT * FROM access_keys WHERE is_admin <= 1 ORDER BY created_at DESC';
        }
        
        const result = await pool.query(query);
        res.json({ keys: result.rows });
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Database error' });
    }
});

// ADMIN API: Revoke a key (mark as revoked - blocks access)
app.post('/api/admin/keys/revoke/:id', requireAdmin, async (req, res) => {
    const keyId = req.params.id;
    
    try {
        // First, check what type of key we're trying to revoke
        const checkResult = await pool.query('SELECT is_admin FROM access_keys WHERE id = $1', [keyId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Key not found' });
        }
        
        const targetKeyLevel = checkResult.rows[0].is_admin;
        
        // Admins can only revoke regular keys (is_admin = 0)
        // Owners can revoke regular and admin keys (is_admin <= 1)
        if (!req.user.isOwner && targetKeyLevel >= 1) {
            return res.status(403).json({ error: 'Only owners can revoke admin keys' });
        }
        
        // Super owners can revoke anything except other super owners
        // Owners can revoke regular and admin keys
        // Admins can only revoke regular keys
        if (targetKeyLevel === 3) {
            return res.status(403).json({ error: 'Cannot revoke super owner keys' });
        }
        if (targetKeyLevel === 2 && !req.user.isSuperOwner) {
            return res.status(403).json({ error: 'Only super owners can revoke owner keys' });
        }
        
        const result = await pool.query(
            'UPDATE access_keys SET is_revoked = 1 WHERE id = $1 RETURNING *',
            [keyId]
        );
        
        res.json({ success: true, message: 'Key revoked successfully' });
    } catch (err) {
        console.error('Error revoking key:', err);
        res.status(500).json({ error: 'Error revoking key' });
    }
});

// ADMIN API: Unrevoke a key (restore access)
app.post('/api/admin/keys/unrevoke/:id', requireAdmin, async (req, res) => {
    const keyId = req.params.id;
    
    try {
        // Check what type of key we're trying to unrevoke
        const checkResult = await pool.query('SELECT is_admin FROM access_keys WHERE id = $1', [keyId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Key not found' });
        }
        
        const targetKeyLevel = checkResult.rows[0].is_admin;
        
        // Admins can only unrevoke regular keys
        if (!req.user.isOwner && targetKeyLevel >= 1) {
            return res.status(403).json({ error: 'Only owners can unrevoke admin keys' });
        }
        
        if (targetKeyLevel === 3) {
            return res.status(403).json({ error: 'Cannot unrevoke super owner keys' });
        }
        if (targetKeyLevel === 2 && !req.user.isSuperOwner) {
            return res.status(403).json({ error: 'Only super owners can unrevoke owner keys' });
        }
        
        const result = await pool.query(
            'UPDATE access_keys SET is_revoked = 0 WHERE id = $1 RETURNING *',
            [keyId]
        );
        
        res.json({ success: true, message: 'Key access restored' });
    } catch (err) {
        console.error('Error unrevoking key:', err);
        res.status(500).json({ error: 'Error unrevoking key' });
    }
});

// ADMIN API: Delete a key permanently
app.delete('/api/admin/keys/:id', requireAdmin, async (req, res) => {
    const keyId = req.params.id;
    
    try {
        // Check what type of key we're trying to delete
        const checkResult = await pool.query('SELECT is_admin FROM access_keys WHERE id = $1', [keyId]);
        
        if (checkResult.rows.length === 0) {
            return res.status(404).json({ error: 'Key not found' });
        }
        
        const targetKeyLevel = checkResult.rows[0].is_admin;
        
        // Admins can only delete regular keys
        if (!req.user.isOwner && targetKeyLevel >= 1) {
            return res.status(403).json({ error: 'Only owners can delete admin keys' });
        }
        
        if (targetKeyLevel === 3) {
            return res.status(403).json({ error: 'Cannot delete super owner keys' });
        }
        if (targetKeyLevel === 2 && !req.user.isSuperOwner) {
            return res.status(403).json({ error: 'Only super owners can delete owner keys' });
        }
        
        const result = await pool.query(
            'DELETE FROM access_keys WHERE id = $1 RETURNING *',
            [keyId]
        );
        
        res.json({ success: true, message: 'Key deleted successfully' });
    } catch (err) {
        console.error('Error deleting key:', err);
        res.status(500).json({ error: 'Error deleting key' });
    }
});

// Helper: Generate random key
function generateKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let key = '';
    
    for (let i = 0; i < 16; i++) {
        if (i > 0 && i % 4 === 0) {
            key += '-';
        }
        key += chars[Math.floor(Math.random() * chars.length)];
    }
    
    return key;
}

// ===== B2 PROXY CONFIGURATION =====
const B2_KEY_ID = process.env.B2_APPLICATION_KEY_ID;
const B2_APP_KEY = process.env.B2_APPLICATION_KEY;
const B2_BUCKET_NAME = process.env.B2_BUCKET_NAME || 'game-stuff';

// Authenticate with B2 (removed caching to prevent concurrent request issues)
async function getB2Auth() {
    const credentials = `${B2_KEY_ID}:${B2_APP_KEY}`;
    const base64 = Buffer.from(credentials).toString('base64');

    try {
        const response = await axios.get('https://api.backblazeb2.com/b2api/v2/b2_authorize_account', {
            headers: {
                Authorization: `Basic ${base64}`
            },
            timeout: 10000
        });

        return {
            authToken: response.data.authorizationToken,
            downloadUrl: response.data.downloadUrl
        };
    } catch (error) {
        console.error('B2 authentication failed:', error.message);
        throw new Error('Failed to authenticate with B2');
    }
}

// Proxy endpoint for B2 files
app.get('/api/b2-proxy/*', async (req, res) => {
    try {
        const filename = req.params[0];
        
        console.log(`Proxying B2 file: ${filename}`);
        
        // Get B2 auth
        const auth = await getB2Auth();
        
        // Build file URL
        const fileUrl = `${auth.downloadUrl}/file/${B2_BUCKET_NAME}/${filename}`;
        
        // Fetch file from B2 with auth and increased timeout
        const response = await axios.get(fileUrl, {
            headers: {
                Authorization: auth.authToken
            },
            responseType: 'stream',
            timeout: 120000, // 2 minute timeout for large files
            maxRedirects: 5
        });

        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Content-Type', response.headers['content-type']);
        res.setHeader('Content-Length', response.headers['content-length']);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

        // Add Cross-Origin Isolation headers for Buckshot Roulette (needed for WebAssembly)
        if (filename.startsWith('buckshotroulette/')) {
            res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
            res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        }
        
        // Stream file to client
        response.data.pipe(res);
        
        // Handle stream errors
        response.data.on('error', (error) => {
            console.error('Stream error:', error.message);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Stream error' });
            }
        });
    } catch (error) {
        console.error('B2 proxy error:', error.message);
        
        // Send appropriate error based on status
        const status = error.response?.status || 500;
        const message = status === 403 ? 'B2 authorization failed' : 'Failed to fetch file from B2';
        
        if (!res.headersSent) {
            res.status(status).json({ error: message, details: error.message });
        }
    }
});

// Start server
// ANNOUNCEMENTS API
app.post('/api/admin/announcements', requireAdmin, async (req, res) => {
    if (!req.user.isOwner) {
        return res.status(403).json({ error: 'Only owners can create announcements' });
    }
    
    const { title, message } = req.body;
    try {
        await pool.query(
            'INSERT INTO announcements (title, message, created_by) VALUES ($1, $2, $3)',
            [title, message, req.user.keyCode]
        );
        res.json({ success: true });
    } catch (err) {
        console.error('Error creating announcement:', err);
        res.status(500).json({ error: 'Failed to create announcement' });
    }
});

app.get('/api/announcements', async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM announcements WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1'
        );
        res.json({ announcement: result.rows[0] || null });
    } catch (err) {
        console.error('Error fetching announcements:', err);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

app.get('/api/admin/announcements', requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM announcements ORDER BY created_at DESC');
        res.json({ announcements: result.rows });
    } catch (err) {
        console.error('Error fetching announcements:', err);
        res.status(500).json({ error: 'Failed to fetch announcements' });
    }
});

app.delete('/api/admin/announcements/:id', requireAdmin, async (req, res) => {
    if (!req.user.isOwner) {
        return res.status(403).json({ error: 'Only owners can delete announcements' });
    }
    
    try {
        await pool.query('DELETE FROM announcements WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting announcement:', err);
        res.status(500).json({ error: 'Failed to delete announcement' });
    }
});

// BUG REPORTS API
app.post('/api/bug-reports', async (req, res) => {
    const { title, description, consoleLogs } = req.body;
    const token = req.headers.authorization?.substring(7);
    let reportedBy = 'Anonymous';
    
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            reportedBy = decoded.keyCode;
        } catch (e) {}
    }
    
    try {
        await pool.query(
            'INSERT INTO bug_reports (title, description, console_logs, reported_by) VALUES ($1, $2, $3, $4)',
            [title, description, consoleLogs || null, reportedBy]
        );
        res.json({ success: true, message: 'Bug report submitted successfully' });
    } catch (err) {
        console.error('Error creating bug report:', err);
        res.status(500).json({ error: 'Failed to submit bug report' });
    }
});

// GAME REQUESTS API
app.post('/api/game-requests', async (req, res) => {
    const { gameName, reason } = req.body;
    const token = req.headers.authorization?.substring(7);
    let requestedBy = 'Anonymous';
    
    if (token) {
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            requestedBy = decoded.keyCode;
        } catch (e) {}
    }
    
    try {
        await pool.query(
            'INSERT INTO game_requests (game_name, reason, requested_by) VALUES ($1, $2, $3)',
            [gameName, reason || null, requestedBy]
        );
        res.json({ success: true, message: 'Game request submitted!' });
    } catch (err) {
        console.error('Error creating game request:', err);
        res.status(500).json({ error: 'Failed to submit game request' });
    }
});

app.get('/api/admin/game-requests', requireAdmin, async (req, res) => {
    if (!req.user.isOwner) {
        return res.status(403).json({ error: 'Only owners can view game requests' });
    }
    try {
        const result = await pool.query('SELECT * FROM game_requests ORDER BY created_at DESC');
        res.json({ requests: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch game requests' });
    }
});

app.patch('/api/admin/game-requests/:id', requireAdmin, async (req, res) => {
    if (!req.user.isOwner) {
        return res.status(403).json({ error: 'Only owners can update game requests' });
    }
    const { status } = req.body;
    try {
        await pool.query('UPDATE game_requests SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update game request' });
    }
});

app.delete('/api/admin/game-requests/:id', requireAdmin, async (req, res) => {
    if (!req.user.isOwner) {
        return res.status(403).json({ error: 'Only owners can delete game requests' });
    }
    try {
        await pool.query('DELETE FROM game_requests WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete game request' });
    }
});

app.get('/api/admin/bug-reports', requireAdmin, async (req, res) => {
    if (!req.user.isOwner) {
        return res.status(403).json({ error: 'Only owners can view bug reports' });
    }
    
    try {
        const result = await pool.query('SELECT * FROM bug_reports ORDER BY created_at DESC');
        res.json({ reports: result.rows });
    } catch (err) {
        console.error('Error fetching bug reports:', err);
        res.status(500).json({ error: 'Failed to fetch bug reports' });
    }
});

app.patch('/api/admin/bug-reports/:id', requireAdmin, async (req, res) => {
    if (!req.user.isOwner) {
        return res.status(403).json({ error: 'Only owners can update bug reports' });
    }
    
    const { status } = req.body;
    try {
        await pool.query('UPDATE bug_reports SET status = $1 WHERE id = $2', [status, req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error updating bug report:', err);
        res.status(500).json({ error: 'Failed to update bug report' });
    }
});

app.delete('/api/admin/bug-reports/:id', requireAdmin, async (req, res) => {
    if (!req.user.isOwner) {
        return res.status(403).json({ error: 'Only owners can delete bug reports' });
    }
    
    try {
        await pool.query('DELETE FROM bug_reports WHERE id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting bug report:', err);
        res.status(500).json({ error: 'Failed to delete bug report' });
    }
});

// NICKNAME API
app.patch('/api/admin/keys/:id/nickname', requireAdmin, async (req, res) => {
    const { nickname } = req.body;
    const keyId = req.params.id;
    try {
        // Check target key exists
        const keyCheck = await pool.query('SELECT is_admin FROM access_keys WHERE id = $1', [keyId]);
        if (keyCheck.rows.length === 0) return res.status(404).json({ error: 'Key not found' });
        // Only owner can nickname owner/admin keys
        const targetLevel = keyCheck.rows[0].is_admin;
        if (targetLevel >= 1 && !req.user.isOwner) {
            return res.status(403).json({ error: 'Only owners can nickname admin keys' });
        }
        const trimmed = nickname ? nickname.trim().slice(0, 100) : null;
        await pool.query('UPDATE access_keys SET nickname = $1 WHERE id = $2', [trimmed || null, keyId]);
        res.json({ success: true, nickname: trimmed || null });
    } catch (err) {
        res.status(500).json({ error: 'Failed to update nickname' });
    }
});

// BROKEN GAMES API
app.get('/api/admin/broken-games', requireAdmin, async (req, res) => {
    if (!req.user.isOwner) {
        return res.status(403).json({ error: 'Only owners can manage broken games' });
    }
    try {
        const result = await pool.query('SELECT game_id FROM broken_games');
        res.json({ brokenIds: result.rows.map(r => r.game_id) });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch broken games' });
    }
});

app.post('/api/admin/broken-games/:id', requireAdmin, async (req, res) => {
    if (!req.user.isOwner) {
        return res.status(403).json({ error: 'Only owners can manage broken games' });
    }
    try {
        await pool.query('INSERT INTO broken_games (game_id) VALUES ($1) ON CONFLICT DO NOTHING', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to mark game as broken' });
    }
});

app.delete('/api/admin/broken-games/:id', requireAdmin, async (req, res) => {
    if (!req.user.isOwner) {
        return res.status(403).json({ error: 'Only owners can manage broken games' });
    }
    try {
        await pool.query('DELETE FROM broken_games WHERE game_id = $1', [req.params.id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to unmark game as broken' });
    }
});

// Public maintenance message endpoint
app.get('/api/maintenance-message', async (req, res) => {
    try {
        const result = await pool.query('SELECT message FROM maintenance WHERE id = 1');
        res.json({ message: result.rows[0]?.message || 'Site is under maintenance.' });
    } catch (err) {
        res.json({ message: 'Site is under maintenance.' });
    }
});

// MAINTENANCE API
app.get('/api/admin/maintenance', requireSuperOwner, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM maintenance WHERE id = 1');
        res.json({ maintenance: result.rows[0] });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch maintenance status' });
    }
});

app.post('/api/admin/maintenance', requireSuperOwner, async (req, res) => {
    const { isActive, mode, message } = req.body;
    try {
        await pool.query(
            'UPDATE maintenance SET is_active = $1, mode = $2, message = $3, activated_at = NOW(), activated_by = $4 WHERE id = 1',
            [isActive ? 1 : 0, mode || 'page', message || 'Site is under maintenance. Check back soon!', req.user.keyCode]
        );
        // If mode is shutdown, exit after responding
        if (isActive && mode === 'shutdown') {
            res.json({ success: true, message: 'Site shutting down...' });
            setTimeout(() => process.exit(0), 1000);
        } else {
            res.json({ success: true });
        }
    } catch (err) {
        res.status(500).json({ error: 'Failed to update maintenance' });
    }
});

// Super owner bypass token endpoint
app.get('/api/admin/so-bypass', requireSuperOwner, async (req, res) => {
    const bypassToken = jwt.sign({ isSuperOwner: true }, JWT_SECRET, { expiresIn: '1h' });
    res.json({ bypassToken });
});

// KEY BAN API (super owner only)
app.get('/api/admin/bans', requireSuperOwner, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, key_code, nickname, is_admin, ban_reason, ban_expires_at, banned_by FROM access_keys WHERE is_banned = 1 ORDER BY ban_expires_at DESC'
        );
        res.json({ bans: result.rows });
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch bans' });
    }
});

app.post('/api/admin/bans/:id', requireSuperOwner, async (req, res) => {
    const { reason, duration, unit } = req.body;
    const keyId = req.params.id;
    if (!duration || !unit) return res.status(400).json({ error: 'Duration and unit required' });

    const units = { minutes: 'minute', hours: 'hour', days: 'day' };
    if (!units[unit]) return res.status(400).json({ error: 'Invalid unit' });

    try {
        const keyCheck = await pool.query('SELECT is_admin FROM access_keys WHERE id = $1', [keyId]);
        if (keyCheck.rows.length === 0) return res.status(404).json({ error: 'Key not found' });
        if (keyCheck.rows[0].is_admin === 3) return res.status(403).json({ error: 'Cannot ban super owner keys' });

        await pool.query(
            `UPDATE access_keys SET is_banned = 1, ban_reason = $1, ban_expires_at = NOW() + ($2 || ' ' || $3)::interval, banned_by = $4 WHERE id = $5`,
            [reason || null, duration, units[unit], req.user.keyCode, keyId]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to ban key' });
    }
});

app.delete('/api/admin/bans/:id', requireSuperOwner, async (req, res) => {
    try {
        await pool.query(
            'UPDATE access_keys SET is_banned = 0, ban_reason = NULL, ban_expires_at = NULL, banned_by = NULL WHERE id = $1',
            [req.params.id]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to unban key' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Visit http://localhost:${PORT} to test the key entry page');
});
