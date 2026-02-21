FROM odoo:18.0

USER root

# Copiar tus módulos personalizados
COPY ./custom_addons /mnt/extra-addons

# Copiar entrypoint personalizado
COPY ./entrypoint.sh /entrypoint-custom.sh
RUN chmod +x /entrypoint-custom.sh

# Permisos correctos
RUN chown -R odoo:odoo /mnt/extra-addons

USER odoo

ENTRYPOINT ["/entrypoint-custom.sh"]
