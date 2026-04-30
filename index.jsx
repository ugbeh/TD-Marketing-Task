import { useState, useEffect, useCallback, useRef } from "react";
import { BarChart, Bar, PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { LayoutDashboard, FolderKanban, ListTodo, Users, CalendarDays, GitBranch, BarChart3, Bell, Search, Plus, X, ChevronLeft, ChevronRight, Pencil, Trash2, AlertCircle, LogOut, ShieldCheck, MessageSquare, Send, Eye, EyeOff, Sun, Moon } from "lucide-react";
import { useAuth } from './src/AuthContext';
import { useSocket, showDesktopNotification } from './src/SocketContext';
import * as API from './src/api';

/* ═══════════════════════════════════════════════════════════════
   ★  EASY CUSTOMISATION — non-developers start here
   ───────────────────────────────────────────────────────────────
   Change branding, colours, and app name from this one section.
   No need to search through the rest of the file.
   ═══════════════════════════════════════════════════════════════ */

// ── Branding ─────────────────────────────────────────────────
// LOGO: place your logo file in the /public/img/ folder, then
//       update the path below (keep the leading slash).
const BRAND = {
  company:  'TD Africa',           // Company name (shown in sidebar & page title)
  subtitle: 'Marketing Team',       // Subtitle shown under the logo
  logo:     '/img/logo-white.png', // White logo used on dark backgrounds
};

// ── Colour scheme ─────────────────────────────────────────────
// To change the main brand colour, update `burg` (primary) only.
// Everything else updates automatically.
// Tip: use a hex colour picker — try https://htmlcolorcodes.com
const COLORS = {
  burg:    '#8B1A2B',  // ← PRIMARY brand colour (dark burgundy) — change this to rebrand
  burg2:   '#A52035',  // Slightly lighter shade — hover / active states
  burgDim: '#F8EEF0',  // Very light tint — used for badges & highlights
  // ── Supporting colours (no need to change these) ──────────
  charcoal: '#3D0A14', gray: '#848688',
  teal: '#0E8C88',   tealD: '#E6F6F5',
  blue: '#3A6FD8',   blueD: '#E8EFF9',
  coral: '#D05A2A',  coralD: '#FBF0EB',
  green: '#22A55A',  greenD: '#E8F7EF',
  red: '#D63B3B',    redD: '#FCEAEA',
  pink: '#C03A8A',   pinkD: '#FAE8F3',
  purple: '#7A50D0', purpleD: '#F0EAF9',
  amber: '#C88A18',  amberD: '#FBF4E6',
};

/* ═══════════════════════════════════════════════════════════════
   END OF EASY CUSTOMISATION
   ═══════════════════════════════════════════════════════════════ */
const MEMBER_COLORS = {
  FR: { bg: COLORS.burgDim, fg: COLORS.burg },   GA: { bg: COLORS.blueD,   fg: COLORS.blue   },
  GI: { bg: COLORS.tealD,  fg: COLORS.teal  },   NN: { bg: COLORS.purpleD, fg: COLORS.purple },
  MA: { bg: COLORS.amberD, fg: COLORS.amber },   ML: { bg: COLORS.coralD,  fg: COLORS.coral  },
  LE: { bg: COLORS.greenD, fg: COLORS.green },   RO: { bg: COLORS.pinkD,   fg: COLORS.pink   },
  FA: { bg: COLORS.burgDim, fg: COLORS.burg },   DA: { bg: COLORS.blueD,   fg: COLORS.blue   },
  MC: { bg: COLORS.tealD,  fg: COLORS.teal  },   ME: { bg: COLORS.purpleD, fg: COLORS.purple },
  AS: { bg: COLORS.amberD, fg: COLORS.amber },   EL: { bg: COLORS.coralD,  fg: COLORS.coral  },
  OL: { bg: COLORS.greenD, fg: COLORS.green },
};
const MEMBER_NAMES = {
  FR: 'Fridel',   GA: 'Gabriel',  GI: 'Gideon',   NN: 'Nnadozie', MA: 'Mary',
  ML: 'Milicent', LE: 'Leke',     RO: 'Rotimi',   FA: 'Favour',   DA: 'Dammy',
  MC: 'Miracle',  ME: 'Mercy',    AS: 'Adesuwa',  EL: 'Elijah',   OL: 'Olamide',
};
const MEMBER_ROLES = {
  FR: 'Head of Marketing',      GA: 'Digital Strategist',     GI: 'SEO Manager',
  NN: 'OEM Manager',            MA: 'OEM Manager',            ML: 'OEM Manager',
  LE: 'Lead Graphics Designer', RO: 'Graphics Designer',      FA: 'Community Manager',
  DA: 'Social Media Manager',   MC: 'Videographer',           ME: 'Telemarketing Executive',
  AS: 'Lead, Telemarketing',    EL: 'Content Writer',         OL: 'Ecommerce Manager',
};
// Profile photo URLs — populated from the database on load, updated after uploads.
// Keyed by initials (e.g. AVATAR_URLS['SO'] = '/uploads/avatars/3-17123456.jpg')
const AVATAR_URLS   = {};
const STATUS_PILLS = {
  planning:  { bg: COLORS.blueD,   fg: COLORS.blue,   label: 'Planning'  },
  active:    { bg: COLORS.tealD,   fg: COLORS.teal,   label: 'Active'    },
  review:    { bg: COLORS.amberD,  fg: COLORS.amber,  label: 'In Review' },
  draft:     { bg: COLORS.purpleD, fg: COLORS.purple, label: 'Draft'     },
  // on-hold and done added so projects can be marked as paused or completed
  'on-hold': { bg: '#F0EDFF',      fg: '#7A50D0',     label: 'On Hold'   },
  done:      { bg: COLORS.greenD,  fg: COLORS.green,  label: 'Done'      },
};
const PRIORITY_DOT = { h: COLORS.red, m: COLORS.amber, l: COLORS.green };

// ── Date conversion helpers ───────────────────────────────────
// The DB stores dates as free-form VARCHAR like "Apr 5, 2025".
// input[type=date] works with ISO "YYYY-MM-DD". These two functions
// bridge the gap so the calendar picker can pre-populate correctly.
const _MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
// "Apr 5" or "Apr 5, 2025" → "2025-04-05"  (for input[type=date])
const toDateInput = (str) => {
  if (!str) return '';
  const m = str.match(/([A-Za-z]{3})\s+(\d{1,2})(?:,?\s*(\d{4}))?/);
  if (!m) return '';
  const mi = _MONTHS.indexOf(m[1]);
  if (mi < 0) return '';
  const yr = m[3] ? parseInt(m[3]) : new Date().getFullYear();
  return `${yr}-${String(mi + 1).padStart(2,'0')}-${String(parseInt(m[2])).padStart(2,'0')}`;
};
// "2025-04-05" → "Apr 5, 2025"  (stored back to DB)
const fromDateInput = (str) => {
  if (!str) return '';
  const [yr, mo, day] = str.split('-').map(Number);
  if (!yr || !mo || !day) return '';
  return `${_MONTHS[mo - 1]} ${day}, ${yr}`;
};
const COL_STAT = ['backlog', 'progress', 'review', 'approved', 'done'];
const COL_LABELS = { backlog: 'Backlog', progress: 'In Progress', review: 'In Review', approved: 'Approved', done: 'Done' };
const COL_DOT = { backlog: COLORS.gray, progress: COLORS.blue, review: COLORS.amber, approved: COLORS.purple, done: COLORS.green };

// ── Department categories — edit this list to match your team ──
const DEPT_OPTIONS = ['SEO', 'Social', 'Video', 'Content', 'Digital', 'OEM', 'Analytics', 'General'];
const DEPT_COLORS = {
  SEO:       { bg: COLORS.blueD,   fg: COLORS.blue   },
  Social:    { bg: COLORS.tealD,   fg: COLORS.teal   },
  Video:     { bg: COLORS.purpleD, fg: COLORS.purple },
  Content:   { bg: COLORS.amberD,  fg: COLORS.amber  },
  Digital:   { bg: COLORS.coralD,  fg: COLORS.coral  },
  OEM:       { bg: COLORS.greenD,  fg: COLORS.green  },
  Analytics: { bg: COLORS.blueD,   fg: COLORS.blue   },
  General:   { bg: '#EBEAED',      fg: '#848688'     },
};

const NAV_ITEMS = [
  { section: 'Workspace' },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'projects', label: 'Projects', icon: FolderKanban, badge: 'camps' },
  { id: 'tasks', label: 'Task Board', icon: ListTodo, badge: 'tasks' },
  { id: 'team', label: 'Team', icon: Users },
  { id: 'calendar', label: 'Calendar', icon: CalendarDays },
  { id: 'timeline', label: 'Timeline', icon: GitBranch },
  { id: 'chat', label: 'Team Chat', icon: MessageSquare, badge: 'chat' },
  { section: 'Analytics' },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'notifs', label: 'Notifications', icon: Bell, badge: 'notifs' },
  // ── Admin section — only shown to users with role = 'admin' ──
  // To add more admin-only items, add them here with adminOnly: true
  { section: 'Admin', adminOnly: true },
  { id: 'admin', label: 'Admin Panel', icon: ShieldCheck, adminOnly: true },
];

const VTITLES = { dashboard: 'Overview', projects: 'Project Management', tasks: 'Task Board', team: 'Marketing Team', calendar: 'Calendar', timeline: 'Project Timeline', reports: 'Reports & Analytics', notifs: 'Notifications', chat: 'Team Chat', admin: 'Admin Panel' };

// NOTE: Static data removed — all data now loads from the database via the API.
// See the loadData() function inside the App component below.

/* ═══════ SMALL COMPONENTS ═══════ */
// Avatar — shows a profile photo if one has been uploaded, otherwise initials.
// The `k` prop is the member's initials (e.g. 'SO').
// AVATAR_URLS[k] is populated by loadData() and updated after photo uploads.
const Avatar = ({ k, size = 28, style = {} }) => {
  const c       = MEMBER_COLORS[k] || { bg: '#EBEAED', fg: '#5A5860' };
  const photoUrl = AVATAR_URLS[k];
  const base     = { width: size, height: size, borderRadius: '50%', flexShrink: 0, ...style };
  if (photoUrl) {
    return (
      <img
        src={photoUrl} alt={k}
        style={{ ...base, objectFit: 'cover', display: 'block' }}
        // If the photo fails to load (e.g. file deleted), hide the broken image
        onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
      />
    );
  }
  return (
    <div style={{ ...base, background: c.bg, color: c.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.38, fontWeight: 600, fontFamily: "'Syne',sans-serif" }}>
      {k}
    </div>
  );
};

const Pill = ({ status }) => {
  const s = STATUS_PILLS[status];
  if (!s) return null;
  return <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: s.bg, color: s.fg, whiteSpace: 'nowrap' }}>{s.label}</span>;
};

const DeptTag = ({ dept }) => {
  if (!dept) return null;
  const d = DEPT_COLORS[dept] || { bg: '#EBEAED', fg: '#848688' };
  return <span style={{ fontSize: 10, padding: '2px 8px', borderRadius: 20, fontWeight: 600, background: d.bg, color: d.fg, display: 'inline-block', marginBottom: 5 }}>{dept}</span>;
};

const Tag = ({ children }) => <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: '#EBEAED', color: '#918E98' }}>{children}</span>;

// pctToTrafficColor: red < 40%, amber 40–69%, green ≥ 70%
// Used for the "traffic light" progress bar variant on project cards.
const pctToTrafficColor = (pct) => {
  if (pct >= 70) return '#22A55A'; // green
  if (pct >= 40) return '#C88A18'; // amber
  return '#B83B3B';                // red
};

// Pass traffic={true} to get the red→amber→green colour instead of the project brand colour.
const ProgressBar = ({ pct, color, width, traffic }) => {
  const barColor = traffic ? pctToTrafficColor(pct) : color;
  return (
  <div style={{ background: '#FBF3F4', borderRadius: 4, height: 5, overflow: 'hidden', width: width || '100%' }}>
    <div style={{ height: '100%', borderRadius: 4, width: `${pct}%`, background: barColor, transition: 'width 0.3s' }} />
  </div>
  );
};

const StatCard = ({ label, value, delta, up }) => (
  <div style={{ background: '#fff', border: '1px solid #E2E0E5', borderRadius: 10, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
    <div style={{ fontSize: 11, color: '#918E98', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 }}>{label}</div>
    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 700, color: COLORS.charcoal }}>{value}</div>
    <div style={{ fontSize: 11, marginTop: 4, color: up ? COLORS.green : COLORS.red }}>{delta}</div>
  </div>
);

const Panel = ({ title, action, actionClick, children }) => (
  <div style={{ background: '#fff', border: '1px solid #E2E0E5', borderRadius: 10, padding: 18, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
    {(title || action) && (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        {title && <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 13, fontWeight: 600, color: COLORS.charcoal }}>{title}</div>}
        {action && <div onClick={actionClick} style={{ fontSize: 12, color: '#918E98', cursor: 'pointer' }}>{action}</div>}
      </div>
    )}
    {children}
  </div>
);

const Modal = ({ open, onClose, title, subtitle, children, footer }) => {
  if (!open) return null;
  const isMob = window.innerWidth < 768;
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: isMob ? 'flex-end' : 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(3px)' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', border: '1px solid #D0CDD5', borderRadius: isMob ? '14px 14px 0 0' : 10, padding: isMob ? '20px 16px 28px' : 24, width: isMob ? '100%' : 520, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
        <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 17, fontWeight: 700, color: COLORS.charcoal, marginBottom: 4 }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: '#918E98', marginBottom: 18 }}>{subtitle}</div>}
        {children}
        {footer && <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18, paddingTop: 14, borderTop: '1px solid #E2E0E5' }}>{footer}</div>}
      </div>
    </div>
  );
};

const Btn = ({ children, primary, danger, sm, onClick, style: sx }) => {
  const base = { display: 'inline-flex', alignItems: 'center', gap: 6, padding: sm ? '5px 10px' : '7px 14px', borderRadius: 6, fontSize: sm ? 12 : 13, fontWeight: 500, cursor: 'pointer', border: '1px solid #D0CDD5', background: '#FBF3F4', color: '#5A5860', transition: 'all .15s', whiteSpace: 'nowrap' };
  if (primary) Object.assign(base, { background: COLORS.burg, color: '#fff', borderColor: COLORS.burg });
  if (danger) Object.assign(base, { background: COLORS.redD, color: COLORS.red, borderColor: COLORS.red });
  return <button onClick={onClick} style={{ ...base, ...sx }}>{children}</button>;
};

const FormField = ({ label, children }) => (
  <div style={{ marginBottom: 12 }}>
    <label style={{ fontSize: 12, color: '#5A5860', display: 'block', marginBottom: 5 }}>{label}</label>
    {children}
  </div>
);

const inputStyle = { background: '#FBF3F4', border: '1px solid #D0CDD5', borderRadius: 6, color: '#3D0A14', fontFamily: "'DM Sans',sans-serif", fontSize: 13, padding: '8px 12px', width: '100%', outline: 'none' };

/* ═══════ HELPERS — convert API shape → UI shape ═══════ */
// The API returns field names like assignee_initials, project_name, priority.
// The existing UI components expect: ass, camp, pri, collabs (array of initials).
const toTask = (t) => ({
  ...t,
  ass:    t.assignee_initials ?? t.ass,
  camp:   t.project_name     ?? t.camp,
  pri:    t.priority         ?? t.pri,
  desc:   t.description      ?? t.desc,
  collabs: t.collaborators
    ? t.collaborators.map(c => c.initials)
    : (t.collabs || []),
});

const toProject = (p) => ({
  ...p,
  pct:     p.progress !== undefined ? p.progress : p.pct,
  members: p.members ? p.members.map(m => m.initials) : (p.members || []),
  tags:    p.tags || [],
});

/* ═══════ MAIN APP ═══════ */
export default function App() {
  const { user: authUser, logout }        = useAuth();
  const { socket }                        = useSocket();

  const [view, setView]                   = useState('dashboard');
  const [projects, setProjects]           = useState([]);
  const [tasks, setTasks]                 = useState([]);
  const [members, setMembers]             = useState({});
  const [rawUsers, setRawUsers]           = useState([]); // full user objects with IDs
  const [dataLoading, setDataLoading]     = useState(true);
  const [activeTaskId, setActiveTaskId]   = useState(null);
  const [activeFilter, setActiveFilter]   = useState('all');
  const [taskModal, setTaskModal]         = useState(null);
  const [projModal, setProjModal]         = useState(null);
  const [memberModal, setMemberModal]     = useState(null);
  const [confirmModal, setConfirmModal]   = useState(null);
  const [addMemberModal, setAddMemberModal] = useState(false);
  const [resetPassModal, setResetPassModal] = useState(null); // { userId, userName, initials }
  const [unreadChat, setUnreadChat]        = useState(0);
  const [onlineUserIds, setOnlineUserIds]  = useState(new Set());
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth]     = useState(window.innerWidth);
  const [darkMode, setDarkMode]           = useState(() => localStorage.getItem('tdDark') === '1');

  // Persist dark mode preference
  useEffect(() => { localStorage.setItem('tdDark', darkMode ? '1' : '0'); }, [darkMode]);

  // ── Theme object — all colour decisions in one place ──────────
  const T = {
    bg:           darkMode ? '#111111' : '#F4F3F5',
    surface:      darkMode ? '#1c1c1c' : '#ffffff',
    surface2:     darkMode ? '#252525' : '#FBF3F4',
    border:       darkMode ? '#2e2e2e' : '#E2E0E5',
    text:         darkMode ? '#e8e8e8' : '#3D0A14',
    textSub:      darkMode ? '#888888' : '#918E98',
    navBg:        darkMode ? '#161616' : '#ffffff',
    navBorder:    darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    navText:      darkMode ? '#d0d0d0' : '#000000',
    navTextSub:   darkMode ? 'rgba(255,255,255,0.4)'  : 'rgba(0,0,0,0.45)',
    navSection:   darkMode ? 'rgba(255,255,255,0.3)'  : 'rgba(0,0,0,0.4)',
    navActive:    darkMode ? 'rgba(139,26,43,0.28)'   : COLORS.burgDim,
    searchBg:     darkMode ? '#222222' : '#FBF3F4',
    filterIn:     darkMode ? '#252525' : 'transparent',
    filterBorder: darkMode ? '#3a3a3a' : '#E2E0E5',
    filterText:   darkMode ? '#999999' : '#5A5860',
    colBg:        darkMode ? '#1c1c1c' : '#ffffff',
    colHover:     darkMode ? 'rgba(139,26,43,0.15)' : COLORS.burgDim,
    colHoverBorder: darkMode ? COLORS.burg : COLORS.burg,
    cardBg:       darkMode ? '#252525' : '#FBF3F4',
    cardBorder:   darkMode ? '#363636' : '#E2E0E5',
    cardText:     darkMode ? '#e0e0e0' : '#3D0A14',
  };

  // ── Load all data from the API on mount ────────────────────
  const loadData = useCallback(async () => {
    // ── DEBUG: logs appear in browser DevTools → Console tab (press F12) ──
    console.log('⏳ Loading dashboard data from server...');
    try {
      const [tasksRes, projectsRes, usersRes] = await Promise.all([
        API.getTasks(),
        API.getProjects(),
        API.getUsers(),
      ]);

      setTasks(tasksRes.data.tasks.map(toTask));
      setProjects(projectsRes.data.projects.map(toProject));
      setRawUsers(usersRes.data.users);
      // ── DEBUG: confirm what was loaded ──────────────────────────────────
      console.log(`✅ Data loaded — ${tasksRes.data.tasks.length} tasks, ${projectsRes.data.projects.length} projects, ${usersRes.data.users.length} users`);

      // Rebuild the MEMBER_NAMES / MEMBER_ROLES lookup tables and members object
      const membersObj = {};
      usersRes.data.users.forEach(u => {
        MEMBER_NAMES[u.initials]  = u.name.split(' ')[0];
        MEMBER_ROLES[u.initials]  = u.job_title || u.role;
        AVATAR_URLS[u.initials]   = u.avatar_url || null; // photo URL or null → falls back to initials
        membersObj[u.initials] = {
          name:   u.name,
          role:   u.job_title || u.role,
          status: u.status || 'Online',
          active: tasksRes.data.tasks.filter(t =>
            t.assignee_initials === u.initials && t.status !== 'done'
          ).length,
          tasks: [],
        };
      });
      setMembers(membersObj);
    } catch (err) {
      // ── DEBUG: if data fails to load, the full error shows here ─────────
      console.error('❌ Failed to load dashboard data:', err.message);
      console.error('   → Is the server running? Check Terminal 1 (npm run dev in /server)');
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Real-time cross-browser refresh ────────────────────────
  // SocketContext dispatches 'app:data-refresh' whenever the server
  // broadcasts that tasks or projects have changed. This ensures every
  // open browser/tab reloads without the user having to refresh.
  useEffect(() => {
    const handler = () => loadData();
    window.addEventListener('app:data-refresh', handler);
    return () => window.removeEventListener('app:data-refresh', handler);
  }, [loadData]);

  // ── Window resize — track mobile breakpoint ────────────────
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const isMobile = windowWidth < 768;

  // ── Global chat listener — runs when NOT on the chat view ────
  // Increments the unread badge and fires a desktop notification
  // when a new message arrives from someone else.
  useEffect(() => {
    if (!socket) return;
    const handler = (msg) => {
      if (view !== 'chat' && msg.user_id !== authUser?.id) {
        setUnreadChat(n => n + 1);
        showDesktopNotification(`${msg.name} in Team Chat`, msg.content);
      }
    };
    socket.on('chat:message', handler);
    return () => socket.off('chat:message', handler);
  }, [socket, view, authUser?.id]);

  // ── Presence listener — tracks who is actually online right now ─
  useEffect(() => {
    if (!socket) return;
    const handler = (ids) => setOnlineUserIds(new Set(ids));
    socket.on('presence:update', handler);
    return () => socket.off('presence:update', handler);
  }, [socket]);

  // goNav must be declared before any conditional returns (React Rules of Hooks)
  const goNav = useCallback((id) => {
    setView(id);
    setActiveTaskId(null);
    setMobileSidebarOpen(false); // close drawer on mobile after navigation
    if (id === 'chat') setUnreadChat(0); // clear badge when opening chat
  }, []);

  // Show a loading screen while the first data fetch is in progress
  // This is AFTER all hooks — safe to return early here
  if (dataLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', fontFamily: "'DM Sans',sans-serif", color: '#848688', fontSize: 14 }}>
        Loading dashboard…
      </div>
    );
  }

  const openTasks    = tasks.filter(t => t.status !== 'done').length;
  const doneTasks    = tasks.filter(t => t.status === 'done').length;
  // "Ongoing" = any project not yet done (includes planning, active, on-hold, draft, review)
  const activeProjects = projects.filter(p => p.status !== 'done').length;
  const activeTask   = tasks.find(t => t.id === activeTaskId);

  /* ── TASK ACTIONS ── */
  // Optimistic update: move task in UI immediately, then sync with API
  const moveTask = async (id, newStatus) => {
    setTasks(ts => ts.map(t => t.id === id ? { ...t, status: newStatus } : t));
    try {
      await API.updateTaskStatus(id, newStatus);
    } catch (err) {
      console.error('Move task failed:', err.message);
      loadData(); // revert by reloading
    }
  };

  const deleteTask = async (id) => {
    try {
      await API.deleteTask(id);
      setTasks(ts => ts.filter(t => t.id !== id));
      setActiveTaskId(null);
    } catch (err) { console.error('Delete task failed:', err.message); }
  };

  const toggleCollab = async (taskId, key) => {
    // Optimistic UI update
    setTasks(ts => ts.map(t => {
      if (t.id !== taskId) return t;
      const c = t.collabs || [];
      return { ...t, collabs: c.includes(key) ? c.filter(k => k !== key) : [...c, key] };
    }));
    // Sync with API — send the full updated collaborators list
    const task = tasks.find(t => t.id === taskId);
    const current = task?.collabs || [];
    const updated = current.includes(key) ? current.filter(k => k !== key) : [...current, key];
    const collaboratorIds = updated.map(initials => rawUsers.find(u => u.initials === initials)?.id).filter(Boolean);
    try {
      await API.updateTask(taskId, { collaborators: collaboratorIds });
    } catch (err) { console.error('Toggle collab failed:', err.message); }
  };

  const changePriority = async (taskId, pri) => {
    setTasks(ts => ts.map(t => t.id === taskId ? { ...t, pri } : t));
    try {
      await API.updateTask(taskId, { priority: pri });
    } catch (err) { console.error('Change priority failed:', err.message); }
  };

  // Helper: look up a user's database ID from their initials
  const userId = (initials) => rawUsers.find(u => u.initials === initials)?.id;

  const submitTask = async (data) => {
    const apiPayload = {
      title:          data.title,
      description:    data.desc,
      status:         data.status,
      priority:       data.pri,
      dept:           data.dept,
      due_date:       data.due,
      assignee_id:    userId(data.ass),
      project_id:     projects.find(p => p.name === data.camp)?.id,
      collaborators:  (data.collabs || []).map(userId).filter(Boolean),
    };
    try {
      if (data.id) {
        const res = await API.updateTask(data.id, apiPayload);
        setTasks(ts => ts.map(t => t.id === data.id ? toTask(res.data.task) : t));
      } else {
        const res = await API.createTask(apiPayload);
        setTasks(ts => [toTask(res.data.task), ...ts]);
      }
    } catch (err) { console.error('Submit task failed:', err.message); }
    setTaskModal(null);
  };

  const submitProject = async (data) => {
    const PROJECT_COLORS_LIST = [COLORS.teal, COLORS.amber, COLORS.blue, COLORS.coral, COLORS.purple, COLORS.green];
    const apiPayload = {
      name:       data.name,
      type:       data.type,
      status:     data.status,
      progress:   data.pct ?? data.progress ?? 0,
      color:      data.color || PROJECT_COLORS_LIST[projects.length % 6],
      start_date: data.start,
      due_date:   data.due,
      members:    (data.members || []).map(userId).filter(Boolean),
      tags:       data.tags || [],
    };
    try {
      if (data.id) {
        const res = await API.updateProject(data.id, apiPayload);
        setProjects(ps => ps.map(p => p.id === data.id ? toProject(res.data.project) : p));
      } else {
        const res = await API.createProject(apiPayload);
        setProjects(ps => [...ps, toProject(res.data.project)]);
      }
    } catch (err) { console.error('Submit project failed:', err.message); }
    setProjModal(null);
  };

  // +/– progress buttons on the dashboard and projects view.
  // Optimistic update: state updates immediately; reverted on API failure.
  const adjustProgress = async (projectId, delta) => {
    const project = projects.find(p => p.id === projectId);
    if (!project) return;
    const newPct = Math.max(0, Math.min(100, (project.pct || 0) + delta));
    if (newPct === project.pct) return; // already at boundary, nothing to do
    setProjects(ps => ps.map(p => p.id === projectId ? { ...p, pct: newPct } : p));
    try {
      await API.updateProject(projectId, { progress: newPct });
    } catch (err) {
      console.error('Progress update failed:', err.message);
      setProjects(ps => ps.map(p => p.id === projectId ? { ...p, pct: project.pct } : p));
    }
  };

  const saveMember = async (key, data) => {
    const user = rawUsers.find(u => u.initials === key);
    if (!user) return;
    try {
      // Only send email if it changed (avoids unnecessary uniqueness checks)
      const payload = { name: data.name, job_title: data.role, status: data.status };
      if (data.email && data.email.trim() !== user.email) {
        payload.email = data.email.trim();
      }
      if (data.password) payload.password = data.password;
      await API.updateUser(user.id, payload);
      setMembers(m => ({ ...m, [key]: { ...m[key], ...data } }));
      setRawUsers(us => us.map(u => u.initials === key ? { ...u, ...payload } : u));
      MEMBER_NAMES[key] = data.name.split(' ')[0];
      MEMBER_ROLES[key] = data.role;
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to save changes.');
      console.error('Save member failed:', err.message);
    }
    setMemberModal(null);
  };

  // Add a brand-new team member (admin only)
  const addMember = async (formData) => {
    try {
      const res = await API.createUser(formData);
      const u   = res.data.user;
      // Immediately reflect in state without a full reload
      MEMBER_NAMES[u.initials] = u.name.split(' ')[0];
      MEMBER_ROLES[u.initials] = u.job_title || u.role;
      setMembers(m => ({
        ...m,
        [u.initials]: { name: u.name, role: u.job_title || '', status: 'Online', active: 0, tasks: [] },
      }));
      setRawUsers(us => [...us, u]);
      setAddMemberModal(false);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to add member.';
      alert(msg);
    }
  };

  // Promote a member to admin or demote admin to member
  const changeUserRole = async (initials, newRole) => {
    const u = rawUsers.find(r => r.initials === initials);
    if (!u) return;
    try {
      await API.updateUserRole(u.id, newRole);
      setRawUsers(us => us.map(r => r.initials === initials ? { ...r, role: newRole } : r));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role.');
    }
  };

  // Remove a team member entirely (admin only)
  const removeMember = async (initials) => {
    const u = rawUsers.find(r => r.initials === initials);
    if (!u) return;
    try {
      await API.deleteUser(u.id);
      delete MEMBER_NAMES[initials];
      delete MEMBER_ROLES[initials];
      setMembers(m => { const next = { ...m }; delete next[initials]; return next; });
      setRawUsers(us => us.filter(r => r.initials !== initials));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to remove member.');
    }
  };

  /* ── DRAG & DROP ── */
  const onDragStart = (e, id) => { e.dataTransfer.setData('text/plain', String(id)); e.dataTransfer.effectAllowed = 'move'; };
  const onDrop = (e, status) => { e.preventDefault(); const id = parseInt(e.dataTransfer.getData('text/plain'), 10); if (id) moveTask(id, status); };

  /* ═══════ SIDEBAR ═══════ */
  const Sidebar = () => (
    <>
      {/* Mobile backdrop — tap outside to close */}
      {isMobile && mobileSidebarOpen && (
        <div onClick={() => setMobileSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 199 }} />
      )}
      <nav style={{
        width: 222, minWidth: 222, background: T.navBg,
        display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden',
        zIndex: 200, borderRight: `1px solid ${T.navBorder}`, transition: 'background 0.2s',
        ...(isMobile ? {
          position: 'fixed', top: 0, left: 0,
          transform: mobileSidebarOpen ? 'translateX(0)' : 'translateX(-222px)',
          transition: 'transform 0.25s ease',
          boxShadow: mobileSidebarOpen ? '4px 0 24px rgba(0,0,0,0.2)' : 'none',
        } : {}),
      }}>
        {/* ── Sidebar header — logo + company name ── */}
        <div style={{ padding: '16px 16px 14px', borderBottom: `1px solid ${T.navBorder}`, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <img src={BRAND.logo} alt={BRAND.company}
              style={{ height: 52, maxWidth: '100%', objectFit: 'contain', objectPosition: 'left' }}
              onError={e => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }}
            />
            <div style={{ display: 'none', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: COLORS.burg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 12, color: '#fff' }}>TD</div>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 15, color: T.navText }}>{BRAND.company}</div>
            </div>
            {/* Show user's job title as personalised subtitle */}
            <div style={{ fontSize: 10, color: T.navTextSub, textTransform: 'uppercase', letterSpacing: 1, marginTop: 6 }}>
              {authUser?.job_title || BRAND.subtitle}
            </div>
          </div>
          {isMobile && (
            <button onClick={() => setMobileSidebarOpen(false)}
              style={{ background: T.navBorder, border: 'none', borderRadius: 6, color: T.navText, cursor: 'pointer', padding: '5px 9px', fontSize: 15, lineHeight: 1, flexShrink: 0, marginLeft: 8, marginTop: 2 }}>✕</button>
          )}
        </div>
        <div style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
          {NAV_ITEMS.filter(item => !item.adminOnly || authUser?.role === 'admin').map((item, i) => {
            if (item.section) return <div key={i} style={{ fontSize: 10, letterSpacing: 1, textTransform: 'uppercase', color: T.navSection, padding: '10px 8px 6px', fontWeight: 500 }}>{item.section}</div>;
            const active = view === item.id;
            const Icon = item.icon;
            const badgeVal = item.badge === 'camps' ? projects.length : item.badge === 'tasks' ? openTasks : item.badge === 'notifs' ? null : item.badge === 'chat' && unreadChat > 0 ? unreadChat : null;
            return (
              <div key={item.id} onClick={() => goNav(item.id)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 6, cursor: 'pointer', color: active ? COLORS.burg : T.navText, fontSize: 13, marginBottom: 1, background: active ? T.navActive : 'transparent', fontWeight: active ? 600 : 400, opacity: active ? 1 : 0.85 }}>
                <Icon size={16} />
                {item.label}
                {badgeVal !== null && <span style={{ marginLeft: 'auto', background: COLORS.burg, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 6px', minWidth: 18, textAlign: 'center' }}>{badgeVal}</span>}
              </div>
            );
          })}
        </div>
        <div style={{ padding: 12, borderTop: `1px solid ${T.navBorder}` }}>
          {authUser?.initials === 'MT' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 6 }}>
              <Avatar k="MT" size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.navText }}>Team View</div>
                <div style={{ fontSize: 10, color: T.navTextSub }}>Shared session</div>
              </div>
            </div>
          ) : (
            <div onClick={() => setMemberModal({ key: authUser?.initials, name: authUser?.name || '', email: authUser?.email || '', role: authUser?.job_title || '', status: authUser?.status || 'Online' })}
              style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '7px 8px', borderRadius: 6, cursor: 'pointer' }} title="View profile">
              <Avatar k={authUser?.initials || 'MT'} size={28} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: T.navText, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{authUser?.name?.split(' ')[0] || 'User'}</div>
                <div style={{ fontSize: 10, color: T.navTextSub }}>{authUser?.job_title || 'Profile'}</div>
              </div>
            </div>
          )}
          <button onClick={logout}
            style={{ width: '100%', marginTop: 8, padding: '9px 12px', borderRadius: 7, background: T.filterIn, border: `1px solid ${T.navBorder}`, color: T.navText, cursor: 'pointer', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 7, justifyContent: 'center', fontFamily: "'DM Sans',sans-serif", transition: 'background 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.background = darkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)'}
            onMouseLeave={e => e.currentTarget.style.background = T.filterIn}>
            <LogOut size={13} /> Sign Out
          </button>
        </div>
      </nav>
    </>
  );

  /* ═══════ TASK CARD ═══════ */
  const TaskCard = ({ task }) => {
    const isDone = task.status === 'done';
    const collabs = (task.collabs || []).filter(c => c !== task.ass);
    return (
      <div draggable
        onDragStart={e => { e.currentTarget.style.opacity = '0.35'; onDragStart(e, task.id); }}
        onDragEnd={e => { e.currentTarget.style.opacity = isDone ? '0.6' : '1'; }}
        onClick={() => setActiveTaskId(task.id)}
        style={{ background: T.cardBg, border: `1px solid ${activeTaskId === task.id ? COLORS.burg : T.cardBorder}`, borderRadius: 6, padding: '11px 12px', cursor: 'grab', opacity: isDone ? 0.6 : 1, boxShadow: activeTaskId === task.id ? `0 0 0 1px ${COLORS.burg}` : 'none', transition: 'all .15s' }}>
        <DeptTag dept={task.dept} />
        <div style={{ fontSize: 13, fontWeight: 500, color: T.cardText, marginBottom: 7, lineHeight: 1.4 }}>{task.title}</div>
        {collabs.length > 0 && (
          <div style={{ display: 'flex', marginTop: 6 }}>
            {collabs.map(c => <Avatar key={c} k={c} size={16} style={{ marginLeft: -4, border: `1.5px solid ${T.cardBg}`, fontSize: 7 }} />)}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <span style={{ fontSize: 10, color: T.textSub, flex: 1 }}>{task.due || 'No date'}</span>
          <Avatar k={task.ass} size={18} />
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: PRIORITY_DOT[task.pri] || COLORS.green }} />
        </div>
      </div>
    );
  };

  /* ═══════ VIEWS ═══════ */
  const DashboardView = () => {
    const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const parseTaskDate = (str) => {
      if (!str) return null;
      const m = str.match(/([A-Za-z]{3})\s+(\d{1,2})(?:,?\s*(\d{4}))?/);
      if (!m) return null;
      const mi = MONTH_ABBR.indexOf(m[1]);
      const yr = m[3] ? parseInt(m[3]) : new Date().getFullYear();
      return mi >= 0 ? new Date(yr, mi, parseInt(m[2])) : null;
    };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const getDueLabel = (str) => {
      const d = parseTaskDate(str);
      if (!d) return { label: str || '—', color: '#918E98' };
      const diff = Math.round((d - today) / 864e5);
      if (diff < 0)   return { label: 'Overdue',        color: COLORS.red };
      if (diff === 0) return { label: 'Today',           color: COLORS.red };
      if (diff === 1) return { label: 'Tomorrow',        color: COLORS.amber };
      if (diff <= 7)  return { label: `In ${diff} days`, color: COLORS.amber };
      return                 { label: str,               color: '#918E98' };
    };
    // Include both task deadlines and project due dates in the upcoming panel
    const upcomingTasks = tasks
      .filter(t => !['done', 'approved'].includes(t.status) && (t.due_date || t.due))
      .map(t => { const due = t.due_date || t.due; return { _type: 'task', id: t.id, title: t.title, subLabel: MEMBER_NAMES[t.ass] || MEMBER_NAMES[t.assignee_initials] || 'Unassigned', _d: parseTaskDate(due), _due: due }; })
      .filter(t => t._d);

    const upcomingProjects = projects
      .filter(p => p.status !== 'done' && (p.due_date || p.due) && (p.due_date || p.due) !== 'Ongoing')
      .map(p => { const due = p.due_date || p.due; return { _type: 'project', id: p.id, title: p.name, subLabel: p.type || 'Project', _d: parseTaskDate(due), _due: due, _color: p.color }; })
      .filter(p => p._d);

    const upcoming = [...upcomingTasks, ...upcomingProjects]
      .sort((a, b) => a._d - b._d)
      .slice(0, 6);

    const weekCount = upcoming.filter(t => {
      const diff = Math.round((t._d - today) / 864e5);
      return diff >= 0 && diff <= 7;
    }).length;

    // Team workload computed from live tasks + project memberships so it
    // reflects newly created items without needing a full page reload.
    const workload = Object.keys(members).map(k => {
      const activeTasks = tasks.filter(t =>
        (t.ass === k || t.assignee_initials === k) && !['done', 'approved'].includes(t.status)
      ).length;
      const activeProjectCount = projects.filter(p =>
        p.status !== 'done' && (p.members || []).includes(k)
      ).length;
      return { k, total: activeTasks + activeProjectCount };
    });

    return (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 700, color: COLORS.charcoal, marginBottom: 4 }}>Hi, {authUser?.name?.split(' ')[0] || 'there'} 👋</h1>
        <p style={{ color: '#5A5860', fontSize: 12 }}>
          {weekCount > 0
            ? <>Here's what's happening across the marketing team today — <strong style={{ color: COLORS.burg }}>{weekCount} deadline{weekCount !== 1 ? 's' : ''}</strong> approaching this week.</>
            : <>Here's what's happening across the marketing team today. No deadlines due this week.</>}
        </p>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Ongoing Projects" value={activeProjects} delta={activeProjects > 0 ? `${activeProjects} active` : 'None yet'} up={activeProjects > 0} />
        <StatCard label="Open Tasks" value={openTasks} delta={openTasks > 0 ? `${openTasks} in progress` : 'All clear'} up={openTasks === 0} />
        <StatCard label="Completed Tasks" value={doneTasks} delta={doneTasks > 0 ? `${doneTasks} done` : 'None yet'} up={doneTasks > 0} />
        <StatCard label="Team Members" value={Object.keys(members).length} delta="Active" up />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '2fr 1fr', gap: 16 }}>
        {/* ── Ongoing Projects — traffic-light progress bar + +/– buttons ── */}
        <Panel title="Ongoing Projects" action="View all →" actionClick={() => goNav('projects')}>
          {projects.length === 0
            ? <p style={{ fontSize: 12, color: '#918E98', padding: '8px 0' }}>No projects yet. Create your first project to get started.</p>
            : projects.filter(p => p.status !== 'done').slice(0, 5).map(p => (
              <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid #E2E0E5' }}>
                <div style={{ width: 3, height: 36, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#3D0A14', marginBottom: 2 }}>{p.name}</div>
                  <div style={{ fontSize: 11, color: '#918E98', marginBottom: 5 }}>{p.tags.join(' • ')}</div>
                  {/* Traffic-light bar: red < 40%, amber 40–69%, green ≥ 70% */}
                  <ProgressBar pct={p.pct} color={p.color} traffic width={140} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                  <Pill status={p.status} />
                  {/* +/– progress controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button onClick={e => { e.stopPropagation(); adjustProgress(p.id, -5); }}
                      style={{ width: 20, height: 20, borderRadius: 4, border: '1px solid #E2E0E5', background: '#FBF3F4', cursor: 'pointer', fontSize: 13, lineHeight: 1, color: '#5A5860', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                    <span style={{ fontSize: 11, color: pctToTrafficColor(p.pct), fontWeight: 600, minWidth: 32, textAlign: 'center' }}>{p.pct}%</span>
                    <button onClick={e => { e.stopPropagation(); adjustProgress(p.id, 5); }}
                      style={{ width: 20, height: 20, borderRadius: 4, border: '1px solid #E2E0E5', background: '#FBF3F4', cursor: 'pointer', fontSize: 13, lineHeight: 1, color: '#5A5860', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
                  </div>
                </div>
              </div>
            ))
          }
        </Panel>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* ── Upcoming Deadlines — tasks AND projects ── */}
          <Panel title="Upcoming Deadlines">
            {upcoming.length === 0
              ? <p style={{ fontSize: 12, color: '#918E98', padding: '8px 0' }}>No upcoming deadlines. Tasks and projects with due dates will appear here.</p>
              : upcoming.map((item, i) => {
                  const { label, color } = getDueLabel(item._due);
                  return (
                    <div key={`${item._type}-${item.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: i < upcoming.length - 1 ? '1px solid #E2E0E5' : 'none' }}>
                      {/* Dot coloured by urgency; project dot is a square to distinguish */}
                      <div style={{ width: 6, height: 6, borderRadius: item._type === 'project' ? 1 : '50%', background: item._type === 'project' ? (item._color || color) : color, flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, color: '#3D0A14', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</div>
                        {/* Sub-label: assignee name for tasks, project type for projects */}
                        <div style={{ fontSize: 10, color: '#918E98' }}>
                          {item._type === 'project'
                            ? <span style={{ background: '#EBEAED', borderRadius: 3, padding: '1px 5px' }}>{item.subLabel}</span>
                            : item.subLabel}
                        </div>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 500, color, flexShrink: 0 }}>{label}</div>
                    </div>
                  );
                })
            }
          </Panel>

          <Panel title="Quick Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              <Btn sm onClick={() => setTaskModal({})} style={{ width: '100%', justifyContent: 'flex-start' }}><Plus size={13} /> Create New Task</Btn>
              <Btn sm onClick={() => setProjModal({})} style={{ width: '100%', justifyContent: 'flex-start' }}><FolderKanban size={13} /> Launch Project</Btn>
              <Btn sm onClick={() => goNav('reports')} style={{ width: '100%', justifyContent: 'flex-start' }}><BarChart3 size={13} /> View Reports</Btn>
              <Btn sm onClick={() => goNav('team')} style={{ width: '100%', justifyContent: 'flex-start' }}><Users size={13} /> Manage Team</Btn>
            </div>
          </Panel>
        </div>
      </div>

      {/* ── Team Workload — live from tasks + project memberships ── */}
      <Panel title="Team Workload — Active Work per Member" action="Manage →" actionClick={() => goNav('team')}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 4 }}>
          {workload.map(({ k, total }) => {
            const mc = MEMBER_COLORS[k] || { fg: '#848688' };
            return (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ fontSize: 12, color: '#5A5860', width: 110, flexShrink: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{MEMBER_NAMES[k]}.</div>
                <div style={{ flex: 1, background: '#FBF3F4', borderRadius: 3, height: 6, overflow: 'hidden' }}>
                  <div style={{ height: '100%', borderRadius: 3, width: `${Math.min(total * 10, 100)}%`, background: mc.fg }} />
                </div>
                <div style={{ fontSize: 11, color: '#918E98', width: 26, textAlign: 'right' }}>{total}</div>
              </div>
            );
          })}
        </div>
      </Panel>
    </div>
  );
  };

  /* ── PROJECTS VIEW ── */
  const ProjectsView = () => (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div><h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, color: COLORS.charcoal, marginBottom: 4 }}>Project Management</h2><p style={{ color: '#5A5860', fontSize: 12 }}>Track all projects across the marketing team.</p></div>
        <div style={{ marginLeft: 'auto' }}><Btn primary sm onClick={() => setProjModal({})}><Plus size={12} /> New Project</Btn></div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2,1fr)', gap: 14 }}>
        {projects.map(p => (
          <div key={p.id} style={{ background: '#fff', border: '1px solid #E2E0E5', borderRadius: 10, padding: 18, borderLeft: `3px solid ${p.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ flex: 1 }}><div style={{ fontSize: 14, fontWeight: 600, color: '#3D0A14' }}>{p.name}</div><div style={{ fontSize: 11, color: '#918E98', marginTop: 2 }}>{p.type} · Started {p.start}</div></div>
              <Pill status={p.status} />
            </div>
            {/* Traffic-light progress bar + inline +/– controls */}
            <ProgressBar pct={p.pct} color={p.color} traffic />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '8px 0 12px' }}>
              <span style={{ fontSize: 11, color: pctToTrafficColor(p.pct), fontWeight: 600 }}>{p.pct}%</span>
              <span style={{ fontSize: 11, color: '#918E98' }}>complete · Due {p.due}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                <button onClick={() => adjustProgress(p.id, -5)}
                  style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #E2E0E5', background: '#FBF3F4', cursor: 'pointer', fontSize: 14, color: '#5A5860', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                <button onClick={() => adjustProgress(p.id, 5)}
                  style={{ width: 22, height: 22, borderRadius: 4, border: '1px solid #E2E0E5', background: '#FBF3F4', cursor: 'pointer', fontSize: 14, color: '#5A5860', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{p.tags.map(t => <Tag key={t}>{t}</Tag>)}</div>
            <div style={{ height: 1, background: '#E2E0E5', margin: '14px 0' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ display: 'flex' }}>{p.members.map(m => <Avatar key={m} k={m} size={22} style={{ marginLeft: -6, border: '1.5px solid #fff' }} />)}</div>
              <span style={{ fontSize: 11, color: '#918E98' }}>{p.members.length} member{p.members.length > 1 ? 's' : ''}</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                {p.urgent && <span style={{ fontSize: 11, color: COLORS.red }}>{p.urgent} urgent</span>}
                {p.open && <span style={{ fontSize: 11, color: '#918E98' }}>{p.open} open tasks</span>}
              </div>
            </div>
            <div style={{ position: 'absolute', top: 14, right: 14, display: 'flex', gap: 6 }}>
              <Btn sm onClick={() => setProjModal(p)}><Pencil size={11} /></Btn>
              <Btn sm danger onClick={() => setConfirmModal({ title: 'Delete Project?', body: `"${p.name}" will be permanently removed.`, onConfirm: async () => { await API.deleteProject(p.id); setProjects(ps => ps.filter(x => x.id !== p.id)); setConfirmModal(null); } })}><Trash2 size={11} /></Btn>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  /* ── TASK DETAIL PANEL (with comments + activity) ── */
  const TaskDetailPanel = () => {
    const [comments, setComments] = useState([]);
    const [activity, setActivity] = useState([]);
    const [text, setText]         = useState('');
    const [loadingC, setLoadingC] = useState(true);
    const [posting, setPosting]   = useState(false);

    // Fetch comments + activity whenever the selected task changes
    useEffect(() => {
      if (!activeTask) return;
      setLoadingC(true);
      API.getComments(activeTask.id)
        .then(res => { setComments(res.data.comments); setActivity(res.data.activity); })
        .catch(err => console.error('Load comments:', err.message))
        .finally(() => setLoadingC(false));
    }, [activeTask?.id]);

    const handlePost = async () => {
      if (!text.trim()) return;
      setPosting(true);
      try {
        const res = await API.addComment(activeTask.id, text.trim());
        setComments(c => [...c, res.data.comment]);
        setText('');
      } catch (err) { alert(err.response?.data?.error || 'Failed to post.'); }
      finally { setPosting(false); }
    };

    const handleDelete = async (commentId) => {
      try {
        await API.deleteComment(activeTask.id, commentId);
        setComments(c => c.filter(x => x.id !== commentId));
      } catch (err) { alert(err.response?.data?.error || 'Failed to delete.'); }
    };

    // Merge comments and activity into one chronological timeline
    const timeline = [
      ...comments.map(c => ({ ...c, _type: 'comment' })),
      ...activity.map(a => ({ ...a, _type: 'activity' })),
    ].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

    const fmt = iso => {
      const d = new Date(iso);
      return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) +
             ' · ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    };

    return (
      <div style={{ width: 380, minWidth: 380, background: '#fff', borderLeft: '1px solid #E2E0E5', height: 'calc(100vh - 54px)', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{ padding: '16px 18px', borderBottom: '1px solid #E2E0E5', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 700, color: '#3D0A14', flex: 1, lineHeight: 1.4 }}>{activeTask.title}</div>
          <div onClick={() => setActiveTaskId(null)} style={{ cursor: 'pointer', color: '#918E98' }}><X size={18} /></div>
        </div>

        {/* ── Scrollable body ── */}
        <div style={{ flex: 1, overflowY: 'auto' }}>

          {/* Task details */}
          <div style={{ padding: '16px 18px' }}>
            {activeTask.desc && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: '#918E98', marginBottom: 6, fontWeight: 500 }}>Description</div><div style={{ fontSize: 13, color: '#5A5860', lineHeight: 1.6 }}>{activeTask.desc}</div></div>}
            <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: '#918E98', marginBottom: 6, fontWeight: 500 }}>Move To</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {COL_STAT.map(s => <button key={s} onClick={() => moveTask(activeTask.id, s)} style={{ padding: '4px 9px', borderRadius: 20, fontSize: 11, fontWeight: 500, cursor: 'pointer', border: `1px solid ${activeTask.status === s ? COLORS.burg : '#D0CDD5'}`, background: activeTask.status === s ? COLORS.burgDim : '#F4F3F5', color: activeTask.status === s ? COLORS.burg : '#5A5860' }}>{COL_LABELS[s]}</button>)}
              </div>
            </div>
            <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: '#918E98', marginBottom: 6, fontWeight: 500 }}>Priority</div>
              <select value={activeTask.pri} onChange={e => changePriority(activeTask.id, e.target.value)} style={{ ...inputStyle, fontSize: 12 }}>
                <option value="h">🔴 High</option><option value="m">🟡 Medium</option><option value="l">🟢 Low</option>
              </select>
            </div>
            <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: '#918E98', marginBottom: 6, fontWeight: 500 }}>Assignee</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Avatar k={activeTask.ass} size={28} />
                <div><div style={{ fontSize: 13, color: '#3D0A14' }}>{MEMBER_NAMES[activeTask.ass]}</div><div style={{ fontSize: 10, color: '#918E98' }}>{MEMBER_ROLES[activeTask.ass]}</div></div>
              </div>
            </div>
            <div style={{ marginBottom: 16 }}><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: '#918E98', marginBottom: 6, fontWeight: 500 }}>Collaborators</div>
              <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {Object.keys(MEMBER_NAMES).filter(k => k !== activeTask.ass).map(k => {
                  const tagged = (activeTask.collabs || []).includes(k);
                  return <div key={k} onClick={() => toggleCollab(activeTask.id, k)} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 8px 3px 4px', borderRadius: 20, background: tagged ? COLORS.burgDim : '#EBEAED', border: `1px solid ${tagged ? COLORS.burg : '#E2E0E5'}`, fontSize: 11, color: tagged ? COLORS.burg : '#5A5860', cursor: 'pointer' }}>
                    <Avatar k={k} size={16} />{MEMBER_NAMES[k]}
                  </div>;
                })}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 4 }}>
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: '#918E98', marginBottom: 4, fontWeight: 500 }}>Due Date</div><div style={{ fontSize: 13, color: '#5A5860' }}>{activeTask.due || '—'}</div></div>
              <div><div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: '#918E98', marginBottom: 4, fontWeight: 500 }}>Project</div><div style={{ fontSize: 13, color: '#5A5860' }}>{activeTask.camp || '—'}</div></div>
            </div>
          </div>

          {/* ── Comments & Activity timeline ── */}
          <div style={{ borderTop: '1px solid #E2E0E5', padding: '12px 18px 0' }}>
            <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.8, color: '#918E98', fontWeight: 500, marginBottom: 12 }}>Comments & Activity</div>
            {loadingC ? (
              <div style={{ fontSize: 12, color: '#C4C2C8', paddingBottom: 12 }}>Loading…</div>
            ) : timeline.length === 0 ? (
              <div style={{ fontSize: 12, color: '#C4C2C8', paddingBottom: 12 }}>No activity yet — be the first to comment.</div>
            ) : (
              timeline.map(item => item._type === 'comment' ? (
                <div key={`c${item.id}`} style={{ display: 'flex', gap: 9, marginBottom: 14 }}>
                  <Avatar k={item.initials} size={26} style={{ marginTop: 1, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#3D0A14' }}>{item.name}</span>
                      <span style={{ fontSize: 10, color: '#C4C2C8' }}>{fmt(item.created_at)}</span>
                      {(authUser?.id === item.user_id || authUser?.role === 'admin') && (
                        <span onClick={() => handleDelete(item.id)} title="Delete" style={{ marginLeft: 'auto', cursor: 'pointer', color: '#C4C2C8', fontSize: 11 }}>✕</span>
                      )}
                    </div>
                    <div style={{ fontSize: 13, color: '#5A5860', lineHeight: 1.5, background: '#FBF3F4', borderRadius: '0 8px 8px 8px', padding: '8px 10px' }}>{item.content}</div>
                  </div>
                </div>
              ) : (
                <div key={`a${item.id}`} style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10, fontSize: 11, color: '#918E98' }}>
                  <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#D0CDD5', flexShrink: 0, marginLeft: 10 }} />
                  <span><strong style={{ color: '#5A5860' }}>{item.initials}</strong> {item.action} · {item.detail}</span>
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: '#C4C2C8', whiteSpace: 'nowrap' }}>{fmt(item.created_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Comment input + task actions ── */}
        <div style={{ padding: '12px 18px', borderTop: '1px solid #E2E0E5' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', marginBottom: 8 }}>
            <Avatar k={authUser?.initials || 'SO'} size={26} style={{ flexShrink: 0, marginBottom: 2 }} />
            <textarea
              value={text} rows={2}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handlePost(); } }}
              placeholder="Leave a comment… (Enter to post)"
              style={{ ...inputStyle, flex: 1, resize: 'none', fontSize: 12, padding: '7px 10px' }}
            />
            <Btn primary sm onClick={handlePost} disabled={posting || !text.trim()} style={{ flexShrink: 0, marginBottom: 2 }}>
              {posting ? '…' : 'Post'}
            </Btn>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn sm onClick={() => setTaskModal(activeTask)} style={{ flex: 1, justifyContent: 'center' }}><Pencil size={12} /> Edit</Btn>
            <Btn sm danger onClick={() => setConfirmModal({ title: 'Delete this task?', body: `"${activeTask.title}" will be permanently removed.`, onConfirm: () => { deleteTask(activeTask.id); setConfirmModal(null); } })}><Trash2 size={12} /></Btn>
          </div>
        </div>
      </div>
    );
  };

  /* ── TASK BOARD ── */
  const TaskBoardView = () => {
    const myInitials  = authUser?.initials;
    const myTasks     = tasks.filter(t => (t.ass || t.assignee_initials) === myInitials);
    const collabTasks = tasks.filter(t => {
      const c = (t.collabs || []).concat((t.collaborators || []).map(x => x.initials ?? x));
      return c.includes(myInitials) && (t.ass || t.assignee_initials) !== myInitials;
    });
    const activeDepts = [...new Set(tasks.map(t => t.dept).filter(Boolean))];
    const TABS = [
      { f: 'all',    l: 'All Tasks' },
      { f: 'mine',   l: `My Tasks (${myTasks.length})` },
      { f: 'collab', l: `Collaborating (${collabTasks.length})` },
      ...activeDepts.map(d => ({ f: `dept:${d}`, l: d })),
    ];
    const getFiltered = stat => tasks.filter(t => {
      if (t.status !== stat) return false;
      if (activeFilter === 'all')    return true;
      if (activeFilter === 'mine')   return (t.ass || t.assignee_initials) === myInitials;
      if (activeFilter === 'collab') {
        const c = (t.collabs || []).concat((t.collaborators || []).map(x => x.initials ?? x));
        return c.includes(myInitials);
      }
      if (activeFilter.startsWith('dept:')) return t.dept === activeFilter.slice(5);
      return true;
    });
    return (
    <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: 'calc(100vh - 54px)' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        {/* ── Filter tabs ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flex: 1 }}>
            {TABS.map(t => {
              const on = activeFilter === t.f;
              return (
                <div key={t.f} onClick={() => { setActiveFilter(t.f); setActiveTaskId(null); }}
                  style={{ padding: '5px 12px', borderRadius: 20, fontSize: 12, cursor: 'pointer', fontWeight: on ? 600 : 400, border: `1px solid ${on ? COLORS.burg : T.filterBorder}`, color: on ? COLORS.burg : T.filterText, background: on ? COLORS.burgDim : T.filterIn, transition: 'all 0.15s', whiteSpace: 'nowrap' }}>
                  {t.l}
                </div>
              );
            })}
          </div>
          <Btn primary sm onClick={() => setTaskModal({})}><Plus size={12} /> Add Task</Btn>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,minmax(220px,1fr))', gap: 12, overflowX: 'auto', paddingBottom: 10 }}>
          {COL_STAT.map(stat => {
            const filtered = getFiltered(stat);
            return (
              <div key={stat}
                onDragOver={e => { e.preventDefault(); e.currentTarget.style.background = T.colHover; e.currentTarget.style.border = `1px solid ${COLORS.burg}`; }}
                onDragLeave={e => { e.currentTarget.style.background = T.colBg; e.currentTarget.style.border = `1px solid ${T.border}`; }}
                onDrop={e => { e.currentTarget.style.background = T.colBg; e.currentTarget.style.border = `1px solid ${T.border}`; onDrop(e, stat); }}
                style={{ background: T.colBg, border: `1px solid ${T.border}`, borderRadius: 10, minHeight: 400, display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'background 0.15s, border 0.15s' }}>
                <div style={{ padding: '12px 14px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 7, color: T.text }}>
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: COL_DOT[stat] }} />
                    {COL_LABELS[stat]}
                    <span style={{ fontSize: 10, background: T.filterIn, color: T.textSub, borderRadius: 20, padding: '1px 7px', border: `1px solid ${T.border}` }}>{filtered.length}</span>
                  </div>
                  {stat !== 'done' && <div onClick={() => setTaskModal({ status: stat })} style={{ cursor: 'pointer', color: T.textSub, fontSize: 18 }}>+</div>}
                </div>
                <div style={{ padding: 10, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filtered.map(t => <TaskCard key={t.id} task={t} />)}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {activeTask && <TaskDetailPanel />}
    </div>
    );
  };

  /* ── TEAM VIEW ── */
  const TeamView = () => (
    <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, color: COLORS.charcoal, marginBottom: 4 }}>Marketing Team</h2>
          <p style={{ color: '#5A5860', fontSize: 12 }}>{Object.keys(members).length} members · Manage assignments and roles.</p>
        </div>
        {/* Only the admin sees the Add Member button */}
        {authUser?.role === 'admin' && (
          <div style={{ marginLeft: 'auto' }}>
            <Btn primary sm onClick={() => setAddMemberModal(true)}><Plus size={12} /> Add Member</Btn>
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: 14 }}>
        {Object.entries(members).map(([key, m]) => {
          const mc         = MEMBER_COLORS[key] || { bg: '#EBEAED', fg: '#5A5860' };
          const rawUser    = rawUsers.find(u => u.initials === key);
          const isAdmin    = rawUser?.role === 'admin';
          const isSelf     = authUser?.initials === key;
          const reviewCnt  = tasks.filter(t => t.ass === key && t.status === 'review').length;
          const doneCnt    = tasks.filter(t => t.ass === key && t.status === 'done').length;
          const isOnline   = rawUser?.id ? onlineUserIds.has(rawUser.id) : false;
          const statusPill = isOnline ? STATUS_PILLS.active : { bg: '#EBEAED', fg: '#848688' };
          return (
            <div key={key} style={{ background: '#fff', border: '1px solid #E2E0E5', borderRadius: 10, padding: 18, position: 'relative', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>

              {/* Action buttons — top right */}
              <div style={{ position: 'absolute', top: 12, right: 12, display: 'flex', gap: 5 }}>
                <Btn sm onClick={() => setMemberModal({ key, email: rawUser?.email || '', ...m })}><Pencil size={11} /></Btn>
                {authUser?.role === 'admin' && !isSelf && (
                  <>
                    {/* Promote / demote */}
                    <Btn sm onClick={() => changeUserRole(key, isAdmin ? 'member' : 'admin')}
                      style={{ fontSize: 10, padding: '4px 7px' }}
                      title={isAdmin ? 'Remove admin rights' : 'Make admin'}>
                      {isAdmin ? '↓ Member' : '↑ Admin'}
                    </Btn>
                    {/* Remove member */}
                    <Btn sm danger onClick={() => setConfirmModal({
                      title: 'Remove member?',
                      body: `${m.name} will be removed from the team and lose access.`,
                      onConfirm: async () => { await removeMember(key); setConfirmModal(null); }
                    })}><Trash2 size={11} /></Btn>
                  </>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14, marginTop: 4 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: mc.bg, color: mc.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, fontFamily: "'Syne',sans-serif" }}>{key}</div>
                <div>
                  <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 600, color: '#3D0A14' }}>{m.name}</div>
                  <div style={{ fontSize: 11, color: '#918E98', marginTop: 2 }}>{m.role}</div>
                  <div style={{ display: 'flex', gap: 5, marginTop: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 9, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: statusPill.bg, color: statusPill.fg }}>{isOnline ? 'Online' : 'Offline'}</span>
                    {/* Admin badge */}
                    {isAdmin && <span style={{ fontSize: 9, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: COLORS.burgDim, color: COLORS.burg }}>Admin</span>}
                  </div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginTop: 12 }}>
                {[{ v: m.active, l: 'Active' }, { v: reviewCnt, l: 'Review' }, { v: doneCnt, l: 'Done' }].map(s => (
                  <div key={s.l} style={{ background: '#FBF3F4', borderRadius: 6, padding: 8, textAlign: 'center' }}>
                    <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: COLORS.charcoal }}>{s.v}</div>
                    <div style={{ fontSize: 10, color: '#918E98', marginTop: 1 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 10 }}>
                {(m.tasks || []).slice(0, 3).map((t, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#5A5860' }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: [COLORS.amber, COLORS.red, COLORS.blue][i] || '#918E98', flexShrink: 0 }} />{t}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  /* ── CALENDAR VIEW ── */
  const CalendarView = () => {
    const [curDate, setCurDate] = useState(new Date());
    const DAYS        = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const MONTH_ABBR  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const EV_COLOR    = [COLORS.teal, COLORS.blue, COLORS.purple, COLORS.amber, COLORS.coral, COLORS.green];
    const EV_BG       = [COLORS.tealD, COLORS.blueD, COLORS.purpleD, COLORS.amberD, COLORS.coralD, COLORS.greenD];

    const year  = curDate.getFullYear();
    const month = curDate.getMonth();

    // Parse "Apr 5" or "May 30, 2025" → { month (0-based), day }
    const parseDate = (str) => {
      if (!str) return null;
      const m = str.match(/([A-Za-z]{3})\s+(\d{1,2})/);
      if (!m) return null;
      const mi = MONTH_ABBR.indexOf(m[1]);
      return mi >= 0 ? { month: mi, day: parseInt(m[2]) } : null;
    };

    // Build event map: day → [event, ...]
    // Includes both tasks (due this month) and projects (due this month).
    // Each event carries _kind ('task'|'project') and _type (the category label).
    const eventMap = {};
    let _ci = 0;
    tasks.forEach(task => {
      const parsed = parseDate(task.due_date || task.due);
      if (!parsed || parsed.month !== month) return;
      if (!eventMap[parsed.day]) eventMap[parsed.day] = [];
      eventMap[parsed.day].push({
        ...task,
        _kind:  'task',
        _type:  'Task',
        _ci:    _ci++ % EV_COLOR.length,
      });
    });
    projects.forEach(project => {
      const due = project.due_date || project.due;
      if (!due || due === 'Ongoing') return;
      const parsed = parseDate(due);
      if (!parsed || parsed.month !== month) return;
      if (!eventMap[parsed.day]) eventMap[parsed.day] = [];
      eventMap[parsed.day].push({
        id:     `proj-${project.id}`,
        title:  project.name,
        _kind:  'project',
        _type:  project.type || 'Project',
        _color: project.color,
        _ci:    _ci++ % EV_COLOR.length,
      });
    });

    // Grid calculations
    const firstWeekday  = new Date(year, month, 1).getDay();
    const daysInMonth   = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();
    const prevPad  = Array.from({ length: firstWeekday }, (_, i) => prevMonthDays - firstWeekday + i + 1);
    const monthArr = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    const nextPad  = Array.from({ length: totalCells - firstWeekday - daysInMonth }, (_, i) => i + 1);

    const today   = new Date();
    const isToday = (d) => today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
    const navBtn  = (onClick, icon) => (
      <div onClick={onClick} style={{ width: 28, height: 28, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #E2E0E5', cursor: 'pointer', color: '#5A5860' }}>{icon}</div>
    );

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          {navBtn(() => setCurDate(new Date(year, month - 1, 1)), <ChevronLeft size={14} />)}
          <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 700, color: COLORS.charcoal, minWidth: 180, textAlign: 'center' }}>
            {MONTH_NAMES[month]} {year}
          </div>
          {navBtn(() => setCurDate(new Date(year, month + 1, 1)), <ChevronRight size={14} />)}
          <div
            onClick={() => setCurDate(new Date())}
            style={{ marginLeft: 4, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer', border: `1px solid ${COLORS.burg}`, color: COLORS.burg, background: COLORS.burgDim, whiteSpace: 'nowrap' }}
          >Today</div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 1, background: '#E2E0E5' }}>
          {DAYS.map(d => <div key={d} style={{ background: '#fff', padding: 8, textAlign: 'center', fontSize: 11, color: '#918E98', textTransform: 'uppercase', letterSpacing: 0.5 }}>{d}</div>)}
          {prevPad.map((d, i) => <div key={`p${i}`} style={{ background: '#F9F8FA', minHeight: 90, padding: 7 }}><div style={{ fontSize: 12, color: '#C4C2C8', marginBottom: 4 }}>{d}</div></div>)}
          {monthArr.map(d => (
            <div key={d} style={{ background: isToday(d) ? COLORS.burgDim : '#fff', minHeight: 90, padding: 7 }}>
              <div style={{ fontSize: 12, color: isToday(d) ? COLORS.burg : '#5A5860', marginBottom: 4, fontWeight: isToday(d) ? 700 : 400 }}>{d}</div>
              {(eventMap[d] || []).map(ev => {
                // Projects get a left-border chip using their brand colour;
                // tasks get the standard coloured background chip.
                const isProj = ev._kind === 'project';
                return (
                  <div key={ev.id} style={{
                    fontSize: 10, padding: '2px 5px', borderRadius: 3, marginBottom: 2,
                    background:  isProj ? `${ev._color}18` : EV_BG[ev._ci],
                    color:       isProj ? ev._color        : EV_COLOR[ev._ci],
                    borderLeft:  isProj ? `2px solid ${ev._color}` : 'none',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {/* Type badge prefix so users know task vs. project and the category */}
                    <span style={{ opacity: 0.75, marginRight: 3 }}>[{ev._type}]</span>{ev.title}
                  </div>
                );
              })}
            </div>
          ))}
          {nextPad.map((d, i) => <div key={`n${i}`} style={{ background: '#F9F8FA', minHeight: 90, padding: 7 }}><div style={{ fontSize: 12, color: '#C4C2C8', marginBottom: 4 }}>{d}</div></div>)}
        </div>
        {Object.keys(eventMap).length === 0 && (
          <p style={{ textAlign: 'center', color: '#918E98', fontSize: 13, marginTop: 24 }}>No tasks or projects due this month.</p>
        )}
      </div>
    );
  };

  /* ── TIMELINE VIEW ── */
  const TimelineView = () => {
    const MONTH_ABBR = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const now = new Date();

    // Visible range: 1 month back → 5 months forward (6 columns total)
    const rangeStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const rangeEnd   = new Date(now.getFullYear(), now.getMonth() + 5, 0);
    const rangeDays  = (rangeEnd - rangeStart) / 864e5;
    const monthCols  = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 1 + i, 1);
      return MONTH_ABBR[d.getMonth()];
    });

    const parseDate = (str) => {
      if (!str || str === 'Ongoing') return null;
      const m = str.match(/([A-Za-z]{3})\s+(\d{1,2})(?:,?\s*(\d{4}))?/);
      if (!m) return null;
      const mi = MONTH_ABBR.indexOf(m[1]);
      const yr = m[3] ? parseInt(m[3]) : now.getFullYear();
      return mi >= 0 ? new Date(yr, mi, parseInt(m[2])) : null;
    };

    const toPct = (date) => Math.max(0, Math.min(100, ((date - rangeStart) / 864e5 / rangeDays) * 100));

    const rows = projects.map(p => {
      const start = parseDate(p.start_date || p.start) || rangeStart;
      const end   = parseDate(p.due_date   || p.due)   || rangeEnd;
      const left  = toPct(start);
      const width = Math.max(toPct(end) - left, 2);
      return { ...p, left, width };
    });

    if (projects.length === 0) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: '#918E98' }}>
          <GitBranch size={36} style={{ opacity: 0.35 }} />
          <div style={{ fontSize: 14 }}>No projects yet.</div>
          <div style={{ fontSize: 12 }}>Create a project and its timeline will appear here.</div>
        </div>
      );
    }

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, color: COLORS.charcoal, marginBottom: 4 }}>Project Timeline</h2>
          <p style={{ color: '#5A5860', fontSize: 12 }}>Gantt-style overview of your projects based on their start and due dates.</p>
        </div>
        <Panel>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ minWidth: 700 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', borderBottom: '1px solid #E2E0E5', marginBottom: 4 }}>
                <div style={{ fontSize: 11, color: '#918E98', padding: '6px 12px' }}>Project</div>
                <div style={{ display: 'grid', gridTemplateColumns: `repeat(${monthCols.length},1fr)` }}>
                  {monthCols.map(m => <div key={m} style={{ fontSize: 10, color: '#918E98', textAlign: 'center', padding: '6px 0', letterSpacing: 0.5, textTransform: 'uppercase' }}>{m}</div>)}
                </div>
              </div>
              {rows.map(r => (
                <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', marginBottom: 6, alignItems: 'center' }}>
                  <div style={{ fontSize: 12, color: '#5A5860', padding: '0 12px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</div>
                  <div style={{ position: 'relative', height: 28, display: 'flex', alignItems: 'center' }}>
                    <div style={{ position: 'absolute', left: `${r.left}%`, width: `${r.width}%`, height: 20, borderRadius: 4, background: r.color + '22', color: r.color, border: `1px solid ${r.color}`, display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: 10, fontWeight: 500, overflow: 'hidden', whiteSpace: 'nowrap' }}>
                      {r.name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </div>
    );
  };

  /* ── REPORTS VIEW ── */
  // Issue #7: All chart data now derived from live tasks/projects state.
  // Removed: hardcoded trafficData, pipelineData, qualityData.
  // Added: tasksByMonth (tasks grouped by due month), workloadData (tasks per assignee),
  //        priorityData (tasks by priority level). Stat cards use real counts.

  // Task Status Breakdown (pie) — already live, untouched
  const taskStatusData   = COL_STAT.map(s => ({ name: COL_LABELS[s], value: tasks.filter(t => t.status === s).length }));
  const taskStatusColors = [COLORS.gray, COLORS.blue, COLORS.amber, COLORS.purple, COLORS.green];

  // Project Progress (horizontal bar) — already live, untouched
  const projProgressData = projects.map(p => ({
    name: p.name.length > 22 ? p.name.slice(0, 22) + '…' : p.name,
    pct:  p.pct,
    fill: p.color,
  }));

  // Tasks by Due Month — last 6 calendar months, uses toDateInput helper to parse stored dates
  const tasksByMonth = (() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d  = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const yr = d.getFullYear();
      const mo = d.getMonth(); // 0-indexed
      return {
        m: _MONTHS[mo],
        v: tasks.filter(t => {
          const ds = toDateInput(t.due || t.due_date || '');
          if (!ds) return false;
          const [y, m2] = ds.split('-').map(Number);
          return y === yr && (m2 - 1) === mo;
        }).length,
      };
    });
  })();

  // Team Workload — tasks per assignee (top 6 by task count)
  const workloadData = (() => {
    const map = {};
    tasks.forEach(t => {
      const who = t.assignee || 'Unassigned';
      map[who] = (map[who] || 0) + 1;
    });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, v]) => ({ name, v }));
  })();

  // Tasks by Priority — Low / Medium / High / Critical
  const _priorityFills = { Low: COLORS.teal, Medium: COLORS.blue, High: COLORS.amber, Critical: COLORS.burg };
  const priorityData = ['Low', 'Medium', 'High', 'Critical'].map(p => ({
    name: p,
    v:    tasks.filter(t => (t.priority || '').toLowerCase() === p.toLowerCase()).length,
    fill: _priorityFills[p] || COLORS.gray,
  }));

  // Stat card values — derived from real data, no hardcoded numbers
  const _totalTasks     = tasks.length;
  const _completedTasks = tasks.filter(t => t.status === 'done').length;
  const _activeProjects = projects.filter(p => p.status === 'active').length;
  const _inReviewTasks  = tasks.filter(t => t.status === 'review').length;

  const ReportsView = () => (
    <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, color: COLORS.charcoal, marginBottom: 4 }}>Reports & Analytics</h2>
        {/* Subtitle is dynamic — shows current month/year instead of a hardcoded date */}
        <p style={{ color: '#5A5860', fontSize: 12 }}>Live metrics from your tasks and projects — {new Date().toLocaleString('default', { month: 'long', year: 'numeric' })}</p>
      </div>

      {/* ── Stat cards — all values come from live DB data ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        <StatCard label="Total Tasks"     value={String(_totalTasks)}     delta={_completedTasks + ' completed'}                                           up={_completedTasks > 0} />
        <StatCard label="Completed"       value={String(_completedTasks)} delta={_totalTasks > 0 ? Math.round(_completedTasks / _totalTasks * 100) + '% of total' : '0% of total'} up={_completedTasks > 0} />
        <StatCard label="Active Projects" value={String(_activeProjects)} delta={projects.length + ' total projects'}                                       up={_activeProjects > 0} />
        <StatCard label="In Review"       value={String(_inReviewTasks)}  delta={_inReviewTasks > 0 ? 'awaiting sign-off' : 'none pending'}                up={false} />
      </div>

      {/* ── Row 1: Tasks by due month + Task status pie ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Replaces hardcoded "Dashboards Delivered" line chart with real task due-date distribution */}
        <Panel title="Tasks by Due Month — Last 6 Months">
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={tasksByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="m" tick={{ fill: '#848688', fontSize: 11 }} />
                <YAxis tick={{ fill: '#848688', fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="v" name="Tasks" radius={[4, 4, 0, 0]} fill={COLORS.burg} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Task Status Breakdown — unchanged, already live */}
        <Panel title="Task Status Breakdown">
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={taskStatusData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value">
                  {taskStatusData.map((_, i) => <Cell key={i} fill={taskStatusColors[i]} />)}
                </Pie>
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* ── Row 2: Team workload + Tasks by priority ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
        {/* Replaces hardcoded "Pipeline Runs by Type" with real per-assignee task counts */}
        <Panel title="Team Workload — Tasks per Member">
          {workloadData.length === 0
            ? <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#918E98', fontSize: 13 }}>No tasks assigned yet.</div>
            : <div style={{ height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={workloadData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                    <XAxis dataKey="name" tick={{ fill: '#848688', fontSize: 11 }} />
                    <YAxis tick={{ fill: '#848688', fontSize: 11 }} allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="v" name="Tasks" radius={[4, 4, 0, 0]} fill={COLORS.blue} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
          }
        </Panel>

        {/* Replaces hardcoded "Data Quality Trend" with real task priority breakdown */}
        <Panel title="Tasks by Priority">
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="name" tick={{ fill: '#848688', fontSize: 11 }} />
                <YAxis tick={{ fill: '#848688', fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="v" name="Tasks" radius={[4, 4, 0, 0]}>
                  {priorityData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* ── Row 3: Project progress — unchanged, already live ── */}
      <Panel title="Project Progress Overview">
        <div style={{ height: Math.max(200, projProgressData.length * 40 + 40) }}>
          <ResponsiveContainer>
            <BarChart layout="vertical" data={projProgressData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
              <XAxis type="number" domain={[0, 100]} tick={{ fill: '#848688', fontSize: 11 }} tickFormatter={v => v + '%'} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#848688', fontSize: 11 }} width={160} />
              <Tooltip formatter={v => v + '%'} />
              <Bar dataKey="pct" name="Progress" radius={[0, 4, 4, 0]}>
                {projProgressData.map((d, i) => <Cell key={i} fill={d.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
    </div>
  );

  /* ── NOTIFICATIONS VIEW ── */
  const NotifsView = () => {
    const [notifs, setNotifs]   = useState([]);
    const [loading, setLoading] = useState(true);
    const unreadCount = notifs.filter(n => !n.is_read).length;

    useEffect(() => {
      API.getNotifications()
        .then(res => setNotifs(res.data.notifications || []))
        .catch(err => console.error('Failed to load notifications:', err.message))
        .finally(() => setLoading(false));
    }, []);

    const handleMarkAllRead = async () => {
      try {
        await API.markAllRead();
        setNotifs(ns => ns.map(n => ({ ...n, is_read: true })));
      } catch (err) {
        console.error('Mark all read failed:', err.message);
      }
    };

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: 20, maxWidth: 680 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, color: COLORS.charcoal }}>Notifications</h2>
          {unreadCount > 0 && <span style={{ background: COLORS.burg, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 20, padding: '1px 6px' }}>{unreadCount}</span>}
          <div style={{ marginLeft: 'auto' }}>
            {unreadCount > 0 && <Btn sm onClick={handleMarkAllRead}>Mark all read</Btn>}
          </div>
        </div>
        {loading ? (
          <div style={{ fontSize: 13, color: '#918E98' }}>Loading…</div>
        ) : notifs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#918E98' }}>
            <Bell size={32} style={{ opacity: 0.3, display: 'block', margin: '0 auto 12px' }} />
            <div style={{ fontSize: 14 }}>No notifications yet.</div>
            <div style={{ fontSize: 12, marginTop: 4 }}>You'll see updates here when tasks are moved, assigned, or commented on.</div>
          </div>
        ) : notifs.map((n, i) => (
          <div key={n.id || i} style={{ display: 'flex', gap: 9, padding: '10px 12px', borderRadius: 6, background: !n.is_read ? COLORS.burgDim : 'transparent', marginBottom: 4 }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: !n.is_read ? COLORS.burg : 'transparent', flexShrink: 0, marginTop: 5 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, color: '#3D0A14', marginBottom: 2, lineHeight: 1.4 }}>{n.message}</div>
              <div style={{ fontSize: 10, color: '#918E98' }}>{n.created_at ? new Date(n.created_at).toLocaleString() : ''}</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  /* ═══════ TEAM CHAT VIEW ═══════ */
  // Real-time team-wide chat room powered by Socket.io.
  // Messages are saved to the database so history is preserved across sessions.
  // Desktop notifications fire when a new message arrives and this tab isn't active.
  const ChatView = () => {
    const [messages, setMessages]     = useState([]);
    const [text, setText]             = useState('');
    const [loading, setLoading]       = useState(true);
    const [readStatus, setReadStatus] = useState([]); // [{ user_id, initials, last_message_id }]
    // Issue #6: track load error so the user sees a visible retry button
    // instead of a silent empty state when the server is waking from sleep.
    const [chatError, setChatError]   = useState(null);
    const bottomRef                   = useRef(null); // used to auto-scroll to latest message

    // Returns the list of OTHER users who have read message `msgId`
    const getReaders = (msgId) =>
      readStatus.filter(r => r.user_id !== authUser?.id && r.last_message_id >= msgId);

    // ── Load recent history — extracted so the Retry button can call it again ──
    // Issue #6 fix: on failure set chatError state (visible in UI) instead of
    // silently swallowing the error. This handles the Render free-tier cold-start
    // delay where the server may be asleep when the user first logs in.
    const loadHistory = () => {
      setLoading(true);
      setChatError(null);
      API.getChatHistory()
        .then(res => {
          setMessages(res.data.messages || []);
          setReadStatus(res.data.read_status || []);
        })
        .catch(err => {
          console.error('Chat history error:', err.message);
          setChatError('Could not load messages. The server may be waking up — please try again in a moment.');
        })
        .finally(() => setLoading(false));

      // Clear the unread badge while the chat view is open
      setUnreadChat(0);
    };

    // ── Load recent history on mount ───────────────────────────
    useEffect(() => {
      loadHistory();
    }, []);

    // ── Listen for new messages over the socket ─────────────────
    useEffect(() => {
      if (!socket) return;
      const handler = (msg) => {
        setMessages(prev => [...prev, msg]);
        // If the user is looking at a different view, increment the badge
        // and fire a desktop notification for messages from others
        if (msg.user_id !== authUser?.id) {
          showDesktopNotification(
            `${msg.name} in Team Chat`,
            msg.content,
          );
        }
      };
      socket.on('chat:message', handler);
      return () => socket.off('chat:message', handler);
    }, [socket]);

    // ── Listen for read-receipt updates ─────────────────────────
    useEffect(() => {
      if (!socket) return;
      socket.on('chat:read_status', setReadStatus);
      return () => socket.off('chat:read_status', setReadStatus);
    }, [socket]);

    // ── Auto-mark messages as read while this view is open ──────
    // Fires whenever the message list changes (initial load + new arrivals)
    useEffect(() => {
      const lastId = messages.at?.(-1)?.id ?? messages[messages.length - 1]?.id;
      if (lastId && socket) socket.emit('chat:read', { last_message_id: lastId });
    }, [messages, socket]);

    // ── Auto-scroll to the bottom when messages change ──────────
    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
      if (!text.trim() || !socket) return;
      socket.emit('chat:send', { content: text.trim() });
      setText('');
    };

    const fmt = iso => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const fmtDate = iso => new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

    // Group messages — show a date separator when the day changes
    const grouped = messages.reduce((acc, msg, i) => {
      const day = fmtDate(msg.created_at);
      if (i === 0 || fmtDate(messages[i - 1].created_at) !== day) acc.push({ type: 'date', label: day });
      acc.push({ type: 'msg', ...msg });
      return acc;
    }, []);

    const isOwn = (msg) => msg.user_id === authUser?.id;

    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* ── Room header ── */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid #E2E0E5', display: 'flex', alignItems: 'center', gap: 10, background: '#fff' }}>
          <div style={{ width: 34, height: 34, borderRadius: 10, background: COLORS.burgDim, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <MessageSquare size={16} color={COLORS.burg} />
          </div>
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 14, fontWeight: 700, color: COLORS.charcoal }}>Marketing Team</div>
            <div style={{ fontSize: 11, color: '#918E98' }}>{Object.keys(members).length} members · team-wide channel</div>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
            {Object.keys(members).slice(0, 5).map(k => <Avatar key={k} k={k} size={24} />)}
          </div>
        </div>

        {/* ── Message list ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {loading ? (
            <div style={{ margin: 'auto', color: '#C4C2C8', fontSize: 13 }}>Loading messages…</div>
          ) : chatError ? (
            // Issue #6 fix: visible error + retry button instead of silent empty state
            <div style={{ margin: 'auto', textAlign: 'center', color: '#918E98' }}>
              <AlertCircle size={32} style={{ opacity: 0.4, marginBottom: 8, color: COLORS.amber }} />
              <div style={{ fontSize: 13, marginBottom: 12, maxWidth: 280, lineHeight: 1.5 }}>{chatError}</div>
              <button onClick={loadHistory} style={{ fontSize: 12, padding: '6px 16px', borderRadius: 6, border: `1px solid ${COLORS.burg}`, background: 'transparent', color: COLORS.burg, cursor: 'pointer' }}>Retry</button>
            </div>
          ) : messages.length === 0 ? (
            <div style={{ margin: 'auto', textAlign: 'center', color: '#C4C2C8' }}>
              <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: 8 }} />
              <div style={{ fontSize: 13 }}>No messages yet — say hello 👋</div>
            </div>
          ) : (
            grouped.map((item, i) => item.type === 'date' ? (
              // ── Date separator ──
              <div key={`d${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '12px 0 8px' }}>
                <div style={{ flex: 1, height: 1, background: '#E2E0E5' }} />
                <span style={{ fontSize: 10, color: '#C4C2C8', textTransform: 'uppercase', letterSpacing: 0.6, whiteSpace: 'nowrap' }}>{item.label}</span>
                <div style={{ flex: 1, height: 1, background: '#E2E0E5' }} />
              </div>
            ) : (
              // ── Chat bubble ──
              <div key={item.id} style={{ display: 'flex', gap: 9, alignItems: 'flex-end', flexDirection: isOwn(item) ? 'row-reverse' : 'row', marginBottom: 6 }}>
                {!isOwn(item) && <Avatar k={item.initials} size={28} style={{ flexShrink: 0 }} />}
                <div style={{ maxWidth: '68%' }}>
                  {!isOwn(item) && (
                    <div style={{ fontSize: 11, color: '#918E98', marginBottom: 3, marginLeft: 4 }}>{item.name}</div>
                  )}
                  <div style={{
                    padding: '9px 13px', borderRadius: isOwn(item) ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: isOwn(item) ? COLORS.burg : '#F4F3F5',
                    color: isOwn(item) ? '#fff' : '#3D0A14',
                    fontSize: 13, lineHeight: 1.5,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  }}>
                    {item.content}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3, justifyContent: isOwn(item) ? 'flex-end' : 'flex-start', marginLeft: isOwn(item) ? 0 : 4 }}>
                    <span style={{ fontSize: 10, color: '#C4C2C8' }}>{fmt(item.created_at)}</span>
                    {isOwn(item) && (() => {
                      const readers = getReaders(item.id);
                      return readers.length > 0 ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <span style={{ fontSize: 9, color: '#22A55A', fontWeight: 500 }}>Seen</span>
                          {readers.map(r => (
                            <Avatar key={r.user_id} k={r.initials} size={13} title={`Read by ${MEMBER_NAMES[r.initials] || r.initials}`} style={{ border: '1px solid #fff' }} />
                          ))}
                        </div>
                      ) : (
                        <span style={{ fontSize: 9, color: '#C4C2C8' }}>✓ Sent</span>
                      );
                    })()}
                  </div>
                </div>
              </div>
            ))
          )}
          {/* Invisible anchor — scrolled into view on new messages */}
          <div ref={bottomRef} />
        </div>

        {/* ── Message input ── */}
        <div style={{ padding: '12px 20px', borderTop: '1px solid #E2E0E5', background: '#fff' }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <Avatar k={authUser?.initials || 'SO'} size={32} style={{ flexShrink: 0, marginBottom: 1 }} />
            <div style={{ flex: 1 }}>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Message the team… (Enter to send, Shift+Enter for new line)"
                rows={2}
                style={{ ...inputStyle, resize: 'none', fontSize: 13, padding: '9px 12px', width: '100%', boxSizing: 'border-box' }}
              />
            </div>
            <button
              onClick={handleSend}
              disabled={!text.trim() || !socket}
              title="Send message"
              style={{
                width: 38, height: 38, borderRadius: 10, flexShrink: 0, marginBottom: 1,
                background: text.trim() && socket ? COLORS.burg : '#E2E0E5',
                border: 'none', cursor: text.trim() && socket ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background .15s',
              }}
            >
              <Send size={16} color={text.trim() && socket ? '#fff' : '#C4C2C8'} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  /* ═══════ ADMIN VIEW (admin role only) ═══════ */
  // NON-DEVELOPER GUIDE:
  //   • This view is only visible to users whose role is 'admin' in the database.
  //   • Regular members do not see the "Admin Panel" link in the sidebar at all.
  //   • To grant a user admin rights: log in as an existing admin → Team → ↑ Admin button.
  const AdminView = () => {
    // Extra safety: block the view even if somehow a non-admin navigates here
    if (authUser?.role !== 'admin') return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, color: '#918E98' }}>
        <ShieldCheck size={40} style={{ opacity: 0.25 }} />
        <div style={{ fontSize: 13 }}>You need admin rights to access this page.</div>
      </div>
    );

    // ── Quick stats derived from live data ──────────────────────
    const adminCount     = rawUsers.filter(u => u.role === 'admin').length;
    const totalDone      = tasks.filter(t => t.status === 'done').length;
    const totalOpen      = tasks.filter(t => t.status !== 'done').length;

    return (
      <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, color: COLORS.charcoal, marginBottom: 4 }}>Admin Panel</h2>
          <p style={{ color: '#5A5860', fontSize: 12 }}>Manage users, roles, and passwords. Only admins can see this page.</p>
        </div>

        {/* ── System stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
          <StatCard label="Team Members"    value={rawUsers.length} />
          <StatCard label="Admin Users"     value={adminCount} />
          <StatCard label="Open Tasks"      value={totalOpen} />
          <StatCard label="Completed Tasks" value={totalDone} />
        </div>

        {/* ── User management table ── */}
        <Panel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 600, color: COLORS.charcoal }}>User Management</div>
              <div style={{ fontSize: 11, color: '#918E98', marginTop: 2 }}>Add members, change roles, reset passwords, or remove accounts.</div>
            </div>
            <Btn primary sm onClick={() => setAddMemberModal(true)}><Plus size={12} /> Add Member</Btn>
          </div>

          {/* Table — horizontally scrollable on mobile */}
          <div style={{ overflowX: 'auto' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.6fr 80px 1.1fr 90px auto', gap: 8, padding: '6px 10px', borderBottom: '2px solid #E2E0E5', fontSize: 10, color: '#918E98', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, minWidth: 680 }}>
            <div>Member</div><div>Email</div><div>Role</div><div>Job Title</div><div>Status</div><div style={{ textAlign: 'right' }}>Actions</div>
          </div>

          {/* One row per user */}
          {rawUsers.map(u => {
            const mc    = MEMBER_COLORS[u.initials] || { bg: '#EBEAED', fg: '#5A5860' };
            const isSelf = authUser?.id === u.id;
            const isAdm  = u.role === 'admin';
            return (
              <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.6fr 80px 1.1fr 90px auto', gap: 8, padding: '10px 10px', borderBottom: '1px solid #F4F3F5', alignItems: 'center', fontSize: 12, minWidth: 680 }}>

                {/* Name + initials avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: mc.bg, color: mc.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: "'Syne',sans-serif", flexShrink: 0 }}>{u.initials}</div>
                  <div>
                    <div style={{ fontWeight: 500, color: '#3D0A14' }}>{u.name}</div>
                    {isSelf && <div style={{ fontSize: 9, color: COLORS.burg, fontWeight: 600, marginTop: 1 }}>You</div>}
                  </div>
                </div>

                {/* Email — truncated if long */}
                <div style={{ color: '#5A5860', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11 }}>{u.email}</div>

                {/* Role badge */}
                <div>
                  <span style={{ fontSize: 10, fontWeight: 600, padding: '3px 8px', borderRadius: 20, background: isAdm ? COLORS.burgDim : '#EBEAED', color: isAdm ? COLORS.burg : '#5A5860' }}>
                    {isAdm ? 'Admin' : 'Member'}
                  </span>
                </div>

                {/* Job title */}
                <div style={{ color: '#5A5860', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.job_title || '—'}</div>

                {/* Status */}
                <div>
                  {(() => {
                    const s = u.status || 'Online';
                    const sc = { Online: { bg: COLORS.greenD, fg: COLORS.green }, Away: { bg: '#FBF4E6', fg: '#C88A18' }, 'In Meeting': { bg: '#EEF2FF', fg: '#5B78D4' }, Focused: { bg: '#F0EAF9', fg: '#7A50D0' }, 'Out of Office': { bg: COLORS.redD, fg: COLORS.red } };
                    const { bg, fg } = sc[s] || sc.Online;
                    return <span style={{ fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: bg, color: fg }}>{s}</span>;
                  })()}
                </div>

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                  {/* Edit profile (name, job title, status) */}
                  <Btn sm title="Edit profile"
                    onClick={() => setMemberModal({ key: u.initials, name: u.name, email: u.email || '', role: u.job_title || '', status: u.status || 'Online' })}>
                    <Pencil size={11} />
                  </Btn>
                  {/* Reset password */}
                  <Btn sm title="Reset password"
                    onClick={() => setResetPassModal({ userId: u.id, userName: u.name, initials: u.initials })}
                    style={{ fontSize: 11 }}>
                    🔑
                  </Btn>
                  {/* Promote / demote — not shown for yourself (can't remove own admin) */}
                  {!isSelf && (
                    <Btn sm title={isAdm ? 'Remove admin rights' : 'Make admin'}
                      style={{ fontSize: 10, padding: '4px 8px' }}
                      onClick={() => changeUserRole(u.initials, isAdm ? 'member' : 'admin')}>
                      {isAdm ? '↓ Member' : '↑ Admin'}
                    </Btn>
                  )}
                  {/* Delete account — not shown for yourself */}
                  {!isSelf && (
                    <Btn sm danger title="Remove user"
                      onClick={() => setConfirmModal({
                        title: 'Remove member?',
                        body: `${u.name} will be removed from the team and lose access to the dashboard.`,
                        onConfirm: async () => { await removeMember(u.initials); setConfirmModal(null); },
                      })}>
                      <Trash2 size={11} />
                    </Btn>
                  )}
                </div>
              </div>
            );
          })}
          </div>{/* end scrollable table wrapper */}
        </Panel>
      </div>
    );
  };

  /* ═══════ TASK MODAL FORM ═══════ */
  // Used for both Create New Task and Edit Task.
  // Changes vs original:
  //   • Project dropdown now reads from live `projects` state (issue #1)
  //   • Due Date uses input[type=date] → native calendar popup (issue #3)
  //   • Date pre-populates correctly on edit — tries .due then .due_date (issue #5)
  //   • Collaborators toggle section added directly in the modal (issues #1 & #4)
  const TaskModalForm = () => {
    const editing = taskModal?.id;
    const [form, setForm] = useState({
      title:   taskModal?.title  || '',
      desc:    taskModal?.desc   || taskModal?.description || '',
      dept:    taskModal?.dept   || '',
      ass:     taskModal?.ass    || Object.keys(MEMBER_NAMES)[0] || '',
      pri:     taskModal?.pri    || 'm',
      // toDateInput converts "Apr 5, 2025" → "2025-04-05" so the picker shows the existing date
      due:     toDateInput(taskModal?.due || taskModal?.due_date || ''),
      status:  taskModal?.status || 'backlog',
      // Use live project name; fall back to first project in state
      camp:    taskModal?.camp   || taskModal?.project_name || (projects[0]?.name || ''),
      collabs: taskModal?.collabs || [],
    });
    const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // Toggle a collaborator pill on/off inside the form (not saved until Submit)
    const toggleFormCollab = (initials) =>
      upd('collabs', form.collabs.includes(initials)
        ? form.collabs.filter(k => k !== initials)
        : [...form.collabs, initials]);

    const handleSubmit = () => {
      if (!form.title.trim()) return;
      // Convert ISO date back to "Apr 5, 2025" before saving to DB
      const data = { ...form, due: fromDateInput(form.due) };
      submitTask(editing ? { ...data, id: taskModal.id } : data);
    };

    return (
      <Modal open title={editing ? 'Edit Task' : 'Create New Task'}
        subtitle="Fill in the details, assign it to a team member, and add collaborators."
        onClose={() => setTaskModal(null)}
        footer={<><Btn onClick={() => setTaskModal(null)}>Cancel</Btn><Btn primary onClick={handleSubmit}>{editing ? 'Save Changes' : 'Create Task'}</Btn></>}>

        {/* Task title */}
        <FormField label="Task Title *">
          <input style={inputStyle} value={form.title} onChange={e => upd('title', e.target.value)} placeholder="e.g. Build DAX measures for sales report" />
        </FormField>

        {/* Description */}
        <FormField label="Description">
          <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={form.desc} onChange={e => upd('desc', e.target.value)} placeholder="What needs to be done?" />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Project — live from DB via projects state, not hardcoded */}
          <FormField label="Project">
            <select style={inputStyle} value={form.camp} onChange={e => upd('camp', e.target.value)}>
              <option value="">— No project —</option>
              {projects.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
            </select>
          </FormField>

          {/* Assigned To — live from team members */}
          <FormField label="Assigned To">
            <select style={inputStyle} value={form.ass} onChange={e => upd('ass', e.target.value)}>
              {Object.entries(MEMBER_NAMES).map(([k, n]) => (
                <option key={k} value={k}>{n} — {MEMBER_ROLES[k]}</option>
              ))}
            </select>
          </FormField>

          {/* Priority */}
          <FormField label="Priority">
            <select style={inputStyle} value={form.pri} onChange={e => upd('pri', e.target.value)}>
              <option value="h">High</option><option value="m">Medium</option><option value="l">Low</option>
            </select>
          </FormField>

          {/* Due Date — type=date opens native calendar popup (issue #3) */}
          <FormField label="Due Date">
            <input type="date" style={inputStyle} value={form.due} onChange={e => upd('due', e.target.value)} />
          </FormField>

          {/* Status */}
          <FormField label="Status">
            <select style={inputStyle} value={form.status} onChange={e => upd('status', e.target.value)}>
              {COL_STAT.filter(s => s !== 'done').map(s => <option key={s} value={s}>{COL_LABELS[s]}</option>)}
            </select>
          </FormField>

          {/* Department */}
          <FormField label="Department">
            <select style={inputStyle} value={form.dept} onChange={e => upd('dept', e.target.value)}>
              <option value="">— None —</option>
              {DEPT_OPTIONS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </FormField>
        </div>

        {/* Collaborators — clickable pills, anyone except the assignee (issues #1 & #4) */}
        <FormField label="Collaborators">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {Object.keys(MEMBER_NAMES).filter(k => k !== form.ass).map(k => {
              const tagged = form.collabs.includes(k);
              return (
                <div key={k} onClick={() => toggleFormCollab(k)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px 4px 5px', borderRadius: 20, background: tagged ? COLORS.burgDim : '#EBEAED', border: `1px solid ${tagged ? COLORS.burg : '#E2E0E5'}`, fontSize: 12, color: tagged ? COLORS.burg : '#5A5860', cursor: 'pointer', userSelect: 'none' }}>
                  <Avatar k={k} size={16} />{MEMBER_NAMES[k]}
                </div>
              );
            })}
          </div>
        </FormField>
      </Modal>
    );
  };

  /* ═══════ PROJECT MODAL FORM ═══════ */
  // Changes vs original:
  //   • Start Date and Due Date use input[type=date] → native calendar popup (issue #3)
  //   • Dates pre-populate on edit — tries .start/.due then .start_date/.due_date (issue #5)
  //   • Team Members replaced by toggle-pill multi-select instead of single Lead dropdown (issue #1)
  const ProjModalForm = () => {
    const editing = projModal?.id;
    const [form, setForm] = useState({
      name:    projModal?.name   || '',
      desc:    projModal?.desc   || '',
      type:    projModal?.type   || 'Dashboard / Report',
      status:  projModal?.status || 'planning',
      // toDateInput converts "Apr 1, 2025" → "2025-04-01" so the picker shows the existing date
      start:   toDateInput(projModal?.start || projModal?.start_date || ''),
      due:     toDateInput(projModal?.due   || projModal?.due_date   || ''),
      // members is an array of initials; pre-populated from existing project data
      members: projModal?.members || [],
      pct:     projModal?.pct    || 0,
      tags:    projModal?.tags   || [],
    });
    const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // Toggle a member pill on/off — multiple members allowed (issue #1)
    const toggleMember = (initials) =>
      upd('members', form.members.includes(initials)
        ? form.members.filter(k => k !== initials)
        : [...form.members, initials]);

    const handleSubmit = () => {
      if (!form.name.trim()) return;
      // Convert ISO dates back to "Apr 1, 2025" format before saving to DB
      const data = { ...form, start: fromDateInput(form.start), due: fromDateInput(form.due) };
      submitProject(editing ? { ...data, id: projModal.id, color: projModal.color } : { ...data, open: 0 });
    };

    return (
      <Modal open title={editing ? 'Edit Project' : 'Launch New Project'}
        subtitle="Define project details, scope, team members and timeline."
        onClose={() => setProjModal(null)}
        footer={<><Btn onClick={() => setProjModal(null)}>Cancel</Btn><Btn primary onClick={handleSubmit}>{editing ? 'Save Changes' : 'Launch Project'}</Btn></>}>

        {/* Project name */}
        <FormField label="Project Name *">
          <input style={inputStyle} value={form.name} onChange={e => upd('name', e.target.value)} placeholder="e.g. Power BI Finance Dashboard" />
        </FormField>

        {/* Description */}
        <FormField label="Description / Goals">
          <textarea style={{ ...inputStyle, minHeight: 72, resize: 'vertical' }} value={form.desc} onChange={e => upd('desc', e.target.value)} />
        </FormField>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {/* Project type */}
          <FormField label="Project Type">
            <select style={inputStyle} value={form.type} onChange={e => upd('type', e.target.value)}>
              {['Dashboard / Report','Data Migration','ETL Pipeline','Process Automation','Data Cleanup','Analytics'].map(o => <option key={o}>{o}</option>)}
            </select>
          </FormField>

          {/* Status */}
          <FormField label="Status">
            <select style={inputStyle} value={form.status} onChange={e => upd('status', e.target.value)}>
              {['planning','active','on-hold','review','draft','done'].map(s => <option key={s} value={s}>{STATUS_PILLS[s].label}</option>)}
            </select>
          </FormField>

          {/* Start Date — type=date opens native calendar popup (issue #3) */}
          <FormField label="Start Date">
            <input type="date" style={inputStyle} value={form.start} onChange={e => upd('start', e.target.value)} />
          </FormField>

          {/* Due Date — type=date opens native calendar popup (issue #3) */}
          <FormField label="Due Date">
            <input type="date" style={inputStyle} value={form.due} onChange={e => upd('due', e.target.value)} />
          </FormField>

          {/* Progress slider */}
          <FormField label={`Progress — ${form.pct}%`}>
            <input type="range" min={0} max={100} value={form.pct} onChange={e => upd('pct', parseInt(e.target.value))} style={{ width: '100%', accentColor: COLORS.burg }} />
          </FormField>
        </div>

        {/* Team Members — multi-select toggle pills (issue #1) */}
        <FormField label="Team Members">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            {Object.keys(MEMBER_NAMES).map(k => {
              const tagged = form.members.includes(k);
              return (
                <div key={k} onClick={() => toggleMember(k)}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px 4px 5px', borderRadius: 20, background: tagged ? COLORS.burgDim : '#EBEAED', border: `1px solid ${tagged ? COLORS.burg : '#E2E0E5'}`, fontSize: 12, color: tagged ? COLORS.burg : '#5A5860', cursor: 'pointer', userSelect: 'none' }}>
                  <Avatar k={k} size={16} />{MEMBER_NAMES[k]}
                </div>
              );
            })}
          </div>
        </FormField>
      </Modal>
    );
  };

  /* ═══════ MEMBER MODAL ═══════ */
  const MemberModalForm = () => {
    const [form, setForm]       = useState({
      name:   memberModal?.name   || '',
      email:  memberModal?.email  || '',
      role:   memberModal?.role   || '',
      status: memberModal?.status || 'Online',
    });
    const [uploading, setUploading] = useState(false);
    const [showPassSection, setShowPassSection] = useState(false);
    const [newPass, setNewPass]     = useState('');
    const [confirmPass, setConfirm] = useState('');
    const [passError, setPassError] = useState('');
    const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

    const isSelf      = authUser?.initials === memberModal?.key;
    const canEditEmail = authUser?.role === 'admin' || isSelf;

    // ── Photo upload handler ────────────────────────────────────
    const handlePhotoChange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      setUploading(true);
      try {
        const fd = new FormData();
        fd.append('avatar', file);
        const userId = rawUsers.find(u => u.initials === memberModal.key)?.id;
        const res    = await API.uploadAvatar(userId, fd);
        // Update the global AVATAR_URLS map — Avatar components re-read this on their
        // next render (triggered by setUploading below), so the photo shows immediately.
        // We deliberately do NOT call setRawUsers here because that would re-render
        // the parent App and unmount this modal, losing any unsaved form changes.
        AVATAR_URLS[memberModal.key] = res.data.avatar_url;
      } catch (err) {
        alert(err.response?.data?.error || 'Photo upload failed. Max size is 3 MB.');
      } finally {
        setUploading(false);
      }
    };

    const handleSave = () => {
      if (!form.name) return;
      if (showPassSection) {
        if (newPass && newPass.length < 8) return setPassError('Password must be at least 8 characters.');
        if (newPass !== confirmPass)        return setPassError('Passwords do not match.');
      }
      const payload = { ...form };
      if (showPassSection && newPass) payload.password = newPass;
      saveMember(memberModal.key, payload);
    };

    return (
      <Modal open title="Edit Profile" subtitle="Update your photo, name, email, status or password."
        onClose={() => setMemberModal(null)}
        footer={<><Btn onClick={() => setMemberModal(null)}>Cancel</Btn><Btn primary onClick={handleSave}>Save Changes</Btn></>}>

        {/* ── Profile photo picker ── */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, padding: '12px 14px', background: '#FBF3F4', borderRadius: 8 }}>
          {/* Clicking the avatar opens the file picker via the hidden input below */}
          <label htmlFor="avatar-file-input" style={{ cursor: 'pointer', position: 'relative', flexShrink: 0 }} title="Click to change photo">
            <Avatar k={memberModal.key} size={56} />
            {/* Camera icon overlay */}
            <div style={{
              position: 'absolute', bottom: 0, right: 0,
              width: 18, height: 18, borderRadius: '50%',
              background: COLORS.burg, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 700, border: '2px solid #fff',
            }}>📷</div>
            <input
              id="avatar-file-input"
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              style={{ display: 'none' }}
              onChange={handlePhotoChange}
            />
          </label>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: COLORS.charcoal }}>{form.name || memberModal.key}</div>
            <div style={{ fontSize: 11, color: '#918E98', marginTop: 2 }}>
              {uploading ? '⏳ Uploading…' : 'Click the photo to upload a new one (JPG, PNG · max 3 MB)'}
            </div>
          </div>
        </div>

        {/* ── Text fields ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormField label="Full Name *">
            <input style={inputStyle} value={form.name} onChange={e => upd('name', e.target.value)} />
          </FormField>
          <FormField label="Job Title *">
            <input style={inputStyle} value={form.role} onChange={e => upd('role', e.target.value)} placeholder="e.g. Data Analyst" />
          </FormField>
          {canEditEmail && (
            <FormField label="Email address">
              <input type="email" style={inputStyle} value={form.email}
                onChange={e => upd('email', e.target.value)}
                placeholder="name@tdafrica.com" />
            </FormField>
          )}
          <FormField label="Status">
            <select style={inputStyle} value={form.status} onChange={e => upd('status', e.target.value)}>
              <option>Online</option><option>Away</option><option>In Meeting</option>
              <option>Focused</option><option>Out of Office</option>
            </select>
          </FormField>
        </div>

        {/* ── Change password — shown for own profile or when admin edits another user ── */}
        {(isSelf || authUser?.role === 'admin') && (
          <div style={{ marginTop: 16, borderTop: '1px solid #E2E0E5', paddingTop: 14 }}>
            <button
              type="button"
              onClick={() => { setShowPassSection(v => !v); setNewPass(''); setConfirm(''); setPassError(''); }}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: COLORS.burg, fontWeight: 600, padding: 0, textDecoration: 'underline' }}
            >
              {showPassSection ? 'Cancel password change' : (isSelf ? 'Change my password' : 'Set new password for this member')}
            </button>

            {showPassSection && (
              <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <FormField label="New Password">
                  <input
                    type="password" style={inputStyle} value={newPass}
                    onChange={e => { setNewPass(e.target.value); setPassError(''); }}
                    placeholder="Min. 8 characters" autoFocus
                  />
                </FormField>
                <FormField label="Confirm New Password">
                  <input
                    type="password" style={inputStyle} value={confirmPass}
                    onChange={e => { setConfirm(e.target.value); setPassError(''); }}
                    placeholder="Type again to confirm"
                  />
                </FormField>
                {passError && (
                  <div style={{ gridColumn: '1/-1', padding: '8px 12px', borderRadius: 6, background: '#FCEAEA', border: '1px solid #F5C6C6', fontSize: 12, color: '#D63B3B' }}>
                    {passError}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>
    );
  };

  /* ═══════ ADD MEMBER MODAL (admin only) ═══════ */
  const AddMemberForm = () => {
    const [form, setForm] = useState({ name: '', email: '', password: '', job_title: 'Data Analyst', role: 'member', initials: '' });
    const [showPw, setShowPw] = useState(false);
    const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));
    // Auto-generate initials as the name is typed
    const handleName = (v) => {
      const auto = v.trim().split(/\s+/).map(w => w[0]?.toUpperCase() || '').slice(0, 2).join('');
      setForm(f => ({ ...f, name: v, initials: f.initials || auto }));
    };
    return (
      <Modal open title="Add Team Member" subtitle="Create an account for a new team member. They can log in immediately."
        onClose={() => setAddMemberModal(false)}
        footer={<><Btn onClick={() => setAddMemberModal(false)}>Cancel</Btn><Btn primary onClick={() => { if (!form.name || !form.email || !form.password) return; addMember(form); }}>Create Account</Btn></>}>
        {/* Row 1: Name (wider) + Initials (narrower) */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 10 }}>
          <FormField label="Full Name *">
            <input style={inputStyle} value={form.name} onChange={e => handleName(e.target.value)} placeholder="e.g. Jane Doe" autoComplete="off" />
          </FormField>
          <FormField label="Initials">
            <input style={inputStyle} value={form.initials} onChange={e => upd('initials', e.target.value.toUpperCase().slice(0,3))} placeholder="e.g. JD" autoComplete="off" />
          </FormField>
        </div>
        {/* Row 2: Email (full width — prevents browser auto-fill bleed) */}
        <FormField label="Email *">
          <input style={inputStyle} type="email" value={form.email} onChange={e => upd('email', e.target.value)} placeholder="jane@tdafrica.com" autoComplete="off" />
        </FormField>
        {/* Row 3: Job Title + Role side by side */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <FormField label="Job Title">
            <input style={inputStyle} value={form.job_title} onChange={e => upd('job_title', e.target.value)} placeholder="e.g. Data Analyst" autoComplete="off" />
          </FormField>
          <FormField label="Role">
            <select style={inputStyle} value={form.role} onChange={e => upd('role', e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </FormField>
        </div>
        {/* Row 4: Password (full width) */}
        <FormField label="Password *">
          <div style={{ position: 'relative' }}>
            <input style={{ ...inputStyle, paddingRight: 36 }} type={showPw ? 'text' : 'password'} value={form.password} onChange={e => upd('password', e.target.value)} placeholder="Set a temporary password" autoComplete="new-password" />
            <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#848688', padding: 0, display: 'flex', alignItems: 'center' }}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </FormField>
        <div style={{ marginTop: 8, padding: '10px 12px', background: '#FBF3F4', borderRadius: 6, fontSize: 12, color: '#5A5860' }}>
          The member will log in at <strong>this app's URL</strong> using their email and the password you set here. Advise them to change it after first login.
        </div>
      </Modal>
    );
  };

  /* ═══════ RESET PASSWORD MODAL (admin only) ═══════ */
  // Lets an admin set a brand-new password for any team member.
  // The user does not need to know their old password — admin override.
  const ResetPassModal = () => {
    const [pass, setPass]       = useState('');
    const [confirm, setConfirm] = useState('');
    const [err, setErr]         = useState('');
    const [saving, setSaving]   = useState(false);

    const handleReset = async () => {
      // ── Basic validation ───────────────────────────────────────
      if (!pass)          return setErr('Please enter a new password.');
      if (pass.length < 8) return setErr('Password must be at least 8 characters.');
      if (pass !== confirm) return setErr('Passwords do not match. Please re-type.');
      setSaving(true);
      try {
        await API.updateUser(resetPassModal.userId, { password: pass });
        // ── DEBUG: confirm in console ──────────────────────────
        console.log(`🔑 Password reset for ${resetPassModal.userName}`);
        setResetPassModal(null);
      } catch (e) {
        setErr(e.response?.data?.error || 'Failed to reset password. Try again.');
      } finally {
        setSaving(false);
      }
    };

    return (
      <Modal open
        title="Reset Password"
        subtitle={`Set a new password for ${resetPassModal?.userName}.`}
        onClose={() => setResetPassModal(null)}
        footer={
          <>
            <Btn onClick={() => setResetPassModal(null)}>Cancel</Btn>
            <Btn primary onClick={handleReset} disabled={saving}>{saving ? 'Saving…' : 'Reset Password'}</Btn>
          </>
        }>
        <FormField label="New Password">
          <input type="password" style={inputStyle} value={pass}
            onChange={e => { setPass(e.target.value); setErr(''); }}
            placeholder="Min. 8 characters" autoFocus />
        </FormField>
        <FormField label="Confirm New Password">
          <input type="password" style={inputStyle} value={confirm}
            onChange={e => { setConfirm(e.target.value); setErr(''); }}
            placeholder="Type the password again" />
        </FormField>
        {err && (
          <div style={{ marginTop: 4, padding: '8px 12px', borderRadius: 6, background: COLORS.redD, border: `1px solid #F5C6C6`, fontSize: 12, color: COLORS.red }}>
            {err}
          </div>
        )}
      </Modal>
    );
  };

  /* ═══════ CONFIRM MODAL ═══════ */
  const ConfirmModalComp = () => (
    <Modal open onClose={() => setConfirmModal(null)} title={confirmModal?.title} footer={<><Btn sm onClick={() => setConfirmModal(null)}>Cancel</Btn><Btn sm danger onClick={confirmModal?.onConfirm}>Delete</Btn></>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: COLORS.redD, display: 'flex', alignItems: 'center', justifyContent: 'center' }}><AlertCircle size={20} color={COLORS.red} /></div>
      </div>
      <p style={{ fontSize: 13, color: '#5A5860' }}>{confirmModal?.body}</p>
    </Modal>
  );

  /* ═══════ RENDER ═══════ */
  const views = { dashboard: <DashboardView />, projects: <ProjectsView />, tasks: <TaskBoardView />, team: <TeamView />, calendar: <CalendarView />, timeline: <TimelineView />, reports: <ReportsView />, notifs: <NotifsView />, chat: <ChatView />, admin: <AdminView /> };

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', fontFamily: "'DM Sans',sans-serif", fontSize: 14, color: T.text, background: T.bg, transition: 'background 0.2s, color 0.2s' }}>
      <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap" rel="stylesheet" />
      <Sidebar />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* ── Top header bar ── */}
        <div style={{ height: 54, minHeight: 54, background: T.surface, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 12, padding: isMobile ? '0 12px' : '0 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
          {isMobile && (
            <button onClick={() => setMobileSidebarOpen(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: T.text, display: 'flex', alignItems: 'center', flexShrink: 0 }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="4" width="16" height="2" rx="1" fill="currentColor"/>
                <rect x="2" y="9" width="16" height="2" rx="1" fill="currentColor"/>
                <rect x="2" y="14" width="16" height="2" rx="1" fill="currentColor"/>
              </svg>
            </button>
          )}
          {/* Title + job-title subtitle */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontSize: isMobile ? 13 : 15, fontWeight: 700, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.2 }}>{VTITLES[view]}</div>
            {authUser?.job_title && <div style={{ fontSize: 10, color: T.textSub, marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.6 }}>{authUser.job_title}</div>}
          </div>
          {!isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: T.searchBg, border: `1px solid ${T.border}`, borderRadius: 6, padding: '6px 12px', color: T.textSub, fontSize: 13, minWidth: 200 }}><Search size={13} style={{ opacity: 0.5 }} /> Search tasks, projects...</div>
          )}
          {/* Dark / Light mode toggle */}
          <button onClick={() => setDarkMode(d => !d)} title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            style={{ background: T.filterIn, border: `1px solid ${T.border}`, borderRadius: 7, cursor: 'pointer', padding: '6px 9px', display: 'flex', alignItems: 'center', color: T.text, transition: 'background 0.15s' }}>
            {darkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <Btn sm onClick={() => setTaskModal({})}><Plus size={12} />{!isMobile && ' New Task'}</Btn>
          <Btn primary sm onClick={() => setProjModal({})}><Plus size={12} />{!isMobile && ' New Project'}</Btn>
        </div>
        {views[view]}
      </div>
      {taskModal && <TaskModalForm />}
      {projModal && <ProjModalForm />}
      {memberModal && <MemberModalForm />}
      {addMemberModal && <AddMemberForm />}
      {confirmModal && <ConfirmModalComp />}
      {resetPassModal && <ResetPassModal />}
    </div>
  );
}
