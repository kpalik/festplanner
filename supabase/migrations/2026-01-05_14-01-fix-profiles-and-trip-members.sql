-- 1. Ulepszamy funkcję tworzenia profilu (dodajemy odporność na duplikaty)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    new.id, 
    new.email, 
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING; -- Jeśli profil już jest, nie rób błędu
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- 2. Resetujemy trigger, żeby mieć pewność, że działa dla nowych rejestracji
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
-- 3. NAPRAWA DANYCH: Uzupełnij brakujące profile dla userów, którzy już są w systemie
-- (To naprawi sytuację tej nowej osoby, która "wisi" bez profilu)
INSERT INTO public.profiles (id, email)
SELECT id, email FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);
-- 4. AKTUALIZACJA ZAPROSZEŃ: Przypisz ID userów do zaproszeń po emailu
-- Teraz to zadziała, bo w punkcie 3 upewniliśmy się, że każdy user ma profil
UPDATE public.trip_members tm
SET user_id = au.id
FROM auth.users au
WHERE tm.invitation_email = au.email
AND tm.user_id IS NULL;