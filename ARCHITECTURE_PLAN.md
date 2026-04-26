# Plan Arquitectónico: Sistema de Gestión de Biblioteca (Library Management System)

## 1. Visión General y Objetivos del Sistema

### 1.1 Propósito y Contexto

**Bibliotech Premium** es una plataforma web现代化 para la gestión integral de bibliotecas, diseñada para soportar múltiples sucursales, cientos de miles de títulos y miles de usuarios concurrentes. El sistema替换传统人工管理方式，实现自动化、智能化、用户自助服务。

**Metas Estratégicas:**
- **Eficiencia Operativa**: Reducir un 70% el tiempo en tareas administrativas mediante automatización (multas automáticas, reservas, renovaciones)
- **Autoservicio**: Permitir a los lectores realizar el 90% de las operaciones sin intervención del personal (préstamos online, renovaciones, reservas)
- **Fidelización**: Crear una experiencia premium que convierta la biblioteca en el destino cultural favorito de los usuarios

### 1.2 Principios Arquitectónicos

```
┌─────────────────────────────────────────────────────────────────┐
│                    PRINCIPIOS RECTORESS                          │
├─────────────────────────────────────────────────────────────────┤
│  1. SEPARACIÓN DE RESPONSABILIDADES (SoC)                       │
│     → Cada capa tiene una única razón de cambio                  │
│     → Backend: lógica de negocio / Frontend: presentación       │
│                                                                  │
│  2. API-FIRST                                                    │
│     → Todos los servicios se exponen via REST/GraphQL           │
│     → Mobile apps, intégraciones externas via API                │
│                                                                  │
│  3. SEGURIDAD POR DISEÑO                                         │
│     → Zero Trust: JWT + RBAC en cada endpoint                    │
│     → Validación exhaustiva con Zod en entrada/salida           │
│     → Rate limiting, CORS, Helmet.js                            │
│                                                                  │
│  4. ALTA DISPONIBILIDAD                                          │
│     → Arquitectura stateless para horizontal scaling             │
│     → PostgreSQL con replicación read replica                   │
│     → Cache en Redis para endpoints hotspot                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Roles de Usuario y Permisos

### 2.1 Roles Definidos

| Rol | Descripción | Cantidad Estimada |
|-----|-------------|-------------------|
| **Administrador** | Control total del sistema, configuración de sucursales, usuarios, reportes | 2-3 |
| **Bibliotecario** | Gestión día a día de préstamos, ejemplares, atención al público | 5-10 por sucursal |
| **Socio/Lector** | Usuario registrado con acceso a catálogo, préstamos, reservas | Miles |
| **Invitado** | Consulta pública del catálogo sin autenticación | Ilimitado |

### 2.2 Matriz de Permisos (RBAC)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        PERMISOS POR ROL                                  │
├──────────────────┬────────────┬──────────────┬───────────┬─────────────┤
│ Funcionalidad    │ Administrador│ Bibliotecario│ Socio    │ Invitado    │
├──────────────────┼────────────┼──────────────┼───────────┼─────────────┤
│ Ver catálogo     │ ✓          │ ✓            │ ✓         │ ✓           │
│ Buscar libros    │ ✓          │ ✓            │ ✓         │ ✓           │
│ Crear préstamo   │ ✓          │ ✓            │ ✗         │ ✗           │
│ Renovar préstamo │ ✓          │ ✓            │ ✓*        │ ✗           │
│ Reservar libro   │ ✓          │ ✓            │ ✓         │ ✗           │
│ Gestionar libros │ ✓          │ ✓            │ ✗         │ ✗           │
│ Gestionar ejemplares│ ✓       │ ✓            │ ✗         │ ✗           │
│ Gestionar sucursales│ ✓      │ ✗            │ ✗         │ ✗           │
│ Ver reportes     │ ✓          │ ✓ (sucursal) │ ✗         │ ✗           │
│ Gestionar multas │ ✓          │ ✓            │ ✗         │ ✗           │
│ Moderar reseñas  │ ✓          │ ✓            │ ✗         │ ✗           │
│ Gestionar usuarios│ ✓         │ ✗            │ ✗         │ ✗           │
│ Configurar sistema│ ✓         │ ✗            │ ✗         │ ✗           │
│ Ver perfil       │ ✓          │ ✓            │ ✓         │ ✗           │
│ Escribir reseñas  │ ✓          │ ✓            │ ✓         │ ✗           │
│ Escanear códigos │ ✓          │ ✓            │ ✗         │ ✗           │
└──────────────────┴────────────┴──────────────┴───────────┴─────────────┘
* Solo sus propios préstamos, máximo 2 renovaciones por préstamo
```

### 2.3 Implementación RBAC

```typescript
// src/backend/src/infrastructure/rbac/permissions.ts
export enum Role {
  ADMIN = 'ADMIN',
  LIBRARIAN = 'LIBRARIAN',
  MEMBER = 'MEMBER',
  GUEST = 'GUEST',
}

export enum Permission {
  CATALOG_VIEW = 'CATALOG_VIEW',
  CATALOG_SEARCH = 'CATALOG_SEARCH',
  LOAN_CREATE = 'LOAN_CREATE',
  LOAN_RENEW = 'LOAN_RENEW',
  LOAN_RETURN = 'LOAN_RETURN',
  RESERVATION_CREATE = 'RESERVATION_CREATE',
  BOOK_MANAGE = 'BOOK_MANAGE',
  COPY_MANAGE = 'COPY_MANAGE',
  BRANCH_MANAGE = 'BRANCH_MANAGE',
  REPORTS_VIEW = 'REPORTS_VIEW',
  FINE_MANAGE = 'FINE_MANAGE',
  REVIEW_MODERATE = 'REVIEW_MODERATE',
  USER_MANAGE = 'USER_MANAGE',
  SYSTEM_CONFIG = 'SYSTEM_CONFIG',
  BARCODE_SCAN = 'BARCODE_SCAN',
}

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.ADMIN]: Object.values(Permission),
  [Role.LIBRARIAN]: [
    Permission.CATALOG_VIEW,
    Permission.CATALOG_SEARCH,
    Permission.LOAN_CREATE,
    Permission.LOAN_RENEW,
    Permission.LOAN_RETURN,
    Permission.RESERVATION_CREATE,
    Permission.BOOK_MANAGE,
    Permission.COPY_MANAGE,
    Permission.REPORTS_VIEW,
    Permission.FINE_MANAGE,
    Permission.REVIEW_MODERATE,
    Permission.BARCODE_SCAN,
  ],
  [Role.MEMBER]: [
    Permission.CATALOG_VIEW,
    Permission.CATALOG_SEARCH,
    Permission.LOAN_RENEW,
    Permission.RESERVATION_CREATE,
  ],
  [Role.GUEST]: [
    Permission.CATALOG_VIEW,
    Permission.CATALOG_SEARCH,
  ],
};
```

---

## 3. Requisitos Funcionales Detallados

### 3.1 Catálogo de Libros

**Comportamiento:**
- Búsqueda full-text con PostgreSQL `tsvector` / `tsquery` sobre título, autor, sinopsis, ISBN
- Filtros facetados: autor (autocomplete), género (checkbox tree), disponibilidad (solo disponibles / todos), sucursal (dropdown)
- Paginación: tradicional con page/size + total count, o infinita con cursor-based
- Portadas: Google Books API → Open Library fallback → placeholder con iniciales

**Reglas de Negocio:**
- Un libro puede tener N ejemplares distribuidos en M sucursales
- Búsqueda debe responder en < 200ms con índices adecuados
- Resultados ordenados por relevancia (full-text rank) o fecha de agregado

**Dependencias Técnicas:**
- PostgreSQL 15+ con extensión `pg_trgm` para búsqueda fuzzy
- Redis para caché de consultas frecuentes
- React Query para stale-while-revalidate

```sql
-- Índice para búsqueda full-text
CREATE INDEX idx_books_search ON books USING gin(to_tsvector('spanish', title || ' ' || author || ' ' || synopsis));

-- Índice para filtros facetados
CREATE INDEX idx_books_genre ON books(genre_id);
CREATE INDEX idx_books_author ON books(author_id);

-- Índices para disponibilidad
CREATE INDEX idx_copies_available ON copies(book_id, status) WHERE status = 'AVAILABLE';
```

**API Endpoint:**
```
GET /api/v1/books/search
Headers: Authorization: Bearer <jwt> (opcional para invitados)
Query Parameters:
  - q: string (búsqueda full-text)
  - genre: string[] (filtros de género)
  - author: string (filtro de autor)
  - branch: string (sucursal)
  - available: boolean
  - page: number (default: 1)
  - limit: number (default: 20, max: 100)
  - sort: 'relevance' | 'title' | 'date' (default: relevance)

Response:
{
  "data": Book[],
  "meta": {
    "total": number,
    "page": number,
    "limit": number,
    "totalPages": number
  },
  "facets": {
    "genres": { id: string, name: string, count: number }[],
    "authors": { id: string, name: string, count: number }[],
    "branches": { id: string, name: string, count: number }[]
  }
}
```

### 3.2 Gestión de Ejemplares y Sucursales

**Comportamiento:**
- Cada ejemplar (copia física) tiene: código de barras único, estado (disponible/prestado/reservado/mantenimiento), sucursal asignada, ubicación física (estante, fila)
- Cada sucursal tiene: nombre, dirección, horarios, inventario propio, bibliotecarios asignados
- Transferencias entre sucursales (un ejemplar puede mudarse)

**Reglas de Negocio:**
- Código de barras debe ser único globalmente
- Un ejemplar solo puede estar en UNA sucursal a la vez
- Transferencias generan logs de auditoría

```typescript
// src/backend/src/domain/entities/Copy.ts
export enum CopyStatus {
  AVAILABLE = 'AVAILABLE',
  LOANED = 'LOANED',
  RESERVED = 'RESERVED',
  MAINTENANCE = 'MAINTENANCE',
  TRANSFERRED = 'TRANSFERRED',
}

export interface Copy {
  id: string;
  barcode: string;
  bookId: string;
  branchId: string;
  status: CopyStatus;
  location: {
    zone: string;  // ej: "A", "B", "C"
    shelf: string;  // ej: "A1", "A2"
    position: number;
  };
  condition: 'NEW' | 'GOOD' | 'FAIR' | 'POOR';
  createdAt: Date;
  updatedAt: Date;
}

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string;
  schedule: {
    open: string;  // "08:00"
    close: string; // "20:00"
  };
  isActive: boolean;
  createdAt: Date;
}
```

### 3.3 Ciclo Completo de Préstamos

**Comportamiento:**
```
┌─────────────────────────────────────────────────────────────────┐
│                    CICLO DE PRÉSTAMO                             │
│                                                                  │
│   [Solicitud] → [Validación] → [Crear Loan] → [Devolver]        │
│       ↓              ↓              ↓              ↓            │
│   ¿Disponible?   ¿Límite OK?    ¿Fecha Vto?   ¿Multa OK?        │
│                  ¿Bloqueado?    ¿Notificar?   ¿Reserva en cola?  │
│                                                                  │
│   [Renovación] ← ¿Límite renovaciones? ← [Devolución]           │
│        ↓                                                        │
│   ¿Hay reservas?                                                │
└─────────────────────────────────────────────────────────────────┘
```

**Reglas de Negocio:**
- Préstamo default: 14 días, máximo 2 renovaciones de 7 días cada una
- Límite por usuario: 5 préstamos activos simultáneos
- Bloqueo si multas > $500 (configurable)
- Reservas: cola FIFO, caducación automática 48hs si no retira

```typescript
// src/backend/src/domain/entities/Loan.ts
export interface Loan {
  id: string;
  copyId: string;
  userId: string;
  branchId: string;
  loanDate: Date;
  dueDate: Date;
  returnDate: Date | null;
  renewalCount: number;
  maxRenewals: number;
  status: 'ACTIVE' | 'RETURNED' | 'OVERDUE' | 'RENEWED';
  createdAt: Date;
}

export interface Reservation {
  id: string;
  copyId: string;
  userId: string;
  status: 'WAITING' | 'NOTIFIED' | 'EXPIRED' | 'FULFILLED' | 'CANCELLED';
  position: number;  // posición en cola
  notifiedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
}
```

**API Endpoints:**
```
POST   /api/v1/loans              → Crear préstamo
POST   /api/v1/loans/:id/return   → Devolver ejemplar
POST   /api/v1/loans/:id/renew    → Renovar préstamo
GET    /api/v1/loans/my           → Mis préstamos activos
GET    /api/v1/loans/overdue      → Préstamos vencidos (admin/librarian)

POST   /api/v1/reservations      → Crear reserva
DELETE /api/v1/reservations/:id   → Cancelar reserva
GET    /api/v1/reservations/my   → Mis reservas
```

### 3.4 Multas Automáticas y Notificaciones

**Comportamiento:**
- Cálculo automático: día 1-7: $1/día, día 8-14: $2/día, día 15+: $5/día (configurable)
- Deuda máxima: $100 por ejemplar (se informa al admin)
- Notificaciones: email (Nodemailer/SendGrid), push (Firebase Cloud Messaging/Web Push)

**Reglas de Negocio:**
- Deuda > $500 = bloqueo de préstamos hasta regularizar
- Recordatorio: 3 días antes del vencimiento, día de vencimiento, 1 día después, cada 3 días
- Email incluye link de pago (integración futura con MercadoPago/Stripe)

```typescript
// src/backend/src/domain/services/FineCalculator.ts
export interface FineConfig {
  tier1Days: number;      // días 1-7
  tier1Rate: number;      // $1/día
  tier2Days: number;      // días 8-14
  tier2Rate: number;      // $2/día
  tier3Days: number;      // día 15+
  tier3Rate: number;      // $5/día
  maxFine: number;        // $100 máximo
  blockThreshold: number; // $500 = bloqueo
}

export const DEFAULT_FINE_CONFIG: FineConfig = {
  tier1Days: 7,
  tier1Rate: 1,
  tier2Days: 7,
  tier2Rate: 2,
  tier3Days: Number.MAX_SAFE_INTEGER,
  tier3Rate: 5,
  maxFine: 100,
  blockThreshold: 500,
};
```

**Sistema de Notificaciones:**
```
┌──────────────────────────────────────────────────────────────┐
│              CANALES DE NOTIFICACIÓN                         │
├──────────────────────────────────────────────────────────────┤
│  EMAIL           │ Nodemailer + SendGrid/SMTP               │
│  PUSH (Mobile)   │ Firebase Cloud Messaging (FCM)            │
│  PUSH (Web)     │ Web Push API + VAPID keys                 │
│  IN-APP         │ Socket.io (tiempo real)                   │
├──────────────────────────────────────────────────────────────┤
│  TIPOS DE AVISO:                                             │
│  • Recordatorio vencimiento (3 días, 1 día, mismo día)       │
│  • Alerta overdue (cada 3 días)                              │
│  • Reserva disponible (turno en cola)                        │
│  • Nueva multa generada                                      │
│  • Confirmación devolución                                   │
└──────────────────────────────────────────────────────────────┘
```

### 3.5 Panel de Administración

**Dashboards y Reportes:**

| Dashboard | Métricas | Visualización |
|-----------|----------|---------------|
| **Popularidad** | Top 10 libros prestados (mes/semana/total), tendencia | Bar chart horizontal |
| **Morosidad** | Tasa de morosidad por sucursal, usuarios morosos | Gauge + tabla |
| **Movimiento** | Préstamos/devoluciones por día, hora pico | Line chart |
| **Inventario** | Stock por sucursal, tasa de rotación | Cards + heatmap |

**Reportes Exportables:**
- CSV: descarga directa con datos tabulares
- PDF: Reportlab (Python) o jsPDF (JS) con gráficos integrados

```typescript
// src/backend/src/application/reports/ReportGenerator.ts
export interface ReportFilters {
  startDate: Date;
  endDate: Date;
  branchId?: string;
  groupBy?: 'day' | 'week' | 'month';
}

export enum ReportFormat {
  CSV = 'CSV',
  PDF = 'PDF',
  JSON = 'JSON',
}

export interface Report {
  title: string;
  generatedAt: Date;
  filters: ReportFilters;
  data: Record<string, unknown>[];
  summary: {
    totalLoans: number;
    totalReturns: number;
    overdueRate: number;
    averageLoanDays: number;
  };
}
```

### 3.6 Integración con APIs Externas

**Google Books API:**
```
Endpoint: https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}
Fallback: Si no encuentra, buscar por título
Timeout: 3 segundos
Cache: Redis 7 días
```

**Open Library API:**
```
Endpoint: https://openlibrary.org/api/books?bibkeys=ISBN:{isbn}&format=json&jscmd=data
Fallback: Último recurso
Timeout: 3 segundos
Cache: Redis 30 días (metadatos más estables)
```

**Flujo de Obtención de Portadas:**
```typescript
// src/backend/src/infrastructure/external/BookMetadataService.ts
async function fetchBookCover(isbn: string): Promise<string | null> {
  // 1. Google Books
  const googleResult = await fetchFromGoogleBooks(isbn);
  if (googleResult?.coverUrl) return googleResult.coverUrl;

  // 2. Open Library
  const openLibraryResult = await fetchFromOpenLibrary(isbn);
  if (openLibraryResult?.coverUrl) return openLibraryResult.coverUrl;

  // 3. Placeholder con iniciales
  return generateInitialPlaceholder(isbn);
}
```

### 3.7 Valoraciones y Reseñas

**Comportamiento:**
- Usuarios pueden calificar 1-5 estrellas + texto opcional
- Una calificación por usuario por libro
- Moderación: reseñas con palabras taboo (configurable) → pendiente → admin aprueba/rechaza

**Reglas de Negocio:**
- Solo usuarios con préstamo completado del libro pueden calificar
- Editar calificación: 1 vez por mes
- Promedio de calificación actualizado en tiempo real

```typescript
// src/backend/src/domain/entities/Review.ts
export interface Review {
  id: string;
  bookId: string;
  userId: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comment: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  flaggedWords: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

### 3.8 Escaneo de Códigos de Barras/QR

**Tecnología:** `html5-qrcode` (librería liviana, soporte webcam + archivo de imagen)

**Comportamiento:**
1. Solicitar permiso de cámara
2. Detectar código de barras en tiempo real (30fps)
3. Vibración/sound feedback al detectar
4. Fallback: botón para ingreso manual del código
5. Búsqueda automática del ejemplar al detectar

```typescript
// src/frontend/src/features/barcode-scanner/BarcodeScanner.tsx
import { Html5Qrcode } from 'html5-qrcode';

export function BarcodeScanner({ onScan }: { onScan: (barcode: string) => void }) {
  const [scanning, setScanning] = useState(false);

  const startScan = async () => {
    const scanner = new Html5Qrcode('barcode-scanner');
    await scanner.start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: { width: 250, height: 100 } },
      (decodedText) => {
        onScan(decodedText);
        navigator.vibrate(100);
      },
      () => {} // ignore errors during scanning
    );
    setScanning(true);
  };

  return (
    <div className="scanner-container">
      <div id="barcode-scanner" />
      {!scanning && (
        <button onClick={startScan}>Escanear código de barras</button>
      )}
      <input
        type="text"
        placeholder="O ingresa manualmente el código"
        onKeyDown={(e) => e.key === 'Enter' && onScan(e.currentTarget.value)}
      />
    </div>
  );
}
```

---

## 4. Stack Tecnológico Detallado

### 4.1 Backend

```
┌─────────────────────────────────────────────────────────────────┐
│                        STACK BACKEND                             │
├─────────────────────────────────────────────────────────────────┤
│  RUNTIME: Node.js 20 LTS                                        │
│  FRAMEWORK: Fastify (preferido sobre Express)                    │
│    → 3x más rápido en benchmarks                                 │
│    → Validación inline con schemas JSON (reemplaza middleware)   │
│    → Plugin system superior para extensibilidad                  │
│    → Native support for Fastify v4+ con TypeScript               │
│                                                                  │
│  TYPESCRIPT: 5.3+ (strict mode)                                 │
│                                                                  │
│  VALIDACIÓN: Zod                                                 │
│    → Tipado estático automático desde schemas                    │
│    → Reutilizable en API y frontend                              │
│                                                                  │
│  ORM: Prisma 5+ con PostgreSQL                                   │
│    → Type-safe queries                                           │
│    → Migration system superior                                   │
│    → Studio visual para desarrollo                               │
│                                                                  │
│  AUTH: JWT + Refresh Tokens Rotativos                            │
│    → Access token: 15 min expiry                                 │
│    → Refresh token: 7 días, rotación tras uso                   │
│    → Refresh token almacenado en httpOnly cookie                 │
│    → Blacklist en Redis para logout                             │
│                                                                  │
│  CACHE: Redis 7+ (ioredis)                                       │
│    → Sessiones                                                   │
│    → Consultas frecuentes                                        │
│    → Rate limiting                                              │
│    → Cola de jobs (BullMQ)                                       │
└─────────────────────────────────────────────────────────────────┘
```

**¿Por qué Fastify sobre Express?**
```bash
# Benchmark simple (req/sec):
Express: ~15,000 req/s
Fastify: ~45,000 req/s

# Memoria:
Express: 150MB baseline
Fastify: 80MB baseline
```

**¿Por qué PostgreSQL sobre MongoDB?**

| Criterio | PostgreSQL ✅ | MongoDB ❌ |
|----------|--------------|------------|
| Consistencia ACID | Nativa | Requiere transacciones multi-doc |
| Relaciones complejas | JOINs eficientes | $lookup anidado, performance pobre |
| Búsqueda full-text | `tsvector` integrado | Atlas Search = $$$

/
| Transaccionalidad | Excelente para préstamos/multas | Limitada |
| Índices compostos | Flexibles | Limitados |
| JSON/BLOB | JSONB (buscable) | Native JSON, pero sin estructura |
| Ecosistema | Maturity 20+ años | Más nuevo, menos tooling enterprise |

**MongoDB sería aceptable para:**catálogos muy simples, prototyping rápido, documentos predominantemente independientes.

### 4.2 Base de Datos - Esquema Conceptual

```sql
-- Esquema PostgreSQL - Library Management System
-- Usando Prisma Data Model Language (SDL)

-- ============================================
-- TABLAS DE USUARIOS Y AUTENTICACIÓN
-- ============================================

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  role          Role      @default(MEMBER)
  isActive      Boolean   @default(true)
  blockedUntil  DateTime?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  -- Relations
  loans         Loan[]
  reservations  Reservation[]
  reviews       Review[]
  fines         Fine[]

  @@index([email])
  @@index([role])
}

enum Role {
  ADMIN
  LIBRARIAN
  MEMBER
}

-- ============================================
-- TABLAS DE CATÁLOGO
-- ============================================

model Author {
  id        String   @id @default(cuid())
  name      String
  bio       String?
  country   String?
  createdAt DateTime @default(now())

  books     Book[]

  @@index([name])
}

model Genre {
  id        String   @id @default(cuid())
  name      String   @unique
  parentId  String?
  parent    Genre?   @relation("GenreHierarchy", fields: [parentId], references: [id])
  children  Genre[]  @relation("GenreHierarchy")

  books     Book[]
}

model Book {
  id            String    @id @default(cuid())
  isbn          String    @unique
  title         String
  synopsis      String?
  coverUrl      String?
  publishedYear Int?
  publisher     String?
  language      String    @default("es")
  pageCount     Int?
  googleBooksId String?   @unique
  openLibraryId String?   @unique

  -- Relations
  authorId      String
  author        Author    @relation(fields: [authorId], references: [id])
  genreId       String
  genre         Genre     @relation(fields: [genreId], references: [id])
  copies        Copy[]
  reviews       Review[]

  -- Full-text search vector (manejado por triggers o aplicación)
  searchVector  Unsupported("tsvector")?

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([title])
  @@index([isbn])
  @@index([authorId])
  @@index([genreId])
}

-- ============================================
-- TABLAS DE INVENTARIO Y SUCURSALES
-- ============================================

model Branch {
  id        String   @id @default(cuid())
  name      String
  address   String
  phone     String?
  schedule  Json     -- { open: "08:00", close: "20:00" }
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  copies    Copy[]
  loans     Loan[]

  @@index([name])
}

model Copy {
  id        String     @id @default(cuid())
  barcode   String     @unique
  status    CopyStatus @default(AVAILABLE)
  condition CopyCondition @default(GOOD)

  -- Location in branch
  zone      String?     -- "A", "B", "C"
  shelf     String?     -- "A1", "A2"
  position  Int?

  -- Relations
  bookId    String
  book      Book       @relation(fields: [bookId], references: [id])
  branchId  String
  branch    Branch     @relation(fields: [branchId], references: [id])

  loans     Loan[]
  reservations Reservation[]

  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  @@index([barcode])
  @@index([bookId])
  @@index([branchId])
  @@index([status])
  @@index([bookId, status])
}

enum CopyStatus {
  AVAILABLE
  LOANED
  RESERVED
  MAINTENANCE
  TRANSFERRED
}

enum CopyCondition {
  NEW
  GOOD
  FAIR
  POOR
}

-- ============================================
-- TABLAS DE PRÉSTAMOS Y RESERVAS
-- ============================================

model Loan {
  id            String     @id @default(cuid())
  renewalCount  Int        @default(0)
  maxRenewals   Int        @default(2)
  loanDate      DateTime
  dueDate       DateTime
  returnDate    DateTime?

  -- Relations
  userId        String
  user          User       @relation(fields: [userId], references: [id])
  copyId        String
  copy          Copy       @relation(fields: [copyId], references: [id])
  branchId      String
  branch        Branch     @relation(fields: [branchId], references: [id])

  createdAt     DateTime   @default(now())

  @@index([userId])
  @@index([copyId])
  @@index([dueDate])
  @@index([status])
}

model Reservation {
  id          String           @id @default(cuid())
  position    Int
  status      ReservationStatus @default(WAITING)
  notifiedAt  DateTime?
  expiresAt   DateTime

  -- Relations
  userId      String
  user        User             @relation(fields: [userId], references: [id])
  copyId      String
  copy        Copy             @relation(fields: [copyId], references: [id])

  createdAt   DateTime         @default(now())

  @@index([userId])
  @@index([copyId])
  @@index([status])
}

enum ReservationStatus {
  WAITING
  NOTIFIED
  EXPIRED
  FULFILLED
  CANCELLED
}

-- ============================================
-- TABLAS DE MULTAS Y PAGOS
-- ============================================

model Fine {
  id          String     @id @default(cuid())
  amount      Decimal    @db.Decimal(10, 2)
  reason      String
  status      FineStatus @default(PENDING)
  paidAt      DateTime?

  -- Relations
  userId      String
  user        User       @relation(fields: [userId], references: [id])
  loanId      String?
  loan        Loan?      @relation(fields: [loanId], references: [id])

  createdAt   DateTime   @default(now())

  @@index([userId])
  @@index([status])
}

enum FineStatus {
  PENDING
  PAID
  WAIVED
}

-- ============================================
-- TABLAS DE RESEÑAS Y MODERACIÓN
-- ============================================

model Review {
  id           String        @id @default(cuid())
  rating       Int           -- 1-5
  comment      String?
  status       ReviewStatus @default(PENDING)
  flaggedWords String[]

  -- Relations
  userId       String
  user         User          @relation(fields: [userId], references: [id])
  bookId       String
  book         Book          @relation(fields: [bookId], references: [id])

  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt

  @@unique([userId, bookId])
  @@index([bookId])
  @@index([status])
}

enum ReviewStatus {
  PENDING
  APPROVED
  REJECTED
}

-- ============================================
-- TABLAS DE AUDITORÍA
-- ============================================

model AuditLog {
  id         String   @id @default(cuid())
  action     String
  entityType String
  entityId   String
  userId     String?
  metadata   Json?
  ipAddress  String?
  createdAt  DateTime @default(now())

  @@index([entityType, entityId])
  @@index([userId])
  @@index([createdAt])
}

-- ============================================
-- TABLAS DE CONFIGURACIÓN
-- ============================================

model SystemConfig {
  id        String   @id @default(cuid())
  key       String   @unique
  value     Json
  updatedAt DateTime @updatedAt
}

-- Configuraciones por defecto:
-- loan.durationDays: 14
-- loan.maxRenewals: 2
-- loan.renewalDays: 7
-- loan.maxActiveLoans: 5
-- fine.tier1Days: 7
-- fine.tier1Rate: 1
-- fine.blockThreshold: 500
-- notification.reminderDays: [3, 1, 0]
```

### 4.3 Frontend

```
┌─────────────────────────────────────────────────────────────────┐
│                        STACK FRONTEND                             │
├─────────────────────────────────────────────────────────────────┤
│  CORE: React 18 + Vite 5                                         │
│    → Fast refresh con HMR                                       │
│    → Code splitting automático por ruta                          │
│    → Build time 3x más rápido que CRA                           │
│                                                                  │
│  ROUTING: React Router v6                                        │
│    → Loaders para data fetching pre-render                      │
│    → Actions para form submissions                               │
│    → Deferred data con defer()                                  │
│    → Loading boundaries                                          │
│                                                                  │
│  ESTADO GLOBAL:                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  CLIENTE (Zustand)          │  SERVIDOR (React Query)     │   │
│  │  • UI state (modals, tabs)  │  • Datos del servidor       │   │
│  │  • Filtros locales          │  • Cache automático         │   │
│  │  • Theme, locale            │  • Optimistic updates       │   │
│  │  • Auth state (en memoria) │  • Revalidación             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ESTILOS: Tailwind CSS 3.4+                                      │
│    → Utility-first para velocidad                              │
│    → Componentes headless: Radix UI                             │
│    → Animaciones: Framer Motion                                 │
│    → Iconos: Lucide React                                       │
│                                                                  │
│  FORMULARIOS: React Hook Form + Zod                              │
│    → Validation schemas compartidas con backend                 │
│    → Avoid re-renders con Controller                            │
│    → Native FormData support                                    │
│                                                                  │
│  TESTING:                                                        │
│  • Unitarias: Vitest + React Testing Library                     │
│  • E2E: Playwright ( TypeScript support nativo)                  │
│  • Coverage: 80% mínimo                                          │
└─────────────────────────────────────────────────────────────────┘
```

**¿Por qué Zustand sobre Redux Toolkit?**

| Criterio | Zustand ✅ | Redux Toolkit ❌ |
|----------|-----------|-----------------|
| Boilerplate | Mínimo (store = hook) | Necesita slices, actions, reducers |
| Bundle size | ~1KB | ~10KB |
| Mutación | Directa permitida | Immer (overhead) |
| DevTools | Igual | Igual |
|Learning curve | 1 día | 1 semana |
| Typed hooks | Automático | Generics necesarios |

### 4.4 Notificaciones en Tiempo Real

```typescript
// src/backend/src/infrastructure/websocket/SocketServer.ts
import { Server } from 'socket.io';
import { verifyToken } from '../auth/jwt.js';

export function setupWebSocket(server: http.Server) {
  const io = new Server(server, {
    cors: { origin: process.env.FRONTEND_URL },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Unauthorized'));
    
    try {
      const decoded = verifyToken(token);
      socket.data.user = decoded;
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user.id;
    
    // Unirse a sala personal para notificaciones
    socket.join(`user:${userId}`);

    // Notificar vencimiento de préstamo
    socket.on('loan:due-soon', (loanId) => {
      io.to(`user:${userId}`).emit('notification', {
        type: 'LOAN_DUE_SOON',
        loanId,
        message: 'Tu préstamo vence pronto',
      });
    });

    socket.on('disconnect', () => {
      // cleanup
    });
  });
}
```

**EventosSocket.io:**
```
┌──────────────────────────────────────────┐
│ EVENTOS DE NOTIFICACIÓN                  │
├──────────────────────────────────────────┤
│ notification          → Nuevo aviso       │
│ loan:overdue          → Préstamo vencido  │
│ reservation:available → Reserva disponible│
│ fine:created          → Nueva multa      │
│ loan:renewed          → Préstamo renovado│
└──────────────────────────────────────────┘
```

### 4.5 DevOps

```
┌─────────────────────────────────────────────────────────────────┐
│                         DEVOPS STACK                             │
├─────────────────────────────────────────────────────────────────┤
│  CONTENEDORES:                                                   │
│  • Docker + docker-compose para desarrollo                      │
│  • Multi-stage builds para producción (imagen mínima)            │
│  • Docker Scout para vulnerabilidades                            │
│                                                                  │
│  CI/CD (GitHub Actions):                                         │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │ Pipeline:                                                    │ │
│  │  1. lint + typecheck (Node + React)                         │ │
│  │  2. test:unit (Vitest/Jest) → test:e2e (Playwright)        │ │
│  │  3. build:docker                                           │ │
│  │  4. security:audit (Snyk/Trivy)                            │ │
│  │  5. deploy:staging (automatico en main)                    │ │
│  │  6. deploy:production (manual approval)                    │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  DESPLIEGUE:                                                     │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │  OPCIÓN A: AWS (ECS + RDS + ElastiCache)                   │ │
│  │    → Control total, costo variable                        │ │
│  │    → Ideal para producción con alta demanda               │ │
│  │                                                           │ │
│  │  OPCIÓN B: Railway + Railway Postgres                      │ │
│  │    → Deploy con 1 click (git push)                        │ │
│  │    → Ideal para MVP/prototipado                          │ │
│  │    → PostgreSQL incluido                                  │ │
│  │    → ~$5-20/mes starter                                   │ │
│  │                                                           │ │
│  │  OPCIÓN C: Vercel (Frontend) + Railway (Backend)          │ │
│  │    → Mejor experiencia de desarrollo                      │ │
│  │    → CDN global para frontend                             │ │
│  └────────────────────────────────────────────────────────────┘ │
│                                                                  │
│  MONITOREO:                                                       │
│  • Winston + Morgan (logging estructurado)                      │
│  • Prometheus metrics endpoint (/metrics)                       │
│  • Grafana dashboards (opcional Railway tiene自带)               │
│  • Uptime Kuma (monitoring uptime gratuito)                     │
│  • Sentry (error tracking, plan gratuito 5k events/mes)         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Arquitectura de la Aplicación

### 5.1 Estructura Backend (Clean Architecture)

```
src/
├── main.ts                     # Entry point, servidor HTTP
├── app.ts                      # Configuración Fastify
│
├── config/
│   ├── index.ts                # Variables de entorno tipadas
│   ├── database.ts             # Prisma client
│   ├── redis.ts                # Redis client
│   └── mail.ts                 # Nodemailer transporter
│
├── modules/
│   ├── auth/
│   │   ├── routes.auth.ts      # POST /login, /register, /refresh
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── schemas/           # Zod schemas para validación
│   │
│   ├── users/
│   │   ├── routes.users.ts    # CRUD usuarios
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   └── schemas/
│   │
│   ├── books/
│   │   ├── routes.books.ts
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── schemas/
│   │   └── external/          # Google Books, Open Library
│   │
│   ├── copies/
│   ├── loans/
│   ├── reservations/
│   ├── fines/
│   ├── reviews/
│   └── branches/
│
├── domain/
│   ├── entities/              # Interfaces de entidades (sin framework)
│   ├── value-objects/         # Email, ISBN, Money, etc.
│   └── events/                # Domain events (Domain-Driven Design)
│
├── application/
│   ├── services/               # Lógica de negocio compleja
│   ├── use-cases/             # Casos de uso explícitos
│   └── reports/               # Generación de reportes
│
├── infrastructure/
│   ├── auth/
│   │   ├── jwt.ts             # Firma y verificación
│   │   ├── rbac.ts            # Control de acceso
│   │   └── password.ts        # Bcrypt utilities
│   ├── websocket/
│   │   └── socket.ts          # Socket.io setup
│   ├── notifications/
│   │   ├── email.ts           # Nodemailer
│   │   ├── push.ts            # FCM, Web Push
│   │   └── inapp.ts           # Socket.io emits
│   ├── search/
│   │   └── fulltext.ts        # Búsqueda PostgreSQL
│   └── external/
│       ├── google-books.ts
│       └── open-library.ts
│
├── shared/
│   ├── errors/                # AppError, NotFoundError, etc.
│   ├── middleware/
│   │   ├── auth.ts            # Verificación JWT
│   │   ├── rbac.ts           # Permisos por rol
│   │   ├── validation.ts     # Zod middleware
│   │   ├── rate-limit.ts      # Protección DDoS
│   │   └── logging.ts        # Morgan + Winston
│   └── utils/
│       ├── date.ts
│       ├── string.ts
│       └── validators.ts
│
└── tests/
    ├── unit/
    └── e2e/
```

### 5.2 Estructura Frontend (Feature-Based)

```
src/
├── main.tsx                    # Entry point React
├── App.tsx                     # Router setup
├── index.css                   # Tailwind + custom properties
│
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── LoginForm.tsx
│   │   │   ├── RegisterForm.tsx
│   │   │   └── ForgotPasswordForm.tsx
│   │   ├── pages/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── hooks/
│   │   │   ├── useAuth.ts
│   │   │   └── useLogin.ts
│   │   ├── services/
│   │   │   └── authApi.ts
│   │   ├── schemas/           # Zod schemas (compartidos)
│   │   │   └── auth.schema.ts
│   │   └── utils/
│   │
│   ├── books/
│   │   ├── components/
│   │   │   ├── BookCard.tsx
│   │   │   ├── BookList.tsx
│   │   │   ├── BookFilters.tsx
│   │   │   ├── BookSearch.tsx
│   │   │   └── BookDetail.tsx
│   │   ├── pages/
│   │   │   ├── CatalogPage.tsx
│   │   │   └── BookDetailPage.tsx
│   │   ├── hooks/
│   │   │   ├── useBooks.ts
│   │   │   ├── useBookSearch.ts
│   │   │   └── useBookDetail.ts
│   │   ├── services/
│   │   │   └── booksApi.ts
│   │   └── types/
│   │       └── book.types.ts
│   │
│   ├── loans/
│   │   ├── components/
│   │   │   ├── LoanCard.tsx
│   │   │   ├── MyLoansList.tsx
│   │   │   ├── LoanActions.tsx
│   │   │   └── BarcodeScanner.tsx
│   │   ├── pages/
│   │   │   ├── MyLoansPage.tsx
│   │   │   └── LoanPage.tsx
│   │   ├── hooks/
│   │   │   └── useLoans.ts
│   │   └── services/
│   │
│   ├── reservations/
│   ├── fines/
│   ├── reviews/
│   └── admin/
│       ├── dashboards/
│       ├── reports/
│       └── users/
│
├── shared/
│   ├── components/
│   │   ├── ui/                # Componentes base (Button, Input, Modal)
│   │   ├── layout/
│   │   │   ├── MainLayout.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   └── feedback/
│   │       ├── Toast.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── hooks/
│   │   ├── useToast.ts
│   │   ├── useDebounce.ts
│   │   └── useMediaQuery.ts
│   │
│   ├── lib/
│   │   ├── api.ts             # Axios/Fetch client configurado
│   │   ├── queryClient.ts     # React Query config
│   │   └── socket.ts          # Socket.io client
│   │
│   ├── stores/
│   │   ├── uiStore.ts         # Zustand: modals, theme, locale
│   │   └── authStore.ts       # Estado auth (token, user)
│   │
│   └── utils/
│       ├── cn.ts              # clsx + tailwind-merge
│       ├── format.ts          # Fechas, monedas
│       └── validators.ts
│
├── routes/
│   ├── index.tsx              # Route definitions
│   ├── ProtectedRoute.tsx
│   └── AdminRoute.tsx
│
└── tests/
    ├── unit/
    └── e2e/
```

### 5.3 Diagrama de Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         FLUJO DE DATOS - BÚSQUEDA DE LIBROS                      │
└─────────────────────────────────────────────────────────────────────────────────┘

  ┌──────────┐
  │ Usuario  │
  │ escribe  │
  │ "Cien años"│
  └────┬─────┘
       │
       ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  FRONTEND (React)                                                                 │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                     │
│  │ BookSearch.tsx│     │ useBookSearch │     │ React Query  │                     │
│  │  componente  │────▶│    hook       │────▶│   cache      │                     │
│  └──────────────┘     └──────────────┘     └──────┬───────┘                     │
│                                                    │                            │
│                                                    │ stale?                      │
│                                                    ▼                            │
│                                              ┌───────────┐                      │
│                                              │ refetch?  │                      │
│                                              └─────┬─────┘                      │
└────────────────────────────────────────────────────│────────────────────────────┘
                                                     │
                                                     ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  API LAYER (Fastify)                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ GET /api/v1/books/search?q=Cien años&page=1&limit=20                        │  │
│  │ Headers: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...                       │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                    │                                              │
│                                    ▼                                              │
│  ┌──────────────────────────────────────────────────────────────────────────────┐│
│  │ MIDDLEWARE CHAIN:                                                            ││
│  │  1. rate-limit (Redis: 100 req/min por IP)                                   ││
│  │  2. auth (JWT verify → userId)                                               ││
│  │  3. validation (Zod: parse query params)                                    ││
│  │  4. logging (Morgan: method, path, status, duration)                          ││
│  └──────────────────────────────────────────────────────────────────────────────┘│
└───────────────────────────────────────────────────────────────────────────────────┘
                                                     │
                                                     ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│  SERVICE LAYER                                                                      │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ BookService.searchBooks(query, filters, pagination)                          │  │
│  │                                                                              │  │
│  │  1. Construir query SQL con Prisma                                            │  │
│  │  2. Si cache hit → retornar Redis                                            │  │
│  │  3. Ejecutar búsqueda full-text                                              │  │
│  │  4. Obtener facets (géneros, autores, sucursales)                            │  │
│  │  5. Cachear en Redis (TTL: 5 min)                                             │  │
│  │  6. Retornar DTO                                                              │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────┘
                                                     │
                                                     ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│  REPOSITORY LAYER (Prisma)                                                         │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │ BookRepository.searchBooks(query, filters)                                   │  │
│  │                                                                              │  │
│  │  const books = await prisma.book.findMany({                                  │  │
│  │    where: {                                                                  │  │
│  │      OR: [                                                                  │  │
│  │        { title: { search: query } },                                         │  │
│  │        { author: { name: { search: query } } },                             │  │
│  │      ],                                                                     │  │
│  │      genreId: filters.genre ? { in: filters.genre } : undefined,            │  │
│  │      copies: filters.available ? { some: { status: 'AVAILABLE' } } : {}, │  │
│  │    },                                                                       │  │
│  │    include: { author: true, genre: true, copies: true },                    │  │
│  │    skip: (page - 1) * limit,                                                │  │
│  │    take: limit,                                                             │  │
│  │    orderBy: { createdAt: 'desc' },                                          │  │
│  │  });                                                                        │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────┘
                                                     │
                                                     ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│  DATABASE (PostgreSQL 15)                                                           │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  SELECT * FROM books                                                        │  │
│  │  WHERE to_tsvector('spanish', title || ' ' || author->>'name')               │  │
│  │        @@ to_tsquery('spanish', 'Cien & años')                             │  │
│  │  AND ...filters...                                                          │  │
│  │  LIMIT 20 OFFSET 0                                                          │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────────────┐  │
│  │  ÍNDICES UTILIZADOS:                                                       │  │
│  │  • idx_books_search (GIN tsvector)                                         │  │
│  │  • idx_books_genre (B-tree)                                                │  │
│  │  • idx_copies_available (B-tree, partial)                                 │  │
│  └─────────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────────┘
                                                     │
                                                     ▼
  ┌──────────┐
  │ Response │
  │ JSON     │
  └────┬─────┘
       │
       ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│  FRONTEND                                                                          │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐                     │
│  │ React Query  │────▶│ BookList.tsx │────▶│ BookCard [] │                     │
│  │  actualiza   │     │  re-render   │     │  render     │                     │
│  │  cache       │     │              │     │             │                     │
│  └──────────────┘     └──────────────┘     └──────────────┘                     │
└───────────────────────────────────────────────────────────────────────────────────┘
```

### 5.4 API RESTful - Endpoints Principales

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              API v1 - ENDPOINTS                                   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│  AUTENTICACIÓN                                                                  │
│  POST   /api/v1/auth/register     { email, password, name }                      │
│  POST   /api/v1/auth/login        { email, password }                             │
│  POST   /api/v1/auth/logout       {} (invalida refresh token)                    │
│  POST   /api/v1/auth/refresh      { refreshToken } → { accessToken }             │
│  GET    /api/v1/auth/me           → { user }                                     │
│                                                                                  │
│  LIBROS                                                                          │
│  GET    /api/v1/books             → { books, meta, facets }                       │
│  GET    /api/v1/books/:id        → { book, copies, reviews }                     │
│  GET    /api/v1/books/search     → { books, meta, facets }                      │
│  POST   /api/v1/books             { ...book } (admin)                            │
│  PUT    /api/v1/books/:id         { ...book } (admin)                           │
│  DELETE /api/v1/books/:id        {} (admin)                                     │
│                                                                                  │
│  EJEMPLARES                                                                      │
│  GET    /api/v1/copies            → { copies }                                  │
│  GET    /api/v1/copies/:id        → { copy }                                     │
│  POST   /api/v1/copies            { barcode, bookId, branchId } (admin)         │
│  PUT    /api/v1/copies/:id        { status, location } (admin)                   │
│  POST   /api/v1/copies/:id/transfer { targetBranchId } (admin)                  │
│                                                                                  │
│  PRÉSTAMOS                                                                       │
│  POST   /api/v1/loans             { copyId, userId } (bibliotecario)             │
│  POST   /api/v1/loans/:id/return  {} (bibliotecario)                             │
│  POST   /api/v1/loans/:id/renew   {} (usuario → propio, bibliotecario)          │
│  GET    /api/v1/loans/my          → { loans } (usuario logueado)                 │
│  GET    /api/v1/loans/overdue     → { loans } (admin/bibliotecario)              │
│  GET    /api/v1/loans/active      → { loans } (admin/bibliotecario)              │
│                                                                                  │
│  RESERVAS                                                                        │
│  POST   /api/v1/reservations      { copyId } (usuario logueado)                 │
│  GET    /api/v1/reservations/my   → { reservations }                            │
│  DELETE /api/v1/reservations/:id  {} (usuario dueño o admin)                    │
│  POST   /api/v1/reservations/:id/notify {} (bibliotecario)                      │
│                                                                                  │
│  MULTAS                                                                          │
│  GET    /api/v1/fines/my          → { fines } (usuario logueado)                │
│  GET    /api/v1/fines             → { fines } (admin/bibliotecario)             │
│  PUT    /api/v1/fines/:id/pay     {} (usuario logueado)                        │
│  PUT    /api/v1/fines/:id/waive   {} (admin)                                    │
│                                                                                  │
│  SUCURSALES                                                                      │
│  GET    /api/v1/branches          → { branches }                                │
│  GET    /api/v1/branches/:id      → { branch, inventory }                       │
│  POST   /api/v1/branches          { ...branch } (admin)                        │
│  PUT    /api/v1/branches/:id      { ...branch } (admin)                        │
│                                                                                  │
│  RESEÑAS                                                                         │
│  GET    /api/v1/books/:id/reviews → { reviews }                                │
│  POST   /api/v1/books/:id/reviews { rating, comment } (usuario logueado)        │
│  PUT    /api/v1/reviews/:id      { rating, comment } (usuario dueño)          │
│  PUT    /api/v1/reviews/:id/moderate { status } (admin/bibliotecario)          │
│                                                                                  │
│  USUARIOS (Admin)                                                                │
│  GET    /api/v1/users             → { users }                                   │
│  GET    /api/v1/users/:id         → { user, stats }                             │
│  PUT    /api/v1/users/:id         { role, isActive }                           │
│  POST   /api/v1/users/:id/block   { until }                                    │
│                                                                                  │
│  REPORTES                                                                        │
│  GET    /api/v1/reports/popularity?startDate&endDate&branchId                    │
│  GET    /api/v1/reports/morosity?startDate&endDate                              │
│  GET    /api/v1/reports/movement?startDate&endDate&branchId                     │
│  GET    /api/v1/reports/export?format=CSV|PDF&type=...                          │
│                                                                                  │
│  WEBHOOKS/SISTEMA                                                                 │
│  POST   /api/v1/webhooks/barcode   { barcode } (escaner)                        │
│  GET    /api/v1/health             → { status: 'ok' }                           │
│  GET    /api/v1/metrics             → Prometheus metrics                        │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

**Ejemplo de Request/Response:**

```http
POST /api/v1/loans HTTP/1.1
Host: api.bibliotech.com
Content-Type: application/json
Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c3IuMTIzIiwiZXhwIjoxNzA...
X-Request-ID: 550e8400-e29b-41d4-a716-446655440000

{
  "copyId": "clx7k2j9f000108l5fj92abc",
  "userId": "clx7k2j9f000108l5fj93xyz",
  "branchId": "clx7k2j9f000108l5fj90branch"
}

Response 201 Created:
{
  "data": {
    "id": "clx7k2j9f000108l5fj91loan",
    "copy": {
      "id": "clx7k2j9f000108l5fj92abc",
      "barcode": "978-3-16-150400-0"
    },
    "user": {
      "id": "clx7k2j9f000108l5fj93xyz",
      "name": "Juan Pérez"
    },
    "loanDate": "2026-04-25T10:30:00Z",
    "dueDate": "2026-05-09T10:30:00Z",
    "renewalCount": 0,
    "maxRenewals": 2,
    "status": "ACTIVE"
  },
  "meta": {
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Versionado:**
- URL-based: `/api/v1/`, `/api/v2/` (fácil debugging, cache friendly)
- Header-based (alternativa): `Accept: application/vnd.bibliotech.v1+json`

---

## 6. Resumen de Decisiones Clave

```
┌─────────────────────────────────────────────────────────────────┐
│              DECISIONES ARQUITECTÓNICAS CLAVE                   │
├─────────────────────────────────────────────────────────────────┤
│  Backend: Node.js + Fastify + TypeScript                        │
│  DB: PostgreSQL 15+ (no MongoDB - razones: transacciones,       │
│       full-text search, ACID, madurez)                          │
│  ORM: Prisma (type-safety, migrations, Studio)                 │
│  Cache: Redis                                                    │
│  Frontend: React 18 + Vite + React Router v6                   │
│  Estado: Zustand (UI) + React Query (servidor)                  │
│  Estilos: Tailwind CSS + Radix UI                              │
│  Forms: React Hook Form + Zod                                  │
│  Tiempo real: Socket.io                                         │
│  Notificaciones: Nodemailer + FCM + Web Push                   │
│  Testing: Vitest + Playwright                                   │
│  Deploy: Docker + GitHub Actions + Railway/Vercel              │
└─────────────────────────────────────────────────────────────────┘
```

**¿Por qué no GraphQL?**
- El equipo no tiene experiencia previa con GraphQL
- Endpoints REST son suficientes para la complejidad del sistema
- REST es más fácil de cachar con CDN
- Documentación más simple (OpenAPI/Swagger)

**¿Por qué no Microservicios?**
- MVP: monolitomodular es suficiente
- PostgreSQL maneja bien la complejidad de relaciones
- Separación por módulos (carpetas) dentro del monorepo si escala

---

*Documento generado siguiendo principios de Spec-Driven Development (SDD) y arquitectura hexagonal.*
*Fecha: 25 de abril de 2026*
*Versión: 1.0*
