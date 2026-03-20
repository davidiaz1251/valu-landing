# Valu Landing (Astro)

Landing de Valu Kraft con módulo de plantillas protegido por Firebase.

## Funcionalidades incluidas

- Página de login (`/login`)
- Registro (`/registro`)
- Recuperación de contraseña (`/olvide-contrasena`)
- Login con Google
- Página `/plantillas` protegida por sesión
- Roles de usuario:
  - `cliente_final`
  - `profesional_reposteria`
  - `admin`
- Descarga de plantillas desde Firebase Storage según rol
- Registro de descargas en colección `downloads`

---

## 1) Configuración local

```bash
npm install
cp .env.example .env
```

Completa `.env` con las credenciales web de Firebase.

Variables requeridas:

- `PUBLIC_FIREBASE_API_KEY`
- `PUBLIC_FIREBASE_AUTH_DOMAIN`
- `PUBLIC_FIREBASE_PROJECT_ID`
- `PUBLIC_FIREBASE_STORAGE_BUCKET`
- `PUBLIC_FIREBASE_APP_ID`

---

## 2) Estructura de datos esperada

### Colección `users/{uid}`

```json
{
  "uid": "...",
  "email": "...",
  "name": "...",
  "role": "cliente_final",
  "active": true
}
```

### Colección `downloads/{autoId}`

```json
{
  "uid": "...",
  "templateId": "...",
  "downloadedAt": "timestamp"
}
```

### Plantillas en código

Archivo: `src/data/templates.ts`

Cada plantilla necesita:

- `storagePath`: ruta del archivo en Firebase Storage
- `requiredRoles`: roles permitidos

Ejemplo:

```ts
{
  id: 'tpl-cumple-001',
  title: 'Topper Cumple Stitch',
  category: 'Cumpleaños',
  description: 'Plantilla editable para topper de tarta.',
  format: 'PDF',
  storagePath: 'templates/topper-cumple-stitch.pdf',
  requiredRoles: ['cliente_final', 'profesional_reposteria']
}
```

---

## 3) Reglas recomendadas (base)

### Firestore Rules

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function signedIn() { return request.auth != null; }
    function isAdmin() {
      return signedIn() &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    match /users/{uid} {
      allow read: if signedIn() && request.auth.uid == uid;
      allow create: if signedIn() && request.auth.uid == uid;
      allow update: if signedIn() && request.auth.uid == uid;
      allow delete: if false;
    }

    match /downloads/{docId} {
      allow create: if signedIn() && request.resource.data.uid == request.auth.uid;
      allow read: if isAdmin();
    }
  }
}
```

### Storage Rules

```txt
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /templates/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if false; // subir archivos desde consola/admin
    }
  }
}
```

> Nota: el control fino por rol se está aplicando en frontend (MVP). Si más adelante queréis blindaje total, migramos a validación server-side (SSR/Functions).

---

## 4) Comandos

```bash
npm run dev
npm run build
npm run preview
```
