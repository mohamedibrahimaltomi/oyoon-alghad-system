
-- Additional security policies (can be tightened later)

-- Example: only authenticated role (if using Supabase auth later)
-- Currently open because system uses custom username/password

-- Logs: allow insert/select
drop policy if exists logs_read on app_logs;
create policy logs_read on app_logs
for select
using (true);

drop policy if exists logs_insert on app_logs;
create policy logs_insert on app_logs
for insert
with check (true);


-- Backups
drop policy if exists backups_read on backups;
create policy backups_read on backups
for select
using (true);

drop policy if exists backups_insert on backups;
create policy backups_insert on backups
for insert
with check (true);


-- Employees
drop policy if exists employees_all on employees;
create policy employees_all on employees
for all
using (true)
with check (true);


-- Attendance
drop policy if exists attendance_all on attendance;
create policy attendance_all on attendance
for all
using (true)
with check (true);


-- Payroll
drop policy if exists payroll_archive_all on payroll_archive;
create policy payroll_archive_all on payroll_archive
for all
using (true)
with check (true);


-- Loans
drop policy if exists loans_all on loans;
create policy loans_all on loans
for all
using (true)
with check (true);


-- Adjustments
drop policy if exists adjustments_all on adjustments;
create policy adjustments_all on adjustments
for all
using (true)
with check (true);


-- Settings
drop policy if exists settings_all on system_settings;
create policy settings_all on system_settings
for all
using (true)
with check (true);


-- Users
drop policy if exists users_all on app_users;
create policy users_all on app_users
for all
using (true)
with check (true);
