-- ============================================================
-- Jugadores del torneo (CSV oficial) → tabla players
-- Relaciona cada jugador con su equipo por nombre + categoría.
-- Idempotente: no duplica si ya existe (mismo nombre + equipo).
-- ============================================================

-- Corrección: el 4º equipo femenino es España, no Colombia (error del
-- seed original). Los partidos femeninos referencian al equipo por ID,
-- así que al renombrarlo el fixture femenino queda coherente solo.
update teams set name = 'España'
where category = 'FEMENINO' and name = 'Colombia';

-- Documento (cédula) del jugador, opcional
alter table players add column if not exists document text;

insert into players (name, document, team_id)
select v.name, nullif(v.document,''), t.id
from (values
  ('Martin Rosero', '1014994369', 'Argentina', 'MASCULINO'),
  ('Daniel mogollón', '1033104036', 'Argentina', 'MASCULINO'),
  ('Tomás Castro', '1025462263', 'Argentina', 'MASCULINO'),
  ('Josué pinzón', '1014868342', 'Argentina', 'MASCULINO'),
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
  ('William Ramirez', '', 'Noruega', 'MASCULINO'),
  ('Daniel Rodriguez', '', 'Noruega', 'MASCULINO'),
  ('Emmanuel Gaviria', '1016953393', 'Francia', 'MASCULINO'),
  ('Jacobo Antolinez', '1014867960', 'Francia', 'MASCULINO'),
  ('Juanjose Ospina', '1188213876', 'Francia', 'MASCULINO'),
  ('Juan José davila', '1033107586', 'Francia', 'MASCULINO'),
  ('Javier Hernández', '', 'Francia', 'MASCULINO'),
  ('Santiago moreno', '1014736430', 'Francia', 'MASCULINO'),
  ('Juan José ramos', '1044625674', 'Francia', 'MASCULINO'),
  ('Andres Meriño', '1108254068', 'España', 'MASCULINO'),
  ('Jhonathan David Anave Rojas', 'CC 101610', 'España', 'MASCULINO'),
  ('Samuel García Rojas', '1141518737', 'España', 'MASCULINO'),
  ('Freddy andres joya', '1015423159', 'España', 'MASCULINO'),
  ('Cristian Felipe Joya', '1015457293', 'España', 'MASCULINO'),
  ('Jorge Andrés Gutiérrez', '1000940199', 'España', 'MASCULINO'),
  ('David Padilla', '1023083650', 'España', 'MASCULINO'),
  ('Adrián joya', '1015481992', 'España', 'MASCULINO'),
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
  ('Duvan Felipe Hernández Lamprea', 'CC 1000384406', 'Inglaterra', 'MASCULINO'),
  ('Federico Garcia-Herreros', '', 'Congo', 'MASCULINO'),
  ('Dario Llanos', '', 'Congo', 'MASCULINO'),
  ('Tomas Pachon', '', 'Congo', 'MASCULINO'),
  ('Juan David Gomez', '', 'Congo', 'MASCULINO'),
  ('Emanuel Montes', '', 'Congo', 'MASCULINO'),
  ('David Alvares', '', 'Congo', 'MASCULINO'),
  ('Mateo Monroy', '', 'Congo', 'MASCULINO'),
  ('Santiago Castro', '', 'Congo', 'MASCULINO'),
  ('Simón Paipa', '1034397944', 'Congo', 'MASCULINO'),
  ('Santiago Chaves', '', 'Colombia', 'MASCULINO'),
  ('Cesar Ávila', '', 'Colombia', 'MASCULINO'),
  ('David Hoyos', '', 'Colombia', 'MASCULINO'),
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
  ('Zulamy Sarmiento', '', 'España', 'FEMENINO'),
  ('Gabriela Agudelo', '', 'España', 'FEMENINO'),
  ('Sofia Herrera', '', 'España', 'FEMENINO'),
  ('Juliana Prieto', '', 'España', 'FEMENINO'),
  ('Ana', '', 'España', 'FEMENINO'),
  ('Valentina Varon', '', 'España', 'FEMENINO'),
  ('Ana León', '1013037016', 'Francia', 'FEMENINO'),
  ('Karol Rueda', '1007662404', 'Francia', 'FEMENINO'),
  ('Maria Fernanda Carrillo', '1014666789', 'Francia', 'FEMENINO'),
  ('Gabriela Diaz', '1021396834', 'Francia', 'FEMENINO'),
  ('Manuela Franco', '1032877408', 'Francia', 'FEMENINO'),
  ('María Paula Garzón', '1027283273', 'Francia', 'FEMENINO'),
  ('Sara Daniela Suárez Pinz', '', 'Portugal', 'FEMENINO'),
  ('Katherine Ruiz García', '', 'Portugal', 'FEMENINO'),
  ('María Alejandra Villabon P', '', 'Portugal', 'FEMENINO'),
  ('Ana Lizeth Ardila Ramos', '', 'Portugal', 'FEMENINO'),
  ('Laura Camila Raigoso Am', '', 'Portugal', 'FEMENINO'),
  ('Maríajosé Ángel Granados', '', 'Portugal', 'FEMENINO'),
  ('Daira Isabella Morales Ber', '', 'Portugal', 'FEMENINO'),
  ('Laura Martínez', '', 'Portugal', 'FEMENINO'),
  ('Salomé Paipa', '', 'Cabo Verde', 'FEMENINO'),
  ('Naarai Juliana Rozo', '', 'Cabo Verde', 'FEMENINO'),
  ('Sofía Hernández Díaz', '', 'Cabo Verde', 'FEMENINO'),
  ('Juliana Osorio Moreno', '', 'Cabo Verde', 'FEMENINO'),
  ('Emilia Zúñiga Carvajal', '', 'Cabo Verde', 'FEMENINO'),
  ('Paloma Díaz Robles', '', 'Cabo Verde', 'FEMENINO'),
  ('Jennifer Chavarro', '', 'Cabo Verde', 'FEMENINO'),
  ('Silvana González', '', 'Cabo Verde', 'FEMENINO')
) as v(name, document, team, category)
join teams t on t.name = v.team and t.category = v.category::category
where not exists (
  select 1 from players p where p.name = v.name and p.team_id = t.id
);

-- Verificación: jugadores por equipo
select t.category, t.name as equipo, count(p.id) as jugadores
from teams t left join players p on p.team_id = t.id
group by t.category, t.name order by t.category, t.name;
