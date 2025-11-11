# SmartTransit API Documentation

A comprehensive REST API for a transportation booking system that connects passengers with transport companies.

## Base URL

```
https://smarttransit-api.onrender.com/v1
```

All endpoints are prefixed with `/v1`.

---

## Table of Contents

1. [Authentication](#authentication)
2. [API Endpoints](#api-endpoints)
3. [Data Models](#data-models)
4. [Error Handling](#error-handling)
5. [Request & Response Examples](#request--response-examples)

---

## Authentication

### User Authentication

The API uses JWT (JSON Web Tokens) for user authentication. Tokens are obtained after login and must be included in protected routes.

**Token Format:**
```
Authorization: Bearer <token>
```

**Token Sources (in order of priority):**
1. `Authorization` header: `Bearer <token>`
2. `jwt` cookie
3. Query parameter: `?token=<token>` (testing only)

### Company Authentication

Companies have separate authentication using JWT tokens with a `type: 'company'` claim.

**Token Format:**
```
Authorization: Bearer <token>
```

**Token Sources:**
1. `Authorization` header: `Bearer <token>`
2. `companyToken` cookie

### User Roles

- `user`: Regular user (default)
- `admin`: Administrator with elevated permissions
- `company`: Transport company account

---

## API Endpoints

### User Authentication Routes

**Base Path:** `/v1/auth`

#### 1. Register User
```http
POST /v1/auth/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123",
  "phone": "+2348012345678"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "User registered. Check email to verify.",
  "token": "verification_token_here",
  "user": {
    "id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+2348012345678"
  }
}
```

#### 2. Verify Email
```http
GET /v1/auth/verify-email?token=<verification_token>
```

**Query Parameters:**
- `token` (required): Verification token from email

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User verified successfully"
}
```

#### 3. Login User
```http
POST /v1/auth/login
```

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "user": {
      "id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+2348012345678",
      "role": "user"
    }
  }
}
```

#### 4. Forgot Password
```http
POST /v1/auth/forgot-password
```

**Request Body:**
```json
{
  "email": "john@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "If an account with that email exists, a reset link has been sent."
}
```

#### 5. Reset Password
```http
POST /v1/auth/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

**Query Parameters (alternative):**
- `token`: Reset token from email

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password reset successful"
}
```

#### 6. Promote to Admin
```http
POST /v1/auth/promote-to-admin
```

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "userId": "user_id",
  "email": "user@example.com"
}
```
*Either `userId` or `email` is required*

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User promoted to admin",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "admin"
  }
}
```

#### 7. Demote from Admin
```http
POST /v1/auth/demote-from-admin
```

**Authentication:** Required (Admin only)

**Request Body:**
```json
{
  "userId": "user_id",
  "email": "user@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "User demoted from admin",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "role": "user"
  }
}
```

#### 8. Get All Users
```http
GET /v1/auth/get-all-users
```

**Authentication:** Required (Admin only)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by name or email

**Response:** `200 OK`
```json
{
  "success": true,
  "results": 10,
  "page": 1,
  "totalPages": 1,
  "totalUsers": 10,
  "data": [
    {
      "_id": "user_id",
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+2348012345678",
      "role": "user",
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 9. Get User by ID
```http
GET /v1/auth/get-user/:id
```

**Authentication:** Required (Admin only)

**Path Parameters:**
- `id`: User ID

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+2348012345678",
    "role": "user"
  }
}
```

#### 10. Get All Companies (Admin)
```http
GET /v1/auth/get-all-company
```

**Authentication:** Required (Admin only)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by company name, contact name, email, or phone
- `active` (optional): Filter by active status (`true`/`false`)

**Response:** `200 OK`
```json
{
  "success": true,
  "results": 2,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "totalCompanies": 2,
  "data": [
    {
      "_id": "company_id",
      "name": "John Manager",
      "email": "company@example.com",
      "companyName": "ABC Transport Ltd",
      "phoneNumber": "+2348012345678",
      "role": "company",
      "active": true,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

#### 11. Get All Vehicles (Admin)
```http
GET /v1/auth/get-all-vehicles
```

**Authentication:** Required (Admin only)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `search` (optional): Search by name, model, registration number, route, or terminal
- `companyId` (optional): Filter by company id
- `isAvailable` (optional): Filter by availability (`true`/`false`)
- `route` (optional): Filter by route (case-insensitive partial match)
- `terminal` (optional): Filter by terminal (case-insensitive partial match)
- `includeDeleted` (optional): Include soft-deleted vehicles (`true` to include; default excludes)

**Response:** `200 OK`
```json
{
  "success": true,
  "results": 10,
  "page": 1,
  "limit": 20,
  "totalPages": 1,
  "totalVehicles": 10,
  "data": [
    {
      "_id": "vehicle_id",
      "company": {
        "_id": "company_id",
        "companyName": "ABC Transport Ltd",
        "name": "John Manager",
        "email": "company@example.com",
        "phoneNumber": "+2348012345678",
        "role": "company"
      },
      "name": "Luxury Bus",
      "model": "2024",
      "type": "Bus",
      "registrationNumber": "ABC-123-XY",
      "terminal": "Lagos Terminal",
      "route": "Lagos - Abuja",
      "isAvailable": true,
      "seatCapacity": 50,
      "pricePerSeat": 5000,
      "defaultDepartureTime": "06:00",
      "isDeleted": false,
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

---

### Company Authentication Routes

**Base Path:** `/v1/company`

#### 1. Register Company
```http
POST /v1/company/register
```

**Request Body:**
```json
{
  "name": "John Manager",
  "email": "company@example.com",
  "companyName": "ABC Transport Ltd",
  "password": "password123",
  "confirmPassword": "password123",
  "phoneNumber": "+2348012345678"
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "message": "Company created. Check email to verify.",
  "token": "verification_token_here",
  "company": {
    "id": "company_id",
    "email": "company@example.com",
    "companyName": "ABC Transport Ltd",
    "name": "John Manager",
    "phoneNumber": "+2348012345678"
  }
}
```

#### 2. Verify Company Email
```http
GET /v1/company/verify-email?token=<verification_token>
```

**Query Parameters:**
- `token` (required): Verification token from email

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Company verified successfully"
}
```

#### 3. Login Company
```http
POST /v1/company/login
```

**Request Body:**
```json
{
  "email": "company@example.com",
  "password": "password123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "jwt_token_here",
    "company": {
      "id": "company_id",
      "name": "John Manager",
      "email": "company@example.com",
      "companyName": "ABC Transport Ltd",
      "role": "company",
      "phoneNumber": "+2348012345678"
    }
  }
}
```

#### 4. Forgot Company Password
```http
POST /v1/company/forgot-password
```

**Request Body:**
```json
{
  "email": "company@example.com"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "If an account with that email exists, a reset link has been sent."
}
```

#### 5. Reset Company Password
```http
POST /v1/company/reset-password
```

**Request Body:**
```json
{
  "token": "reset_token_from_email",
  "password": "newpassword123",
  "confirmPassword": "newpassword123"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Password reset successful. You can now log in."
}
```

---

### Vehicle Management Routes

**Base Path:** `/v1/vehicles`

**Authentication:** Required (Company only)

#### 1. Register Vehicle
```http
POST /v1/vehicles/register
```

**Request Body:**
```json
{
  "name": "Luxury Bus",
  "model": "2024",
  "type": "Bus",
  "registrationNumber": "ABC123XY",
  "terminal": "Lagos Terminal",
  "route": "Lagos - Abuja",
  "seatCapacity": 50,
  "pricePerSeat": 5000,
  "defaultDepartureTime": "06:00",
  "features": ["AC", "WiFi", "TV"],
  "images": [
    {
      "url": "https://example.com/image.jpg",
      "publicId": "image_id"
    }
  ],
  "notes": "Premium service",
  "createTrips": [
    {
      "departureDate": "2024-12-25",
      "departureTime": "06:00",
      "route": "Lagos - Abuja",
      "pricePerSeat": 5000,
      "status": "scheduled"
    }
  ]
}
```

**Response:** `201 Created`
```json
{
  "message": "Vehicle created",
  "vehicle": {
    "_id": "vehicle_id",
    "name": "Luxury Bus",
    "model": "2024",
    "type": "Bus",
    "registrationNumber": "ABC123XY",
    "company": "company_id",
    "seatCapacity": 50,
    "pricePerSeat": 5000
  },
  "tripsCreated": 1,
  "createdTrips": [...]
}
```

#### 2. List Company Vehicles
```http
GET /v1/vehicles/company-vehicles
```

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `q` (optional): Search by name, model, or registration number
- `isAvailable` (optional): Filter by availability (true/false)
- `route` (optional): Filter by route (case-insensitive regex)
- `terminal` (optional): Filter by terminal (case-insensitive regex)
- `sort` (optional): Sort field (default: "-createdAt")

**Response:** `200 OK`
```json
{
  "total": 10,
  "page": 1,
  "limit": 20,
  "pages": 1,
  "vehicles": [
    {
      "_id": "vehicle_id",
      "name": "Luxury Bus",
      "model": "2024",
      "type": "Bus",
      "registrationNumber": "ABC-123-XY",
      "seatCapacity": 50,
      "pricePerSeat": 5000
    }
  ]
}
```

#### 3. Update Vehicle
```http
PUT /v1/vehicles/update-vehicle/:id
```

**Path Parameters:**
- `id`: Vehicle ID

**Request Body:** (all fields optional)
```json
{
  "name": "Updated Bus Name",
  "seatCapacity": 60,
  "pricePerSeat": 6000,
  "features": ["AC", "WiFi", "TV", "USB Charging"]
}
```

**Response:** `200 OK`
```json
{
  "message": "Vehicle updated",
  "vehicle": {
    "_id": "vehicle_id",
    "name": "Updated Bus Name",
    "seatCapacity": 60,
    "pricePerSeat": 6000
  }
}
```

#### 4. Delete Vehicle
```http
DELETE /v1/vehicles/delete-vehicle/:id
```

**Path Parameters:**
- `id`: Vehicle ID

**Response:** `200 OK`
```json
{
  "message": "Vehicle soft-deleted",
  "id": "vehicle_id"
}
```

---

### Trip Management Routes

**Base Path:** `/v1/vehicles`

**Authentication:** Required (Company only)

#### 1. Create Trip for Vehicle
```http
POST /v1/vehicles/create-trip/:vehicleId
```

**Path Parameters:**
- `vehicleId`: Vehicle ID

**Request Body:**
```json
{
  "departureDate": "2024-12-25",
  "departureTime": "06:00",
  "route": "Lagos - Abuja",
  "pricePerSeat": 5000,
  "status": "scheduled",
  "notes": "Holiday trip",
  "metadata": {
    "special": true
  }
}
```

**Response:** `201 Created`
```json
{
  "message": "Trip created",
  "trip": {
    "_id": "trip_id",
    "vehicle": "vehicle_id",
    "company": "company_id",
    "departureDate": "2024-12-25T00:00:00.000Z",
    "departureTime": "06:00",
    "route": "Lagos - Abuja",
    "pricePerSeat": 5000,
    "availableSeats": 50
  }
}
```

---

### Public Trip Routes

**Base Path:** `/v1/trips`

#### 1. Get Trips (Public)
```http
GET /v1/trips
```

**Query Parameters:**
- `from` (optional): Origin city
- `to` (optional): Destination city
- `route` (optional): Full route string (e.g., "Lagos - Abuja")
- `date` (optional): Departure date (YYYY-MM-DD)
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 20)
- `minSeats` (optional): Minimum available seats
- `priceMin` (optional): Minimum price
- `priceMax` (optional): Maximum price
- `sort` (optional): Sort field - `price`, `time`, or `departureDate` (default: `departureDate`)

**Response:** `200 OK`
```json
{
  "total": 25,
  "page": 1,
  "limit": 20,
  "pages": 2,
  "trips": [
    {
      "tripId": "trip_id",
      "company": {
        "id": "company_id",
        "name": "ABC Transport Ltd",
        "logoUrl": "https://example.com/logo.png"
      },
      "vehicle": {
        "id": "vehicle_id",
        "name": "Luxury Bus",
        "model": "2024",
        "type": "Bus"
      },
      "route": {
        "from": "Lagos",
        "to": "Abuja",
        "display": "Lagos - Abuja",
        "terminalFrom": "Lagos Terminal",
        "terminalTo": null
      },
      "departure": {
        "date": "2024-12-25",
        "time": "06:00",
        "combined": "2024-12-25T06:00:00.000Z"
      },
      "arrival": {
        "time": "14:30",
        "combined": "2024-12-25T14:30:00.000Z",
        "duration": "8h30m"
      },
      "price": {
        "amount": 5000,
        "currency": "NGN",
        "display": "₦5,000"
      },
      "availableSeats": 45,
      "features": ["AC", "WiFi", "TV"],
      "isAvailable": true,
      "cta": {
        "label": "Book Now",
        "actionUrl": "/book/trip_id"
      }
    }
  ]
}
```

#### 2. Get Trip by ID
```http
GET /v1/trips/:id
```

**Path Parameters:**
- `id`: Trip ID

**Response:** `200 OK`
```json
{
  "tripId": "trip_id",
  "company": {
    "id": "company_id",
    "name": "ABC Transport Ltd",
    "logoUrl": "https://example.com/logo.png"
  },
  "vehicle": {
    "id": "vehicle_id",
    "name": "Luxury Bus",
    "model": "2024",
    "type": "Bus",
    "registrationNumber": "ABC-123-XY",
    "terminal": "Lagos Terminal"
  },
  "route": "Lagos - Abuja",
  "departure": {
    "date": "2024-12-25",
    "time": "06:00",
    "combined": "2024-12-25T06:00:00.000Z"
  },
  "arrival": {
    "combined": "2024-12-25T14:30:00.000Z",
    "duration": "8h30m"
  },
  "price": {
    "amount": 5000,
    "currency": "NGN",
    "display": "₦5,000"
  },
  "availableSeats": 45,
  "seats": [
    {
      "seatNumber": "1A",
      "isAvailable": true
    },
    {
      "seatNumber": "1B",
      "isAvailable": false
    }
  ],
  "status": "scheduled",
  "notes": "Holiday trip",
  "metadata": {}
}
```

#### 3. Book Trip
```http
POST /v1/trips/:id/book
```

**Authentication:** Required (User)

**Path Parameters:**
- `id`: Trip ID

**Request Body:**
```json
{
  "seatNumbers": ["1A", "1B"],
  "seatsCount": 2,
  "customer": {
    "name": "John Doe",
    "phone": "+2348012345678",
    "email": "john@example.com"
  },
  "paymentMethod": "card",
  "email": "john@example.com",
  "callbackUrl": "https://example.com/payment-callback"
}
```

**Note:** Either `seatNumbers` (array) or `seatsCount` (number) is required. `seatNumbers` takes precedence.

**Response:** `200 OK`
```json
{
  "message": "Payment initialization successful",
  "booking": {
    "id": "booking_id",
    "reference": "BOOK-REF-123456",
    "totalAmount": 10000,
    "seats": ["1A", "1B"]
  },
  "payment": {
    "authorizationUrl": "https://checkout.paystack.com/authorization_url",
    "accessCode": "access_code_here",
    "reference": "BOOK-REF-123456"
  },
  "callbackUrl": "https://example.com/payment-callback"
}
```

#### 4. Verify Booking Payment
```http
POST /v1/trips/:id/verify-payment
```

**Authentication:** Required (User)

**Request Body:**
```json
{
  "reference": "BOOK-REF-123456"
}
```

**Response:** `200 OK`
```json
{
  "message": "Booking confirmed successfully",
  "booking": {
    "_id": "booking_id",
    "reference": "BOOK-REF-123456",
    "status": "confirmed",
    "paymentStatus": "paid",
    "seatNumbers": ["1A", "1B"],
    "totalAmount": 10000
  },
  "payment": {
    "status": "success",
    "reference": "BOOK-REF-123456",
    "amount": 10000,
    "paidAt": "2024-12-25T10:00:00.000Z"
  }
}
```

#### 5. Get User Trips
```http
GET /v1/trips/user-trips
```

**Authentication:** Required (User)

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `status` (optional): Booking status - `pending`, `confirmed`, `cancelled`, `completed`
- `paymentStatus` (optional): Payment status - `pending`, `paid`, `failed`, `refunded`
- `dateFrom` (optional): Filter from date (YYYY-MM-DD)
- `dateTo` (optional): Filter to date (YYYY-MM-DD)
- `sortBy` (optional): Sort field - `createdAt`, `departureDate`, `totalAmount`, `updatedAt` (default: `createdAt`)
- `sortOrder` (optional): Sort order - `asc` or `desc` (default: `desc`)

**Response:** `200 OK`
```json
{
  "total": 5,
  "page": 1,
  "limit": 10,
  "pages": 1,
  "trips": [
    {
      "bookingId": "booking_id",
      "reference": "BOOK-REF-123456",
      "trip": {
        "id": "trip_id",
        "route": {
          "from": "Lagos",
          "to": "Abuja",
          "display": "Lagos - Abuja"
        },
        "departure": {
          "date": "2024-12-25",
          "time": "06:00",
          "combined": "2024-12-25T06:00:00.000Z"
        },
        "arrival": {
          "time": "14:30",
          "combined": "2024-12-25T14:30:00.000Z",
          "duration": "8h30m"
        }
      },
      "company": {
        "id": "company_id",
        "name": "ABC Transport Ltd",
        "logoUrl": "https://example.com/logo.png"
      },
      "vehicle": {
        "id": "vehicle_id",
        "name": "Luxury Bus",
        "model": "2024",
        "type": "Bus",
        "registrationNumber": "ABC-123-XY"
      },
      "bookingDetails": {
        "seatNumbers": ["1A", "1B"],
        "seats": 2,
        "pricePerSeat": 5000,
        "totalAmount": 10000,
        "currency": "NGN",
        "displayAmount": "₦10,000"
      },
      "customer": {
        "name": "John Doe",
        "phone": "+2348012345678",
        "email": "john@example.com"
      },
      "status": {
        "booking": "confirmed",
        "payment": "paid"
      },
      "payment": {
        "method": "card",
        "reference": "BOOK-REF-123456",
        "paidAt": "2024-12-25T10:00:00.000Z"
      },
      "dates": {
        "bookedAt": "2024-12-24T15:00:00.000Z",
        "updatedAt": "2024-12-24T15:05:00.000Z"
      },
      "actions": {
        "canCancel": true,
        "canModify": true,
        "canViewReceipt": true
      }
    }
  ],
  "filters": {
    "status": "all",
    "dateFrom": null,
    "dateTo": null,
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
}
```

#### 6. Payment Webhook
```http
POST /v1/trips/webhook
```

**Headers:**
- `x-paystack-signature`: Paystack webhook signature

**Request Body:** (Paystack webhook payload)

**Response:** `200 OK`

This endpoint processes Paystack payment webhooks and automatically confirms bookings when payment is successful.

---

## Data Models

### User Model

```javascript
{
  _id: ObjectId,
  name: String (required, trimmed),
  email: String (required, unique, lowercase, validated),
  phone: String (required, unique, trimmed, validated),
  password: String (required, minlength: 6, hashed),
  role: String (enum: ['user', 'admin'], default: 'user'),
  active: Boolean (default: true),
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Company Model

```javascript
{
  _id: ObjectId,
  name: String (required, trimmed),
  email: String (required, unique, lowercase, validated),
  companyName: String (required, trimmed),
  password: String (required, minlength: 6, hashed),
  phoneNumber: String (required, trimmed),
  role: String (enum: ['company', 'admin'], default: 'company'),
  active: Boolean (default: false),
  passwordResetToken: String,
  passwordResetExpires: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### Vehicle Model

```javascript
{
  _id: ObjectId,
  company: ObjectId (ref: 'Company', required, indexed),
  name: String (required, trimmed),
  model: String (required, trimmed),
  type: String (required, trimmed),
  registrationNumber: String (required, trimmed, unique per company),
  terminal: String (required, trimmed),
  route: String (required, trimmed),
  isAvailable: Boolean (default: true, indexed),
  seatCapacity: Number (required, min: 1),
  pricePerSeat: Number (required, min: 0),
  defaultDepartureTime: String (trimmed, default: '06:00'),
  isDeleted: Boolean (default: false, indexed),
  deletedAt: Date,
  features: [String] (default: []),
  images: [{
    url: String,
    publicId: String
  }] (default: []),
  notes: String (trimmed),
  version: Number (default: 1),
  createdAt: Date,
  updatedAt: Date
}
```

### Trip Model

```javascript
{
  _id: ObjectId,
  company: ObjectId (ref: 'Company', required, indexed),
  vehicle: ObjectId (ref: 'Vehicle', required, indexed),
  departureDate: Date (required, indexed),
  departureTime: String (required, trimmed, format: 'HH:mm'),
  route: String (required, trimmed),
  pricePerSeat: Number (required, min: 0),
  seatCapacity: Number (required, min: 1),
  availableSeats: Number (required, min: 0),
  bookingsCount: Number (default: 0, min: 0),
  seats: [{
    seatNumber: String (required, trimmed),
    isAvailable: Boolean (default: true, indexed),
    bookingId: ObjectId (ref: 'Booking', default: null)
  }] (default: []),
  status: String (enum: ['draft', 'scheduled', 'cancelled', 'completed'], default: 'scheduled', indexed),
  durationMinutes: Number (default: null),
  arrivalDatetime: Date (default: null),
  inheritedFromVehicleVersion: Number (required),
  returnOf: ObjectId (ref: 'Trip', default: null),
  notes: String (trimmed),
  metadata: Object (default: {}),
  isDeleted: Boolean (default: false, indexed),
  deletedAt: Date,
  createdAt: Date,
  updatedAt: Date,
  
  // Virtual fields
  combinedDeparture: Date (computed),
  computedArrival: Date (computed)
}
```

### Booking Model

```javascript
{
  _id: ObjectId,
  company: ObjectId (ref: 'Company', required, indexed),
  trip: ObjectId (ref: 'Trip', required, indexed),
  vehicle: ObjectId (ref: 'Vehicle', required),
  user: ObjectId (ref: 'User', default: null),
  seatNumbers: [String] (required),
  seats: Number (required, min: 1),
  pricePerSeat: Number (required, min: 0),
  totalAmount: Number (required, min: 0),
  customer: {
    name: String (required),
    phone: String (required),
    email: String (default: '')
  },
  paymentMethod: String (default: 'unpaid'),
  paymentStatus: String (enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending'),
  reference: String (required, unique),
  status: String (enum: ['pending', 'confirmed', 'cancelled'], default: 'confirmed', indexed),
  paymentDetails: {
    gateway: String,
    reference: String,
    channel: String,
    paidAt: Date
  },
  paidAt: Date,
  metadata: Object (default: {}),
  createdAt: Date,
  updatedAt: Date
}
```

---

## Error Handling

### Error Response Format

All errors follow a consistent format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

### HTTP Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data or parameters
- `401 Unauthorized`: Authentication required or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (e.g., duplicate entry, seats unavailable)
- `500 Internal Server Error`: Server error

### Common Error Messages

#### Authentication Errors

- `"Not authenticated: token missing"` - No token provided
- `"Invalid token format"` - Malformed token
- `"Invalid or expired token"` - Token verification failed
- `"Invalid token payload"` - Token structure invalid
- `"User no longer exists"` - User deleted
- `"Account not active"` - Account not verified
- `"Account not verified. Please verify your email."` - Email not verified
- `"Incorrect email or password"` - Invalid credentials
- `"You are not authorized to access this"` - Insufficient permissions
- `"Not authorized as a company (no token)"` - Company token missing
- `"Not authorized as a company (token invalid or expired)"` - Invalid company token
- `"Not authorized (company not found)"` - Company not found

#### Validation Errors

- `"Name is required"` - Missing name field
- `"Email is required"` - Missing email field
- `"Invalid email"` - Invalid email format
- `"Email already registered"` - Email already exists
- `"Phone is required"` - Missing phone field
- `"Invalid phone number"` - Invalid phone format
- `"Password is required"` - Missing password
- `"Password must be at least 6 characters"` - Password too short
- `"Passwords do not match"` - Password confirmation mismatch
- `"All fields are required"` - Missing required fields
- `"Token is required"` - Missing token parameter
- `"Invalid date"` - Invalid date format
- `"Invalid trip id"` - Invalid trip ID format
- `"Invalid vehicle id"` - Invalid vehicle ID format
- `"Invalid vehicleId"` - Invalid vehicle ID parameter
- `"Invalid seats count"` - Invalid seat count
- `"Invalid departureDate"` - Invalid departure date
- `"departureTime must be 'HH:mm'"` - Invalid time format
- `"departureTime hour must be 00-23 and minutes 00-59."` - Invalid time range

#### Business Logic Errors

- `"Trip not found"` - Trip doesn't exist or is deleted
- `"Vehicle not found or not owned by your company"` - Vehicle access denied
- `"Vehicle not found or already deleted"` - Vehicle deleted
- `"User not found"` - User doesn't exist
- `"Company not found"` - Company doesn't exist
- `"User already verified"` - Email already verified
- `"Company already verified"` - Company email already verified
- `"Token is invalid or has expired"` - Password reset token expired
- `"Trip is not schedulable"` - Trip status invalid for booking
- `"Not enough seats available"` - Insufficient seats
- `"Seats not available: 1A, 1B"` - Specific seats unavailable
- `"Not enough available seats to auto-assign"` - Cannot auto-assign seats
- `"Duplicate seat numbers in request"` - Duplicate seats selected
- `"A trip for this vehicle at that date/time already exists"` - Duplicate trip
- `"A vehicle with that registrationNumber already exists for your company"` - Duplicate registration
- `"Trip no longer available"` - Trip status changed
- `"Seats no longer available: 1A"` - Seats taken during payment
- `"Failed to reserve seats"` - Seat reservation failed
- `"Payment reference is required"` - Missing payment reference
- `"Payment failed: gateway_response"` - Payment verification failed
- `"Booking not found"` - Booking doesn't exist
- `"Booking already confirmed"` - Booking already processed
- `"Payment initialization failed: error_message"` - Payment initialization error
- `"Payment verification failed: error_message"` - Payment verification error

#### Server Errors

- `"Server error"` - Generic server error
- `"Server configuration error: JWT secret missing"` - Configuration error
- `"Could not send reset email. Try again later."` - Email service error
- `"Failed to fetch user trips"` - Database query error

---

## Query Parameters Reference

### Pagination

All list endpoints support pagination:

- `page`: Page number (default: 1, minimum: 1)
- `limit`: Items per page (default varies by endpoint)

### Trip Search (`GET /v1/trips`)

- `from`: Origin city (case-insensitive partial match)
- `to`: Destination city (case-insensitive partial match)
- `route`: Full route string (case-insensitive partial match)
- `date`: Departure date (YYYY-MM-DD format)
- `minSeats`: Minimum available seats (number)
- `priceMin`: Minimum price per seat (number)
- `priceMax`: Maximum price per seat (number)
- `sort`: Sort field - `price`, `time`, or `departureDate` (default: `departureDate`)

### Vehicle Search (`GET /v1/vehicles/company-vehicles`)

- `q`: Search by name, model, or registration number (case-insensitive)
- `isAvailable`: Filter by availability (`true`/`false`)
- `route`: Filter by route (case-insensitive partial match)
- `terminal`: Filter by terminal (case-insensitive partial match)
- `sort`: Sort field (default: `-createdAt`)

### User Trips Filter (`GET /v1/trips/user-trips`)

- `status`: Booking status - `pending`, `confirmed`, `cancelled`, `completed`
- `paymentStatus`: Payment status - `pending`, `paid`, `failed`, `refunded`
- `dateFrom`: Filter from date (YYYY-MM-DD)
- `dateTo`: Filter to date (YYYY-MM-DD)
- `sortBy`: Sort field - `createdAt`, `departureDate`, `totalAmount`, `updatedAt` (default: `createdAt`)
- `sortOrder`: Sort order - `asc` or `desc` (default: `desc`)

### User Management (`GET /v1/auth/get-all-users`)

- `search`: Search by name or email (case-insensitive)
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20)

---

## Notes

1. **Email Verification**: Users and companies must verify their email before they can log in. Verification tokens expire after 1 hour.

2. **Password Reset**: Password reset tokens expire after 1 hour. Reset links are sent via email.

3. **Soft Deletes**: Vehicles and trips use soft deletes (marked as deleted, not removed from database).

4. **Seat Reservation**: Seats are only reserved after successful payment verification. The booking process creates a pending booking, and seats are marked as unavailable after payment confirmation.

5. **Payment Integration**: The API integrates with Paystack for payment processing. Payment webhooks automatically confirm bookings.

6. **Date Format**: All dates should be in ISO 8601 format (YYYY-MM-DD) or ISO datetime strings.

7. **Time Format**: Departure times must be in `HH:mm` format (24-hour format, e.g., "06:00", "14:30").

8. **Currency**: All prices are in NGN (Nigerian Naira).

9. **Authentication**: User tokens and company tokens are separate and cannot be used interchangeably.

10. **Rate Limiting**: Currently not implemented. Consider adding rate limiting for production use.

---

## Environment Variables

Required environment variables:

```
PORT=3050
JWT_SECRET=your_jwt_secret_key
MONGODB_URI=your_mongodb_connection_string
FRONTEND_URL=http://localhost:3000
PAYSTACK_SECRET_KEY=your_paystack_secret_key
PAYSTACK_PUBLIC_KEY=your_paystack_public_key
EMAIL_USERNAME=your_email_username
EMAIL_PASSWORD=your_email_password
```

---

## Support

For issues or questions, please contact the development team or refer to the project repository.

