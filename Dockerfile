FROM odoo:18.0

USER root

# Copiar módulos personalizados y scripts de migración
COPY ./custom_addons /mnt/extra-addons
COPY ./fix_translate_column.py /mnt/extra-addons/fix_translate_column.py
COPY ./custom-entrypoint.sh /custom-entrypoint.sh

# Permisos correctos
RUN chown -R odoo:odoo /mnt/extra-addons \
    && chmod +x /custom-entrypoint.sh

USER odoo

ENTRYPOINT ["/custom-entrypoint.sh"]
CMD ["odoo"]
