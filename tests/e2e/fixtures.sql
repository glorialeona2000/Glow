-- Données de test : horaires et tarifs FICTIFS, uniquement pour les tests automatiques.
insert into working_hours (weekday, start_time, end_time)
select d, '09:00', '19:00' from generate_series(1, 7) d;
insert into breaks (weekday, start_time, end_time, label) select d, '12:30', '13:30', 'Pause' from generate_series(1, 7) d;
update settings set min_notice_hours = 0, buffer_min = 15, slot_interval_min = 30, max_days_ahead = 60, max_requests_per_hour = 50;
update services set price_cents = 4500, duration_min = 60 where name = 'Lash Lift avec coloration des cils';
update services set price_cents = 3000, duration_min = 45 where name = 'Manucure semi-permanente';
update services set price_cents = 9000, duration_min = 90 where name = 'Maquillage événementiel';
update service_variants set price_cents = 5500, duration_min = 90 where name = 'Renforcement sur ongles naturels';
update service_variants set price_cents = 7000, duration_min = 120 where name = 'Extension';
update service_options set price_cents = 1000, duration_min = 15 where name = 'French manucure';
