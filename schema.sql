-- Supabase SQL Editor Script: RBAC Roles and Faculty Assignment Constraints

-- 1. Create Mapping Tables
CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('admin', 'faculty'))
);

CREATE TABLE IF NOT EXISTS public.faculty_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    section TEXT NOT NULL,
    UNIQUE(user_id, section)
);

-- Note: Ensure main marks table exists
CREATE TABLE IF NOT EXISTS public.marks (
    roll_no TEXT PRIMARY KEY,
    section TEXT NOT NULL,
    mark TEXT NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- 2. Drop existing permissive policies if they exist (clean slate)
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.marks;
DROP POLICY IF EXISTS "Enable modification for authenticated users" ON public.marks;

-- ENABLE RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;

-- 3. RBAC Policies for `user_roles` and `faculty_sections`
-- Users can check their own roles and section mappings globally
CREATE POLICY "Users can read their own role"
ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can read their assigned sections"
ON public.faculty_sections FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Admins can read entire tables universally
CREATE POLICY "Admins have total read over roles"
ON public.user_roles FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins have total read over sections"
ON public.faculty_sections FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'));

-- 4. RBAC Strict Policies for core `marks` table
-- READ POLICY: Admins read all, faculty read assigned
CREATE POLICY "Strict Read Access" 
ON public.marks FOR SELECT TO authenticated 
USING (
   EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
   OR
   EXISTS (SELECT 1 FROM public.faculty_sections WHERE user_id = auth.uid() AND section = marks.section)
);

-- MODIFY POLICY: Admins upsert all, faculty upsert assigned
CREATE POLICY "Strict Modification Access" 
ON public.marks FOR ALL TO authenticated 
USING (
   EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
   OR
   EXISTS (SELECT 1 FROM public.faculty_sections WHERE user_id = auth.uid() AND section = marks.section)
)
WITH CHECK (
   EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
   OR
   EXISTS (SELECT 1 FROM public.faculty_sections WHERE user_id = auth.uid() AND section = marks.section)
);

-- 5. Automated Admin Elevating Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  -- Admin Override & D Section
  IF NEW.email = 'jp_vedaj@cb.amrita.edu' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
    INSERT INTO public.faculty_sections (user_id, section) VALUES (NEW.id, 'D');
    
  -- Faculty Core Routing
  ELSIF NEW.email = 'p_malathy@cb.amrita.edu' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'faculty');
    INSERT INTO public.faculty_sections (user_id, section) VALUES (NEW.id, 'A');
    
  ELSIF NEW.email = 'g_krishnapriya@cb.amrita.edu' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'faculty');
    INSERT INTO public.faculty_sections (user_id, section) VALUES (NEW.id, 'B');
    INSERT INTO public.faculty_sections (user_id, section) VALUES (NEW.id, 'F');
    
  ELSIF NEW.email = 'r_anisha@cb.amrita.edu' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'faculty');
    INSERT INTO public.faculty_sections (user_id, section) VALUES (NEW.id, 'C');
    INSERT INTO public.faculty_sections (user_id, section) VALUES (NEW.id, 'H');
    
  ELSIF NEW.email = 'm_suchithra@cb.amrita.edu' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'faculty');
    INSERT INTO public.faculty_sections (user_id, section) VALUES (NEW.id, 'E');
    
  ELSIF NEW.email = 't_senthilkumar@cb.amrita.edu' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'faculty');
    INSERT INTO public.faculty_sections (user_id, section) VALUES (NEW.id, 'G');
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
