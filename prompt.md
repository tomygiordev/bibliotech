Eres un arquitecto de software sénior con amplia experiencia en aplicaciones web modernas. Tu tarea es diseñar un plan integral para un Sistema de Gestión de Biblioteca (Library Management System) utilizando Node.js en el backend y React en el frontend. La solución debe ser moderna, escalable, segura y centrada en una excelente experiencia de usuario.

Instrucciones para la respuesta:

Estructura el plan en las secciones y subsecciones indicadas más abajo.

Sé extremadamente específico: evita generalidades. Incluye nombres de tecnologías exactas, patrones de diseño, estructuras de carpetas y menciones a herramientas concretas.

Cuando sea pertinente, agrega fragmentos de código breves (JSON, diagramas en ASCII, esquemas de bases de datos, ejemplos de configuración) para ilustrar decisiones de arquitectura.

Todo el contenido debe estar en español, con un tono profesional y didáctico.

Prioriza la justificación de cada elección técnica (por qué PostgreSQL sobre MongoDB, por qué Zustand sobre Redux, etc.).

Secciones obligatorias del plan:

Visión general y objetivos del sistema

Propósito del sistema, contexto de uso y metas principales (eficiencia operativa, autoservicio, fidelización de lectores).

Principios arquitectónicos: separación de responsabilidades, API-first, seguridad por diseño, alta disponibilidad.

Roles de usuario y permisos

Administrador, bibliotecario, socio/lector (y posiblemente invitado).

Matriz detallada de funcionalidades permitidas por rol.

Requisitos funcionales detallados (cada punto debe describir comportamiento, reglas de negocio y dependencias técnicas):

Catálogo de libros con búsqueda full‑text, filtros facetados (autor, género, disponibilidad, sucursal) y paginación infinita/tradicional.

Gestión de ejemplares (cada copia física) y sucursales (múltiples ubicaciones con inventario propio).

Ciclo completo de préstamos: préstamo, devolución, renovación (con límites configurables) y reservas con cola de espera.

Multas automáticas por retraso, notificaciones por email (Nodemailer/SendGrid) y push (Firebase Cloud Messaging o Web Push).

Panel de administración con gráficos de popularidad (libros más prestados), tasa de morosidad, reportes exportables (CSV/PDF).

Integración con APIs externas (Google Books, Open Library) para obtener metadatos y portadas (fallback automático).

Valoraciones (estrellas) y reseñas de usuarios, con moderación básica.

Escaneo de códigos de barras/QR usando la cámara del dispositivo (librerías como html5-qrcode o quagga2), con opción de ingreso manual.

Stack tecnológico detallado y justificaciones

Backend: Node.js con Express o Fastify (indicar cuál eliges y por qué). Autenticación con JWT + refresh tokens rotativos. Validación de datos con Zod. ORM/ODM: Prisma (si PostgreSQL) o Mongoose (si MongoDB). Justifica la elección de la base de datos (PostgreSQL recomendada, con argumentos a favor y en contra de MongoDB).

Base de datos: Diseño del esquema conceptual con tablas/colecciones y relaciones (usuarios, libros, ejemplares, sucursales, préstamos, reservas, multas, reseñas). Índices necesarios.

Frontend: React + Vite, React Router v6 con loaders/actions (si aplica). Estado global con Zustand (o Redux Toolkit) y React Query para servidor. Estilos con Tailwind CSS (o Chakra UI) y componentes headless donde aplique. Formularios con React Hook Form + Zod.

Notificaciones en tiempo real: WebSockets con Socket.io para avisos de vencimientos y recordatorios.

Pruebas: Unitarias y de integración con Jest + React Testing Library. E2E con Playwright (o Cypress). Cobertura mínima esperada.

DevOps: Contenedores Docker/docker-compose. CI/CD con GitHub Actions. Despliegue en AWS (ECS, RDS) o Railway/Vercel. Monitoreo con Winston + Grafana/Prometheus o servicio gestionado.

Arquitectura de la aplicación

Backend: estructura de carpetas (Clean Architecture o MVC ampliado) con capas de routes, controllers, services, repositories, entities, middlewares, config, utils. Ejemplo esquemático.

Frontend: estructura basada en features (módulos: books, loans, users, auth) con componentes, páginas, hooks, services, utils, styles. Lazy loading y code splitting por ruta.

Diagrama de flujo de datos (textual o ASCII): desde la acción del usuario hasta la respuesta, pasando por React Query, API Gateway, servicios y base de datos.

API: RESTful (o GraphQL si tu elección la favorece). Endpoints principales con método, ruta, headers, parámetros y cuerpos de ejemplo. Sistema de versionado (URL o header). 