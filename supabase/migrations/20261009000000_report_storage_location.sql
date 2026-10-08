-- Every analyzed statement gets a row that records where it is kept, so a
-- report is looked up where it was saved, not where the current setting points.
-- Cloud rows also hold the encrypted report, summary and chat; device rows
-- hold only the location (the report itself never leaves the browser).

alter table public.statement_reports
  add column if not exists storage text not null default 'cloud'
    check (storage in ('local', 'cloud'));

-- Existing rows are all cloud reports (backfilled above); new rows must say.
alter table public.statement_reports alter column storage drop default;

alter table public.statement_reports
  alter column summary drop not null,
  alter column report drop not null,
  alter column messages drop not null;

alter table public.statement_reports
  add constraint statement_reports_data_matches_storage check (
    (storage = 'cloud' and summary is not null and report is not null and messages is not null)
    or (storage = 'local' and summary is null and report is null and messages is null)
  );
