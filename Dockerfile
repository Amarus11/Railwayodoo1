FROM odoo:18.0

USER root

# Copiar tus módulos personalizados
COPY ./custom_addons /mnt/extra-addons

# Permisos correctos
RUN chown -R odoo:odoo /mnt/extra-addons

USER odoo
