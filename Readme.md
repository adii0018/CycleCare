# 🚲 CycleCare — Digital Bicycle Repair Management System

**By Rajput Auto Garage**

> **Your Cycle, Our Care.**

A simple, modern, mobile-first digital bicycle repair registration and record management system designed for local bicycle repair shops.

---

## 1. Project Overview

CycleCare is a digital solution for Rajput Auto Garage that replaces the traditional paper-based bicycle repair register with a simple online system.

When a customer brings their bicycle for repair, they can scan a QR code displayed at the shop, open a registration page on their smartphone, enter their details, upload bicycle photos, describe the repair problems, and submit the form.

The shop owner can access a secure admin dashboard to view all submitted repair records, customer information, bicycle photos, and repair requirements.

The main goal is to make bicycle repair registration faster, organized, accessible, and easy to manage without introducing unnecessary complexity.

**Important:** CycleCare is not intended to be a large enterprise repair management platform. It should remain lightweight, practical, and easy for a small local repair shop to operate.

---

## 2. Problem Statement

Many local bicycle repair shops still maintain customer and repair information using handwritten registers.

This creates several problems:

- Paper records can become damaged, lost, or difficult to search.
- Finding an old customer's repair details takes time.
- Bicycle photos and repair requirements are not stored together.
- Customer contact information may be difficult to retrieve.
- Shop owners must manually maintain and organize records.
- There is no convenient digital history of previously registered bicycles.

### Proposed Solution

CycleCare provides a centralized digital repair register.

Customers submit their repair information through a QR-based registration form, and the shop owner manages all records through a protected dashboard.

The system should minimize manual work and avoid unnecessary features.

---

## 3. Core Objectives

1. Replace the traditional paper repair register.
2. Make customer registration simple through QR scanning.
3. Store customer information and bicycle repair details digitally.
4. Allow the shop owner to search and retrieve repair records quickly.
5. Store bicycle photos securely.
6. Automatically delete old photos after 30 days.
7. Preserve customer and repair history even after photos expire.
8. Provide a responsive experience across smartphones, tablets, and desktops.

---

## 4. Target Users

### A. Customer

Customers should be able to:

- Scan the QR code displayed at the shop.
- Open the registration form without installing an application.
- Enter their name.
- Enter their mobile number.
- Upload one or more bicycle photos.
- Select or describe repair problems.
- Add optional additional information.
- Submit the registration.
- Receive a confirmation message and unique Repair ID.

Customer registration must not require an account, password, OTP, or application installation.

### B. Shop Owner / Admin

The shop owner should be able to:

- Log in using a mobile number and password.
- View all customer repair records.
- Search records using customer name, mobile number, or Repair ID.
- Open complete repair information.
- View bicycle photos.
- Call customers directly using their mobile number.
- Create repair records manually.
- View historical repair records.
- Archive old records.

Only authorized administrators can access the dashboard.

---

## 5. Customer Registration Workflow

The customer registration process must be extremely simple.

```text
Customer visits Rajput Auto Garage
              |
              v
Scans QR code displayed at the shop
              |
              v
Opens CycleCare registration page
              |
              v
Enters customer information
              |
              v
Uploads bicycle photos
              |
              v
Selects/describes repair problems
              |
              v
Submits registration form
              |
              v
Backend validates the information
              |
              v
Photos uploaded to Cloudflare R2
              |
              v
Repair record saved in MongoDB
              |
              v
Unique Repair ID generated
              |
              v
Registration confirmation displayed
```

### Customer Registration Form Fields

| Field | Requirement |
|---|---|
| Customer Name | Required |
| Mobile Number | Required |
| Bicycle Photos | Optional |
| Repair Problems | Required |
| Additional Details | Optional |
| Repair ID | Automatically generated |
| Received Date & Time | Automatically generated |

Repair problems may include:

- Puncture / Tyre Problem
- Brake Problem
- Chain Problem
- Gear Problem
- Pedal Problem
- Wheel Problem
- General Servicing
- Other

Allow customers to select multiple problems.

For the `Other` option, provide a text field to describe the issue.

### Registration Confirmation

After successful submission, display:

- Success message.
- Customer name.
- Unique Repair ID.
- Registration date.
- A simple instruction to keep the Repair ID for future reference.

Do not introduce unnecessary customer account creation.

---

## 6. Important Business Logic

### No Repair Status Management

This is a very important requirement.

The shop owner does not have enough time to continuously update repair statuses.

Therefore, do NOT implement status workflows such as:

- Received
- Inspection
- Pending
- In Progress
- Waiting for Parts
- Completed
- Delivered

The system should simply store the repair record and its information.

The owner should be able to open a record and immediately understand:

- Whose bicycle it is.
- Customer mobile number.
- What repair work is required.
- Bicycle photos.
- When the bicycle was registered.

Avoid unnecessary operational complexity.

### Unique Repair ID

Every submitted repair record must receive a unique Repair ID.

Example:

`CC-2026-00001`

Requirements:

- Automatically generated by the backend.
- Must be unique.
- Must not depend on frontend-generated values.
- Must be searchable from the admin dashboard.
- Must be generated safely under concurrent submissions.

### Photo Retention Policy

Bicycle photos should be stored in Cloudflare R2.

Photos must be automatically deleted after 30 days.

However, the repair record itself must remain available.

**After 30 days:**

| Information | Retention |
|---|---|
| Customer Name | Keep |
| Mobile Number | Keep |
| Repair Description | Keep |
| Repair ID | Keep |
| Registration Date | Keep |
| Bicycle Photos | Delete |

When photos expire, the dashboard should display:

`Photo Expired`

Do not delete the complete repair record when photos expire.

Use Cloudflare R2 lifecycle expiration rules for automatic photo deletion. Note that lifecycle processing may happen after the eligibility time rather than at the exact second the 30-day period ends.

---

## 7. Technology Stack

The following stack is finalized for the project.

### Frontend

| Technology | Purpose |
|---|---|
| React.js | Frontend application |
| Vite | Development server and build tool |
| Tailwind CSS | Styling and responsive layouts |
| Framer Motion | UI animations and transitions |
| GSAP | Special complex animations where necessary |
| Lucide React | Icons |
| React Router | Application routing |

### Backend

| Technology | Purpose |
|---|---|
| Python | Backend programming language |
| Django | Backend framework |
| Django REST Framework | REST API development |
| PyMongo | Direct MongoDB database access |
| Django password hashing utilities | Secure admin password storage |

**Important database decision:** Use PyMongo for repair records. Do not use Django ORM or MongoEngine for repair data.

If Django authentication models are used, configure a separate supported SQL database for them. Alternatively, manage administrator credentials in a dedicated MongoDB collection using Django's secure password hashing utilities.

Do not assume Django ORM can directly manage MongoDB collections.

### Database

**MongoDB Atlas**

Used for:

- Customer information.
- Repair records.
- Unique Repair IDs.
- Repair descriptions.
- Registration timestamps.
- Photo metadata.
- Admin account records, if using a custom PyMongo-based authentication implementation.

### Image Storage

**Cloudflare R2**

Used for:

- Bicycle photo storage.
- Private object storage.
- Secure signed upload and download URLs.
- Automatic 30-day photo expiration.

### Deployment

| Service | Responsibility |
|---|---|
| Vercel | React frontend hosting |
| Render | Django backend hosting |
| MongoDB Atlas | Cloud database |
| Cloudflare R2 | Bicycle image storage |

---

## 8. System Architecture

```text
                 CUSTOMER
                    |
                    v
             SCANS SHOP QR CODE
                    |
                    v
          REACT + VITE APPLICATION
                    |
                    v
           CUSTOMER REGISTRATION
                    |
                    v
             DJANGO REST API
                    |
          +---------+----------+
          |                    |
          v                    v
     PYTHON / DRF          CLOUDFLARE R2
          |                    |
          v                    |
      PY MONGO                  |
          |                    |
          v                    |
     MONGODB ATLAS              |
          |                    |
          +----------+---------+
                     |
                     v
             REPAIR RECORD SAVED
                     |
                     v
             REPAIR ID GENERATED
                     |
                     v
             CONFIRMATION PAGE


              SHOP OWNER / ADMIN
                     |
                     v
              ADMIN LOGIN PAGE
                     |
                     v
              PROTECTED DASHBOARD
                     |
                     v
               DJANGO REST API
                     |
                     v
                MONGODB ATLAS
                     |
                     v
           CUSTOMER & REPAIR RECORDS
                     |
                     v
           SIGNED PHOTO ACCESS FROM R2
```

### Architecture Principles

- Keep frontend and backend independently deployable.
- All business logic must remain on the backend.
- Never expose database credentials or R2 secrets in frontend code.
- Validate all customer input on the server.
- Use private R2 storage.
- Generate signed URLs for secure image access.
- Protect all administrator endpoints.
- Keep public customer registration separate from admin functionality.

---

## 9. Backend Architecture

Suggested Django application structure:

```text
backend/
│
├── config/
│   ├── settings.py
│   ├── urls.py
│   ├── wsgi.py
│   └── asgi.py
│
├── apps/
│   ├── authentication/
│   │   ├── views.py
│   │   ├── serializers.py
│   │   └── urls.py
│   │
│   ├── repairs/
│   │   ├── views.py
│   │   ├── serializers.py
│   │   ├── services.py
│   │   └── urls.py
│   │
│   └── uploads/
│       ├── views.py
│       ├── services.py
│       └── urls.py
│
├── services/
│   ├── mongodb.py
│   ├── cloudflare_r2.py
│   └── repair_id.py
│
├── requirements.txt
└── manage.py
```

### MongoDB Collections

#### 1. repairs

Suggested document:

```json
{
  "_id": "mongodb_object_id",
  "repair_id": "CC-2026-00001",
  "customer_name": "Rahul Sharma",
  "mobile": "9876543210",
  "repair_problems": [
    "Puncture",
    "Brake Problem"
  ],
  "additional_details": "Front tyre punctured",
  "photos": [
    {
      "object_key": "repairs/CC-2026-00001/photo1.jpg",
      "uploaded_at": "ISODate",
      "expires_at": "ISODate"
    }
  ],
  "received_at": "ISODate",
  "archived": false,
  "created_at": "ISODate"
}
```

This is a suggested schema. Adjust field names and validation according to the final implementation.

Do not store permanent public image URLs. Store R2 object keys and generate temporary signed URLs when authorized access is required.

#### 2. admins

Suggested document:

```json
{
  "_id": "mongodb_object_id",
  "mobile": "9876543210",
  "password_hash": "secure_django_password_hash",
  "is_active": true,
  "created_at": "ISODate"
}
```

Never store plain-text passwords.

### Recommended MongoDB Indexes

Create indexes for:

- `repair_id` — unique.
- `mobile` — searchable.
- `received_at` — sorting and date filtering.
- `archived` — filtering.

---

## 10. API Design

All API endpoints should use a common prefix:

`/api/`

### Authentication APIs

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/login/` | Admin login |
| POST | `/api/auth/logout/` | Admin logout |
| GET | `/api/auth/me/` | Current admin information |

Admin login requires:

- Mobile number.
- Password.

No OTP system and no SMS gateway.

Admin registration must not be publicly available.

### Repair APIs

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/repairs/` | Public customer registration |
| GET | `/api/repairs/` | Admin repair records list |
| GET | `/api/repairs/:id/` | Get repair details |
| POST | `/api/repairs/manual/` | Admin creates a record manually |
| PATCH | `/api/repairs/:id/archive/` | Archive a record |

### Upload APIs

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/uploads/presign/` | Generate secure R2 upload URL |

The upload flow should be:

1. Frontend requests a signed upload URL.
2. Backend validates the request and generates a short-lived signed URL.
3. Frontend uploads the image directly to R2.
4. Frontend submits the repair registration with the resulting R2 object key.
5. Backend validates the uploaded object and saves the repair record.

If registration fails after an upload, implement a cleanup strategy for orphaned images.

The backend must verify that submitted object keys belong to valid uploads and must not accept arbitrary external image URLs.

---

## 11. Admin Dashboard Requirements

The dashboard should be clean, practical, and easy to operate.

### Dashboard Overview

Display useful summary information:

- Total repair records.
- Today's registrations.
- Total archived records.
- Records with expired photos.

Avoid unnecessary analytics and complex charts.

### Repair Records

Each record should show:

- Customer name.
- Mobile number.
- Repair ID.
- Received date.
- Repair problem summary.
- Photo availability.

### Search

Allow searching by:

- Customer name.
- Mobile number.
- Repair ID.

### Repair Details

When an admin opens a record, display:

- Complete customer information.
- Mobile number with a direct call action.
- Repair ID.
- Repair problems.
- Additional details.
- Registration date and time.
- Bicycle photos, if available.

If photos have expired, show `Photo Expired`.

### Manual Registration

The admin must be able to create a repair record manually if a customer cannot scan the QR code.

The manual registration form should use the same validation and record structure as customer registration.

---

## 12. QR Code Strategy

QR code generation will be handled externally.

The application does not need a built-in QR code generator.

After deploying the frontend to Vercel, use the production customer registration URL:

```text
https://your-cyclecare-domain.com/register
```

Generate a QR code using an external QR code generator and print it for display at Rajput Auto Garage.

### QR Flow

```text
Printed QR Code
      |
      v
Customer Scans QR
      |
      v
/register Page
      |
      v
Customer Registration
      |
      v
Repair Record Created
```

Important:

- QR code must point directly to `/register`.
- It must never point to the admin login page.
- Use the final stable production URL before printing.
- Do not require customers to install an application.

---

## 13. UI/UX Design System

The visual experience is an important part of CycleCare.

The interface should feel:

- Modern.
- Friendly.
- Clean.
- Trustworthy.
- Minimal.
- Professional.
- Mobile-first.

Avoid an overly complicated enterprise dashboard design.

### Visual Theme

The approved design direction is a soft blue, lavender, and navy visual identity.

Suggested colors:

| Purpose | Color |
|---|---|
| Primary Navy | `#0B2A4A` |
| Sky Blue | `#7CC4F5` |
| Cyan Accent | `#22D3EE` |
| Bright Blue | `#3B82F6` |
| Background | `#F4F9FF` |
| Secondary Background | `#EEF4FF` |
| Lavender Background | `#F6F4FF` |
| Muted Text | `#5B7592` |
| Light Border | `#CBD5E1` |

Use these as initial design tokens and maintain visual consistency across the application.

### Brand Identity

**Application Name:** CycleCare

**Brand Attribution:** by Rajput Auto Garage

**Tagline:** Your Cycle, Our Care.

Keep the branding consistent across the preloader, registration page, confirmation page, and admin dashboard.

### UI Components

Create reusable components for:

- Buttons.
- Input fields.
- Form labels.
- Cards.
- Navigation.
- Modal dialogs.
- Image upload.
- Search bar.
- Empty states.
- Loading skeletons.
- Confirmation messages.
- Toast notifications.

### Customer Registration Page

The registration page should have:

- CycleCare branding.
- A short welcome message.
- Clean form layout.
- Large, accessible input fields.
- Mobile number input with validation.
- Multiple repair problem selections.
- Bicycle photo upload.
- Image previews.
- Optional additional details.
- Clear submit button.

Keep the page short and easy to use.

### Admin Login Page

Design a minimal login page with:

- CycleCare branding.
- Mobile number field.
- Password field.
- Show/hide password control.
- Login button.
- Validation messages.

### Admin Dashboard

Suggested layout:

- Simple sidebar or mobile navigation.
- Dashboard overview.
- Search bar.
- Repair records list.
- Detail view.
- Manual registration action.
- Archive section.

On mobile, use stacked cards instead of a wide table.

### Preloader

An approved custom CycleCare preloader already exists in:

`CycleCarePreloader.jsx`

It contains:

- Animated bicycle wheel.
- Gear animation.
- CycleCare wordmark.
- Soft blue/lavender background.
- Rajput Auto Garage branding.

**Important:** Preserve the existing preloader design. Do not redesign it or replace its original animation without explicit approval.

Integrate the existing component into the application and ensure its loading lifecycle works correctly.

---

## 14. Animation Guidelines

Use animation carefully.

| Technology | Usage |
|---|---|
| Framer Motion | Page transitions, cards, dialogs, UI interactions |
| GSAP | Special complex animation sequences |
| CSS | Hover effects, button interactions, micro-interactions |
| Lottie | Lightweight animated illustrations, if needed |

Animation guidelines:

- Keep transitions smooth and subtle.
- Avoid excessive movement.
- Avoid unnecessary 3D effects.
- Use loading skeletons for data fetching.
- Respect `prefers-reduced-motion`.
- Maintain good performance on low-end smartphones.

The application should prioritize usability over decorative animations.

---

## 15. Responsive Design Requirements

CycleCare must be mobile-first.

Most customers will access the registration form using their smartphones.

The shop owner may use a smartphone, tablet, or desktop.

Test the following viewport widths:

| Device | Width |
|---|---:|
| Small Mobile | 320px |
| Mobile | 360px |
| Standard Mobile | 390px |
| Tablet | 768px |
| Laptop | 1024px |
| Desktop | 1440px |

Requirements:

- No unwanted horizontal scrolling.
- Large touch-friendly buttons.
- Responsive forms.
- Proper image previews.
- Responsive dashboard cards.
- Mobile-friendly navigation.
- Readable typography.
- Proper spacing and padding.

---

## 16. Security Requirements

Security must be implemented on the backend, not only in the frontend.

### Admin Security

- Secure password hashing.
- No public admin registration.
- Login rate limiting.
- Protected admin APIs.
- Secure session or token-based authentication.
- Server-side authorization checks.
- Secure logout.
- HTTPS in production.

Prefer secure, HTTP-only cookies for browser authentication where deployment and CSRF configuration support them.

### Database Security

- Store MongoDB credentials in environment variables.
- Never expose database credentials in frontend code.
- Validate and sanitize user input.
- Use appropriate MongoDB indexes.
- Avoid exposing sensitive database details in API responses.

### File Upload Security

- Private Cloudflare R2 bucket.
- Short-lived signed URLs.
- File type validation.
- File size limits.
- Image compression.
- Randomized object keys.
- Verify uploaded objects before saving references.
- No permanent public image URLs.

### Environment Variables

Example backend configuration:

```env
DEBUG=False
SECRET_KEY=
ALLOWED_HOSTS=

MONGODB_URI=
MONGODB_DATABASE=

R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=
R2_ENDPOINT_URL=

FRONTEND_URL=
```

Never commit `.env` files or production secrets to GitHub.

---

## 17. Performance Requirements

- Compress images before upload.
- Limit accepted image file sizes.
- Use pagination for repair records.
- Optimize MongoDB queries.
- Lazy-load images.
- Use responsive image previews.
- Avoid unnecessary API requests.
- Keep frontend bundle size reasonable.
- Use skeleton loading states.
- Clean up orphaned R2 objects.

---

## 18. Project Folder Structure

Suggested root structure:

```text
cyclecare/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   ├── preloader/
│   │   │   └── ui/
│   │   │
│   │   ├── pages/
│   │   │   ├── CustomerRegistration/
│   │   │   ├── Confirmation/
│   │   │   ├── AdminLogin/
│   │   │   └── Dashboard/
│   │   │
│   │   ├── services/
│   │   ├── hooks/
│   │   ├── context/
│   │   ├── routes/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   └── package.json
│
├── backend/
│   ├── config/
│   ├── apps/
│   │   ├── authentication/
│   │   ├── repairs/
│   │   └── uploads/
│   │
│   ├── services/
│   ├── requirements.txt
│   └── manage.py
│
├── README.md
└── .gitignore
```

This structure can be adjusted as the implementation grows, but frontend and backend responsibilities should remain clearly separated.

---

## 19. Development Roadmap

Build the application in the following phases.

### Phase 1 — Project Foundation

- Initialize React + Vite frontend.
- Initialize Django backend.
- Configure Django REST Framework.
- Configure MongoDB Atlas using PyMongo.
- Configure environment variables.
- Create the initial design system.
- Integrate the existing CycleCare preloader.

### Phase 2 — Customer Registration

- Create `/register` page.
- Build customer registration form.
- Add validation.
- Add repair problem selection.
- Implement bicycle photo upload.
- Integrate Cloudflare R2.
- Generate unique Repair IDs.
- Save repair records in MongoDB.
- Build confirmation page.

### Phase 3 — Admin Authentication

- Create admin login page.
- Implement mobile number and password authentication.
- Create the admin account securely.
- Protect admin routes.
- Implement logout.
- Add rate limiting.

### Phase 4 — Admin Dashboard

- Create dashboard overview.
- Display repair records.
- Implement search.
- Build repair details page.
- Add direct customer calling.
- Add manual repair registration.
- Implement archive functionality.

### Phase 5 — Photo Retention & History

- Configure R2 lifecycle expiration.
- Implement 30-day photo retention.
- Preserve repair records.
- Display `Photo Expired` when appropriate.
- Test historical record access.

### Phase 6 — Testing & Deployment

- Test all APIs.
- Test MongoDB connectivity.
- Test image upload and retrieval.
- Test admin authentication.
- Test responsive layouts.
- Test duplicate submissions.
- Test photo expiration behavior.
- Deploy frontend to Vercel.
- Deploy backend to Render.
- Configure production environment variables.
- Generate the external QR code using the final production `/register` URL.

---

## 20. Testing Checklist

### Customer Side

- [ ] Registration page loads correctly.
- [ ] Customer name validation works.
- [ ] Mobile number validation works.
- [ ] Multiple repair problems can be selected.
- [ ] Multiple photos can be uploaded.
- [ ] Image previews work.
- [ ] Registration submits successfully.
- [ ] Unique Repair ID is generated.
- [ ] Confirmation page displays correct information.

### Admin Side

- [ ] Admin can log in.
- [ ] Invalid credentials are rejected.
- [ ] Protected routes require authentication.
- [ ] Dashboard loads repair records.
- [ ] Search works by name, mobile, and Repair ID.
- [ ] Repair details display correctly.
- [ ] Photos load securely.
- [ ] Direct call action works.
- [ ] Manual registration works.
- [ ] Archive functionality works.

### Storage & History

- [ ] Images are stored in private R2.
- [ ] Signed upload URLs work.
- [ ] Signed download URLs work.
- [ ] Photos expire after 30 days through lifecycle rules.
- [ ] Repair records remain in MongoDB.
- [ ] Expired photos show `Photo Expired`.

### Responsive UI

- [ ] 320px mobile.
- [ ] 360px mobile.
- [ ] 390px mobile.
- [ ] 768px tablet.
- [ ] 1024px laptop.
- [ ] 1440px desktop.
- [ ] No horizontal overflow.

---

## 21. Important Instructions for AI Development Assistants

When working on CycleCare, follow these instructions strictly:

1. Understand the complete project requirements before generating code.
2. Do not turn this into a complex enterprise repair management system.
3. Do not add repair status management.
4. Do not add customer login, OTP, SMS gateway, or customer accounts.
5. Use React + Vite for the frontend.
6. Use Django REST Framework for the backend.
7. Use PyMongo for repair data access.
8. Use MongoDB Atlas as the primary repair database.
9. Use Cloudflare R2 for bicycle photo storage.
10. Keep the approved CycleCare visual theme consistent.
11. Preserve the existing preloader design.
12. Follow a mobile-first responsive approach.
13. Keep the frontend and backend architecture clean and modular.
14. Never expose credentials or secrets.
15. Implement proper validation and error handling.
16. Do not create fake or hardcoded production data.
17. Do not skip backend security.
18. Avoid unnecessary features that increase maintenance.
19. Write maintainable, reusable, production-oriented code.
20. Explain important implementation decisions before making major architectural changes.

### Development Collaboration Instructions

Work phase by phase.

Before implementing a phase:

- Explain what will be built.
- Identify the files that need to be created or modified.
- Explain the data flow.
- Identify important dependencies.

After implementation:

- Explain how to run it.
- Provide required commands.
- Explain environment configuration.
- Provide a testing checklist.
- Verify that the implementation matches the project requirements.

Do not generate the entire project in one huge response. Build it incrementally and ensure each phase works before moving to the next.

---

## 22. Final Project Vision

CycleCare should make bicycle repair registration effortless for customers and repair record management effortless for the shop owner.

A customer should only need to scan a QR code, enter a few details, upload bicycle photos if available, and submit the form.

The shop owner should be able to open the dashboard and immediately understand which customer's bicycle is registered, what repair work is required, and how to contact the customer.

**CycleCare — Your Cycle, Our Care.**

**Built for Rajput Auto Garage.**
