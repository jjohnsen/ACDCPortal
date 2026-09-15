const readline = require('readline');
const { loadLocalSettings } = require('./load-local-settings');

loadLocalSettings();

const { getPool, closePool, DB_SERVER, DB_NAME } = require('../api/src/shared/sql');

const TABLES_TO_CLEAR = [
    { name: 'ScheduledRunCampaigns', note: 'child of ScheduledRuns' },
    { name: 'EmailDeliveries',       note: '' },
    { name: 'EmailLog',              note: '' },
    { name: 'BadgeClaims',           note: 'child of EventBadges/Badges' },
    { name: 'ScheduledRuns',         note: '' },
    { name: 'Invitations',           note: '' },
    { name: 'Participations',        note: '' },
    { name: 'InterestLeads',         note: '' },
    { name: 'InterestQueue',         note: '' },
    { name: 'SoloQueue',             note: '' },
];

function assertSafeTarget() {
    if (!['local', 'test'].includes(process.env.ACDC_ENV)) {
        throw new Error('Set ACDC_ENV to local or test before resetting data. Production is blocked by this script.');
    }
    if (process.env.ACDC_ENV === 'local' && !process.env.SQL_CONNECTION_STRING) {
        throw new Error('Local reset requires SQL_CONNECTION_STRING.');
    }
}

async function confirm(question) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise(resolve => {
        rl.question(question, answer => {
            rl.close();
            resolve(answer.trim().toLowerCase());
        });
    });
}

async function run() {
    assertSafeTarget();
    console.log('\n=== ACDC Portal: Transactional Data Reset ===\n');
    console.log('This will DELETE all rows from:');
    TABLES_TO_CLEAR.forEach(t => console.log(`  - ${t.name}${t.note ? ' (' + t.note + ')' : ''}`));
    console.log('  - Teams (after nulling Events.CommitteeTeamId/JudgesTeamId and Users.TeamId)\n');
    console.log('Preserved: Events, Users, EmailCampaigns, Sequences, Badges, EventBadges, SystemEmailConfig\n');

    const answer = await confirm('Type "yes" to proceed: ');
    if (answer !== 'yes') {
        console.log('Aborted.');
        process.exit(0);
    }

    const target = process.env.SQL_CONNECTION_STRING ? 'SQL_CONNECTION_STRING' : `${DB_SERVER}/${DB_NAME}`;
    console.log(`\nConnecting to ${target}...`);
    const pool = await getPool();
    console.log('Connected!\n');

    try {
        for (const { name } of TABLES_TO_CLEAR) {
            const result = await pool.request().query(`DELETE FROM [${name}]`);
            console.log(`  ✓ Cleared ${name} (${result.rowsAffected[0]} rows deleted)`);
        }

        const eventsResult = await pool.request().query(
            `UPDATE Events SET CommitteeTeamId = NULL, JudgesTeamId = NULL
             WHERE CommitteeTeamId IS NOT NULL OR JudgesTeamId IS NOT NULL`
        );
        console.log(`  ✓ Nulled Events.CommitteeTeamId/JudgesTeamId (${eventsResult.rowsAffected[0]} rows updated)`);

        const usersResult = await pool.request().query(
            `UPDATE Users SET TeamId = NULL WHERE TeamId IS NOT NULL`
        );
        console.log(`  ✓ Nulled Users.TeamId legacy field (${usersResult.rowsAffected[0]} rows updated)`);

        const teamsResult = await pool.request().query(`DELETE FROM Teams`);
        console.log(`  ✓ Cleared Teams (${teamsResult.rowsAffected[0]} rows deleted)`);

        console.log('\nDone. Database reset to clean state for testing.\n');
    } catch (err) {
        console.error('\nERROR:', err.message);
        process.exit(1);
    } finally {
        await closePool();
    }
}

run().catch(err => {
    console.error('Fatal error:', err.message);
    process.exit(1);
});
