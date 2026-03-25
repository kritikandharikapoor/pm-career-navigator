-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

create table user_profiles (
  id uuid references auth.users(id) primary key,
  email text,
  archetype text,
  scores jsonb,
  warmup_background text,
  warmup_experience text,
  warmup_industry text,
  assessment_answers jsonb,
  has_paid boolean default false,
  created_at timestamp with time zone default now()
);

create table payments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  razorpay_order_id text,
  razorpay_payment_id text,
  amount integer default 100,
  status text default 'pending',
  created_at timestamp with time zone default now()
);

create table roadmap_progress (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id),
  step_id text,
  dimension text,
  completed_at timestamp with time zone default now()
);
