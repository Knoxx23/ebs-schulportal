"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../database");
// German test data
const germanFirstNames = ['Anna', 'Benjamin', 'Charlotte', 'David', 'Emma', 'Felix', 'Greta', 'Heinrich'];
const germanLastNames = ['Müller', 'Schmidt', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Schulz'];
const germanStreets = ['Hauptstraße', 'Parkweg', 'Schulstraße', 'Bahnhofstraße', 'Gartenweg', 'Lindenallee'];
const germanCities = ['München', 'Berlin', 'Hamburg', 'Köln', 'Frankfurt', 'Stuttgart', 'Düsseldorf', 'Nürnberg'];
function generateRandomDate(startYear, endYear) {
    const year = startYear + Math.floor(Math.random() * (endYear - startYear + 1));
    const month = String(Math.floor(Math.random() * 12) + 1).padStart(2, '0');
    const day = String(Math.floor(Math.random() * 28) + 1).padStart(2, '0');
    return `${year}-${month}-${day}`;
}
function getRandomElement(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
function generateToken() {
    return Buffer.from(Date.now() + Math.random().toString()).toString('hex').substring(0, 32);
}
function generateCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}
async function seed() {
    await (0, database_1.initDatabase)();
    // Check if seed has already run
    const existingTeacher = database_1.db.prepare('SELECT id FROM users WHERE email = ?').get('teacher1@schule.de');
    if (existingTeacher) {
        console.log('Seed already run - skipping');
        return;
    }
    console.log('Starting seed...');
    const hashPassword = (pwd) => bcryptjs_1.default.hashSync(pwd, 12);
    // 1. Create test users
    const teacherPwd = hashPassword('TestLehrer123!');
    const sekPwd = hashPassword('TestSek123!');
    const schulPwd = hashPassword('TestSchul123!');
    const teacherIds = [];
    database_1.db.prepare(`
    INSERT INTO users (email, password_hash, name, role, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run('teacher1@schule.de', teacherPwd, 'Anna Müller', 'teacher');
    teacherIds.push(database_1.db.prepare('SELECT id FROM users WHERE email = ?').get('teacher1@schule.de').id);
    database_1.db.prepare(`
    INSERT INTO users (email, password_hash, name, role, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run('teacher2@schule.de', teacherPwd, 'Benjamin Schmidt', 'teacher');
    teacherIds.push(database_1.db.prepare('SELECT id FROM users WHERE email = ?').get('teacher2@schule.de').id);
    database_1.db.prepare(`
    INSERT INTO users (email, password_hash, name, role, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run('teacher3@schule.de', teacherPwd, 'Charlotte Fischer', 'teacher');
    teacherIds.push(database_1.db.prepare('SELECT id FROM users WHERE email = ?').get('teacher3@schule.de').id);
    database_1.db.prepare(`
    INSERT INTO users (email, password_hash, name, role, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run('sekretariat@schule.de', sekPwd, 'Diana Weber', 'secretary');
    database_1.db.prepare(`
    INSERT INTO users (email, password_hash, name, role, is_active)
    VALUES (?, ?, ?, ?, 1)
  `).run('schulleitung@schule.de', schulPwd, 'Ernst Meyer', 'principal');
    console.log('✓ Created 5 test users (3 teachers, 1 secretary, 1 principal)');
    // 2. Create 15 invitations with different statuses
    const invitationIds = [];
    const classes = ['1a', '1b', '1c'];
    // 5 pending
    for (let i = 0; i < 5; i++) {
        const childFirstName = getRandomElement(germanFirstNames);
        const childLastName = getRandomElement(germanLastNames);
        const token = generateToken();
        const code = generateCode();
        const createdBy = getRandomElement(teacherIds);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        database_1.db.prepare(`
      INSERT INTO invitations (token, code, child_last_name, child_first_name, class_ref, status, created_by, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, 'pending', ?, datetime('now'), ?)
    `).run(token, code, childLastName, childFirstName, getRandomElement(classes), createdBy, expiresAt);
        const inv = database_1.db.prepare('SELECT id FROM invitations WHERE token = ?').get(token);
        invitationIds.push(inv.id);
    }
    // 5 activated
    for (let i = 0; i < 5; i++) {
        const childFirstName = getRandomElement(germanFirstNames);
        const childLastName = getRandomElement(germanLastNames);
        const token = generateToken();
        const code = generateCode();
        const createdBy = getRandomElement(teacherIds);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        database_1.db.prepare(`
      INSERT INTO invitations (token, code, child_last_name, child_first_name, class_ref, status, created_by, created_at, expires_at, activated_at)
      VALUES (?, ?, ?, ?, ?, 'activated', ?, datetime('now'), ?, datetime('now', '-1 day'))
    `).run(token, code, childLastName, childFirstName, getRandomElement(classes), createdBy, expiresAt);
        const inv = database_1.db.prepare('SELECT id FROM invitations WHERE token = ?').get(token);
        invitationIds.push(inv.id);
    }
    // 5 completed
    for (let i = 0; i < 5; i++) {
        const childFirstName = getRandomElement(germanFirstNames);
        const childLastName = getRandomElement(germanLastNames);
        const token = generateToken();
        const code = generateCode();
        const createdBy = getRandomElement(teacherIds);
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        database_1.db.prepare(`
      INSERT INTO invitations (token, code, child_last_name, child_first_name, class_ref, status, created_by, created_at, expires_at, activated_at)
      VALUES (?, ?, ?, ?, ?, 'completed', ?, datetime('now'), ?, datetime('now', '-3 days'))
    `).run(token, code, childLastName, childFirstName, getRandomElement(classes), createdBy, expiresAt);
        const inv = database_1.db.prepare('SELECT id FROM invitations WHERE token = ?').get(token);
        invitationIds.push(inv.id);
    }
    console.log('✓ Created 15 invitations (5 pending, 5 activated, 5 completed)');
    // 3. Create 10 cases with different statuses
    // 3 draft
    for (let i = 0; i < 3; i++) {
        const invId = invitationIds[i];
        const firstName = getRandomElement(germanFirstNames);
        const lastName = getRandomElement(germanLastNames);
        database_1.db.prepare(`
      INSERT INTO cases (invitation_id, status, last_name, first_name, birth_date, birth_place, gender, nationality,
                         guardian_name, guardian_street, guardian_zip, guardian_city, phone, email,
                         kindergarten, enrollment_year, language)
      VALUES (?, 'draft', ?, ?, ?, 'München', 'M', 'Deutsch', ?, ?, ?, ?, ?, ?,
              'Kindergarten am Park', '2025', 'de')
    `).run(invId, lastName, firstName, generateRandomDate(2018, 2019), `${lastName} ${firstName}`, `${getRandomElement(germanStreets)} 42`, `${80000 + Math.floor(Math.random() * 1000)}`, getRandomElement(germanCities), `0${Math.floor(Math.random() * 900000000000)}`, `${firstName.toLowerCase()}.${lastName.toLowerCase()}@beispiel.de`);
    }
    // 4 submitted
    for (let i = 3; i < 7; i++) {
        const invId = invitationIds[i];
        const firstName = getRandomElement(germanFirstNames);
        const lastName = getRandomElement(germanLastNames);
        database_1.db.prepare(`
      INSERT INTO cases (invitation_id, status, last_name, first_name, birth_date, birth_place, gender, nationality,
                         guardian_name, guardian_street, guardian_zip, guardian_city, phone, email,
                         kindergarten, enrollment_year, language, submitted_at)
      VALUES (?, 'submitted', ?, ?, ?, 'Berlin', 'W', 'Deutsch', ?, ?, ?, ?, ?, ?,
              'Krippe Sonnenschein', '2025', 'de', datetime('now', '-5 days'))
    `).run(invId, lastName, firstName, generateRandomDate(2018, 2019), `${lastName} ${firstName}`, `${getRandomElement(germanStreets)} 23`, `${10000 + Math.floor(Math.random() * 1000)}`, getRandomElement(germanCities), `0${Math.floor(Math.random() * 900000000000)}`, `${firstName.toLowerCase()}.${lastName.toLowerCase()}@beispiel.de`);
    }
    // 2 approved
    for (let i = 7; i < 9; i++) {
        const invId = invitationIds[i];
        const firstName = getRandomElement(germanFirstNames);
        const lastName = getRandomElement(germanLastNames);
        const approver = getRandomElement(teacherIds);
        database_1.db.prepare(`
      INSERT INTO cases (invitation_id, status, last_name, first_name, birth_date, birth_place, gender, nationality,
                         guardian_name, guardian_street, guardian_zip, guardian_city, phone, email,
                         kindergarten, enrollment_year, language, submitted_at, approved_at, approved_by)
      VALUES (?, 'approved', ?, ?, ?, 'Hamburg', 'M', 'Deutsch', ?, ?, ?, ?, ?, ?,
              'Spielgruppe Regenbogen', '2025', 'de', datetime('now', '-10 days'), datetime('now', '-2 days'), ?)
    `).run(invId, lastName, firstName, generateRandomDate(2018, 2019), `${lastName} ${firstName}`, `${getRandomElement(germanStreets)} 15`, `${20000 + Math.floor(Math.random() * 1000)}`, getRandomElement(germanCities), `0${Math.floor(Math.random() * 900000000000)}`, `${firstName.toLowerCase()}.${lastName.toLowerCase()}@beispiel.de`, approver);
    }
    // 1 returned
    const invId = invitationIds[9];
    const firstName = getRandomElement(germanFirstNames);
    const lastName = getRandomElement(germanLastNames);
    database_1.db.prepare(`
    INSERT INTO cases (invitation_id, status, last_name, first_name, birth_date, birth_place, gender, nationality,
                       guardian_name, guardian_street, guardian_zip, guardian_city, phone, email,
                       kindergarten, enrollment_year, language, submitted_at, return_note)
    VALUES (?, 'returned', ?, ?, ?, 'Köln', 'W', 'Deutsch', ?, ?, ?, ?, ?, ?,
            'Waldkindergarten', '2025', 'de', datetime('now', '-7 days'), 'Bitte Adresse überprüfen und Telefonnummer ergänzen')
  `).run(invId, lastName, firstName, generateRandomDate(2018, 2019), `${lastName} ${firstName}`, `${getRandomElement(germanStreets)} 88`, `${50000 + Math.floor(Math.random() * 1000)}`, getRandomElement(germanCities), `0${Math.floor(Math.random() * 900000000000)}`, `${firstName.toLowerCase()}.${lastName.toLowerCase()}@beispiel.de`);
    console.log('✓ Created 10 cases (3 draft, 4 submitted, 2 approved, 1 returned)');
    console.log('\nSeed completed successfully!');
    console.log('\n--- Test User Credentials ---');
    console.log('Teachers: teacher1@schule.de / teacher2@schule.de / teacher3@schule.de');
    console.log('Password: TestLehrer123!');
    console.log('');
    console.log('Secretary: sekretariat@schule.de');
    console.log('Password: TestSek123!');
    console.log('');
    console.log('Principal: schulleitung@schule.de');
    console.log('Password: TestSchul123!');
    console.log('');
}
seed().catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map