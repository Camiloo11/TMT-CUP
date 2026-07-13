-- TMT-CUP: penales para fase eliminatoria (desempate en cuartos/semis/final)
alter table matches add column if not exists penalty_a integer;
alter table matches add column if not exists penalty_b integer;
