# DashFact 📊

Dashboard de análisis de facturación. Importá un Excel y el dashboard queda disponible para todos sin necesidad de registrarse.

---

## Stack

- **React + Vite** — frontend
- **Supabase** — base de datos (gratis hasta 500 MB)
- **Vercel** — hosting (gratis)

---

## Setup paso a paso

### 1. Supabase (5 min)

1. Entrá a [supabase.com](https://supabase.com) y creá una cuenta gratis
2. Creá un nuevo proyecto (nombre: `dashfact`, elegí región más cercana)
3. Una vez creado, andá a **SQL Editor** y ejecutá esto:

```sql
create table dashfact_data (
  key text primary key,
  value text not null,
  updated_at timestamptz default now()
);

-- Acceso público de lectura y escritura (sin login)
alter table dashfact_data enable row level security;

create policy "public read" on dashfact_data
  for select using (true);

create policy "public write" on dashfact_data
  for insert with check (true);

create policy "public update" on dashfact_data
  for update using (true);

create policy "public delete" on dashfact_data
  for delete using (true);
```

4. Andá a **Project Settings → API** y copiá:
   - `Project URL` → es tu `VITE_SUPABASE_URL`
   - `anon public` key → es tu `VITE_SUPABASE_ANON_KEY`

---

### 2. GitHub (2 min)

1. Creá un repo nuevo en [github.com](https://github.com) llamado `dashfact`
2. En tu computadora, dentro de la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Initial commit - DashFact"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/dashfact.git
git push -u origin main
```

---

### 3. Vercel (3 min)

1. Entrá a [vercel.com](https://vercel.com) y conectá tu cuenta de GitHub
2. Hacé clic en **Add New Project** e importá el repo `dashfact`
3. En **Environment Variables** agregá:

| Variable | Valor |
|---|---|
| `VITE_SUPABASE_URL` | tu URL de Supabase |
| `VITE_SUPABASE_ANON_KEY` | tu anon key de Supabase |

4. Hacé clic en **Deploy** — en 2 minutos tenés la URL pública

---

### 4. Desarrollo local (opcional)

```bash
# Instalar dependencias
npm install

# Crear archivo de variables de entorno
cp .env.example .env.local
# Editá .env.local con tus credenciales de Supabase

# Correr en local
npm run dev
```

---

## Uso

1. Abrí la URL de Vercel
2. Hacé clic en **↑ Importar Excel**
3. Mapeá las columnas (la app las detecta automáticamente)
4. Confirmá la importación
5. Los datos quedan guardados en Supabase y disponibles para todos

---

## Estructura del proyecto

```
dashfact/
├── src/
│   ├── App.jsx          # Dashboard principal
│   ├── main.jsx         # Entry point
│   └── lib/
│       └── supabase.js  # Cliente Supabase + helpers
├── index.html
├── vite.config.js
├── package.json
└── .env.example
```

---

## Capacidad

| | Claude Artifact | DashFact (Supabase) |
|---|---|---|
| Almacenamiento | ~5 MB | 500 MB (free) |
| Filas aprox. | ~50.000 | +10.000.000 |
| URL propia | No | Sí |
| Sin registro para ver | ✓ | ✓ |
