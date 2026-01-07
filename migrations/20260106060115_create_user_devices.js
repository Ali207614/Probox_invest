exports.up = async function(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.string('device_token').notNullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('device_token');
  });
};
