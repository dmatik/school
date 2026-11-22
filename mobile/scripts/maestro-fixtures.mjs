import fs from 'fs';
import path from 'path';
import { randomBytes } from 'crypto';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import { encryptPassword, generateChildId } from '../../server/webtop.js';

/**
 * Creates and seeds an isolated ephemeral SQLite database for Maestro E2E tests.
 * Uses synthetic family data only so tests never depend on or call live Webtop.
 */
export async function createEphemeralDb(dbPath) {
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Ensure server/db.js does not open data/school.db when imported
  if (!process.env.SCHOOL_DB_PATH) {
    process.env.SCHOOL_DB_PATH = dbPath;
  }
  const { initDb } = await import('../../server/db.js');

  const tempDb = new Database(dbPath);
  tempDb.pragma('journal_mode = WAL');
  tempDb.pragma('foreign_keys = ON');
  tempDb.pragma('busy_timeout = 5000');
  initDb(tempDb);

  const now = new Date();
  const nowIso = now.toISOString();
  const todayStr = nowIso.slice(0, 10);
  const futureDate1 = new Date(now.getTime() + 3 * 86400_000).toISOString().slice(0, 10);
  const futureDate2 = new Date(now.getTime() + 7 * 86400_000).toISOString().slice(0, 10);
  const pastDate = new Date(now.getTime() - 5 * 86400_000).toISOString().slice(0, 10);

  const suffix = `${Date.now()}_${randomBytes(2).toString('hex')}`;
  const adminPass = `Adm_${suffix}!`;
  const parentPass = `Par_${suffix}!`;
  const childPass = `Chd_${suffix}!`;

  const adminUser = {
    id: `e2e_admin_${suffix}`,
    username: `e2e_admin_${suffix}`,
    password: adminPass,
    role: 'admin',
    familyRole: 'parent',
    firstName: 'E2E',
    lastName: 'Admin',
  };

  const parentUser = {
    id: `e2e_parent_${suffix}`,
    username: `e2e_parent_${suffix}`,
    password: parentPass,
    role: 'user',
    familyRole: 'parent',
    firstName: 'E2E',
    lastName: 'Parent',
  };

  const child1First = 'נועה';
  const child1Last = 'ישראלי';
  const child1Id = generateChildId(child1First, child1Last);

  const child2First = 'עומר';
  const child2Last = 'ישראלי';
  const child2Id = generateChildId(child2First, child2Last);

  const childUser = {
    id: `e2e_child_${suffix}`,
    username: `e2e_child_${suffix}`,
    password: childPass,
    role: 'user',
    familyRole: 'child',
    firstName: child1First,
    lastName: child1Last,
    linkedChildId: child1Id,
  };

  const seedTx = tempDb.transaction(() => {
    const insertUser = tempDb.prepare(`
      INSERT INTO users (id, username, password_hash, first_name, last_name, avatar, role, family_role, linked_child_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, '', ?, ?, ?, ?, ?)
    `);

    for (const u of [adminUser, parentUser, childUser]) {
      const hash = bcrypt.hashSync(u.password, bcrypt.genSaltSync(10));
      insertUser.run(
        u.id,
        u.username,
        hash,
        u.firstName,
        u.lastName,
        u.role,
        u.familyRole,
        u.linkedChildId || null,
        nowIso,
        nowIso
      );
    }

    // Synthetic Webtop configuration (external calls are disabled in test server)
    tempDb.prepare(`
      INSERT INTO webtop_credentials (id, user_id, username, encrypted_password, selected_child_id, last_synced_at, sync_status, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, 'success', ?, ?)
    `).run(
      `e2e_cred_${suffix}`,
      'e2e_synthetic_webtop',
      encryptPassword('e2e-synthetic-webtop-pass'),
      child1Id,
      nowIso,
      nowIso,
      nowIso
    );

    // Two synthetic children
    const insertChild = tempDb.prepare(`
      INSERT INTO children (id, user_id, first_name, last_name, class_code, class_num, cellphone, color, external_id, external_source, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, NULL, ?, ?, 'webtop', ?, ?)
    `);
    insertChild.run(child1Id, child1First, child1Last, 5, 2, 'blue', 'ext-child-1', nowIso, nowIso);
    insertChild.run(child2Id, child2First, child2Last, 3, 1, 'emerald', 'ext-child-2', nowIso, nowIso);

    // Synthetic homework
    const insertHw = tempDb.prepare(`
      INSERT INTO homework (id, user_id, child_id, student_id, student_name, subject, teacher, due_date, description, lesson_subject, hour_num, completed, created_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
    `);
    insertHw.run(
      `e2e-hw-1-${suffix}`,
      child1Id,
      'ext-child-1',
      `${child1First} ${child1Last}`,
      'מתמטיקה',
      'דנה כהן',
      todayStr,
      'תרגילים 1-5 בעמוד 42',
      'שברים פשוטים',
      2,
      nowIso
    );
    insertHw.run(
      `e2e-hw-2-${suffix}`,
      child2Id,
      'ext-child-2',
      `${child2First} ${child2Last}`,
      'אנגלית',
      'מיכל לוי',
      todayStr,
      'Read pages 10-12 and answer questions',
      'Reading Comprehension',
      3,
      nowIso
    );

    // Synthetic incidents
    const insertInc = tempDb.prepare(`
      INSERT INTO incidents (id, user_id, child_id, student_id, student_name, date, type, subject, teacher, description, hour_num, is_justified, event_code, created_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertInc.run(
      `e2e-inc-1-${suffix}`,
      child1Id,
      'ext-child-1',
      `${child1First} ${child1Last}`,
      todayStr,
      'מילה טובה',
      'מתמטיקה',
      'דנה כהן',
      'השתתפות פעילה בשיעור',
      2,
      0,
      1,
      nowIso
    );
    insertInc.run(
      `e2e-inc-2-${suffix}`,
      child2Id,
      'ext-child-2',
      `${child2First} ${child2Last}`,
      todayStr,
      'איחור',
      'אנגלית',
      'מיכל לוי',
      'איחור קל של 5 דקות',
      1,
      1,
      2,
      nowIso
    );

    // Synthetic exams (future + past)
    const insertExam = tempDb.prepare(`
      INSERT INTO exams (id, user_id, child_id, student_name, name, description, date, grade, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertExam.run(
      `e2e-exam-1-${suffix}`,
      child1Id,
      `${child1First} ${child1Last}`,
      'מבחן במתמטיקה',
      'שברים ואחוזים',
      futureDate1,
      '',
      nowIso,
      nowIso
    );
    insertExam.run(
      `e2e-exam-2-${suffix}`,
      child2Id,
      `${child2First} ${child2Last}`,
      'English Quiz',
      'Vocabulary Unit 3',
      futureDate2,
      '',
      nowIso,
      nowIso
    );
    insertExam.run(
      `e2e-exam-3-${suffix}`,
      child1Id,
      `${child1First} ${child1Last}`,
      'בוחן בהיסטוריה',
      'פרק א',
      pastDate,
      '95',
      nowIso,
      nowIso
    );

    // Synthetic weekly schedule lessons (Sun-Fri, hours 1-3) for both children
    const insertLesson = tempDb.prepare(`
      INSERT INTO schedule_lessons (id, user_id, child_id, day_of_week, hour_num, subject, teacher, room, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, '', '', ?, ?)
    `);
    const subjects1 = ['מתמטיקה', 'אנגלית', 'מדעים', 'עברית', 'היסטוריה', 'ספורט'];
    const subjects2 = ['עברית', 'חשבון', 'אמנות', 'מוזיקה', 'מדעים', 'אנגלית'];
    for (let day = 0; day <= 5; day++) {
      insertLesson.run(`e2e-sch1-${day}-1-${suffix}`, child1Id, day, 1, subjects1[day], nowIso, nowIso);
      insertLesson.run(`e2e-sch1-${day}-2-${suffix}`, child1Id, day, 2, subjects1[(day + 1) % 6], nowIso, nowIso);
      insertLesson.run(`e2e-sch2-${day}-1-${suffix}`, child2Id, day, 1, subjects2[day], nowIso, nowIso);
    }

    // Synthetic finish times
    const insertFinish = tempDb.prepare(`
      INSERT INTO schedule_day_settings (id, user_id, child_id, day_of_week, finish_time, created_at, updated_at)
      VALUES (?, 'family', ?, ?, ?, ?, ?)
    `);
    for (let day = 0; day <= 5; day++) {
      const finish = day === 5 ? '11:45' : '13:30';
      insertFinish.run(`e2e-fin1-${day}-${suffix}`, child1Id, day, finish, nowIso, nowIso);
      insertFinish.run(`e2e-fin2-${day}-${suffix}`, child2Id, day, day === 5 ? '11:45' : '12:45', nowIso, nowIso);
    }
  });

  seedTx();
  tempDb.close();

  return {
    dbPath,
    admin: adminUser,
    parent: parentUser,
    child: childUser,
    children: [
      { id: child1Id, firstName: child1First, lastName: child1Last },
      { id: child2Id, firstName: child2First, lastName: child2Last },
    ],
  };
}

/**
 * Deletes the ephemeral SQLite database and its WAL/SHM sidecar files.
 */
export function removeEphemeralDb(dbPath) {
  if (!dbPath) return;
  for (const suffix of ['', '-wal', '-shm']) {
    const target = `${dbPath}${suffix}`;
    try {
      if (fs.existsSync(target)) {
        fs.unlinkSync(target);
      }
    } catch (err) {
      console.warn(`Failed to remove ephemeral DB file ${target}:`, err.message);
    }
  }
}
