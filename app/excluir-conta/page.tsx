import { TextoLegal, type Secao } from "@/components/TextoLegal";

export const metadata = { title: "Excluir conta | Agenda Fisio Pro" };

const introducao = [
  "Esta página explica como solicitar a exclusão da sua conta e dos seus dados no Agenda Fisio Pro, aplicativo desenvolvido pela Rabello Academy, CNPJ nº 53.821.804/0001-18.",
];

const secoes: Secao[] = [
  {
    titulo: "Como pedir a exclusão da conta",
    blocos: [
      {
        lista: [
          "Envie um e-mail para rabelloacademy@gmail.com com o assunto \"Excluir conta\".",
          "Escreva o e-mail usado no cadastro e o nome da clínica ou do profissional.",
          "Envie a mensagem a partir do mesmo e-mail cadastrado, para confirmarmos que o pedido é seu.",
          "Você recebe a confirmação da exclusão em até 15 dias.",
        ],
      },
      "Se você tem uma assinatura ativa, cancele antes em Painel > Assinatura para não receber novas cobranças. A exclusão da conta também encerra a assinatura.",
    ],
  },
  {
    titulo: "O que é excluído",
    blocos: [
      {
        lista: [
          "dados da conta: nome, e-mail, telefone e dados profissionais;",
          "dados da clínica: serviços, horários, profissionais e configurações;",
          "dados dos pacientes cadastrados pela clínica: agenda, prontuário, anamnese, evoluções, testes, imagens, exames e documentos emitidos;",
          "logomarca, assinatura e carimbo enviados.",
        ],
      },
    ],
  },
  {
    titulo: "O que é mantido e por quanto tempo",
    blocos: [
      {
        lista: [
          "registros de acesso, por 6 meses, conforme o Marco Civil da Internet;",
          "dados de cobrança e fiscais, pelo prazo exigido pela legislação tributária, em geral 5 anos;",
          "registro de aceite dos Termos de Uso, pelo prazo necessário para defesa em processos.",
        ],
      },
      "Depois desses prazos, os dados são excluídos definitivamente.",
    ],
  },
  {
    titulo: "Antes de excluir: guarde seus prontuários",
    blocos: [
      "O conselho profissional exige que o fisioterapeuta guarde o prontuário dos pacientes pelo prazo legal. Exporte ou imprima os documentos e prontuários que precisar antes de pedir a exclusão, porque depois eles não podem ser recuperados.",
    ],
  },
  {
    titulo: "Sou paciente",
    blocos: [
      "Seus dados de saúde pertencem ao profissional ou à clínica que te atende. Para pedir a exclusão, procure primeiro esse profissional. Se preferir, escreva para rabelloacademy@gmail.com e encaminhamos o pedido a ele.",
    ],
  },
];

export default function ExcluirContaPage() {
  return (
    <TextoLegal
      titulo="Excluir conta e dados"
      versao="2026-10-17"
      atualizado="17 de outubro de 2026"
      introducao={introducao}
      secoes={secoes}
    />
  );
}
