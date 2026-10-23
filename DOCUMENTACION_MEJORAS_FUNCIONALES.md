# Documentación de mejoras funcionales

Este documento resume las correcciones y mejoras trabajadas en las vistas Master, ShipmentDetail y PalletDetail. Describe el comportamiento funcional, sin detallar la implementación.

## Navegación desde el filtro «Con Faltantes»

Al seleccionar un viaje desde Master, la aplicación abre primero ShipmentDetail, también cuando la lista está filtrada por viajes con faltantes. Desde ShipmentDetail se conserva el flujo habitual para acceder al detalle de un pallet.

El comportamiento anterior podía consultar los pallets faltantes del viaje seleccionado y abrir directamente PalletDetail. Esa navegación dejó de ser el flujo activo de selección en Master.

## Actualización de cantidades independiente del guardado de componentes

Modificar la cantidad observada de un componente mixto actualiza esa cantidad por separado. La edición no ejecuta el guardado de la selección de componentes ni procesa automáticamente el buffer de selección.

Después de la actualización, la aplicación vuelve a leer el componente, actualiza su información local y refresca la lista. Si otros componentes estaban seleccionados, sus botones de selección se restauran después del refresco. Si el componente editado pasa a estado faltante, se retira de la selección pendiente.

## Orden consistente de las familias

Las familias y los materiales se presentan con un único criterio: orden ascendente por familia y, dentro de cada familia, por material. El criterio se mantiene al cargar o refrescar la lista.

## Carga y refresco de componentes del pallet

La respuesta de SAP revisada para el pallet de prueba incluía los componentes dentro de la colección expandida. Para evitar que los datos recibidos se pierdan o no se muestren al volver a abrir un pallet:

- La lista utiliza un único binding declarativo para sus componentes; se evita reemplazarlo mediante un segundo enlace manual después de algunas operaciones.
- La carga del pallet espera a que los metadatos del servicio estén disponibles antes de construir su ruta y enlazar el detalle.
- El orden inicial queda a cargo de la configuración de la lista, en lugar de intentar ordenar mientras la carga asíncrona del pallet todavía puede estar en curso.
- El cálculo de los encabezados de familia se basa en el contexto del pallet y su colección de componentes, no en analizar rutas internas de UI5.

La intención de estas medidas es mantener la lista conectada al pallet actual y mostrar los componentes ya devueltos por SAP tras guardar y volver a entrar.

## Consistencia de la selección y guardado CRUD

La selección de componentes se mantiene en un buffer de cambios respecto del estado actual:

- Marcar un componente agrega el cambio pendiente correspondiente.
- Desmarcarlo revierte ese cambio si vuelve a su estado inicial.
- Cada componente se identifica por sus claves de pallet, ubicación y material, no por comparar la serialización completa del objeto.

El botón Guardar de PalletDetail continúa usando el flujo CRUD activo. Este flujo construye el envío a partir de los componentes que permanecen seleccionados en el buffer.

## Componentes con cantidad parcial al guardar

Antes de enviar la selección CRUD, la aplicación compara la cantidad observada con la cantidad total de los componentes seleccionados. Si detecta una cantidad observada menor al total —por ejemplo, 2 de 3—:

1. Actualiza en SAP la cantidad observada de ese componente usando la misma operación de actualización de cantidad que se utiliza al editar el campo.
2. Lee la respuesta para confirmar el estado del componente.
3. Si SAP confirma que quedó como faltante, lo quita del buffer y de la selección que se enviará como controlada.
4. Después procesa el resto de los componentes seleccionados.

Si SAP no confirma el estado faltante, la aplicación muestra un aviso con el SKU y las cantidades, y no continúa con el guardado del resto. Así se evita enviar como controlado un componente parcial sin confirmación del backend.

## Validaciones realizadas y pendientes

Las modificaciones de frontend se validaron con revisión de sintaxis JavaScript y compilación de la aplicación UI5. También se verificó el formato del diff en los cambios correspondientes.

Estas comprobaciones no sustituyen las pruebas funcionales conectadas a SAP. En particular, el tratamiento de cantidades parciales depende de que el backend refleje el estado `missing` tras actualizar la cantidad observada. Conviene probar este flujo y confirmar en Network tanto la respuesta de actualización del componente como la respuesta del guardado CRUD.
