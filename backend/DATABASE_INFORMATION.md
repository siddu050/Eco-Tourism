# Database Information

## Database File

- File name: `tourism.db`
- Database type: `SQLite`
- File path: `c:\Users\omkar\OneDrive\Desktop\Eco-Tourism\New folder\backend\tourism.db`
- Approximate file size: `81920 bytes`
- Connection string used by the backend: `sqlite:///.../backend/tourism.db`

This database is the main storage layer of the Eco-Tourism and Travel Management Platform. It stores user accounts, tourism destinations, bookings, favorites, and reviews.

## Database Summary

The backend connects to the database through SQLAlchemy in [database.py](/c:/Users/omkar/OneDrive/Desktop/Eco-Tourism/New%20folder/backend/database.py). The active database file is a local SQLite database named `tourism.db`.

Current record counts in the database:

- `users`: 3 records
- `locations`: 30 records
- `bookings`: 8 records
- `favorites`: 0 records
- `reviews`: 0 records

## Tables Used

### 1. Users Table

Purpose:
Stores registered user account details used for authentication and booking ownership.

Columns:

- `id` - Integer, Primary Key
- `username` - Varchar
- `email` - Varchar
- `hashed_password` - Varchar

### 2. Locations Table

Purpose:
Stores tourism destination details shown in the application.

Columns:

- `id` - Integer, Primary Key
- `name` - Varchar
- `description` - Text
- `image_url` - Varchar
- `price_per_night` - Float
- `state` - Varchar

### 3. Bookings Table

Purpose:
Stores user trip bookings, stay details, payment status, and pricing breakdown.

Columns:

- `id` - Integer, Primary Key
- `user_id` - Integer, Foreign Key
- `location_id` - Integer, Foreign Key
- `check_in_date` - Varchar
- `check_out_date` - Varchar
- `guests` - Integer
- `total_price` - Float
- `booking_status` - Varchar
- `payment_status` - Varchar
- `payment_method` - Varchar
- `payment_reference` - Varchar
- `created_at` - Varchar
- `pricing_breakdown` - Text

### 4. Favorites Table

Purpose:
Stores destinations saved by users for later reference.

Columns:

- `id` - Integer, Primary Key
- `user_id` - Integer, Foreign Key
- `location_id` - Integer, Foreign Key
- `created_at` - Varchar

### 5. Reviews Table

Purpose:
Stores user ratings and comments for tourism destinations.

Columns:

- `id` - Integer, Primary Key
- `user_id` - Integer, Foreign Key
- `location_id` - Integer, Foreign Key
- `rating` - Integer
- `comment` - Text
- `created_at` - Varchar

## Relationships

The database uses relational links between tables:

- `bookings.user_id` references `users.id`
- `bookings.location_id` references `locations.id`
- `favorites.user_id` references `users.id`
- `favorites.location_id` references `locations.id`
- `reviews.user_id` references `users.id`
- `reviews.location_id` references `locations.id`

These relationships help maintain consistency between users, destinations, and user activities such as bookings, saved places, and reviews.

## Role of the Database

The database acts as the central storage layer of the platform. It:

- stores registered users securely
- maintains destination information
- keeps booking and payment-related records
- saves favorites and review data
- supports create, read, update, and delete operations through the backend API

## Notes for Documentation

For project documentation, you can describe this as:

"The project uses an SQLite database file named `tourism.db` as the main storage unit. It contains five major tables: Users, Locations, Bookings, Favorites, and Reviews. The database is connected through SQLAlchemy and is used to maintain user accounts, destination details, booking records, review data, and saved travel preferences in a structured and reliable manner."
