const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  host: 'db.ieqxqxaifwhbusczgusq.supabase.co',
  port: 5432,
  user: 'postgres',
  password: '@@9Swq!Uws%3kFu',
  database: 'postgres',
  ssl: {
    rejectUnauthorized: false
  }
});

async function runSetup() {
  try {
    console.log('🔄 Connecting to Supabase PostgreSQL...');
    await client.connect();
    console.log('✅ Connected!');

    const sqlPath = path.join(__dirname, '..', 'supabase_schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔄 Executing SQL Schema...');
    await client.query(sql);
    console.log('✅ SQL Schema executed successfully!');

  } catch (err) {
    console.error('❌ Error executing setup:', err.message);
    if (err.detail) console.error('Detail:', err.detail);
    if (err.hint) console.error('Hint:', err.hint);
  } finally {
    await client.end();
    console.log('👋 Disconnected.');
  }
}

runSetup();
