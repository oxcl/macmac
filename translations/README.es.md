# MacMac 🦊

Extensión de Firefox para gestión de contenedores basada en cuentas.

[![Licencia MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Hecho con WXT](https://img.shields.io/badge/built%20with-WXT-0052cc)](https://wxt.dev)

## Características

- **Aislamiento por cuenta** — cada contenedor representa una cuenta en un sitio web. Las sesiones, cookies y datos se mantienen completamente separados entre cuentas del mismo sitio.
- **Cambio automático de contenedor** — al visitar un sitio, MacMac te redirige al contenedor correcto sin que tengas que hacer nada.
- **Memoria por sitio** — la última cuenta usada en cada sitio se guarda entre sesiones.
- **Ventana emergente** — gestiona todas tus cuentas del sitio actual en un solo lugar.
- **Abrir sin cambiar** — abre otra cuenta en una nueva pestaña sin cambiar tu selección por defecto. Útil para revisar rápidamente una segunda cuenta.
- **Gestión completa desde el popup** — crear, renombrar, eliminar y abrir cuentas en nuevas pestañas.

## Cómo funciona

Abre el popup en cualquier sitio web y haz clic en **Crear nueva cuenta**. MacMac crea un contenedor sin nombre (se nombra automáticamente "Cuenta 1", "Cuenta 2", etc.), abre el sitio en él, y tú inicias sesión. Puedes renombrar la cuenta después desde el popup.

Cada contenedor se nombra internamente como `NombreCuenta (host)` — por ejemplo, `Cuenta 1 (facebook.com)` — lo que lo vincula a ese sitio.

## Implementación

Tres claves de almacenamiento manejan toda la lógica:

- `accounts` — metadatos de las cuentas (id, nombre, hosts)
- `hostnameAccounts` — mapeo de host a cuentas
- `lastSelected` — preferencia de cuenta por host

Cuando navegas a un sitio, el script de fondo revisa `lastSelected`. Si hay una cuenta asignada, la pestaña cambia a ese contenedor. Si no, se usa la identidad por defecto (sin contenedor).

## Uso

**Crear una cuenta:** haz clic en el icono de la barra de herramientas, luego en **+ Crear nueva cuenta**. Se crea un nuevo contenedor sin nombre y se activa. Inicia sesión en tu cuenta, y renómbrala desde el popup si quieres.

**Cambiar de cuenta:** haz clic en cualquier tarjeta de cuenta en el popup. Tu elección se guarda para futuras visitas.

**Abrir sin cambiar:** haz clic en el icono de nueva pestaña en la tarjeta de una cuenta para abrir el sitio en ese contenedor sin cambiar la asignación por defecto.

## Desarrollo

```bash
bun install           # instalar dependencias + WXT postinstall
bun run dev           # servidor de desarrollo con recarga en caliente
bun run compile       # verificación de tipos
bun run lint          # linter
bun run build:firefox # compilación para producción
```

## Contribuir

Los PRs y issues son bienvenidos. Para solicitudes de funciones o errores, abre una discussion.

## Apoyo

Si MacMac te resulta útil, considera darle una estrella al repositorio en [GitHub](https://github.com/oxcl/macmac) o hacer una [donación](https://oxcl.github.io/macmac/#donate).
