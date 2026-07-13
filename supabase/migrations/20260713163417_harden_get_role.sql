-- get_role() was added with the three-role model but without the EXECUTE
-- hardening its siblings is_admin/is_active_user received: PostgREST
-- auto-exposes public-schema functions as /rest/v1/rpc/* endpoints, and a
-- SECURITY DEFINER role lookup callable by anon lets signed-out visitors
-- probe any user id's role (owner ids are public via properties/reviews).
-- Authenticated keeps EXECUTE because the properties/bookings INSERT
-- policies evaluate get_role with the caller's privileges.
revoke execute on function public.get_role(uuid) from public, anon;
grant execute on function public.get_role(uuid) to authenticated, service_role;
