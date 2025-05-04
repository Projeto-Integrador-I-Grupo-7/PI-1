from django import forms
from contact.models import Solicitacao, AssuntoReclamacao

from django.shortcuts import render, redirect

class SolicitacaoForm(forms.ModelForm):
    class Meta:
        model = Solicitacao
        fields = (
            'nome_morador',
            'email_morador',
            'telefone',
            'documento',
            'assunto',
            'endereco',
            'latitude',
            'longitude',
            'detalhes',
        )
        labels = {
            'nome_morador': 'Nome completo',
            'email_morador': 'E-mail',
            'telefone': 'Telefone',
            'documento': 'CPF ou RG',
            'assunto': 'Assunto da Reclamação',
            'endereco': 'Endereço do Problema',
            'latitude': 'Latitude (opcional)',
            'longitude': 'Longitude (opcional)',
            'detalhes': 'Detalhes da solicitação',
        }
        widgets = {
            'nome_morador': forms.TextInput(attrs={'placeholder': 'Digite seu nome completo'}),
            'email_morador': forms.EmailInput(attrs={'placeholder': 'email@exemplo.com'}),
            'telefone': forms.TextInput(attrs={'placeholder': '(99) 99999-9999'}),
            'documento': forms.TextInput(attrs={'placeholder': 'Digite seu CPF ou RG'}),
            'assunto': forms.Select(),
            'endereco': forms.TextInput(attrs={'placeholder': 'Rua, número, bairro'}),
            'latitude': forms.NumberInput(attrs={'step': 'any'}),
            'longitude': forms.NumberInput(attrs={'step': 'any'}),
            'detalhes': forms.Textarea(attrs={'rows': 5, 'placeholder': 'Descreva o problema detalhadamente'}),
        }

    # Adicionando uma opção padrão no campo 'assunto'
    def __init__(self, *args, **kwargs):
        super(SolicitacaoForm, self).__init__(*args, **kwargs)
        self.fields['assunto'].empty_label = "Selecione o Assunto"
    

    # def clean(self):
    #     cleaned_data = self.cleaned_data
    #     print(cleaned_data)
    #     return super().clean()


def solicitar(request):
    form = SolicitacaoForm()  # Criando uma instância do formulário

    if request.method == 'POST':
        form = SolicitacaoForm(request.POST)  # Recebendo os dados do formulário
        if form.is_valid():
            solicitacao = form.save()  # ← salvar e armazenar a instância
            return redirect(f"/contact/sucesso/?protocolo={solicitacao.protocolo}")
        else:
            print(form.errors)  # Para depuração, verifica os erros do formulário

    # Obtemos todos os assuntos para preencher o campo no formulário
    assuntos = AssuntoReclamacao.objects.all()

    context = {
        'form': form,        # Passando o formulário para o template
        'assuntos': assuntos  # Passando a lista de assuntos
    }

    return render(request, 'contact/solicitar.html', context)

# Sua view de sucesso
def pagina_sucesso(request):
    protocolo = request.GET.get('protocolo')  # Pega o protocolo da URL
    return render(request, 'contact/sucesso.html', {'protocolo': protocolo})
