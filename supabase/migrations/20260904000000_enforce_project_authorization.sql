CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects
    WHERE id = p_project_id
      AND owner_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1
    FROM public.project_members
    WHERE project_id = p_project_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.storage_object_project_id(p_name text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  project_id_text text := split_part(p_name, '/', 1);
BEGIN
  IF project_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RETURN project_id_text::uuid;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.is_project_member(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.storage_object_project_id(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_project_member(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.storage_object_project_id(text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.reserve_bates_numbers(uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reserve_bates_numbers(uuid, int) TO service_role;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read access to user_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow users to update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow public read access to project_members" ON public.project_members;
DROP POLICY IF EXISTS "Allow public read access to document_comments" ON public.document_comments;
DROP POLICY IF EXISTS "Allow public read access to tasks" ON public.tasks;
DROP POLICY IF EXISTS "Allow public read access to activity_log" ON public.activity_log;
DROP POLICY IF EXISTS "Users can view job_queue for accessible projects" ON public.job_queue;
DROP POLICY IF EXISTS "project_members_can_select_projects" ON public.projects;
DROP POLICY IF EXISTS "project_members_can_select_documents" ON public.documents;
DROP POLICY IF EXISTS "project_members_can_select_jobs" ON public.job_queue;
DROP POLICY IF EXISTS "project_members_can_select_reports" ON public.document_reports;
DROP POLICY IF EXISTS "project_members_can_select_members" ON public.project_members;
DROP POLICY IF EXISTS "project_members_can_select_comments" ON public.document_comments;
DROP POLICY IF EXISTS "project_members_can_insert_comments" ON public.document_comments;
DROP POLICY IF EXISTS "project_members_can_select_tasks" ON public.tasks;
DROP POLICY IF EXISTS "project_members_can_select_activity" ON public.activity_log;
DROP POLICY IF EXISTS "users_can_select_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.user_profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.user_profiles;

CREATE POLICY "users_can_select_own_profile"
  ON public.user_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "users_can_insert_own_profile"
  ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "users_can_update_own_profile"
  ON public.user_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "project_members_can_select_projects"
  ON public.projects FOR SELECT TO authenticated
  USING (public.is_project_member(id));

CREATE POLICY "project_members_can_select_documents"
  ON public.documents FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY "project_members_can_select_jobs"
  ON public.job_queue FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY "project_members_can_select_reports"
  ON public.document_reports FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY "project_members_can_select_members"
  ON public.project_members FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY "project_members_can_select_comments"
  ON public.document_comments FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = document_comments.document_id
        AND public.is_project_member(documents.project_id)
    )
  );

CREATE POLICY "project_members_can_insert_comments"
  ON public.document_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.documents
      WHERE documents.id = document_comments.document_id
        AND public.is_project_member(documents.project_id)
    )
  );

CREATE POLICY "project_members_can_select_tasks"
  ON public.tasks FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY "project_members_can_select_activity"
  ON public.activity_log FOR SELECT TO authenticated
  USING (project_id IS NOT NULL AND public.is_project_member(project_id));

DROP POLICY IF EXISTS "project_members_can_read_discovery_files" ON storage.objects;
DROP POLICY IF EXISTS "project_members_can_insert_discovery_files" ON storage.objects;
DROP POLICY IF EXISTS "project_members_can_update_discovery_files" ON storage.objects;
DROP POLICY IF EXISTS "project_members_can_delete_discovery_files" ON storage.objects;

CREATE POLICY "project_members_can_read_discovery_files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'discovery-files'
    AND public.is_project_member(public.storage_object_project_id(name))
  );

CREATE POLICY "project_members_can_insert_discovery_files"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'discovery-files'
    AND public.is_project_member(public.storage_object_project_id(name))
  );

CREATE POLICY "project_members_can_update_discovery_files"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'discovery-files'
    AND public.is_project_member(public.storage_object_project_id(name))
  )
  WITH CHECK (
    bucket_id = 'discovery-files'
    AND public.is_project_member(public.storage_object_project_id(name))
  );

CREATE POLICY "project_members_can_delete_discovery_files"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'discovery-files'
    AND public.is_project_member(public.storage_object_project_id(name))
  );
