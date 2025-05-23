from django.db import models
from django.conf import settings
from django.utils import timezone

TIPO_PROBLEMA_CHOICES = [
    ('lixo', 'Acúmulo de lixo'),
    ('alagamento', 'Alagamento'),
    ('sinalizacao', 'Problema de Sinalização'),
    ('buraco', 'Buraco na Via'),
    ('congestionamento', 'Congestionamento/Trânsito'),
    ('deslizamento', 'Risco de Deslizamento'),
    ('esgoto', 'Esgoto a Céu Aberto'),
    ('iluminacao', 'Falha na Iluminação Pública'),
    ('violencia', 'Local com Ocorrência de Violência'),
    ('outros', 'Outros Problemas'),
]

STATUS_PROBLEMA_CHOICES = [
    ('pendente', 'Pendente'),
    ('em_analise', 'Em Análise'),
    ('em_andamento', 'Em Andamento'),
    ('solucionado', 'Solucionado'),
    ('recusado', 'Recusado/Inválido'),
]

class Problema(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='problemas_reportados'
    )
    tipo_problema = models.CharField(
        max_length=50,
        choices=TIPO_PROBLEMA_CHOICES,
        default='outros'
    )
    descricao = models.TextField(blank=True, null=True)
    endereco_texto = models.CharField(max_length=255, blank=True, null=True, help_text="Endereço aproximado do problema.")
    latitude = models.DecimalField(max_digits=9, decimal_places=6)  # latitude aproximada
    longitude = models.DecimalField(max_digits=9, decimal_places=6) # longitude aproximada
    status = models.CharField(
        max_length=20,
        choices=STATUS_PROBLEMA_CHOICES,
        default='pendente'
    )
    data_reporte = models.DateTimeField(default=timezone.now)
    data_ultima_atualizacao = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Problema {self.get_tipo_problema_display()} reportado por {self.usuario} em {self.data_reporte.strftime('%Y-%m-%d %H:%M')}"
