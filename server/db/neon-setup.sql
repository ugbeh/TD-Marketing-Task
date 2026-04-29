-- ============================================================
-- TD Africa — Data Team Task Manager
-- Neon Setup Script — paste this entire file into the
-- Neon SQL Editor and click Run.
-- ============================================================


-- ── USERS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  initials      VARCHAR(4)   NOT NULL UNIQUE,
  name          VARCHAR(120) NOT NULL,
  email         VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  NOT NULL DEFAULT 'member',
  job_title     VARCHAR(120),
  status        VARCHAR(40)  DEFAULT 'Online',
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ  DEFAULT NOW()
);


-- ── PROJECTS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS projects (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(160) NOT NULL,
  type        VARCHAR(80),
  status      VARCHAR(40)  DEFAULT 'planning',
  progress    INTEGER      DEFAULT 0,
  color       VARCHAR(20)  DEFAULT '#0E8C88',
  start_date  VARCHAR(40),
  due_date    VARCHAR(40),
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);


-- ── PROJECT MEMBERS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_members (
  project_id  INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id)    ON DELETE CASCADE,
  PRIMARY KEY (project_id, user_id)
);


-- ── PROJECT TAGS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS project_tags (
  id         SERIAL PRIMARY KEY,
  project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
  tag        VARCHAR(60) NOT NULL
);


-- ── TASKS ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id          SERIAL PRIMARY KEY,
  title       VARCHAR(200) NOT NULL,
  description TEXT,
  status      VARCHAR(40)  DEFAULT 'backlog',
  priority    VARCHAR(10)  DEFAULT 'm',
  dept        VARCHAR(10)  DEFAULT 'bu',
  due_date    VARCHAR(40),
  assignee_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  project_id  INTEGER REFERENCES projects(id),
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);


-- ── TASK COLLABORATORS ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_collaborators (
  task_id  INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
  user_id  INTEGER REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (task_id, user_id)
);


-- ── TASK COMMENTS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_comments (
  id         SERIAL PRIMARY KEY,
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── TASK ACTIVITY LOG ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS task_activity (
  id         SERIAL PRIMARY KEY,
  task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id    INTEGER      REFERENCES users(id) ON DELETE SET NULL,
  action     VARCHAR(50) NOT NULL,
  detail     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_comments_task ON task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_activity_task ON task_activity(task_id);


-- ── CHAT MESSAGES ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_messages (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content    TEXT    NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── NOTIFICATIONS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  message    TEXT NOT NULL,
  is_read    BOOLEAN     DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── PASSWORD RESET TOKENS ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ── CHAT READ RECEIPTS ────────────────────────────────────────
-- Tracks the last message each user has read — used to show
-- "Seen" indicators and unread counts in the team chat.
CREATE TABLE IF NOT EXISTS chat_last_read (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  message_id INTEGER,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- SEED DATA
-- All passwords are 'password123' — change after first login
-- ============================================================

INSERT INTO users (initials, name, email, password_hash, role, job_title, status) VALUES
  ('FR', 'Fridel',    'fridel@tdafrica.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Head of Marketing',       'Online'),
  ('GA', 'Gabriel',   'gabriel@tdafrica.com',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Digital Strategist',      'Online'),
  ('GI', 'Gideon',    'gideon@tdafrica.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'SEO Manager',             'Online'),
  ('NN', 'Nnadozie',  'nnadozie@tdafrica.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'OEM Manager',             'Online'),
  ('MA', 'Mary',      'mary@tdafrica.com',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'OEM Manager',             'Online'),
  ('ML', 'Milicent',  'milicent@tdafrica.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'OEM Manager',             'Online'),
  ('LE', 'Leke',      'leke@tdafrica.com',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Lead Graphics Designer',  'Online'),
  ('RO', 'Rotimi',    'rotimi@tdafrica.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Graphics Designer',       'Online'),
  ('FA', 'Favour',    'favour@tdafrica.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Community Manager',       'Online'),
  ('DA', 'Dammy',     'dammy@tdafrica.com',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Social Media Manager',    'Online'),
  ('MC', 'Miracle',   'miracle@tdafrica.com',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Videographer',            'Online'),
  ('ME', 'Mercy',     'mercy@tdafrica.com',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Telemarketing Executive', 'Online'),
  ('AS', 'Adesuwa',   'adesuwa@tdafrica.com',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Lead, Telemarketing',     'Online'),
  ('EL', 'Elijah',    'elijah@tdafrica.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Content Writer',          'Online'),
  ('OL', 'Olamide',   'olamide@tdafrica.com',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Ecommerce Manager',       'Online'),
  ('MT', 'Marketing Team', 'marketing@tdafrica.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', 'Administrator',         'Online')
ON CONFLICT DO NOTHING;


INSERT INTO projects (name, type, status, progress, color, start_date, due_date, created_by) VALUES
  ('Q2 Social Media Campaign',         'Social Media',        'active',   35, '#C03A8A', 'Apr 1, 2026',  'Jun 30, 2026', 1),
  ('Brand & Visual Identity Refresh',  'Branding',            'planning', 15, '#8B1A2B', 'Apr 15, 2026', 'Jul 31, 2026', 1),
  ('SEO & Website Optimisation',       'SEO / Digital',       'active',   60, '#3A6FD8', 'Mar 1, 2026',  'Jun 15, 2026', 1),
  ('OEM Partner Onboarding Programme', 'Partnerships',        'active',   40, '#0E8C88', 'Apr 1, 2026',  'Jun 1, 2026',  1),
  ('Content Calendar & Strategy',      'Content Marketing',   'draft',    10, '#C88A18', 'May 1, 2026',  'Jul 15, 2026', 1),
  ('Community Growth Initiative',      'Community',           'active',   55, '#22A55A', 'Mar 15, 2026', 'Jun 30, 2026', 1)
ON CONFLICT DO NOTHING;


INSERT INTO project_members (project_id, user_id)
SELECT p.id, u.id FROM projects p, users u WHERE
  (p.name = 'Q2 Social Media Campaign'         AND u.initials IN ('DA','LE','RO','MC','FR')) OR
  (p.name = 'Brand & Visual Identity Refresh'  AND u.initials IN ('LE','RO','GA','FR'))      OR
  (p.name = 'SEO & Website Optimisation'       AND u.initials IN ('GI','EL','GA'))           OR
  (p.name = 'OEM Partner Onboarding Programme' AND u.initials IN ('NN','MA','ML','FR'))      OR
  (p.name = 'Content Calendar & Strategy'      AND u.initials IN ('EL','FR','GA'))           OR
  (p.name = 'Community Growth Initiative'      AND u.initials IN ('FA','DA','EL'))
ON CONFLICT DO NOTHING;


INSERT INTO project_tags (project_id, tag)
SELECT p.id, t.tag FROM projects p
JOIN (VALUES
  ('Q2 Social Media Campaign',         'Instagram'),
  ('Q2 Social Media Campaign',         'LinkedIn'),
  ('Q2 Social Media Campaign',         'Paid Ads'),
  ('Q2 Social Media Campaign',         'Video'),
  ('Brand & Visual Identity Refresh',  'Branding'),
  ('Brand & Visual Identity Refresh',  'Design'),
  ('Brand & Visual Identity Refresh',  'Guidelines'),
  ('SEO & Website Optimisation',       'SEO'),
  ('SEO & Website Optimisation',       'Content'),
  ('SEO & Website Optimisation',       'Analytics'),
  ('OEM Partner Onboarding Programme', 'OEM'),
  ('OEM Partner Onboarding Programme', 'Partnerships'),
  ('OEM Partner Onboarding Programme', 'B2B'),
  ('Content Calendar & Strategy',      'Content'),
  ('Content Calendar & Strategy',      'Blog'),
  ('Content Calendar & Strategy',      'Planning'),
  ('Community Growth Initiative',      'Community'),
  ('Community Growth Initiative',      'Engagement'),
  ('Community Growth Initiative',      'Social')
) AS t(proj_name, tag) ON p.name = t.proj_name;


INSERT INTO tasks (title, description, status, priority, dept, due_date, assignee_id, project_id)
SELECT t.title, t.description, t.status, t.pri, t.dept, t.due_date, u.id, p.id
FROM (VALUES
  -- Q2 Social Media Campaign
  ('Build May–June content calendar',         'Map out all post topics, formats and platforms for May and June.', 'backlog',  'h', 'bu', 'May 5, 2026',  'DA', 'Q2 Social Media Campaign'),
  ('Design social media graphics pack',       'Create branded templates for Instagram, LinkedIn and Twitter.',   'progress', 'h', 'bu', 'May 10, 2026', 'LE', 'Q2 Social Media Campaign'),
  ('Produce 3 short-form video ads',          'Shoot and edit 15-second product highlight videos for Instagram Reels.', 'progress', 'h', 'bu', 'May 20, 2026', 'MC', 'Q2 Social Media Campaign'),
  ('Write captions for all May posts',        'Draft engaging captions with CTAs for every scheduled post.',    'review',   'm', 'bg', 'May 2, 2026',  'EL', 'Q2 Social Media Campaign'),
  ('Schedule Week 1 posts across platforms',  'Upload and schedule the first week of content using Buffer.',    'approved', 'm', 'bu', 'Apr 30, 2026', 'DA', 'Q2 Social Media Campaign'),
  ('Q1 social media performance report',      'Analyse Q1 impressions, reach, engagement and follower growth.', 'done',     'l', 'bg', 'Apr 10, 2026', 'GA', 'Q2 Social Media Campaign'),
  -- Brand & Visual Identity Refresh
  ('Conduct brand audit — existing assets',   'Review all current logos, colours, fonts and collateral.',       'backlog',  'm', 'bu', 'May 15, 2026', 'GA', 'Brand & Visual Identity Refresh'),
  ('Design new brand guidelines document',    'Produce full brand book: colours, typography, logo usage rules.','progress', 'h', 'bu', 'Jun 15, 2026', 'LE', 'Brand & Visual Identity Refresh'),
  ('Redesign company letterhead and templates','Update Word and PowerPoint templates with new branding.',       'backlog',  'l', 'bg', 'Jun 30, 2026', 'RO', 'Brand & Visual Identity Refresh'),
  -- SEO & Website Optimisation
  ('Keyword research — top 60 priority terms','Identify and cluster the most valuable keywords for each page.', 'backlog',  'h', 'bu', 'May 8, 2026',  'GI', 'SEO & Website Optimisation'),
  ('On-page SEO audit — all landing pages',   'Check titles, meta descriptions, headings and internal links.',  'progress', 'h', 'bu', 'May 15, 2026', 'GI', 'SEO & Website Optimisation'),
  ('Write 4 SEO blog articles',               'Produce long-form articles targeting the top keyword clusters.', 'progress', 'm', 'bg', 'May 30, 2026', 'EL', 'SEO & Website Optimisation'),
  ('Fix broken links and redirect errors',    'Crawl the site, fix all 404s and set up proper 301 redirects.', 'review',   'h', 'bu', 'May 5, 2026',  'GI', 'SEO & Website Optimisation'),
  ('SEO performance baseline report',         'Document current rankings, traffic and domain authority.',       'done',     'm', 'bg', 'Apr 5, 2026',  'GI', 'SEO & Website Optimisation'),
  -- OEM Partner Onboarding Programme
  ('Prepare OEM partner welcome kit',         'Design welcome pack: overview deck, contact list, brand assets.','backlog',  'm', 'bu', 'May 10, 2026', 'NN', 'OEM Partner Onboarding Programme'),
  ('Onboard TechFlow Ltd as OEM partner',     'Complete paperwork, portal access and product training.',        'progress', 'h', 'bu', 'May 20, 2026', 'MA', 'OEM Partner Onboarding Programme'),
  ('Update OEM partner portal content',       'Refresh product specs, pricing and marketing resources.',        'review',   'm', 'bg', 'May 12, 2026', 'ML', 'OEM Partner Onboarding Programme'),
  -- Content Calendar & Strategy
  ('Define monthly content themes Q3',        'Set overarching themes and campaign hooks for Jul–Sep.',         'backlog',  'm', 'bu', 'May 25, 2026', 'FR', 'Content Calendar & Strategy'),
  ('Build 6-month content calendar',          'Plan all blog, social and email content through October.',       'backlog',  'h', 'bu', 'Jun 5, 2026',  'EL', 'Content Calendar & Strategy'),
  -- Community Growth Initiative
  ('Launch weekly community challenge',       'Design and kick off a recurring engagement challenge for followers.','progress','h','bu','May 3, 2026',  'FA', 'Community Growth Initiative'),
  ('Respond to community inbox — weekly',     'Clear and respond to all DMs, comments and mentions each week.', 'review',   'm', 'bg', 'May 2, 2026',  'FA', 'Community Growth Initiative'),
  ('Telemarketing outreach — May batch',      'Call 200 warm leads from the April campaign for follow-up.',     'progress', 'h', 'bu', 'May 15, 2026', 'ME', 'Community Growth Initiative'),
  ('Community growth report — April',         'Document follower growth, top posts and engagement rate for April.','done',  'l', 'bg', 'Apr 15, 2026', 'FA', 'Community Growth Initiative')
) AS t(title, description, status, pri, dept, due_date, ass_initials, proj_name)
JOIN users u ON u.initials = t.ass_initials
JOIN projects p ON p.name = t.proj_name;


INSERT INTO notifications (user_id, message, is_read)
SELECT u.id, n.message, n.is_read FROM (VALUES
  ('Leke completed the social media graphics pack — ready for review.', FALSE),
  ('Gideon fixed all broken links on the website. SEO audit is unblocked.', FALSE),
  ('Deadline this week: OEM partner welcome kit is due May 10.', FALSE),
  ('Dammy scheduled all Week 1 posts. Campaign is live!', TRUE),
  ('Favour submitted the April community growth report. Engagement up 18%.', TRUE)
) AS n(message, is_read)
JOIN users u ON u.initials = 'FR'
ON CONFLICT DO NOTHING;
