require('dotenv').config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || '010203',
      database: process.env.DB_NAME || 'pro_invest_db',
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },

  production: {
    client: 'pg',
    connection: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASS || '010203',
      database: process.env.DB_NAME || 'pro_invest_db',
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
    },
    seeds: {
      directory: './seeds',
    },
  },
};


// Hammasini o'chirish

// npx knex migrate:rollback --all

// Qayta qo'shish

// npx knex migrate:latest

// flushall - redis full delete

// npx knex seed:run

// psql -U postgres -h localhost -p 5433 -d postgres

