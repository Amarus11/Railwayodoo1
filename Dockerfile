FROM odoo:18.0

USER root

# Copiar tus módulos personalizados
COPY ./custom_addons /mnt/extra-addons

# Permisos correctos
RUN chown -R odoo:odoo /mnt/extra-addons

USER odoo

# Upgrade custom modules on every start to keep DB in sync with code
CMD ["odoo", "-u", "project_timesheet_time_control,syntropy_knowledge,syntropy_knowledge_nath"]
