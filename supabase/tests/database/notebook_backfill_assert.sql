do $$
declare
  migrated_document jsonb;
begin
  select document
  into migrated_document
  from public.subject_notes
  where id = 'legacy-note'
    and user_id = '00000000-0000-0000-0000-0000000000c3';

  if migrated_document is null
    or migrated_document ->> 'version' <> '1'
    or migrated_document #>> '{blocks,0,type}' <> 'paragraph'
    or migrated_document #>> '{blocks,0,content,0,text}' <> 'Legacy plain text'
  then
    raise exception 'legacy subject_notes.content was not backfilled into a valid NoteDocumentV1';
  end if;
end
$$;
