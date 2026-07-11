-- Review hardening: two gaps in the original reviews policies.
-- 1. INSERT allowed a guest with any completed booking to attach the
--    review to an arbitrary property; the booking must belong to the
--    reviewed property.
-- 2. UPDATE reused the ownership check alone, letting an author re-point
--    booking_id/property_id after the fact (and squat other guests'
--    unique booking slots); pin the linkage columns for non-admins.
drop policy "guests can review their completed bookings" on public.reviews;

create policy "guests can review their completed bookings"
  on public.reviews for insert
  with check (
    auth.uid() = guest_id
    and exists (
      select 1 from public.bookings
      where bookings.id = reviews.booking_id
        and bookings.property_id = reviews.property_id
        and bookings.guest_id = auth.uid()
        and bookings.status = 'confirmed'
        and bookings.check_out < current_date
    )
  );

create or replace function public.protect_review_columns()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin(auth.uid()) and (
       new.property_id is distinct from old.property_id
    or new.guest_id is distinct from old.guest_id
    or new.booking_id is distinct from old.booking_id
  ) then
    raise exception 'only the rating and comment may be changed';
  end if;
  return new;
end;
$$;

create trigger reviews_protect_columns
  before update on public.reviews
  for each row execute procedure public.protect_review_columns();
