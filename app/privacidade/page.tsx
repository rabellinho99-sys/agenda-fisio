import { TextoLegal, type Secao } from "@/components/TextoLegal";

export const metadata = { title: "Política de Privacidade | Agenda Fisio Pro" };

const introducao = [
  "Esta Política de Privacidade explica como a Rabello Academy, CNPJ nº 53.821.804/0001-18, com sede na Avenida Minas Gerais, 700, loja 7, CEP 35010-151, Governador Valadares, MG, trata dados pessoais no Agenda Fisio Pro, em conformidade com a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados, LGPD).",
  "Ela vale para os profissionais e clínicas que usam a plataforma (Assinantes) e para os pacientes que agendam atendimentos, recebem mensagens ou assinam termos por meio dela.",
];

const secoes: Secao[] = [
  {
    titulo: "Quem é responsável pelos seus dados",
    blocos: [
      "Dados dos Assinantes (profissionais e clínicas): a Rabello Academy é a controladora, ou seja, decide como esses dados são usados para prestar e cobrar o serviço.",
      "Dados dos pacientes: o controlador é o profissional ou a clínica que atende o paciente. A Rabello Academy atua como operadora, tratando esses dados apenas para que a plataforma funcione e conforme as instruções do profissional. Se você é paciente e quer exercer seus direitos, procure primeiro o profissional ou a clínica que te atende; também pode nos escrever, e encaminharemos o pedido a ele.",
    ],
  },
  {
    titulo: "Encarregado pelo tratamento de dados (DPO)",
    blocos: [
      "Encarregado: Pedro Henrique de Souza Rabello.",
      "Contato: rabelloacademy@gmail.com, com o assunto \"Privacidade\".",
    ],
  },
  {
    titulo: "Quais dados tratamos",
    blocos: [
      "Assinantes e usuários autorizados:",
      {
        lista: [
          "nome, e-mail, telefone, CPF ou CNPJ, endereço e dados profissionais (como registro no CREFITO, especialidades, logomarca, imagem de assinatura e carimbo);",
          "dados de pagamento necessários à cobrança, processados pelo Asaas (a plataforma não armazena número de cartão);",
          "registros de acesso, data e versão do aceite dos Termos, endereço IP e informações do navegador, para segurança e cumprimento do Marco Civil da Internet.",
        ],
      },
      "Pacientes (inseridos pelo profissional ou pelo próprio paciente na página de agendamento):",
      {
        lista: [
          "nome, telefone, CPF, data de nascimento e dados de agendamento;",
          "dados de saúde registrados pelo profissional: anamnese, evoluções, escalas de dor, testes, imagens e exames, classificação CIF, documentos emitidos;",
          "termos de consentimento assinados digitalmente, com data, hora, endereço IP e dados do dispositivo usados para comprovar a assinatura;",
          "mensagens trocadas pelo WhatsApp oficial da plataforma, como respostas de confirmação ou cancelamento.",
        ],
      },
    ],
  },
  {
    titulo: "Para que usamos os dados e com qual base legal",
    blocos: [
      {
        lista: [
          "Criar e manter a conta, prestar o serviço contratado e dar suporte: execução de contrato (art. 7º, V, da LGPD).",
          "Cobrança, emissão de notas e registros fiscais: execução de contrato e cumprimento de obrigação legal (art. 7º, II e V).",
          "Registros de acesso e aceite dos Termos: cumprimento de obrigação legal e exercício regular de direitos (art. 7º, II e VI).",
          "Segurança, prevenção a fraudes e melhoria técnica da plataforma: legítimo interesse (art. 7º, IX), sempre respeitando seus direitos.",
          "Dados de saúde dos pacientes: tratados pelo profissional de saúde para a tutela da saúde, em procedimento realizado por profissional de saúde, e para cumprimento das obrigações de registro em prontuário (art. 11, II, a e f, da LGPD), cabendo ao profissional avaliar a base adequada a cada caso.",
          "Mensagens de confirmação e lembrete aos pacientes: execução do serviço de agendamento solicitado pelo próprio paciente, podendo o paciente pedir para não receber mais mensagens.",
        ],
      },
      "Não vendemos, não alugamos e não usamos dados de pacientes para publicidade.",
    ],
  },
  {
    titulo: "Com quem compartilhamos",
    blocos: [
      "Compartilhamos dados apenas com fornecedores necessários para a plataforma funcionar, que atuam como suboperadores e seguem obrigações de segurança e confidencialidade:",
      {
        lista: [
          "Supabase: banco de dados, autenticação e armazenamento de arquivos, com servidores na região de São Paulo;",
          "Vercel: hospedagem do site e do painel;",
          "Asaas: processamento de pagamentos das assinaturas;",
          "Resend: envio de e-mails do sistema, como boas-vindas e redefinição de senha;",
          "Meta (WhatsApp Business Platform): envio das confirmações e lembretes e recebimento das respostas dos pacientes;",
          "Google: login com conta Google, quando o Assinante escolhe essa opção.",
        ],
      },
      "Também podemos compartilhar dados por ordem judicial, requisição de autoridade competente ou para defesa em processos.",
    ],
  },
  {
    titulo: "Transferência internacional",
    blocos: [
      "Alguns fornecedores podem processar dados fora do Brasil, como Estados Unidos. Nesses casos, utilizamos fornecedores que adotam garantias compatíveis com a LGPD, como cláusulas contratuais de proteção de dados, nos termos do art. 33 da LGPD.",
    ],
  },
  {
    titulo: "Por quanto tempo guardamos",
    blocos: [
      {
        lista: [
          "Enquanto a conta estiver ativa, os dados ficam guardados para a prestação do serviço.",
          "Após o encerramento da assinatura, os dados da clínica ficam disponíveis por 90 dias para reativação ou exportação e depois são excluídos.",
          "Registros de acesso são guardados por no mínimo 6 meses, conforme o Marco Civil da Internet; dados fiscais e de cobrança, pelo prazo exigido pela legislação tributária.",
          "A guarda do prontuário pelo prazo exigido pelo conselho profissional é responsabilidade do profissional, que deve exportar seus registros antes de encerrar a conta.",
        ],
      },
    ],
  },
  {
    titulo: "Como protegemos os dados",
    blocos: [
      {
        lista: [
          "dados de cada clínica isolados no banco de dados, sem acesso de outras clínicas;",
          "conexões criptografadas (HTTPS) e senhas armazenadas de forma protegida pelo provedor de autenticação;",
          "imagens de pacientes, assinaturas e carimbos em pastas privadas;",
          "documentos com código de integridade, que permite detectar alterações;",
          "acesso administrativo restrito a quem precisa dele para manter a plataforma.",
        ],
      },
      "Nenhum sistema é totalmente imune a incidentes. Se ocorrer um incidente de segurança relevante, avisaremos os Assinantes afetados e adotaremos as medidas previstas na LGPD e nas normas da ANPD.",
    ],
  },
  {
    titulo: "Seus direitos",
    blocos: [
      "Você pode solicitar, a qualquer momento: confirmação de que tratamos seus dados; acesso; correção de dados incompletos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários; portabilidade; informação sobre compartilhamentos; e revogação do consentimento, quando o tratamento se basear nele.",
      "Assinantes podem fazer os pedidos pelo e-mail rabelloacademy@gmail.com. Pacientes devem procurar primeiro o profissional ou a clínica que os atende, que é o controlador dos seus dados de saúde.",
      "Você também pode apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).",
    ],
  },
  {
    titulo: "Cookies",
    blocos: [
      "Usamos apenas cookies essenciais, necessários para manter você conectado com segurança e para o funcionamento do painel. Não usamos cookies de publicidade. Se passarmos a usar ferramentas de estatística, esta Política será atualizada.",
    ],
  },
  {
    titulo: "Crianças e adolescentes",
    blocos: [
      "Agendamentos e dados de pacientes menores de 18 anos devem ser realizados e autorizados pelos pais ou responsáveis legais, cabendo ao profissional observar as regras da LGPD e do Estatuto da Criança e do Adolescente.",
    ],
  },
  {
    titulo: "Alterações desta Política",
    blocos: [
      "Esta Política pode ser atualizada. A versão vigente e a data da última atualização ficam sempre no topo desta página, e alterações relevantes serão comunicadas aos Assinantes por e-mail ou no painel.",
    ],
  },
];

export default function PrivacidadePage() {
  return (
    <TextoLegal
      titulo="Política de Privacidade"
      versao="2026-09-28"
      atualizado="28 de setembro de 2026"
      introducao={introducao}
      secoes={secoes}
    />
  );
}
