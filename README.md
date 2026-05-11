# AI Smart Timetable Generator and Optimizer

## Overview

AI Smart Timetable Generator and Optimizer is a modern web application designed to automatically generate optimized and conflict-free academic timetables using intelligent scheduling algorithms. The system helps educational institutions efficiently manage class schedules, faculty allocations, subject distributions, and classroom planning.

---

# Features

- AI-based timetable generation
- Conflict-free scheduling system
- Faculty allocation management
- Subject and classroom management
- Responsive modern user interface
- Fast performance with Vite
- Reusable component-based architecture
- Real-time timetable updates
- Optimized scheduling logic
- Easy deployment and scalability

---

# Technologies Used

- React
- Tailwind CSS
- TypeScript
- Supabase
- PostgreSQL(JSON-based data handling)

---

# Project Structure

```plaintext
src/
├── core/
│   ├── constraintsEngine.ts         ← Handles timetable constraints
│   ├── geneticAlgorithm.ts          ← AI-based timetable optimization
│   ├── pdfGenerator.ts              ← PDF timetable generation
│   ├── timetableManager.ts          ← Core timetable scheduling logic
│   └── exportUtils.ts               ← Export utility functions
│
├── context/
│   ├── AuthContext.tsx              ← Authentication state management
│   └── TimetableContext.tsx         ← Timetable data management
│
├── hooks/
│   ├── use-mobile.tsx               ← Mobile responsiveness hook
│   └── use-toast.ts                 ← Toast notification hook
│
├── pages/
│   ├── Dashboard.tsx                ← Main dashboard page
│   ├── Generate.tsx                 ← Timetable generation page
│   ├── Faculty.tsx                  ← Faculty management page
│   ├── LabTimetable.tsx             ← Lab timetable page
│   └── Login.tsx                    ← Authentication page
│
├── services/
│   └── timetableService.ts          ← Timetable-related services
│
├── utils/
│   ├── helpers.ts                   ← Utility helper functions
│   └── constants.ts                 ← Static constants
│
├── types/
│   └── timetable.ts                 ← TypeScript type definitions
│
├── App.tsx                          ← Main application component
├── main.tsx                         ← Application entry point
└── index.css                        ← Global styles
```

---

# Installation

## Prerequisites

Ensure the following software is installed on your system:

- Node.js
- npm

You can install Node.js using nvm:

https://github.com/nvm-sh/nvm#installing-and-updating

---

# Setup Instructions

```bash
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd <YOUR_PROJECT_NAME>

# Install dependencies
npm install

# Start development server
npm run dev
```

The application will start on the local development server with hot reloading enabled.

---

# Build for Production

```bash
npm run build
```

---

# Preview Production Build

```bash
npm run preview
```

---

# Core Functionalities

## Timetable Generation

The application automatically creates optimized and conflict-free timetables while preventing:

- Faculty clashes
- Subject overlaps
- Duplicate time slots
- Invalid scheduling combinations

---

## Optimization Algorithm

The system uses intelligent optimization techniques to:

- Balance subject distribution
- Minimize scheduling conflicts
- Improve timetable efficiency
- Optimize classroom allocation

---

## Faculty Management

The application supports:

- Faculty profile management
- Subject assignment
- Availability scheduling
- Workload balancing

---

## Classroom Management

The system manages:

- Classroom allocation
- Room capacity handling
- Scheduling availability
- Conflict prevention

---

# Future Enhancements

- Authentication system
- Cloud database integration
- Export timetable as PDF
- Drag-and-drop timetable editor
- AI-based scheduling recommendations
- Multi-department support
- Attendance management integration
- Real-time collaboration features

---

# Deployment

This project can be deployed using:

- Vercel
- Netlify
- Firebase Hosting
- GitHub Pages

---

# License

This project is developed for educational and learning purposes.