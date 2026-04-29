-- ============================================================
-- TD Africa — Marketing Team Dashboard
-- DATA REFRESH SCRIPT
-- Run this in the Neon SQL Editor to wipe old Data Team content
-- and replace it with Marketing Team projects & tasks.
-- Tables are NOT dropped — only data is replaced.
-- ============================================================

-- ── Step 1: Clear all old data (in dependency order) ────────
TRUNCATE TABLE
  notifications,
  task_activity,
  task_comments,
  task_collaborators,
  tasks,
  project_tags,
  project_members,
  projects,
  users
RESTART IDENTITY CASCADE;


-- ── Step 2: Marketing Team members ───────────────────────────
-- Password for all accounts: password123
INSERT INTO users (initials, name, email, password_hash, role, job_title, status) VALUES
  ('FR', 'Fridel',         'fridel@tdafrica.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Head of Marketing',       'Online'),
  ('GA', 'Gabriel',        'gabriel@tdafrica.com',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Digital Strategist',      'Online'),
  ('GI', 'Gideon',         'gideon@tdafrica.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'SEO Manager',             'Online'),
  ('NN', 'Nnadozie',       'nnadozie@tdafrica.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'OEM Manager',             'Online'),
  ('MA', 'Mary',           'mary@tdafrica.com',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'OEM Manager',             'Online'),
  ('ML', 'Milicent',       'milicent@tdafrica.com',  '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'OEM Manager',             'Online'),
  ('LE', 'Leke',           'leke@tdafrica.com',      '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Lead Graphics Designer',  'Online'),
  ('RO', 'Rotimi',         'rotimi@tdafrica.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Graphics Designer',       'Online'),
  ('FA', 'Favour',         'favour@tdafrica.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Community Manager',       'Online'),
  ('DA', 'Dammy',          'dammy@tdafrica.com',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Social Media Manager',    'Online'),
  ('MC', 'Miracle',        'miracle@tdafrica.com',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Videographer',            'Online'),
  ('ME', 'Mercy',          'mercy@tdafrica.com',     '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Telemarketing Executive', 'Online'),
  ('AS', 'Adesuwa',        'adesuwa@tdafrica.com',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Lead, Telemarketing',     'Online'),
  ('EL', 'Elijah',         'elijah@tdafrica.com',    '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Content Writer',          'Online'),
  ('OL', 'Olamide',        'olamide@tdafrica.com',   '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'member', 'Ecommerce Manager',       'Online'),
  ('MT', 'Marketing Team', 'marketing@tdafrica.com', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin',  'Administrator',           'Online');


-- ── Step 3: Marketing Team projects ──────────────────────────
INSERT INTO projects (name, type, status, progress, color, start_date, due_date, created_by) VALUES
  ('OEM Partner Onboarding Programme',  'Partnerships',      'active',   40, '#0E8C88', 'Apr 1, 2026',  'Jun 1, 2026',  1),
  ('SEO & Digital Campaigns',           'SEO / Digital',     'active',   60, '#3A6FD8', 'Mar 1, 2026',  'Jun 30, 2026', 1),
  ('Blog & Content Strategy',           'Content Marketing', 'active',   45, '#C88A18', 'Apr 1, 2026',  'Jul 15, 2026', 1),
  ('Digital Ads & Paid Media',          'Paid Advertising',  'active',   30, '#C03A8A', 'Apr 15, 2026', 'Jun 30, 2026', 1),
  ('Customer Sales Enablement',         'Sales Support',     'planning', 20, '#22A55A', 'May 1, 2026',  'Aug 1, 2026',  1),
  ('Brand & Visual Identity Refresh',   'Branding',          'planning', 15, '#8B1A2B', 'Apr 15, 2026', 'Jul 31, 2026', 1);


-- ── Step 4: Project members ───────────────────────────────────
INSERT INTO project_members (project_id, user_id)
SELECT p.id, u.id FROM projects p, users u WHERE
  (p.name = 'OEM Partner Onboarding Programme' AND u.initials IN ('NN','MA','ML','FR','GA'))     OR
  (p.name = 'SEO & Digital Campaigns'          AND u.initials IN ('GI','EL','GA','FR'))          OR
  (p.name = 'Blog & Content Strategy'          AND u.initials IN ('EL','GI','GA','FR'))          OR
  (p.name = 'Digital Ads & Paid Media'         AND u.initials IN ('GA','DA','LE','RO','MC','FR')) OR
  (p.name = 'Customer Sales Enablement'        AND u.initials IN ('AS','ME','OL','FR'))          OR
  (p.name = 'Brand & Visual Identity Refresh'  AND u.initials IN ('LE','RO','GA','FR'))
ON CONFLICT DO NOTHING;


-- ── Step 5: Project tags ──────────────────────────────────────
INSERT INTO project_tags (project_id, tag)
SELECT p.id, t.tag FROM projects p
JOIN (VALUES
  ('OEM Partner Onboarding Programme', 'OEM'),
  ('OEM Partner Onboarding Programme', 'Partnerships'),
  ('OEM Partner Onboarding Programme', 'B2B'),
  ('SEO & Digital Campaigns',          'SEO'),
  ('SEO & Digital Campaigns',          'Google'),
  ('SEO & Digital Campaigns',          'Analytics'),
  ('Blog & Content Strategy',          'Blog'),
  ('Blog & Content Strategy',          'Content'),
  ('Blog & Content Strategy',          'Planning'),
  ('Digital Ads & Paid Media',         'Instagram'),
  ('Digital Ads & Paid Media',         'LinkedIn'),
  ('Digital Ads & Paid Media',         'Paid Ads'),
  ('Digital Ads & Paid Media',         'Video'),
  ('Customer Sales Enablement',        'Telemarketing'),
  ('Customer Sales Enablement',        'CRM'),
  ('Customer Sales Enablement',        'Leads'),
  ('Brand & Visual Identity Refresh',  'Branding'),
  ('Brand & Visual Identity Refresh',  'Design'),
  ('Brand & Visual Identity Refresh',  'Guidelines')
) AS t(proj_name, tag) ON p.name = t.proj_name;


-- ── Step 6: Tasks ─────────────────────────────────────────────
INSERT INTO tasks (title, description, status, priority, dept, due_date, assignee_id, project_id)
SELECT t.title, t.description, t.status, t.pri, t.dept, t.due_date, u.id, p.id
FROM (VALUES

  -- OEM Partner Onboarding Programme
  ('Prepare OEM partner welcome kit',        'Design welcome pack: overview deck, contact list and brand assets.', 'backlog',  'm', 'bu', 'May 10, 2026', 'NN', 'OEM Partner Onboarding Programme'),
  ('Onboard TechFlow Ltd as OEM partner',    'Complete paperwork, portal access and product training.',            'progress', 'h', 'bu', 'May 20, 2026', 'MA', 'OEM Partner Onboarding Programme'),
  ('Update OEM partner portal content',      'Refresh product specs, pricing and marketing resources.',            'review',   'm', 'bg', 'May 12, 2026', 'ML', 'OEM Partner Onboarding Programme'),
  ('OEM quarterly performance review',       'Compile sales data and feedback from all active OEM partners.',      'backlog',  'l', 'bg', 'Jun 1, 2026',  'NN', 'OEM Partner Onboarding Programme'),

  -- SEO & Digital Campaigns
  ('Keyword research — top 60 priority terms','Identify and cluster the most valuable keywords for each page.',    'progress', 'h', 'bu', 'May 8, 2026',  'GI', 'SEO & Digital Campaigns'),
  ('On-page SEO audit — all landing pages',  'Check titles, meta descriptions, headings and internal links.',     'progress', 'h', 'bu', 'May 15, 2026', 'GI', 'SEO & Digital Campaigns'),
  ('Fix broken links and redirect errors',   'Crawl the site, fix all 404s and set up proper 301 redirects.',    'review',   'h', 'bu', 'May 5, 2026',  'GI', 'SEO & Digital Campaigns'),
  ('Submit sitemap to Google Search Console','Ensure all pages are indexed and sitemap is up to date.',           'done',     'm', 'bu', 'Apr 20, 2026', 'GI', 'SEO & Digital Campaigns'),
  ('Monthly SEO performance report',         'Document rankings, organic traffic and domain authority changes.',  'backlog',  'l', 'bg', 'May 30, 2026', 'GA', 'SEO & Digital Campaigns'),

  -- Blog & Content Strategy
  ('Write 4 SEO blog articles — May',        'Produce long-form articles targeting the top keyword clusters.',    'progress', 'm', 'bg', 'May 28, 2026', 'EL', 'Blog & Content Strategy'),
  ('Define monthly content themes Q3',       'Set overarching themes and campaign hooks for Jul–Sep.',            'backlog',  'm', 'bu', 'May 25, 2026', 'FR', 'Blog & Content Strategy'),
  ('Build 6-month content calendar',         'Plan all blog, social and email content through October.',          'backlog',  'h', 'bu', 'Jun 5, 2026',  'EL', 'Blog & Content Strategy'),
  ('Write product comparison article',       'Compare TD Africa offerings vs competitors — SEO-optimised.',       'review',   'm', 'bg', 'May 10, 2026', 'EL', 'Blog & Content Strategy'),
  ('Proofreading & publish May blog posts',  'Final review, add images, internal links, then publish all drafts.','backlog',  'l', 'bg', 'May 30, 2026', 'GA', 'Blog & Content Strategy'),

  -- Digital Ads & Paid Media
  ('Design May Instagram ad creatives',      'Create 5 static and 2 animated ad sets for May campaigns.',         'progress', 'h', 'bu', 'May 3, 2026',  'LE', 'Digital Ads & Paid Media'),
  ('Produce 3 short-form video ads',         'Shoot and edit 15-second product highlight videos for Reels.',      'progress', 'h', 'bu', 'May 20, 2026', 'MC', 'Digital Ads & Paid Media'),
  ('Set up LinkedIn lead-gen campaign',      'Configure campaign, copy, targeting and budget in LinkedIn Ads.',   'backlog',  'm', 'bu', 'May 15, 2026', 'GA', 'Digital Ads & Paid Media'),
  ('Write ad copy for all May campaigns',    'Draft headlines and body copy for every active ad set.',            'review',   'm', 'bg', 'May 1, 2026',  'EL', 'Digital Ads & Paid Media'),
  ('Q1 paid media performance report',       'Analyse spend, impressions, CTR and conversions across all platforms.','done',  'l', 'bg', 'Apr 10, 2026', 'GA', 'Digital Ads & Paid Media'),

  -- Customer Sales Enablement
  ('Telemarketing outreach — May batch',     'Call 200 warm leads from the April campaign for follow-up.',        'progress', 'h', 'bu', 'May 15, 2026', 'ME', 'Customer Sales Enablement'),
  ('Update CRM with April lead outcomes',    'Log call outcomes, stage changes and notes for all April contacts.','review',   'm', 'bu', 'May 5, 2026',  'AS', 'Customer Sales Enablement'),
  ('Create sales pitch deck — digital ads',  'Build a slide deck for the telemarketing team to use on calls.',    'backlog',  'm', 'bg', 'May 20, 2026', 'OL', 'Customer Sales Enablement'),
  ('Ecommerce product listing refresh',      'Update product titles, descriptions and images on the store.',      'backlog',  'h', 'bu', 'Jun 1, 2026',  'OL', 'Customer Sales Enablement'),

  -- Brand & Visual Identity Refresh
  ('Conduct brand audit — existing assets',  'Review all current logos, colours, fonts and collateral.',          'backlog',  'm', 'bu', 'May 15, 2026', 'GA', 'Brand & Visual Identity Refresh'),
  ('Design new brand guidelines document',   'Produce full brand book: colours, typography and logo usage rules.','progress', 'h', 'bu', 'Jun 15, 2026', 'LE', 'Brand & Visual Identity Refresh'),
  ('Redesign letterhead and email templates','Update Word, PowerPoint and email templates with the new brand.',   'backlog',  'l', 'bg', 'Jun 30, 2026', 'RO', 'Brand & Visual Identity Refresh')

) AS t(title, description, status, pri, dept, due_date, ass_initials, proj_name)
JOIN users u ON u.initials = t.ass_initials
JOIN projects p ON p.name  = t.proj_name;


-- ── Step 7: Notifications ─────────────────────────────────────
INSERT INTO notifications (user_id, message, is_read)
SELECT u.id, n.message, n.is_read FROM (VALUES
  ('Leke completed the May Instagram ad creatives — ready for review.',       FALSE),
  ('Gideon fixed all broken links on the website. SEO audit is unblocked.',  FALSE),
  ('Deadline this week: OEM partner welcome kit is due May 10.',             FALSE),
  ('Elijah submitted the product comparison blog post for proofreading.',    FALSE),
  ('Adesuwa updated the CRM with all April lead outcomes.',                  TRUE),
  ('Miracle delivered the 3 short-form video ads — check your inbox.',       TRUE)
) AS n(message, is_read)
JOIN users u ON u.initials = 'FR';
