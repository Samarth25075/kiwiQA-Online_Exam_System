# ExamPortal System Description & Functionality

## 1. Overview
**ExamPortal** is a robust, full-stack web application designed to streamline the process of creating, managing, and conducting online technical assessments. Built with a **FastAPI** backend and a **React** frontend, it leverages **MongoDB** for flexible data storage and **Redis** for high-performance caching.

---

## 2. Core Functional Modules

### A. Administrative Control Center
The Administrative Panel is the heart of the system, providing recruiters and examiners with tools to manage the entire assessment lifecycle.

1.  **Dashboard & Analytics**:
    *   Real-time overview of active exams and candidate participation.
    *   Visual statistics for candidate performance and system health.
2.  **Exam Management Engine**:
    *   **Creation**: Define exam parameters including title, duration, passing criteria, and category focus.
    *   **Configuration**: Toggle advanced features like proctoring, randomized questions, and immediate result display.
    *   **Lifecycle Control**: Schedule, activate, or archive exams as needed.
3.  **Intelligent Question Bank**:
    *   Centralized repository for storing thousands of questions across various technical domains (e.g., Python, JavaScript, Logic).
    *   Support for multiple question formats (MCQs, Coding challenges).
    *   Bulk import/export capabilities via JSON/CSV.
4.  **Candidate Lifecycle Management**:
    *   **Enrollment**: Add candidates individually or via bulk upload.
    *   **Tracking**: Monitor candidate status in real-time (Invited → In Progress → Completed).
    *   **Evaluation**: Access detailed performance reports with category-wise score breakdowns.
5.  **Automated Invitation System**:
    *   Generate secure, unique access tokens for every candidate.
    *   Integrated email service to send personalized invitations and login links.

### B. Candidate Assessment Environment
A distraction-free, secure interface designed for candidates to perform their best.

1.  **Secure Authentication**:
    *   Passwordless login using unique tokens sent via email.
    *   Pre-test verification and instruction screens.
2.  **Examination Interface**:
    *   Responsive UI for seamless testing across devices.
    *   Live countdown timer with automated submission upon expiry.
    *   Progress tracking (answered vs. flagged questions).
3.  **Post-Assessment Reports**:
    *   Instant result generation.
    *   Detailed feedback on strengths and weaknesses across different technical categories.

### C. Kiwi AI Assistant
An integrated AI companion powered by advanced LLMs to provide real-time support.

*   **For Admins**: Helps in navigating complex settings or generating exam descriptions.
*   **For Candidates**: Answers platform-related queries and provides troubleshooting assistance during the test.

---

## 3. Technical & System Features

*   **Security & Integrity**: 
    *   JWT-based authentication for administrative access.
    *   Token-based security for candidate sessions.
    *   Built-in proctoring flags for suspicious activity.
*   **Performance Optimization**:
    *   **FastAPI Cache**: Redis-backed caching for frequently accessed data like the question bank.
    *   **GZip Compression**: Optimized payload delivery for faster page loads.
*   **Scalability**:
    *   Asynchronous backend architecture capable of handling concurrent testing sessions.
    *   Stateless API design ready for containerized deployment (e.g., Docker, Render).
*   **Data Reliability**:
    *   Automated background cleanup tasks for expired exams and orphaned tokens.
    *   MongoDB indexing for rapid search and retrieval of candidate records.

---

## 4. User Roles

| Role | Access Level | Primary Responsibilities |
| :--- | :--- | :--- |
| **Super Admin** | Full Access | System configuration, user management, global settings. |
| **Recruiter/Examiner** | Management Access | Creating exams, managing question banks, reviewing results. |
| **Candidate** | Assessment Access | Taking assigned tests and viewing personal reports. |
