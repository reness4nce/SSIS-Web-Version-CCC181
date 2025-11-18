# SSIS-Web-Version-CCC181 - InsTrack

[![React](https://img.shields.io/badge/React-19.1.1-61dafb?style=flat-square&logo=react)](https://reactjs.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0.0-000000?style=flat-square&logo=flask)](https://flask.palletsprojects.com/)
[![Supabase](https://img.shields.io/badge/Supabase-2.3.0-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-5.x-646cff?style=flat-square&logo=vite)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4.x-38b2ac?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
[![Chart.js](https://img.shields.io/badge/Chart.js-4.4.x-ff6384?style=flat-square&logo=chart.js)](https://www.chartjs.org/)

A modern web application for Student Information System (SSIS) management, built with React frontend and Flask backend with Supabase database integration.

## ✨ Features

### 🎓 Student Management
- **CRUD Operations**: Create, read, update, and delete student records
- **Photo Upload**: Profile photo management with file validation (max 5MB, supports JPEG, JPG, PNG, WebP)
- **Advanced Search & Filter**: Search by name, ID, course, year with real-time filtering
- **Pagination**: Efficient data handling with customizable page sizes
- **Sorting**: Sort by ID, name, course, year, or gender

### 🏛️ Academic Structure
- **College Management**: Add, edit, and manage college information
- **Program Management**: Handle academic programs with validation
- **Data Integrity**: Foreign key constraints and data validation across entities

### 📊 Dashboard & Analytics
- **Statistics Overview**: Real-time student statistics by year and program
- **Interactive Charts**: Visual data representation using Chart.js
- **Responsive Design**: Mobile-friendly dashboard with Bootstrap and Tailwind CSS

### 🔐 Security & Authentication
- **User Authentication**: Secure login and signup with session management
- **Rate Limiting**: API protection with Flask-Limiter (200/day, 50/hour limits)
- **Input Validation**: Comprehensive form validation using WTForms
- **CORS Support**: Configured for frontend-backend communication

### 🎨 User Interface
- **Modern Design**: Combined use of Bootstrap, DaisyUI, and Tailwind CSS
- **Responsive Layout**: Optimized for desktop and mobile devices
- **Intuitive Navigation**: Breadcrumb navigation and sidebar menu
- **Interactive Elements**: Modal dialogs, toast notifications, and smooth animations

## 🛠️ Technology Stack

### Backend
- **Flask 3.0.0** - Lightweight WSGI web application framework
- **WTForms 3.1.1** - Flexible forms validation and rendering library
- **Supabase 2.3.0** - Open source Firebase alternative for database and real-time features
- **Flask-CORS 4.0.0** - Cross Origin Resource Sharing support
- **Flask-Limiter 3.5.0** - Rate limiting for API endpoints
- **python-dotenv 1.0.0** - Environment variable management
- **psycopg2-binary** - PostgreSQL database adapter

### Frontend
- **React 19.1.1** - Modern JavaScript library for building user interfaces
- **Vite 5.x** - Next generation frontend tooling for faster development
- **Tailwind CSS 3.4.x** - Utility-first CSS framework
- **Bootstrap 5.3.x** - Popular CSS framework for responsive design
- **DaisyUI 5.1.x** - Component library for Tailwind CSS
- **React Router DOM 7.9.x** - Declarative routing for React
- **Axios 1.12.x** - HTTP client for API communication
- **Chart.js 4.4.x** - Simple yet flexible JavaScript charting library
- **React Icons 5.5.x** - Popular icon library for React
- **SweetAlert2 11.14.x** - Beautiful, responsive, customizable replacement for JavaScript's popup boxes

### Database
- **Supabase (PostgreSQL)** - Serverless database with real-time capabilities

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- npm or yarn
- Supabase account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/reness4nce/SSIS-Web-Version-CCC181.git
   cd SSIS-Web-Version-CCC181
   ```

2. **Backend Setup**
   ```bash
   # Navigate to backend directory
   cd backend

   # Create virtual environment (recommended)
   python -m venv venv
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate

   # Install dependencies
   pip install -r requirements.txt

   # Set up environment variables
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

3. **Frontend Setup**
   ```bash
   # Navigate to frontend directory (from project root)
   cd frontend

   # Install dependencies
   npm install
   ```

4. **Database Setup**
   ```bash
   # Initialize database tables
   cd ../backend
   flask init-db

   # (Optional) Seed with sample data
   flask seed-db
   ```

### Configuration

Create a `.env` file in the backend directory with the following variables:
```env
FLASK_ENV=development
SECRET_KEY=your-secret-key-here
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
DATABASE_URL=your-postgresql-connection-string
SUPABASE_STORAGE_BUCKET=your-storage-bucket-name
```

## 🏃‍♂️ Running the Application

### Development Mode

1. **Start Backend Server**
   ```bash
   cd backend
   python run.py
   # Server runs on http://localhost:5000
   ```

2. **Start Frontend Dev Server** (in a new terminal)
   ```bash
   cd frontend
   npm start
   # Server runs on http://localhost:5173
   ```

### Available Scripts

#### Backend
- `flask init-db` - Initialize database tables
- `flask seed-db` - Seed database with sample data
- `flask reset-db` - Reset database (drop and recreate tables)
- `flask fix-rls` - Fix Row Level Security policies

#### Frontend
- `npm start` / `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm test` - Run tests

## 📁 Project Structure

```
SSIS-Web-Version-CCC181/
├── backend/                     # Flask backend application
│   ├── app/                     # Main application package
│   │   ├── auth/                # Authentication module
│   │   ├── college/             # College management
│   │   ├── program/             # Program management
│   │   ├── student/             # Student management
│   │   ├── __init__.py          # Application factory
│   │   ├── database.py          # Database utilities
│   │   └── supabase.py          # Supabase integration
│   ├── migrations/              # Database migrations
│   ├── requirements.txt         # Python dependencies
│   ├── run.py                   # Application entry point
│   └── config.py                # Configuration management
├── frontend/                    # React frontend application
│   ├── src/
│   │   ├── components/          # Reusable UI components
│   │   ├── pages/               # Page components
│   │   ├── contexts/            # React context providers
│   │   ├── services/            # API services
│   │   └── utils/               # Utility functions
│   ├── package.json             # Node.js dependencies
│   └── vite.config.js           # Vite configuration
├── populate_students_300.sql    # Sample data script
├── storage_bucket_setup.sql     # Supabase storage setup
└── README.md                    # This file
```

## 🔌 API Reference

### Authentication
- `POST /api/v1/auth/login` - User login
- `POST /api/v1/auth/signup` - User registration
- `POST /api/v1/auth/logout` - User logout

### Students
- `GET /api/v1/students` - List students with filtering/pagination
- `GET /api/v1/students/{id}` - Get student by ID
- `POST /api/v1/students` - Create new student
- `PUT /api/v1/students/{id}` - Update student
- `DELETE /api/v1/students/{id}` - Delete student
- `POST /api/v1/students/{id}/photo` - Upload profile photo
- `DELETE /api/v1/students/{id}/photo` - Delete profile photo
- `GET /api/v1/students/validate-program/{code}` - Validate program code
- `GET /api/v1/students/stats` - Get student statistics

### Colleges
- `GET /api/v1/colleges` - List colleges
- `POST /api/v1/colleges` - Create college
- `PUT /api/v1/colleges/{id}` - Update college
- `DELETE /api/v1/colleges/{id}` - Delete college

### Programs
- `GET /api/v1/programs` - List programs
- `POST /api/v1/programs` - Create program
- `PUT /api/v1/programs/{id}` - Update program
- `DELETE /api/v1/programs/{id}` - Delete program

### Utility
- `GET /health` - Health check endpoint
- `GET /api/v1` - API information

## 🏗️ Development

### Code Style
- Follow PEP 8 for Python code
- Use ESLint and Prettier for frontend code consistency
- Implement proper error handling and logging

### Testing
```bash
# Backend tests (if implemented)
cd backend
pytest

# Frontend tests
cd frontend
npm test
```

### Building for Production
```bash
# Backend
cd backend
gunicorn --bind 0.0.0.0:8000 app:create_app()

# Frontend
cd frontend
npm run build
# Serve the built files from dist/
```


## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

