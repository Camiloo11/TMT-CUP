-- ════════════════════════════════════════════════════════════════════
-- AJUSTES FINALES 18/JUL — TMT CUP
-- ════════════════════════════════════════════════════════════════════
-- Idempotente (puedes correrlo varias veces). Hace, en orden:
--   1) NÓMINA COMPLETA: los 123 jugadores del Excel de registro.
--      Corrige nombres/cédulas que quedaron mal y agrega TODOS los que
--      falten (Andrés Camilo Lucero, Santiago Baez, etc.). No borra a nadie.
--   2) Mueve TODOS los partidos al 18/07/2026 conservando su misma hora.
--   3) Asignaciones correctas: cancha 4 = Stefania Álzate (supervisora)
--      con Camila Chaparro (árbitra) para TODA la liga femenina.
--   4) Elimina las cuentas extra del staff (2 supervisores y 2 admins).

-- ── 0) Blindaje ──────────────────────────────────────────────────────
alter table players add column if not exists document text;

-- ── 1a) Correcciones de nombres/cédulas mal importados ───────────────
update players p set name = 'Federico Garcia-Herreros'
  from teams t where p.team_id = t.id and t.name = 'Congo'
  and p.name in ('Federico Garcia', 'Federico Garcia-');
update players p set name = 'Stevan Felix'
  from teams t where p.team_id = t.id and t.name = 'Colombia'
  and p.name like 'Stevan Felix%';
update players p set name = 'Juan Vélez'
  from teams t where p.team_id = t.id and t.name = 'Colombia'
  and p.name like 'Juan Vélez%';
update players p set name = 'Ángel'
  from teams t where p.team_id = t.id and t.name = 'Colombia'
  and p.name like 'Ángel%';
update players p set name = 'David Andrés Sotelo Peña', document = '1013013645'
  from teams t where p.team_id = t.id and t.name = 'Portugal' and t.category = 'MASCULINO'
  and p.name like 'David Andrés Sotelo Peña%';
update players p set document = '1019148137'
  from teams t where p.team_id = t.id and t.name = 'Portugal' and t.category = 'FEMENINO'
  and p.name = 'Laura Martínez';
update players p set name = 'Jorge Diego Ávila Velandia', document = '79739075'
  from teams t where p.team_id = t.id and t.name = 'Brasil'
  and p.name like 'Jorge Diego Ávila Velandia%';

-- Nombres truncados por el CSV original (Portugal femenino):
update players p set name = 'Sara Daniela Suárez Pinzón'
  from teams t where p.team_id = t.id and t.name = 'Portugal' and t.category = 'FEMENINO'
  and p.name = 'Sara Daniela Suárez Pinz';
update players p set name = 'María Alejandra Villabon Pinzon'
  from teams t where p.team_id = t.id and t.name = 'Portugal' and t.category = 'FEMENINO'
  and p.name = 'María Alejandra Villabon P';
update players p set name = 'Laura Camila Raigoso Amortegui'
  from teams t where p.team_id = t.id and t.name = 'Portugal' and t.category = 'FEMENINO'
  and p.name = 'Laura Camila Raigoso Am';
update players p set name = 'Daira Isabella Morales Bernal'
  from teams t where p.team_id = t.id and t.name = 'Portugal' and t.category = 'FEMENINO'
  and p.name = 'Daira Isabella Morales Ber';

-- Red de seguridad: si algún duplicado exacto quedó de una corrida
-- anterior, se elimina conservando el registro más antiguo (solo si el
-- duplicado no tiene eventos registrados).
delete from players p
using players q
where p.team_id = q.team_id
  and lower(p.name) = lower(q.name)
  and p.id > q.id
  and not exists (select 1 from match_events e where e.player_id = p.id);

-- ── 1b) NÓMINA COMPLETA del Excel (inserta SOLO los que falten) ──────
-- Un jugador se considera ya existente si su equipo tiene a alguien con
-- el mismo nombre (sin mayúsculas) o la misma cédula.
insert into players (name, document, team_id)
select v.name, v.document, t.id
from (values
  ('Martin Rosero', '1014994369', 'Argentina', 'MASCULINO'),
  ('Daniel Mogollón', '1033104036', 'Argentina', 'MASCULINO'),
  ('Tomás Castro', '1025462263', 'Argentina', 'MASCULINO'),
  ('Josué Pinzón', '1014868342', 'Argentina', 'MASCULINO'),
  ('Andrés Marin', '1014865950', 'Argentina', 'MASCULINO'),
  ('Carlos Eduardo Velandia', '1023303921', 'Argentina', 'MASCULINO'),
  ('Jeronimo Ladino', '1013266362', 'Argentina', 'MASCULINO'),
  ('Martin Castro', '1013268257', 'Argentina', 'MASCULINO'),
  ('Daniel Rubiano', '1147485653', 'Noruega', 'MASCULINO'),
  ('Matias Zuniga', '1141518372', 'Noruega', 'MASCULINO'),
  ('Jose Liviston Moreno', '077632520', 'Noruega', 'MASCULINO'),
  ('Rubén Dario Rivera Chávez', '1000719354', 'Noruega', 'MASCULINO'),
  ('Samuel Vargas Pico', '1019764967', 'Noruega', 'MASCULINO'),
  ('Mateo Cañon Garzon', '1014991740', 'Noruega', 'MASCULINO'),
  ('William Ramirez', null, 'Noruega', 'MASCULINO'),
  ('Daniel Rodriguez', null, 'Noruega', 'MASCULINO'),
  ('Emmanuel Gaviria', '1016953393', 'Francia', 'MASCULINO'),
  ('Jacobo Antolinez', '1014867960', 'Francia', 'MASCULINO'),
  ('Juanjose Ospina', '1188213876', 'Francia', 'MASCULINO'),
  ('Juan José Davila', '1033107586', 'Francia', 'MASCULINO'),
  ('Javier Hernández', null, 'Francia', 'MASCULINO'),
  ('Santiago Moreno', '1014736430', 'Francia', 'MASCULINO'),
  ('Juan José Ramos', '1044625674', 'Francia', 'MASCULINO'),
  ('Andres Meriño', '1108254068', 'España', 'MASCULINO'),
  ('Jhonathan David Anave Rojas', '1016105829', 'España', 'MASCULINO'),
  ('Samuel García Rojas', '1141518737', 'España', 'MASCULINO'),
  ('Freddy Andres Joya', '1015423159', 'España', 'MASCULINO'),
  ('Cristian Felipe Joya', '1015457293', 'España', 'MASCULINO'),
  ('Jorge Andrés Gutiérrez', '1000940199', 'España', 'MASCULINO'),
  ('David Padilla', '1023083650', 'España', 'MASCULINO'),
  ('Adrián Joya', '1015481992', 'España', 'MASCULINO'),
  ('Darwin', '1000256251', 'Cabo Verde', 'MASCULINO'),
  ('Kevin', '1000219120', 'Cabo Verde', 'MASCULINO'),
  ('Lucho', '1014225188', 'Cabo Verde', 'MASCULINO'),
  ('Mateo G', '1001200648', 'Cabo Verde', 'MASCULINO'),
  ('Edson', '1090445395', 'Cabo Verde', 'MASCULINO'),
  ('Mateo C', '1031640880', 'Cabo Verde', 'MASCULINO'),
  ('Miguel', '1013100884', 'Cabo Verde', 'MASCULINO'),
  ('Sebastián', '1000708376', 'Cabo Verde', 'MASCULINO'),
  ('Daniel Galvis', '1082852390', 'Inglaterra', 'MASCULINO'),
  ('Samuel Rodríguez Mayorga', '1013036255', 'Inglaterra', 'MASCULINO'),
  ('David Pulido', '1022433889', 'Inglaterra', 'MASCULINO'),
  ('Luis Alejandro Cruz', '1001204075', 'Inglaterra', 'MASCULINO'),
  ('Martín Restrepo', '1013010829', 'Inglaterra', 'MASCULINO'),
  ('Antonio Becerra', '1000242210', 'Inglaterra', 'MASCULINO'),
  ('Andres Felipe Venegas', '1022433787', 'Inglaterra', 'MASCULINO'),
  ('Duvan Felipe Hernández Lamprea', '1000384406', 'Inglaterra', 'MASCULINO'),
  ('Federico Garcia-Herreros', null, 'Congo', 'MASCULINO'),
  ('Dario Llanos', null, 'Congo', 'MASCULINO'),
  ('Tomas Pachon', null, 'Congo', 'MASCULINO'),
  ('Juan David Gomez', null, 'Congo', 'MASCULINO'),
  ('Emanuel Montes', null, 'Congo', 'MASCULINO'),
  ('David Alvares', null, 'Congo', 'MASCULINO'),
  ('Mateo Monroy', null, 'Congo', 'MASCULINO'),
  ('Santiago Castro', null, 'Congo', 'MASCULINO'),
  ('Santiago Chaves', null, 'Colombia', 'MASCULINO'),
  ('Cesar Ávila', null, 'Colombia', 'MASCULINO'),
  ('David Hoyos', null, 'Colombia', 'MASCULINO'),
  ('Stevan Felix', '1013610947', 'Colombia', 'MASCULINO'),
  ('Juan Vélez', '1147485182', 'Colombia', 'MASCULINO'),
  ('Ángel', '1193589859', 'Colombia', 'MASCULINO'),
  ('Santiago Moya Ávila', '1001297849', 'Brasil', 'MASCULINO'),
  ('Juan David Ávila', '1016712165', 'Brasil', 'MASCULINO'),
  ('Nicolás Ávila Heredia', '1011104214', 'Brasil', 'MASCULINO'),
  ('Jorge Andrés Moya Ávila', '1018490838', 'Brasil', 'MASCULINO'),
  ('Omar Andrés Rodríguez', '1034576557', 'Brasil', 'MASCULINO'),
  ('Miguel Ángel Gómez Carrillo', '1000241497', 'Brasil', 'MASCULINO'),
  ('Miguel Ángel Ballen Díaz', '1028868851', 'Brasil', 'MASCULINO'),
  ('Jorge Diego Ávila Velandia', '79739075', 'Brasil', 'MASCULINO'),
  ('Dylan Benavides Bermúdez', '1000035815', 'Brasil', 'MASCULINO'),
  ('Luis Francisco Gómez García', '1019903635', 'Portugal', 'MASCULINO'),
  ('Emilio Sicard Rebellón', '1141515284', 'Portugal', 'MASCULINO'),
  ('Juan Camilo Toro Gutiérrez', '1109550501', 'Portugal', 'MASCULINO'),
  ('Andrés Santiago Sánchez', '1025548584', 'Portugal', 'MASCULINO'),
  ('Samuel Medina', '1027288576', 'Portugal', 'MASCULINO'),
  ('Santiago Triana López', '1023391290', 'Portugal', 'MASCULINO'),
  ('Federico Sandoval Venegas', '1014875875', 'Portugal', 'MASCULINO'),
  ('David Andrés Sotelo Peña', '1013013645', 'Portugal', 'MASCULINO'),
  ('Santiago Baez', '1097499521', 'Portugal', 'MASCULINO'),
  ('Santiago Velasco Rojas', '1141515282', 'Alemania', 'MASCULINO'),
  ('Andrés Felipe Zuluaga Rojas', '1020111313', 'Alemania', 'MASCULINO'),
  ('Samuel Velasco Rojas', '1025066514', 'Alemania', 'MASCULINO'),
  ('Samuel Ernesto Garrido', '1145924525', 'Alemania', 'MASCULINO'),
  ('Juan David Ruiz Terreros', '1000288655', 'Alemania', 'MASCULINO'),
  ('Mateo Alarcón Peña', '1000973622', 'Alemania', 'MASCULINO'),
  ('Andrés Camilo Lucero Salazar', '110964016', 'Alemania', 'MASCULINO'),
  ('Juan José Ruiz Garzón', null, 'Alemania', 'MASCULINO'),
  ('Daniel Felipe Bernal Rodríguez', '1014877983', 'Italia', 'MASCULINO'),
  ('Ricardo Alarcón Molina', '1014242956', 'Italia', 'MASCULINO'),
  ('David Santiago Uribe Cardenas', '1027531661', 'Italia', 'MASCULINO'),
  ('David Cohen De los Reyes', '1014879310', 'Italia', 'MASCULINO'),
  ('Juan Cohen De los Reyes', '1014879311', 'Italia', 'MASCULINO'),
  ('Samuel Castellanos Carrero', '1013014428', 'Italia', 'MASCULINO'),
  ('Cristian Moisés Díaz Díaz', '1021635786', 'Italia', 'MASCULINO'),
  ('Juan David Peláez Basto', '1000730206', 'Italia', 'MASCULINO'),
  ('Zulamy Sarmiento', null, 'España', 'FEMENINO'),
  ('Gabriela Agudelo', null, 'España', 'FEMENINO'),
  ('Sofia Herrera', null, 'España', 'FEMENINO'),
  ('Juliana Prieto', null, 'España', 'FEMENINO'),
  ('Ana', null, 'España', 'FEMENINO'),
  ('Valentina Varon', null, 'España', 'FEMENINO'),
  ('Ana León', '1013037016', 'Francia', 'FEMENINO'),
  ('Karol Rueda', '1007662404', 'Francia', 'FEMENINO'),
  ('Maria Fernanda Carrillo', '1014666789', 'Francia', 'FEMENINO'),
  ('Gabriela Diaz', '1021396834', 'Francia', 'FEMENINO'),
  ('Manuela Franco', '1032877408', 'Francia', 'FEMENINO'),
  ('María Paula Garzón', '1027283273', 'Francia', 'FEMENINO'),
  ('Salomé Paipa', '1034402872', 'Cabo Verde', 'FEMENINO'),
  ('Naarai Juliana Rozo', '1034402008', 'Cabo Verde', 'FEMENINO'),
  ('Sofía Hernández Díaz', '1084057550', 'Cabo Verde', 'FEMENINO'),
  ('Juliana Osorio Moreno', '1014871576', 'Cabo Verde', 'FEMENINO'),
  ('Emilia Zúñiga Carvajal', '1028441219', 'Cabo Verde', 'FEMENINO'),
  ('Paloma Díaz Robles', '1014866322', 'Cabo Verde', 'FEMENINO'),
  ('Jennifer Chavarro', '1019604071', 'Cabo Verde', 'FEMENINO'),
  ('Silvana González', '1014862096', 'Cabo Verde', 'FEMENINO'),
  ('Sara Daniela Suárez Pinzón', '1000707752', 'Portugal', 'FEMENINO'),
  ('Katherine Ruiz García', '1072711690', 'Portugal', 'FEMENINO'),
  ('María Alejandra Villabon Pinzon', '1001317167', 'Portugal', 'FEMENINO'),
  ('Ana Lizeth Ardila Ramos', '1074136917', 'Portugal', 'FEMENINO'),
  ('Laura Camila Raigoso Amortegui', '1020843105', 'Portugal', 'FEMENINO'),
  ('Maríajosé Ángel Granados', '107762154', 'Portugal', 'FEMENINO'),
  ('Daira Isabella Morales Bernal', '1013264025', 'Portugal', 'FEMENINO'),
  ('Laura Martínez', '1019148137', 'Portugal', 'FEMENINO')
) as v(name, document, team, category)
join teams t on t.name = v.team and t.category = v.category::category
where not exists (
  select 1 from players p
  where p.team_id = t.id
    and (
      lower(p.name) = lower(v.name)
      or (v.document is not null and p.document = v.document)
    )
);

-- ── 2) TODOS los partidos al 18/07/2026, conservando su hora ─────────
update matches
set scheduled_at =
  (date '2026-07-18' + (scheduled_at at time zone 'America/Bogota')::time)
  at time zone 'America/Bogota';

-- ── 3) Asignaciones del 18/07 (Stefania Álzate + Camila Chaparro en
--      cancha 4: TODA la liga femenina, incluidas semis y final fem.) ──
delete from pitch_assignments;
insert into pitch_assignments (day, field_number, supervisor_name, referee_name) values
  ('2026-07-18', 1, 'Ana Benavides',    'Samuel Valenzuela'),
  ('2026-07-18', 2, 'Sara Nieto',       'Kevin Aguilar'),
  ('2026-07-18', 3, 'Camila Reinoso',   'Samuel Garzón'),
  ('2026-07-18', 4, 'Stefania Álzate',  'Camila Chaparro'),
  ('2026-07-18', 5, 'Camila Reinoso',   'Samuel Garzón');

-- ── 4) Eliminar cuentas extra del staff (profiles cae en cascada) ────
delete from auth.users
where lower(email) in (
  'sara.rojas@tmtcup.com',
  'samuel.sanchez@tmtcup.com',
  'jimena.cely@tmtcup.com',
  'dayanna@tmtcup.com'
);

-- ── Verificaciones ───────────────────────────────────────────────────
select t.category, t.name as equipo, count(p.id) as jugadores
from teams t left join players p on p.team_id = t.id
group by t.category, t.name order by t.category, t.name;

select field_number as cancha, supervisor_name, referee_name
from pitch_assignments order by field_number;

select to_char(min(scheduled_at) at time zone 'America/Bogota', 'YYYY-MM-DD HH12:MI AM') as primer_partido,
       to_char(max(scheduled_at) at time zone 'America/Bogota', 'YYYY-MM-DD HH12:MI AM') as ultimo_partido
from matches;

select p.name, p.role, u.email
from profiles p join auth.users u on u.id = p.id
order by p.role, p.name;
