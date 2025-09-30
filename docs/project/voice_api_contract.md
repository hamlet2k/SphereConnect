# 🎙️ Voice-Eligible API Contract

This document defines the subset of API endpoints eligible for voice command integration.  
Endpoints use **strict HTTP methods**, **precise response codes**, and **rich JSON responses** with contextual messages.

---

## ✅ Candidate Endpoints

### 🎯 Objectives

#### Create Objective
- **Method:** `POST /api/objectives`
- **Success (201 Created):**
  ```json
  {
    "status": "success",
    "code": 201,
    "message": "Objective created successfully.",
    "objective_id": "uuid"
  }
  ```
- **Error (400 Bad Request):**
  ```json
  {
    "status": "error",
    "code": 400,
    "message": "Invalid input: description field required."
  }
  ```

#### Update Objective
- **Method:** `PATCH /api/objectives/{id}`
- **Success (200 OK):**
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Objective updated successfully."
  }
  ```

---

### 🪖 Ranks

#### Assign Rank to User
- **Method:** `PATCH /api/admin/users/{user_id}/rank`
- **Success (200 OK):**
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Rank 'Lieutenant' assigned to user 'hamlet3k'."
  }
  ```
- **Error (403 Forbidden):**
  ```json
  {
    "status": "error",
    "code": 403,
    "message": "You do not have permission to assign ranks."
  }
  ```

#### Delete Rank
- **Method:** `DELETE /api/admin/ranks/{id}`
- **Success (200 OK):**
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Rank deleted successfully and removed from all objectives."
  }
  ```
- **Error (409 Conflict):**
  ```json
  {
    "status": "error",
    "code": 409,
    "message": "Cannot delete rank: 3 user(s) are still assigned."
  }
  ```

---

### 📂 Categories

#### Create Category
- **Method:** `POST /api/categories`
- **Success (201 Created):**
  ```json
  {
    "status": "success",
    "code": 201,
    "message": "Category 'Logistics' created successfully.",
    "category_id": "uuid"
  }
  ```

#### Delete Category
- **Method:** `DELETE /api/categories/{id}`
- **Success (200 OK):**
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Category 'Logistics' deleted. Unlinked from 5 objectives."
  }
  ```

---

### 👥 Users

#### Create Invite
- **Method:** `POST /api/invites`
- **Success (201 Created):**
  ```json
  {
    "status": "success",
    "code": 201,
    "message": "Invite created for guild 'Stanton Fleet'.",
    "invite_code": "ABC123"
  }
  ```

#### Join Guild
- **Method:** `POST /api/users/{id}/join`
- **Success (200 OK):**
  ```json
  {
    "status": "success",
    "code": 200,
    "message": "Join request submitted for guild 'Stanton Fleet'. Awaiting approval."
  }
  ```

---

## 🔑 Conventions

- **Always include:**
  - `status`: "success" or "error"
  - `code`: HTTP status code (integer)
  - `message`: Human/voice-friendly description

- **HTTP methods:**
  - `POST` for creation
  - `PATCH` for updates
  - `DELETE` for deletion
  - `GET` for read

- **Error codes:**
  - `400` = bad input
  - `403` = permission denied
  - `404` = not found
  - `409` = conflict (e.g., rank in use)
