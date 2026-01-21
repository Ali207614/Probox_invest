exports.up = async function (knex) {
  await knex.raw('CREATE EXTENSION IF NOT EXISTS "pgcrypto";');

  await knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    table.string('first_name');
    table.string('last_name');
    table.string('phone_main').notNullable();
    table.string('phone_secondary').nullable();
    table.boolean('phone_verified').defaultTo(false);
    table.string('verification_code');
    table.string('password');
    table.boolean('is_protected').defaultTo(false);
    table.string('sap_card_code').nullable().index().unique();
    table.string('sap_phone_number');
    table.string('sap_card_name')
    table.string('passport_series');
    table.date('birth_date');
    table.string('id_card_number');
    table.string('language').defaultTo('uz');

    table.boolean('is_active').defaultTo(true);
    table.enu('status', ['Pending', 'Open', 'Deleted', 'Banned']).defaultTo('Open');
    table.text('profile_picture', 255).nullable()
    table.string('device_token');
    table.boolean('is_admin').defaultTo(false);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

  });
};

exports.down = async function (knex) {
  await knex.schema.dropTableIfExists('users');
};
