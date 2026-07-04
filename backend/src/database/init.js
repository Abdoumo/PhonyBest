/**
 * Database initialization script
 * Creates all tables for the Flexy GSM platform
 */
const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const createTables = async () => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE,
        password VARCHAR(255) NOT NULL,
        full_name VARCHAR(100),
        phone VARCHAR(20),
        role VARCHAR(20) NOT NULL DEFAULT 'CLIENT' CHECK (role IN ('ADMIN','SUPER_GRO','GRO','COMMERCANT','CLIENT')),
        usb_key VARCHAR(255),
        wallet DECIMAL(12,2) DEFAULT 0.00,
        debt DECIMAL(12,2) DEFAULT 0.00,
        debt_limit DECIMAL(12,2) DEFAULT 0.00,
        profit_percentage DECIMAL(5,2) DEFAULT 0.00,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','suspended','blocked','pending')),
        parent_id INTEGER REFERENCES users(id),
        permissions TEXT DEFAULT '{}',
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Refresh tokens table
    await client.query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        token VARCHAR(500) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Session logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS session_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        ip_address VARCHAR(45),
        user_agent TEXT,
        action VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Transactions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transactions (
        id SERIAL PRIMARY KEY,
        type VARCHAR(30) NOT NULL CHECK (type IN ('flexy','idoom','card','wallet_add','wallet_remove','transfer','debt')),
        operator VARCHAR(20),
        phone_number VARCHAR(20),
        amount DECIMAL(12,2) NOT NULL,
        cost DECIMAL(12,2) DEFAULT 0.00,
        profit DECIMAL(12,2) DEFAULT 0.00,
        offer VARCHAR(50),
        sim_used VARCHAR(50),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','processing','success','failed','cancelled')),
        error_message TEXT,
        client_id INTEGER REFERENCES users(id),
        processed_by INTEGER REFERENCES users(id),
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Cards table
    await client.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id SERIAL PRIMARY KEY,
        serial VARCHAR(100) NOT NULL,
        pin VARCHAR(100),
        operator VARCHAR(20) NOT NULL,
        value DECIMAL(10,2) NOT NULL,
        category VARCHAR(50),
        status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available','sold','reserved','expired')),
        sold_to INTEGER REFERENCES users(id),
        sold_at TIMESTAMP,
        uploaded_by INTEGER REFERENCES users(id),
        batch_id VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);


    // Commissions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS commissions (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        service VARCHAR(30) NOT NULL,
        operator VARCHAR(20),
        percentage DECIMAL(5,2) NOT NULL DEFAULT 0.00,
        fixed_amount DECIMAL(10,2) DEFAULT 0.00,
        active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, service, operator)
      );
    `);

    // Transfers table
    await client.query(`
      CREATE TABLE IF NOT EXISTS transfers (
        id SERIAL PRIMARY KEY,
        from_user INTEGER REFERENCES users(id),
        to_user INTEGER REFERENCES users(id),
        amount DECIMAL(12,2) NOT NULL,
        type VARCHAR(20) DEFAULT 'transfer' CHECK (type IN ('transfer','deposit','withdrawal','debt_payment')),
        proof_url VARCHAR(500),
        notes TEXT,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','completed')),
        approved_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // SIM cards management
    await client.query(`
      CREATE TABLE IF NOT EXISTS sim_cards (
        id SERIAL PRIMARY KEY,
        phone_number VARCHAR(20) NOT NULL,
        operator VARCHAR(20) NOT NULL,
        port VARCHAR(50),
        dongle_id VARCHAR(50),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','error','maintenance')),
        daily_limit DECIMAL(12,2) DEFAULT 50000.00,
        daily_used DECIMAL(12,2) DEFAULT 0.00,
        last_used TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Advertisements table
    await client.query(`
      CREATE TABLE IF NOT EXISTS advertisements (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT,
        image_url VARCHAR(500),
        link_url VARCHAR(500),
        position VARCHAR(30) DEFAULT 'dashboard',
        active BOOLEAN DEFAULT true,
        starts_at TIMESTAMP,
        ends_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Notifications table
    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200),
        message TEXT,
        type VARCHAR(30) DEFAULT 'info',
        read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Settings table
    await client.query(`
      CREATE TABLE IF NOT EXISTS settings (
        id SERIAL PRIMARY KEY,
        key VARCHAR(100) UNIQUE NOT NULL,
        value TEXT,
        category VARCHAR(50) DEFAULT 'general',
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Audit logs table
    await client.query(`
      CREATE TABLE IF NOT EXISTS audit_logs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        old_value JSONB,
        new_value JSONB,
        ip_address VARCHAR(45),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // USB auth keys table
    await client.query(`
      CREATE TABLE IF NOT EXISTS usb_auth_keys (
        id SERIAL PRIMARY KEY,
        user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        usb_serial VARCHAR(255),
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','revoked')),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // USB sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS usb_sessions (
        id SERIAL PRIMARY KEY,
        session_id VARCHAR(255) UNIQUE NOT NULL,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        usb_serial VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','expired')),
        last_heartbeat TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        ended_at TIMESTAMP
      );
    `);

    // WSS ModemGrid Nodes
    await client.query(`
      CREATE TABLE IF NOT EXISTS wss_nodes (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        token_hash VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online','offline','error')),
        ip_address VARCHAR(45),
        last_seen TIMESTAMP,
        dongle_count INTEGER DEFAULT 0,
        online_count INTEGER DEFAULT 0,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // WSS Dongles (live state synced from nodes)
    await client.query(`
      CREATE TABLE IF NOT EXISTS wss_dongles (
        id SERIAL PRIMARY KEY,
        node_id INTEGER REFERENCES wss_nodes(id) ON DELETE CASCADE,
        dongle_id VARCHAR(100) NOT NULL,
        name VARCHAR(200),
        operator VARCHAR(50),
        online BOOLEAN DEFAULT false,
        balance DECIMAL(12,2),
        pool_ids INTEGER[],
        last_updated TIMESTAMP DEFAULT NOW(),
        UNIQUE(node_id, dongle_id)
      );
    `);

    // WSS Pools (live state synced from nodes)
    await client.query(`
      CREATE TABLE IF NOT EXISTS wss_pools (
        id SERIAL PRIMARY KEY,
        node_id INTEGER REFERENCES wss_nodes(id) ON DELETE CASCADE,
        pool_id INTEGER NOT NULL,
        name VARCHAR(200),
        dongle_count INTEGER DEFAULT 0,
        online_count INTEGER DEFAULT 0,
        total_balance DECIMAL(12,2) DEFAULT 0,
        highest_balance DECIMAL(12,2) DEFAULT 0,
        api_names TEXT[] DEFAULT '{}',
        last_updated TIMESTAMP DEFAULT NOW(),
        UNIQUE(node_id, pool_id)
      );
    `);

    // WSS Request Queue
    await client.query(`
      CREATE TABLE IF NOT EXISTS wss_request_queue (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER REFERENCES transactions(id),
        node_id INTEGER REFERENCES wss_nodes(id),
        api_name VARCHAR(100) NOT NULL,
        variables JSONB DEFAULT '{}',
        status VARCHAR(20) DEFAULT 'queued' CHECK (status IN ('queued','sent','completed','failed','timeout')),
        request_id VARCHAR(255),
        result TEXT,
        error TEXT,
        modem_id VARCHAR(100),
        sent_at TIMESTAMP,
        completed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // WSS Request Log (completed history)
    await client.query(`
      CREATE TABLE IF NOT EXISTS wss_request_log (
        id SERIAL PRIMARY KEY,
        transaction_id INTEGER,
        node_id INTEGER,
        node_name VARCHAR(100),
        api_name VARCHAR(100),
        variables JSONB DEFAULT '{}',
        status VARCHAR(20),
        request_id VARCHAR(255),
        result TEXT,
        error TEXT,
        modem_id VARCHAR(100),
        duration_ms INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // WSS Events (audit log)
    await client.query(`
      CREATE TABLE IF NOT EXISTS wss_events (
        id SERIAL PRIMARY KEY,
        node_id INTEGER,
        node_name VARCHAR(100),
        event_type VARCHAR(50) NOT NULL,
        message TEXT,
        metadata JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_client ON transactions(client_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(created_at);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cards_status ON cards(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_cards_operator ON cards(operator);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_usb_sessions_user ON usb_sessions(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_usb_sessions_status ON usb_sessions(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_usb_auth_keys_user ON usb_auth_keys(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wss_nodes_status ON wss_nodes(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wss_dongles_node ON wss_dongles(node_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wss_dongles_operator ON wss_dongles(operator);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wss_pools_node ON wss_pools(node_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wss_queue_status ON wss_request_queue(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wss_queue_request_id ON wss_request_queue(request_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wss_events_node ON wss_events(node_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_wss_events_date ON wss_events(created_at);`);

    // Create default admin user
    const adminExists = await client.query(`SELECT id FROM users WHERE username = 'admin'`);
    if (adminExists.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('admin123', 12);
      await client.query(`
        INSERT INTO users (username, email, password, full_name, role, wallet, status)
        VALUES ('admin', 'admin@flexygsm.com', $1, 'System Administrator', 'ADMIN', 999999.00, 'active')
      `, [hashedPassword]);
      console.log('✅ Default admin created (admin / admin123)');
    }

    // Database migrations for existing setups
    try {
      await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)`);
      console.log('✅ Migrations applied successfully');
    } catch (e) {
      console.log('⚠️ Migration note:', e.message);
    }

    await client.query('COMMIT');
    console.log('✅ All tables created successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating tables:', err);
    throw err;
  } finally {
    client.release();
  }
};

// Run if called directly
if (require.main === module) {
  createTables()
    .then(() => {
      console.log('✅ Database initialization complete');
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Database initialization failed:', err);
      process.exit(1);
    });
}

module.exports = { createTables };
