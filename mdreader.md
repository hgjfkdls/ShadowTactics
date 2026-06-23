# Instalación de Markdown Reader (Chrome)

Extensión que renderiza archivos `.md`, `.mkd`, `.mdx`, `.markdown` como HTML bonito en el navegador.

## Requisitos

- Google Chrome (versión moderna, actualizada)

## Instalación desde Chrome Web Store

1. Abrir Chrome e ir a:

   ```
   https://chromewebstore.google.com/detail/markdown-reader/medapdbncneneejhbgcjceippjlfkmkg
   ```

2. Hacer clic en **"Add to Chrome"** (o **"Añadir a Chrome"**).

3. En la ventana de confirmación, hacer clic en **"Add extension"**.

4. La extensión se instala automáticamente. El icono (un documento con `M`) aparece en la barra de extensiones.

## Permitir acceso a archivos locales (necesario para `file://`)

5. Hacer clic en el icono de extensiones (`puzzle`) en la barra de Chrome → pin **Markdown Reader**.

   O ir directamente a `chrome://extensions/`.

6. En la tarjeta de **Markdown Reader**, abrir **"Details"** (o **"Detalles"**).

7. Activar **"Allow access to file URLs"** (o **"Permitir acceso a URLs de archivos"**).

## Uso

- **Archivos online**: navegar a una URL que termine en `.md` → se renderiza solo.

  Ej: `https://raw.githubusercontent.com/usuario/repo/main/README.md`

- **Archivos locales**: en Chrome, abrir `file:///ruta/al/archivo.md` → se renderiza solo.

  (requiere el paso 5-7)

## Verificar instalación

1. Descargar o crear un archivo de prueba `prueba.md`:

   ```
   # Hola Mundo

   **Markdown Reader** funciona ✅
   ```

2. Abrirlo en Chrome con `Ctrl+O` (o `Cmd+O` en Mac) y seleccionar el archivo.

3. Se debe ver renderizado con formato, no el texto plano.

## Solución de problemas

| Problema | Causa | Solución |
|----------|-------|----------|
| Archivo local se ve en texto plano | Falta permiso `file://` | Activar "Allow access to file URLs" en `chrome://extensions/` |
| La extensión no aparece | No se instaló correctamente | Reinstalar desde Chrome Web Store |
| `.md` online se descarga en vez de renderizarse | Chrome trata el .md como descarga | Usar la extensión Markdown Reader que intercepta la navegación |

## Enlaces

- Chrome Web Store: https://chromewebstore.google.com/detail/markdown-reader/medapdbncneneejhbgcjceippjlfkmkg
- Sitio oficial: https://md-reader.github.io/
