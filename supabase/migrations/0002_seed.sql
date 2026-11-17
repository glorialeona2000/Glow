-- BELAVICA — contenu initial du catalogue.
-- Aucun prix ni durée n'est inventé : ils restent vides et se renseignent dans l'admin.
-- Une prestation sans prix ou sans durée n'est pas réservable en ligne.

insert into categories (slug, name, tagline, description, image_url, sort) values
 ('make-up', 'Make-up', 'Mise en beauté & formations',
  'Des mises en beauté sur mesure pour vos événements, votre mariage, et des cours pour apprendre à vous sublimer.',
  '/images/maquillage-glam.webp', 1),
 ('lash-brow', 'Lash & Brow', 'Regard sublimé',
  'Rehaussement des cils, restructuration et mise en forme des sourcils pour un regard défini et naturel.',
  '/images/sourcils.webp', 2),
 ('nails', 'Nails', 'Mains soignées',
  'Manucures soignées, semi-permanent et construction en gel pour des ongles élégants et résistants.',
  '/images/ongles-amande.webp', 3),
 ('facial', 'Facial Treatments', 'Soin du visage sur mesure',
  'Un soin du visage entièrement personnalisé, construit après une analyse de peau.',
  '/images/editorial.webp', 4)
on conflict (slug) do nothing;

do $$
declare
  c_make uuid; c_lash uuid; c_nails uuid; c_facial uuid;
  s_classic uuid; s_semi uuid; s_russe uuid; o_french uuid;
begin
  if exists (select 1 from services) then return; end if;

  select id into c_make   from categories where slug = 'make-up';
  select id into c_lash   from categories where slug = 'lash-brow';
  select id into c_nails  from categories where slug = 'nails';
  select id into c_facial from categories where slug = 'facial';

  insert into services (category_id, name, description, booking_mode, sort) values
   (c_make, 'Maquillage événementiel', 'Maquillage professionnel personnalisé pour vos événements, soirées, cérémonies et occasions spéciales.', 'appointment', 1),
   (c_make, 'Maquillage mariée', 'Mise en beauté personnalisée pour le jour de votre mariage, adaptée à votre style, votre tenue et vos préférences.', 'appointment', 2),
   (c_make, 'Cours d’auto-maquillage — Day Look', 'Apprenez à réaliser un maquillage de jour naturel, lumineux et élégant. Découvrez les techniques essentielles pour sublimer votre visage au quotidien.', 'appointment', 3),
   (c_make, 'Cours d’auto-maquillage — Day & Night Look', 'Apprenez à réaliser un maquillage de jour et à le transformer en un maquillage de soirée plus sophistiqué. Une formation complète pour maîtriser deux looks et les techniques de transition.', 'appointment', 4),
   (c_make, 'Formation maquillage — 10 heures', 'Programme de formation personnalisé de 10 heures consacré à l’apprentissage et au perfectionnement des techniques de maquillage.', 'request', 5),
   (c_make, 'Formation maquillage — 20 heures', 'Programme approfondi de 20 heures permettant de développer et perfectionner différentes techniques de maquillage à travers un accompagnement personnalisé.', 'request', 6);

  update services set note = 'La formation se déroule en plusieurs séances. Envoyez une demande : nous construisons ensemble votre planning.'
   where booking_mode = 'request';

  insert into services (category_id, name, description, sort) values
   (c_lash, 'Lash Lift avec coloration des cils', 'Rehaussement des cils naturels associé à une coloration pour intensifier et définir le regard.', 1),
   (c_lash, 'Lash Lift sans coloration', 'Rehaussement des cils naturels pour obtenir une courbure élégante et mettre en valeur le regard sans coloration.', 2),
   (c_lash, 'Brow Lift avec coloration des sourcils', 'Restructuration et discipline des sourcils associées à une coloration pour un résultat défini et harmonieux.', 3),
   (c_lash, 'Brow Lift sans coloration', 'Restructuration des sourcils pour discipliner les poils et obtenir une ligne harmonieuse et soignée.', 4),
   (c_lash, 'Épilation et mise en forme des sourcils', 'Épilation et restructuration de la ligne des sourcils selon la morphologie du visage.', 5);

  insert into services (category_id, name, description, sort) values
   (c_nails, 'Manucure classique', 'Soin esthétique des mains et des ongles naturels comprenant la préparation des ongles et l’application d’un vernis classique.', 1)
   returning id into s_classic;
  insert into services (category_id, name, description, sort) values
   (c_nails, 'Manucure semi-permanente', 'Préparation des ongles naturels et application d’un vernis semi-permanent pour une finition soignée et durable.', 2)
   returning id into s_semi;
  insert into services (category_id, name, description, sort) values
   (c_nails, 'Manucure russe & construction en gel', 'Manucure russe avec préparation minutieuse du contour de l’ongle et construction en gel pour créer une architecture harmonieuse, résistante et élégante.', 3)
   returning id into s_russe;

  insert into service_variants (service_id, name, description, sort) values
   (s_russe, 'Renforcement sur ongles naturels', 'Construction en gel sur la longueur de vos ongles naturels.', 1),
   (s_russe, 'Extension', 'Allongement de l’ongle et construction en gel.', 2);

  insert into service_options (name, description, sort) values
   ('French manucure', 'Finition French élégante, ajoutée à votre manucure.', 1)
   returning id into o_french;
  insert into service_option_links (service_id, option_id) values
   (s_classic, o_french), (s_semi, o_french), (s_russe, o_french);

  insert into services (category_id, name, description, highlights, note, sort) values
   (c_facial, 'Soin du visage personnalisé — Bespoke Facial Treatment',
    'Offrez à votre peau un soin entièrement personnalisé, adapté à ses besoins et à ses caractéristiques. Chaque séance débute par une analyse de peau afin de sélectionner le protocole et les actifs les plus appropriés.',
    array[
      'Anti-âge : prévention et atténuation de l’apparence des signes de l’âge.',
      'Peaux sensibles : soin apaisant et respectueux des peaux réactives.',
      'Purifiant : soin adapté aux peaux présentant des imperfections, des pores obstrués ou un excès de sébum.',
      'Éclat : soin revitalisant pour les teints ternes et fatigués.',
      'Hydratation : soin destiné à améliorer le confort et l’hydratation cutanée.'
    ],
    'Vous n’avez rien à choisir à l’avance : le protocole est déterminé sur place, après une analyse professionnelle de votre peau.',
    1);
end $$;

insert into gallery_items (image_url, alt, category, sort)
select * from (values
  ('/images/maquillage-glam.webp',   'Maquillage glamour, regard charbonneux et teint lumineux', 'Make-up', 1),
  ('/images/maquillage-smoky.webp',  'Maquillage smoky eyes et lèvres rosées', 'Make-up', 2),
  ('/images/sourcils.webp',          'Brow lift et sourcils restructurés', 'Lash & Brow', 3),
  ('/images/ongles-amande.webp',     'Construction en gel, forme amande, rose laiteux', 'Nails', 4),
  ('/images/editorial.webp',         'Maquillage éditorial, eyeliner graphique', 'Make-up', 5),
  ('/images/lash-lift.webp',         'Lash lift en cours de pose', 'Lash & Brow', 6),
  ('/images/ongles-carres.webp',     'Construction en gel, forme carrée, rose nude', 'Nails', 7)
) as v(image_url, alt, category, sort)
where not exists (select 1 from gallery_items);
