-- ------------------------------- confirmed e-mail and reset links ----
--
-- Self-registration now has to confirm the e-mail address before signing in,
-- and anyone who forgot their password can reset it by e-mail.
--
-- Accounts that already exist were created by an admin, through an
-- invitation, or before this check existed: they count as confirmed.

alter table users add column email_verified_at timestamptz;
update users set email_verified_at = created_at;

-- One-time links sent by e-mail. Only a hash of the token is stored, as with
-- invitations and refresh tokens, so a database leak reveals no usable link.
create table email_tokens (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references users(id) on delete cascade,
  purpose    text not null check (purpose in ('verify_email', 'reset_password')),
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);

create index email_tokens_user_purpose on email_tokens (user_id, purpose);
