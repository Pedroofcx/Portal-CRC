/**
 * Compatibilidade. O cliente real agora é o adaptador em src/api/db.js.
 * Este arquivo existe só para não quebrar importações antigas.
 */
export { db, base44, entities, auth, integrations, supabase } from './db';
export { default } from './db';
