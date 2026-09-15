const fs = require('fs');
const path = require('path');
const { loadLocalSettings } = require('./load-local-settings');

loadLocalSettings();

const { getPool, closePool, sql, DB_SERVER, DB_NAME } = require('../api/src/shared/sql');

async function ensureLocalDatabase() {
    if (process.env.ACDC_ENV !== 'local' || !process.env.SQL_CONNECTION_STRING) return;

    const match = process.env.SQL_CONNECTION_STRING.match(/(?:Database|Initial Catalog)\s*=\s*([^;]+)/i);
    if (!match) {
        throw new Error('SQL_CONNECTION_STRING must include Database for the local stack');
    }

    const database = match[1].trim();
    const masterConnectionString = process.env.SQL_CONNECTION_STRING.replace(match[0], 'Database=master');
    const masterPool = new sql.ConnectionPool(masterConnectionString);
    await masterPool.connect();
    try {
        await masterPool.request()
            .input('database', sql.NVarChar(128), database)
            .query("IF DB_ID(@database) IS NULL EXEC('CREATE DATABASE ' + QUOTENAME(@database))");
        console.log(`Local database '${database}' is ready.`);
    } finally {
        await masterPool.close();
    }
}

function assertSafeTarget() {
    if (!['local', 'test'].includes(process.env.ACDC_ENV)) {
        throw new Error('Set ACDC_ENV to local or test before applying database schema. Production is blocked by this script.');
    }
    if (process.env.ACDC_ENV === 'local' && !process.env.SQL_CONNECTION_STRING) {
        throw new Error('Local schema setup requires SQL_CONNECTION_STRING.');
    }
}

async function run() {
    assertSafeTarget();
    await ensureLocalDatabase();
    const target = process.env.SQL_CONNECTION_STRING ? 'SQL_CONNECTION_STRING' : `${DB_SERVER}/${DB_NAME}`;
    console.log(`Connecting to ${target}...`);
    const pool = await getPool();
    console.log('Connected!');

    const sqlFile = fs.readFileSync(path.join(__dirname, 'create-tables.sql'), 'utf8');

    const batches = sqlFile.split(/^\s*GO\s*$/im).filter(b => b.trim());

    let batchNum = 0;
    for (const batch of batches) {
        batchNum++;
        if (!batch.trim()) continue;
        try {
            await pool.request().query(batch);
            const tableMatch = batch.match(/CREATE TABLE (\w+)/i);
            if (tableMatch) {
                console.log(`  ✓ ${tableMatch[1]}`);
            }
        } catch (err) {
            if (err.message.includes('already exists') || err.message.includes('There is already')) {
                const tableMatch = batch.match(/CREATE TABLE (\w+)/i);
                console.log(`  ⏭ ${tableMatch ? tableMatch[1] : 'batch ' + batchNum} (already exists)`);
            } else {
                console.error(`  ✗ Batch ${batchNum} failed:`, err.message);
            }
        }
    }

    const result = await pool.request().query(
        "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
    );
    console.log(`\n=== ${result.recordset.length} tables in database ===`);
    result.recordset.forEach(r => console.log(`  • ${r.TABLE_NAME}`));

    await closePool();
}

run().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
