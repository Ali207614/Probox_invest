exports.up = async function(knex) {
    await knex.schema.createTable('notifications', (table) => {
        table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
        table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
        table.string('title').notNullable();
        table.text('body').notNullable();
        table.enum('type', ['TRANSACTION', 'SYSTEM', 'EVENT']).notNullable();
        table.boolean('is_read').notNullable().defaultTo(false);
        table.jsonb('data')
        table.timestamp('created_at').defaultTo(knex.fn.now());
    })
};

exports.down = async function(knex) {
    await knex.schema.dropTable('notifications');
};
