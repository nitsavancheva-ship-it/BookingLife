import { getCurrentUser, getCurrentRole, logout } from '../auth.js';

export async function renderNavbar() {
  const mount = document.getElementById('navbar');
  if (!mount) return;

  const user = await getCurrentUser();
  const role = user ? await getCurrentRole() : null;

  const loggedOutLinks = `
    <a class="nav-link" href="/login.html">Login</a>
    <a class="nav-link" href="/register.html">Register</a>
  `;

  const roleLinks = {
    user: `
      <a class="nav-link" href="/index.html">Browse</a>
      <a class="nav-link" href="/my-bookings.html">My Bookings</a>
    `,
    host: `
      <a class="nav-link" href="/my-properties.html">My Properties</a>
    `,
    admin: `
      <a class="nav-link" href="/admin.html">Admin</a>
    `,
  };

  const loggedInLinks = `
    ${roleLinks[role] || roleLinks.user}
    <a class="nav-link" href="/profile.html">Profile</a>
    <a class="nav-link" href="#" id="logout-link">Logout</a>
  `;

  mount.innerHTML = `
    <nav class="navbar navbar-expand-lg navbar-light bl-nav">
      <div class="container">
        <a class="navbar-brand" href="/index.html"><i class="bi bi-house-heart-fill"></i> BookingLife</a>
        <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
          <span class="navbar-toggler-icon"></span>
        </button>
        <div class="collapse navbar-collapse" id="navbarNav">
          <div class="navbar-nav ms-auto">
            ${user ? loggedInLinks : loggedOutLinks}
          </div>
        </div>
      </div>
    </nav>
  `;

  const logoutLink = document.getElementById('logout-link');
  if (logoutLink) {
    logoutLink.addEventListener('click', (e) => {
      e.preventDefault();
      logout();
    });
  }
}
