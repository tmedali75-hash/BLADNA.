# BLADNA.

This project now includes a lightweight backend and database layer that preserves the current tourism website identity while adding a secure admin dashboard.

## Stack

- Node.js + Express for the server and admin APIs
- SQLite database for persistent storage of reservations and customer requests
- bcryptjs for password hashing
- Express sessions for authenticated admin access

## Local setup

1. Install dependencies:
   npm install
2. Start the app:
   npm start
3. Open the website:
   http://localhost:3000
4. Open the admin login page:
   http://localhost:3000/admin/login

## Default admin account

- Username: admin
- Email: admin@bladna.tn
- Password: admin123

Change these values in the environment before deployment.

## Environment variables

You can override the default admin account with:

- ADMIN_USERNAME
- ADMIN_EMAIL
- ADMIN_PASSWORD
- SESSION_SECRET

## Important notes

- The public website remains intact and tourism-focused.
- Reservation and inquiry forms save to the database.
- The admin dashboard reads live data from SQLite.
- Admin routes are protected behind session-based authentication.
- Passwords are never stored in plain text.

## Deploying to production

Use environment variables and a secure session secret before exposing the app publicly.

## Features included

- Secure admin login with username/email and password
- Dashboard with live reservation statistics
- Reservation management: view, update status, delete, search/filter on the client
- Customer request management: view, mark as Read/Unread/Replied, delete
- Persistent storage for all submissions
- Responsive modern UI consistent with the BLADNA brand

## License

This repository currently has no license file.


