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
| Dirección | Carolina Galarza | clic |
| Médico Director Técnico | Dr. Fernando Aguirre | clic |
| Enfermería | Lic. Mariana Castro Brum | clic |
| Cuidadora (tablet) | Lucía Fernández · BT1 | contraseña **lucia2026** (o botón QR) |
| Cuidadora (tablet) | Mónica Píriz · BT2 | contraseña **monica2026** |
| Administración | Paula Benavídez | clic |
| Familiar | Silvia Barreiro (hija de María Elena) · Martín Medina | clic |

Los cambios se guardan en el navegador (`localStorage`) durante la presentación. El botón **Restablecer demo** (barra lateral o pantalla de ingreso) vuelve a los datos originales.
Las fechas de los datos se generan relativas al día de hoy, así la demo siempre está "al día".

## Recorridos sugeridos

1. **Cuidadora en tablet:** contraseña lucia2026 → *Dar medicación* → marcar las dosis del turno → *Registrar caída o incidente* → la caída queda en la Historia clínica (pestaña Caídas y Evoluciones) y en la Auditoría.
2. **Ratio de cuidadoras:** entrar como Dirección → en Inicio aparece «Turno noche BT2 por debajo del ratio» (Jimena con certificado médico) → clic → en el planificador arrastrar a Karina (volante) al turno noche → la alerta desaparece.
3. **Finanzas:** Dirección → Finanzas → alternar BT1 / BT2 / Consolidado arriba → gráficos mes a mes, comparativo y reporte PDF.

## Exportables

- **PDF:** vista previa animada → *Descargar PDF* abre el diálogo de impresión; elegí **Guardar como PDF**. Salen en A4 con encabezado de la sede, «Página X de Y», usuario y fecha de emisión, y «Desarrollado por Wydan Solutions».
- **Excel:** encabezados con el verde de la marca, montos en $U, fechas dd/mm/aaaa, filtros y paneles inmovilizados.

## Notas normativas

- Ratio de cuidadoras: dependiente = Barthel 0–40 (Ordenanza MSP 1032/2019), según el art. 19 del Decreto 356/016. Los parámetros por turno son **configurables** en Configuración y deben validarse con la normativa vigente.
- Todos los nombres y datos son ficticios.
