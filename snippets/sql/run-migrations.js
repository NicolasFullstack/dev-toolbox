import { createHash } from 'node:crypto';

export class MigrationHistoryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'MigrationHistoryError';
  }
}

function checksum(sql) {
  return createHash('sha256').update(sql, 'utf8').digest('hex');
}

function normalizeMigrations(migrations) {
  if (!Array.isArray(migrations)) {
    throw new TypeError('migrations doit être un tableau.');
  }

  let previousVersion = 0;

  return migrations.map((migration) => {
    if (migration === null || typeof migration !== 'object') {
      throw new TypeError('Chaque migration doit être un objet.');
    }

    const { version, name, sql } = migration;
    if (!Number.isSafeInteger(version) || version <= previousVersion) {
      throw new TypeError('Les versions doivent être des entiers positifs strictement croissants.');
    }
    if (typeof name !== 'string' || !/^[a-z0-9][a-z0-9_-]{1,79}$/.test(name)) {
      throw new TypeError('Le nom doit contenir 2 à 80 caractères sûrs.');
    }
    if (typeof sql !== 'string' || sql.trim().length === 0) {
      throw new TypeError('Le SQL d’une migration ne peut pas être vide.');
    }

    previousVersion = version;
    return { version, name, sql, checksum: checksum(sql) };
  });
}

export function applyMigrations(database, migrations) {
  if (!database || typeof database.exec !== 'function' || typeof database.prepare !== 'function') {
    throw new TypeError('Une connexion SQLite valide est nécessaire.');
  }

  const catalogue = normalizeMigrations(migrations);
  database.exec('BEGIN IMMEDIATE');

  try {
    database.exec(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY CHECK (version > 0),
        name TEXT NOT NULL,
        checksum TEXT NOT NULL CHECK (length(checksum) = 64),
        applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const recorded = database.prepare(`
      SELECT version, name, checksum
      FROM schema_migrations
      ORDER BY version
    `).all();
    const byVersion = new Map(catalogue.map((migration) => [migration.version, migration]));

    for (const row of recorded) {
      const expected = byVersion.get(row.version);
      if (!expected) {
        throw new MigrationHistoryError(`La migration ${row.version} manque au catalogue.`);
      }
      if (expected.name !== row.name || expected.checksum !== row.checksum) {
        throw new MigrationHistoryError(`La migration ${row.version} a été modifiée après application.`);
      }
    }

    const appliedVersions = new Set(recorded.map(({ version }) => version));
    const latestAppliedVersion = recorded.at(-1)?.version ?? 0;
    const lateMigration = catalogue.find(
      ({ version }) => !appliedVersions.has(version) && version < latestAppliedVersion,
    );
    if (lateMigration) {
      throw new MigrationHistoryError(
        `La migration ${lateMigration.version} ne peut pas être insérée avant une version déjà appliquée.`,
      );
    }

    const insertHistory = database.prepare(`
      INSERT INTO schema_migrations (version, name, checksum)
      VALUES (?, ?, ?)
    `);
    const applied = [];

    for (const migration of catalogue) {
      if (appliedVersions.has(migration.version)) {
        continue;
      }

      database.exec(migration.sql);
      insertHistory.run(migration.version, migration.name, migration.checksum);
      applied.push(migration.version);
    }

    database.exec('COMMIT');
    return applied;
  } catch (error) {
    database.exec('ROLLBACK');
    throw error;
  }
}
