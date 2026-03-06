-- Fix get_project_preview to use LEFT JOIN so it doesn't return null if owner profile is missing
CREATE OR REPLACE FUNCTION get_project_preview(p_id UUID)
RETURNS JSON 
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'id', p.id,
    'name', p.name,
    'description', p.description,
    'ownerName', COALESCE(pr.full_name, '项目创建者'),
    'createdAt', to_char(p.created_at, 'YYYY/MM/DD')
  ) INTO result
  FROM projects p
  LEFT JOIN profiles pr ON p.owner_id = pr.id
  WHERE p.id = p_id;
  
  RETURN result;
END;
$$;
