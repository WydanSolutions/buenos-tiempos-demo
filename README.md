# Residencial Buenos Tiempos — Demo de gestión

Demo interactiva para **Residencial Buenos Tiempos** (Galauru SAS · sedes BT1 y BT2), desarrollada por **Wydan Solutions**.

## Cómo abrirla

**En línea:** https://wydansolutions.github.io/buenos-tiempos-demo/

**Opción recomendada — un solo archivo:** abrí `dist/Buenos-Tiempos-Demo.html` con doble clic (Chrome o Edge).
Todo está embebido (librerías, fuente, logo): funciona **sin internet y sin instalar nada**.

Para regenerar ese archivo después de cambiar el código:

```
node tools/build.js
```

**Modo desarrollo:** abrí `index.html` directamente, o serví la carpeta con `node .claude/serve.js . 5178` y entrá a http://localhost:5178.

## Perfiles para la presentación

| Rol | Usuario | Cómo entra |
| --- | --- | --- |
| Dirección | Dr. Miguel Yavarone | clic |
| Médico Director Técnico | Dr. Fernando Aguirre | clic |
| Enfermería | Lic. Mariana Castro Brum | clic |
| Cuidadora (tablet) | Lucía Fernández · BT1 | contraseña **1234** (o botón QR) |
| Cuidadora (tablet) | Mónica Píriz · BT2 | contraseña **1234** |
| Administración | Paula Benavídez | clic |
| Familiar | Silvia Barreiro (hija de María Elena) · Martín Medina | clic |

Los cambios se guardan en el navegador (`localStorage`) durante la presentación. El botón **Restablecer demo** (barra lateral o pantalla de ingreso) vuelve a los datos originales.
Las fechas de los datos se generan relativas al día de hoy, así la demo siempre está "al día".

## Recorridos sugeridos

1. **Cuidadora en tablet:** contraseña 1234 → *Dar medicación* → marcar las dosis del turno → *Registrar caída o incidente* → la caída queda en la Historia clínica (pestaña Caídas y Evoluciones) y en la Auditoría.
2. **Ratio de cuidadoras:** entrar como Dirección → en Inicio aparece «Turno noche BT2 por debajo del ratio» (Jimena con certificado médico) → clic → en el planificador arrastrar a Karina (volante) al turno noche → la alerta desaparece.
3. **Finanzas:** Dirección → Finanzas → alternar BT1 / BT2 / Consolidado arriba → gráficos mes a mes, comparativo y reporte PDF.
4. **Facturas a Google Drive:** Dirección → Cobranzas → *Facturas* → *Cargar factura* → número de factura + PDF o foto (o *Usar factura de ejemplo*) → vista previa → *Guardar en Drive*. Queda en `Buenos Tiempos / Facturas / año / mes / sede` y vinculada a la cuenta del residente. La facturación se hace en el sistema de facturación de la residencial; acá solo se carga el comprobante.
5. **Flyer de actividades:** Dirección → Familias → *Flyer de actividades* → elegir la actividad, diseño e ícono → *Enviar por WhatsApp a las familias* o *Descargar imagen* (1080 × 1350).

> En la demo, el envío por WhatsApp y el guardado en Google Drive son simulados (los archivos quedan en el navegador). En producción se conectan con la API de WhatsApp Business y la cuenta de Google Drive de la residencial.

## Exportables

- **PDF:** vista previa animada → *Descargar PDF* abre el diálogo de impresión; elegí **Guardar como PDF**. Salen en A4 con encabezado de la sede, «Página X de Y», usuario y fecha de emisión, y «Desarrollado por Wydan Solutions».
- **Excel:** encabezados con el verde de la marca, montos en $U, fechas dd/mm/aaaa, filtros y paneles inmovilizados.

## Notas normativas

- Ratio de cuidadoras: dependiente = Barthel 0–40 (Ordenanza MSP 1032/2019), según el art. 19 del Decreto 356/016. Los parámetros por turno son **configurables** en Configuración y deben validarse con la normativa vigente.
- Todos los nombres y datos son ficticios.
