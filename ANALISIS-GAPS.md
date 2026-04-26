# ANALISIS EXHAUSTIVO - Bibliotech Premium

> Análisis completo de funcionalidades faltantes e incompletas. Fecha: 2026-04-25

---

## Lo que FUNCIONA (✓)

### Backend - Rutas implementadas y funcionando

| Módulo | Ruta | Método | Estado | Archivo |
|--------|------|--------|--------|---------|
| **Auth** | `/api/v1/auth/register` | POST | ✓ | `routes.auth.ts` |
| **Auth** | `/api/v1/auth/login` | POST | ✓ | `routes.auth.ts` |
| **Auth** | `/api/v1/auth/refresh` | POST | ✓ | `routes.auth.ts` |
| **Auth** | `/api/v1/auth/me` | GET | ✓ | `routes.auth.ts` |
| **Books** | `/api/v1/books/` | GET | ✓ | `routes.books.ts` |
| **Books** | `/api/v1/books/:id` | GET | ✓ | `routes.books.ts` |
| **Books** | `/api/v1/books/` | POST | ✓ | `routes.books.ts` |
| **Books** | `/api/v1/books/:id` | PUT | ✓ | `routes.books.ts` |
| **Books** | `/api/v1/books/:id` | DELETE | ✓ | `routes.books.ts` |
| **Loans** | `/api/v1/loans/` | POST | ✓ | `routes.loans.ts` |
| **Loans** | `/api/v1/loans/my` | GET | ✓ | `routes.loans.ts` |
| **Loans** | `/api/v1/loans/:id/renew` | POST | ✓ | `routes.loans.ts` |
| **Loans** | `/api/v1/loans/:id/return` | POST | ✓ | `routes.loans.ts` |
| **Loans** | `/api/v1/loans/overdue` | GET | ✓ | `routes.loans.ts` |
| **Branches** | `/api/v1/branches/` | GET | ✓ | `routes.branches.ts` |
| **Branches** | `/api/v1/branches/:id` | GET | ✓ | `routes.branches.ts` |
| **Branches** | `/api/v1/branches/` | POST | ✓ | `routes.branches.ts` |
| **Branches** | `/api/v1/branches/:id` | PUT | ✓ | `routes.branches.ts` |
| **Branches** | `/api/v1/branches/:id` | DELETE | ✓ | `routes.branches.ts` |
| **Copies** | `/api/v1/copies/` | GET | ✓ | `routes.copies.ts` |
| **Copies** | `/api/v1/copies/:id` | GET | ✓ | `routes.copies.ts` |
| **Copies** | `/api/v1/copies/` | POST | ✓ | `routes.copies.ts` |
| **Copies** | `/api/v1/copies/:id` | PUT | ✓ | `routes.copies.ts` |
| **Copies** | `/api/v1/copies/:id/transfer` | POST | ✓ | `routes.copies.ts` |

### Frontend - Páginas y Features implementadas

| Feature | Página | Estado | Archivo |
|---------|--------|--------|---------|
| **Login** | LoginPage | ✓ | `LoginPage.tsx` |
| **Register** | RegisterPage | ✓ | `RegisterPage.tsx` |
| **Logout** | MainLayout (botón) | ✓ | `MainLayout.tsx` |
| **Catálogo** | CatalogPage | ✓ | `CatalogPage.tsx` |
| **Detalle de Libro** | BookDetailPage | ✓ | `BookDetailPage.tsx` |
| **Mis Préstamos** | MyLoansPage | ✓ | `MyLoansPage.tsx` |
| **Dashboard Admin** | DashboardPage | ✓ | `DashboardPage.tsx` |
| **Gestión Usuarios** | UsersPage | ✓ (mock) | `UsersPage.tsx` |
| **Gestión Libros** | AdminBooksPage | ✓ (parcial) | `AdminBooksPage.tsx` |
| **Gestión Sucursales** | AdminBranchesPage | ✓ (parcial) | `AdminBranchesPage.tsx` |
| **Reportes** | ReportsPage | ✓ (parcial) | `ReportsPage.tsx` |

---

## Lo que FALTA o está INCOMPLETO (✗)

### CRITICAL (bloquea uso básico)

1. **NO EXISTE módulo de Usuarios en backend**
   - No hay `routes.users.ts` en `backend/src/modules/`
   - No hay `GET /api/v1/users` - lista de usuarios
   - No hay `GET /api/v1/users/:id` - detalle de usuario
   - No hay `PUT /api/v1/users/:id` - actualizar usuario
   - No hay `DELETE /api/v1/users/:id` - desactivar usuario
   - **El UsersPage del frontend usa DATOS MOCKEADOS** (`UsersPage.tsx:18-22`)

2. **NO EXISTE módulo de Reservaciones**
   - No hay `routes.reservations.ts`
   - No hay endpoints de reservas en el backend
   - Frontend no tiene página de reservas
   - El schema tiene `Reservation` model pero no se usa

3. **NO EXISTE sistema de Borrowing (Préstamo para miembros)**
   - El endpoint `POST /api/v1/loans/` requiere rol ADMIN/LIBRARIAN
   - Un miembro NO puede tomarse un libro por sí mismo
   - No hay botón "Tomar prestado" en BookDetailPage
   - El flujo completo de self-service borrowing no existe

4. **UI de Crear/Editar Libros es PLACEHOLDER**
   - `AdminBooksPage.tsx` tiene botón "Agregar Libro" que no hace nada
   - `AdminBooksPage.tsx` tiene botón "Editar" que no hace nada
   - No existen `BookFormPage.tsx` o modales

5. **UI de Crear/Editar Sucursales es PLACEHOLDER**
   - `AdminBranchesPage.tsx` tiene botón "Agregar Sucursal" que no hace nada
   - `AdminBranchesPage.tsx` tiene botón "Editar" que no hace nada

---

### IMPORTANT (debería tener pero no bloquea)

#### Backend - Rutas que faltan

| Módulo | Ruta | Método | Problema |
|--------|------|--------|----------|
| **Auth** | `/api/v1/auth/logout` | POST | No existe endpoint de logout (solo client-side) |
| **Auth** | `/api/v1/auth/password-reset` | POST | No existe reset de password |
| **Auth** | `/api/v1/auth/change-password` | POST | No existe cambio de password |
| **Loans** | `/api/v1/loans/` | GET | No existe lista general de loans (solo /my y /overdue) |
| **Loans** | `/api/v1/loans/:id` | GET | No existe detalle de un loan |
| **Loans** | `/api/v1/loans/history` | GET | No existe historial de loans para usuarios |
| **Users** | `/api/v1/users/` | GET | NO EXISTE |
| **Users** | `/api/v1/users/:id` | GET/PUT/DELETE | NO EXISTE |
| **Authors** | `/api/v1/authors/` | CRUD | NO EXISTE - Solo se crean implícitamente con libros |
| **Genres** | `/api/v1/genres/` | CRUD | NO EXISTE - Solo se usan preexistentes |
| **Reservations** | `/api/v1/reservations/` | CRUD | NO EXISTE |
| **Reviews** | `/api/v1/reviews/` | CRUD | NO EXISTE (libros tienen reviews en schema) |
| **Fines** | `/api/v1/fines/` | GET/POST | NO EXISTE (se crean automáticamente al devolver) |

#### Frontend - API calls que faltan

| API | Método | Estado |
|-----|--------|--------|
| `authApi.logout` | POST | No existe (solo limpieza localStorage) |
| `usersApi.getAll` | GET | NO EXISTE en `api.ts` |
| `usersApi.getById` | GET | NO EXISTE |
| `usersApi.update` | PUT | NO EXISTE |
| `usersApi.delete` | DELETE | NO EXISTE |
| `booksApi.create` | POST | NO EXISTE |
| `booksApi.update` | PUT | NO EXISTE |
| `booksApi.delete` | DELETE | NO EXISTE |
| `loansApi.create` | POST | NO EXISTE |
| `loansApi.getOverdue` | GET | NO EXISTE |
| `loansApi.getHistory` | GET | NO EXISTE |
| `branchesApi.getById` | GET | NO EXISTE |
| `branchesApi.create` | POST | NO EXISTE |
| `branchesApi.update` | PUT | NO EXISTE |
| `branchesApi.delete` | DELETE | NO EXISTE |
| `copiesApi.create` | POST | NO EXISTE |
| `copiesApi.update` | PUT | NO EXISTE |
| `copiesApi.transfer` | POST | NO EXISTE |

---

### NICE TO HAVE (gaps menores)

#### Backend

1. **Enums deberían ser enums, no strings**:
   - `User.role` - String en vez de enum (ADMIN, LIBRARIAN, MEMBER)
   - `Copy.status` - String en vez de enum (AVAILABLE, LOANED, RESERVED, MAINTENANCE, TRANSFERRED, LOST, DAMAGED)
   - `Copy.condition` - String en vez de enum (NEW, GOOD, FAIR, POOR)
   - `Loan.status` - No existe campo, se infiere de `returnDate`
   - `Fine.status` - String en vez de enum (PENDING, PAID, CANCELLED)
   - `Review.status` - String en vez de enum (PENDING, APPROVED, REJECTED)
   - `Reservation.status` - String en vez de enum (WAITING, READY, EXPIRED, CANCELLED)

2. **Campos faltantes en modelos**:
   - `User.phone` - No existe
   - `User.avatarUrl` - No existe
   - `Book.dimensions` - No existe
   - `Book.averageRating` - No existe (se calcula de reviews)
   - `Branch.description` - No existe
   - `Branch.managerId` - No existe (relación a User)
   - `Copy.lostDate` - No existe para marcar perdidos
   - `Copy.notes` - No existe para notas

3. **No hay sistema de reservas**:
   - Un usuario no puede reservar un libro prestado
   - No hay cola de espera

4. **No hay Reviews aprobados/rechazados**:
   - Las reviews se crean pero no hay endpoint para gestionarlas
   - No hay filtro de palabras inapropiadas funcional

5. **Reports no están implementados**:
   - El backend no tiene endpoints para `/reports/popular`, `/reports/morosity`, `/reports/movement`

#### Frontend

1. No hay página de perfil de usuario
2. No hay página de historial de préstamos
3. No hay modal/formulario de crear libro
4. No hay modal/formulario de editar libro
5. No hay modal/formulario de crear sucursal
6. No hay modal/formulario de editar sucursal
7. ReportsPage no carga datos reales
8. No hay página de autores
9. No hay página de géneros
10. El logout solo limpia localStorage - no llama a backend

---

## Database Issues (Schema Prisma)

### Model User

```prisma
// ACTUAL (problema):
role         String    @default("MEMBER")  // ❌ String, no enum

// DEBERÍA SER:
role         UserRole  @default(MEMBER)

// FALTAN CAMPOS:
phone        String?   // ❌ No existe
avatarUrl    String?   // ❌ No existe
```

### Model Copy

```prisma
// ACTUAL (problema):
status       String    @default("AVAILABLE")  // ❌ String, no enum
condition    String    @default("GOOD")       // ❌ String, no enum

// FALTAN CAMPOS:
lostDate     DateTime?  // ❌ No existe para marcar perdidos
notes        String?    // ❌ No existe para notas del staff
```

### Model Loan

```prisma
// PROBLEMA: No tiene status, se infiere de returnDate
// Un loan sin returnDate = ACTIVO
// Un loan con returnDate = DEVUELTO

// DEBERÍA TENER:
status       LoanStatus @default(ACTIVE)
```

### Model Fine

```prisma
// ACTUAL (problema):
status       String  @default("PENDING")  // ❌ String, no enum

// DEBERÍA SER:
status       FineStatus @default(PENDING)
```

### Model Reservation

```prisma
// ACTUAL (problema):
status       String  @default("WAITING")  // ❌ String, no enum

// FALTAN CAMPOS:
notifyCount  Int     @default(0)    // ❌ Cuántas veces se notificó
reminderSent Boolean @default(false) // ❌ Si se envió recordatorio
```

### Model Review

```prisma
// ACTUAL (problema):
status       String  @default("PENDING")  // ❌ String, no enum

// DEBERÍA SER:
status       ReviewStatus @default(PENDING)
```

---

## Resumen de Gaps por Feature

### 1. Authentication ✓ (parcial)

- ✓ Login funciona
- ✓ Register funciona
- ✓ JWT refresh funciona (en interceptor)
- ✓ Protected routes funcionan
- ✗ Logout no llama backend
- ✗ No hay password reset
- ✗ No hay email verification

### 2. Books/Catalog ✓ (parcial)

- ✓ Browse books funciona
- ✓ Search funciona
- ✓ Filter by genre funciona
- ✓ View book details funciona
- ✗ Create book (admin) - UI no existe
- ✗ Edit book (admin) - UI no existe
- ✗ Delete book (admin) - Backend existe, UI no
- ✗ Manage copies - UI no existe

### 3. Loans/Borrowing ✗ (incompleto)

- ✓ View my loans funciona
- ✗ Borrow a book - NO EXISTE UI, endpoint requiere admin
- ✗ Return a book - Endpoint existe, UI no
- ✓ Renew a loan funciona
- ✗ View loan history - NO EXISTE
- ✓ Late fee handling - Backend lo calcula al devolver

### 4. Branches ✓ (parcial)

- ✓ View all branches funciona
- ✗ View branch details - Endpoint existe, UI no
- ✗ Create branch (admin) - UI placeholder
- ✗ Edit branch (admin) - UI placeholder
- ✗ Assign copies to branches - Transfer endpoint existe en backend

### 5. Users/Members ✗ (NO IMPLEMENTADO)

- ✓ View users list (admin) - USA DATOS MOCK
- ✗ View user details - NO EXISTE
- ✗ Create user (admin) - NO EXISTE
- ✗ Edit user role (admin) - NO EXISTE
- ✗ Deactivate user (admin) - NO EXISTE
- ✗ User profile management - NO EXISTE

### 6. Reports ✗ (NO IMPLEMENTADO)

- ✓ Dashboard stats funciona (básico)
- ✗ Loan history report - NO EXISTE
- ✗ Overdue report - Endpoint existe, frontend no lo usa
- ✗ Popular books report - NO EXISTE
- ✗ Revenue report - NO EXISTE

### 7. Copies ✗ (parcial)

- ✓ View copies per book funciona (en detalle)
- ✗ Copy status tracking - Backend tiene status, UI no
- ✗ Create copy - Backend existe, UI no
- ✗ Transfer copy between branches - Backend existe, UI no
- ✗ Mark copy as lost/damaged - NO EXISTE

### 8. Reservations ✗ (NO EXISTE)

- ✗ Ningún endpoint de reservas
- ✗ Ninguna UI de reservas
- ✗ Sistema de cola de espera no existe

### 9. Reviews ✗ (NO IMPLEMENTADO)

- ✗ No hay endpoints de reviews
- ✗ UI no puede crear review
- ✗ Admin no puede aprobar/rechazar reviews

---

## Archivos Analizados

### Backend

- `backend/src/app.ts` - Fastify app setup
- `backend/src/main.ts` - Route registration
- `backend/src/modules/auth/routes.auth.ts` - Auth endpoints
- `backend/src/modules/auth/schemas/auth.schema.ts` - Auth validation
- `backend/src/modules/books/routes.books.ts` - Book CRUD
- `backend/src/modules/books/schemas/book.schema.ts` - Book validation
- `backend/src/modules/loans/routes.loans.ts` - Loan management
- `backend/src/modules/loans/schemas/loan.schema.ts` - Loan validation
- `backend/src/modules/branches/routes.branches.ts` - Branch CRUD
- `backend/src/modules/branches/schemas/branch.schema.ts` - Branch validation
- `backend/src/modules/copies/routes.copies.ts` - Copy management
- `backend/src/modules/copies/schemas/copy.schema.ts` - Copy validation
- `backend/src/shared/middleware/auth.ts` - Auth middleware
- `backend/prisma/schema.prisma` - Database schema

### Frontend

- `frontend/src/App.tsx` - Route definitions
- `frontend/src/lib/api.ts` - API client
- `frontend/src/stores/authStore.ts` - Auth state
- `frontend/src/features/auth/pages/LoginPage.tsx`
- `frontend/src/features/auth/pages/RegisterPage.tsx`
- `frontend/src/features/books/pages/CatalogPage.tsx`
- `frontend/src/features/books/pages/BookDetailPage.tsx`
- `frontend/src/features/loans/pages/MyLoansPage.tsx`
- `frontend/src/features/admin/pages/DashboardPage.tsx`
- `frontend/src/features/admin/pages/UsersPage.tsx`
- `frontend/src/features/admin/pages/AdminBooksPage.tsx`
- `frontend/src/features/admin/pages/AdminBranchesPage.tsx`
- `frontend/src/features/admin/pages/ReportsPage.tsx`
- `frontend/src/shared/components/layout/MainLayout.tsx`
- `frontend/src/shared/components/layout/AdminLayout.tsx`

---

## Prioridad de Implementación Sugerida

1. **Módulo de Usuarios** (backend + frontend)
2. **UI de Crear/Editar Libros y Sucursales**
3. **Self-service Borrowing** (permite a miembros tomarse libros)
4. **Sistema de Reservas**
5. **Reports backend + UI**
6. **Gestión de Reviews**
7. **Enums en Prisma schema**
8. **Campos adicionales en modelos**
