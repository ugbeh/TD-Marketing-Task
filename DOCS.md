# TD Africa Data Team — Task Manager
## Admin & User Guide

---

## Table of Contents
1. [What Is This App?](#1-what-is-this-app)
2. [Accessing the App](#2-accessing-the-app)
3. [User Roles](#3-user-roles)
4. [Adding Team Members](#4-adding-team-members)
5. [Projects](#5-projects)
6. [Tasks](#6-tasks)
7. [Team Chat](#7-team-chat)
8. [Reports](#8-reports)
9. [Calendar](#9-calendar)
10. [Email Notifications](#10-email-notifications)
11. [Environment Variables (Render)](#11-environment-variables-render)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. What Is This App?

A private task and project management dashboard for the TD Africa Data Team. It allows the team to:

- Create and assign tasks with priorities, due dates, and statuses
- Track projects and their progress
- Chat in real-time with the team
- Receive email notifications when tasks or projects are assigned to them
- View reports on team workload and task completion

The app is hosted on **Render** (server + frontend) and uses **Neon** (PostgreSQL database).

Live URL: `https://task-manager-jmdz.onrender.com`

---

## 2. Accessing the App

Open the live URL in any browser. Use the email address and password provided to you by your admin to log in.

**Forgot your password?**
Click "Forgot password?" on the login screen, enter your email, and you will receive a reset link by email. The link expires in 1 hour.

---

## 3. User Roles

| Role | What they can do |
|------|-----------------|
| **Admin** | Add/remove team members, create projects, assign tasks to anyone, see all tasks and projects, delete anything |
| **Member** | View their own tasks and projects they belong to, update their own tasks, add comments, use team chat |

---

## 4. Adding Team Members

Only admins can add new members.

1. Go to **Team** in the left sidebar
2. Click **Add Member**
3. Fill in: Name, Email, Job Title, Password, Role (Member or Admin)
4. Click **Save**

The new member can now log in with the email and password you set. They should be asked to change their password on first login (or you can share it securely).

> **Note:** There is no self-service registration. All accounts are created by an admin.

---

## 5. Projects

### Creating a Project
1. Go to **Projects** → **New Project**
2. Fill in: Name, Type, Status, Start Date, Due Date, Team Members, Tags
3. Click **Save**

All members added to the project will receive an email notification.

### Project Statuses
| Status | Meaning |
|--------|---------|
| Planning | Not started yet |
| Active | Currently in progress |
| Review | Awaiting review or approval |
| On Hold | Paused |
| Draft | Early stage, not active |
| Done | Completed |

### Adjusting Progress
On the Dashboard, use the **+** and **−** buttons on a project card to adjust its completion percentage in 5% steps.

### Progress Bar Colours
| Colour | Progress |
|--------|----------|
| Red | Below 40% |
| Amber | 40–69% |
| Green | 70% and above |

---

## 6. Tasks

### Creating a Task
1. Go to **Tasks** → **New Task** (or click **+** on any board column)
2. Fill in: Title, Description, Priority, Department, Due Date, Assignee, Project, Collaborators
3. Click **Save**

The assigned person will receive an email notification.

### Task Statuses (Kanban Board)
| Column | Meaning |
|--------|---------|
| Backlog | Not yet started |
| In Progress | Being worked on |
| In Review | Submitted for review |
| Approved | Reviewed and approved |
| Done | Completed |

Drag and drop tasks between columns to update their status.

### Task Priorities
- **Low** — No urgency
- **Medium** — Normal priority
- **High** — Needs attention
- **Critical** — Urgent, must be resolved immediately

### Comments & Activity
Open any task to add comments or see the full activity history (status changes, assignments, edits).

---

## 7. Team Chat

Click **Chat** in the left sidebar to open the team chat. All messages are visible to the whole team in real-time. The chat shows an unread message count on the sidebar icon.

> If chat messages stop appearing, refresh the page. The app reconnects automatically.

---

## 8. Reports

The **Reports** tab shows live charts based on current data:

- **Tasks by Month** — how many tasks are due each month (last 6 months)
- **Team Workload** — number of active tasks per person
- **Priority Breakdown** — how tasks are distributed across priority levels
- **Completion Rate** — percentage of tasks marked as Done
- **Overview cards** — total tasks, active projects, overdue tasks

---

## 9. Calendar

The **Calendar** tab shows all tasks and projects on their due dates.

- Tasks show as chips with a `[type]` prefix
- Projects show with a left border in the project colour
- Click on any day to see what is due

---

## 10. Email Notifications

Emails are sent automatically in three situations:

| Trigger | Who receives the email |
|---------|----------------------|
| A task is assigned to someone | The assignee |
| A task is reassigned to a different person | The new assignee |
| Someone is added to a project | Every new member added |
| Password reset requested | The user who requested it |

Emails include the task/project details and a button that links directly to the app.

### If emails are not arriving

**Most likely cause:** The `EMAIL_FROM` environment variable on Render is set to a domain that has not been verified in Resend.

**Quick fix (takes 30 seconds):**
1. Go to Render → your service → **Environment**
2. Find `EMAIL_FROM` and **delete it** (click the trash icon)
3. Click **Save Changes** — Render will redeploy automatically

Emails will then send from `onboarding@resend.dev`. They arrive in the recipient's inbox and work exactly the same — only the sender address is different.

**To send from `@tdafrica.com` instead:**
1. Log in to resend.com
2. Go to **Domains → Add Domain** → enter `tdafrica.com`
3. Add the 3 DNS records Resend provides to your domain registrar (GoDaddy, Cloudflare, etc.)
4. Once verified, restore `EMAIL_FROM` to `TD Africa Data Team <notifications@tdafrica.com>`

This requires access to the domain DNS settings — not Microsoft 365 admin.

---

## 11. Environment Variables (Render)

These must be set under your Render service → **Environment**:

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Neon PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret key for signing login tokens (long random string) |
| `JWT_EXPIRES_IN` | No | How long login sessions last. Default: `7d` |
| `NODE_ENV` | Yes | Set to `production` |
| `RESEND_API_KEY` | Yes | API key from resend.com — enables email notifications |
| `EMAIL_FROM` | No | Sender name/address. Leave blank to use `onboarding@resend.dev`. Only set this after verifying your domain in Resend. |
| `APP_URL` | Yes | Full URL of the app e.g. `https://task-manager-jmdz.onrender.com` |

---

## 12. Troubleshooting

### "The app takes a long time to load"
Render free tier spins down servers after 15 minutes of inactivity. The first load after idle can take up to 30 seconds. This is normal.

### "I'm not receiving email notifications"
See [Section 10 — If emails are not arriving](#if-emails-are-not-arriving).

### "Chat messages are not appearing"
The chat uses a real-time WebSocket connection. If it drops:
- Refresh the page — it reconnects automatically
- Check that `APP_URL` on Render matches the actual app URL exactly (no trailing slash)

### "I forgot my password"
Click "Forgot password?" on the login page and enter your email. A reset link will be sent to you. If the email doesn't arrive within a few minutes, ask your admin — they can see the reset link in the Render server logs.

### "A team member's task notifications are not arriving"
Make sure their account was created with a valid email address. Go to **Team**, click on the member, and verify the email shown is correct.

### "I need to reset the database"
Run `neon-setup.sql` from `server/db/neon-setup.sql` against your Neon database using the Neon SQL editor. **This deletes all data** — only do this during initial setup.
