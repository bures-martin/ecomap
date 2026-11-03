-- Every layer is reviewed by default: what regular members add or change waits
-- for a moderator before it appears. Moderators and admins still publish
-- directly. An admin can still switch review off for a layer.

alter table layers alter column requires_moderation set default true;
update layers set requires_moderation = true;
