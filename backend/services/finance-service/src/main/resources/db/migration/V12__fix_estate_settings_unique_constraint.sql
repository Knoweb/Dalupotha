ALTER TABLE estate_settings DROP CONSTRAINT ukk9qc6sjdk0xwhlolv9np8cufg;
ALTER TABLE estate_settings ADD CONSTRAINT uk_estate_settings_key_estate UNIQUE (setting_key, estate_id);
