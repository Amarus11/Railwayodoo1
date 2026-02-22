# Guía de Despliegue — Odoo 18 en VPS con Docker

Este proyecto contiene Odoo 18 con módulos personalizados listos para desplegarse en cualquier VPS Linux usando Docker. No se requieren conocimientos previos de servidores, solo seguir los pasos en orden.

---

## ¿Qué hace cada archivo?

| Archivo | Qué es |
|---|---|
| `Dockerfile` | Le dice a Docker cómo construir la imagen de Odoo con los módulos personalizados |
| `docker-compose.yml` | Orquesta los dos servicios necesarios: Odoo y PostgreSQL |
| `odoo.conf` | Configuración de Odoo: rutas de módulos, conexión a la base de datos, logs |
| `custom_addons/` | Módulos personalizados que se cargan automáticamente en Odoo |

---

## Requisitos del VPS

- Ubuntu 20.04 / 22.04 LTS
- Mínimo 4GB RAM (recomendado 8GB)
- Docker preinstalado (o imagen VPS con Docker)
- Acceso root por SSH

---

## Paso 1 — Conectarse al VPS

Desde tu terminal local (PowerShell en Windows, Terminal en Mac/Linux):

```bash
ssh root@TU_IP_VPS
```

La primera vez te preguntará si confías en el servidor. Escribe `yes`.

> **Por qué:** SSH es el protocolo estándar para controlar servidores remotos de forma segura desde la terminal.

---

## Paso 2 — Actualizar el sistema

```bash
apt update && apt upgrade -y
```

> **Por qué:** Asegura que el sistema tiene los últimos parches de seguridad y versiones de paquetes antes de instalar cualquier cosa.

---

## Paso 3 — Instalar Git y Docker Compose

```bash
apt install -y git docker-compose-plugin
```

> **Por qué:** Git permite clonar el repositorio. Docker Compose permite levantar múltiples contenedores (Odoo + PostgreSQL) con un solo comando.

---

## Paso 4 — Verificar instalaciones

```bash
docker --version && git --version && docker compose version
```

Deberías ver las versiones instaladas de cada herramienta. Si alguna falla, repite el paso anterior.

---

## Paso 5 — Clonar el repositorio

```bash
git clone https://github.com/Amarus11/Railwayodoo1.git /opt/odoo
```

> **Por qué:** Descarga todo el código del repositorio en la carpeta `/opt/odoo` del servidor. `/opt` es la carpeta estándar en Linux para aplicaciones de terceros.

---

## Paso 6 — Crear el archivo docker-compose.yml

Este archivo no está en el repositorio porque contiene contraseñas. Créalo manualmente:

```bash
nano /opt/odoo/docker-compose.yml
```

Pega el siguiente contenido:

```yaml
version: '3.8'

services:
  db:
    image: postgres:15
    container_name: odoo_db
    restart: always
    environment:
      POSTGRES_DB: odoo
      POSTGRES_USER: odoo
      POSTGRES_PASSWORD: odoo1234
    volumes:
      - postgres_data:/var/lib/postgresql/data

  odoo:
    build: .
    container_name: odoo_app
    restart: always
    depends_on:
      - db
    ports:
      - "8069:8069"
    environment:
      HOST: db
      USER: odoo
      PASSWORD: odoo1234
    volumes:
      - odoo_data:/var/lib/odoo
      - ./custom_addons:/mnt/extra-addons
      - ./odoo.conf:/etc/odoo/odoo.conf

volumes:
  postgres_data:
  odoo_data:
```

Guarda con `CTRL+X` → `Y` → `Enter`.

> **Por qué:** Define dos contenedores: `db` (base de datos PostgreSQL) y `odoo` (la app). Los volúmenes aseguran que los datos persistan aunque el contenedor se reinicie.

---

## Paso 7 — Configurar odoo.conf

```bash
nano /opt/odoo/odoo.conf
```

Reemplaza el contenido con:

```ini
[options]
addons_path = /usr/lib/python3/dist-packages/odoo/addons,/mnt/extra-addons
db_host = db
db_port = 5432
db_user = odoo
db_password = odoo1234
admin_passwd = admin1234
log_level = info
```

Guarda con `CTRL+X` → `Y` → `Enter`.

> **Por qué:** Le dice a Odoo dónde está la base de datos, qué contraseña usar y dónde encontrar los módulos personalizados.

---

## Paso 8 — Construir y levantar los contenedores

```bash
cd /opt/odoo && docker compose up -d --build
```

> Tarda 5-10 minutos la primera vez. Descarga las imágenes base de Odoo y PostgreSQL, copia los módulos y construye la imagen.

> **Por qué:** `--build` fuerza reconstruir la imagen con los últimos cambios. `-d` lo ejecuta en segundo plano (detached).

---

## Paso 9 — Inicializar la base de datos

La primera vez hay que decirle a Odoo que cree todas sus tablas en la base de datos:

```bash
docker exec odoo_app odoo -i base --stop-after-init -d odoo
```

> Tarda 3-5 minutos. Solo se hace **una vez**.

> **Por qué:** Odoo necesita crear su estructura interna de tablas antes de poder atender peticiones web.

---

## Paso 10 — Reiniciar y verificar

```bash
docker restart odoo_app
docker compose -f /opt/odoo/docker-compose.yml ps
```

Deberías ver ambos contenedores con estado `Up`.

---

## Paso 11 — Acceder a Odoo

Abre en tu navegador:

```
http://TU_IP_VPS:8069
```

---

## Actualizar cuando haya cambios en GitHub

Cada vez que hagas cambios en el repositorio y quieras aplicarlos al servidor:

```bash
cd /opt/odoo
git pull origin main
docker compose down
docker compose up -d --build
```

> **Por qué:** `git pull` descarga los últimos cambios. Luego se reconstruye la imagen para que Odoo los incluya.

---

## Comandos útiles del día a día

```bash
# Ver estado de los contenedores
docker compose -f /opt/odoo/docker-compose.yml ps

# Ver logs en tiempo real
docker logs -f odoo_app

# Reiniciar solo Odoo
docker restart odoo_app

# Apagar todo
docker compose -f /opt/odoo/docker-compose.yml down

# Levantar todo
docker compose -f /opt/odoo/docker-compose.yml up -d
```

---

## Seguridad recomendada antes de producción

- Cambiar `POSTGRES_PASSWORD` y `admin_passwd` por contraseñas seguras
- No subir `docker-compose.yml` a GitHub si tiene contraseñas (agregar al `.gitignore`)
- Configurar un dominio con Nginx + SSL (Let's Encrypt)
- Activar firewall: `ufw allow 22 && ufw allow 8069 && ufw enable`

---

## Estructura del proyecto

```
/opt/odoo/
├── Dockerfile              ← Imagen de Odoo con módulos personalizados
├── docker-compose.yml      ← Orquestación de contenedores (creado en el VPS)
├── odoo.conf               ← Configuración de Odoo
└── custom_addons/          ← Módulos personalizados
    ├── knowledge_plus/
    └── project_timesheet_time_control/
```
