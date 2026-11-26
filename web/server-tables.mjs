// Stable Cloudflare table names and column order, retained during the Postgres move.
export const serverTables = {
 tickets: {columns: ['id','owner','run_id','name','role','rules','started','expires','used','score','month'], key:['id']},
 scores: {columns:['month','owner','name','best','total','runs','best_at','updated','rules'],key:['month','owner']},
 score_months: {columns:['month'],key:['month']},
 security_migrations: {columns:['id'],key:['id']},
 verified_players: {columns:['owner','public_id','profile','updated'],key:['owner']},
 verified_runs: {columns:['id','owner','snapshot','sequence','frames','started','last_feed','expires','used','last_hash','last_reply'],key:['id']},
 verified_scores: {columns:['month','rules','owner','public_id','name','best','total','runs','best_at','updated'],key:['month','rules','owner']},
 verified_months: {columns:['month','rules'],key:['month','rules']},
 verified_registrations: {columns:['source','day','hits'],key:['source','day']}
};
