# Arquivo: mapa_app/admin.py

from django.contrib import admin
from .models import Problema # Importe seu modelo

@admin.register(Problema)
class ProblemaAdmin(admin.ModelAdmin):
    list_display = ('id', 'tipo_problema', 'status', 'usuario', 'data_reporte', 'endereco_texto', 'latitude', 'longitude')
    list_filter = ('status', 'tipo_problema', 'data_reporte', 'usuario')
    search_fields = ('descricao', 'endereco_texto', 'usuario__username', 'usuario__email')
    readonly_fields = ('data_reporte', 'data_ultima_atualizacao') # Campos que não devem ser editados manualmente
    
    fieldsets = (
        (None, {
            'fields': ('tipo_problema', 'descricao', 'endereco_texto')
        }),
        ('Localização', {
            'fields': ('latitude', 'longitude')
        }),
        ('Status e Atribuição', {
            'fields': ('status', 'usuario') # Usuário é editável aqui, mas pode ser preenchido automaticamente na view
        }),
        ('Datas Importantes', {
            'fields': ('data_reporte', 'data_ultima_atualizacao'),
            'classes': ('collapse',) # Começa recolhido no admin
        }),
    )