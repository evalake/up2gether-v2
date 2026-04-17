import { LegalLayout } from './LegalLayout'

const TOC = [
  { id: 's1', label: '1. Aceitação' },
  { id: 's2', label: '2. Definições' },
  { id: 's3', label: '3. Descrição do serviço' },
  { id: 's4', label: '4. Conta e elegibilidade' },
  { id: 's5', label: '5. Uso aceitável' },
  { id: 's6', label: '6. Conteúdo do usuário' },
  { id: 's7', label: '7. Integrações de terceiros' },
  { id: 's8', label: '8. Planos e cobrança' },
  { id: 's9', label: '9. Propriedade intelectual' },
  { id: 's10', label: '10. Encerramento' },
  { id: 's11', label: '11. Limitação de responsabilidade' },
  { id: 's12', label: '12. Alterações' },
  { id: 's13', label: '13. Lei aplicável' },
  { id: 's14', label: '14. Contato' },
]

export function TermsPage() {
  return (
    <LegalLayout
      title="Termos de Uso"
      effectiveAt="16 de abril de 2026"
      updatedAt="16 de abril de 2026"
      toc={TOC}
      summary={
        <>
          <p>Em resumo, ao usar o Up2Gether você concorda que:</p>
          <ul>
            <li>O acesso é feito via Discord e é pessoal.</li>
            <li>
              Durante o beta, o Serviço é gratuito. Se planos pagos forem
              introduzidos, grupos já existentes permanecem em tarifa legada.
            </li>
            <li>
              Conteúdo que você publicar (nomes, anotações, comentários) continua
              seu. Nós apenas exibimos dentro do próprio grupo.
            </li>
            <li>
              Fraude, abuso, engenharia reversa ou manipulação das funções são
              proibidos e podem resultar em encerramento da conta.
            </li>
            <li>
              Você pode encerrar a conta a qualquer momento. Interrupções
              temporárias podem ocorrer e serão minimizadas.
            </li>
          </ul>
        </>
      }
    >
      <section id="s1">
        <h2>1. Aceitação</h2>
        <p>
          Estes Termos regulam o uso do Up2Gether. Ao criar uma conta, autenticar
          via Discord, utilizar o bot oficial ou acessar qualquer parte do
          Serviço, você concorda integralmente com estas condições. Caso não
          concorde, interrompa imediatamente o uso.
        </p>
        <p>
          Estes Termos devem ser lidos em conjunto com a{' '}
          <a href="/privacy">Política de Privacidade</a>, que descreve como os
          seus dados pessoais são tratados.
        </p>
      </section>

      <section id="s2">
        <h2>2. Definições</h2>
        <ul>
          <li>
            <strong>Serviço</strong>: o aplicativo web, o bot oficial do Discord
            e todas as funcionalidades ofertadas pelo Up2Gether.
          </li>
          <li>
            <strong>Usuário</strong>: pessoa física que utiliza o Serviço por meio
            de conta Discord autenticada.
          </li>
          <li>
            <strong>Grupo</strong>: espaço de coordenação associado a um servidor
            do Discord.
          </li>
          <li>
            <strong>Administrador</strong>: usuário com permissão de configurar o
            grupo, gerenciar membros e definir as regras internas.
          </li>
          <li>
            <strong>Conteúdo do usuário</strong>: toda informação publicada no
            Serviço pelos próprios usuários, incluindo nomes de grupo, anotações,
            votos, propostas, comentários e configurações.
          </li>
        </ul>
      </section>

      <section id="s3">
        <h2>3. Descrição do serviço</h2>
        <p>
          O Up2Gether auxilia comunidades do Discord a coordenar sessões de jogo.
          Inclui funcionalidades de votação em rodadas, cruzamento de biblioteca
          (Steam), agendamento com confirmação de presença, integração opcional
          com Google Calendar e um bot oficial com comandos de voz para o
          Discord.
        </p>
        <p>
          O Serviço é fornecido <strong>como está</strong> e{' '}
          <strong>conforme disponível</strong>. Empenhamos esforços razoáveis para
          manter a plataforma operacional, mas não garantimos disponibilidade
          ininterrupta ou ausência total de falhas.
        </p>
      </section>

      <section id="s4">
        <h2>4. Conta e elegibilidade</h2>
        <ul>
          <li>É necessário ter, no mínimo, 13 anos para utilizar o Serviço;</li>
          <li>A conta é pessoal e intransferível;</li>
          <li>
            Você é responsável por manter a segurança da sua conta Discord;
          </li>
          <li>
            Administradores concordam com estes Termos também em nome do grupo
            que administram, respondendo pelas configurações escolhidas.
          </li>
        </ul>
      </section>

      <section id="s5">
        <h2>5. Uso aceitável</h2>
        <p>Você concorda em <strong>não</strong>:</p>
        <ul>
          <li>
            utilizar o Serviço para fins ilícitos ou que violem direitos de
            terceiros;
          </li>
          <li>
            realizar scraping, operar bots não autorizados, gerar carga excessiva,
            explorar vulnerabilidades ou aplicar engenharia reversa;
          </li>
          <li>
            criar contas falsas, personificar terceiros ou manipular votações,
            enquetes e agendamentos;
          </li>
          <li>
            publicar conteúdo ofensivo, discriminatório, ameaçador, que incite
            violência, que viole direitos autorais ou que contrarie a legislação
            aplicável;
          </li>
          <li>tentar acessar dados de outros usuários sem autorização;</li>
          <li>
            revender, sublicenciar ou distribuir o Serviço sem acordo comercial
            específico e por escrito.
          </li>
        </ul>
        <p>
          A violação destes termos pode resultar em suspensão imediata ou
          encerramento da conta, sem aviso prévio.
        </p>
      </section>

      <section id="s6">
        <h2>6. Conteúdo do usuário</h2>
        <p>
          Todo conteúdo publicado por você no Serviço continua sendo de sua
          titularidade. Ao publicar, você concede ao Up2Gether uma licença{' '}
          <strong>não exclusiva, mundial, gratuita e limitada</strong> para
          exibir tal conteúdo exclusivamente dentro do grupo correspondente e nas
          funcionalidades do Serviço.
        </p>
        <p>
          Você é o único responsável pelo conteúdo publicado. Caso o conteúdo
          viole direitos de terceiros ou estes Termos, poderemos removê-lo e, se
          for o caso, encerrar a conta responsável.
        </p>
      </section>

      <section id="s7">
        <h2>7. Integrações de terceiros</h2>
        <p>
          O Up2Gether integra-se com Discord, Steam e Google Calendar. Ao
          utilizar tais integrações, você também se submete aos termos de uso e
          políticas das respectivas plataformas. Interrupções, alterações
          unilaterais ou bloqueios em serviços de terceiros podem afetar o
          Up2Gether e não configuram responsabilidade nossa.
        </p>
      </section>

      <section id="s8">
        <h2>8. Planos e cobrança</h2>
        <p>
          Durante o beta, o Serviço é oferecido sem custo. Planos pagos poderão
          ser introduzidos no futuro, com limites e funcionalidades ampliados.
          Quando houver cobrança:
        </p>
        <ul>
          <li>
            os preços serão informados com clareza antes de qualquer pagamento;
          </li>
          <li>
            os pagamentos serão processados por <strong>Stripe</strong> ou{' '}
            <strong>Mercado Pago</strong>, conforme disponibilidade regional;
          </li>
          <li>
            a cobrança será feita <strong>por grupo</strong>, com base no número
            de membros ativos, conforme a página oficial de preços;
          </li>
          <li>
            o cancelamento pode ser solicitado a qualquer momento e não gera
            multa;
          </li>
          <li>
            grupos criados até a data oficial de lançamento do plano pago serão
            mantidos em <strong>tarifa legada</strong>, sem migração compulsória.
          </li>
        </ul>
      </section>

      <section id="s9">
        <h2>9. Propriedade intelectual</h2>
        <p>
          A marca Up2Gether, o código-fonte, o design, os textos originais e o
          bot oficial são protegidos por direitos autorais e de propriedade
          industrial. Nenhuma licença sobre esses elementos é concedida ao
          usuário além do uso regular do Serviço conforme estes Termos.
        </p>
        <p>
          Marcas de jogos, plataformas e empresas mencionadas (incluindo Steam,
          Discord, Riot Games, Epic Games, Valve, Google, entre outras) pertencem
          aos seus respectivos titulares. O Up2Gether{' '}
          <strong>não é afiliado, patrocinado nem endossado</strong> por essas
          empresas.
        </p>
      </section>

      <section id="s10">
        <h2>10. Encerramento</h2>
        <p>
          Você pode encerrar a sua conta a qualquer momento pela opção{' '}
          <code>Configurações</code> dentro do aplicativo ou por solicitação
          enviada ao canal oficial. Após o pedido, os seus dados pessoais são
          apagados em até 30 dias, ressalvado o que a lei obrigue a manter.
        </p>
        <p>
          Podemos suspender ou encerrar o Serviço, parcial ou totalmente, mediante
          aviso prévio de 30 dias. Em caso de violação grave destes Termos, o
          encerramento poderá ocorrer de forma imediata.
        </p>
      </section>

      <section id="s11">
        <h2>11. Limitação de responsabilidade</h2>
        <p>
          Na máxima extensão permitida pela legislação aplicável, o Up2Gether
          não será responsável por:
        </p>
        <ul>
          <li>
            perdas indiretas, lucros cessantes ou danos morais decorrentes do uso
            do Serviço;
          </li>
          <li>
            indisponibilidade temporária, falhas de terceiros, caso fortuito ou
            força maior;
          </li>
          <li>
            conflitos entre usuários dentro dos grupos. Atuamos como plataforma,
            não como mediadora de disputas internas.
          </li>
        </ul>
        <p>
          A responsabilidade total, em qualquer hipótese, fica limitada ao valor
          pago pelo usuário nos 12 meses anteriores ao evento que deu origem à
          demanda. Para usuários cujo uso seja inteiramente gratuito, esse
          limite é simbólico e fixado em R$ 100,00 (cem reais).
        </p>
      </section>

      <section id="s12">
        <h2>12. Alterações destes Termos</h2>
        <p>
          Alterações relevantes serão comunicadas com pelo menos{' '}
          <strong>30 dias de antecedência</strong>, por e-mail cadastrado no
          Discord e dentro do próprio aplicativo. O uso continuado do Serviço
          após o prazo indica aceitação das novas condições.
        </p>
      </section>

      <section id="s13">
        <h2>13. Lei aplicável e foro</h2>
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil.
          Fica eleito o foro da comarca da sede do operador do Serviço para
          dirimir quaisquer controvérsias oriundas deste instrumento, com
          renúncia expressa a qualquer outro, por mais privilegiado que seja.
        </p>
      </section>

      <section id="s14">
        <h2>14. Contato</h2>
        <p>
          Para dúvidas contratuais, escreva para{' '}
          <a href="mailto:contato@up2gether.com.br">contato@up2gether.com.br</a>.
          Para outros tipos de solicitação, consulte a página de{' '}
          <a href="/contact">Contato</a>.
        </p>
      </section>
    </LegalLayout>
  )
}
