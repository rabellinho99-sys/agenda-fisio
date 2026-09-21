import { Markdown } from "@/components/Assinar";

export const metadata = { title: "Termos de Uso - Agenda Fisio" };

const TEXTO = `Ao criar conta, contratar um plano ou usar o Agenda Fisio, você declara ter lido e aceitado estes Termos e a Política de Privacidade. Se não concordar, não use o serviço. Aqui, Plataforma ou Agenda Fisio é o serviço; Assinante é o profissional ou clínica que contrata; Paciente é a pessoa atendida pelo Assinante.

## 1. Objeto
O Agenda Fisio é um sistema de agendamento online, prontuário eletrônico, gestão de pacientes, termos de consentimento e notificações, oferecido como serviço por assinatura ao Assinante.

## 2. Cadastro e conta
2.1 O Assinante fornece dados verdadeiros e mantém suas credenciais em sigilo.
2.2 O Assinante é responsável por toda atividade realizada em sua conta.
2.3 O Assinante declara ser profissional habilitado e regularmente inscrito em seu conselho de classe, quando aplicável, e responde pela veracidade dessa informação.

## 3. Planos, pagamento e teste
3.1 Os planos vigentes e seus preços são apresentados na Plataforma no momento da contratação.
3.2 A cobrança é mensal e recorrente, processada pelo provedor de pagamentos Asaas. Os dados de pagamento são tratados pelo Asaas, não pela Plataforma.
3.3 Pode haver período de teste gratuito, informado na contratação. Ao fim do teste, a cobrança inicia automaticamente, salvo cancelamento anterior.
3.4 O não pagamento pode suspender ou encerrar o acesso, preservados os prazos legais.

## 4. Cancelamento e reembolso
4.1 O Assinante pode cancelar a qualquer momento pela Plataforma ou pelo e-mail de contato.
4.2 O cancelamento encerra a renovação seguinte. O período já pago não é reembolsado, salvo disposição legal em contrário ou o direito de arrependimento de 7 dias do Código de Defesa do Consumidor quando aplicável.

## 5. Responsabilidades do Assinante
5.1 O Assinante é o único responsável pela conduta clínica, diagnósticos, condutas terapêuticas e conteúdo que registra, inclusive prontuários, anamneses e termos de consentimento.
5.2 O Assinante é o Controlador dos dados dos seus Pacientes e responde pela base legal do tratamento, pela obtenção dos consentimentos e pelo cumprimento da LGPD perante seus Pacientes.
5.3 O Assinante usa a Plataforma conforme a lei, sem inserir dados de terceiros sem base legal.

## 6. Responsabilidades e limites da Plataforma
6.1 A Plataforma mantém esforços razoáveis de disponibilidade, segurança e continuidade, sem garantir funcionamento ininterrupto ou livre de falhas.
6.2 A Plataforma é uma ferramenta e não presta serviço de saúde, não emite opinião clínica e não interfere na relação entre Assinante e Paciente.
6.3 Na máxima extensão permitida em lei, a responsabilidade da Plataforma por danos fica limitada ao valor pago pelo Assinante nos 12 meses anteriores ao evento.
6.4 A Plataforma não responde por indisponibilidades de terceiros dos quais depende, como provedores de hospedagem, banco de dados, pagamento e mensageria.

## 7. Uso aceitável
É vedado tentar burlar a segurança, acessar dados de outras contas, usar a Plataforma para fim ilícito, sobrecarregar a infraestrutura de forma abusiva, ou revender o acesso sem autorização.

## 8. Propriedade intelectual
O software, a marca e a identidade visual do Agenda Fisio pertencem à Plataforma. Os dados clínicos e cadastrais inseridos pelo Assinante pertencem ao Assinante e a seus Pacientes.

## 9. Vigência e alterações
9.1 Estes Termos vigoram enquanto durar a conta.
9.2 A Plataforma pode alterar estes Termos, avisando com antecedência razoável pelos canais do sistema. O uso após a alteração significa aceite.
9.3 No encerramento, o Assinante pode solicitar a exportação dos seus dados dentro do prazo informado, após o qual os dados podem ser eliminados conforme a Política de Privacidade.

## 10. Tratamento de dados de Pacientes (LGPD)
10.1 O Assinante é o Controlador e a Plataforma é a Operadora dos dados de Pacientes, tratando-os somente para prestar o serviço e conforme as instruções do Assinante e a lei.
10.2 A Plataforma mantém medidas de segurança adequadas, incluindo isolamento entre clínicas, controle de acesso e criptografia em trânsito, e mantém sigilo.
10.3 A Plataforma se apoia em suboperadores: Vercel, Supabase, Asaas e Meta (WhatsApp), quando aplicável.
10.4 A Plataforma comunicará o Controlador sobre incidente de segurança com risco relevante, em prazo razoável a partir da ciência.
10.5 Encerrado o contrato, o Controlador pode exportar os dados de Pacientes dentro do prazo informado, após o qual são eliminados, salvo obrigação legal de retenção.

## 11. Foro
Fica eleito o foro da comarca de Governador Valadares/MG, salvo regra de competência do consumidor mais favorável ao Assinante.

Responsável: Rabello Academy, CNPJ 53.821.804/0001-18. Contato: rabellinho99@gmail.com. Última atualização: 21 de setembro de 2026.`;

export default function TermosPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-sm text-ink/60">Agenda Fisio</p>
      <h1 className="h-display mt-1 text-4xl">Termos de Uso</h1>
      <article className="mt-6 rounded-2xl bg-white p-6"><Markdown texto={TEXTO} /></article>
    </main>
  );
}
