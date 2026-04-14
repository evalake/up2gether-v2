import { LegalLayout } from './LegalLayout'

export function PrivacyPage() {
  return (
    <LegalLayout title="Politica de Privacidade" subtitle="ultima atualizacao: 14 de abril de 2026">
      <p>
        Essa politica explica como o up2gether coleta, usa, guarda e compartilha os teus
        dados pessoais. A plataforma e operada por <strong>Yuri da Silva Amaral</strong>,
        inscrito no CNPJ 48.127.326/0001-00, com endereco em Av. Afonso Pena 4785, Sala 701,
        Edif. The Place Corporate, Campo Grande/MS, CEP 79.031-010 ("nos", "up2gether").
        Se voce usa o up2gether, voce concorda com essa politica.
      </p>

      <p>
        A gente segue a <strong>Lei Geral de Protecao de Dados (LGPD, Lei 13.709/2018)</strong>.
        Se voce tiver qualquer duvida ou quiser exercer um direito seu, manda email pra{' '}
        <a href="mailto:contato@up2gether.com.br">contato@up2gether.com.br</a>.
      </p>

      <h2>1. O que a gente coleta</h2>

      <h3>1.1 Dados do Discord (OAuth)</h3>
      <p>
        Pra logar voce usa a conta Discord. Quando voce autoriza, o Discord compartilha com a gente:
      </p>
      <ul>
        <li>ID numerico do Discord (identificador unico, publico)</li>
        <li>Username e display name</li>
        <li>Avatar (URL)</li>
        <li>Lista dos servidores (guilds) que voce faz parte, pra encontrar o grupo no up2gether</li>
      </ul>
      <p>
        A gente <strong>nao recebe</strong> tua senha do Discord, teu email, mensagens privadas
        nem historico de chat.
      </p>

      <h3>1.2 Dados do Steam (opcional)</h3>
      <p>
        Se voce escolher conectar a conta Steam, a gente consulta a API publica do Steam pra
        ler tua biblioteca de jogos. Isso e opcional e serve pra calcular compatibilidade de
        jogos entre membros do grupo. Voce pode desconectar a qualquer momento.
      </p>

      <h3>1.3 Dados do Google Calendar (opcional)</h3>
      <p>
        Se voce autorizar, a gente cria eventos no teu Google Calendar quando voce participa
        de sessoes agendadas. So escrevemos eventos que voce confirmou, nunca lemos tua agenda
        pessoal.
      </p>

      <h3>1.4 Dados de uso</h3>
      <p>
        A gente guarda informacoes sobre como voce usa o app: grupos que criou/entrou, votos
        que deu, sessoes em que participou, horario dos eventos. Isso serve pra mostrar pra
        voce o proprio historico, calcular estatisticas do grupo e melhorar o produto.
      </p>

      <h3>1.5 Dados tecnicos</h3>
      <p>
        Logs de servidor contem: endereco IP, user agent (navegador), timestamp e rota
        acessada. Sao usados pra seguranca, detectar abuso e depurar bugs. Ficam guardados
        por no maximo 90 dias.
      </p>

      <p>
        A gente <strong>nao usa</strong> cookies de rastreamento de terceiros. Nao tem Google
        Analytics, Meta Pixel nem afins. O unico cookie ou armazenamento local que a gente usa
        e um token de sessao pra manter voce logado.
      </p>

      <h2>2. Por que a gente coleta (base legal)</h2>

      <ul>
        <li>
          <strong>Execucao de contrato (art. 7, V da LGPD):</strong> dados do Discord, grupos,
          votos, sessoes, biblioteca Steam sao necessarios pra entregar o servico que voce pediu.
        </li>
        <li>
          <strong>Consentimento (art. 7, I):</strong> conexao com Google Calendar, notificacoes
          push, integracoes opcionais. Voce pode revogar a qualquer momento.
        </li>
        <li>
          <strong>Legitimo interesse (art. 7, IX):</strong> logs tecnicos pra seguranca e
          deteccao de abuso.
        </li>
      </ul>

      <h2>3. Com quem a gente compartilha</h2>

      <p>
        A gente <strong>nao vende</strong> teus dados. Nao compartilha com anunciantes. Os
        unicos terceiros que recebem parte dos teus dados sao os fornecedores que a gente usa
        pra operar o servico:
      </p>

      <ul>
        <li>
          <strong>Discord</strong> (provedor de identidade e bot)
        </li>
        <li>
          <strong>Valve (Steam)</strong>, quando voce conecta biblioteca
        </li>
        <li>
          <strong>Google</strong>, quando voce conecta Calendar
        </li>
        <li>
          <strong>Vercel</strong> (hospedagem frontend), <strong>Fly.io</strong> (hospedagem
          backend), <strong>Neon</strong> (banco Postgres)
        </li>
        <li>
          <strong>Cloudflare</strong> (CDN, DNS e protecao contra abuso)
        </li>
      </ul>

      <p>
        Esses fornecedores acessam teus dados apenas pra operar o servico que contratamos, sob
        contratos de confidencialidade. Alguns processam dados fora do Brasil (EUA,
        principalmente). Quando isso acontece, a gente se certifica que a transferencia segue
        o Capitulo V da LGPD.
      </p>

      <p>
        A gente tambem pode divulgar dados se for obrigado por ordem judicial ou requisicao
        legal valida.
      </p>

      <h2>4. Quanto tempo a gente guarda</h2>

      <ul>
        <li>Conta ativa: enquanto voce usar o servico</li>
        <li>Depois que voce excluir a conta: 30 dias pra backups, depois apagado</li>
        <li>Logs tecnicos: 90 dias</li>
        <li>
          Dados de faturamento (se voce virar pagante no futuro): 5 anos, por obrigacao fiscal
        </li>
      </ul>

      <h2>5. Teus direitos</h2>

      <p>
        A LGPD garante que voce pode, a qualquer momento:
      </p>

      <ul>
        <li>Saber quais dados a gente tem sobre voce</li>
        <li>Corrigir dados incorretos ou desatualizados</li>
        <li>Pedir pra apagar teus dados (exceto quando a lei obriga a guardar)</li>
        <li>Levar teus dados pra outro servico (portabilidade)</li>
        <li>Revogar consentimento pras integracoes opcionais</li>
        <li>
          Reclamar na <strong>Autoridade Nacional de Protecao de Dados (ANPD)</strong>
        </li>
      </ul>

      <p>
        Pra exercer qualquer direito, manda email pra{' '}
        <a href="mailto:contato@up2gether.com.br">contato@up2gether.com.br</a>. Respondemos em
        ate 15 dias.
      </p>

      <h2>6. Seguranca</h2>

      <p>
        Senhas: a gente nao guarda senha do Discord, Google nem Steam, voce loga no provedor e
        recebemos so um token. Comunicacao sempre em HTTPS. Banco com backup automatico e
        acesso restrito. Se acontecer um incidente que afete teus dados, a gente avisa voce e
        a ANPD no prazo legal.
      </p>

      <h2>7. Criancas</h2>

      <p>
        O up2gether nao e direcionado pra menores de 13 anos. Se voce tem entre 13 e 18, pedimos
        que use com autorizacao de responsavel. Se descobrirmos que coletamos dados de menor
        de 13 sem autorizacao, apagamos imediatamente.
      </p>

      <h2>8. Mudancas nessa politica</h2>

      <p>
        Se a gente mudar essa politica de forma relevante, avisa por email e no proprio app
        com pelo menos 30 dias de antecedencia. Mudancas menores (correcao de digitacao, link
        quebrado) entram em vigor imediatamente e ficam registradas pela data de "ultima
        atualizacao" no topo.
      </p>

      <h2>9. Contato</h2>

      <p>
        Duvida, reclamacao, pedido: <a href="mailto:contato@up2gether.com.br">contato@up2gether.com.br</a>.
        A gente responde em ate 5 dias uteis pra casos gerais e 15 dias pra pedidos de LGPD.
      </p>

      <p>
        Encarregado de Dados (DPO): Yuri da Silva Amaral, mesmo email acima.
      </p>
    </LegalLayout>
  )
}
