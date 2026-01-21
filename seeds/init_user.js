const bcrypt = require('bcryptjs');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.seed = async function (knex) {
    // Deletes ALL existing entries in the admins table if needed
    // await knex('admins').del();

    const hashedPassword = await bcrypt.hash('password123', 10);

    // Check if admin already exists
    const existingAdmin = await knex('users').where({ phone_main: '+998999876543' }).first();

    if (!existingAdmin) {
        await knex('users').insert({
            first_name: 'Super',
            last_name: 'Admin',
            phone_main: '+998999876543',
            phone_verified: true,
            password: hashedPassword,
            is_protected: true,
            language: 'uz',
            is_active: true,
            is_admin: false,
            status: 'Open',
            device_token: 'super_admin_device_token_placeholder'
        });
        console.log('✅ Super Admin created successfully');
    } else {
        console.log('ℹ️ Super Admin already exists');
    }
};
