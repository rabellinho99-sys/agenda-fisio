import { TextoLegal, type Secao } from "@/components/TextoLegal";

export const metadata = { title: "Termos de Uso | Agenda Fisio Pro" };

const introducao = [
  "Estes Termos de Uso regulam a contratação e o uso do Agenda Fisio Pro, plataforma online de agenda, agendamento, prontuário e documentos para fisioterapeutas e clínicas, disponibilizada pela Rabello Academy, inscrita no CNPJ sob o nº 53.821.804/0001-18, com sede na Avenida Minas Gerais, 700, loja 7, CEP 35010-151, Governador Valadares, MG (\"Rabello Academy\" ou \"nós\").",
  "Ao criar uma conta e marcar a caixa de aceite, você (\"Assinante\") declara que leu, entendeu e concorda com estes Termos e com a Política de Privacidade. Se não concordar, não utilize a plataforma.",
];

const secoes: Secao[] = [
  {
    titulo: "Definições",
    blocos: [
      {
        lista: [
          "Plataforma: o software Agenda Fisio Pro, acessado pelo site agendafisiopro.com.br, incluindo painel, página pública de agendamento, mensagens automáticas e documentos.",
          "Assinante: pessoa física ou jurídica que cria a conta e contrata um plano, normalmente o fisioterapeuta ou a clínica.",
          "Usuários autorizados: profissionais e colaboradores que o Assinante cadastra para usar a conta.",
          "Pacientes: pessoas atendidas pelo Assinante, cujos dados são registrados na Plataforma pelo Assinante ou por meio da página de agendamento.",
          "Dados do Assinante: todas as informações inseridas na Plataforma pelo Assinante, Usuários autorizados ou Pacientes, incluindo prontuários, documentos, imagens e agendamentos.",
        ],
      },
    ],
  },
  {
    titulo: "Objeto e natureza do serviço",
    blocos: [
      "A Plataforma é uma ferramenta de gestão e organização. Ela não presta serviços de saúde, não realiza diagnóstico, não prescreve condutas e não substitui o julgamento clínico do profissional.",
      "Textos montados automaticamente (relatórios, laudos, pareceres, encaminhamentos, atestados, codificação CIF, classificação de força e demais sugestões) são apenas modelos baseados nos dados que o próprio Assinante registrou. Cabe exclusivamente ao profissional revisar, corrigir, completar e decidir se emite cada documento.",
      "O conteúdo clínico, as condutas, os documentos emitidos, os termos de consentimento utilizados e as informações prestadas aos Pacientes são de responsabilidade técnica, ética e legal do profissional que os registra ou assina, nos termos da legislação e das normas do Conselho Federal e dos Conselhos Regionais de Fisioterapia e Terapia Ocupacional.",
    ],
  },
  {
    titulo: "Cadastro, conta e segurança",
    blocos: [
      "Para usar a Plataforma é necessário criar uma conta com dados verdadeiros, completos e atualizados. O Assinante declara ter capacidade civil e, quando profissional de saúde, estar regularmente habilitado no respectivo conselho.",
      "O Assinante é responsável por manter a confidencialidade do login e da senha, por todas as ações realizadas em sua conta e pelos atos dos Usuários autorizados que cadastrar, inclusive pela definição de quem pode acessar prontuários.",
      "O Assinante deve comunicar imediatamente à Rabello Academy qualquer uso não autorizado ou suspeita de acesso indevido à conta.",
    ],
  },
  {
    titulo: "Planos, período de teste e pagamento",
    blocos: [
      "Novas contas contam com período gratuito de 30 dias, com recursos liberados para avaliação. Ao final, o acesso ao painel depende da contratação de um plano.",
      "Os planos, recursos, limites de profissionais e preços vigentes estão descritos na página de Assinatura e no site. O pagamento é processado pelo Asaas, instituição de pagamento parceira, por Pix, boleto ou cartão, conforme a opção disponível.",
      "Planos mensais são renovados automaticamente a cada mês até o cancelamento. Planos semestrais e anuais são pagos antecipadamente pelo período contratado.",
      "A Rabello Academy pode alterar preços e a composição dos planos mediante aviso prévio de, no mínimo, 30 dias por e-mail ou no painel. A alteração vale a partir da renovação seguinte ao aviso; o Assinante que não concordar pode cancelar antes dela.",
      "Em caso de atraso no pagamento, o acesso ao painel pode ser limitado após o prazo de tolerância indicado na Plataforma, sem prejuízo da cobrança dos valores devidos.",
    ],
  },
  {
    titulo: "Cancelamento, arrependimento e reembolso",
    blocos: [
      "O Assinante pode cancelar a qualquer momento pela página de Assinatura. Não há multa por cancelamento.",
      "Após o cancelamento, o acesso permanece até o fim do período já pago. Não há devolução proporcional de dias não utilizados, exceto no caso do direito de arrependimento descrito abaixo ou quando a lei exigir.",
      "Direito de arrependimento: na primeira contratação de um plano, o Assinante pode desistir em até 7 dias corridos contados do pagamento, solicitando o reembolso integral pelo e-mail rabelloacademy@gmail.com, nos termos do artigo 49 do Código de Defesa do Consumidor.",
    ],
  },
  {
    titulo: "Uso permitido e condutas proibidas",
    blocos: [
      "O Assinante se compromete a usar a Plataforma de forma lícita, ética e compatível com sua finalidade. É proibido:",
      {
        lista: [
          "inserir dados de Pacientes sem base legal adequada ou sem as autorizações exigidas pela lei;",
          "enviar mensagens de propaganda, spam ou conteúdo sem relação com o atendimento por meio das mensagens automáticas;",
          "usar a Plataforma para atividades ilegais, fraudulentas ou que violem normas éticas da profissão;",
          "tentar acessar dados de outras clínicas, burlar limites dos planos, fazer engenharia reversa ou sobrecarregar os sistemas;",
          "compartilhar a conta com pessoas não cadastradas ou revender o acesso sem autorização por escrito.",
        ],
      },
      "O descumprimento pode levar à suspensão ou ao encerramento da conta, sem prejuízo das medidas legais cabíveis.",
    ],
  },
  {
    titulo: "Responsabilidades do Assinante sobre os dados dos Pacientes",
    blocos: [
      "Em relação aos dados dos Pacientes, o Assinante é o controlador e a Rabello Academy atua como operadora, tratando esses dados apenas para prestar o serviço e conforme as instruções do Assinante, na forma da Lei nº 13.709/2018 (LGPD). As regras detalhadas estão no Anexo de Tratamento de Dados, ao final destes Termos.",
      "Cabe ao Assinante: informar os Pacientes sobre o tratamento de seus dados; obter os consentimentos e autorizações necessários (inclusive para uso de imagem e inclusão de CID em documentos); atender aos pedidos dos Pacientes sobre seus dados; manter a guarda do prontuário pelo prazo exigido pelo seu conselho profissional; e exportar seus dados antes do encerramento da conta.",
      "Os termos de consentimento, modelos de documentos e textos cadastrados pelo Assinante são de sua autoria e responsabilidade.",
    ],
  },
  {
    titulo: "Mensagens automáticas por WhatsApp e e-mail",
    blocos: [
      "Nos planos que incluem o recurso, a Plataforma envia confirmações e lembretes aos Pacientes pela API oficial do WhatsApp, utilizando número e modelos de mensagem aprovados pela Meta, e interpreta as respostas de confirmação ou cancelamento.",
      "O envio depende de serviços de terceiros (Meta, operadoras e provedores de e-mail), que podem sofrer atrasos, bloqueios ou falhas fora do controle da Rabello Academy. As mensagens são um apoio à organização e não substituem o controle da agenda pelo Assinante.",
      "O custo das mensagens automáticas está incluído no plano dentro de um uso razoável, compatível com o volume normal de atendimentos. Volumes anormais podem ser limitados mediante aviso.",
      "Pacientes que não quiserem receber mensagens devem ser marcados pelo Assinante como sem autorização para WhatsApp no cadastro.",
    ],
  },
  {
    titulo: "Documentos, assinatura e verificação",
    blocos: [
      "Os documentos emitidos recebem número sequencial, data, código de verificação e QR Code, que permitem a terceiros confirmar que o documento foi gerado pela Plataforma e não foi alterado. A página de verificação mostra apenas dados de identificação do documento, nunca o conteúdo clínico.",
      "A imagem da assinatura e do carimbo inserida na Plataforma identifica o profissional, mas não equivale a assinatura digital com certificado ICP-Brasil. Quando a lei, o juízo ou o destinatário exigirem assinatura digital, o profissional deve assinar o arquivo por meio próprio, como o assinador gov.br.",
      "Documento emitido não pode ser editado; correções são feitas por meio de nova versão, que fica vinculada à anterior.",
    ],
  },
  {
    titulo: "Disponibilidade, suporte e cópias de segurança",
    blocos: [
      "A Rabello Academy emprega esforços razoáveis para manter a Plataforma disponível e segura, com hospedagem em provedores de nuvem reconhecidos. Não é garantido funcionamento ininterrupto ou livre de erros, nem a recuperação integral de dados em qualquer circunstância.",
      "Podem ocorrer interrupções para manutenção, atualização ou por fatores externos, como falhas de internet, de provedores de nuvem, de pagamento ou de mensagens. Manutenções programadas serão, sempre que possível, realizadas em horários de menor uso.",
      "O suporte é prestado pelos canais indicados no painel e pelo e-mail rabelloacademy@gmail.com, em dias úteis, sem prazo garantido de resposta imediata.",
      "Recomenda-se que o Assinante exporte ou imprima periodicamente os documentos e registros essenciais à sua atividade.",
    ],
  },
  {
    titulo: "Limitação de responsabilidade",
    blocos: [
      "Na máxima extensão permitida pela lei, a Rabello Academy não responde por:",
      {
        lista: [
          "decisões clínicas, condutas, diagnósticos, documentos emitidos e informações prestadas pelo Assinante ou por seus Usuários autorizados;",
          "danos decorrentes de dados incorretos ou incompletos inseridos na Plataforma;",
          "faltas, atrasos ou conflitos de agenda de Pacientes, inclusive quando mensagens automáticas não forem entregues;",
          "falhas de serviços de terceiros, como internet, Meta/WhatsApp, provedores de e-mail, bancos e meios de pagamento;",
          "uso indevido da conta decorrente de senha compartilhada, dispositivo inseguro ou descuido do Assinante;",
          "lucros cessantes, perda de clientela, danos indiretos ou consequenciais.",
        ],
      },
      "Quando houver responsabilidade da Rabello Academy, ela fica limitada ao valor efetivamente pago pelo Assinante nos 12 meses anteriores ao fato que originou o dano. Essa limitação não se aplica aos casos em que a lei não permite limitar a responsabilidade, como dolo ou culpa grave.",
    ],
  },
  {
    titulo: "Propriedade intelectual",
    blocos: [
      "O software, a marca Agenda Fisio Pro, o layout, os textos-padrão, os modelos e o código são de titularidade da Rabello Academy e são licenciados ao Assinante de forma pessoal, não exclusiva e intransferível, enquanto durar a assinatura.",
      "Os Dados do Assinante pertencem ao Assinante (e, quando for o caso, aos Pacientes). A Rabello Academy não reivindica propriedade sobre eles e os utiliza apenas para prestar o serviço, conforme estes Termos e a Política de Privacidade.",
    ],
  },
  {
    titulo: "Encerramento da conta e devolução dos dados",
    blocos: [
      "Encerrada a assinatura, os Dados do Assinante ficam guardados por 90 dias, período em que o Assinante pode reativar a conta ou solicitar a exportação pelo e-mail rabelloacademy@gmail.com.",
      "Após esse prazo, os dados são excluídos de forma definitiva, ressalvadas as informações que a Rabello Academy precise manter para cumprir obrigação legal, fiscal ou para exercício regular de direitos.",
      "A Rabello Academy pode suspender ou encerrar contas que violem estes Termos, que coloquem em risco a segurança da Plataforma ou de terceiros, ou por determinação legal ou judicial.",
    ],
  },
  {
    titulo: "Alterações destes Termos",
    blocos: [
      "Estes Termos podem ser atualizados para refletir mudanças na Plataforma, na lei ou no modelo de negócio. Alterações relevantes serão comunicadas com antecedência mínima de 15 dias por e-mail ou no painel, e a data de versão será atualizada nesta página.",
      "Se o Assinante não concordar com a nova versão, pode cancelar a assinatura antes que ela entre em vigor. O uso continuado após a vigência indica concordância.",
    ],
  },
  {
    titulo: "Disposições gerais e foro",
    blocos: [
      "Estes Termos são regidos pelas leis brasileiras. A eventual invalidade de uma cláusula não afeta as demais.",
      "A tolerância quanto ao descumprimento de qualquer obrigação não significa renúncia ao direito de exigi-la.",
      "Fica eleito o foro da Comarca de Governador Valadares, MG, para resolver questões relativas a estes Termos, ressalvado o direito do Assinante que se enquadre como consumidor de propor a ação no foro do seu domicílio.",
      "Dúvidas e comunicações: rabelloacademy@gmail.com.",
    ],
  },
  {
    titulo: "Anexo: Tratamento de Dados Pessoais (LGPD)",
    blocos: [
      "Este Anexo integra os Termos de Uso e regula o tratamento dos dados de Pacientes e Usuários autorizados que a Rabello Academy realiza em nome do Assinante.",
      {
        lista: [
          "Papéis: o Assinante é o controlador dos dados dos Pacientes; a Rabello Academy é operadora e trata esses dados somente para prestar o serviço contratado e conforme as instruções do Assinante registradas na própria Plataforma.",
          "Dados tratados: dados de identificação e contato, agendamentos, anamnese, evoluções, escalas de dor, testes, imagens, termos de consentimento, documentos e demais registros inseridos pelo Assinante. Parte deles é dado pessoal sensível referente à saúde.",
          "Finalidade: agenda, página de agendamento, prontuário, emissão de documentos, mensagens de confirmação e lembrete, cópias de segurança e suporte técnico. A Rabello Academy não vende, não aluga e não usa esses dados para publicidade própria ou de terceiros.",
          "Confidencialidade: pessoas que atuam para a Rabello Academy e acessam dados, excepcionalmente, para suporte ou manutenção estão sujeitas a dever de sigilo.",
          "Segurança: isolamento dos dados por clínica no banco de dados, conexões criptografadas, controle de acesso por usuário, pastas privadas para imagens e assinaturas e registros de integridade dos documentos.",
          "Suboperadores: o Assinante autoriza o uso dos fornecedores listados na Política de Privacidade (hospedagem, banco de dados, pagamentos, e-mail, WhatsApp e login). Novos fornecedores serão informados na Política.",
          "Transferência internacional: alguns fornecedores podem processar dados fora do Brasil; nesses casos, a Rabello Academy adota fornecedores que oferecem garantias compatíveis com a LGPD, como cláusulas contratuais de proteção de dados.",
          "Incidentes: a Rabello Academy comunicará ao Assinante, em até 48 horas após tomar conhecimento, incidente de segurança que possa afetar os dados de seus Pacientes, com as informações disponíveis, para que o Assinante, como controlador, avalie a comunicação à ANPD e aos titulares.",
          "Direitos dos titulares: pedidos de Pacientes recebidos pela Rabello Academy serão encaminhados ao Assinante, que é quem responde por eles. A Rabello Academy auxiliará no que for tecnicamente possível pela Plataforma.",
          "Término: ao fim do contrato, os dados seguem o prazo de guarda e exclusão da seção de encerramento da conta.",
        ],
      },
    ],
  },
];

export default function TermosDeUsoPage() {
  return (
    <TextoLegal
      titulo="Termos de Uso"
      versao="2026-09-28"
      atualizado="28 de setembro de 2026"
      introducao={introducao}
      secoes={secoes}
    />
  );
}
