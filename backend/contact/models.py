from django.db import models
#from django.contrib.gis.db import models as geomodels  # Para PointField
from django.core.exceptions import ValidationError
from django.utils import timezone


# Create your models here.
#
'''
----
Nome       | Descrição                       |
-----------+----------------------------------
Pendente   | Aguardando análise              |
Em Análise | Em avaliação pela secretaria    |
Resolvido  | Problema resolvido              |
Descartado | Solicitação sem procedência     |
'''
# Cadastro da situacao da solicitacao: 
class StatusSolicitacao(models.Model):
    nome = models.CharField(max_length=50, unique=True)
    descricao = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Status da Solicitação'
        verbose_name_plural = '1- Status das Solicitações'
        ordering = ['nome']  # Ordenação alfabética opcional

    def __str__(self):
        return self.nome

# Cadastro de e-mails das secretarias da prefeitura
class SecretariaEmail(models.Model):
    nome_secretaria = models.CharField(max_length=255)
    email = models.EmailField()

    class Meta:
        verbose_name = "Email da Secretaria"
        verbose_name_plural = "2- Emails das Secretarias"

    def __str__(self):
        return f"{self.nome_secretaria} - {self.email}"

# Cadastro de assuntos (problemas do bairro)
class AssuntoReclamacao(models.Model):
    nome = models.CharField(max_length=255)
    emails_secretaria = models.ManyToManyField(SecretariaEmail)

    class Meta:
        verbose_name = "Assunto da Reclamação"
        verbose_name_plural = "3- Assuntos da Reclamação"

    def __str__(self):
        return self.nome


class Solicitacao(models.Model):
    nome_morador = models.CharField(max_length=255)
    email_morador = models.EmailField(blank=True, null=True)
    telefone = models.CharField(max_length=20, blank=True, null=True)
    documento = models.CharField(max_length=50)

    assunto = models.ForeignKey(
        AssuntoReclamacao,
        on_delete=models.CASCADE,
        related_name='solicitacoes'
    )

    endereco = models.CharField(max_length=255)
    
    # Substituição temporária do PointField
    latitude = models.FloatField(null=True, blank=True)
    longitude = models.FloatField(null=True, blank=True)
    
    # geolocalizacao = geomodels.PointField()  # Substituído temporariamente por latitude/longitude
    # TODO: Reativar geolocalizacao = geomodels.PointField() quando GDAL estiver configurado

    detalhes = models.TextField(blank=True, null=True)

    data_hora = models.DateTimeField(auto_now_add=True)
    data_atualizacao = models.DateTimeField(auto_now=True)

    email_enviado = models.BooleanField(default=False)

    protocolo = models.CharField(
        max_length=30,
        unique=True,
        editable=False,
        null=True,
        blank=True
    )

    status = models.ForeignKey(
        StatusSolicitacao,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='solicitacoes'
    )

    class Meta:
        verbose_name = "Solicitação"
        verbose_name_plural = "4- Solicitações"
        ordering = ['-data_hora']

    def clean(self):
        if Solicitacao.objects.filter(
            documento=self.documento,
            assunto=self.assunto,
            endereco__iexact=self.endereco.strip(),
            status__nome__iexact='Pendente'
        ).exclude(pk=self.pk).exists():
            raise ValidationError("Já existe uma solicitação pendente para este endereço e assunto.")

    def save(self, *args, **kwargs):
        if not self.protocolo:
            today = timezone.now().date()
            data_str = today.strftime('%Y%m%d')
            count_today = Solicitacao.objects.filter(data_hora__date=today).count() + 1
            self.protocolo = f'REC-{data_str}-{str(count_today).zfill(3)}'

        if not self.status:
            try:
                self.status = StatusSolicitacao.objects.get(nome__iexact='Pendente')
            except StatusSolicitacao.DoesNotExist:
                pass

        super().save(*args, **kwargs)

    def __str__(self):
        return f"[{self.protocolo}] {self.nome_morador} - {self.assunto.nome}"
