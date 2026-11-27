import { chromium } from '@playwright/test';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');
const APP_DIST_DIR = path.join(ROOT_DIR, 'app', 'dist');
const OUTPUT_DIR = path.join(ROOT_DIR, 'docs', 'screenshots');
const BASE_URL = process.env.SCREENSHOT_URL || 'http://127.0.0.1:4173';

function formatDateOffset(daysOffset) {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildMockData() {
  const today = formatDateOffset(0);
  const yesterday = formatDateOffset(-1);
  const twoDaysAgo = formatDateOffset(-2);
  const inTwoDays = formatDateOffset(2);
  const inThreeDays = formatDateOffset(3);
  const inNineDays = formatDateOffset(9);
  const inFourteenDays = formatDateOffset(14);

  const user = {
    id: 'demo-parent-1',
    username: 'demo_parent',
    firstName: 'דנה',
    lastName: 'כהן',
    avatar: '',
    role: 'admin',
    familyRole: 'parent',
    linkedChildId: null,
  };

  const linkedChildren = [
    {
      id: 'child-noa',
      externalId: 'ext-noa',
      firstName: 'נועה',
      lastName: 'כהן',
      classCode: 6,
      classNum: 2,
      color: 'purple',
    },
    {
      id: 'child-itai',
      externalId: 'ext-itai',
      firstName: 'איתי',
      lastName: 'כהן',
      classCode: 3,
      classNum: 1,
      color: 'blue',
    },
  ];

  const webtopConfig = {
    configured: true,
    username: 'family_demo',
    selectedChildId: 'all',
    linkedChildren,
    lastSyncedAt: new Date(Date.now() - 12 * 60 * 1000).toISOString(),
    syncStatus: 'idle',
    syncError: null,
    autoSyncAvailable: false,
    autoSyncEnabled: false,
    autoSyncPaused: false,
  };

  const homework = [
    {
      id: 'hw-1',
      childId: 'child-noa',
      studentId: 'ext-noa',
      studentName: 'נועה כהן',
      subject: 'מתמטיקה',
      teacher: 'יעל לוי',
      dueDate: today,
      description: 'לפתור תרגילים 1–6 בעמוד 48 בחוברת (שברים עשרוניים)',
      lessonSubject: 'שברים עשרוניים ואחוזים',
      hourNum: 2,
      completed: false,
    },
    {
      id: 'hw-2',
      childId: 'child-noa',
      studentId: 'ext-noa',
      studentName: 'נועה כהן',
      subject: 'מתמטיקה',
      teacher: 'יעל לוי',
      dueDate: today,
      description: 'לפתור תרגילים 1–6 בעמוד 48 בחוברת (שברים עשרוניים)',
      lessonSubject: 'שברים עשרוניים ואחוזים',
      hourNum: 3,
      completed: false,
    },
    {
      id: 'hw-3',
      childId: 'child-itai',
      studentId: 'ext-itai',
      studentName: 'איתי כהן',
      subject: 'אנגלית',
      teacher: 'שרה אברהם',
      dueDate: today,
      description: 'לסיים את דף העבודה על מילות יחס ולהתכונן להכתבה ביום רביעי',
      lessonSubject: 'Unit 4: Around Town',
      hourNum: 4,
      completed: false,
    },
    {
      id: 'hw-4',
      childId: 'child-noa',
      studentId: 'ext-noa',
      studentName: 'נועה כהן',
      subject: 'מדעים',
      teacher: 'רון דוד',
      dueDate: yesterday,
      description: 'לקרוא עמודים 72–74 ולענות על שאלות 1–3 במחברת מדעים',
      lessonSubject: 'מערכת הנשימה',
      hourNum: 1,
      completed: false,
    },
    {
      id: 'hw-5',
      childId: 'child-itai',
      studentId: 'ext-itai',
      studentName: 'איתי כהן',
      subject: 'היסטוריה',
      teacher: 'תמר גולן',
      dueDate: yesterday,
      description: 'לסכם 5 עובדות על תקופת הבית השני מהספר',
      lessonSubject: 'ירושלים בתקופת הבית השני',
      hourNum: 5,
      completed: false,
    },
  ];

  const incidents = [
    {
      id: 'inc-1',
      childId: 'child-noa',
      studentId: 'ext-noa',
      studentName: 'נועה כהן',
      date: today,
      type: 'מילה טובה',
      subject: 'מדעים',
      teacher: 'רון דוד',
      description: 'השתתפות פעילה ומעוררת השראה בניסוי הקבוצתי במעבדה',
      hourNum: 3,
      isJustified: 1,
    },
    {
      id: 'inc-2',
      childId: 'child-itai',
      studentId: 'ext-itai',
      studentName: 'איתי כהן',
      date: today,
      type: 'איחור',
      subject: 'עברית',
      teacher: 'מיכל שפירא',
      description: 'הגיע באיחור של 10 דקות לתחילת השיעור (באישור הורה)',
      hourNum: 1,
      isJustified: 1,
    },
    {
      id: 'inc-3',
      childId: 'child-noa',
      studentId: 'ext-noa',
      studentName: 'נועה כהן',
      date: yesterday,
      type: 'ציוד חסר',
      subject: 'חינוך גופני',
      teacher: 'עומר ברק',
      description: 'שכחה להביא נעלי ספורט ובקבוק מים לשיעור',
      hourNum: 4,
      isJustified: 0,
    },
    {
      id: 'inc-4',
      childId: 'child-itai',
      studentId: 'ext-itai',
      studentName: 'איתי כהן',
      date: twoDaysAgo,
      type: 'חיזוק חיובי',
      subject: 'אמנות',
      teacher: 'גלית כץ',
      description: 'עזרה לחברים בכיתה בסידור הציוד בסיום הפעילות',
      hourNum: 5,
      isJustified: 1,
    },
  ];

  const exams = [
    {
      id: 'exam-1',
      childId: 'child-noa',
      studentName: 'נועה כהן',
      name: 'מבחן במתמטיקה',
      description: 'שברים עשרוניים, כפל וחילוק בעשרות שלמות ובעיות מילוליות (עמ׳ 38–54)',
      date: inTwoDays,
      grade: null,
    },
    {
      id: 'exam-2',
      childId: 'child-itai',
      studentName: 'איתי כהן',
      name: 'הכתבה באנגלית',
      description: 'אוצר מילים מ-Unit 4 ומשפטים קצרים בזמן הווה ממושך',
      date: inThreeDays,
      grade: null,
    },
    {
      id: 'exam-3',
      childId: 'child-noa',
      studentName: 'נועה כהן',
      name: 'מבדק במדעים',
      description: 'מבנה מערכת הנשימה, מחזור הדם ופעילות גופנית',
      date: inNineDays,
      grade: null,
    },
    {
      id: 'exam-4',
      childId: 'child-itai',
      studentName: 'איתי כהן',
      name: 'מבחן בהיסטוריה',
      description: 'חזרה על פרקים ג׳–ד׳ בספר הלימוד',
      date: inFourteenDays,
      grade: null,
    },
  ];

  const scheduleSubjects = [
    ['מתמטיקה', 'עברית', 'אנגלית', 'מדעים', 'היסטוריה', 'מתמטיקה'],
    ['מתמטיקה', 'תנ״ך', 'אנגלית', 'גאוגרפיה', 'ספורט', 'עברית'],
    ['עברית', 'מדעים', 'מתמטיקה', 'אמנות', 'מחשבים', 'מוזיקה'],
    ['אנגלית', 'היסטוריה', 'מתמטיקה', 'מדעים', 'תנ״ך', ''],
    ['תנ״ך', 'גאוגרפיה', 'חינוך גופני', 'עברית', 'כישורי חיים', ''],
    ['מתמטיקה', 'עברית', 'אנגלית', 'סיכום שבועי', '', ''],
  ];

  const lessons = [];
  for (let dayOfWeek = 0; dayOfWeek < 6; dayOfWeek++) {
    for (let hourIdx = 0; hourIdx < scheduleSubjects[dayOfWeek].length; hourIdx++) {
      const subject = scheduleSubjects[dayOfWeek][hourIdx];
      if (!subject) continue;
      lessons.push({
        id: `lesson-${dayOfWeek}-${hourIdx + 1}`,
        childId: 'child-noa',
        dayOfWeek,
        hourNum: hourIdx + 1,
        subject,
      });
    }
  }

  const finishTimes = [
    { id: 'ft-0', childId: 'child-noa', dayOfWeek: 0, finishTime: '14:15' },
    { id: 'ft-1', childId: 'child-noa', dayOfWeek: 1, finishTime: '14:15' },
    { id: 'ft-2', childId: 'child-noa', dayOfWeek: 2, finishTime: '14:15' },
    { id: 'ft-3', childId: 'child-noa', dayOfWeek: 3, finishTime: '13:30' },
    { id: 'ft-4', childId: 'child-noa', dayOfWeek: 4, finishTime: '13:30' },
    { id: 'ft-5', childId: 'child-noa', dayOfWeek: 5, finishTime: '12:45' },
  ];

  return { user, webtopConfig, homework, incidents, exams, lessons, finishTimes };
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
};

async function isServerReachable(url) {
  try {
    const res = await fetch(url);
    return res.ok;
  } catch {
    return false;
  }
}

async function ensureExpoWebServer() {
  if (await isServerReachable(BASE_URL)) {
    return { server: null, reused: true };
  }

  if (!fs.existsSync(path.join(APP_DIST_DIR, 'index.html'))) {
    console.log('Building Expo Web bundle (app/dist)...');
    execSync('npm run build', { cwd: ROOT_DIR, stdio: 'inherit' });
  }

  const parsed = new URL(BASE_URL);
  const port = Number(parsed.port || 4173);

  const distRoot = path.resolve(APP_DIST_DIR);
  const indexHtmlPath = path.join(distRoot, 'index.html');

  const server = http.createServer((req, res) => {
    const reqPath = (req.url || '/').split('?')[0];
    const safeRel = reqPath === '/' ? 'index.html' : reqPath.replace(/^\/+/, '');
    let filePath = path.resolve(distRoot, safeRel);
    if (!filePath.startsWith(distRoot + path.sep)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }
    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = indexHtmlPath;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    fs.createReadStream(filePath).pipe(res);
  });

  await new Promise((resolve) => server.listen(port, parsed.hostname, resolve));
  return { server, reused: false };
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const mock = buildMockData();

  const { server, reused } = await ensureExpoWebServer();
  console.log(reused ? `Using running dev server at ${BASE_URL}` : `Serving Expo Web dist at ${BASE_URL}`);

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: 'he-IL',
    });

    await context.addInitScript(() => {
      localStorage.setItem('school_auth_token', 'screenshot-mock-token');
      localStorage.setItem('school_lang', 'he');
      localStorage.setItem('school_theme', 'light');
    });

    const page = await context.newPage();

    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const pathname = url.pathname;

      if (pathname === '/api/auth/me') {
        return route.fulfill({ json: { user: mock.user } });
      }
      if (pathname === '/api/webtop/config') {
        return route.fulfill({ json: mock.webtopConfig });
      }
      if (pathname === '/api/webtop/sync-if-stale') {
        return route.fulfill({ json: { skipped: true } });
      }
      if (pathname === '/api/homework') {
        const childId = url.searchParams.get('childId');
        const list = childId && childId !== 'all'
          ? mock.homework.filter((h) => h.childId === childId)
          : mock.homework;
        return route.fulfill({ json: list });
      }
      if (pathname === '/api/incidents') {
        const childId = url.searchParams.get('childId');
        const list = childId && childId !== 'all'
          ? mock.incidents.filter((i) => i.childId === childId)
          : mock.incidents;
        return route.fulfill({ json: list });
      }
      if (pathname === '/api/exams') {
        const childId = url.searchParams.get('childId');
        const list = childId && childId !== 'all'
          ? mock.exams.filter((e) => e.childId === childId)
          : mock.exams;
        return route.fulfill({ json: list });
      }
      if (pathname === '/api/schedule') {
        return route.fulfill({
          json: {
            lessons: mock.lessons,
            finishTimes: mock.finishTimes,
          },
        });
      }

      return route.fulfill({ status: 200, json: {} });
    });

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);

    const captures = [
      { tabId: 'homework', file: 'homework-mobile.png', expectedHeader: /שיעורי בית|Homework/ },
      { tabId: 'incidents', file: 'incidents-mobile.png', expectedHeader: /אירועי משמעת|School Incidents/ },
      { tabId: 'exams', file: 'exams-mobile.png', expectedHeader: /מבחנים|Exams/ },
      { tabId: 'schedule', file: 'schedule-mobile.png', expectedHeader: /מערכת שעות|Weekly Schedule/ },
    ];

    for (const capture of captures) {
      if (capture.tabId !== 'homework') {
        await page.getByTestId(`dock-tab-${capture.tabId}`).click();
      }
      const titleEl = page.getByTestId('mobile-header-title');
      await titleEl.waitFor({ state: 'visible' });
      const text = await titleEl.textContent();
      if (!capture.expectedHeader.test(text || '')) {
        await page.waitForTimeout(300);
      }
      await page.waitForTimeout(550);

      const outPath = path.join(OUTPUT_DIR, capture.file);
      await page.screenshot({ path: outPath });
      console.log(`Saved ${path.relative(ROOT_DIR, outPath)}`);
    }
  } finally {
    await browser.close();
    if (server) {
      server.close();
    }
  }
}

main().catch((err) => {
  console.error('Failed to generate screenshots:', err);
  process.exit(1);
});
