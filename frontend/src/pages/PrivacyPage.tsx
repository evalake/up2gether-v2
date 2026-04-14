import { LegalLayout } from './LegalLayout'

export function PrivacyPage() {
  return (
    <LegalLayout title="Política de Privacidade" subtitle="Última atualização: 14 de abril de 2026">
      <p>
        Esta política explica como o Up2Gether coleta, usa, armazena e compartilha os seus
        dados pessoais. A plataforma é operada por <strong>Yuri da Silva Amaral</strong>,
        inscrito sob o CNPJ 48.127.326/0001-00, com endereço na Avenida Afonso Pena, 4785,
        Sala 701, Edifício The Place Corporate, Campo Grande/MS, CEP 79.031-010 ("nós",
        "Up2Gether"). Ao utilizar o Up2Gether, você concorda com esta política.
      </p>

      <p>
        Seguimos integralmente a <strong>Lei Geral de Proteção de Dados (LGPD, Lei nº
        13.709/2018)</strong>. Em caso de dúvida ou para exercer qualquer direito como
        titular, entre em contato pelo email{' '}
        <a href="mailto:contato@up2gether.com.br">contato@up2gether.com.br</a>.
      </p>

      <h2>1. Dados que coletamos</h2>

      <h3>1.1 Dados do Discord (OAuth)</h3>
      <p>
        O acesso à plataforma é feito por meio da sua conta Discord. Ao autorizar o login, o
        Discord compartilha conosco as seguintes informações:
      </p>
      <ul>
        <li>Identificador numérico do Discord (público e único);</li>
        <li>Nome de usuário e nome de exibição;</li>
        <li>URL do avatar;</li>
        <li>
          Lista dos servidores (guilds) dos quais você faz parte, utilizada apenas para
          localizar o grupo correspondente no Up2Gether.
        </li>
      </ul>
      <p>
        <strong>Não recebemos</strong> a sua senha do Discord, o seu email, mensagens
        privadas ou histórico de conversas.
      </p>

      <h3>1.2 Dados da Steam (opcional)</h3>
      <p>
        Caso você escolha conectar a sua conta Steam, consultamos a API pública da Valve
        para ler a sua biblioteca de jogos. Essa integração é opcional e serve para calcular
        a compatibilidade de títulos entre os membros do grupo. Você pode desconectar a
        qualquer momento.
      </p>

      <h3>1.3 Dados do Google Calendar (opcional)</h3>
      <p>
        Se você autorizar, criamos eventos no seu Google Calendar referentes às sessões
        agendadas em que você confirma presença. Nunca lemos a sua agenda pessoal;
        escrevemos apenas os eventos que você autorizou.
      </p>

      <h3>1.4 Dados de uso</h3>
      <p>
        Armazenamos informações sobre como você utiliza o aplicativo: grupos que criou ou
        dos quais participa, votos registrados, sessões em que participou e horários dos
        eventos. Esses dados servem para apresentar o seu histórico, calcular estatísticas
        do grupo e melhorar o produto.
      </p>

      <h3>1.5 Dados técnicos</h3>
      <p>
        Os registros de servidor incluem endereço IP, identificação do navegador (user
        agent), carimbo de tempo e rota acessada. São utilizados para segurança, detecção
        de abuso e diagnóstico de falhas, sendo mantidos por no máximo 90 dias.
      </p>

      <p>
        <strong>Não utilizamos</strong> cookies de rastreamento de terceiros. Não há Google
        Analytics, Meta Pixel ou ferramentas similares. O único armazenamento local que
        utilizamos é um token de sessão, necessário para manter você autenticado.
      </p>

      <h2>2. Bases legais para o tratamento</h2>

      <ul>
        <li>
          <strong>Execução de contrato (art. 7º, V, da LGPD):</strong> dados do Discord,
          grupos, votos, sessões e biblioteca Steam são necessários para a prestação do
          serviço contratado.
        </li>
        <li>
          <strong>Consentimento (art. 7º, I):</strong> conexão com Google Calendar,
          notificações push e demais integrações opcionais. O consentimento pode ser
          revogado a qualquer momento.
        </li>
        <li>
          <strong>Legítimo interesse (art. 7º, IX):</strong> registros técnicos para fins
          de segurança e prevenção de fraude.
        </li>
      </ul>

      <h2>3. Compartilhamento de dados</h2>

      <p>
        <strong>Não vendemos</strong> os seus dados, tampouco os compartilhamos com
        anunciantes. Os únicos terceiros que recebem parte dos dados são os fornecedores
        que operam a infraestrutura do serviço:
      </p>

      <ul>
        <li><strong>Discord:</strong> provedor de identidade e do bot;</li>
        <li><strong>Valve (Steam):</strong> quando você conecta a biblioteca;</li>
        <li><strong>Google:</strong> quando você conecta o Google Calendar;</li>
        <li>
          <strong>Vercel</strong> (hospedagem do frontend), <strong>Fly.io</strong>
          {' '}(hospedagem do backend) e <strong>Neon</strong> (banco de dados PostgreSQL);
        </li>
        <li><strong>Cloudflare:</strong> CDN, DNS e proteção contra abuso.</li>
      </ul>

      <p>
        Esses fornecedores acessam os dados exclusivamente para operar o serviço
        contratado, sob contratos de confidencialidade. Alguns deles realizam o
        processamento fora do território nacional (principalmente nos Estados Unidos).
        Quando há transferência internacional, garantimos o cumprimento do Capítulo V da
        LGPD.
      </p>

      <p>
        Também podemos divulgar dados mediante ordem judicial ou requisição legal válida.
      </p>

      <h2>4. Prazo de retenção</h2>

      <ul>
        <li>Conta ativa: enquanto você utilizar o serviço;</li>
        <li>
          Após solicitação de exclusão da conta: 30 dias de retenção em backup, e depois
          apagamento definitivo;
        </li>
        <li>Registros técnicos: 90 dias;</li>
        <li>
          Dados fiscais e de faturamento (caso você se torne assinante no futuro): 5 anos,
          por obrigação legal.
        </li>
      </ul>

      <h2>5. Direitos do titular</h2>

      <p>
        A LGPD assegura, a qualquer momento, o direito de:
      </p>

      <ul>
        <li>Saber quais dados mantemos sobre você;</li>
        <li>Corrigir dados incorretos ou desatualizados;</li>
        <li>
          Solicitar a exclusão dos seus dados (ressalvadas as hipóteses de guarda legal
          obrigatória);
        </li>
        <li>Solicitar a portabilidade dos dados para outro serviço;</li>
        <li>Revogar o consentimento das integrações opcionais;</li>
        <li>
          Apresentar reclamação à <strong>Autoridade Nacional de Proteção de Dados
          (ANPD)</strong>.
        </li>
      </ul>

      <p>
        Para exercer qualquer um desses direitos, envie um email para{' '}
        <a href="mailto:contato@up2gether.com.br">contato@up2gether.com.br</a>. O prazo de
        resposta é de até 15 dias.
      </p>

      <h2>6. Segurança</h2>

      <p>
        Não armazenamos senhas de Discord, Google ou Steam; o login ocorre diretamente no
        provedor e recebemos apenas um token de acesso. Todas as comunicações são feitas
        via HTTPS. O banco de dados possui backups automáticos e acesso restrito. Em caso
        de incidente que afete os seus dados, comunicaremos você e a ANPD dentro do prazo
        legal.
      </p>

      <h2>7. Crianças e adolescentes</h2>

      <p>
        O Up2Gether não é destinado a menores de 13 anos. Para usuários entre 13 e 18 anos,
        recomendamos o uso com autorização do responsável legal. Caso identifiquemos coleta
        de dados de menores de 13 anos sem autorização, a exclusão é imediata.
      </p>

      <h2>8. Alterações desta política</h2>

      <p>
        Em caso de alteração relevante nesta política, você será notificado por email e
        dentro do próprio aplicativo com, pelo menos, 30 dias de antecedência. Ajustes
        menores (correções ortográficas ou de links quebrados) entram em vigor
        imediatamente, e a data de "última atualização" no topo do documento reflete essa
        revisão.
      </p>

      <h2>9. Contato</h2>

      <p>
        Para dúvidas, reclamações ou solicitações, escreva para{' '}
        <a href="mailto:contato@up2gether.com.br">contato@up2gether.com.br</a>. Nosso
        prazo de resposta é de até 5 dias úteis para solicitações gerais e 15 dias para
        pedidos relacionados à LGPD.
      </p>

      <p>
        Encarregado pelo Tratamento de Dados Pessoais (DPO): Yuri da Silva Amaral, pelo
        mesmo canal acima.
      </p>
    </LegalLayout>
  )
}
