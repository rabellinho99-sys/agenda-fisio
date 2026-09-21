import { Markdown } from "@/components/Assinar";

export const metadata = { title: "Política de Privacidade - Agenda Fisio" };

const TEXTO = `Esta Política explica como o Agenda Fisio trata dados pessoais. Aqui, Plataforma é o serviço; Assinante é o profissional ou clínica que contrata; Paciente é a pessoa atendida pelo Assinante.

## 1. Responsável
O responsável pela Plataforma é [RAZAO SOCIAL OU NOME], [CNPJ OU CPF], com contato em [E-MAIL DE CONTATO]. O Encarregado de dados pode ser contatado em [E-MAIL DO ENCARREGADO].

## 2. Dois papéis diferentes
2.1 Sobre os dados do Assinante (cadastro, cobrança, uso do sistema), a Plataforma atua como Controladora.
2.2 Sobre os dados dos Pacientes inseridos pelo Assinante, a Plataforma atua como Operadora, por conta e ordem do Assinante, que é o Controlador. As regras desse tratamento estão nos Termos de Uso.

## 3. Dados que tratamos do Assinante
Dados de identificação e contato, dados da clínica, dados de acesso, e dados de cobrança processados pelo Asaas. A Plataforma não armazena dados completos de cartão.

## 4. Finalidades e bases legais
4.1 Executar o contrato de assinatura e dar suporte, com base na execução de contrato.
4.2 Faturar e cobrar, com base na execução de contrato e obrigação legal.
4.3 Prevenir fraude e garantir segurança, com base no legítimo interesse.
4.4 Cumprir obrigações legais e fiscais, com base em obrigação legal.

## 5. Compartilhamento e operadores
A Plataforma se apoia em prestadores que atuam como operadores, sob contrato e dever de segurança: Vercel (hospedagem da aplicação), Supabase (banco de dados e autenticação), Asaas (pagamentos) e Meta (WhatsApp, quando ativo). A Plataforma não vende dados pessoais.

## 6. Transferência internacional
Alguns operadores podem processar dados fora do Brasil. Nesses casos, a Plataforma busca garantias adequadas de proteção, conforme a LGPD.

## 7. Retenção
Os dados do Assinante são mantidos enquanto a conta existir e pelos prazos legais aplicáveis após o encerramento. Depois disso, são eliminados ou anonimizados.

## 8. Direitos do titular
O titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, portabilidade, informação sobre compartilhamento e, quando cabível, eliminação, pelo e-mail do Encarregado. Pedidos sobre dados de Pacientes devem ser direcionados ao Assinante, que é o Controlador desses dados.

## 9. Segurança
A Plataforma adota medidas técnicas e organizacionais, como controle de acesso por usuário, isolamento de dados entre clínicas, criptografia em trânsito e segredos guardados em cofre. Nenhum sistema é totalmente imune a incidentes.

## 10. Cookies
A Plataforma usa apenas os cookies necessários para autenticação e funcionamento. Não usa cookies de publicidade.

## 11. Alterações
Esta Política pode ser atualizada, com aviso pelos canais do sistema.

Última atualização: [PREENCHER].`;

export default function PrivacidadePage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <p className="text-sm text-ink/60">Agenda Fisio</p>
      <h1 className="h-display mt-1 text-4xl">Política de Privacidade</h1>
      <article className="mt-6 rounded-2xl bg-white p-6"><Markdown texto={TEXTO} /></article>
    </main>
  );
}
