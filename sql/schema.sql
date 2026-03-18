create extension if not exists pgcrypto with schema extensions;

grant usage on schema public to anon, authenticated;
grant usage on schema extensions to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
alter default privileges in schema public grant all on tables to anon, authenticated;
alter default privileges in schema public grant all on sequences to anon, authenticated;

create table if not exists employee_types (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  payroll_method text not null default 'fixed_salary',
  created_at timestamptz default now()
);

create table if not exists departments (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);

create table if not exists jobs (
  id uuid primary key default gen_random_uuid(),
  department_id uuid references departments(id) on delete set null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists lines (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);

create table if not exists vehicles (
  id uuid primary key default gen_random_uuid(),
  name text unique not null,
  created_at timestamptz default now()
);

create table if not exists pricing (
  id uuid primary key default gen_random_uuid(),
  line_id uuid references lines(id) on delete cascade,
  vehicle_id uuid references vehicles(id) on delete cascade,
  amount numeric not null default 0,
  created_at timestamptz default now(),
  unique(line_id, vehicle_id)
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  employee_no text unique not null,
  name text not null,
  department_id uuid references departments(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  employee_type_id uuid references employee_types(id) on delete set null,
  line_id uuid references lines(id) on delete set null,
  vehicle_id uuid references vehicles(id) on delete set null,
  salary numeric not null default 0,
  status text not null default 'نشط',
  notes text default '',
  created_at timestamptz default now()
);

create table if not exists attendance (
  id uuid primary key default gen_random_uuid(),
  date date not null,
  employee_id uuid references employees(id) on delete cascade,
  status text not null,
  check_in text,
  late_minutes integer not null default 0,
  reserve_replacement boolean not null default false,
  actual_line_id uuid references lines(id) on delete set null,
  actual_vehicle_id uuid references vehicles(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists leave_requests (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  leave_type text not null,
  from_date date not null,
  to_date date not null,
  notes text default '',
  created_at timestamptz default now()
);

create table if not exists loans (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  type text not null,
  amount numeric default 0,
  months_count integer default 1,
  monthly_installment numeric default 0,
  remaining_amount numeric default 0,
  created_at timestamptz default now()
);

create table if not exists adjustments (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  type text not null,
  amount numeric default 0,
  month text not null,
  notes text default '',
  created_at timestamptz default now()
);

create table if not exists payroll_archive (
  id uuid primary key default gen_random_uuid(),
  month text unique not null,
  rows jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);

create table if not exists employee_history (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  change_text text not null,
  created_at timestamptz default now()
);

create table if not exists delete_requests (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  item_label text not null,
  status text not null default 'معلق',
  created_at timestamptz default now()
);

create table if not exists app_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  username text default 'system',
  details text default '',
  created_at timestamptz default now()
);

create table if not exists backups (
  id uuid primary key default gen_random_uuid(),
  reason text not null,
  payload jsonb default '{}'::jsonb,
  size_bytes bigint default 0,
  created_at timestamptz default now()
);

create table if not exists app_users (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  full_name text not null,
  role text not null default 'موظف',
  status text not null default 'active',
  password_hash text not null,
  created_at timestamptz default now()
);

create table if not exists system_settings (
  key text primary key,
  value_text text,
  value_number numeric,
  value_mode text,
  updated_at timestamptz default now()
);

create table if not exists payroll_month_overrides (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  employee_id uuid references employees(id) on delete cascade,
  override_mode text not null default 'days',
  override_value numeric not null default 0,
  reason text default '',
  created_by text default 'system',
  created_at timestamptz default now(),
  unique(month, employee_id)
);

create or replace function verify_app_user(p_username text, p_password text)
returns table(id uuid, username text, full_name text, role text, status text)
language sql
security definer
set search_path = public, extensions
as $$
  select u.id, u.username, u.full_name, u.role, u.status
  from app_users u
  where u.username = p_username
    and u.status = 'active'
    and u.password_hash = extensions.crypt(p_password, u.password_hash)
  limit 1;
$$;

create or replace function create_app_user(
  p_username text,
  p_full_name text,
  p_role text,
  p_status text,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
declare new_id uuid;
begin
  insert into app_users(username, full_name, role, status, password_hash)
  values(
    p_username,
    p_full_name,
    p_role,
    p_status,
    extensions.crypt(p_password, extensions.gen_salt('bf'))
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function update_app_user(
  p_id uuid,
  p_username text,
  p_full_name text,
  p_role text,
  p_status text,
  p_password text
)
returns uuid
language plpgsql
security definer
set search_path = public, extensions
as $$
begin
  update app_users
  set username = p_username,
      full_name = p_full_name,
      role = p_role,
      status = p_status,
      password_hash = case
        when p_password is null or p_password = '' then password_hash
        else extensions.crypt(p_password, extensions.gen_salt('bf'))
      end
  where id = p_id;

  return p_id;
end;
$$;

insert into employee_types(name, payroll_method) values
('سائق','driver_line_vehicle'),
('سائق احتياط','reserve_driver'),
('موظف','fixed_salary'),
('مسوق','fixed_salary')
on conflict(name) do nothing;

insert into departments(name) values
('الإدارة'),
('الحركة'),
('المبيعات')
on conflict(name) do nothing;

insert into jobs(name, department_id)
select 'سائق', id from departments where name = 'الحركة'
on conflict do nothing;

insert into jobs(name, department_id)
select 'سائق احتياط', id from departments where name = 'الحركة'
on conflict do nothing;

insert into jobs(name, department_id)
select 'موظف إداري', id from departments where name = 'الإدارة'
on conflict do nothing;

insert into jobs(name, department_id)
select 'مسوق', id from departments where name = 'المبيعات'
on conflict do nothing;

insert into vehicles(name) values
('كنتر'),
('شاحنة'),
('نقل صغيرة')
on conflict(name) do nothing;

insert into lines(name) values
('صبراتة 1'),
('صبراتة 2'),
('صرمان'),
('العجيلات'),
('الجميل'),
('رقدالين'),
('الحرشة'),
('الزاوية شمال'),
('الزاوية جنوب'),
('ورشبانة 1'),
('ورشبانة 2'),
('جملة'),
('أسواق'),
('طلبيات'),
('احتياط')
on conflict(name) do nothing;

insert into pricing(line_id, vehicle_id, amount)
select l.id, v.id, x.amount
from (values
('صبراتة 1','كنتر',800),('صبراتة 1','شاحنة',1000),
('صبراتة 2','كنتر',800),('صبراتة 2','شاحنة',1000),
('صرمان','كنتر',900),('صرمان','شاحنة',1100),
('العجيلات','كنتر',900),('العجيلات','شاحنة',1100),
('الجميل','كنتر',1000),('الجميل','شاحنة',1200),
('رقدالين','كنتر',1100),('رقدالين','شاحنة',1300),
('الحرشة','كنتر',1100),('الحرشة','شاحنة',1300),
('الزاوية شمال','كنتر',1200),('الزاوية شمال','شاحنة',1400),
('الزاوية جنوب','كنتر',1200),('الزاوية جنوب','شاحنة',1400),
('ورشبانة 1','كنتر',1300),('ورشبانة 1','شاحنة',1500),
('ورشبانة 2','كنتر',1300),('ورشبانة 2','شاحنة',1500),
('جملة','كنتر',1500),('جملة','شاحنة',1500),
('أسواق','كنتر',1500),('أسواق','شاحنة',1500),
('طلبيات','نقل صغيرة',1200),
('احتياط','كنتر',800),('احتياط','شاحنة',1000),('احتياط','نقل صغيرة',800)
) as x(line_name, vehicle_name, amount)
join lines l on l.name = x.line_name
join vehicles v on v.name = x.vehicle_name
on conflict(line_id, vehicle_id) do update set amount = excluded.amount;

insert into system_settings(key, value_text, value_number, value_mode) values
('work_start_time','08:00',null,null),
('late_1_minutes',null,30,null),
('late_1_mode',null,null,'days'),
('late_1_value',null,0.25,null),
('late_2_minutes',null,60,null),
('late_2_mode',null,null,'days'),
('late_2_value',null,0.50,null),
('late_3_minutes',null,120,null),
('late_3_mode',null,null,'days'),
('late_3_value',null,0.75,null),
('repeat_enabled',null,1,null),
('repeat_mode',null,null,'days'),
('repeat_value',null,3,null)
on conflict(key) do nothing;

do $$
begin
  if not exists(select 1 from app_users where username = 'admin') then
    insert into app_users(username, full_name, role, status, password_hash)
    values(
      'admin',
      'مدير النظام',
      'مدير النظام',
      'active',
      extensions.crypt('admin123', extensions.gen_salt('bf'))
    );
  end if;
end $$;

alter table employee_types enable row level security;
alter table departments enable row level security;
alter table jobs enable row level security;
alter table lines enable row level security;
alter table vehicles enable row level security;
alter table pricing enable row level security;
alter table employees enable row level security;
alter table attendance enable row level security;
alter table leave_requests enable row level security;
alter table loans enable row level security;
alter table adjustments enable row level security;
alter table payroll_archive enable row level security;
alter table employee_history enable row level security;
alter table delete_requests enable row level security;
alter table app_logs enable row level security;
alter table backups enable row level security;
alter table app_users enable row level security;
alter table system_settings enable row level security;
alter table payroll_month_overrides enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'employee_types',
    'departments',
    'jobs',
    'lines',
    'vehicles',
    'pricing',
    'employees',
    'attendance',
    'leave_requests',
    'loans',
    'adjustments',
    'payroll_archive',
    'employee_history',
    'delete_requests',
    'app_logs',
    'backups',
    'app_users',
    'system_settings',
    'payroll_month_overrides'
  ]
  loop
    execute format('drop policy if exists open_all_%s on %I', t, t);
    execute format('create policy open_all_%s on %I for all using (true) with check (true)', t, t);
  end loop;
end $$;
