-- Asistencia (check-in) y pago de la inscripción, por jugador.
--   attended    → si el jugador llegó al evento (check-in del día).
--   amount_paid → cuánto pagó de la inscripción, en COP (0 = sin pago).
--                 La inscripción completa vale 160.000; el saldo pendiente
--                 se calcula como 160000 - amount_paid.
alter table players add column if not exists attended    boolean not null default false;
alter table players add column if not exists amount_paid  integer not null default 0;
