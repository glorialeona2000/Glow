-- Données de test (uniquement pour les tests automatiques) : horaires larges et règles souples.
-- Les prix et durées sont ceux du catalogue réel (0002_seed.sql).
insert into working_hours (weekday, start_time, end_time)
select d, '09:00', '19:00' from generate_series(1, 7) d;
insert into breaks (weekday, start_time, end_time, label) select d, '12:30', '13:30', 'Pause' from generate_series(1, 7) d;
update settings set min_notice_hours = 0, buffer_min = 15, slot_interval_min = 30, max_days_ahead = 60, max_requests_per_hour = 50;
