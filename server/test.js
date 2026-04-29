// test.js
// Run with:  node test.js
// Requires the server to be running in another terminal: npm run dev

const http = require('http');

// ── HTTP helpers ──────────────────────────────────────────────
function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3001,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(data && { 'Content-Length': Buffer.byteLength(data) }),
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

const get  = (path, token)       => request('GET',    path, null, token);
const post = (path, body, token) => request('POST',   path, body, token);
const put  = (path, body, token) => request('PUT',    path, body, token);
const del  = (path, token)       => request('DELETE', path, null, token);

// ── Test runner ───────────────────────────────────────────────
let passed = 0;
let failed = 0;

function check(label, condition, detail = '') {
  if (condition) {
    console.log(`    ✅  ${label}`);
    passed++;
  } else {
    console.log(`    ❌  ${label}${detail ? ' — ' + detail : ''}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n' + '='.repeat(54));
  console.log('  TD Africa — Full API Test');
  console.log('='.repeat(54));

  // ── 1. Health ─────────────────────────────────────────────
  console.log('\n[1] Health check');
  try {
    const res = await get('/api/health');
    check('Server is up', res.status === 200);
  } catch {
    console.log('    ❌  Cannot reach server. Run: npm run dev');
    process.exit(1);
  }

  // ── 2. Auth ───────────────────────────────────────────────
  console.log('\n[2] Auth — Login');
  let adminToken, memberToken;

  const adminLogin = await post('/api/auth/login', {
    email: 'samuel@tdafrica.com', password: 'password123',
  });
  check('Admin login succeeds',      adminLogin.status === 200);
  check('Admin token returned',      !!adminLogin.body.token);
  check('Admin role is "admin"',     adminLogin.body.user?.role === 'admin');
  adminToken = adminLogin.body.token;

  const memberLogin = await post('/api/auth/login', {
    email: 'toluwalase@tdafrica.com', password: 'password123',
  });
  check('Member login succeeds',     memberLogin.status === 200);
  check('Member role is "member"',   memberLogin.body.user?.role === 'member');
  memberToken = memberLogin.body.token;

  const badLogin = await post('/api/auth/login', {
    email: 'samuel@tdafrica.com', password: 'wrongpass',
  });
  check('Wrong password rejected',   badLogin.status === 401);

  // ── 3. Auth/me ────────────────────────────────────────────
  console.log('\n[3] Auth — Get current user (/me)');
  const meRes = await get('/api/auth/me', adminToken);
  check('GET /api/auth/me returns user', meRes.status === 200 && !!meRes.body.user);

  const noTokenRes = await get('/api/auth/me');
  check('No token is rejected with 401', noTokenRes.status === 401);

  // ── 4. Users ──────────────────────────────────────────────
  console.log('\n[4] Users');
  const usersRes = await get('/api/users', adminToken);
  check('GET /api/users returns list',   usersRes.status === 200);
  check('Returns 5 team members',        usersRes.body.users?.length === 5);

  // ── 5. Projects ───────────────────────────────────────────
  console.log('\n[5] Projects');
  const projRes = await get('/api/projects', adminToken);
  check('Admin sees all projects',       projRes.status === 200);
  check('Returns 6 seeded projects',     projRes.body.projects?.length === 6);

  const memberProjRes = await get('/api/projects', memberToken);
  check('Member sees only their projects', memberProjRes.status === 200);

  // Create a new project (admin only)
  const newProj = await post('/api/projects', {
    name: 'Test Project', type: 'Analytics',
    status: 'planning', members: [1, 2],
  }, adminToken);
  check('Admin can create project',      newProj.status === 201);
  const newProjId = newProj.body.project?.id;

  // Member cannot create a project
  const memberCreateProj = await post('/api/projects', {
    name: 'Unauthorized Project',
  }, memberToken);
  check('Member cannot create project (403)', memberCreateProj.status === 403);

  // Update the project
  const updProj = await put(`/api/projects/${newProjId}`, {
    status: 'active', progress: 25,
  }, adminToken);
  check('Admin can update project',      updProj.status === 200);
  check('Progress updated to 25',        updProj.body.project?.progress === 25);

  // Delete the test project
  const delProj = await del(`/api/projects/${newProjId}`, adminToken);
  check('Admin can delete project',      delProj.status === 200);

  // ── 6. Tasks ──────────────────────────────────────────────
  console.log('\n[6] Tasks');
  const tasksRes = await get('/api/tasks', adminToken);
  check('Admin sees all tasks',          tasksRes.status === 200);
  check('Returns 18 seeded tasks',       tasksRes.body.tasks?.length === 18,
    `got ${tasksRes.body.tasks?.length}`);

  const memberTasksRes = await get('/api/tasks', memberToken);
  check('Member sees only their tasks',  memberTasksRes.status === 200);

  // Create a task
  const newTask = await post('/api/tasks', {
    title: 'Test task from API',
    description: 'Automated test task.',
    priority: 'h',
    dept: 'bu',
    assignee_id: 1,
    status: 'backlog',
  }, adminToken);
  check('Create task succeeds',          newTask.status === 201);
  check('Task has collaborators array',  Array.isArray(newTask.body.task?.collaborators));
  const newTaskId = newTask.body.task?.id;

  // Move task to a different column (drag & drop)
  const moveTask = await request('PATCH', `/api/tasks/${newTaskId}/status`,
    { status: 'progress' }, adminToken);
  check('Move task to In Progress',      moveTask.status === 200);
  check('Status updated correctly',      moveTask.body.task?.status === 'progress');

  // Update task
  const updTask = await put(`/api/tasks/${newTaskId}`, {
    title: 'Updated test task', priority: 'l',
  }, adminToken);
  check('Update task succeeds',          updTask.status === 200);

  // Delete task
  const delTask = await del(`/api/tasks/${newTaskId}`, adminToken);
  check('Delete task succeeds',          delTask.status === 200);

  // ── Summary ───────────────────────────────────────────────
  console.log('\n' + '='.repeat(54));
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('='.repeat(54) + '\n');

  if (failed > 0) process.exit(1);
}

runTests().catch(err => {
  console.error('\n❌  Test runner crashed:', err.message);
  process.exit(1);
});
