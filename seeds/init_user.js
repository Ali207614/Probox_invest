/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */

exports.seed = async function(knex) {
    await knex('users').insert({
        first_name: 'Umid',
        last_name: 'Abdukarimov',
        phone_main: '+998901234567',
        phone_secondary: '+998901234567',
        phone_verified: true,
        verification_code: '123456',
        password: '$2a$10$n.m6lM3fG9.y1Rz6O9O1.Oe7O/mP3B6r0p1n.P9W9v.P9W/P9W/P9', // password123
        is_protected: false,
        sap_card_code: 'C00001',
        sap_card_name: 'Umin Abdukarimov',
        passport_series: 'AA',
        birth_date: '1995-05-15',
        id_card_number: '1234567',
        language: 'uz',
        is_active: true,
        status: 'Open',
        device_token: 'dftD4QbqTIyqgutFhVRgKz:APA91bH19ZINBGIY3MfSQeSS6SAS6I-xmBwIk-Xvy-PFOPyAJzkVJAkUPzlOb8kN2x3_FemgEBxOlMh3gsODCOPhux0eS-iyAfVsxWpC8Xrop0YDjOtaHQo'
    })
}