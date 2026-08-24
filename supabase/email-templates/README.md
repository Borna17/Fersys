# FERSYS Auth email templates

## Confirm signup

**Subject:** `Potvrdi svoju FERSYS e-mail adresu`

Template: `confirm-signup.html`

U Supabase Dashboardu otvori:

`Authentication → Email Templates → Confirm signup`

Zatim:

1. Subject zamijeni s `Potvrdi svoju FERSYS e-mail adresu`.
2. Body zamijeni cijelim sadržajem `confirm-signup.html`.
3. Spremi promjene.
4. Napravi testnu registraciju s novom e-mail adresom i provjeri desktop + mobilni prikaz poruke.

Template koristi službeni Supabase placeholder `{{ .ConfirmationURL }}` za sigurnu poveznicu potvrde.
