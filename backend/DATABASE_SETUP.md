# PostgreSQL Database Setup

## 1. Install PostgreSQL GUI Client

Choose one of these popular options:

### Recommended: **pgAdmin** (Official PostgreSQL Tool)
- **Download**: https://www.pgadmin.org/download/
- **Pros**: Official tool, full-featured, free
- **Best for**: Comprehensive database management

### Alternative: **DBeaver** (Universal Database Tool)
- **Download**: https://dbeaver.io/download/
- **Pros**: Works with many databases, free, modern UI
- **Best for**: If you work with multiple database types

### Alternative: **TablePlus** (Modern UI)
- **Download**: https://tableplus.com/
- **Pros**: Beautiful interface, fast, free tier available
- **Best for**: Mac/Windows users who want a modern experience

## 2. Install PostgreSQL Server

If you don't have PostgreSQL installed:
- **Windows**: https://www.postgresql.org/download/windows/
- **Mac**: `brew install postgresql` or download from postgresql.org
- **Linux**: `sudo apt-get install postgresql` (Ubuntu/Debian)

## 3. Create Database and Table

1. Open your PostgreSQL GUI client (pgAdmin, DBeaver, etc.)
2. Connect to your PostgreSQL server (default: localhost:5432)
3. Create a database named `ecomap`:
   ```sql
   CREATE DATABASE ecomap;
   ```
4. Connect to the `ecomap` database
5. Run the SQL from `setup.sql` file to create the table and insert sample data

Or use the command line:
```bash
psql -U postgres
CREATE DATABASE ecomap;
\c ecomap
\i setup.sql
```

## 4. Configure Environment Variables

Create a `.env` file in the `backend` folder:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ecomap
DB_USER=postgres
DB_PASSWORD=your_password_here
```

**Note**: The `.env` file is gitignored for security. Update the values in `db.js` if you prefer not to use environment variables.

## 5. Test the Connection

Start your backend server:
```bash
cd backend
npm start
```

You should see: `Connected to PostgreSQL database`

The API endpoint `/api/data` will now fetch data from PostgreSQL instead of mock data.
