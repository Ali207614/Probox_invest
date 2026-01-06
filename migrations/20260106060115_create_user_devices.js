exports.up = async function(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.string('device_fcm_token').notNullable();
    table.enu('device_type', ['ios', 'android']).notNullable();
  });
};

exports.down = async function(knex) {
  await knex.schema.alterTable('users', (table) => {
    table.dropColumn('device_fcm_token');
    table.dropColumn('device_type');
  });
};
