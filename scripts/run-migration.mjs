import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase connection - using the direct connection (not pooler)
const connectionString = 'postgresql://postgres.rjruutltwmvlhckmajim:BTBai2025!@aws-0-us-east-1.pooler.supabase.com:5432/postgres';

async function runMigration() {
  const client = new pg.Client({ connectionString });

  try {
    console.log('Connecting to Supabase...');
    await client.connect();
    console.log('Connected!');

    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '00001_initial_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration...');
    await client.query(sql);
    console.log('Migration completed successfully!');

  } catch (error) {
    console.error('Migration failed:', error.message);
    if (error.message.includes('already exists')) {
      console.log('Some objects already exist - this may be OK if running migration again.');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
