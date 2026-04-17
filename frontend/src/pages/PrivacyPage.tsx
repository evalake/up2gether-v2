import { LegalLayout } from './LegalLayout'

const TOC = [
  { id: 's1', label: '1. Quem somos' },
  { id: 's2', label: '2. Definições' },
  { id: 's3', label: '3. Dados que coletamos' },
  { id: 's4', label: '4. Bases legais' },
  { id: 's5', label: '5. Compartilhamento' },
  { id: 's6', label: '6. Transferência internacional' },
  { id: 's7', label: '7. Prazos de retenção' },
  { id: 's8', label: '8. Seus direitos' },
  { id: 's9', label: '9. Segurança' },
  { id: 's10', label: '10. Crianças' },
  { id: 's11', label: '11. Cookies' },
  { id: 's12', label: '12. Alterações' },
  { id: 's13', label: '13. Contato' },
]

export function PrivacyPage() {
  return (
    <LegalLayout
      title="Política de Privacidade"
      effectiveAt="16 de abril de 2026"
      updatedAt="16 de abril de 2026"
      toc={TOC}
      summary={
        <>
          <p>
            O Up2Gether só coleta o necessário para organizar sessões de jogo no seu
            grupo do Discord. Em linhas gerais:
          </p>
          <ul>
            <li>
              O login usa OAuth do Discord. Recebemos o seu ID, nome, avatar e a lista
              de servidores. <strong>Não recebemos</strong> senhas, e-mail nem
              mensagens.
            </li>
            <li>
              Biblioteca Steam e Google Calendar são integrações opcionais, ligadas
              apenas se você autorizar.
            </li>
            <li>Não vendemos dados, não rastreamos com cookies de terceiros.</li>
            <li>
              Você pode exportar ou excluir os seus dados a qualquer momento, sem
              custo, em até 15 dias corridos.
            </li>
          </ul>
        </>
      }
    >
      <section id="s1">
        <h2>1. Quem somos</h2>
        <p>
          Up2Gether é uma plataforma para coordenação de sessões de jogo em
          comunidades do Discord. Este documento descreve quais dados pessoais
          coletamos, por que coletamos, com quem compartilhamos e como você pode
          exercer os seus direitos previstos na{' '}
          <strong>
            Lei Geral de Proteção de Dados (LGPD, Lei nº 13.709/2018)
          </strong>.
        </p>
        <p>
          A identificação completa do controlador (razão social, CNPJ e endereço)
          pode ser obtida a qualquer momento pelo canal oficial, indicado no fim
          deste documento. O Encarregado de Tratamento de Dados (DPO) é acessível
          pelo mesmo canal, com o assunto <code>DPO</code>.
        </p>
      </section>

      <section id="s2">
        <h2>2. Definições</h2>
        <p>
          Para facilitar a leitura, alguns termos têm significado específico neste
          documento:
        </p>
        <ul>
          <li>
            <strong>Serviço</strong>: o aplicativo web, o bot do Discord e as
            integrações correlatas do Up2Gether.
          </li>
          <li>
            <strong>Usuário</strong>: pessoa física que acessa o Serviço por meio
            de conta do Discord.
          </li>
          <li>
            <strong>Grupo</strong>: espaço de coordenação atrelado a um servidor do
            Discord, onde o usuário vota, agenda e registra presença em sessões.
          </li>
          <li>
            <strong>Administrador do grupo</strong>: usuário com permissão de
            gerenciar o grupo no Up2Gether.
          </li>
          <li>
            <strong>Dados pessoais</strong>: qualquer informação que permita
            identificar, direta ou indiretamente, o titular.
          </li>
        </ul>
      </section>

      <section id="s3">
        <h2>3. Dados que coletamos</h2>

        <h3>3.1 Identificação via Discord</h3>
        <p>
          O acesso é feito exclusivamente por OAuth do Discord. Ao autorizar o
          login, recebemos:
        </p>
        <table>
          <thead>
            <tr>
              <th>Campo</th>
              <th>Finalidade</th>
              <th>Origem</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>ID do Discord</td>
              <td>identificador único da sua conta</td>
              <td>Discord OAuth</td>
            </tr>
            <tr>
              <td>Nome de usuário e nome de exibição</td>
              <td>identificação visual dentro do Serviço</td>
              <td>Discord OAuth</td>
            </tr>
            <tr>
              <td>Avatar</td>
              <td>identificação visual (imagem de perfil)</td>
              <td>Discord CDN</td>
            </tr>
            <tr>
              <td>Lista de servidores (guilds)</td>
              <td>localizar os grupos aos quais você pertence</td>
              <td>Discord OAuth</td>
            </tr>
          </tbody>
        </table>
        <p>
          <strong>Não recebemos</strong> a sua senha do Discord, o seu endereço de
          e-mail, o conteúdo de mensagens privadas ou o histórico de conversas.
        </p>

        <h3>3.2 Biblioteca Steam (opcional)</h3>
        <p>
          Se você optar por conectar a sua conta Steam, consultamos a API pública
          da Valve para listar os jogos que você possui. Essa informação é usada
          apenas para cruzar a biblioteca dos membros do grupo e sugerir títulos
          jogáveis por todos. A integração pode ser desligada a qualquer momento,
          o que remove os dados de jogos associados ao seu perfil.
        </p>

        <h3>3.3 Google Calendar (opcional)</h3>
        <p>
          Caso autorize, criamos eventos no seu Google Calendar para sessões
          confirmadas. Utilizamos apenas o escopo de escrita em eventos criados
          pelo Serviço. <strong>Não lemos</strong> a sua agenda pessoal nem
          eventos de terceiros.
        </p>

        <h3>3.4 Dados de uso</h3>
        <p>
          Registramos a sua atividade dentro do Serviço para exibir histórico,
          calcular estatísticas e operar as funcionalidades: grupos criados ou
          ingressados, votos registrados, sessões agendadas, confirmações de
          presença, temas propostos e comentários postados no contexto dos grupos.
        </p>

        <h3>3.5 Dados técnicos</h3>
        <p>
          Para fins de segurança e diagnóstico, registramos em logs de servidor:
          endereço IP parcial, identificador do navegador (user agent), carimbo
          de tempo e rota acessada. Esses registros são mantidos por{' '}
          <strong>no máximo 90 dias</strong>.
        </p>
      </section>

      <section id="s4">
        <h2>4. Bases legais para o tratamento</h2>
        <p>
          Conforme o art. 7º da LGPD, o tratamento realizado pelo Up2Gether se
          fundamenta nas seguintes hipóteses:
        </p>
        <table>
          <thead>
            <tr>
              <th>Dado</th>
              <th>Base legal</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Identificação Discord, grupos, votos, sessões</td>
              <td>Execução de contrato (art. 7º, V)</td>
            </tr>
            <tr>
              <td>Biblioteca Steam, Google Calendar</td>
              <td>Consentimento (art. 7º, I), revogável a qualquer momento</td>
            </tr>
            <tr>
              <td>Logs técnicos e prevenção a abuso</td>
              <td>Legítimo interesse (art. 7º, IX)</td>
            </tr>
            <tr>
              <td>Dados fiscais, caso você se torne assinante</td>
              <td>Obrigação legal ou regulatória (art. 7º, II)</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="s5">
        <h2>5. Compartilhamento de dados</h2>
        <p>
          <strong>Não vendemos</strong> os seus dados. Compartilhamos informações
          apenas com operadores que executam a infraestrutura do Serviço, nos
          limites estritamente necessários para a prestação contratada:
        </p>
        <table>
          <thead>
            <tr>
              <th>Operador</th>
              <th>Função</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Discord</td>
              <td>provedor de identidade, hospedagem do bot oficial</td>
            </tr>
            <tr>
              <td>Valve (Steam)</td>
              <td>consulta de biblioteca de jogos, quando autorizado</td>
            </tr>
            <tr>
              <td>Google</td>
              <td>criação de eventos no Calendar, quando autorizado</td>
            </tr>
            <tr>
              <td>Vercel</td>
              <td>hospedagem do aplicativo web</td>
            </tr>
            <tr>
              <td>Fly.io</td>
              <td>hospedagem do backend e do bot</td>
            </tr>
            <tr>
              <td>Neon</td>
              <td>banco de dados PostgreSQL</td>
            </tr>
            <tr>
              <td>Cloudflare</td>
              <td>CDN, DNS e proteção contra abuso</td>
            </tr>
          </tbody>
        </table>
        <p>
          Todos os operadores atuam sob contrato de confidencialidade. Podemos
          compartilhar dados mediante ordem judicial ou requisição válida de
          autoridade competente, nos termos da legislação aplicável.
        </p>
      </section>

      <section id="s6">
        <h2>6. Transferência internacional</h2>
        <p>
          Parte dos operadores listados acima processa dados fora do território
          nacional, principalmente nos Estados Unidos e em países da União
          Europeia. Em qualquer transferência internacional, observamos o
          Capítulo V da LGPD, adotando garantias contratuais apropriadas e
          verificando o nível de proteção do país de destino.
        </p>
      </section>

      <section id="s7">
        <h2>7. Prazos de retenção</h2>
        <table>
          <thead>
            <tr>
              <th>Categoria</th>
              <th>Retenção</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Dados da conta ativa</td>
              <td>enquanto a conta estiver em uso</td>
            </tr>
            <tr>
              <td>Após solicitação de exclusão</td>
              <td>
                até 30 dias em backup operacional, seguido de apagamento
                definitivo
              </td>
            </tr>
            <tr>
              <td>Logs técnicos (IP, user agent, rotas)</td>
              <td>até 90 dias</td>
            </tr>
            <tr>
              <td>
                Dados fiscais, caso exista relação de pagamento no futuro
              </td>
              <td>5 anos, por obrigação legal</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section id="s8">
        <h2>8. Seus direitos como titular</h2>
        <p>A LGPD garante, a qualquer momento, o direito de:</p>
        <ul>
          <li>
            confirmar a existência do tratamento e acessar os dados que mantemos
            sobre você;
          </li>
          <li>corrigir dados incompletos, incorretos ou desatualizados;</li>
          <li>
            solicitar anonimização, bloqueio ou eliminação de dados tratados em
            desconformidade com a lei;
          </li>
          <li>solicitar portabilidade dos dados para outro fornecedor;</li>
          <li>
            revogar o consentimento das integrações opcionais, a qualquer tempo;
          </li>
          <li>
            obter informação sobre entidades com as quais compartilhamos seus
            dados;
          </li>
          <li>
            apresentar reclamação à{' '}
            <strong>Autoridade Nacional de Proteção de Dados (ANPD)</strong>.
          </li>
        </ul>
        <p>
          Para exercer qualquer desses direitos, escreva para o canal oficial com
          o assunto <code>LGPD</code>. O prazo máximo de resposta é de{' '}
          <strong>15 dias corridos</strong>, contados do recebimento da
          solicitação.
        </p>
      </section>

      <section id="s9">
        <h2>9. Segurança da informação</h2>
        <p>
          Não armazenamos senhas de Discord, Google ou Steam. Toda autenticação
          ocorre nos provedores originais e recebemos apenas tokens de acesso com
          escopo limitado. Todo o tráfego trafega sobre HTTPS. O banco de dados
          opera com criptografia em repouso e backups diários. O acesso interno é
          restrito ao time técnico, com autenticação multi-fator.
        </p>
        <p>
          Em caso de incidente de segurança que afete seus dados pessoais, a
          comunicação à ANPD e aos titulares afetados será realizada dentro do
          prazo estabelecido pela LGPD.
        </p>
      </section>

      <section id="s10">
        <h2>10. Crianças e adolescentes</h2>
        <p>
          O Serviço não é destinado a menores de 13 anos. Para usuários entre 13
          e 18 anos, recomendamos o uso com ciência e autorização dos
          responsáveis. Identificado tratamento de dados de menor de 13 anos sem
          autorização, a exclusão será imediata.
        </p>
      </section>

      <section id="s11">
        <h2>11. Cookies e armazenamento local</h2>
        <p>
          Não utilizamos cookies de rastreamento de terceiros. Não há Google
          Analytics, Meta Pixel ou ferramentas equivalentes. O único dado
          armazenado no seu navegador é um token de sessão, estritamente
          necessário para manter o usuário autenticado.
        </p>
      </section>

      <section id="s12">
        <h2>12. Alterações desta política</h2>
        <p>
          Alterações relevantes nesta política serão comunicadas com pelo menos{' '}
          <strong>30 dias de antecedência</strong>, por e-mail cadastrado no
          Discord e dentro do próprio aplicativo. Ajustes menores, como correções
          ortográficas ou atualização de links, passam a valer a partir da data
          indicada no topo deste documento.
        </p>
      </section>

      <section id="s13">
        <h2>13. Contato</h2>
        <p>
          Para qualquer dúvida, reclamação ou solicitação relacionada aos seus
          dados pessoais, escreva para{' '}
          <a href="mailto:contato@up2gether.com.br">contato@up2gether.com.br</a>.
          Assuntos relacionados ao Encarregado pelo Tratamento de Dados Pessoais
          (DPO) devem ser enviados para o mesmo canal com o assunto{' '}
          <code>DPO</code>. Reclamações relativas à LGPD podem também ser
          apresentadas diretamente à ANPD por meio dos canais oficiais em{' '}
          <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer">
            gov.br/anpd
          </a>
          .
        </p>
      </section>
    </LegalLayout>
  )
}
