from django.contrib import admin
from contact import models
from .models import StatusSolicitacao, SecretariaEmail, AssuntoReclamacao, Solicitacao


# Registrar os modelos na ordem desejada

@admin.register(StatusSolicitacao)
class StatusSolicitacaoAdmin(admin.ModelAdmin):
    list_display = ['nome', 'descricao']


@admin.register(SecretariaEmail)
class SecretariaEmailAdmin(admin.ModelAdmin):
    list_display = ['nome_secretaria', 'email']
    search_fields = ['nome_secretaria', 'email']


@admin.register(AssuntoReclamacao)
class AssuntoReclamacaoAdmin(admin.ModelAdmin):
    list_display = ['nome']
    search_fields = ['nome']
    filter_horizontal = ['emails_secretaria']  # Interface melhor para selecionar vários


@admin.register(Solicitacao)
class SolicitacaoAdmin(admin.ModelAdmin):
    list_display = (
        'protocolo',
        'nome_morador',
        'assunto',
        'status',
        'data_hora',
        'latitude',
        'longitude',
    )
    search_fields = ('nome_morador', 'protocolo', 'documento')
    list_filter = ('status', 'assunto', 'data_hora')
    ist_per_page = 10
    list_max_show_all = 300
