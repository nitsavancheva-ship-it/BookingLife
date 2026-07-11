-- Review hardening: non-admins may only change a booking's status.
-- The UPDATE policy alone would let a guest retarget their booking's
-- property_id (parking its date-lock on someone else's listing) or
-- rewrite total_price; pinning every other column closes both holes
-- while keeping the cancel flow (status-only change) working for
-- guests and property owners.
create or replace function public.protect_booking_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) and (
       new.property_id is distinct from old.property_id
    or new.guest_id is distinct from old.guest_id
    or new.check_in is distinct from old.check_in
    or new.check_out is distinct from old.check_out
    or new.total_price is distinct from old.total_price
  ) then
    raise exception 'only the booking status may be changed';
  end if;
  return new;
end;
$$;

create trigger bookings_protect_columns
  before update on public.bookings
  for each row execute procedure public.protect_booking_columns();
